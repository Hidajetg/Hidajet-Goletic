"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";

const pozicije = [
  { naziv: "Pod / Boden", jedinica: "m²" },
  { naziv: "Zid / Wand", jedinica: "m²" },
  { naziv: "Randlajsne / Sockel", jedinica: "lfm" },
  { naziv: "Sockel stepenice", jedinica: "lfm" },
  { naziv: "Schiene / Lajsna", jedinica: "lfm" },
  { naziv: "Silikon do 5 mm", jedinica: "lfm" },
  { naziv: "Acryl do 5 mm", jedinica: "lfm" },
  { naziv: "Stepenice", jedinica: "lfm" },
];

export default function ProduktivnostPage() {
  const params = useParams();

  const baustelleId = params.id as string;
  const roomId = params.roomId as string;

  const [workers, setWorkers] = useState<any[]>([]);
  const [radnik, setRadnik] = useState("");

  const [datum, setDatum] = useState(new Date().toISOString().split("T")[0]);
  const [pozicija, setPozicija] = useState("Pod / Boden");
  const [kolicina, setKolicina] = useState("");
  const [format, setFormat] = useState("");
  const [napomena, setNapomena] = useState("");
  const [unosi, setUnosi] = useState<any[]>([]);
  const [ukupnoSati, setUkupnoSati] = useState(0);

  const selected = pozicije.find((p) => p.naziv === pozicija);
  const jedinica = selected?.jedinica || "";

  async function loadWorkers() {
    const { data, error } = await supabase
      .from("workers")
      .select("*")
      .order("ime", { ascending: true });

    if (error) {
      alert("LOAD WORKERS: " + error.message);
      return;
    }

    setWorkers(data || []);

    if (data && data.length > 0) {
      setRadnik(data[0].ime);
    }
  }

  async function loadProduktivnost() {
    const { data, error } = await supabase
      .from("produktivnost")
      .select("*")
      .eq("room_id", Number(roomId))
      .order("datum", { ascending: false });

    if (error) {
      alert("LOAD PRODUKTIVNOST: " + error.message);
      return;
    }

    setUnosi(data || []);
  }

  async function loadUkupnoSati() {
    const { data, error } = await supabase
      .from("baustelle_hours")
      .select("sati")
      .eq("baustelle_id", Number(baustelleId))
      .eq("room_id", Number(roomId));

    if (error) {
      setUkupnoSati(0);
      return;
    }

    const suma = (data || []).reduce((total, row) => {
      return total + Number(row.sati || 0);
    }, 0);

    setUkupnoSati(suma);
  }

  async function saveProduktivnost() {
    if (!radnik) {
      alert("Odaberi radnika");
      return;
    }

    if (!kolicina || Number(kolicina) <= 0) {
      alert("Unesi količinu");
      return;
    }

    let finalNapomena = napomena.trim();

    if (
      (pozicija === "Pod / Boden" || pozicija === "Zid / Wand") &&
      format.trim()
    ) {
      finalNapomena = finalNapomena
        ? `Format: ${format.trim()} | ${finalNapomena}`
        : `Format: ${format.trim()}`;
    }

    const { error } = await supabase.from("produktivnost").insert([
      {
        baustelle_id: Number(baustelleId),
        room_id: Number(roomId),
        datum,
        radnik,
        pozicija,
        kolicina: Number(kolicina),
        jedinica,
        napomena: finalNapomena,
      },
    ]);

    if (error) {
      alert("INSERT PRODUKTIVNOST: " + error.message);
      return;
    }

    setKolicina("");
    setFormat("");
    setNapomena("");

    await loadProduktivnost();
    await loadUkupnoSati();
  }

  async function deleteProduktivnost(id: number) {
    const potvrda = confirm("Da li želiš obrisati ovaj unos?");
    if (!potvrda) return;

    const { error } = await supabase
      .from("produktivnost")
      .delete()
      .eq("id", id);

    if (error) {
      alert("DELETE PRODUKTIVNOST: " + error.message);
      return;
    }

    await loadProduktivnost();
  }

  useEffect(() => {
    loadWorkers();
    loadProduktivnost();
    loadUkupnoSati();
  }, []);

  return (
    <main style={styles.page}>
      <Link
        href={`/baustellen/${baustelleId}/prostorije/${roomId}`}
        style={styles.backLink}
      >
        ← Nazad na prostoriju
      </Link>

      <h1 style={styles.title}>Produktivnost</h1>

      <section style={styles.infoBox}>
        <h2 style={styles.infoTitle}>Trajanje posla</h2>
        <p style={styles.infoNumber}>{ukupnoSati.toFixed(2)} h</p>
        <p style={styles.infoSmall}>Zbir svih sati za ovu prostoriju</p>
      </section>

      <section style={styles.box}>
        <h2 style={styles.subtitle}>+ Novi unos posla</h2>

        <select
          value={radnik}
          onChange={(e) => setRadnik(e.target.value)}
          style={styles.input}
        >
          {workers.length === 0 && <option value="">Nema radnika</option>}

          {workers.map((w) => (
            <option key={w.id} value={w.ime}>
              {w.ime}
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
          value={pozicija}
          onChange={(e) => setPozicija(e.target.value)}
          style={styles.input}
        >
          {pozicije.map((p) => (
            <option key={p.naziv} value={p.naziv}>
              {p.naziv} ({p.jedinica})
            </option>
          ))}
        </select>

        {(pozicija === "Pod / Boden" || pozicija === "Zid / Wand") && (
          <input
            type="text"
            placeholder="Format keramike, npr. 60x120"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            style={styles.input}
          />
        )}

        <input
          type="number"
          placeholder={`Količina (${jedinica})`}
          value={kolicina}
          onChange={(e) => setKolicina(e.target.value)}
          style={styles.input}
        />

        <textarea
          placeholder="Napomena"
          value={napomena}
          onChange={(e) => setNapomena(e.target.value)}
          style={styles.textarea}
        />

        <button onClick={saveProduktivnost} style={styles.saveButton}>
          Sačuvaj
        </button>
      </section>

      <section style={styles.box}>
        <h2>Unosi ({unosi.length})</h2>

        {unosi.length === 0 && (
          <p style={styles.emptyText}>Još nema unosa.</p>
        )}

        {unosi.map((u) => (
          <div key={u.id} style={styles.card}>
            <strong>{u.pozicija}</strong>
            <div>
              {u.kolicina} {u.jedinica}
            </div>
            <div>Radnik: {u.radnik}</div>
            <div>Datum: {u.datum}</div>

            {u.napomena && <div>Napomena: {u.napomena}</div>}

            <button
              onClick={() => deleteProduktivnost(u.id)}
              style={styles.deleteButton}
            >
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
  backLink: {
    color: "#3b82f6",
    textDecoration: "none",
    fontWeight: "bold",
  },
  title: {
    fontSize: "56px",
    fontWeight: "bold",
    marginTop: "25px",
    marginBottom: "30px",
  },
  infoBox: {
    background: "#111",
    padding: "20px",
    borderRadius: "20px",
    marginBottom: "30px",
    border: "1px solid #222",
  },
  infoTitle: {
    margin: 0,
    marginBottom: "10px",
    color: "#60a5fa",
  },
  infoNumber: {
    fontSize: "34px",
    fontWeight: "bold",
    margin: 0,
  },
  infoSmall: {
    color: "#aaa",
    marginTop: "8px",
  },
  box: {
    background: "#111",
    padding: "20px",
    borderRadius: "20px",
    marginBottom: "30px",
  },
  subtitle: {
    marginBottom: "20px",
  },
  input: {
    width: "100%",
    padding: "16px",
    marginBottom: "15px",
    borderRadius: "10px",
    border: "none",
    background: "#222",
    color: "white",
    fontSize: "16px",
  },
  textarea: {
    width: "100%",
    minHeight: "90px",
    padding: "16px",
    marginBottom: "15px",
    borderRadius: "10px",
    border: "none",
    background: "#222",
    color: "white",
    fontSize: "16px",
  },
  saveButton: {
    background: "#16a34a",
    color: "white",
    padding: "15px 25px",
    border: "none",
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