"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type UserRole = "admin" | "worker";

type StoredUser = {
  id: string;
  name: string;
  role: UserRole;
};

const translations: Record<string, Record<string, string>> = {
  de: {
    welcome: "Willkommen",
    baustelle: "Baustelle",
    hours: "Stunden",
    calendar: "Kalender",
    info: "Info",
    cars: "Autos",
    materialOrder: "Material bestellen",
    adminMaterial: "Material",
    privateNote: "Private Notiz",
    projects: "Projekte",
    workerProjects: "Meine Projekte",
    employees: "Mitarbeiter",
    logout: "Abmelden",
    noMessages: "Aktuell gibt es keine Info-Nachrichten.",
    message: "Nachricht",
    checking: "Anmeldung wird geprüft...",
  },

  ba: {
    welcome: "Dobrodošao",
    baustelle: "Baustelle",
    hours: "Sati",
    calendar: "Kalendar",
    info: "Info",
    cars: "Auta",
    materialOrder: "Naruči materijal",
    adminMaterial: "Materijal",
    privateNote: "Privatna bilješka",
    projects: "Projekti",
    workerProjects: "Moji projekti",
    employees: "Radnici",
    logout: "Odjava",
    noMessages: "Trenutno nema info poruka.",
    message: "poruka",
    checking: "Provjera prijave...",
  },

  uz: {
    welcome: "Xush kelibsiz",
    baustelle: "Ish joyi",
    hours: "Soatlar",
    calendar: "Kalendar",
    info: "Info",
    cars: "Mashinalar",
    materialOrder: "Material buyurtma",
    adminMaterial: "Material",
    privateNote: "Shaxsiy eslatma",
    projects: "Loyihalar",
    workerProjects: "Mening loyihalarim",
    employees: "Xodimlar",
    logout: "Chiqish",
    noMessages: "Hozircha xabar yo‘q.",
    message: "xabar",
    checking: "Kirish tekshirilmoqda...",
  },

  en: {
    welcome: "Welcome",
    baustelle: "Construction site",
    hours: "Hours",
    calendar: "Calendar",
    info: "Info",
    cars: "Cars",
    materialOrder: "Order material",
    adminMaterial: "Material",
    privateNote: "Private note",
    projects: "Projects",
    workerProjects: "My projects",
    employees: "Employees",
    logout: "Logout",
    noMessages: "There are currently no info messages.",
    message: "message",
    checking: "Checking login...",
  },
};

function normalizeRole(value: unknown): UserRole | null {
  return String(value || "").toLowerCase() === "admin"
    ? "admin"
    : String(value || "").toLowerCase() === "worker"
      ? "worker"
      : null;
}

function getJsonUser(key: string): Partial<StoredUser> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const id =
      parsed.id ??
      parsed.worker_id ??
      parsed.workerId ??
      parsed.user_id ??
      parsed.userId ??
      "";

    const name =
      parsed.name ??
      parsed.worker_name ??
      parsed.workerName ??
      parsed.user_name ??
      parsed.userName ??
      "";

    const role =
      parsed.role ??
      parsed.worker_role ??
      parsed.workerRole ??
      parsed.user_role ??
      parsed.userRole ??
      "";

    return {
      id: String(id || ""),
      name: String(name || ""),
      role: normalizeRole(role) || undefined,
    };
  } catch {
    return null;
  }
}

function readStoredUser(): StoredUser | null {
  const directName =
    localStorage.getItem("worker_name") ||
    localStorage.getItem("userName") ||
    localStorage.getItem("user_name") ||
    localStorage.getItem("name") ||
    "";

  const directRole =
    localStorage.getItem("worker_role") ||
    localStorage.getItem("userRole") ||
    localStorage.getItem("role") ||
    "";

  const directId =
    localStorage.getItem("worker_id") ||
    localStorage.getItem("user_id") ||
    "";

  const role = normalizeRole(directRole);

  if (directName && role) {
    return {
      id: String(directId || directName),
      name: directName,
      role,
    };
  }

  const jsonKeys = [
    "currentWorker",
    "worker",
    "loggedWorker",
    "selectedWorker",
    "currentUser",
    "loggedUser",
    "user",
    "loginUser",
    "baustelle_user",
    "stone_user",
    "app_user",
  ];

  for (const key of jsonKeys) {
    const candidate = getJsonUser(key);

    if (candidate?.name && candidate?.role) {
      return {
        id: String(candidate.id || candidate.name),
        name: String(candidate.name),
        role: candidate.role,
      };
    }
  }

  return null;
}

