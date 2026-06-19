"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];

export default function ProjektRaeumePage() {
  const params = useParams();
  const router = useRouter();
  const savingRef = useRef(false);

  const projektId = String(params.id);

  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projekt, setProjekt] = useState<any>(null);
  const [raeume, setRaeume] = useState<any[]>([]);

  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [leistungen, setLeistungen] = useState<any[]>([]);
  const [regie, setRegie] = useState<any[]>([]);
  const [fotos, setFotos] = useState<any[]>([]);
  const [aufgaben, setAufgaben] = useState<any[]>([]);
  const [materialBewegungen, setMaterialBewegungen] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [raumName, setRaumName] = useState("");
  const [ebene, setEbene] = useState("");

  const [filterEbene, setFilterEbene] = useState("Alle");
  const [searchText, setSearchText] = useState("");

  const ebenen = useMemo(() => {
    const values = raeume
      .map((r) => r.ebene)
      .filter(Boolean)
      .map((v) => String(v));

    return Array.from(new Set(values)).sort();
  }, [raeume]);

  const raumRows = useMemo(() => {
    return raeume
      .map((raum) => {
        const usage = getRaumUsage(raum.id);

        return {
          ...raum,
          usage,
        };
      })
      .filter((raum) => {
        if (filterEbene !== "Alle" && String(raum.ebene || "") !== filterEbene) {
          return false;
        }

        if (searchText.trim()) {
          const text = `${raum.raum_name || ""} ${raum.ebene || ""}`.toLowerCase();
          return text.includes(searchText.trim().toLowerCase());
        }

        return true;
      })
      .sort((a, b) => {
        const ebeneA = String(a.ebene || "");
        const ebeneB = String(b.ebene || "");

        if (ebeneA !== ebeneB) return ebeneA.localeCompare(ebeneB);

        return String(a.raum_name || "").localeCompare(String(b.raum_name || ""));
      });
  }, [
    raeume,
    arbeitszeiten,
    leistungen,
    regie,
    fotos,
    aufgaben,
    materialBewegungen,
    filterEbene,
    searchText,
  ]);

  const summary = useMemo(() => {
    const benutzteRaeume = raeume.filter((raum) => getRaumUsage(raum.id).total > 0)
      .length;

    const freieRaeume = raeume.length - benutzteRaeume;

    return {
      total: raeume.length,
      ebenen: ebenen.length,
      benutzteRaeume,
      freieRaeume,
      arbeitszeiten: arbeitszeiten.length,
      leistungen: leistungen.length,
      regie: regie.length,
      fotos: fotos.length,
      aufgaben: aufgaben.length,
      material: materialBewegungen.length,
    };
  }, [
    raeume,
    ebenen,
    arbeitszeiten,
    leistungen,
    regie,
    fotos,
    aufgaben,
    materialBewegungen,
  ]);

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
    loadData();
  }, [router, projektId]);

  async function loadData() {
    setLoading(true);

    const projektRes = await supabase
      .from("projekte")
      .select("*")
      .eq("id", Number(projektId))
      .single();

    if (projektRes.error) {
      alert("Greška kod učitavanja projekta: " + projektRes.error.message);
      setLoading(false);
      return;
    }

    setProjekt(projektRes.data);

    const raeumeRes = await supabase
      .from("projekt_raeume")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("created_at", { ascending: true });

    if (raeumeRes.error) {
      alert("Greška kod učitavanja prostorija: " + raeumeRes.error.message);
      setRaeume([]);
      setLoading(false);
      return;
    }

    setRaeume(raeumeRes.data || []);

    const arbeitszeitRes = await supabase
      .from("projekt_arbeitszeiten")
      .select("*")
      .eq("projekt_id", Number(projektId));

    setArbeitszeiten(arbeitszeitRes.data || []);

    const leistungRes = await supabase
      .from("projekt_leistungen")
      .select("*")
      .eq("projekt_id", Number(projektId));

    setLeistungen(leistungRes.data || []);

    const regieRes = await supabase
      .from("projekt_regie")
      .select("*")
      .eq("projekt_id", Number(projektId));

    setRegie(regieRes.data || []);

    const fotosRes = await supabase
      .from("projekt_fotos")
      .select("*")
      .eq("projekt_id", Number(projektId));

    setFotos(fotosRes.data || []);

    const aufgabenRes = await supabase
      .from("projekt_aufgaben")
      .select("*")
      .eq("projekt_id", Number(projektId));

    setAufgaben(aufgabenRes.data || []);

    const materialRes = await supabase
      .from("projekt_material_bewegungen")
      .select("*")
      .eq("projekt_id", Number(projektId));

    setMaterialBewegungen(materialRes.data || []);

    setLoading(false);
  }

  function clearForm() {
    setEditingId(null);
    setRaumName("");
    setEbene("");
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

  function getRaumUsage(raumId: number | string) {
    const arbeitszeitCount = arbeitszeiten.filter(
      (x) => Number(x.raum_id) === Number(raumId)
    ).length;

    const leistungCount = leistungen.filter(
      (x) => Number(x.raum_id) === Number(raumId)
    ).length;

    const regieCount = regie.filter(
      (x) => Number(x.raum_id) === Number(raumId)
    ).length;

    const fotosCount = fotos.filter(
      (x) => Number(x.raum_id) === Number(raumId)
    ).length;

    const aufgabenCount = aufgaben.filter(
      (x) => Number(x.raum_id) === Number(raumId)
    ).length;

    const materialCount = materialBewegungen.filter(
      (x) => Number(x.raum_id) === Number(raumId)
    ).length;

    return {
      arbeitszeitCount,
      leistungCount,
      regieCount,
      fotosCount,
      aufgabenCount,
      materialCount,
      total:
        arbeitszeitCount +
        leistungCount +
        regieCount +
        fotosCount +
        aufgabenCount +
        materialCount,
    };
  }

  async function saveRaum() {
    if (savingRef.current) return;

    if (!raumName.trim()) {
      alert("Unesi naziv prostorije.");
      return;
    }

    savingRef.current = true;
    setSaving(true);

    const payload: any = {
      projekt_id: Number(projektId),
      raum_name: raumName.trim(),
      ebene: ebene.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("projekt_raeume")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        alert("Greška kod izmjene prostorije: " + error.message);
        savingRef.current = false;
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("projekt_raeume").insert(payload);

      if (error) {
        alert("Greška kod dodavanja prostorije: " + error.message);
        savingRef.current = false;
        setSaving(false);
        return;
      }
    }

    clearForm();
    setShowForm(false);
    await loadData();

    savingRef.current = false;
    setSaving(false);
  }

  function editRaum(raum: any) {
    setEditingId(raum.id);
    setRaumName(raum.raum_name || "");
    setEbene(raum.ebene || "");
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteRaum(raum: any) {
    const usage = getRaumUsage(raum.id);

    if (usage.total > 0) {
      alert(
        "Ova prostorija se već koristi i ne može se obrisati dok ne obrišeš povezane unose.\n\n" +
          `Arbeitszeit: ${usage.arbeitszeitCount}\n` +
          `Leistung: ${usage.leistungCount}\n` +
          `Regie: ${usage.regieCount}\n` +
          `Fotos: ${usage.fotosCount}\n` +
          `Aufgaben: ${usage.aufgabenCount}\n` +
          `Material: ${usage.materialCount}`
      );
      return;
    }

    const ok = confirm("Da li sigurno želiš obrisati ovu prostoriju?");

    if (!ok) return;

    const { error } = await supabase
      .from("projekt_raeume")
      .delete()
      .eq("id", raum.id);

    if (error) {
      alert("Greška kod brisanja prostorije: " + error.message);
      return;
    }

    await loadData();
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <h1 style={titleStyle}>🏠 Räume</h1>
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

  return (
    <main style={mainStyle}>
      <div style={topBarStyle}>
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <div style={topButtonWrapStyle}>
          <button onClick={loadData} style={refreshButtonStyle}>
            Aktualisieren
          </button>

          <button
            onClick={() => {
              clearForm();
              setShowForm(!showForm);
            }}
            disabled={saving}
            style={newButtonStyle}
          >
            {showForm ? "Schließen" : "+ Raum"}
          </button>
        </div>
      </div>

      <h1 style={titleStyle}>🏠 Räume</h1>

      <p style={descriptionStyle}>
        Projekt: <strong>{projekt?.project_name || "-"}</strong> · Admin:{" "}
        <strong>{workerName}</strong>
      </p>

      <section style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Räume gesamt</span>
          <strong style={summaryValueStyle}>{summary.total}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Ebenen</span>
          <strong style={summaryValueStyle}>{summary.ebenen}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Benutzte Räume</span>
          <strong style={{ ...summaryValueStyle, color: "#facc15" }}>
            {summary.benutzteRaeume}
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Freie Räume</span>
          <strong style={{ ...summaryValueStyle, color: "#22c55e" }}>
            {summary.freieRaeume}
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Arbeitszeit</span>
          <strong style={summaryValueStyle}>{summary.arbeitszeiten}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Leistung</span>
          <strong style={summaryValueStyle}>{summary.leistungen}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Fotos</span>
          <strong style={summaryValueStyle}>{summary.fotos}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Aufgaben</span>
          <strong style={summaryValueStyle}>{summary.aufgaben}</strong>
        </div>
      </section>

      <section style={infoBoxStyle}>
        <h2 style={sectionTitleStyle}>Räume Regel</h2>
        <p style={infoTextStyle}>
          Räume su osnova za Arbeitszeit, Leistung, Regie, Fotos, Aufgaben i
          Material. Prostorija se ne može obrisati ako već ima povezane unose.
        </p>
      </section>

      <section style={filterBoxStyle}>
        <div style={filterGridStyle}>
          <div>
            <label style={labelStyle}>Traži Raum</label>
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="npr. Bad, WC, Küche..."
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Ebene Filter</label>
            <select
              value={filterEbene}
              onChange={(e) => setFilterEbene(e.target.value)}
              style={inputStyle}
            >
              <option value="Alle">Alle Ebenen</option>
              {ebenen.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setSearchText("");
              setFilterEbene("Alle");
            }}
            style={grayButtonStyle}
          >
            Filter löschen
          </button>
        </div>
      </section>

      {showForm && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>
            {editingId ? "Raum bearbeiten" : "Raum anlegen"}
          </h2>

          <label style={labelStyle}>Raum Name *</label>
          <input
            value={raumName}
            onChange={(e) => setRaumName(e.target.value)}
            placeholder="z.B. Bad EG, WC OG, Küche"
            style={inputStyle}
          />

          <label style={labelStyle}>Ebene / Geschoss</label>
          <input
            value={ebene}
            onChange={(e) => setEbene(e.target.value)}
            placeholder="EG, OG, DG, KG"
            style={inputStyle}
          />

          <div style={previewBoxStyle}>
            <strong>Pregled:</strong>{" "}
            {ebene ? `${ebene} - ` : ""}
            {raumName || "-"}
          </div>

          <div style={formButtonRowStyle}>
            <button
              onClick={saveRaum}
              disabled={saving}
              style={{
                ...saveButtonStyle,
                opacity: saving ? 0.5 : 1,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving
                ? "Speichern..."
                : editingId
                ? "Änderungen speichern"
                : "Raum speichern"}
            </button>

            <button
              onClick={() => {
                clearForm();
                setShowForm(false);
              }}
              disabled={saving}
              style={cancelButtonStyle}
            >
              Abbrechen
            </button>
          </div>
        </section>
      )}

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Räume Liste</h2>

        {raumRows.length === 0 ? (
          <p style={emptyStyle}>Keine Räume gefunden.</p>
        ) : (
          <div style={raumGridStyle}>
            {raumRows.map((raum) => (
              <div key={raum.id} style={raumCardStyle}>
                <div style={cardTopStyle}>
                  <span style={raumBadgeStyle}>Raum</span>

                  {raum.usage.total > 0 ? (
                    <span style={warningBadgeStyle}>Benutzt</span>
                  ) : (
                    <span style={okBadgeStyle}>Frei</span>
                  )}
                </div>

                <h3 style={raumTitleStyle}>
                  {raum.ebene ? `${raum.ebene} - ` : ""}
                  {raum.raum_name}
                </h3>

                <div style={detailGridStyle}>
                  <div>
                    <span style={smallLabelStyle}>Ebene</span>
                    <strong>{raum.ebene || "-"}</strong>
                  </div>

                  <div>
                    <span style={smallLabelStyle}>Nutzung gesamt</span>
                    <strong>{raum.usage.total}</strong>
                  </div>

                  <div>
                    <span style={smallLabelStyle}>Arbeitszeit</span>
                    <strong>{raum.usage.arbeitszeitCount}</strong>
                  </div>

                  <div>
                    <span style={smallLabelStyle}>Leistung</span>
                    <strong>{raum.usage.leistungCount}</strong>
                  </div>

                  <div>
                    <span style={smallLabelStyle}>Regie</span>
                    <strong>{raum.usage.regieCount}</strong>
                  </div>

                  <div>
                    <span style={smallLabelStyle}>Fotos</span>
                    <strong>{raum.usage.fotosCount}</strong>
                  </div>

                  <div>
                    <span style={smallLabelStyle}>Aufgaben</span>
                    <strong>{raum.usage.aufgabenCount}</strong>
                  </div>

                  <div>
                    <span style={smallLabelStyle}>Material</span>
                    <strong>{raum.usage.materialCount}</strong>
                  </div>
                </div>

                {isAdmin && (
                  <p style={metaTextStyle}>
                    Zeit der Eingabe:{" "}
                    <strong>{formatDateTime(raum.created_at)}</strong>
                  </p>
                )}

                <div style={linkGridStyle}>
                  <Link
                    href={`/projekte/${projektId}/arbeitszeit`}
                    style={blueLinkStyle}
                  >
                    Arbeitszeit
                  </Link>

                  <Link
                    href={`/projekte/${projektId}/leistung`}
                    style={greenLinkStyle}
                  >
                    Leistung
                  </Link>

                  <Link href={`/projekte/${projektId}/fotos`} style={orangeLinkStyle}>
                    Fotos
                  </Link>
                </div>

                <div style={actionRowStyle}>
                  <button onClick={() => editRaum(raum)} style={editButtonStyle}>
                    Bearbeiten
                  </button>

                  <button onClick={() => deleteRaum(raum)} style={deleteButtonStyle}>
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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

const newButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px 18px",
  fontSize: "15px",
  fontWeight: "bold",
  cursor: "pointer",
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

const filterBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "20px",
};

const filterGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "12px",
  alignItems: "end",
};

const formBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "22px",
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
  padding: "12px",
  color: "#ddd",
  lineHeight: "1.5",
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
  padding: "12px",
  fontWeight: "bold",
  cursor: "pointer",
};

const listBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "22px",
};

const emptyStyle: any = {
  color: "#aaa",
  fontSize: "16px",
};

const raumGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: "14px",
};

const raumCardStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "14px",
};

const cardTopStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
};

const raumTitleStyle: any = {
  color: "#f97316",
  margin: "12px 0 10px 0",
  fontSize: "19px",
  lineHeight: "1.35",
};

const detailGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  background: "#080808",
  border: "1px solid #222",
  borderRadius: "12px",
  padding: "10px",
};

const smallLabelStyle: any = {
  display: "block",
  color: "#aaa",
  fontSize: "12px",
  marginBottom: "4px",
};

const metaTextStyle: any = {
  color: "#aaa",
  fontSize: "13px",
  margin: "8px 0",
};

const linkGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "8px",
  marginTop: "12px",
};

const blueLinkStyle: any = {
  background: "#2563eb",
  color: "white",
  borderRadius: "8px",
  padding: "8px",
  textAlign: "center",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "12px",
};

const greenLinkStyle: any = {
  ...blueLinkStyle,
  background: "#16a34a",
};

const orangeLinkStyle: any = {
  ...blueLinkStyle,
  background: "#f97316",
};

const actionRowStyle: any = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "12px",
};

const editButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "8px 10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const deleteButtonStyle: any = {
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "8px 10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const raumBadgeStyle: any = {
  background: "#7c3aed",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const okBadgeStyle: any = {
  background: "#16a34a",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const warningBadgeStyle: any = {
  background: "#ca8a04",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};