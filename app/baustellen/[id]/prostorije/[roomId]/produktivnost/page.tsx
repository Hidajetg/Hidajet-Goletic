"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";

const pozicije = [
  { naziv: "Verlegung Wand", jedinica: "m²" },
  { naziv: "Verlegung Boden", jedinica: "m²" },
  { naziv: "Sockelleiste", jedinica: "lfm" },
  { naziv: "Stufensockel", jedinica: "lfm" },
  { naziv: "Schiene", jedinica: "lfm" },
  { naziv: "Silikon", jedinica: "lfm" },
  { naziv: "Acryl", jedinica: "lfm" },
  { naziv: "Grundierung", jedinica: "m²" },
  { naziv: "Abdichtung", jedinica: "m²" },
  { naziv: "Dichtband", jedinica: "lfm" },
  { naziv: "Ecken", jedinica: "Stk" },
  { naziv: "Manschetten", jedinica: "Stk" },
  { naziv: "Stufen", jedinica: "lfm" },
];

export default function ProduktivnostPage() {
  const params = useParams();

  const baustelleId = params.id as string;
  const roomId = params.roomId as string;

  const [workers, setWorkers] = useState<any[]>([]);
  const [radnik, setRadnik] = useState("");

  const [datum, setDatum] = useState(new Date().toISOString().split("T")[0]);
  const [pozicija, setPozicija] = useState("Verlegung Wand");
  const [kolicina, setKolicina] = useState("");
  const [napomena, setNapomena] = useState("");
  const [unosi, setUnosi] = useState<any[]>([]);

  const selected = pozicije.find((p) => p.naziv === pozicija);
  const jedinica = selected?.jedinica || "";

  async function loadWorkers() {
    const { data, error } = await supabase
      .from("workers")
      .select("*")
      .eq("aktivan", true)
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

  async function saveProduktivnost() {
    if (!radnik) {
      alert("Odaberi radnika");
      return;
    }

    if (!kolicina || Number(kolicina) <= 0) {
      alert("Unesi količinu");
      return;
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
        napomena: napomena.trim(),
      },
    ]);

    if (error) {
      alert("INSERT PRODUKTIVNOST: " + error.message);
      return;
    }

    setKolicina("");
    setNapomena("");
    await loadProduktivnost();
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
  }, []);

  return (
    <main style={styles.page}>
      <Link
        href={`/baustellen/${baustelleId}/prostorije/${roomId}`}
        style={styles.backLink}
      >
        ← Nazad na prostoriju
      </Link>

      <h1 style={styles.title}>Produktivität</h1>

      <section style={styles.box}>
        <h2 style={styles.subtitle}>+ Neuer Eintrag</h2>

        <select
          value={radnik}
          onChange={(e) => setRadnik(e.target.value)}
          style={styles.input}
        >
          {workers.length === 0 && <option value="">Keine Mitarbeiter</option>}

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

        <input
          type="number"
          placeholder={`Menge (${jedinica})`}
          value={kolicina}
          onChange={(e) => setKolicina(e.target.value)}
          style={styles.input}
        />

        <textarea
          placeholder="Notiz"
          value={napomena}
          onChange={(e) => setNapomena(e.target.value)}
          style={styles.textarea}
        />

        <button onClick={saveProduktivnost} style={styles.saveButton}>
          Speichern
        </button>
      </section>

      <section style={styles.box}>
        <h2>Einträge ({unosi.length})</h2>

        {unosi.length === 0 && (
          <p style={styles.emptyText}>Noch keine Einträge vorhanden.</p>
        )}

        {unosi.map((u) => (
          <div key={u.id} style={styles.card}>
            <strong>{u.pozicija}</strong>
            <div>
              {u.kolicina} {u.jedinica}
            </div>
            <div>Mitarbeiter: {u.radnik}</div>
            <div>Datum: {u.datum}</div>

            {u.napomena && <div>Notiz: {u.napomena}</div>}

            <button
              onClick={() => deleteProduktivnost(u.id)}
              style={styles.deleteButton}
            >
              Löschen
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