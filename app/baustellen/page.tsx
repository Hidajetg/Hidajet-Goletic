"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export default function BaustellenPage() {
  const [naziv, setNaziv] = useState("");
  const [lokacija, setLokacija] = useState("");
  const [opis, setOpis] = useState("");
  const [baustellen, setBaustellen] = useState<any[]>([]);

  async function loadBaustellen() {
    const { data, error } = await supabase
      .from("baustellen")
      .select("*")
      .eq("status", "Aktiv")
      .order("id", { ascending: false });

    if (error) {
      alert("LOAD: " + error.message);
      return;
    }

    setBaustellen(data || []);
  }

  async function saveBaustelle() {
    if (!naziv.trim()) {
      alert("Unesi naziv Baustelle");
      return;
    }

    const { error } = await supabase.from("baustellen").insert([
      {
        naziv: naziv.trim(),
        lokacija: lokacija.trim(),
        opis: opis.trim(),
        status: "Aktiv",
      },
    ]);

    if (error) {
      alert("INSERT: " + error.message);
      return;
    }

    setNaziv("");
    setLokacija("");
    setOpis("");
    await loadBaustellen();
  }

  useEffect(() => {
    loadBaustellen();
  }, []);

  return (
    <main
      style={{
        background: "#000",
        minHeight: "100vh",
        color: "white",
        padding: "40px",
      }}
    >
      <div style={topNavStyle}>
        <Link href="/dashboard" style={backLinkStyle}>
          ← Dashboard
        </Link>

        <Link href="/baustellen/archiv" style={archiveLinkStyle}>
          Archiv
        </Link>
      </div>

      <h1 style={titleStyle}>Baustellen</h1>

      <p style={{ color: "#aaa", marginBottom: "40px" }}>
        Übersicht aktiver Baustellen
      </p>

      <div style={boxStyle}>
        <h2 style={{ marginBottom: "20px" }}>+ Neue Baustelle</h2>

        <div style={formGridStyle}>
          <input
            placeholder="Naziv Baustelle"
            value={naziv}
            onChange={(e) => setNaziv(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Lokacija"
            value={lokacija}
            onChange={(e) => setLokacija(e.target.value)}
            style={inputStyle}
          />
        </div>

        <textarea
          placeholder="Opis Baustelle"
          value={opis}
          onChange={(e) => setOpis(e.target.value)}
          style={textareaStyle}
        />

        <button onClick={saveBaustelle} style={saveButtonStyle}>
          Baustelle speichern
        </button>
      </div>

      <div style={{ display: "grid", gap: "20px" }}>
        {baustellen.length === 0 && (
          <div style={emptyStyle}>Nema aktivnih Baustellen.</div>
        )}

        {baustellen.map((b) => (
          <Link
            href={`/baustellen/${b.id}`}
            key={b.id}
            style={{ textDecoration: "none", color: "white" }}
          >
            <div style={cardStyle}>
              <h2 style={{ marginTop: 0 }}>{b.naziv}</h2>

              {b.lokacija && <p>{b.lokacija}</p>}

              {b.opis && (
                <p style={{ color: "#aaa", lineHeight: "1.5" }}>{b.opis}</p>
              )}

              <p style={{ color: "#22c55e", fontWeight: "bold" }}>
                Status: Aktiv
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

const topNavStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "25px",
};

const backLinkStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "18px",
};

const archiveLinkStyle: any = {
  color: "white",
  background: "#f97316",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "18px",
  padding: "12px 20px",
  borderRadius: "12px",
};

const titleStyle: any = {
  fontSize: "64px",
  fontWeight: "bold",
  marginBottom: "10px",
};

const boxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  marginBottom: "40px",
};

const formGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "15px",
  marginBottom: "20px",
};

const inputStyle: any = {
  padding: "16px",
  borderRadius: "10px",
  border: "none",
  background: "#222",
  color: "white",
};

const textareaStyle: any = {
  width: "100%",
  minHeight: "110px",
  padding: "16px",
  borderRadius: "10px",
  border: "none",
  background: "#222",
  color: "white",
  marginBottom: "20px",
  resize: "vertical",
  fontSize: "16px",
};

const saveButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  padding: "14px 24px",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const cardStyle: any = {
  background: "#111",
  padding: "20px",
  borderRadius: "16px",
  cursor: "pointer",
};

const emptyStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "16px",
  color: "#aaa",
};