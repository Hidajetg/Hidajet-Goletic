"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

const translations: any = {
  de: {
    dashboard: "Dashboard",
    archive: "Archiv",
    title: "Baustellen",
    overview: "Übersicht aktiver Baustellen",
    newSite: "Neue Baustelle",
    siteName: "Name der Baustelle",
    location: "Ort",
    description: "Beschreibung der Baustelle",
    save: "Baustelle speichern",
    enterName: "Bitte Namen der Baustelle eingeben",
    empty: "Keine aktiven Baustellen.",
    status: "Status",
    active: "Aktiv",
  },
  ba: {
    dashboard: "Dashboard",
    archive: "Arhiva",
    title: "Baustelle",
    overview: "Pregled aktivnih Baustelle",
    newSite: "Nova Baustelle",
    siteName: "Naziv Baustelle",
    location: "Lokacija",
    description: "Opis Baustelle",
    save: "Sačuvaj Baustelle",
    enterName: "Unesi naziv Baustelle",
    empty: "Nema aktivnih Baustelle.",
    status: "Status",
    active: "Aktiv",
  },
  uz: {
    dashboard: "Dashboard",
    archive: "Arxiv",
    title: "Obyektlar",
    overview: "Faol obyektlar ro‘yxati",
    newSite: "Yangi obyekt",
    siteName: "Obyekt nomi",
    location: "Manzil",
    description: "Obyekt tavsifi",
    save: "Saqlash",
    enterName: "Obyekt nomini kiriting",
    empty: "Faol obyektlar yo‘q.",
    status: "Holat",
    active: "Faol",
  },
  en: {
    dashboard: "Dashboard",
    archive: "Archive",
    title: "Construction Sites",
    overview: "Overview of active construction sites",
    newSite: "New Site",
    siteName: "Site name",
    location: "Location",
    description: "Site description",
    save: "Save Site",
    enterName: "Enter site name",
    empty: "No active construction sites.",
    status: "Status",
    active: "Active",
  },
};

export default function BaustellenPage() {
  const [naziv, setNaziv] = useState("");
  const [lokacija, setLokacija] = useState("");
  const [opis, setOpis] = useState("");
  const [baustellen, setBaustellen] = useState<any[]>([]);
  const [lang, setLang] = useState("ba");

  const t = translations[lang] || translations.ba;

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") || "ba";
    setLang(savedLang);
    loadBaustellen();
  }, []);

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
      alert(t.enterName);
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
          ← {t.dashboard}
        </Link>

        <Link href="/baustellen/archiv" style={archiveLinkStyle}>
          {t.archive}
        </Link>
      </div>

      <h1 style={titleStyle}>{t.title}</h1>

      <p style={{ color: "#aaa", marginBottom: "40px" }}>{t.overview}</p>

      <div style={boxStyle}>
        <h2 style={{ marginBottom: "20px" }}>+ {t.newSite}</h2>

        <div style={formGridStyle}>
          <input
            placeholder={t.siteName}
            value={naziv}
            onChange={(e) => setNaziv(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder={t.location}
            value={lokacija}
            onChange={(e) => setLokacija(e.target.value)}
            style={inputStyle}
          />
        </div>

        <textarea
          placeholder={t.description}
          value={opis}
          onChange={(e) => setOpis(e.target.value)}
          style={textareaStyle}
        />

        <button onClick={saveBaustelle} style={saveButtonStyle}>
          {t.save}
        </button>
      </div>

      <div style={{ display: "grid", gap: "20px" }}>
        {baustellen.length === 0 && <div style={emptyStyle}>{t.empty}</div>}

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
                {t.status}: {t.active}
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