"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { type AppLanguage, readAppLanguage, saveAppLanguage, localeForLanguage } from "../lib/language";
import { SOLSTONE_APPROVED_LOGO } from "../components/solstone-approved-logo";
import AdminWebDashboard from "./AdminWebDashboard";

const DAY_MS = 86_400_000;

function viennaToday(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (kind: string) => parts.find(item => item.type === kind)?.value ?? "";
  return part("year") + "-" + part("month") + "-" + part("day");
}

function changeISODate(date: string, days: number): string {
  const milliseconds = Date.parse(date + "T00:00:00Z");
  return new Date(milliseconds + days * DAY_MS).toISOString().slice(0, 10);
}

function permittedWorkerDate(date: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const milliseconds = Date.parse(date + "T00:00:00Z");
  const todayMs = Date.parse(today + "T00:00:00Z");
  return Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString().slice(0, 10) === date &&
    Math.abs(milliseconds - todayMs) <= DAY_MS * 365;
}

function workerWeek(selected: string): string[] {
  const weekday = new Date(selected + "T00:00:00Z").getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  const monday = changeISODate(selected, -mondayOffset);
  return Array.from({ length: 7 }, (_, index) => changeISODate(monday, index));
}

type WorkerTodaySite = {
  id: string;
  siteId: string;
  name: string;
  location: string;
  note: string;
  coworkers: string[];
};

type UserRole = "admin" | "worker";

type StoredUser = {
  id: string;
  name: string;
  role: UserRole;
};

