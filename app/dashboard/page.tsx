"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];

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
    todayPlan: "Arbeitsplan für heute",
    noPlanToday: "Für heute ist kein Arbeitsplan vorhanden.",
    worker: "Mitarbeiter",
    site: "Baustelle",
    location: "Ort",
    note: "Notiz",
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
    todayPlan: "Plan rada za danas",
    noPlanToday: "Za danas nema plana rada.",
    worker: "Radnik",
    site: "Baustelle",
    location: "Lokacija",
    note: "Napomena",
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
    todayPlan: "Bugungi ish rejasi",
    noPlanToday: "Bugun uchun ish rejasi yo‘q.",
    worker: "Ishchi",
    site: "Obyekt",
    location: "Manzil",
    note: "Izoh",
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
    todayPlan: "Work plan for today",
    noPlanToday: "There is no work plan for today.",
    worker: "Worker",
    site: "Site",
    location: "Location",
    note: "Note",
  },
};

export default function DashboardPage() {
  const router = useRouter();

  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [todayPlans, setTodayPlans] = useState<any[]>([]);
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

    const adminStatus = ADMINI.includes(name);

    setWorkerName(name);
    setIsAdmin(adminStatus);
    setLang(savedLang);

    loadMessages(id);
    loadTodayPlans(name, adminStatus);
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

  async function loadTodayPlans(name: string, adminStatus: boolean) {
    const today = new Date().toISOString().split("T")[0];

    let query = supabase
      .from("work_calendar")
      .select(
        `
        *,
        baustellen (
          naziv,
          lokacija
        )
      `
      )
      .eq("datum", today)
      .order("worker_name", { ascending: true });

    if (!adminStatus) {
      query = query.eq("worker_name", name);
    }

    const { data, error } = await query;

    if (error) {
      alert("Greška kod učitavanja plana rada: " + error.message);
      return;
    }

    setTodayPlans(data || []);
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

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
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
          <p style={{ color: "#aaa", fontSize: "18px" }}>{t.noMessages}</p>
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

      <section style={planBoxStyle}>
        <h2 style={planTitleStyle}>📅 {t.todayPlan}</h2>

        {todayPlans.length === 0 ? (
          <p style={{ color: "#aaa", fontSize: "18px" }}>{t.noPlanToday}</p>
        ) : (
          todayPlans.map((plan) => (
            <div key={plan.id} style={planCardStyle}>
              <div style={planTopStyle}>
                <strong>{formatDate(plan.datum)}</strong>
                {isAdmin && <span>{plan.worker_name}</span>}
              </div>

              <p style={planTextStyle}>
                <strong>{t.worker}:</strong> {plan.worker_name}
              </p>

              <p style={planTextStyle}>
                <strong>{t.site}:</strong> {plan.baustellen?.naziv || "-"}
              </p>

              {plan.baustellen?.lokacija && (
                <p style={planTextStyle}>
                  <strong>{t.location}:</strong> {plan.baustellen.lokacija}
                </p>
              )}

              {plan.napomena && (
                <p style={planNoteStyle}>
                  <strong>{t.note}:</strong> {plan.napomena}
                </p>
              )}
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
  padding: "24px",
};

const titleStyle: any = {
  fontSize: "42px",
  marginBottom: "8px",
  color: "#f97316",
};

const subtitleStyle: any = {
  marginBottom: "16px",
  color: "#ccc",
};

const languageBoxStyle: any = {
  display: "flex",
  gap: "8px",
  marginBottom: "24px",
  flexWrap: "wrap",
};

const langButtonStyle: any = {
  background: "#111",
  color: "white",
  border: "1px solid #333",
  borderRadius: "10px",
  padding: "7px 14px",
  fontSize: "14px",
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
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "14px",
};

const buttonStyle: any = {
  background: "#2563eb",
  color: "white",
  textDecoration: "none",
  padding: "20px",
  borderRadius: "16px",
  textAlign: "center",
  fontSize: "18px",
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
  padding: "20px",
  borderRadius: "16px",
  textAlign: "center",
  fontSize: "18px",
  fontWeight: "bold",
  border: "1px solid #333",
};

const infoBoxStyle: any = {
  marginTop: "28px",
  background: "#111",
  border: "1px solid #333",
  borderRadius: "18px",
  padding: "22px",
};

const infoTitleStyle: any = {
  color: "#f97316",
  fontSize: "26px",
  marginBottom: "18px",
};

const messageStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "14px",
  padding: "16px",
  marginBottom: "14px",
};

const messageTopStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: "15px",
  color: "#f97316",
  marginBottom: "10px",
};

const messageTextStyle: any = {
  fontSize: "18px",
  whiteSpace: "pre-wrap",
  margin: 0,
};

const planBoxStyle: any = {
  marginTop: "28px",
  background: "#111",
  border: "1px solid #333",
  borderRadius: "18px",
  padding: "22px",
};

const planTitleStyle: any = {
  color: "#f97316",
  fontSize: "26px",
  marginBottom: "18px",
};

const planCardStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "14px",
  padding: "16px",
  marginBottom: "14px",
};

const planTopStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: "15px",
  color: "#f97316",
  marginBottom: "10px",
};

const planTextStyle: any = {
  fontSize: "18px",
  margin: "6px 0",
};

const planNoteStyle: any = {
  fontSize: "18px",
  whiteSpace: "pre-wrap",
  marginTop: "10px",
  color: "#ddd",
};