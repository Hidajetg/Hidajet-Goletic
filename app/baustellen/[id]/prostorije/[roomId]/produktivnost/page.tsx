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
  { naziv: "Slobodno dodavanje", jedinica: "" },
];

export default function ProduktivnostPage() {
  const params = useParams();

  const baustelleId = String(params.id);
  const roomId = String(params.roomId);

  const [radnik, setRadnik] = useState("");
  const [aktivnaPozicija, setAktivnaPozicija] = useState<any | null>(null);

  const [kolicina, setKolicina] = useState("");
  const [format, setFormat] = useState("");

  const [slobodniNaziv, setSlobodniNaziv] = useState("");
  const [slobodnaJedinica, setSlobodnaJedinica] = useState("m²");

  const [unosi, setUnosi] = useState<any[]>([]);
  const [ukupnoSati, setUkupnoSati] = useState(0);

  useEffect(() => {
    const prijavljeniRadnik =
      localStorage.getItem("worker_name") ||
      localStorage.getItem("worker_ime") ||
      localStorage.getItem("worker") ||
      localStorage.getItem("radnik") ||
      localStorage.getItem("ime") ||
      localStorage.getItem("username") ||
      localStorage.getItem("logged_worker") ||
      localStorage.getItem("loggedWorker") ||
      localStorage.getItem("current_worker") ||
      "";

    setRadnik(prijavljeniRadnik);

    loadProduktivnost();
    loadUkupnoSati();
  }, []);

  async function loadProduktivnost() {
    const { data, error } = await supabase
      .from("produktivnost")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .eq("room_id", Number(roomId))
      .order("id", { ascending: false });

    if (error) {
      alert("LOAD PRODUKTIVNOST: " + error.message);
      return;
    }

    setUnosi(data || []);
  }

  async function loadUkupnoSati() {
    const { data, error } = await supabase
      .from("baustelle_hours")
      .select("sati, ukupno_sati, room_id, baustelle_id")
      .eq("baustelle_id", Number(baustelleId))
      .eq("room_id", Number(roomId));

    if (error) {
      alert("LOAD UKUPNO SATI: " + error.message);
      setUkupnoSati(0);
      return;
    }

    const suma = (data || []).reduce((total, row) => {
      return total + Number(row.sati ?? row.ukupno_sati ?? 0);
    }, 0);

    setUkupnoSati(Number(suma.toFixed(2)));
  }

  async function dodajProduktivnost() {
    if (!aktivnaPozicija) {
      alert("Odaberi poziciju.");
      return;
    }

    if (!radnik) {
      alert("Nije pronađen prijavljeni radnik. Prijavi se ponovo.");
      return;
    }

    if (!kolicina || Number(kolicina) <= 0) {
      alert("Unesi količinu.");
      return;
    }

    let nazivZaSpremanje = aktivnaPozicija.naziv;
    let jedinicaZaSpremanje = aktivnaPozicija.jedinica;
    let napomena = "";

    if (aktivnaPozicija.naziv === "Slobodno dodavanje") {
      if (!slobodniNaziv.trim()) {
        alert("Unesi naziv posla.");
        return;
      }

      nazivZaSpremanje = slobodniNaziv.trim();
      jedinicaZaSpremanje = slobodnaJedinica;
    }

    if (
      (aktivnaPozicija.naziv === "Pod / Boden" ||
        aktivnaPozicija.naziv === "Zid / Wand") &&
      format.trim()
    ) {
      napomena = `Format: ${format.trim()}`;
    }

    const { error } = await supabase.from("produktivnost").insert([
      {
        baustelle_id: Number(baustelleId),
        room_id: Number(roomId),
        datum: new Date().toISOString().split("T")[0],
        radnik,
        pozicija: nazivZaSpremanje,
        kolicina: Number(kolicina),
        jedinica: jedinicaZaSpremanje,
        napomena,
      },
    ]);

    if (error) {
      alert("INSERT PRODUKTIVNOST: " + error.message);
      return;
    }

    setKolicina("");
    setFormat("");
    setSlobodniNaziv("");
    setSlobodnaJedinica("m²");
    setAktivnaPozicija(null);

    await loadProduktivnost();
    await loadUkupnoSati();
  }

  async function promijeniKolicinu(id: number, trenutna: number, promjena: number) {
    const novaKolicina = Number(trenutna) + promjena;

    if (novaKolicina <= 0) {
      await obrisiProduktivnost(id);
      return;
    }

    const { error } = await supabase
      .from("produktivnost")
      .update({ kolicina: novaKolicina })
      .eq("id", id);

    if (error) {
      alert("UPDATE PRODUKTIVNOST: " + error.message);
      return;
    }

    await loadProduktivnost();
  }

  async function obrisiProduktivnost(id: number) {
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
        <p style={styles.infoSmall}>Zbir svih sati dodanih u ovu prostoriju</p>
      </section>

      <section style={styles.box}>
        <h2 style={styles.subtitle}>Radnik</h2>

        <input
          value={radnik || "Nije pronađen prijavljeni radnik"}
          readOnly
          style={styles.input}
        />
      </section>

      {!aktivnaPozicija && (
        <section style={styles.box}>
          <h2 style={styles.subtitle}>Odaberi poziciju</h2>

          <div style={styles.grid}>
            {pozicije.map((p) => (
              <button
                key={p.naziv}
                onClick={() => setAktivnaPozicija(p)}
                style={
                  p.naziv === "Slobodno dodavanje"
                    ? styles.freeButton
                    : styles.positionButton
                }
              >
                <strong>{p.naziv}</strong>
                <span style={styles.unitText}>
                  {p.jedinica || "ručni unos"}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {aktivnaPozicija && (
        <section style={styles.box}>
          <button
            onClick={() => {
              setAktivnaPozicija(null);
              setKolicina("");
              setFormat("");
              setSlobodniNaziv("");
              setSlobodnaJedinica("m²");
            }}
            style={styles.backButton}
          >
            ← Nazad na pozicije
          </button>

          <h2 style={styles.groupTitle}>{aktivnaPozicija.naziv}</h2>

          {aktivnaPozicija.naziv === "Slobodno dodavanje" && (
            <>
              <input
                value={slobodniNaziv}
                onChange={(e) => setSlobodniNaziv(e.target.value)}
                placeholder="Naziv posla"
                style={styles.input}
              />

              <select
                value={slobodnaJedinica}
                onChange={(e) => setSlobodnaJedinica(e.target.value)}
                style={styles.input}
              >
                <option value="m²">m²</option>
                <option value="lfm">lfm</option>
                <option value="kom">kom</option>
                <option value="m">m</option>
                <option value="h">h</option>
              </select>
            </>
          )}

          {(aktivnaPozicija.naziv === "Pod / Boden" ||
            aktivnaPozicija.naziv === "Zid / Wand") && (
            <input
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              placeholder="Format keramike, npr. 60x120"
              style={styles.input}
            />
          )}

          <input
            value={kolicina}
            onChange={(e) => setKolicina(e.target.value)}
            placeholder={`Količina (${
              aktivnaPozicija.naziv === "Slobodno dodavanje"
                ? slobodnaJedinica
                : aktivnaPozicija.jedinica
            })`}
            type="number"
            style={styles.input}
          />

          <button onClick={dodajProduktivnost} style={styles.saveButton}>
            Dodaj
          </button>
        </section>
      )}

      <section style={styles.box}>
        <h2 style={styles.subtitle}>Lista učinka ({unosi.length})</h2>

        {unosi.length === 0 && (
          <p style={styles.emptyText}>Još nema unosa.</p>
        )}

        {unosi.map((u) => (
          <div key={u.id} style={styles.savedCard}>
            <strong>{u.pozicija}</strong>

            <div style={styles.savedQuantity}>
              {u.kolicina} {u.jedinica}
            </div>

            {u.napomena && <div style={styles.note}>{u.napomena}</div>}

            <div style={styles.note}>Radnik: {u.radnik}</div>
            <div style={styles.note}>Datum: {u.datum}</div>

            <div style={styles.buttonRow}>
              <button
                onClick={() => promijeniKolicinu(u.id, u.kolicina, 1)}
                style={styles.plusButton}
              >
                +
              </button>

              <button
                onClick={() => promijeniKolicinu(u.id, u.kolicina, -1)}
                style={styles.minusButton}
              >
                -
              </button>

              <button
                onClick={() => obrisiProduktivnost(u.id)}
                style={styles.deleteButton}
              >
                Obriši
              </button>
            </div>
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
    gap: "15px",
  },
  positionButton: {
    background: "#222",
    color: "white",
    border: "1px solid #333",
    borderRadius: "16px",
    padding: "22px",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "18px",
    display: "grid",
    gap: "8px",
  },
  freeButton: {
    background: "#0f766e",
    color: "white",
    border: "1px solid #14b8a6",
    borderRadius: "16px",
    padding: "22px",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "18px",
    display: "grid",
    gap: "8px",
  },
  unitText: {
    color: "#aaa",
    fontSize: "15px",
  },
  backButton: {
    background: "#222",
    color: "#60a5fa",
    border: "1px solid #333",
    padding: "12px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
    marginBottom: "20px",
  },
  groupTitle: {
    color: "#60a5fa",
    marginBottom: "20px",
    fontSize: "32px",
  },
  saveButton: {
    background: "#16a34a",
    color: "white",
    padding: "16px 25px",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px",
  },
  emptyText: {
    color: "#999",
  },
  savedCard: {
    background: "#222",
    padding: "18px",
    borderRadius: "14px",
    marginTop: "15px",
  },
  savedQuantity: {
    marginTop: "10px",
    color: "#ddd",
  },
  note: {
    marginTop: "8px",
    color: "#aaa",
  },
  buttonRow: {
    display: "flex",
    gap: "10px",
    marginTop: "15px",
  },
  plusButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  minusButton: {
    background: "#f59e0b",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  deleteButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};