export default function DashboardPage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [messages, setMessages] = useState<any[]>([]);
  const [todayPlans, setTodayPlans] = useState<any[]>([]);
  const [materialOrders, setMaterialOrders] = useState<any[]>([]);
  const [carWarnings, setCarWarnings] = useState<any[]>([]);

  const [lang, setLang] = useState("ba");

  const t = translations[lang] || translations.ba;

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") || "ba";
    setLang(savedLang);

    initializeDashboard();
  }, []);

  async function initializeDashboard() {
    setAuthLoading(true);

    const user = readStoredUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const adminStatus = user.role === "admin";

    setWorkerName(user.name);
    setIsAdmin(adminStatus);

    // Ostavlja stare module kompatibilnim s novim loginom.
    localStorage.setItem("worker_id", user.id);
    localStorage.setItem("worker_name", user.name);
    localStorage.setItem("worker_role", user.role);
    localStorage.setItem("user_id", user.id);
    localStorage.setItem("userName", user.name);
    localStorage.setItem("userRole", user.role);
    localStorage.setItem("role", user.role);
    localStorage.setItem("loggedIn", "true");
    localStorage.setItem("isLoggedIn", "true");

    await Promise.all([
      loadMessages(user.id),
      loadTodayPlans(user.name, adminStatus),
      loadMaterialOrders(),
      adminStatus ? loadCarWarnings() : Promise.resolve(),
    ]);

    if (!adminStatus) {
      setCarWarnings([]);
    }

    setAuthLoading(false);
  }

  function clearStoredUser() {
    const localKeys = [
      "worker_id",
      "worker_name",
      "worker_role",
      "user_id",
      "userName",
      "user_name",
      "name",
      "role",
      "userRole",
      "loggedIn",
      "isLoggedIn",
      "authenticated",
      "currentWorker",
      "worker",
      "loggedWorker",
      "selectedWorker",
      "currentUser",
      "loggedUser",
      "user",
      "loginUser",
      "baustelle_user",
      "stone_user",
      "app_user",
    ];

    const sessionKeys = [
      "worker_id",
      "worker_name",
      "worker_role",
      "user_id",
      "userName",
      "userRole",
      "loggedIn",
      "isLoggedIn",
    ];

    localKeys.forEach((key) => localStorage.removeItem(key));
    sessionKeys.forEach((key) => sessionStorage.removeItem(key));
  }

  function getTodayLocalDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getOneMonthFromToday() {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  async function loadMessages(currentWorkerId: string) {
    let query = supabase
      .from("info_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (currentWorkerId) {
      query = query.or(
        `visible_to_all.eq.true,target_worker_id.eq.${currentWorkerId}`
      );
    } else {
      query = query.eq("visible_to_all", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Greška kod učitavanja info poruka:", error);
      setMessages([]);
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
      console.error("Greška kod učitavanja kalendara:", error);
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
      console.error("Greška kod učitavanja narudžbi materijala:", error);
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
      console.error("Greška kod učitavanja upozorenja za vozila:", error);
      setCarWarnings([]);
      return;
    }

    setCarWarnings(data || []);
  }

  function changeLanguage(newLang: string) {
    localStorage.setItem("lang", newLang);
    setLang(newLang);
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout API Fehler:", error);
    }

    clearStoredUser();

    setWorkerName("");
    setIsAdmin(false);

    router.replace("/login");
    router.refresh();
  }

  function formatDateTime(value: string) {
    if (!value) return "";

    return new Date(value).toLocaleString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (authLoading) {
    return (
      <main style={loadingPageStyle}>
        <div style={loadingBoxStyle}>
          <div style={loadingCircleStyle}>🔐</div>

          <p style={loadingTextStyle}>{t.checking}</p>
        </div>
      </main>
    );
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
            type="button"
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

        {isAdmin && (
          <Link href="/mitarbeiter" style={employeeButtonStyle}>
            👥 {t.employees}
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

        {isAdmin && (
          <Link href="/material" style={materialAdminButtonStyle}>
            🧱 {t.adminMaterial}
          </Link>
        )}

        <Link
          href="/material-orders"
          style={materialOrders.length > 0 ? alertButtonStyle : buttonStyle}
        >
          🧱 {t.materialOrder}
          <br />
          <small>{materialOrders.length} NEW</small>
        </Link>

        <button type="button" onClick={logout} style={logoutButtonStyle}>
          🚪 {t.logout}
        </button>
      </div>

      <section style={infoBoxStyle}>
        <h2 style={infoTitleStyle}>📢 {t.info}</h2>

        {messages.length === 0 ? (
          <p style={emptyMessageStyle}>{t.noMessages}</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} style={messageStyle}>
              <div style={messageTopStyle}>
                <strong>{message.sender_name || "Admin"}</strong>

                <span>{formatDateTime(message.created_at)}</span>
              </div>

              <p style={messageTextStyle}>{message.message}</p>
            </div>
          ))
        )}
      </section>
    </main>
  );
}

