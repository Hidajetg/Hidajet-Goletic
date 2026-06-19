"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];

function getTodayLocalDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function ProjektEinstellungenPage() {
  const params = useParams();
  const router = useRouter();
  const savingRef = useRef(false);

  const projektId = String(params.id);

  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projekt, setProjekt] = useState<any>(null);

  const [projectName, setProjectName] = useState("");
  const [auftraggeber, setAuftraggeber] = useState("");
  const [bauleiter, setBauleiter] = useState("");
  const [adresse, setAdresse] = useState("");
  const [ort, setOrt] = useState("");
  const [googleLocation, setGoogleLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("Aktiv");

  const [raeumeCount, setRaeumeCount] = useState(0);
  const [positionenCount, setPositionenCount] = useState(0);
  const [arbeitszeitCount, setArbeitszeitCount] = useState(0);
  const [leistungCount, setLeistungCount] = useState(0);
  const [regieCount, setRegieCount] = useState(0);
  const [fotosCount, setFotosCount] = useState(0);
  const [aufgabenCount, setAufgabenCount] = useState(0);
  const [materialCount, setMaterialCount] = useState(0);

  const statusStyle = useMemo(() => {
    if (status === "Aktiv") return okBadgeStyle;
    if (status === "Pausiert") return warningBadgeStyle;
    if (status === "Abgeschlossen") return blueBadgeStyle;
    if (status === "Archiviert") return grayBadgeStyle;

    return grayBadgeStyle;
  }, [status]);

  useEffect(() => {
    const name = localStorage.getItem("worker_name");

    if (!name) {
      router.push("/login");
      return;
    }

    const adminStatus = ADMINI.includes(name);

    if (!adminStatus) {
      router.push("/");
      return;
    }

    setWorkerName(name);
    setIsAdmin(adminStatus);
    loadProjekt();
  }, [router, projektId]);

  async function loadProjekt() {
    setLoading(true);

    const { data, error } = await supabase
      .from("projekte")
      .select("*")
      .eq("id", Number(projektId))
      .single();

    if (error) {
      alert("Greška kod učitavanja projekta: " + error.message);
      setProjekt(null);
      setLoading(false);
      return;
    }

    setProjekt(data);

    setProjectName(data?.project_name || "");
    setAuftraggeber(data?.auftraggeber || "");
    setBauleiter(data?.bauleiter || "");
    setAdresse(data?.adresse || "");
    setOrt(data?.ort || data?.plz_ort || "");
    setGoogleLocation(data?.google_location || "");
    setStartDate(data?.start_date || "");
    setEndDate(data?.end_date || "");
    setStatus(data?.status || "Aktiv");

    await loadCounts();

    setLoading(false);
  }

  async function loadCounts() {
    const raeumeRes = await supabase
      .from("projekt_raeume")
      .select("id", { count: "exact", head: true })
      .eq("projekt_id", Number(projektId));

    setRaeumeCount(raeumeRes.count || 0);

    const positionenRes = await supabase
      .from("projekt_lv_positionen")
      .select("id", { count: "exact", head: true })
      .eq("projekt_id", Number(projektId));

    setPositionenCount(positionenRes.count || 0);

    const arbeitszeitRes = await supabase
      .from("projekt_arbeitszeiten")
      .select("id", { count: "exact", head: true })
      .eq("projekt_id", Number(projektId));

    setArbeitszeitCount(arbeitszeitRes.count || 0);

    const leistungRes = await supabase
      .from("projekt_leistungen")
      .select("id", { count: "exact", head: true })
      .eq("projekt_id", Number(projektId));

    setLeistungCount(leistungRes.count || 0);

    const regieRes = await supabase
      .from("projekt_regie")
      .select("id", { count: "exact", head: true })
      .eq("projekt_id", Number(projektId));

    setRegieCount(regieRes.count || 0);

    const fotosRes = await supabase
      .from("projekt_fotos")
      .select("id", { count: "exact", head: true })
      .eq("projekt_id", Number(projektId));

    setFotosCount(fotosRes.count || 0);

    const aufgabenRes = await supabase
      .from("projekt_aufgaben")
      .select("id", { count: "exact", head: true })
      .eq("projekt_id", Number(projektId));

    setAufgabenCount(aufgabenRes.count || 0);

    const materialRes = await supabase
      .from("projekt_material_bewegungen")
      .select("id", { count: "exact", head: true })
      .eq("projekt_id", Number(projektId));

    setMaterialCount(materialRes.count || 0);
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    const parts = String(value).slice(0, 10).split("-");

    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }

    return value;
  }

  function formatDateTime(value: string | null) {
    if (!value) return "-";

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
      return String(value);
    }

    return d.toLocaleString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function makeMapsLink() {
    const value = googleLocation.trim();

    if (!value) {
      const address = `${adresse} ${ort}`.trim();

      if (!address) return "";

      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        address
      )}`;
    }

    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      value
    )}`;
  }

  async function saveProjekt() {
    if (savingRef.current) return;

    if (!projectName.trim()) {
      alert("Unesi naziv projekta.");
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      alert("Kraj projekta ne može biti prije početka.");
      return;
    }

    savingRef.current = true;
    setSaving(true);

    const payload: any = {
      project_name: projectName.trim(),
      auftraggeber: auftraggeber.trim() || null,
      bauleiter: bauleiter.trim() || null,
      adresse: adresse.trim() || null,
      ort: ort.trim() || null,
      google_location: googleLocation.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      status: status || "Aktiv",
    };

    const { error } = await supabase
      .from("projekte")
      .update(payload)
      .eq("id", Number(projektId));

    if (error) {
      alert("Greška kod spremanja projekta: " + error.message);
      savingRef.current = false;
      setSaving(false);
      return;
    }

    await loadProjekt();

    savingRef.current = false;
    setSaving(false);

    alert("Projekt je spremljen.");
  }

  async function quickStatus(newStatus: string) {
    const ok = confirm("Promijeniti status projekta na: " + newStatus + "?");

    if (!ok) return;

    const { error } = await supabase
      .from("projekte")
      .update({ status: newStatus })
      .eq("id", Number(projektId));

    if (error) {
      alert("Greška kod promjene statusa: " + error.message);
      return;
    }

    setStatus(newStatus);
    await loadProjekt();
  }

  async function deleteProjekt() {
    const first = confirm(
      "PAŽNJA: Ovo briše projekt. Ako baza ima povezane unose, brisanje može biti blokirano. Nastaviti?"
    );

    if (!first) return;

    const second = confirm(
      "Još jednom potvrdi: stvarno želiš trajno obrisati ovaj projekt?"
    );

    if (!second) return;

    const { error } = await supabase
      .from("projekte")
      .delete()
      .eq("id", Number(projektId));

    if (error) {
      alert(
        "Projekt nije obrisan. Najčešći razlog je da projekt ima povezane unose.\n\n" +
          error.message
      );
      return;
    }

    alert("Projekt je obrisan.");
    router.push("/projekte");
  }

  function resetForm() {
    if (!projekt) return;

    setProjectName(projekt.project_name || "");
    setAuftraggeber(projekt.auftraggeber || "");
    setBauleiter(projekt.bauleiter || "");
    setAdresse(projekt.adresse || "");
    setOrt(projekt.ort || projekt.plz_ort || "");
    setGoogleLocation(projekt.google_location || "");
    setStartDate(projekt.start_date || "");
    setEndDate(projekt.end_date || "");
    setStatus(projekt.status || "Aktiv");
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <h1 style={titleStyle}>⚙️ Einstellungen</h1>
        <p style={loadingStyle}>Wird geladen...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main style={mainStyle}>
        <h1 style={titleStyle}>Kein Zugriff</h1>
      </main>
    );
  }

  if (!projekt) {
    return (
      <main style={mainStyle}>
        <Link href="/projekte" style={backStyle}>
          ← Zurück zu Projekte
        </Link>

        <h1 style={titleStyle}>Projekt nicht gefunden</h1>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <div style={topBarStyle}>
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <div style={topButtonWrapStyle}>
          <button onClick={loadProjekt} style={refreshButtonStyle}>
            Aktualisieren
          </button>

          <Link href={`/projekte/${projektId}/bericht`} style={blueLinkStyle}>
            Bericht
          </Link>

          <Link href={`/projekte/${projektId}/tagesbericht`} style={greenLinkStyle}>
            Tagesbericht
          </Link>
        </div>
      </div>

      <div style={headerRowStyle}>
        <div>
          <h1 style={titleStyle}>⚙️ Einstellungen</h1>

          <p style={descriptionStyle}>
            Projekt: <strong>{projekt?.project_name || "-"}</strong> · Admin:{" "}
            <strong>{workerName}</strong>
          </p>
        </div>

        <span style={statusStyle}>{status || "Aktiv"}</span>
      </div>

      <section style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Räume</span>
          <strong style={summaryValueStyle}>{raeumeCount}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>LV Positionen</span>
          <strong style={summaryValueStyle}>{positionenCount}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Arbeitszeit</span>
          <strong style={summaryValueStyle}>{arbeitszeitCount}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Leistung</span>
          <strong style={summaryValueStyle}>{leistungCount}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Regie</span>
          <strong style={summaryValueStyle}>{regieCount}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Fotos</span>
          <strong style={summaryValueStyle}>{fotosCount}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Aufgaben</span>
          <strong style={summaryValueStyle}>{aufgabenCount}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Material</span>
          <strong style={summaryValueStyle}>{materialCount}</strong>
        </div>
      </section>

      <section style={infoBoxStyle}>
        <h2 style={sectionTitleStyle}>Projektdaten Regel</h2>
        <p style={infoTextStyle}>
          Ovi podaci se prenose u Dashboard, Tagesbericht, Regiebericht i Bericht /
          Druck. Zato ovdje treba biti tačan Auftraggeber, Bauleiter, adresa i
          Google Standort.
        </p>
      </section>

      <section style={formBoxStyle}>
        <h2 style={formTitleStyle}>Projekt Stammdaten</h2>

        <label style={labelStyle}>Projektname *</label>
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Naziv projekta / Baustelle"
          style={inputStyle}
        />

        <div style={formGridStyle}>
          <div>
            <label style={labelStyle}>Auftraggeber</label>
            <input
              value={auftraggeber}
              onChange={(e) => setAuftraggeber(e.target.value)}
              placeholder="Ime firme ili osobe"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Bauleiter / Vertreter</label>
            <input
              value={bauleiter}
              onChange={(e) => setBauleiter(e.target.value)}
              placeholder="Ime Bauleitera"
              style={inputStyle}
            />
          </div>
        </div>

        <label style={labelStyle}>Adresse</label>
        <input
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          placeholder="Ulica i broj"
          style={inputStyle}
        />

        <div style={formGridStyle}>
          <div>
            <label style={labelStyle}>PLZ / Ort</label>
            <input
              value={ort}
              onChange={(e) => setOrt(e.target.value)}
              placeholder="npr. 1010 Wien"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={inputStyle}
            >
              <option value="Aktiv">Aktiv</option>
              <option value="Pausiert">Pausiert</option>
              <option value="Abgeschlossen">Abgeschlossen</option>
              <option value="Archiviert">Archiviert</option>
            </select>
          </div>
        </div>

        <label style={labelStyle}>Google Standort</label>
        <input
          value={googleLocation}
          onChange={(e) => setGoogleLocation(e.target.value)}
          placeholder="Google Maps link ili adresa"
          style={inputStyle}
        />

        <div style={formGridStyle}>
          <div>
            <label style={labelStyle}>Startdatum</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Enddatum</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={previewBoxStyle}>
          <h3 style={previewTitleStyle}>Vorschau für Bericht</h3>

          <p style={previewTextStyle}>
            <strong>Projekt:</strong> {projectName || "-"}
          </p>

          <p style={previewTextStyle}>
            <strong>Auftraggeber:</strong> {auftraggeber || "-"}
          </p>

          <p style={previewTextStyle}>
            <strong>Bauleiter / Vertreter:</strong> {bauleiter || "-"}
          </p>

          <p style={previewTextStyle}>
            <strong>Adresse:</strong> {adresse || "-"} {ort || ""}
          </p>

          <p style={previewTextStyle}>
            <strong>Zeitraum:</strong> {formatDate(startDate)} -{" "}
            {formatDate(endDate)}
          </p>
        </div>

        <div style={formButtonRowStyle}>
          <button
            onClick={saveProjekt}
            disabled={saving}
            style={{
              ...saveButtonStyle,
              opacity: saving ? 0.5 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Speichern..." : "Projekt speichern"}
          </button>

          <button onClick={resetForm} disabled={saving} style={cancelButtonStyle}>
            Zurücksetzen
          </button>
        </div>
      </section>

      <section style={boxStyle}>
        <h2 style={sectionTitleStyle}>Schnellstatus</h2>

        <div style={statusGridStyle}>
          <button onClick={() => quickStatus("Aktiv")} style={statusActiveButtonStyle}>
            Aktiv
          </button>

          <button
            onClick={() => quickStatus("Pausiert")}
            style={statusPauseButtonStyle}
          >
            Pausiert
          </button>

          <button
            onClick={() => quickStatus("Abgeschlossen")}
            style={statusDoneButtonStyle}
          >
            Abgeschlossen
          </button>

          <button
            onClick={() => quickStatus("Archiviert")}
            style={statusArchiveButtonStyle}
          >
            Archiviert
          </button>
        </div>
      </section>

      <section style={boxStyle}>
        <h2 style={sectionTitleStyle}>Schnellzugriff</h2>

        <div style={moduleGridStyle}>
          <Link href={`/projekte/${projektId}/raeume`} style={moduleLinkStyle}>
            Räume
          </Link>

          <Link href={`/projekte/${projektId}/positionen`} style={moduleLinkStyle}>
            LV Positionen
          </Link>

          <Link href={`/projekte/${projektId}/arbeitszeit`} style={moduleLinkStyle}>
            Arbeitszeit
          </Link>

          <Link href={`/projekte/${projektId}/leistung`} style={moduleLinkStyle}>
            Leistung
          </Link>

          <Link href={`/projekte/${projektId}/material`} style={moduleLinkStyle}>
            Material
          </Link>

          <Link href={`/projekte/${projektId}/fotos`} style={moduleLinkStyle}>
            Fotos
          </Link>

          <Link href={`/projekte/${projektId}/aufgaben`} style={moduleLinkStyle}>
            Aufgaben
          </Link>

          <Link href={`/projekte/${projektId}/freigabe`} style={moduleLinkStyle}>
            Freigabe
          </Link>
        </div>
      </section>

      <section style={boxStyle}>
        <h2 style={sectionTitleStyle}>Google Standort</h2>

        <p style={infoTextStyle}>
          Ako nema Google linka, aplikacija će pokušati otvoriti mapu preko adrese.
        </p>

        <div style={formButtonRowStyle}>
          <a
            href={makeMapsLink() || "#"}
            target="_blank"
            rel="noreferrer"
            style={{
              ...mapsButtonStyle,
              pointerEvents: makeMapsLink() ? "auto" : "none",
              opacity: makeMapsLink() ? 1 : 0.5,
            }}
          >
            Google Maps öffnen
          </a>

          <button
            onClick={() => setGoogleLocation(`${adresse} ${ort}`.trim())}
            style={grayButtonStyle}
          >
            Adresse als Standort
          </button>
        </div>
      </section>

      <section style={dangerBoxStyle}>
        <h2 style={dangerTitleStyle}>Gefahrenbereich</h2>

        <p style={dangerTextStyle}>
          Projekt löschen koristi se samo ako je projekt pogrešno napravljen. Ako
          projekt već ima povezane podatke, baza može blokirati brisanje.
        </p>

        <button onClick={deleteProjekt} style={deleteButtonStyle}>
          Projekt löschen
        </button>
      </section>

      <section style={metaBoxStyle}>
        <p style={metaTextStyle}>
          Projekt ID: <strong>{projektId}</strong>
        </p>

        <p style={metaTextStyle}>
          Erstellt: <strong>{formatDateTime(projekt.created_at)}</strong>
        </p>

        <p style={metaTextStyle}>
          Heute: <strong>{formatDate(getTodayLocalDate())}</strong>
        </p>
      </section>
    </main>
  );
}

const mainStyle: any = {
  background: "#000",
  minHeight: "100vh",
  color: "white",
  padding: "20px",
};

const topBarStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "20px",
  flexWrap: "wrap",
};

const topButtonWrapStyle: any = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const headerRowStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
};

const backStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "16px",
};

const titleStyle: any = {
  fontSize: "38px",
  color: "#f97316",
  margin: "0 0 10px 0",
};

const descriptionStyle: any = {
  color: "#bbb",
  fontSize: "16px",
  marginBottom: "18px",
};

const loadingStyle: any = {
  color: "#aaa",
  fontSize: "18px",
};

const refreshButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px 18px",
  fontSize: "15px",
  fontWeight: "bold",
  cursor: "pointer",
};

const blueLinkStyle: any = {
  background: "#2563eb",
  color: "white",
  borderRadius: "12px",
  padding: "12px 18px",
  fontSize: "15px",
  fontWeight: "bold",
  textDecoration: "none",
};

const greenLinkStyle: any = {
  ...blueLinkStyle,
  background: "#16a34a",
};

const summaryGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
  gap: "12px",
  marginBottom: "20px",
};

const summaryCardStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "14px",
  padding: "14px",
};

const summaryLabelStyle: any = {
  display: "block",
  color: "#aaa",
  fontSize: "13px",
  marginBottom: "6px",
};

const summaryValueStyle: any = {
  color: "#f97316",
  fontSize: "22px",
};

const infoBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "20px",
};

const infoTextStyle: any = {
  color: "#ccc",
  margin: 0,
  lineHeight: "1.5",
};

const formBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "22px",
};

const boxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "20px",
};

const formTitleStyle: any = {
  color: "#f97316",
  marginTop: 0,
  marginBottom: "14px",
};

const sectionTitleStyle: any = {
  color: "#f97316",
  marginTop: 0,
  marginBottom: "14px",
};

const formGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "12px",
};

const labelStyle: any = {
  display: "block",
  color: "#ddd",
  fontWeight: "bold",
  marginBottom: "6px",
  marginTop: "12px",
};

const inputStyle: any = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #333",
  background: "#000",
  color: "white",
  fontSize: "15px",
  boxSizing: "border-box",
};

const previewBoxStyle: any = {
  marginTop: "14px",
  background: "#000",
  border: "1px solid #333",
  borderRadius: "12px",
  padding: "14px",
  color: "#ddd",
};

const previewTitleStyle: any = {
  color: "#f97316",
  margin: "0 0 10px 0",
};

const previewTextStyle: any = {
  color: "#ddd",
  margin: "6px 0",
};

const formButtonRowStyle: any = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginTop: "18px",
};

const saveButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "13px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const cancelButtonStyle: any = {
  background: "#4b5563",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "13px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const grayButtonStyle: any = {
  background: "#4b5563",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "13px",
  fontWeight: "bold",
  cursor: "pointer",
};

const mapsButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  borderRadius: "12px",
  padding: "13px",
  textDecoration: "none",
  textAlign: "center",
  fontWeight: "bold",
};

const statusGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
};

const statusActiveButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "13px",
  fontWeight: "bold",
  cursor: "pointer",
};

const statusPauseButtonStyle: any = {
  ...statusActiveButtonStyle,
  background: "#ca8a04",
};

const statusDoneButtonStyle: any = {
  ...statusActiveButtonStyle,
  background: "#2563eb",
};

const statusArchiveButtonStyle: any = {
  ...statusActiveButtonStyle,
  background: "#4b5563",
};

const moduleGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "12px",
};

const moduleLinkStyle: any = {
  background: "#000",
  color: "white",
  border: "1px solid #333",
  borderRadius: "12px",
  padding: "14px",
  textAlign: "center",
  textDecoration: "none",
  fontWeight: "bold",
};

const dangerBoxStyle: any = {
  background: "#120000",
  border: "1px solid #7f1d1d",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "20px",
};

const dangerTitleStyle: any = {
  color: "#ef4444",
  marginTop: 0,
};

const dangerTextStyle: any = {
  color: "#fca5a5",
  lineHeight: "1.5",
};

const deleteButtonStyle: any = {
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "13px 18px",
  fontWeight: "bold",
  cursor: "pointer",
};

const metaBoxStyle: any = {
  background: "#080808",
  border: "1px solid #222",
  borderRadius: "14px",
  padding: "14px",
};

const metaTextStyle: any = {
  color: "#aaa",
  fontSize: "13px",
  margin: "4px 0",
};

const okBadgeStyle: any = {
  background: "#16a34a",
  color: "white",
  borderRadius: "999px",
  padding: "8px 12px",
  fontWeight: "bold",
  fontSize: "13px",
  whiteSpace: "nowrap",
};

const warningBadgeStyle: any = {
  background: "#ca8a04",
  color: "white",
  borderRadius: "999px",
  padding: "8px 12px",
  fontWeight: "bold",
  fontSize: "13px",
  whiteSpace: "nowrap",
};

const blueBadgeStyle: any = {
  background: "#2563eb",
  color: "white",
  borderRadius: "999px",
  padding: "8px 12px",
  fontWeight: "bold",
  fontSize: "13px",
  whiteSpace: "nowrap",
};

const grayBadgeStyle: any = {
  background: "#4b5563",
  color: "white",
  borderRadius: "999px",
  padding: "8px 12px",
  fontWeight: "bold",
  fontSize: "13px",
  whiteSpace: "nowrap",
};