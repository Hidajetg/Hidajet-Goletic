"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];

const translations: any = {
  de: {
    welcome: "Willkommen",
    hours: "Stunden",
    calendar: "Kalender",
    info: "Info",
    notes: "Notizen",
    materialOrder: "Material bestellen",
    privateNote: "Private Notiz",
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
    hours: "Sati",
    calendar: "Kalendar",
    info: "Info",
    notes: "Bilješke",
    materialOrder: "Naruči materijal",
    privateNote: "Privatna bilješka",
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
    hours: "Soatlar",
    calendar: "Kalendar",
    info: "Info",
    notes: "Eslatmalar",
    materialOrder: "Material buyurtma",
    privateNote: "Shaxsiy eslatma",
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
    hours: "Hours",
    calendar: "Calendar",
    info: "Info",
    notes: "Notes",
    materialOrder: "Order material",
    privateNote: "Private note",
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
  const [materialOrders, setMaterialOrders] = useState<any[]>([]);
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

        <Link
          href="/kalendar"
          style={todayPlans.length > 0 ? alertButtonStyle : buttonStyle}
        >
          📅 {t.calendar}
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

      <section style={planBoxStyle}>
        <h2 style={planTitleStyle}>📅 {t.todayPlan}</h2>

        {todayPlans.length === 0 ? (
          <p style={{ color: "#aaa", fontSize: "16px" }}>{t.noPlanToday}</p>
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

const planBoxStyle: any = {
  marginTop: "24px",
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
};

const planTitleStyle: any = {
  color: "#f97316",
  fontSize: "23px",
  marginBottom: "14px",
};

const planCardStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "13px",
  padding: "14px",
  marginBottom: "12px",
};

const planTopStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  color: "#f97316",
  marginBottom: "8px",
};

const planTextStyle: any = {
  fontSize: "16px",
  margin: "5px 0",
};

const planNoteStyle: any = {
  fontSize: "16px",
  whiteSpace: "pre-wrap",
  marginTop: "8px",
  color: "#ddd",
};