// ============================================================
// STYLES
// ===========================================================
const loadingPageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#000000",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};

const loadingBoxStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "16px",
  background: "#111111",
  border: "1px solid #333333",
  borderRadius: "18px",
  padding: "30px",
};

const loadingCircleStyle: CSSProperties = {
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  background: "#f97316",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "30px",
};

const loadingTextStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: "bold",
  margin: 0,
};

const mainStyle: CSSProperties = {
  background: "#000000",
  minHeight: "100vh",
  color: "#ffffff",
  padding: "20px",
};

const titleStyle: CSSProperties = {
  fontSize: "38px",
  marginBottom: "6px",
  color: "#f97316",
};

const subtitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: "14px",
  color: "#cccccc",
};

const languageBoxStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  marginBottom: "20px",
  flexWrap: "wrap",
};

const langButtonStyle: CSSProperties = {
  background: "#111111",
  color: "#ffffff",
  border: "1px solid #333333",
  borderRadius: "9px",
  padding: "6px 12px",
  fontSize: "13px",
  fontWeight: "bold",
  cursor: "pointer",
};

const activeLangButtonStyle: CSSProperties = {
  ...langButtonStyle,
  background: "#f97316",
  border: "1px solid #f97316",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "10px",
};

const buttonStyle: CSSProperties = {
  background: "#2563eb",
  color: "#ffffff",
  textDecoration: "none",
  padding: "14px",
  borderRadius: "13px",
  textAlign: "center",
  fontSize: "15px",
  fontWeight: "bold",
  border: "none",
  cursor: "pointer",
};

const workerProjectButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "#16a34a",
};

const adminProjectButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "#f97316",
};

const employeeButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "#0891b2",
};

const materialAdminButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "#7c3aed",
};

const alertButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "#dc2626",
};

const logoutButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "#dc2626",
};

const infoBoxStyle: CSSProperties = {
  marginTop: "24px",
  background: "#111111",
  border: "1px solid #333333",
  borderRadius: "16px",
  padding: "18px",
};

const infoTitleStyle: CSSProperties = {
  color: "#f97316",
  fontSize: "23px",
  marginTop: 0,
  marginBottom: "14px",
};

const emptyMessageStyle: CSSProperties = {
  color: "#aaaaaa",
  fontSize: "16px",
};

const messageStyle: CSSProperties = {
  background: "#000000",
  border: "1px solid #333333",
  borderRadius: "13px",
  padding: "14px",
  marginBottom: "12px",
};

const messageTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  color: "#f97316",
  marginBottom: "8px",
  flexWrap: "wrap",
};

const messageTextStyle: CSSProperties = {
  fontSize: "16px",
  whiteSpace: "pre-wrap",
  margin: 0,
};