"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

const POZICIJE = [
  { naziv: "Verlegung Boden", jedinica: "m²" },
  { naziv: "Verlegung Wand", jedinica: "m²" },
  { naziv: "Priprema podloge", jedinica: "h" },
  { naziv: "Hidroizolacija", jedinica: "m²" },
  { naziv: "Estrich", jedinica: "h" },
  { naziv: "Schienen", jedinica: "m" },
  { naziv: "Fuge", jedinica: "h" },
  { naziv: "Silikon", jedinica: "m" },
  { naziv: "Terase", jedinica: "m²" },
  { naziv: "Dodaci", jedinica: "kom" },
];

export default function ProduktivnostPage() {
  const params = useParams();
  const baustelleId = String(params.id);

  const [datum, setDatum] = useState(new Date().toISOString().split("T")[0]);
  const [radnik, setRadnik] = useState("");
  const [pozicija, setPozicija] = useState("");
  const [jedinica, setJedinica] = useState("");
  const [kolicina, setKolicina] = useState("");
  const [napomena, setNapomena] = useState("");

  const [unosi, setUnosi] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data, error } = await supabase
      .from("produktivnost")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("datum", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setUnosi(data || []);
  }

  function odaberiPoziciju(value: string) {
    setPozicija(value);

    const p = POZICIJE.find((x) => x.naziv === value);
    setJedinica(p ? p.jedinica : "");
  }

  async function dodajPosao() {
    if (!datum || !radnik || !pozicija || !kolicina || !jedinica) {
      alert("Popuni datum, radnika, poziciju i količinu.");
      return;
    }

    const { error } = await supabase.from("produktivnost").insert([
      {
        baustelle_id: Number(baustelleId),
        datum,
        radnik,
        pozicija,
        kolicina: Number(kolicina),
        jedinica,
        napomena,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setPozicija("");
    setJedinica("");
    setKolicina("");
    setNapomena("");

    await loadData();
  }

  async function obrisiPosao(id: number) {
    const potvrda = confirm("Obrisati ovaj posao?");
    if (!potvrda) return;

    const { error } = await supabase
      .from("produktivnost")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

  return (
    <main style={styles.page}>
      <Link href={`/baustellen/${baustelleId}`} style={styles.backLink}>
        ← Nazad na Baustelle
      </Link>

      <h1 style={styles.title}>Poslovi / Produktivnost</h1>

      <section style={styles.box}>
        <h2>Dodaj posao</h2>

        <input
          type="date"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          style={styles.input}
        />

        <input
          value={radnik}
          onChange={(e) => setRadnik(e.target.value)}
          placeholder="Ime radnika"
          style={styles.input}
        />

        <select
          value={pozicija}
          onChange={(e) => odaberiPoziciju(e.target.value)}
          style={styles.input}
        >
          <option value="">Odaberi posao</option>
          {POZICIJE.map((p) => (
            <option key={p.naziv} value={p.naziv}>
              {p.naziv}
            </option>
          ))}
        </select>

        <input
          value={kolicina}
          onChange={(e) => setKolicina(e.target.value)}
          placeholder="Količina"
          type="number"
          style={styles.input}
        />

        <input
          value={jedinica}
          readOnly
          placeholder="Jedinica"
          style={styles.input}
        />

        <input
          value={napomena}
          onChange={(e) => setNapomena(e.target.value)}
          placeholder="Napomena, npr. 60x120 keramika"
          style={styles.input}
        />

        <button onClick={dodajPosao} style={styles.saveButton}>
          Sačuvaj posao
        </button>
      </section>

      <section style={styles.box}>
        <h2>Lista poslova ({unosi.length})</h2>

        {unosi.length === 0 && <p style={styles.empty}>Još nema unosa.</p>}

        {unosi.map((u) => (
          <div key={u.id} style={styles.card}>
            <strong>{u.pozicija}</strong>
            <p>
              {u.kolicina} {u.jedinica}
            </p>
            <p>Radnik: {u.radnik}</p>
            <p>Datum: {u.datum}</p>
            {u.napomena && <p>Napomena: {u.napomena}</p>}

            <button onClick={() => obrisiPosao(u.id)} style={styles.deleteButton}>
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
    fontSize: "52px",
    marginTop: "25px",
    marginBottom: "30px",
  },
  box: {
    background: "#111",
    padding: "20px",
    borderRadius: "18px",
    marginBottom: "30px",
  },
  input: {
    width: "100%",
    padding: "14px",
    marginBottom: "12px",
    borderRadius: "10px",
    border: "1px solid #333",
    background: "#000",
    color: "white",
    fontSize: "16px",
  },
  saveButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "14px 22px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  card: {
    background: "#222",
    padding: "16px",
    borderRadius: "14px",
    marginTop: "12px",
  },
  deleteButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  empty: {
    color: "#999",
  },
};