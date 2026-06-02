"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];

export default function KalendarPage() {
  const [datum, setDatum] = useState(new Date().toISOString().split("T")[0]);

  const [currentUser, setCurrentUser] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [baustelleId, setBaustelleId] = useState("");
  const [napomena, setNapomena] = useState("");

  const [workers, setWorkers] = useState<any[]>([]);
  const [baustellen, setBaustellen] = useState<any[]>([]);
  const [planovi, setPlanovi] = useState<any[]>([]);

  useEffect(() => {
    const name = localStorage.getItem("worker_name") || "";
    const adminStatus = ADMINI.includes(name);

    setCurrentUser(name);
    setIsAdmin(adminStatus);

    if (!adminStatus) {
      setSelectedWorkers([name]);
    }

    loadData(name, adminStatus);
  }, []);

  async function loadData(name: string, adminStatus: boolean) {
    const workersRes = await supabase.from("workers").select("*").order("name");

    const activeWorkers = (workersRes.data || []).filter(
      (w: any) => w.role !== "admin"
    );

    setWorkers(activeWorkers);

    const baustellenRes = await supabase
      .from("baustellen")
      .select("*")
      .eq("status", "Aktiv")
      .order("naziv");

    setBaustellen(baustellenRes.data || []);

    await cleanupOldPlans();
    await loadPlans(name, adminStatus);
  }

  async function cleanupOldPlans() {
    const now = new Date();

    const { data } = await supabase.from("work_calendar").select("*");

    const oldPlans = (data || []).filter((p: any) => {
      if (!p.datum) return false;

      const expiry = new Date(`${p.datum}T15:00:00`);
      expiry.setDate(expiry.getDate() + 1);

      return expiry < now;
    });

    if (oldPlans.length === 0) return;

    const oldIds = oldPlans.map((p: any) => p.id);

    await supabase.from("work_calendar").delete().in("id", oldIds);
  }

  async function loadPlans(name = currentUser, adminStatus = isAdmin) {
    let query = supabase
      .from("work_calendar")
      .select(
        `
        *,
        baustellen (
          naziv,
          lokacija
        )
      `
      )
      .order("datum", { ascending: true });

    if (!adminStatus && name) {
      query = query.eq("worker_name", name);
    }

    const { data, error } = await query;

    if (error) {
      alert("Greška kod učitavanja kalendara: " + error.message);
      return;
    }

    setPlanovi(data || []);
  }

  function toggleWorker(name: string) {
    if (selectedWorkers.includes(name)) {
      setSelectedWorkers(selectedWorkers.filter((w) => w !== name));
    } else {
      setSelectedWorkers([...selectedWorkers, name]);
    }
  }

  function selectAllWorkers() {
    const allNames = workers.map((w: any) => w.name);
    setSelectedWorkers(allNames);
  }

  function clearWorkers() {
    setSelectedWorkers([]);
  }

  async function savePlan() {
    if (!isAdmin) {
      alert("Samo admin može dodavati plan.");
      return;
    }

    if (selectedWorkers.length === 0) {
      alert("Odaberi najmanje jednog radnika.");
      return;
    }

    if (!baustelleId) {
      alert("Odaberi Baustelle.");
      return;
    }

    const rows = selectedWorkers.map((worker) => ({
      datum,
      worker_name: worker,
      baustelle_id: Number(baustelleId),
      napomena: napomena.trim(),
    }));

    const { error } = await supabase.from("work_calendar").insert(rows);

    if (error) {
      alert(error.message);
      return;
    }

    setSelectedWorkers([]);
    setBaustelleId("");
    setNapomena("");

    await cleanupOldPlans();
    await loadPlans(currentUser, isAdmin);
  }

  async function deletePlan(id: number) {
    if (!isAdmin) {
      alert("Samo admin može brisati plan.");
      return;
    }

    const potvrda = confirm("Plan wirklich löschen?");

    if (!potvrda) return;

    const { error } = await supabase.from("work_calendar").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadPlans(currentUser, isAdmin);
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <main style={mainStyle}>
      <Link href="/dashboard" style={backLinkStyle}>
        ← Dashboard
      </Link>

      <h1 style={titleStyle}>Kalender</h1>

      <p style={{ color: "#aaa", marginBottom: "30px" }}>
        Angemeldet: {currentUser}
      </p>

      {isAdmin && (
        <div style={boxStyle}>
          <h2>Neuer Arbeitsplan</h2>

          <label style={labelStyle}>Datum</label>
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>Mitarbeiter</label>

          <div style={smallButtonRowStyle}>
            <button onClick={selectAllWorkers} style={smallButtonStyle}>
              Alle auswählen
            </button>

            <button onClick={clearWorkers} style={smallRedButtonStyle}>
              Auswahl löschen
            </button>
          </div>

          <div style={workersGridStyle}>
            {workers.map((w) => (
              <label key={w.id} style={workerCheckStyle}>
                <input
                  type="checkbox"
                  checked={selectedWorkers.includes(w.name)}
                  onChange={() => toggleWorker(w.name)}
                  style={{ transform: "scale(1.2)" }}
                />
                <span>{w.name}</span>
              </label>
            ))}
          </div>

          <p style={{ color: "#aaa", marginTop: "10px" }}>
            Ausgewählt: {selectedWorkers.length}
          </p>

          <label style={labelStyle}>Baustelle</label>
          <select
            value={baustelleId}
            onChange={(e) => setBaustelleId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Baustelle wählen</option>

            {baustellen.map((b) => (
              <option key={b.id} value={b.id}>
                {b.naziv} {b.lokacija ? `- ${b.lokacija}` : ""}
              </option>
            ))}
          </select>

          <label style={labelStyle}>Notiz</label>
          <textarea
            placeholder="Notiz..."
            value={napomena}
            onChange={(e) => setNapomena(e.target.value)}
            style={textareaStyle}
          />

          <button onClick={savePlan} style={saveButtonStyle}>
            Speichern
          </button>
        </div>
      )}

      <div style={boxStyle}>
        <h2>{isAdmin ? "Alle Arbeitspläne" : "Mein Arbeitsplan"}</h2>

        {planovi.length === 0 && (
          <p style={{ color: "#aaa" }}>Keine Pläne vorhanden.</p>
        )}

        {planovi.map((p) => (
          <div key={p.id} style={planCardStyle}>
            <div>
              <strong style={{ color: "#f97316" }}>{formatDate(p.datum)}</strong>

              <p>
                <strong>Mitarbeiter:</strong> {p.worker_name}
              </p>

              <p>
                <strong>Baustelle:</strong> {p.baustellen?.naziv || "-"}
              </p>

              {p.baustellen?.lokacija && (
                <p>
                  <strong>Ort:</strong> {p.baustellen.lokacija}
                </p>
              )}

              {p.napomena && (
                <p>
                  <strong>Notiz:</strong> {p.napomena}
                </p>
              )}
            </div>

            {isAdmin && (
              <button onClick={() => deletePlan(p.id)} style={deleteButtonStyle}>
                Löschen
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

const mainStyle: any = {
  background: "#000",
  minHeight: "100vh",
  color: "white",
  padding: "40px",
};

const backLinkStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
};

const titleStyle: any = {
  fontSize: "56px",
  fontWeight: "bold",
  marginTop: "25px",
  marginBottom: "10px",
};

const boxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  marginBottom: "30px",
};

const labelStyle: any = {
  display: "block",
  marginBottom: "8px",
  color: "#ccc",
  fontWeight: "bold",
};

const inputStyle: any = {
  width: "100%",
  padding: "15px",
  marginBottom: "15px",
  borderRadius: "10px",
  border: "none",
  background: "#222",
  color: "white",
};

const textareaStyle: any = {
  width: "100%",
  minHeight: "120px",
  padding: "15px",
  borderRadius: "10px",
  border: "none",
  background: "#222",
  color: "white",
  marginBottom: "15px",
};

const saveButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  border: "none",
  padding: "15px 25px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const planCardStyle: any = {
  background: "#222",
  padding: "20px",
  borderRadius: "15px",
  marginBottom: "15px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
};

const deleteButtonStyle: any = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "10px 20px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const workersGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
  marginBottom: "10px",
};

const workerCheckStyle: any = {
  background: "#222",
  padding: "14px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  cursor: "pointer",
  fontWeight: "bold",
};

const smallButtonRowStyle: any = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "15px",
};

const smallButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const smallRedButtonStyle: any = {
  ...smallButtonStyle,
  background: "#dc2626",
};