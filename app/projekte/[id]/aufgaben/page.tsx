"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];
const RADNICI = ["Arnes", "Ramiz", "Abror", "Shohruh", "Harun", "Hido", "Steffi"];

function getTodayLocalDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function ProjektAufgabenPage() {
  const params = useParams();
  const router = useRouter();

  const projektId = String(params.id);

  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [projekt, setProjekt] = useState<any>(null);
  const [raeume, setRaeume] = useState<any[]>([]);
  const [positionen, setPositionen] = useState<any[]>([]);
  const [aufgaben, setAufgaben] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [datum, setDatum] = useState(getTodayLocalDate());
  const [typ, setTyp] = useState("Aufgabe");
  const [titel, setTitel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [prioritaet, setPrioritaet] = useState("Normal");
  const [status, setStatus] = useState("Offen");
  const [assignedTo, setAssignedTo] = useState("");
  const [faelligBis, setFaelligBis] = useState("");
  const [selectedRaumId, setSelectedRaumId] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState("");

  const summary = useMemo(() => {
    const offen = aufgaben.filter((a) => a.status === "Offen").length;
    const inArbeit = aufgaben.filter((a) => a.status === "In Arbeit").length;
    const erledigt = aufgaben.filter((a) => a.status === "Erledigt").length;
    const mangel = aufgaben.filter((a) => a.typ === "Mangel").length;

    const today = getTodayLocalDate();

    const ueberfaellig = aufgaben.filter((a) => {
      if (!a.faellig_bis) return false;
      if (a.status === "Erledigt") return false;

      return String(a.faellig_bis) < today;
    }).length;

    return {
      total: aufgaben.length,
      offen,
      inArbeit,
      erledigt,
      mangel,
      ueberfaellig,
    };
  }, [aufgaben]);

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

    const positionenRes = await supabase
      .from("projekt_lv_positionen")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .eq("aktiv", true)
      .order("position_nr", { ascending: true });

    if (positionenRes.error) {
      alert("Greška kod učitavanja LV pozicija: " + positionenRes.error.message);
      setPositionen([]);
      setLoading(false);
      return;
    }

    setPositionen(positionenRes.data || []);

    const aufgabenRes = await supabase
      .from("projekt_aufgaben")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("status", { ascending: true })
      .order("prioritaet", { ascending: true })
      .order("created_at", { ascending: false });

    if (aufgabenRes.error) {
      alert("Greška kod učitavanja zadataka: " + aufgabenRes.error.message);
      setAufgaben([]);
      setLoading(false);
      return;
    }

    setAufgaben(aufgabenRes.data || []);
    setLoading(false);
  }

  function clearForm() {
    setEditingId(null);
    setDatum(getTodayLocalDate());
    setTyp("Aufgabe");
    setTitel("");
    setBeschreibung("");
    setPrioritaet("Normal");
    setStatus("Offen");
    setAssignedTo("");
    setFaelligBis("");
    setSelectedRaumId("");
    setSelectedPositionId("");
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    const parts = String(value).split("-");
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }

    return value;
  }

  function isOverdue(item: any) {
    if (!item.faellig_bis) return false;
    if (item.status === "Erledigt") return false;

    return String(item.faellig_bis) < getTodayLocalDate();
  }

  function getRaumName(id: number | null) {
    if (!id) return "-";

    const raum = raeume.find((r) => Number(r.id) === Number(id));

    if (!raum) return "-";

    return `${raum.ebene ? raum.ebene + " - " : ""}${raum.raum_name}`;
  }

  function getPositionText(id: number | null) {
    if (!id) return "-";

    const pos = positionen.find((p) => Number(p.id) === Number(id));

    if (!pos) return "-";

    return `${pos.position_nr} - ${pos.kurztext}`;
  }

  async function saveAufgabe() {
    if (!titel.trim()) {
      alert("Unesi naslov.");
      return;
    }

    const erledigtAm =
      status === "Erledigt"
        ? getTodayLocalDate()
        : null;

    const payload = {
      projekt_id: Number(projektId),
      datum,
      typ,
      titel: titel.trim(),
      beschreibung: beschreibung.trim() || null,
      prioritaet,
      status,
      assigned_to: assignedTo || null,
      faellig_bis: faelligBis || null,
      erledigt_am: erledigtAm,
      raum_id: selectedRaumId ? Number(selectedRaumId) : null,
      lv_position_id: selectedPositionId ? Number(selectedPositionId) : null,
      created_by: workerName,
    };

    if (editingId) {
      const { error } = await supabase
        .from("projekt_aufgaben")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        alert("Greška kod izmjene zadatka: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("projekt_aufgaben").insert(payload);

      if (error) {
        alert("Greška kod dodavanja zadatka: " + error.message);
        return;
      }
    }

    clearForm();
    setShowForm(false);
    loadData();
  }

  function editAufgabe(item: any) {
    setEditingId(item.id);
    setDatum(item.datum || getTodayLocalDate());
    setTyp(item.typ || "Aufgabe");
    setTitel(item.titel || "");
    setBeschreibung(item.beschreibung || "");
    setPrioritaet(item.prioritaet || "Normal");
    setStatus(item.status || "Offen");
    setAssignedTo(item.assigned_to || "");
    setFaelligBis(item.faellig_bis || "");
    setSelectedRaumId(item.raum_id ? String(item.raum_id) : "");
    setSelectedPositionId(item.lv_position_id ? String(item.lv_position_id) : "");
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteAufgabe(id: number) {
    const ok = confirm("Da li sigurno želiš obrisati ovaj zadatak?");

    if (!ok) return;

    const { error } = await supabase
      .from("projekt_aufgaben")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Greška kod brisanja zadatka: " + error.message);
      return;
    }

    loadData();
  }

  async function changeStatus(item: any, newStatus: string) {
    const payload: any = {
      status: newStatus,
      erledigt_am: newStatus === "Erledigt" ? getTodayLocalDate() : null,
    };

    const { error } = await supabase
      .from("projekt_aufgaben")
      .update(payload)
      .eq("id", item.id);

    if (error) {
      alert("Greška kod promjene statusa: " + error.message);
      return;
    }

    loadData();
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <h1 style={titleStyle}>✅ Aufgaben / Mängel</h1>
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

        <button
          onClick={() => {
            clearForm();
            setShowForm(!showForm);
          }}
          style={newButtonStyle}
        >
          {showForm ? "Schließen" : "+ Aufgabe / Mangel"}
        </button>
      </div>

      <h1 style={titleStyle}>✅ Aufgaben / Mängel</h1>

      <p style={descriptionStyle}>
        Projekt: <strong>{projekt?.project_name || "-"}</strong>
      </p>

      <section style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Gesamt</span>
          <strong style={summaryValueStyle}>{summary.total}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Offen</span>
          <strong style={summaryValueStyle}>{summary.offen}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>In Arbeit</span>
          <strong style={summaryValueStyle}>{summary.inArbeit}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Mängel</span>
          <strong style={summaryValueStyle}>{summary.mangel}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Überfällig</span>
          <strong
            style={{
              ...summaryValueStyle,
              color: summary.ueberfaellig > 0 ? "#ef4444" : "#22c55e",
            }}
          >
            {summary.ueberfaellig}
          </strong>
        </div>
      </section>

      <section style={infoBoxStyle}>
        <h2 style={sectionTitleStyle}>Aufgaben Regel</h2>
        <p style={infoTextStyle}>
          Aufgaben und Mängel können einem Radnik, Raum und einer LV Position
          zugeordnet werden. Überfällige offene Punkte werden rot markiert.
        </p>
      </section>

      {showForm && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>
            {editingId ? "Aufgabe bearbeiten" : "Aufgabe / Mangel anlegen"}
          </h2>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Datum</label>
              <input
                type="date"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Typ</label>
              <select
                value={typ}
                onChange={(e) => setTyp(e.target.value)}
                style={inputStyle}
              >
                <option value="Aufgabe">Aufgabe</option>
                <option value="Mangel">Mangel</option>
                <option value="Info">Info</option>
              </select>
            </div>
          </div>

          <label style={labelStyle}>Titel *</label>
          <input
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="z.B. Bad EG Silikon fertig machen"
            style={inputStyle}
          />

          <label style={labelStyle}>Beschreibung</label>
          <textarea
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
            placeholder="Opis zadatka ili nedostatka"
            style={textareaStyle}
          />

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Priorität</label>
              <select
                value={prioritaet}
                onChange={(e) => setPrioritaet(e.target.value)}
                style={inputStyle}
              >
                <option value="Niedrig">Niedrig</option>
                <option value="Normal">Normal</option>
                <option value="Hoch">Hoch</option>
                <option value="Dringend">Dringend</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={inputStyle}
              >
                <option value="Offen">Offen</option>
                <option value="In Arbeit">In Arbeit</option>
                <option value="Erledigt">Erledigt</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Zuständig</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                style={inputStyle}
              >
                <option value="">Ohne Zuweisung</option>
                {RADNICI.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Fällig bis</label>
              <input
                type="date"
                value={faelligBis}
                onChange={(e) => setFaelligBis(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Raum</label>
              <select
                value={selectedRaumId}
                onChange={(e) => setSelectedRaumId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Ohne Raum</option>
                {raeume.map((raum) => (
                  <option key={raum.id} value={raum.id}>
                    {raum.ebene ? `${raum.ebene} - ` : ""}
                    {raum.raum_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label style={labelStyle}>LV Position</label>
          <select
            value={selectedPositionId}
            onChange={(e) => setSelectedPositionId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Ohne LV Position</option>
            {positionen.map((pos) => (
              <option key={pos.id} value={pos.id}>
                {pos.position_nr} - {pos.kurztext}
              </option>
            ))}
          </select>

          <div style={formButtonRowStyle}>
            <button onClick={saveAufgabe} style={saveButtonStyle}>
              {editingId ? "Änderungen speichern" : "Aufgabe speichern"}
            </button>

            <button
              onClick={() => {
                clearForm();
                setShowForm(false);
              }}
              style={cancelButtonStyle}
            >
              Abbrechen
            </button>
          </div>
        </section>
      )}

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Aufgaben Liste</h2>

        {aufgaben.length === 0 ? (
          <p style={emptyStyle}>Noch keine Aufgaben vorhanden.</p>
        ) : (
          <div style={taskGridStyle}>
            {aufgaben.map((item) => (
              <div
                key={item.id}
                style={{
                  ...taskCardStyle,
                  border:
                    isOverdue(item)
                      ? "1px solid #dc2626"
                      : item.typ === "Mangel"
                      ? "1px solid #ca8a04"
                      : "1px solid #333",
                }}
              >
                <div style={taskTopRowStyle}>
                  <span
                    style={
                      item.typ === "Mangel"
                        ? warningBadgeStyle
                        : item.typ === "Info"
                        ? blueBadgeStyle
                        : okBadgeStyle
                    }
                  >
                    {item.typ || "Aufgabe"}
                  </span>

                  <span
                    style={
                      item.prioritaet === "Dringend"
                        ? dangerBadgeStyle
                        : item.prioritaet === "Hoch"
                        ? warningBadgeStyle
                        : grayBadgeStyle
                    }
                  >
                    {item.prioritaet || "Normal"}
                  </span>
                </div>

                <h3 style={taskTitleStyle}>{item.titel}</h3>

                {item.beschreibung && (
                  <p style={taskDescriptionStyle}>{item.beschreibung}</p>
                )}

                <div style={taskInfoGridStyle}>
                  <div>
                    <span style={smallLabelStyle}>Status</span>
                    <select
                      value={item.status || "Offen"}
                      onChange={(e) => changeStatus(item, e.target.value)}
                      style={smallSelectStyle}
                    >
                      <option value="Offen">Offen</option>
                      <option value="In Arbeit">In Arbeit</option>
                      <option value="Erledigt">Erledigt</option>
                    </select>
                  </div>

                  <div>
                    <span style={smallLabelStyle}>Zuständig</span>
                    <strong>{item.assigned_to || "-"}</strong>
                  </div>

                  <div>
                    <span style={smallLabelStyle}>Fällig</span>
                    <strong style={{ color: isOverdue(item) ? "#ef4444" : "white" }}>
                      {formatDate(item.faellig_bis)}
                    </strong>
                  </div>

                  <div>
                    <span style={smallLabelStyle}>Erledigt</span>
                    <strong>{formatDate(item.erledigt_am)}</strong>
                  </div>
                </div>

                <p style={taskMetaStyle}>
                  Raum: <strong>{getRaumName(item.raum_id)}</strong>
                </p>

                <p style={taskMetaStyle}>
                  LV: <strong>{getPositionText(item.lv_position_id)}</strong>
                </p>

                <p style={taskMetaStyle}>
                  Erstellt von: <strong>{item.created_by || "-"}</strong> ·{" "}
                  {formatDate(item.datum)}
                </p>

                <div style={actionRowStyle}>
                  <button onClick={() => editAufgabe(item)} style={editButtonStyle}>
                    Bearbeiten
                  </button>

                  <button
                    onClick={() => deleteAufgabe(item.id)}
                    style={deleteButtonStyle}
                  >
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
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
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

const textareaStyle: any = {
  ...inputStyle,
  minHeight: "95px",
  resize: "vertical",
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

const taskGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
  gap: "14px",
};

const taskCardStyle: any = {
  background: "#000",
  borderRadius: "16px",
  padding: "14px",
};

const taskTopRowStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
};

const taskTitleStyle: any = {
  color: "#f97316",
  margin: "12px 0 8px 0",
  fontSize: "18px",
};

const taskDescriptionStyle: any = {
  color: "#ccc",
  fontSize: "14px",
  lineHeight: "1.45",
  margin: "0 0 12px 0",
};

const taskInfoGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "12px",
};

const smallLabelStyle: any = {
  display: "block",
  color: "#aaa",
  fontSize: "12px",
  marginBottom: "4px",
};

const taskMetaStyle: any = {
  color: "#aaa",
  fontSize: "13px",
  margin: "8px 0",
};

const smallSelectStyle: any = {
  background: "#111",
  color: "white",
  border: "1px solid #333",
  borderRadius: "8px",
  padding: "7px",
  width: "100%",
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

const dangerBadgeStyle: any = {
  background: "#dc2626",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const blueBadgeStyle: any = {
  background: "#2563eb",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const grayBadgeStyle: any = {
  background: "#4b5563",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};