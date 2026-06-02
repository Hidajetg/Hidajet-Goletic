"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function SatiPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const baustelleId = String(params.id);
  const roomId = searchParams.get("roomId");

  const [workers, setWorkers] = useState<any[]>([]);
  const [radnik, setRadnik] = useState("");

  const [datum, setDatum] = useState(new Date().toISOString().split("T")[0]);
  const [tipUnosa, setTipUnosa] = useState("RAD");

  const [pocetak, setPocetak] = useState("06:30");
  const [kraj, setKraj] = useState("15:30");
  const [pauza, setPauza] = useState("0.5");
  const [opisPosla, setOpisPosla] = useState("");

  const [sati, setSati] = useState<any[]>([]);

  const vremenaPocetak: string[] = [];
  const vremenaKraj: string[] = [];

  for (let h = 6; h <= 19; h++) {
    vremenaPocetak.push(`${String(h).padStart(2, "0")}:00`);
    vremenaPocetak.push(`${String(h).padStart(2, "0")}:30`);
  }

  for (let h = 20; h >= 8; h--) {
    vremenaKraj.push(`${String(h).padStart(2, "0")}:00`);
    vremenaKraj.push(`${String(h).padStart(2, "0")}:30`);
  }

  function timeToNumber(time: string) {
    const [h, m] = time.split(":").map(Number);
    return h + m / 60;
  }

  function calcHours() {
    if (tipUnosa !== "RAD") return 8.5;

    const total = timeToNumber(kraj) - timeToNumber(pocetak) - Number(pauza);

    if (total < 0) return 0;

    return Number(total.toFixed(2));
  }

  const ukupnoSatiProstorije = sati.reduce((total, row) => {
    return total + Number(row.sati ?? row.ukupno_sati ?? 0);
  }, 0);

  async function loadWorkers() {
    const loggedName =
      localStorage.getItem("worker_name") ||
      localStorage.getItem("worker_ime") ||
      localStorage.getItem("worker") ||
      localStorage.getItem("radnik") ||
      localStorage.getItem("ime") ||
      localStorage.getItem("username") ||
      "";

    const loggedRole = localStorage.getItem("worker_role") || "worker";

    if (loggedRole === "worker") {
      setWorkers([{ id: loggedName || "worker", name: loggedName }]);
      setRadnik(loggedName);
      return;
    }

    const { data, error } = await supabase
      .from("workers")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setWorkers([{ id: loggedName || "worker", name: loggedName }]);
      setRadnik(loggedName);
      return;
    }

    const formattedWorkers = (data || []).map((w) => ({
      id: w.id,
      name: w.name || w.ime || w.radnik || "",
    }));

    setWorkers(formattedWorkers);

    if (formattedWorkers.length > 0 && !radnik) {
      setRadnik(formattedWorkers[0].name);
    }
  }

  async function loadHours() {
    let query = supabase
      .from("baustelle_hours")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("datum", { ascending: false });

    if (roomId) {
      query = query.eq("room_id", Number(roomId));
    }

    const { data, error } = await query;

    if (error) {
      alert("LOAD SATI: " + error.message);
      return;
    }

    setSati(data || []);
  }

  async function saveHours() {
    if (!radnik) {
      alert("Odaberi radnika");
      return;
    }

    const ukupno = calcHours();

    const { error } = await supabase.from("baustelle_hours").insert([
      {
        baustelle_id: Number(baustelleId),
        room_id: roomId ? Number(roomId) : null,
        radnik,
        datum,
        tip_unosa: tipUnosa,
        pocetak: tipUnosa === "RAD" ? pocetak : null,
        kraj: tipUnosa === "RAD" ? kraj : null,
        pauza: tipUnosa === "RAD" ? Number(pauza) : 0,
        ukupno_sati: ukupno,
        sati: ukupno,
        opis_posla: opisPosla.trim(),
      },
    ]);

    if (error) {
      alert("INSERT SATI: " + error.message);
      return;
    }

    setOpisPosla("");
    await loadHours();
  }

  async function deleteHours(id: number) {
    const potvrda = confirm("Da li želiš obrisati ovaj unos?");
    if (!potvrda) return;

    const { error } = await supabase
      .from("baustelle_hours")
      .delete()
      .eq("id", id);

    if (error) {
      alert("DELETE SATI: " + error.message);
      return;
    }

    await loadHours();
  }

  useEffect(() => {
    loadWorkers();
    loadHours();
  }, []);

  return (
    <main style={styles.page}>
      <button onClick={() => router.back()} style={styles.backButton}>
        ← Nazad
      </button>

      <h1 style={styles.title}>Radni sati</h1>

      <section style={styles.summaryBox}>
        <h2 style={styles.summaryTitle}>
          {roomId ? "Ukupno sati u ovoj prostoriji" : "Ukupno sati na Baustelle"}
        </h2>

        <div style={styles.summaryGrid}>
          <div>
            <div style={styles.summaryLabel}>Ukupno sati</div>
            <div style={styles.summaryNumber}>
              {ukupnoSatiProstorije.toFixed(2)} h
            </div>
          </div>

          <div>
            <div style={styles.summaryLabel}>Broj unosa</div>
            <div style={styles.summaryNumber}>{sati.length}</div>
          </div>
        </div>
      </section>

      <section style={styles.box}>
        <select
          value={radnik}
          onChange={(e) => setRadnik(e.target.value)}
          style={styles.input}
        >
          {workers.length === 0 && <option value="">Nema radnika</option>}

          {workers.map((w) => (
            <option key={w.id} value={w.name}>
              {w.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          style={styles.input}
        />

        <select
          value={tipUnosa}
          onChange={(e) => setTipUnosa(e.target.value)}
          style={styles.input}
        >
          <option value="RAD">Radni dan</option>
          <option value="GODISNJI">Godišnji odmor</option>
          <option value="BOLOVANJE">Bolovanje</option>
          <option value="PRAZNIK">Praznik</option>
        </select>

        {tipUnosa === "RAD" && (
          <>
            <select
              value={pocetak}
              onChange={(e) => setPocetak(e.target.value)}
              style={styles.input}
            >
              {vremenaPocetak.map((v) => (
                <option key={v} value={v}>
                  Početak: {v}
                </option>
              ))}
            </select>

            <select
              value={kraj}
              onChange={(e) => setKraj(e.target.value)}
              style={styles.input}
            >
              {vremenaKraj.map((v) => (
                <option key={v} value={v}>
                  Kraj: {v}
                </option>
              ))}
            </select>

            <select
              value={pauza}
              onChange={(e) => setPauza(e.target.value)}
              style={styles.input}
            >
              <option value="0">Bez pauze</option>
              <option value="0.5">Pauza: 0.5h</option>
              <option value="1">Pauza: 1h</option>
              <option value="1.5">Pauza: 1.5h</option>
              <option value="2">Pauza: 2h</option>
              <option value="2.5">Pauza: 2.5h</option>
            </select>
          </>
        )}

        <textarea
          value={opisPosla}
          onChange={(e) => setOpisPosla(e.target.value)}
          placeholder="Opis posla, npr. keramika WC, priprema podloge, silikoniranje..."
          style={styles.textarea}
        />

        <div style={styles.totalBox}>
          <div>Trenutni unos: {calcHours()}h</div>
        </div>

        <button onClick={saveHours} style={styles.saveButton}>
          Sačuvaj
        </button>
      </section>

      <section style={styles.box}>
        <h2>Uneseni sati</h2>

        {sati.length === 0 && (
          <p style={styles.emptyText}>Još nema unesenih sati.</p>
        )}

        {sati.map((s) => (
          <div key={s.id} style={styles.card}>
            <strong>{s.radnik}</strong>

            <div>Datum: {s.datum}</div>
            <div>Tip: {s.tip_unosa}</div>

            {s.tip_unosa === "RAD" && (
              <div>
                {s.pocetak} - {s.kraj} |{" "}
                {Number(s.pauza) === 0 ? "Bez pauze" : `Pauza: ${s.pauza}h`}
              </div>
            )}

            {s.opis_posla && <div>Opis posla: {s.opis_posla}</div>}

            <div>Ukupno: {s.ukupno_sati ?? s.sati}h</div>

            <button onClick={() => deleteHours(s.id)} style={styles.deleteButton}>
              Obriši
            </button>
          </div>
        ))}
      </section>
    </main>
  );
}

const styles: any = {
  page: {
    background: "#000",
    minHeight: "100vh",
    color: "white",
    padding: "30px",
  },
  backButton: {
    background: "none",
    border: "none",
    color: "#3b82f6",
    cursor: "pointer",
    marginBottom: "20px",
    fontWeight: "bold",
  },
  title: {
    fontSize: "60px",
    marginBottom: "30px",
  },
  summaryBox: {
    background: "#111",
    padding: "22px",
    borderRadius: "20px",
    marginBottom: "30px",
    border: "1px solid #222",
  },
  summaryTitle: {
    marginTop: 0,
    marginBottom: "20px",
    color: "#60a5fa",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "18px",
  },
  summaryLabel: {
    color: "#aaa",
    marginBottom: "8px",
  },
  summaryNumber: {
    fontSize: "32px",
    fontWeight: "bold",
  },
  box: {
    background: "#111",
    padding: "20px",
    borderRadius: "20px",
    marginBottom: "30px",
  },
  input: {
    width: "100%",
    padding: "15px",
    marginBottom: "15px",
    background: "#222",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
  },
  textarea: {
    width: "100%",
    minHeight: "120px",
    padding: "15px",
    marginBottom: "15px",
    background: "#222",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    resize: "vertical",
  },
  totalBox: {
    background: "#1f1f1f",
    padding: "18px",
    borderRadius: "12px",
    fontSize: "22px",
    fontWeight: "bold",
    marginBottom: "15px",
  },
  saveButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    padding: "15px 25px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  emptyText: {
    color: "#999",
  },
  card: {
    background: "#222",
    padding: "18px",
    borderRadius: "14px",
    marginTop: "15px",
    display: "grid",
    gap: "8px",
  },
  deleteButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    width: "120px",
  },
};