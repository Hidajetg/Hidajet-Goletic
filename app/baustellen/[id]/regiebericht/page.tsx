"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

const WORKERS = ["Arnes", "Ramiz", "Abror", "Shohruh", "Harun"];

type WorkerRow = {
  worker_name: string;
  von: string;
  bis: string;
  stunden: string;
};

export default function RegieberichtPage() {
  const params = useParams();
  const baustelleId = String(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [baustelle, setBaustelle] = useState<any>(null);
  const [regieberichte, setRegieberichte] = useState<any[]>([]);
  const [regieWorkers, setRegieWorkers] = useState<any[]>([]);

  const [berichtNr, setBerichtNr] = useState("");
  const [datum, setDatum] = useState(getToday());
  const [ort, setOrt] = useState("");
  const [ausgefuehrteArbeiten, setAusgefuehrteArbeiten] = useState("");

  const [workers, setWorkers] = useState<WorkerRow[]>([
    {
      worker_name: "",
      von: "08:00",
      bis: "17:00",
      stunden: "8.5",
    },
  ]);

  useEffect(() => {
    loadData();
  }, []);

  function getToday() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function formatDate(value: string) {
    if (!value) return "-";

    const [year, month, day] = value.split("-");
    if (!year || !month || !day) return value;

    return `${day}.${month}.${year}`;
  }

  function cleanText(value: any) {
    return String(value ?? "").trim();
  }

  function toNumber(value: any) {
    const n = Number(String(value ?? "0").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function calculateHours(von: string, bis: string) {
    if (!von || !bis) return "";

    const [vh, vm] = von.split(":").map(Number);
    const [bh, bm] = bis.split(":").map(Number);

    if (
      !Number.isFinite(vh) ||
      !Number.isFinite(vm) ||
      !Number.isFinite(bh) ||
      !Number.isFinite(bm)
    ) {
      return "";
    }

    const start = vh * 60 + vm;
    const end = bh * 60 + bm;

    if (end <= start) return "";

    const diff = (end - start) / 60;

    return String(Number(diff.toFixed(2)));
  }

  function getTotalHours(rows: WorkerRow[]) {
    return rows.reduce((sum, row) => sum + toNumber(row.stunden), 0);
  }

  function getNextBerichtNr(data: any[]) {
    if (!data || data.length === 0) return "001";

    const numbers = data
      .map((item) => Number(String(item.bericht_nr || item.id || "0").replace(/\D/g, "")))
      .filter((n) => Number.isFinite(n));

    const max = numbers.length > 0 ? Math.max(...numbers) : data.length;

    return String(max + 1).padStart(3, "0");
  }

  async function loadData() {
    setLoading(true);

    const { data: baustelleData, error: baustelleError } = await supabase
      .from("baustellen")
      .select("*")
      .eq("id", Number(baustelleId))
      .maybeSingle();

    if (baustelleError) {
      alert("Fehler Baustelle: " + baustelleError.message);
      setLoading(false);
      return;
    }

    const { data: regieData, error: regieError } = await supabase
      .from("regieberichte")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("datum", { ascending: false });

    if (regieError) {
      alert("Fehler Regieberichte: " + regieError.message);
      setLoading(false);
      return;
    }

    const ids = (regieData || []).map((r: any) => r.id);

    let workerData: any[] = [];

    if (ids.length > 0) {
      const { data, error } = await supabase
        .from("regiebericht_workers")
        .select("*")
        .in("regiebericht_id", ids);

      if (error) {
        alert("Fehler Regie Mitarbeiter: " + error.message);
        setLoading(false);
        return;
      }

      workerData = data || [];
    }

    setBaustelle(baustelleData);
    setRegieberichte(regieData || []);
    setRegieWorkers(workerData);

    setBerichtNr(getNextBerichtNr(regieData || []));
    setOrt(baustelleData?.ort || "");

    const storedName =
      localStorage.getItem("worker_name") ||
      localStorage.getItem("userName") ||
      "";

    if (storedName) {
      setWorkers([
        {
          worker_name: storedName,
          von: "08:00",
          bis: "17:00",
          stunden: "8.5",
        },
      ]);
    }

    setLoading(false);
  }

  function updateWorker(index: number, field: keyof WorkerRow, value: string) {
    setWorkers((prev) => {
      const copy = [...prev];

      copy[index] = {
        ...copy[index],
        [field]: value,
      };

      if (field === "von" || field === "bis") {
        const calculated = calculateHours(
          field === "von" ? value : copy[index].von,
          field === "bis" ? value : copy[index].bis
        );

        if (calculated) {
          copy[index].stunden = calculated;
        }
      }

      return copy;
    });
  }

  function addWorkerRow() {
    setWorkers((prev) => [
      ...prev,
      {
        worker_name: "",
        von: "08:00",
        bis: "17:00",
        stunden: "8.5",
      },
    ]);
  }

  function removeWorkerRow(index: number) {
    setWorkers((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveRegiebericht() {
    if (!datum) {
      alert("Datum fehlt.");
      return;
    }

    if (!ort.trim()) {
      alert("Ort fehlt.");
      return;
    }

    if (!ausgefuehrteArbeiten.trim()) {
      alert("Ausgeführte Arbeiten fehlen.");
      return;
    }

    const validWorkers = workers.filter(
      (w) =>
        cleanText(w.worker_name) &&
        cleanText(w.von) &&
        cleanText(w.bis) &&
        toNumber(w.stunden) > 0
    );

    if (validWorkers.length === 0) {
      alert("Mindestens ein Mitarbeiter muss eingetragen werden.");
      return;
    }

    setSaving(true);

    const { data: berichtData, error: berichtError } = await supabase
      .from("regieberichte")
      .insert([
        {
          baustelle_id: Number(baustelleId),
          bericht_nr: berichtNr.trim() || getNextBerichtNr(regieberichte),
          datum,
          ort: ort.trim(),
          ausgefuehrte_arbeiten: ausgefuehrteArbeiten.trim(),
        },
      ])
      .select()
      .single();

    if (berichtError) {
      alert("Fehler Regiebericht: " + berichtError.message);
      setSaving(false);
      return;
    }

    const rows = validWorkers.map((worker) => ({
      regiebericht_id: berichtData.id,
      worker_name: worker.worker_name.trim(),
      von: worker.von,
      bis: worker.bis,
      stunden: toNumber(worker.stunden),
    }));

    const { error: workersError } = await supabase
      .from("regiebericht_workers")
      .insert(rows);

    if (workersError) {
      alert("Fehler Mitarbeiter: " + workersError.message);
      setSaving(false);
      return;
    }

    setAusgefuehrteArbeiten("");
    setWorkers([
      {
        worker_name:
          localStorage.getItem("worker_name") ||
          localStorage.getItem("userName") ||
          "",
        von: "08:00",
        bis: "17:00",
        stunden: "8.5",
      },
    ]);

    await loadData();

    setSaving(false);

    alert("Regiebericht wurde gespeichert.");
  }

  function getWorkersForBericht(berichtId: number) {
    return regieWorkers.filter(
      (row) => Number(row.regiebericht_id) === Number(berichtId)
    );
  }

  async function deleteRegiebericht(id: number) {
    const ok = confirm("Regiebericht wirklich löschen?");
    if (!ok) return;

    const { error: workerError } = await supabase
      .from("regiebericht_workers")
      .delete()
      .eq("regiebericht_id", id);

    if (workerError) {
      alert("Fehler Mitarbeiter löschen: " + workerError.message);
      return;
    }

    const { error } = await supabase.from("regieberichte").delete().eq("id", id);

    if (error) {
      alert("Fehler Regiebericht löschen: " + error.message);
      return;
    }

    await loadData();
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <p>Laden...</p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <Link href={`/baustellen/${baustelleId}`} style={backLinkStyle}>
        ← Zurück zur Baustelle
      </Link>

      <h1 style={titleStyle}>REGIEBERICHT</h1>

      <section style={formBoxStyle}>
        <div style={topGridStyle}>
          <div style={fieldBoxStyle}>
            <label style={labelStyle}>Nr.</label>
            <input
              value={berichtNr}
              onChange={(e) => setBerichtNr(e.target.value)}
              style={inputStyle}
              placeholder="001"
            />
          </div>

          <div style={fieldBoxStyle}>
            <label style={labelStyle}>Datum</label>
            <input
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={fieldBoxStyle}>
            <label style={labelStyle}>Baustelle</label>
            <input
              value={baustelle?.name || baustelle?.naziv || ""}
              disabled
              style={disabledInputStyle}
            />
          </div>

          <div style={fieldBoxStyle}>
            <label style={labelStyle}>Ort</label>
            <input
              value={ort}
              onChange={(e) => setOrt(e.target.value)}
              style={inputStyle}
              placeholder="Ort"
            />
          </div>
        </div>

        <div style={fieldBoxStyle}>
          <label style={labelStyle}>Ausgeführte Arbeiten</label>
          <textarea
            value={ausgefuehrteArbeiten}
            onChange={(e) => setAusgefuehrteArbeiten(e.target.value)}
            style={textareaStyle}
            placeholder="Beschreibung der ausgeführten Arbeiten..."
          />
        </div>

        <h2 style={sectionTitleStyle}>Arbeitskräfte</h2>

        <div style={workerListStyle}>
          {workers.map((worker, index) => (
            <div key={index} style={workerRowStyle}>
              <select
                value={worker.worker_name}
                onChange={(e) =>
                  updateWorker(index, "worker_name", e.target.value)
                }
                style={inputStyle}
              >
                <option value="">Mitarbeiter wählen</option>
                {WORKERS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              <input
                type="time"
                value={worker.von}
                onChange={(e) => updateWorker(index, "von", e.target.value)}
                style={inputStyle}
              />

              <input
                type="time"
                value={worker.bis}
                onChange={(e) => updateWorker(index, "bis", e.target.value)}
                style={inputStyle}
              />

              <input
                value={worker.stunden}
                onChange={(e) => updateWorker(index, "stunden", e.target.value)}
                style={inputStyle}
                placeholder="Std."
              />

              <button
                type="button"
                onClick={() => removeWorkerRow(index)}
                style={deleteSmallButtonStyle}
              >
                Löschen
              </button>
            </div>
          ))}
        </div>

        <button type="button" onClick={addWorkerRow} style={addButtonStyle}>
          + Mitarbeiter hinzufügen
        </button>

        <div style={totalBoxStyle}>
          Gesamt: {getTotalHours(workers).toFixed(1).replace(".", ",")} h
        </div>

        <button
          type="button"
          onClick={saveRegiebericht}
          disabled={saving}
          style={saveButtonStyle}
        >
          {saving ? "Speichern..." : "Regiebericht speichern"}
        </button>
      </section>

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Gespeicherte Regieberichte</h2>

        {regieberichte.length === 0 ? (
          <p style={mutedStyle}>Keine Regieberichte vorhanden.</p>
        ) : (
          regieberichte.map((bericht) => {
            const rows = getWorkersForBericht(bericht.id);
            const sum = rows.reduce(
              (total, row) => total + toNumber(row.stunden),
              0
            );

            return (
              <div key={bericht.id} style={berichtCardStyle}>
                <div style={berichtHeaderStyle}>
                  <strong>Regiebericht Nr. {bericht.bericht_nr || bericht.id}</strong>
                  <span>{formatDate(bericht.datum)}</span>
                </div>

                <div style={smallGridStyle}>
                  <div>
                    <strong>Ort:</strong> {bericht.ort || "-"}
                  </div>

                  <div>
                    <strong>Gesamt:</strong>{" "}
                    {sum.toFixed(1).replace(".", ",")} h
                  </div>
                </div>

                <div style={workTextStyle}>
                  <strong>Ausgeführte Arbeiten:</strong>
                  <br />
                  {bericht.ausgefuehrte_arbeiten || "-"}
                </div>

                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Mitarbeiter</th>
                      <th style={thStyle}>Von</th>
                      <th style={thStyle}>Bis</th>
                      <th style={thStyle}>Stunden</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td style={tdStyle}>{row.worker_name}</td>
                        <td style={tdStyle}>{row.von}</td>
                        <td style={tdStyle}>{row.bis}</td>
                        <td style={tdStyle}>{row.stunden} h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button
                  type="button"
                  onClick={() => deleteRegiebericht(bericht.id)}
                  style={deleteButtonStyle}
                >
                  Löschen
                </button>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}

const pageStyle: any = {
  background: "#000",
  color: "#fff",
  minHeight: "100vh",
  padding: "24px",
};

const backLinkStyle: any = {
  color: "#3b82f6",
  fontWeight: "bold",
  textDecoration: "none",
};

const titleStyle: any = {
  fontSize: "46px",
  marginTop: "28px",
  marginBottom: "24px",
};

const formBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "18px",
  padding: "20px",
  marginBottom: "24px",
};

const listBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "18px",
  padding: "20px",
};

const topGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
  marginBottom: "14px",
};

const fieldBoxStyle: any = {
  display: "grid",
  gap: "7px",
  marginBottom: "14px",
};

const labelStyle: any = {
  color: "#f97316",
  fontWeight: "bold",
};

const inputStyle: any = {
  width: "100%",
  background: "#000",
  color: "#fff",
  border: "1px solid #444",
  borderRadius: "10px",
  padding: "12px",
  fontSize: "16px",
  boxSizing: "border-box",
};

const disabledInputStyle: any = {
  ...inputStyle,
  color: "#aaa",
};

const textareaStyle: any = {
  ...inputStyle,
  minHeight: "130px",
  resize: "vertical",
};

const sectionTitleStyle: any = {
  color: "#f97316",
  fontSize: "24px",
  marginTop: "10px",
};

const workerListStyle: any = {
  display: "grid",
  gap: "10px",
};

const workerRowStyle: any = {
  display: "grid",
  gridTemplateColumns: "1.5fr 1fr 1fr 1fr auto",
  gap: "8px",
  alignItems: "center",
};

const addButtonStyle: any = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  padding: "13px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "12px",
};

const saveButtonStyle: any = {
  width: "100%",
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: "12px",
  padding: "16px",
  fontSize: "18px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "14px",
};

const totalBoxStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "12px",
  padding: "14px",
  marginTop: "14px",
  fontSize: "20px",
  fontWeight: "bold",
  color: "#f97316",
};

const berichtCardStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "14px",
  padding: "16px",
  marginBottom: "14px",
};

const berichtHeaderStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  color: "#f97316",
  fontSize: "18px",
  marginBottom: "10px",
  flexWrap: "wrap",
};

const smallGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "10px",
  marginBottom: "12px",
};

const workTextStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "10px",
  padding: "12px",
  marginBottom: "12px",
  whiteSpace: "pre-wrap",
};

const tableStyle: any = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "10px",
};

const thStyle: any = {
  color: "#f97316",
  borderBottom: "1px solid #333",
  textAlign: "left",
  padding: "8px",
};

const tdStyle: any = {
  borderBottom: "1px solid #222",
  padding: "8px",
};

const deleteButtonStyle: any = {
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  padding: "10px 14px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "12px",
};

const deleteSmallButtonStyle: any = {
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: "10px",
  padding: "12px",
  fontWeight: "bold",
  cursor: "pointer",
};

const mutedStyle: any = {
  color: "#aaa",
};