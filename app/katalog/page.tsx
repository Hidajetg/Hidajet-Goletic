"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function KatalogPage() {
  const [grupe, setGrupe] = useState<any[]>([]);
  const [materijali, setMaterijali] = useState<any[]>([]);

  const [groupId, setGroupId] = useState("");
  const [naziv, setNaziv] = useState("");
  const [jedinica, setJedinica] = useState("");
  const [pretraga, setPretraga] = useState("");
  const [aktivnaGrupa, setAktivnaGrupa] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const grupeRes = await supabase
      .from("material_groups")
      .select("*")
      .order("naziv");

    const materijaliRes = await supabase
      .from("materials")
      .select("*")
      .order("naziv");

    if (grupeRes.error) {
      alert(grupeRes.error.message);
      return;
    }

    if (materijaliRes.error) {
      alert(materijaliRes.error.message);
      return;
    }

    setGrupe(grupeRes.data || []);
    setMaterijali(materijaliRes.data || []);
  }

  async function dodajMaterijal() {
    if (!groupId || !naziv || !jedinica) {
      alert("Popuni grupu, naziv i jedinicu.");
      return;
    }

    const { error } = await supabase.from("materials").insert([
      {
        group_id: Number(groupId),
        naziv,
        jedinica,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setGroupId("");
    setNaziv("");
    setJedinica("");

    await loadData();
  }

  async function obrisiMaterijal(id: number, nazivMaterijala: string) {
    const potvrda = confirm(`Obrisati materijal "${nazivMaterijala}"?`);

    if (!potvrda) return;

    const { error } = await supabase
      .from("materials")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

  function imeGrupe(id: number) {
    const grupa = grupe.find((g) => g.id === id);
    return grupa ? grupa.naziv : "-";
  }

  const filtriraniMaterijali = materijali.filter((m) => {
    const matchNaziv = m.naziv
      ?.toLowerCase()
      .includes(pretraga.toLowerCase());

    const matchGrupa =
      aktivnaGrupa === null || m.group_id === aktivnaGrupa;

    return matchNaziv && matchGrupa;
  });

  return (
    <main style={styles.page}>
      <h1 style={styles.title}>Katalog materijala</h1>

      <section style={styles.box}>
        <h2 style={styles.subtitle}>Dodaj materijal</h2>

        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          style={styles.input}
        >
          <option value="">Odaberi grupu</option>

          {grupe.map((g) => (
            <option key={g.id} value={g.id}>
              {g.naziv}
            </option>
          ))}
        </select>

        <input
          value={naziv}
          onChange={(e) => setNaziv(e.target.value)}
          placeholder="Naziv materijala"
          style={styles.input}
        />

        <input
          value={jedinica}
          onChange={(e) => setJedinica(e.target.value)}
          placeholder="Jedinica: m², kg, kom, lfm..."
          style={styles.input}
        />

        <button onClick={dodajMaterijal} style={styles.mainButton}>
          Dodaj materijal
        </button>
      </section>

      <input
        value={pretraga}
        onChange={(e) => setPretraga(e.target.value)}
        placeholder="Pretraži materijal..."
        style={styles.input}
      />

      <div style={styles.groupRow}>
        <button
          onClick={() => setAktivnaGrupa(null)}
          style={
            aktivnaGrupa === null
              ? styles.activeGroupButton
              : styles.groupButton
          }
        >
          Sve
        </button>

        {grupe.map((g) => (
          <button
            key={g.id}
            onClick={() => setAktivnaGrupa(g.id)}
            style={
              aktivnaGrupa === g.id
                ? styles.activeGroupButton
                : styles.groupButton
            }
          >
            {g.naziv}
          </button>
        ))}
      </div>

      <div style={styles.grid}>
        {filtriraniMaterijali.map((m) => (
          <div key={m.id} style={styles.card}>
            <h3 style={styles.cardTitle}>{m.naziv}</h3>

            <p style={styles.cardText}>
              Jedinica: {m.jedinica}
            </p>

            <p style={styles.cardSmall}>
              Grupa: {imeGrupe(m.group_id)}
            </p>

            <button
              onClick={() => obrisiMaterijal(m.id, m.naziv)}
              style={styles.deleteButton}
            >
              Obriši
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f4f4f4",
    color: "#111",
    padding: "24px",
  },
  title: {
    fontSize: "32px",
    fontWeight: "bold",
    marginBottom: "24px",
  },
  subtitle: {
    fontSize: "22px",
    fontWeight: "bold",
    marginBottom: "16px",
  },
  box: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "24px",
    border: "1px solid #ddd",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "12px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    backgroundColor: "white",
    color: "black",
    fontSize: "16px",
  },
  mainButton: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "black",
    color: "white",
    fontWeight: "bold",
    fontSize: "16px",
    cursor: "pointer",
  },
  groupRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "12px",
    marginBottom: "24px",
  },
  groupButton: {
    padding: "10px 14px",
    borderRadius: "999px",
    border: "1px solid #ccc",
    backgroundColor: "white",
    color: "black",
    cursor: "pointer",
    fontWeight: "bold",
  },
  activeGroupButton: {
    padding: "10px 14px",
    borderRadius: "999px",
    border: "1px solid black",
    backgroundColor: "black",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
    gap: "16px",
  },
  card: {
    backgroundColor: "white",
    border: "1px solid #ddd",
    borderRadius: "12px",
    padding: "16px",
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "8px",
  },
  cardText: {
    margin: 0,
  },
  cardSmall: {
    marginTop: "8px",
    color: "#666",
  },
  deleteButton: {
    width: "100%",
    marginTop: "12px",
    padding: "10px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#dc2626",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },
};