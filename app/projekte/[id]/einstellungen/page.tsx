"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];

export default function ProjektEinstellungenPage() {
  const params = useParams();
  const router = useRouter();

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

    setProjectName(data.project_name || "");
    setAuftraggeber(data.auftraggeber || "");
    setBauleiter(data.bauleiter || "");
    setAdresse(data.adresse || "");
    setOrt(data.ort || "");
    setGoogleLocation(data.google_location || "");
    setStartDate(data.start_date || "");
    setEndDate(data.end_date || "");
    setStatus(data.status || "Aktiv");

    setLoading(false);
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    const parts = String(value).split("-");
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }

    return value;
  }

  async function saveProjekt() {
    if (!projectName.trim()) {
      alert("Unesi naziv projekta.");
      return;
    }

    setSaving(true);

    const payload = {
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
      setSaving(false);
      return;
    }

    setSaving(false);
    alert("Projekt je spremljen.");
    loadProjekt();
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
    loadProjekt();
  }

  async function deleteProjekt() {
    const first = confirm(
      "PAŽNJA: Ovo briše cijeli projekt i sve povezane podatke: LV, Räume, Arbeitszeit, Leistung, Regie, Material, Fotos, Aufgaben. Nastaviti?"
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
      alert("Greška kod brisanja projekta: " + error.message);
      return;
    }

    alert("Projekt je obrisan.");
    router.push("/projekte");
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

        <span
          style={{
            ...statusBadgeStyle,
            background:
              status === "Aktiv"
                ? "#16a34a"
                : status === "Geplant"
                ? "#2563eb"
                : status === "Pausiert"
                ? "#ca8a04"
                : status === "Abgeschlossen"
                ? "#4b5563"
                : "#9333ea",
          }}
        >
          {status}
        </span>
      </div>

      <h1 style={titleStyle}>⚙️ Einstellungen</h1>

      <p style={descriptionStyle}>
        Projekt: <strong>{projekt.project_name || "-"}</strong>
      </p>

      <section style={infoBoxStyle}>
        <h2 style={sectionTitleStyle}>Aktuelle Daten</h2>

        <div style={infoGridStyle}>
          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Projekt ID</span>
            <strong>{projekt.id}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Erstellt von</span>
            <strong>{projekt.created_by || "-"}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Start</span>
            <strong>{formatDate(projekt.start_date)}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Ende</span>
            <strong>{formatDate(projekt.end_date)}</strong>
          </div>
        </div>
      </section>

      <section style={formBoxStyle}>
        <h2 style={formTitleStyle}>Projekt bearbeiten</h2>

        <label style={labelStyle}>Projekt Name *</label>
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="z.B. ARBÖ Tirol Fliesenlegerarbeiten"
          style={inputStyle}
        />

        <div style={formGridStyle}>
          <div>
            <label style={labelStyle}>Auftraggeber</label>
            <input
              value={auftraggeber}
              onChange={(e) => setAuftraggeber(e.target.value)}
              placeholder="z.B. Ing. Hans Bodner Bauges. mbH & Co KG"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Bauleiter</label>
            <input
              value={bauleiter}
              onChange={(e) => setBauleiter(e.target.value)}
              placeholder="z.B. Name Bauleiter"
              style={inputStyle}
            />
          </div>
        </div>

        <label style={labelStyle}>Adresse</label>
        <input
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          placeholder="Straße und Hausnummer"
          style={inputStyle}
        />

        <div style={formGridStyle}>
          <div>
            <label style={labelStyle}>PLZ / Ort</label>
            <input
              value={ort}
              onChange={(e) => setOrt(e.target.value)}
              placeholder="z.B. Innsbruck"
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
              <option value="Geplant">Geplant</option>
              <option value="Aktiv">Aktiv</option>
              <option value="Pausiert">Pausiert</option>
              <option value="Abgeschlossen">Abgeschlossen</option>
              <option value="Archiv">Archiv</option>
            </select>
          </div>
        </div>

        <div style={formGridStyle}>
          <div>
            <label style={labelStyle}>Ausführungsbeginn</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Ausführungsende</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <label style={labelStyle}>Google Standort Link</label>
        <input
          value={googleLocation}
          onChange={(e) => setGoogleLocation(e.target.value)}
          placeholder="Google Maps Link"
          style={inputStyle}
        />

        <button
          onClick={saveProjekt}
          disabled={saving}
          style={{
            ...saveButtonStyle,
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? "Speichern..." : "Projekt speichern"}
        </button>
      </section>

      <section style={quickBoxStyle}>
        <h2 style={sectionTitleStyle}>Schnell Status</h2>

        <div style={quickGridStyle}>
          <button
            onClick={() => quickStatus("Geplant")}
            style={{ ...quickButtonStyle, background: "#2563eb" }}
          >
            Geplant
          </button>

          <button
            onClick={() => quickStatus("Aktiv")}
            style={{ ...quickButtonStyle, background: "#16a34a" }}
          >
            Aktiv
          </button>

          <button
            onClick={() => quickStatus("Pausiert")}
            style={{ ...quickButtonStyle, background: "#ca8a04" }}
          >
            Pausiert
          </button>

          <button
            onClick={() => quickStatus("Abgeschlossen")}
            style={{ ...quickButtonStyle, background: "#4b5563" }}
          >
            Abgeschlossen
          </button>

          <button
            onClick={() => quickStatus("Archiv")}
            style={{ ...quickButtonStyle, background: "#9333ea" }}
          >
            Archiv
          </button>
        </div>
      </section>

      <section style={dangerBoxStyle}>
        <h2 style={dangerTitleStyle}>Gefahrenzone</h2>

        <p style={dangerTextStyle}>
          Projekt löschen entfernt auch alle verbundenen Daten wie LV Positionen,
          Räume, Arbeitszeiten, Leistung, Regie, Material, Fotos und Aufgaben.
        </p>

        <button onClick={deleteProjekt} style={deleteButtonStyle}>
          Projekt endgültig löschen
        </button>
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

const statusBadgeStyle: any = {
  color: "white",
  borderRadius: "999px",
  padding: "7px 13px",
  fontSize: "13px",
  fontWeight: "bold",
  whiteSpace: "nowrap",
};

const infoBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "20px",
};

const infoGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};

const infoItemStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "12px",
  padding: "12px",
};

const infoLabelStyle: any = {
  display: "block",
  color: "#aaa",
  fontSize: "13px",
  marginBottom: "5px",
};

const formBoxStyle: any = {
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
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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

const saveButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "14px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  width: "100%",
  marginTop: "18px",
};

const quickBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "20px",
};

const quickGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "10px",
};

const quickButtonStyle: any = {
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "13px",
  fontSize: "15px",
  fontWeight: "bold",
  cursor: "pointer",
};

const dangerBoxStyle: any = {
  background: "#190000",
  border: "1px solid #7f1d1d",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "20px",
};

const dangerTitleStyle: any = {
  color: "#ef4444",
  marginTop: 0,
  marginBottom: "12px",
};

const dangerTextStyle: any = {
  color: "#fecaca",
  lineHeight: "1.5",
};

const deleteButtonStyle: any = {
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "14px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  width: "100%",
};