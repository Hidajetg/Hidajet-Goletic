"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];

const translations: any = {
  de: {
    welcome: "Willkommen",
    baustelle: "Baustelle",
    hours: "Stunden",
    calendar: "Kalender",
    info: "Info",
    cars: "Autos",
    notes: "Notizen",
    materialOrder: "Material bestellen",
    privateNote: "Private Notiz",
    projects: "Projekte",
    workerProjects: "Meine Projekte",
    logout: "Abmelden",
    noMessages: "Aktuell gibt es keine Info-Nachrichten.",
    message: "Nachricht",
  },
  ba: {
    welcome: "Dobrodošao",
    baustelle: "Baustelle",
    hours: "Sati",
    calendar: "Kalendar",
    info: "Info",
    cars: "Auta",
    notes: "Bilješke",
    materialOrder: "Naruči materijal",
    privateNote: "Privatna bilješka",
    projects: "Projekti",
    workerProjects: "Moji projekti",
    logout: "Odjava",
    noMessages: "Trenutno nema info poruka.",
    message: "poruka",
  },
  uz: {
    welcome: "Xush kelibsiz",
    baustelle: "Ish joyi",
    hours: "Soatlar",
    calendar: "Kalendar",
    info: "Info",
    cars: "Mashinalar",
    notes: "Eslatmalar",
    materialOrder: "Material buyurtma",
    privateNote: "Shaxsiy eslatma",
    projects: "Loyihalar",
    workerProjects: "Mening loyihalarim",
    logout: "Chiqish",
    noMessages: "Hozircha xabar yo‘q.",
    message: "xabar",
  },
  en: {
    welcome: "Welcome",
    baustelle: "Construction site",
    hours: "Hours",
    calendar: "Calendar",
    info: "Info",
    cars: "Cars",
    notes: "Notes",
    materialOrder: "Order material",
    privateNote: "Private note",
    projects: "Projects",
    workerProjects: "My projects",
    logout: "Logout",
    noMessages: "There are currently no info messages.",
    message: "message",
  },
};

export default function DashboardPage() {
  const router = useRouter();

  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [todayPlans, setTodayPlans] = useState<any[]>([]);
  const [materialOrders, setMaterialOrders] = useState<any[]>([]);
  const [carWarnings, setCarWarnings] = useState<any[]>([]);
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
    loadMaterialOrders();

    if (adminStatus) {
      loadCarWarnings();
    }
  }, [router]);

  function getTodayLocalDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getOneMonthFromToday() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

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
    const today = getTodayLocalDate();

    let query = supabase
      .from("work_calendar")
      .select("*")
      .eq("datum", today)
      .order("worker_name", { ascending: true });

    if (!adminStatus) {
      query = query.ilike("worker_name", `%${name}%`);
    }

    const { data, error } = await query;

    if (error) {
      setTodayPlans([]);
      return;
    }

    setTodayPlans(data || []);
  }

  async function loadMaterialOrders() {
    const { data, error } = await supabase
      .from("material_orders")
      .select("*")
      .eq("status", "NEW")
      .order("created_at", { ascending: false });

    if (error) {
      setMaterialOrders([]);
      return;
    }

    setMaterialOrders(data || []);
  }

  async function loadCarWarnings() {
    const today = getTodayLocalDate();
    const oneMonth = getOneMonthFromToday();

    const { data, error } = await supabase
      .from("cars")
      .select("*")
      .not("registration_until", "is", null)
      .gte("registration_until", today)
      .lte("registration_until", oneMonth)
      .order("registration_until", { ascending: true });

    if (error) {
      setCarWarnings([]);
      return;
    }

    setCarWarnings(data || []);
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
          🏗️ {t.baustelle}
        </Link>

        <Link href="/projekte/radnik" style={workerProjectButtonStyle}>
          👷 {t.workerProjects}
        </Link>

        {isAdmin && (
          <Link href="/projekte" style={adminProjectButtonStyle}>
            📂 {t.projects}
          </Link>
        )}

        <Link href="/pregled-sati" style={buttonStyle}>
          ⏰ {t.hours}
        </Link>

        <Link
          href="/kalendar"
          style={todayPlans.length > 0 ? alertButtonStyle : buttonStyle}
        >
          📅 {t.calendar}
        </Link>

        <Link
          href="/auta"
          style={carWarnings.length > 0 ? alertButtonStyle : buttonStyle}
        >
          🚗 {t.cars}
          {isAdmin && carWarnings.length > 0 && (
            <>
              <br />
              <small>{carWarnings.length} REG. WARNUNG</small>
            </>
          )}
        </Link>

        <Link
          href="/info"
          style={messages.length > 0 ? alertButtonStyle : buttonStyle}
        >
          📢 {t.info}
          <br />
          <small>
            {messages.length} {t.message}
          </small>
        </Link>

        <Link href="/private-notes" style={buttonStyle}>
          📝 {t.privateNote}
        </Link>

        <Link
          href="/material-orders"
          style={materialOrders.length > 0 ? alertButtonStyle : buttonStyle}
        >
          🧱 {t.materialOrder}
          <br />
          <small>{materialOrders.length} NEW</small>
        </Link>

        <button onClick={logout} style={logoutButtonStyle}>
          🚪 {t.logout}
        </button>
      </div>

      <section style={infoBoxStyle}>
        <h2 style={infoTitleStyle}>📢 {t.info}</h2>

        {messages.length === 0 ? (
          <p style={{ color: "#aaa", fontSize: "16px" }}>{t.noMessages}</p>
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
  padding: "20px",
};

const titleStyle: any = {
  fontSize: "38px",
  marginBottom: "6px",
  color: "#f97316",
};

const subtitleStyle: any = {
  marginBottom: "14px",
  color: "#ccc",
};

const languageBoxStyle: any = {
  display: "flex",
  gap: "8px",
  marginBottom: "20px",
  flexWrap: "wrap",
};

const langButtonStyle: any = {
  background: "#111",
  color: "white",
  border: "1px solid #333",
  borderRadius: "9px",
  padding: "6px 12px",
  fontSize: "13px",
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
  gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
  gap: "10px",
};

const buttonStyle: any = {
  background: "#2563eb",
  color: "white",
  textDecoration: "none",
  padding: "14px",
  borderRadius: "13px",
  textAlign: "center",
  fontSize: "15px",
  fontWeight: "bold",
  border: "none",
  cursor: "pointer",
};

const workerProjectButtonStyle: any = {
  ...buttonStyle,
  background: "#16a34a",
};

const adminProjectButtonStyle: any = {
  ...buttonStyle,
  background: "#f97316",
};

const alertButtonStyle: any = {
  ...buttonStyle,
  background: "#dc2626",
};

const logoutButtonStyle: any = {
  ...buttonStyle,
  background: "#dc2626",
};

const infoBoxStyle: any = {
  marginTop: "24px",
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
};

const infoTitleStyle: any = {
  color: "#f97316",
  fontSize: "23px",
  marginBottom: "14px",
};

const messageStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "13px",
  padding: "14px",
  marginBottom: "12px",
};

const messageTopStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  color: "#f97316",
  marginBottom: "8px",
};

const messageTextStyle: any = {
  fontSize: "16px",
  whiteSpace: "pre-wrap",
  margin: 0,
};