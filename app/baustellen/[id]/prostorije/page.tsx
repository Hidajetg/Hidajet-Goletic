"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function ProstorijePage() {
  const params = useParams();
  const baustelleId = String(params.id);

  const [naziv, setNaziv] = useState("");
  const [prostorije, setProstorije] = useState<any[]>([]);

  async function loadProstorije() {
    const { data, error } = await supabase
      .from("prostorije")
      .select("*")
      .eq("baustelle_id", baustelleId)
      .order("id", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setProstorije(data || []);
  }

  async function saveProstorija() {
    if (!naziv.trim()) {
      alert("Unesi naziv prostorije");
      return;
    }

    const { error } = await supabase.from("prostorije").insert([
      {
        baustelle_id: baustelleId,
        naziv: naziv.trim(),
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setNaziv("");
    loadProstorije();
  }

  useEffect(() => {
    loadProstorije();
  }, []);

  return (
    <main
      style={{
        background: "#000",
        minHeight: "100vh",
        color: "white",
        padding: "30px",
      }}
    >
      <div style={{ display: "flex", gap: "20px", marginBottom: "25px" }}>
        <Link href="/dashboard" style={backLinkStyle}>
          ← Dashboard
        </Link>

        <Link href="/baustellen" style={backLinkStyle}>
          ← Nazad na Baustelle
        </Link>
      </div>

      <h1
        style={{
          fontSize: "60px",
          fontWeight: "bold",
          marginBottom: "30px",
        }}
      >
        Prostorije
      </h1>

      <div style={boxStyle}>
        <h2>Baustelle ID: {baustelleId}</h2>
      </div>

      <div style={boxStyle}>
        <h2>+ Dodaj prostoriju</h2>

        <input
          placeholder="Naziv prostorije"
          value={naziv}
          onChange={(e) => setNaziv(e.target.value)}
          style={inputStyle}
        />

        <button onClick={saveProstorija} style={buttonStyle}>
          Sačuvaj prostoriju
        </button>
      </div>

      <div style={boxStyle}>
        <h2>Lista prostorija</h2>

        {prostorije.length === 0 && (
          <p style={{ color: "#999" }}>Nema unesenih prostorija.</p>
        )}

        {prostorije.map((p) => (
          <Link
            key={p.id}
            href={`/baustellen/${baustelleId}/prostorije/${p.id}`}
            style={{ textDecoration: "none", color: "white" }}
          >
            <div style={roomCardStyle}>
              <strong>{p.naziv}</strong>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

const backLinkStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
};

const boxStyle: any = {
  background: "#111",
  padding: "20px",
  borderRadius: "20px",
  marginBottom: "30px",
};

const inputStyle: any = {
  width: "100%",
  padding: "16px",
  marginTop: "15px",
  marginBottom: "15px",
  borderRadius: "10px",
  border: "none",
  background: "#222",
  color: "white",
};

const buttonStyle: any = {
  background: "#2563eb",
  color: "white",
  padding: "15px 25px",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const roomCardStyle: any = {
  background: "#222",
  padding: "20px",
  borderRadius: "12px",
  marginTop: "15px",
  cursor: "pointer",
};