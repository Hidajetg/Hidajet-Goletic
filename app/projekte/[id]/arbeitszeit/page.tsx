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

export default function ProjektArbeitszeitPage() {
  const params = useParams();
  const router = useRouter();

  const projektId = String(params.id);

  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [projekt, setProjekt] = useState<any>(null);
  const [raeume, setRaeume] = useState<any[]>([]);
  const [positionen, setPositionen] = useState<any[]>([]);
  const [zeiten, setZeiten] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [selectedWorker, setSelectedWorker] = useState("");
  const [datum, setDatum] = useState(getTodayLocalDate());
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("16:00");
  const [pauseMinutes, setPauseMinutes] = useState("30");
  const [selectedRaumId, setSelectedRaumId] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [arbeitsart, setArbeitsart] = useState("Leistung");
  const [notiz, setNotiz] = useState("");

  const summary = useMemo(() => {
    const totalHours = zeiten.reduce((sum, z) => sum + Number(z.stunden || 0), 0);

    const workers = Array.from(new Set(zeiten.map((z) => z.worker_name))).filter(
      Boolean
    );

    const todayHours = zeiten
      .filter((z) => z.datum === getTodayLocalDate())
      .reduce((sum, z) => sum + Number(z.stunden || 0), 0);

    return {
      totalHours,
      workerCount: workers.length,
      todayHours,
      entryCount: zeiten.length,
    };
  }, [zeiten]);

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
    setSelectedWorker(name);
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

    const zeitenRes = await supabase
      .from("projekt_arbeitszeiten")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("datum", { ascending: false })
      .order("start_time", { ascending: false });

    if (zeitenRes.error) {
      alert("Greška kod učitavanja radnog vremena: " + zeitenRes.error.message);
      setZeiten([]);
      setLoading(false);
      return;
    }

    setZeiten(zeitenRes.data || []);
    setLoading(false);
  }

  function timeToMinutes(value: string) {
    if (!value || !value.includes(":")) return 0;

    const parts = value.split(":");
    const h = Number(parts[0] || 0);
    const m = Number(parts[1] || 0);

    return h * 60 + m;
  }

  function calculateHours() {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    const pause = Number(pauseMinutes || 0);

    let diff = end - start - pause;

    if (diff < 0) diff = 0;

    return diff / 60;
  }

  function clearForm() {
    setEditingId(null);
    setSelectedWorker(workerName || "Arnes");
    setDatum(getTodayLocalDate());
    setStartTime("07:00");
    setEndTime("16:00");
    setPauseMinutes("30");
    setSelectedRaumId("");
    setSelectedPositionId("");
    setArbeitsart("Leistung");
    setNotiz("");
  }

  async function saveArbeitszeit() {
    if (!selectedWorker) {
      alert("Odaberi radnika.");
      return;
    }

    if (!datum) {
      alert("Odaberi datum.");
      return;
    }

    if (!startTime || !endTime) {
      alert("Unesi vrijeme od-do.");
      return;
    }

    if (!selectedRaumId) {
      alert("Odaberi prostoriju.");
      return;
    }

    const stunden = calculateHours();

    if (stunden <= 0) {
      alert("Radno vrijeme mora biti veće od 0.");
      return;
    }

    const payload = {
      projekt_id: Number(projektId),
      worker_name: selectedWorker,
      datum,
      start_time: startTime,
      end_time: endTime,
      pause_minutes: Number(pauseMinutes || 0),
      stunden,
      raum_id: selectedRaumId ? Number(selectedRaumId) : null,
      lv_position_id: selectedPositionId ? Number(selectedPositionId) : null,
      arbeitsart,
      notiz: notiz.trim() || null,
      created_by: workerName,
    };

    if (editingId) {
      const { error } = await supabase
        .from("projekt_arbeitszeiten")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        alert("Greška kod izmjene radnog vremena: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("projekt_arbeitszeiten")
        .insert(payload);

      if (error) {
        alert("Greška kod dodavanja radnog vremena: " + error.message);
        return;
      }
    }

    clearForm();
    setShowForm(false);
    loadData();
  }

  function editZeit(zeit: any) {
    setEditingId(zeit.id);
    setSelectedWorker(zeit.worker_name || "");
    setDatum(zeit.datum || getTodayLocalDate());
    setStartTime(String(zeit.start_time || "07:00").slice(0, 5));
    setEndTime(String(zeit.end_time || "16:00").slice(0, 5));
    setPauseMinutes(String(zeit.pause_minutes ?? "0"));
    setSelectedRaumId(zeit.raum_id ? String(zeit.raum_id) : "");
    setSelectedPositionId(zeit.lv_position_id ? String(zeit.lv_position_id) : "");
    setArbeitsart(zeit.arbeitsart || "Leistung");
    setNotiz(zeit.notiz || "");
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteZeit(id: number) {
    const ok = confirm("Da li sigurno želiš obrisati ovaj unos radnog vremena?");

    if (!ok) return;

    const { error } = await supabase
      .from("projekt_arbeitszeiten")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Greška kod brisanja radnog vremena: " + error.message);
      return;
    }

    loadData();
  }

  function getRaumName(id: number | null) {
    if (!id) return "-";

    const raum = raeume.find((r) => r.id === id);

    if (!raum) return "-";

    return `${raum.ebene ? raum.ebene + " - " : ""}${raum.raum_name}`;
  }

  function getPositionText(id: number | null) {
    if (!id) return "-";

    const pos = positionen.find((p) => p.id === id);

    if (!pos) return "-";

    return `${pos.position_nr} - ${pos.kurztext}`;
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    return new Date(value).toLocaleDateString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatNumber(value: any, digits = 2) {
    const num = Number(value || 0);

    return num.toLocaleString("de-AT", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <h1 style={titleStyle}>⏱️ Arbeitszeit</h1>
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
          {showForm ? "Schließen" : "+ Arbeitszeit"}
        </button>
      </div>

      <h1 style={titleStyle}>⏱️ Arbeitszeit</h1>

      <p style={descriptionStyle}>
        Projekt: <strong>{projekt?.project_name || "-"}</strong>
      </p>

      <section style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Einträge</span>
          <strong style={summaryValueStyle}>{summary.entryCount}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Radnici</span>
          <strong style={summaryValueStyle}>{summary.workerCount}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Heute</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.todayHours)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Gesamt</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.totalHours)} h
          </strong>
        </div>
      </section>

      <section style={infoBoxStyle}>
        <h2 style={sectionTitleStyle}>Kako se ovo koristi?</h2>
        <p style={infoTextStyle}>
          Svaki radnik treba imati svoje sate po prostoriji. Kasnije kada se
          unese dnevni učinak, aplikacija će učinak dijeliti prema satima koje
          su radnici proveli u toj prostoriji i na toj LV poziciji.
        </p>
      </section>

      {showForm && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>
            {editingId ? "Arbeitszeit bearbeiten" : "Arbeitszeit eintragen"}
          </h2>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Radnik *</label>
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                style={inputStyle}
              >
                <option value="">Odaberi radnika</option>
                {RADNICI.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Datum *</label>
              <input
                type="date"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Von *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Bis *</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Pause Minuten</label>
              <input
                value={pauseMinutes}
                onChange={(e) => setPauseMinutes(e.target.value)}
                placeholder="z.B. 30"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={calculatedBoxStyle}>
            Berechnet: <strong>{formatNumber(calculateHours())} h</strong>
          </div>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Raum *</label>
              <select
                value={selectedRaumId}
                onChange={(e) => setSelectedRaumId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Odaberi prostoriju</option>
                {raeume.map((raum) => (
                  <option key={raum.id} value={raum.id}>
                    {raum.ebene ? `${raum.ebene} - ` : ""}
                    {raum.raum_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>LV Position</label>
              <select
                value={selectedPositionId}
                onChange={(e) => setSelectedPositionId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Bez LV pozicije</option>
                {positionen.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.position_nr} - {pos.kurztext}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Arbeitsart</label>
              <select
                value={arbeitsart}
                onChange={(e) => setArbeitsart(e.target.value)}
                style={inputStyle}
              >
                <option value="Leistung">Leistung</option>
                <option value="Vorbereitung">Vorbereitung</option>
                <option value="Nacharbeit">Nacharbeit</option>
                <option value="Sonstiges">Sonstiges</option>
              </select>
            </div>
          </div>

          <label style={labelStyle}>Notiz</label>
          <textarea
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            placeholder="Napomena za radno vrijeme"
            style={textareaStyle}
          />

          <div style={formButtonRowStyle}>
            <button onClick={saveArbeitszeit} style={saveButtonStyle}>
              {editingId ? "Änderungen speichern" : "Arbeitszeit speichern"}
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
        <h2 style={sectionTitleStyle}>Arbeitszeit Liste</h2>

        {zeiten.length === 0 ? (
          <p style={emptyStyle}>Noch keine Arbeitszeit vorhanden.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Datum</th>
                  <th style={thStyle}>Radnik</th>
                  <th style={thStyle}>Von</th>
                  <th style={thStyle}>Bis</th>
                  <th style={thStyle}>Pause</th>
                  <th style={thStyle}>Stunden</th>
                  <th style={thStyle}>Raum</th>
                  <th style={thStyle}>LV Position</th>
                  <th style={thStyle}>Art</th>
                  <th style={thStyle}>Notiz</th>
                  <th style={thStyle}>Aktion</th>
                </tr>
              </thead>

              <tbody>
                {zeiten.map((zeit) => (
                  <tr key={zeit.id}>
                    <td style={tdStyle}>{formatDate(zeit.datum)}</td>
                    <td style={tdStyle}>
                      <strong>{zeit.worker_name}</strong>
                    </td>
                    <td style={tdStyle}>
                      {String(zeit.start_time || "").slice(0, 5)}
                    </td>
                    <td style={tdStyle}>
                      {String(zeit.end_time || "").slice(0, 5)}
                    </td>
                    <td style={tdRightStyle}>
                      {formatNumber(zeit.pause_minutes, 0)} min
                    </td>
                    <td style={tdRightStyle}>
                      <strong>{formatNumber(zeit.stunden)} h</strong>
                    </td>
                    <td style={tdStyle}>{getRaumName(zeit.raum_id)}</td>
                    <td style={tdStyle}>{getPositionText(zeit.lv_position_id)}</td>
                    <td style={tdStyle}>{zeit.arbeitsart || "-"}</td>
                    <td style={tdStyle}>{zeit.notiz || "-"}</td>
                    <td style={tdStyle}>
                      <div style={actionRowStyle}>
                        <button
                          onClick={() => editZeit(zeit)}
                          style={editButtonStyle}
                        >
                          Bearbeiten
                        </button>

                        <button
                          onClick={() => deleteZeit(zeit.id)}
                          style={deleteButtonStyle}
                        >
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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

const calculatedBoxStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "12px",
  padding: "12px",
  marginTop: "12px",
  color: "#f97316",
  fontSize: "16px",
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

const tableWrapStyle: any = {
  overflowX: "auto",
};

const tableStyle: any = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "1150px",
};

const thStyle: any = {
  borderBottom: "1px solid #333",
  color: "#f97316",
  padding: "10px",
  textAlign: "left",
  fontSize: "13px",
  whiteSpace: "nowrap",
};

const tdStyle: any = {
  borderBottom: "1px solid #222",
  color: "#ddd",
  padding: "10px",
  fontSize: "13px",
  verticalAlign: "top",
};

const tdRightStyle: any = {
  ...tdStyle,
  textAlign: "right",
  whiteSpace: "nowrap",
};

const actionRowStyle: any = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const editButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "7px 9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const deleteButtonStyle: any = {
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "7px 9px",
  fontWeight: "bold",
  cursor: "pointer",
};