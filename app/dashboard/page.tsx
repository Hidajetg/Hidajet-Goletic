"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const translations: any = {
  de: {
    welcome: "Willkommen",
    hours: "Stundenübersicht",
    calendar: "Kalender",
    soon: "bald",
    info: "Info vom Admin",
    notes: "Hinweise für Arbeiten und Material",
    logout: "Abmelden",
    noMessages: "Aktuell gibt es keine Info-Nachrichten.",
    message: "Nachricht",
  },
  ba: {
    welcome: "Dobrodošao",
    hours: "Pregled sati",
    calendar: "Kalendar",
    soon: "uskoro",
    info: "Info od Admina",
    notes: "Napomene za radove i materijale",
    logout: "Odjava",
    noMessages: "Trenutno nema info poruka.",
    message: "poruka",
  },
  uz: {
    welcome: "Xush kelibsiz",
    hours: "Ish soatlari",
    calendar: "Kalendar",
    soon: "tez orada",
    info: "Admin xabari",
    notes: "Ishlar va materiallar uchun eslatmalar",
    logout: "Chiqish",
    noMessages: "Hozircha xabar yo‘q.",
    message: "xabar",
  },
  en: {
    welcome: "Welcome",
    hours: "Hours overview",
    calendar: "Calendar",
    soon: "soon",
    info: "Admin info",
    notes: "Notes for work and materials",
    logout: "Logout",
    noMessages: "There are currently no info messages.",
    message: "message",
  },
};

export default function DashboardPage() {
  const router = useRouter();

  const [workerName, setWorkerName] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [lang, setLang] = useState("ba");

  const t = translations[lang] || translations.ba;

  useEffect(() => {
    const id = localStorage.getItem("worker_id");
    const name = localStorage.getItem("worker_name");
    const savedLang = localStorage.getItem("lang") || "ba";

    if (!id || !name) {
      router.push("/login");
      return;
    }

    setWorkerName(name);
    setLang(savedLang);
    loadMessages(id);
  }, [router]);

  async function loadMessages(currentWorkerId: string) {
    const { data, error } = await supabase
      .from("info_messages")
      .select("*")
      .or(`visible_to_all.eq.true,target_worker_id.eq.${currentWorkerId}`)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Greška kod učitavanja info poruka: " + error.message);
      return;
    }

    setMessages(data || []);
  }

  function changeLanguage(newLang: string) {
    localStorage.setItem("lang", newLang);
    setLang(newLang);
  }

  function logout() {
    localStorage.clear();
    router.push("/login");
  }

  function formatDateTime(value: string) {
    return new Date(value).toLocaleString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main style={mainStyle}>
      <h1 style={titleStyle}>STONE BOUTIQUE</h1>

      <h2 style={subtitleStyle}>
        {t.welcome} {workerName}
      </h2>

      <div style={languageBoxStyle}>
        {["de", "ba", "uz", "en"].map((code) => (
          <button
            key={code}
            onClick={() => changeLanguage(code)}
            style={lang === code ? activeLangButtonStyle : langButtonStyle}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={gridStyle}>
        <Link href="/baustellen" style={buttonStyle}>
          🏗️ Baustelle
        </Link>

        <Link href="/pregled-sati" style={buttonStyle}>
          ⏰ {t.hours}
        </Link>

        <Link href="/kalendar" style={buttonStyle}>
          📅 {t.calendar}
        </Link>

        <Link href="/info" style={infoButtonStyle}>
          📢 {t.info}
          <br />
          <small>
            {messages.length} {t.message}
          </small>
        </Link>

        <div style={disabledStyle}>
          📋 {t.notes}
          <br />
          <small>{t.soon}</small>
        </div>

        <button onClick={logout} style={logoutButtonStyle}>
          🚪 {t.logout}
        </button>
      </div>

      <section style={infoBoxStyle}>
        <h2 style={infoTitleStyle}>📢 {t.info}</h2>

        {messages.length === 0 ? (
          <p style={{ color: "#aaa", fontSize: "20px" }}>{t.noMessages}</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={messageStyle}>
              <div style={messageTopStyle}>
                <strong>{msg.sender_name || "Admin"}</strong>
                <span>{formatDateTime(msg.created_at)}</span>
              </div>

              <p style={messageTextStyle}>{msg.message}</p>
            </div>
          ))
        )}
      </section>
    </main>
  );
}

const mainStyle: any = {
  background: "#000",
  minHeight: "100vh",
  color: "white",
  padding: "30px",
};

const titleStyle: any = {
  fontSize: "48px",
  marginBottom: "10px",
  color: "#f97316",
};

const subtitleStyle: any = {
  marginBottom: "20px",
  color: "#ccc",
};

const languageBoxStyle: any = {
  display: "flex",
  gap: "10px",
  marginBottom: "35px",
  flexWrap: "wrap",
};

const langButtonStyle: any = {
  background: "#111",
  color: "white",
  border: "1px solid #333",
  borderRadius: "10px",
  padding: "8px 16px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const activeLangButtonStyle: any = {
  ...langButtonStyle,
  background: "#f97316",
  border: "1px solid #f97316",
};

const gridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
  gap: "20px",
};

const buttonStyle: any = {
  background: "#2563eb",
  color: "white",
  textDecoration: "none",
  padding: "35px",
  borderRadius: "18px",
  textAlign: "center",
  fontSize: "24px",
  fontWeight: "bold",
  border: "none",
  cursor: "pointer",
};

const infoButtonStyle: any = {
  ...buttonStyle,
  background: "#f97316",
};

const logoutButtonStyle: any = {
  ...buttonStyle,
  background: "#dc2626",
};

const disabledStyle: any = {
  background: "#111",
  color: "white",
  padding: "35px",
  borderRadius: "18px",
  textAlign: "center",
  fontSize: "24px",
  fontWeight: "bold",
  border: "1px solid #333",
};

const infoBoxStyle: any = {
  marginTop: "35px",
  background: "#111",
  border: "1px solid #333",
  borderRadius: "18px",
  padding: "25px",
};

const infoTitleStyle: any = {
  color: "#f97316",
  fontSize: "30px",
  marginBottom: "20px",
};

const messageStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "14px",
  padding: "18px",
  marginBottom: "15px",
};

const messageTopStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: "15px",
  color: "#f97316",
  marginBottom: "10px",
};

const messageTextStyle: any = {
  fontSize: "20px",
  whiteSpace: "pre-wrap",
  margin: 0,
};