const translations: Record<string, Record<string, string>> = {
  de: {
    todayShort: "Heute",
    tomorrow: "Morgen",
    pickDate: "Tag auswählen",
    loadingDay: "Arbeitsplan wird geladen…",
    today: "Mein heutiger Einsatz",
    noWork: "Für diesen Tag ist kein Einsatz eingetragen.",
    at: "Einsatzort",
    coworkers: "Kollegen auf dieser Baustelle",
    note: "Hinweis",
    open: "Baustelle öffnen",
    error: "Heutiger Plan konnte nicht geladen werden.",
    chat: "Team Chat",
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
    todayShort: "Danas",
    tomorrow: "Sutra",
    pickDate: "Odaberi datum",
    loadingDay: "Učitavam raspored…",
    today: "Moj današnji raspored",
    noWork: "Nema upisanog rasporeda za odabrani dan.",
    at: "Gradilište",
    coworkers: "Kolege na ovoj Baustelle",
    note: "Napomena",
    open: "Otvori Baustelle",
    error: "Današnji raspored nije dostupan.",
    chat: "Team Chat",
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
    todayShort: "Bugun",
    tomorrow: "Ertaga",
    pickDate: "Sanani tanlang",
    loadingDay: "Jadval yuklanmoqda…",
    today: "Bugungi ish jadvalim",
    noWork: "Tanlangan kun uchun ish rejasi yo‘q.",
    at: "Ish joyi",
    coworkers: "Shu obyektdagi hamkasblar",
    note: "Izoh",
    open: "Obyektni ochish",
    error: "Bugungi jadval yuklanmadi.",
    chat: "Jamoa suhbati",
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
    todayShort: "Today",
    tomorrow: "Tomorrow",
    pickDate: "Choose date",
    loadingDay: "Loading schedule…",
    today: "My schedule today",
    noWork: "No work assignment on the selected date.",
    at: "Construction site",
    coworkers: "Coworkers on this site",
    note: "Note",
    open: "Open site",
    error: "Today's schedule isn't available.",
    chat: "Team Chat",
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

  cz: {
    todayShort: "Dnes",
    tomorrow: "Zítra",
    pickDate: "Vybrat datum",
    loadingDay: "Načítání rozvrhu…",
    today: "Můj dnešní rozvrh",
    noWork: "Pro vybraný den není zadán žádný rozvrh.",
    at: "Stavba",
    coworkers: "Kolegové na této stavbě",
    note: "Poznámka",
    open: "Otevřít stavbu",
    error: "Dnešní rozvrh není dostupný.",
    chat: "Týmový chat",
    baustelle: "Stavba",
    hours: "Hodiny",
    calendar: "Kalendář",
    info: "Info",
    cars: "Auta",
    materialOrder: "Objednat materiál",
    adminMaterial: "Materiál",
    privateNote: "Soukromá poznámka",
    projects: "Projekty",
    workerProjects: "Moje projekty",
    employees: "Pracovníci",
    logout: "Odhlásit se",
    noMessages: "Aktuálně nejsou žádné informační zprávy.",
    message: "zpráva",
    checking: "Kontrola přihlášení...",
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
  const [workerTodaySites, setWorkerTodaySites] = useState<WorkerTodaySite[]>([]);
  const [workerTodayError, setWorkerTodayError] = useState(false);
  const [workerTodayLoading, setWorkerTodayLoading] = useState(false);
  const [workerSelectedDate, setWorkerSelectedDate] = useState(viennaToday);
  const calendarRequest = useRef(0);
  const [materialOrders, setMaterialOrders] = useState<any[]>([]);
  const [carWarnings, setCarWarnings] = useState<any[]>([]);

  const [lang, setLang] = useState<AppLanguage>("ba");

  const t = translations[lang] || translations.ba;

  useEffect(() => {
    setLang(readAppLanguage("ba"));
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

  async function loadWorkerDay(date: string) {
    const requestId = ++calendarRequest.current;
    setWorkerTodayLoading(true);
    setWorkerTodayError(false);
    try {
      const response = await fetch("/api/worker/today?date=" + encodeURIComponent(date), {
        credentials: "include", cache: "no-store",
      });
      if (!response.ok) throw new Error("Worker schedule unavailable for " + date);
      const payload: { sites?: WorkerTodaySite[]; date?: string } = await response.json();
      if (requestId !== calendarRequest.current) return; // Ignore stale responses.
      const sites = Array.isArray(payload.sites) ? payload.sites : [];
      setWorkerTodaySites(sites);
      setTodayPlans(sites);
    } catch (error) {
      if (requestId !== calendarRequest.current) return;
      console.error("Worker calendar:", error);
      setWorkerTodayError(true);
      setWorkerTodaySites([]);
      setTodayPlans([]);
    } finally {
      if (requestId === calendarRequest.current) setWorkerTodayLoading(false);
    }
  }

  function selectWorkerDate(date: string) {
    const today = viennaToday();
    if (!permittedWorkerDate(date, today) || date === workerSelectedDate) return;
    setWorkerSelectedDate(date);
    void loadWorkerDay(date);
  }

  async function loadTodayPlans(name: string, adminStatus: boolean) {
    if (!adminStatus) {
      // Verified PIN session and worker-specific authorization live on server.
      const initialDate = viennaToday();
      setWorkerSelectedDate(initialDate);
      await loadWorkerDay(initialDate);
      return;
    }

    // Admin dashboard follows the existing web logic and ordering unchanged.
    ++calendarRequest.current;
    setWorkerTodaySites([]);
    setWorkerTodayError(false);
    setWorkerTodayLoading(false);
    const today = getTodayLocalDate();
    const { data, error } = await supabase
      .from("work_calendar")
      .select("*")
      .eq("datum", today)
      .order("worker_name", { ascending: true });

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

  function changeLanguage(nextLanguage: AppLanguage) {
    saveAppLanguage(nextLanguage);
    setLang(nextLanguage);
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

  // Admin UI comes from the exact production web dashboard snapshot.
  // Worker-only compact calendar and typography never affect it.
  if (isAdmin) return <AdminWebDashboard />;

  return (
    <main style={workerMainStyle}>
      <header style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7, paddingRight: 43 }}>
        <img
          src={SOLSTONE_APPROVED_LOGO}
          alt="Solstone Baustelle – originalni logo"
          width={48}
          height={48}
          style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 10,
            border: "1px solid #a55b2c", boxShadow: "0 5px 20px #0008" }}
        />
        <div>
          <h1 style={workerTitleStyle}>SOLSTONE <span style={{ color: "#f8fafc" }}>BAUSTELLE</span></h1>
          <p style={workerSubtitleStyle}>{workerName}</p>
        </div>
      </header>

      <div style={languageBoxStyle}>
        <select
          aria-label="Jezik: DE, BA, UZ, CZ, EN"
          value={lang}
          onChange={e => changeLanguage(e.target.value as AppLanguage)}
          style={languageSelectStyle}
        >
          <option value="de">DE</option>
          <option value="ba">BA</option>
          <option value="uz">UZ</option>
          <option value="cz">CZ</option>
          <option value="en">EN</option>
        </select>
      </div>

      {!isAdmin && (
        <section style={workerTodayBoxStyle} aria-label={t.today}>
          <div style={workerTodayHeadingStyle}>
            <h2 style={{ margin: 0, fontSize: 10, color: "#fff" }}>📅 {t.today}</h2>
            <Link href="/kalendar" style={{ color: "#fdba74", textDecoration: "none", fontSize: 8 }}>
              {t.calendar} ›
            </Link>
          </div>
          <div style={miniCalendarControlsStyle}>
            <button type="button" style={miniCalendarNavStyle}
              aria-label="Prethodni dan" onClick={() => selectWorkerDate(changeISODate(workerSelectedDate, -1))}>‹</button>
            <button type="button" style={miniCalendarActionStyle}
              onClick={() => selectWorkerDate(viennaToday())}>{t.todayShort ?? "Danas"}</button>
            <button type="button" style={miniCalendarActionStyle}
              onClick={() => selectWorkerDate(changeISODate(viennaToday(), 1))}>{t.tomorrow ?? "Sutra"}</button>
            <input type="date" aria-label={t.pickDate ?? "Odaberi datum"}
              value={workerSelectedDate}
              min={changeISODate(viennaToday(), -365)}
              max={changeISODate(viennaToday(), 365)}
              onChange={(event) => selectWorkerDate(event.target.value)}
              style={miniCalendarDateInputStyle}/>
            <button type="button" style={miniCalendarNavStyle}
              aria-label="Naredni dan" onClick={() => selectWorkerDate(changeISODate(workerSelectedDate, 1))}>›</button>
          </div>
          <div style={miniCalendarWeekStyle} aria-label={t.pickDate ?? "Odaberi datum"}>
            {workerWeek(workerSelectedDate).map((date) => {
              const selected = date === workerSelectedDate;
              const today = date === viennaToday();
              const weekday = new Intl.DateTimeFormat(localeForLanguage(lang as AppLanguage), {
                weekday: "short", timeZone: "UTC",
              }).format(new Date(date + "T00:00:00Z"));
              return (
                <button key={date} type="button" disabled={!permittedWorkerDate(date, viennaToday())}
                  aria-pressed={selected}
                  title={date}
                  style={{
                    ...miniCalendarDayStyle,
                    ...(today ? miniCalendarTodayStyle : {}),
                    ...(selected ? miniCalendarSelectedStyle : {}),
                  }}
                  onClick={() => selectWorkerDate(date)}>
                  <span style={{ fontSize: 7 }}>{weekday}</span>
                  <strong style={{ fontSize: 9 }}>{Number(date.slice(-2))}</strong>
                </button>
              );
            })}
          </div>
          <div style={{ color: "#cbd5e1", fontSize: 8, margin: "3px 0" }}>
            {new Intl.DateTimeFormat(localeForLanguage(lang as AppLanguage), {
              day: "2-digit", month: "long", year: "numeric", timeZone: "UTC",
            }).format(new Date(workerSelectedDate + "T00:00:00Z"))}
          </div>
          {workerTodayLoading ? (
            <p role="status" style={{ margin: "9px 0", color: "#fdba74" }}>
              {t.loadingDay ?? "Učitavam raspored…"}
            </p>
          ) : workerTodayError ? (
            <p role="alert" style={{ margin: "9px 0", color: "#fca5a5" }}>{t.error}</p>
          ) : workerTodaySites.length === 0 ? (
            <p style={{ margin: "9px 0", color: "#cbd5e1" }}>{t.noWork}</p>
          ) : (
            <div style={{ display: "grid", gap: 4 }}>
              {workerTodaySites.map((item) => (
                <article key={item.id} style={workerSiteCardStyle}>
                  <div style={{ fontSize: 10, fontWeight: 800 }}>{item.name}</div>
                  {item.location && (
                    <div style={{ marginTop: 3, fontSize: 8, color: "#cbd5e1" }}>📍 {item.location}</div>
                  )}
                  {item.note && (
                    <div style={{ marginTop: 3, fontSize: 8, color: "#f8fafc" }}>📝 {item.note}</div>
                  )}
                  {item.coworkers.length > 0 && (
                    <div style={{ marginTop: 4, fontSize: 11, color: "#cbd5e1" }}>
                      👷 {t.coworkers}: {item.coworkers.join(", ")}
                    </div>
                  )}
                  <Link href={`/baustellen/${item.siteId}`}
                    style={{ display: "inline-block", marginTop: 5, padding: "4px 7px",
                      borderRadius: 9, color: "#121212", background: "#fb923c",
                      textDecoration: "none", fontWeight: 700, fontSize: 8 }}>
                    {t.open} ›
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <div style={gridStyle}>
        <Link href="/baustellen" style={buttonStyle}>
          <span aria-hidden="true" style={{ display: "inline-block", fontSize: "0.72em", marginRight: 3 }}>🏗️</span> {t.baustelle}
        </Link>

        <Link href="/projekte/radnik" style={workerProjectButtonStyle}>
          <span aria-hidden="true" style={{ display: "inline-block", fontSize: "0.8em", marginRight: 4 }}>👷</span> {t.workerProjects}
        </Link>

        {isAdmin && (
          <Link href="/projekte" style={adminProjectButtonStyle}>
            <span aria-hidden="true" style={{ display: "inline-block", fontSize: "0.8em", marginRight: 4 }}>📂</span> {t.projects}
          </Link>
        )}

        {isAdmin && (
          <Link href="/mitarbeiter" style={employeeButtonStyle}>
            <span aria-hidden="true" style={{ display: "inline-block", fontSize: "0.8em", marginRight: 4 }}>👥</span> {t.employees}
          </Link>
        )}

        <Link href="/pregled-sati" style={buttonStyle}>
          <span aria-hidden="true" style={{ display: "inline-block", fontSize: "0.8em", marginRight: 4 }}>⏰</span> {t.hours}
        </Link>

        <Link
          href="/kalendar"
          style={todayPlans.length > 0 ? alertButtonStyle : buttonStyle}
        >
          <span aria-hidden="true" style={{ display: "inline-block", fontSize: "0.8em", marginRight: 4 }}>📅</span> {t.calendar}
        </Link>

        <Link
          href="/auta"
          style={carWarnings.length > 0 ? alertButtonStyle : buttonStyle}
        >
          <span aria-hidden="true" style={{ display: "inline-block", fontSize: "0.8em", marginRight: 4 }}>🚗</span> {t.cars}

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
          <span aria-hidden="true" style={{ display: "inline-block", fontSize: "0.8em", marginRight: 4 }}>📢</span> {t.info}
          <br />
          <small>
            {messages.length} {t.message}
          </small>
        </Link>

        <Link href="/private-notes" style={buttonStyle}>
          <span aria-hidden="true" style={{ display: "inline-block", fontSize: "0.8em", marginRight: 4 }}>📝</span> {t.privateNote}
        </Link>

        {isAdmin && (
          <Link href="/material" style={materialAdminButtonStyle}>
            <span aria-hidden="true" style={{ display: "inline-block", fontSize: "0.8em", marginRight: 4 }}>🧱</span> {t.adminMaterial}
          </Link>
        )}

        <Link
          href="/material-orders"
          style={materialOrders.length > 0 ? alertButtonStyle : buttonStyle}
        >
          <span aria-hidden="true" style={{ display: "inline-block", fontSize: "0.8em", marginRight: 4 }}>🧱</span> {t.materialOrder}
          <br />
          <small>{materialOrders.length} NEW</small>
        </Link>

        <button type="button" onClick={logout} style={logoutButtonStyle}>
          <span aria-hidden="true" style={{ display: "inline-block", fontSize: "0.8em", marginRight: 4 }}>🚪</span> {t.logout}
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
  display: "flex", alignItems: "center", justifyContent: "flex-end",
  gap: 8, marginBottom: 12, flexWrap: "wrap",
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

const workerMainStyle: CSSProperties = {
  background: "#000000", minHeight: "100vh", color: "#ffffff",
  padding: "10px",
};
const workerTitleStyle: CSSProperties = {
  fontSize: 19, margin: 0, color: "#f97316", lineHeight: 1.15,
};
const workerSubtitleStyle: CSSProperties = {
  margin: "2px 0 0", color: "#cccccc", fontSize: 11,
};

const miniCalendarControlsStyle: CSSProperties = {
  display: "flex", alignItems: "center", gap: 4,
  margin: "3px 0", flexWrap: "wrap",
};
const miniCalendarNavStyle: CSSProperties = {
  background: "#334155", color: "#fff", border: "1px solid #64748b",
  borderRadius: 5, minWidth: 18, minHeight: 23, cursor: "pointer", fontSize: 11,
};
const miniCalendarActionStyle: CSSProperties = {
  background: "#29384b", color: "#f8fafc", border: "1px solid #64748b",
  borderRadius: 5, padding: "3px 4px", minHeight: 23, cursor: "pointer", fontSize: 8,
};
const miniCalendarDateInputStyle: CSSProperties = {
  flex: "1 1 67px", maxWidth: 100, minWidth: 63, boxSizing: "border-box",
  background: "#e2e8f0", color: "#1e293b", border: "1px solid #94a3b8",
  borderRadius: 5, padding: "2px 1px", minHeight: 23, fontSize: 8,
};
const miniCalendarWeekStyle: CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))",
  gap: 2, marginTop: 3,
};
const miniCalendarDayStyle: CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
  minWidth: 0, padding: "2px 1px", minHeight: 27,
  background: "#1a293e", color: "#dbeafe", border: "1px solid #384d65",
  borderRadius: 9, cursor: "pointer",
};
const miniCalendarTodayStyle: CSSProperties = {
  borderColor: "#fb923c", boxShadow: "inset 0 0 0 1px #ea580c",
};
const miniCalendarSelectedStyle: CSSProperties = {
  background: "#ea580c", color: "#fff", borderColor: "#fdba74",
};
const languageSelectStyle: CSSProperties = {
  background: "#1b2637", color: "#fff", border: "1px solid #4b617a",
  borderRadius: 8, padding: "5px 24px 5px 8px", fontSize: 11, minHeight: 30,
  cursor: "pointer",
};

const workerTodayBoxStyle: CSSProperties = {
  width: "100%", boxSizing: "border-box", marginInline: 0,
  padding: 6, marginBottom: 7, borderRadius: 7,
  background: "#142339", border: "1px solid #455a72",
};
const workerTodayHeadingStyle: CSSProperties = {
  display: "flex", alignItems: "center",
  justifyContent: "space-between", gap: 4, marginBottom: 3,
};
const workerSiteCardStyle: CSSProperties = {
  padding: 5, borderRadius: 6, background: "#0c1726",
  borderLeft: "4px solid #f97316", borderTop: "1px solid #35475d",
  borderRight: "1px solid #35475d", borderBottom: "1px solid #35475d",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "6px",
};

const buttonStyle: CSSProperties = {
  background: "#2563eb",
  color: "#ffffff",
  textDecoration: "none",
  padding: "9px",
  borderRadius: "9px",
  textAlign: "center",
  fontSize: "12px",
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
  marginTop: "12px",
  background: "#111111",
  border: "1px solid #333333",
  borderRadius: "10px",
  padding: "10px",
};

const infoTitleStyle: CSSProperties = {
  color: "#f97316",
  fontSize: "16px",
  marginTop: 0,
  marginBottom: "14px",
};

const emptyMessageStyle: CSSProperties = {
  color: "#aaaaaa",
  fontSize: "12px",
};

const messageStyle: CSSProperties = {
  background: "#000000",
  border: "1px solid #333333",
  borderRadius: "9px",
  padding: "9px",
  marginBottom: "8px",
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
  fontSize: "12px",
  whiteSpace: "pre-wrap",
  margin: 0,
};