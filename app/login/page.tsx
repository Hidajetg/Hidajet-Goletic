"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import {
  APP_LANGUAGES,
  type AppLanguage,
  readAppLanguage,
  saveAppLanguage,
} from "../lib/language";

const LOGO_URL =
  "https://axpfymarrqjebpwosidr.supabase.co/storage/v1/object/public/pdf-assets/logo.png";

const BACKGROUND_URL =
  "https://axpfymarrqjebpwosidr.supabase.co/storage/v1/object/public/pdf-assets/pozadina.png";

type Worker = {
  id: string;
  name: string;
  role: "admin" | "worker";
};

const FALLBACK_WORKERS: Worker[] = [
  { id: "6", name: "Hido", role: "admin" },
  { id: "7", name: "Steffi", role: "admin" },
  { id: "1", name: "Arnes", role: "worker" },
  { id: "2", name: "Ramiz", role: "worker" },
  { id: "4", name: "Shohruh", role: "worker" },
];

const ADMIN_NAMES = new Set([
  "hido",
  "steffi",
  "admin",
  "hidajet",
  "hidajet goletic",
  "hidajet goletić",
]);

const translations: Record<AppLanguage, Record<string, string>> = {
  de: {
    app: "Baustellen App",
    worker: "Mitarbeiter",
    showPin: "PIN anzeigen",
    hidePin: "PIN verbergen",
    remember: "Login speichern",
    rememberHint: "Auf diesem Gerät 30 Tage angemeldet bleiben",
    login: "Anmelden",
    loggingIn: "Anmeldung...",
    checking: "Gespeicherte Anmeldung wird geprüft...",
    chooseWorker: "Bitte Mitarbeiter auswählen.",
    pinRule: "PIN muss aus 4 bis 8 Zahlen bestehen.",
    wrongLogin: "Name oder PIN ist falsch.",
    failed: "Anmeldung fehlgeschlagen.",
    language: "Sprache",
  },
  ba: {
    app: "Aplikacija za gradilišta",
    worker: "Radnik",
    showPin: "Prikaži PIN",
    hidePin: "Sakrij PIN",
    remember: "Sačuvaj prijavu",
    rememberHint: "Ostani prijavljen 30 dana na ovom uređaju",
    login: "Prijava",
    loggingIn: "Prijava...",
    checking: "Provjera sačuvane prijave...",
    chooseWorker: "Odaberi radnika.",
    pinRule: "PIN mora imati 4 do 8 brojeva.",
    wrongLogin: "Ime ili PIN nisu tačni.",
    failed: "Prijava nije uspjela.",
    language: "Jezik",
  },
  uz: {
    app: "Qurilish maydoni ilovasi",
    worker: "Ishchi",
    showPin: "PINni ko‘rsatish",
    hidePin: "PINni yashirish",
    remember: "Kirishni saqlash",
    rememberHint: "Ushbu qurilmada 30 kun tizimda qolish",
    login: "Kirish",
    loggingIn: "Kirilmoqda...",
    checking: "Saqlangan kirish tekshirilmoqda...",
    chooseWorker: "Ishchini tanlang.",
    pinRule: "PIN 4 dan 8 tagacha raqamdan iborat bo‘lishi kerak.",
    wrongLogin: "Ism yoki PIN noto‘g‘ri.",
    failed: "Kirish amalga oshmadi.",
    language: "Til",
  },
  cz: {
    app: "Aplikace stavby",
    worker: "Pracovník",
    showPin: "Zobrazit PIN",
    hidePin: "Skrýt PIN",
    remember: "Uložit přihlášení",
    rememberHint: "Zůstat přihlášen 30 dní na tomto zařízení",
    login: "Přihlásit se",
    loggingIn: "Přihlašování...",
    checking: "Kontrola uloženého přihlášení...",
    chooseWorker: "Vyberte pracovníka.",
    pinRule: "PIN musí obsahovat 4 až 8 číslic.",
    wrongLogin: "Jméno nebo PIN není správný.",
    failed: "Přihlášení se nezdařilo.",
    language: "Jazyk",
  },
  en: {
    app: "Construction Site App",
    worker: "Worker",
    showPin: "Show PIN",
    hidePin: "Hide PIN",
    remember: "Save login",
    rememberHint: "Stay logged in for 30 days on this device",
    login: "Login",
    loggingIn: "Logging in...",
    checking: "Checking saved login...",
    chooseWorker: "Please select a worker.",
    pinRule: "PIN must contain 4 to 8 digits.",
    wrongLogin: "Name or PIN is incorrect.",
    failed: "Login failed.",
    language: "Language",
  },
};

export default function LoginPage() {
  const router = useRouter();

  const [workers, setWorkers] = useState<Worker[]>(FALLBACK_WORKERS);
  const [name, setName] = useState("Hido");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(false);
  const [lang, setLang] = useState<AppLanguage>("de");

  const [checkingSavedLogin, setCheckingSavedLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const t = translations[lang];

  useEffect(() => {
    const savedName = localStorage.getItem("solstone_saved_worker");
    const savedRemember =
      localStorage.getItem("solstone_remember_login") === "true";

    setLang(readAppLanguage("de"));

    if (savedName) setName(savedName);
    setRememberLogin(savedRemember);

    loadWorkers();
    checkSavedLogin(savedRemember);
  }, []);

  function changeLanguage(next: AppLanguage) {
    setLang(next);
    saveAppLanguage(next);
    setError("");
  }

  async function checkSavedLogin(shouldCheck: boolean) {
    if (!shouldCheck) {
      setCheckingSavedLogin(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.user) {
        saveUser(data.user);
        router.replace("/dashboard");
        router.refresh();
        return;
      }
    } catch (e) {
      console.error("Saved login check:", e);
    }

    setCheckingSavedLogin(false);
  }

  async function loadWorkers() {
    try {
      const { data } = await supabase
        .from("workers")
        .select("*")
        .order("name", { ascending: true });

      const dbWorkers: Worker[] = (data || [])
        .filter((row: any) => row?.active !== false)
        .map((row: any) => {
          const workerName = String(row?.name || "").trim();

          const role: "admin" | "worker" =
            String(row?.role || "").toLowerCase() === "admin" ||
            ADMIN_NAMES.has(workerName.toLowerCase())
              ? "admin"
              : "worker";

          return {
            id: String(row?.id ?? workerName),
            name: workerName,
            role,
          };
        })
        .filter((worker) => worker.name);

      if (dbWorkers.length > 0) {
        setWorkers(dbWorkers);

        const savedName = localStorage.getItem("solstone_saved_worker");

        if (
          savedName &&
          dbWorkers.some(
            (worker) => worker.name.toLowerCase() === savedName.toLowerCase(),
          )
        ) {
          setName(savedName);
        }
      }
    } catch (e) {
      console.error("Load workers:", e);
    }
  }

  function saveUser(user: any) {
    const id = String(user.id);
    const userName = String(user.name);
    const role = String(user.role);

    const json = JSON.stringify({
      id,
      name: userName,
      role,
      is_admin: role === "admin",
      admin: role === "admin",
    });

    localStorage.setItem("worker_id", id);
    localStorage.setItem("worker_name", userName);
    localStorage.setItem("worker_role", role);
    localStorage.setItem("userName", userName);
    localStorage.setItem("userRole", role);
    localStorage.setItem("name", userName);
    localStorage.setItem("role", role);
    localStorage.setItem("loggedIn", "true");
    localStorage.setItem("isLoggedIn", "true");

    localStorage.setItem("currentWorker", json);
    localStorage.setItem("currentUser", json);
    localStorage.setItem("loggedUser", json);
    localStorage.setItem("user", json);
  }

  function changeRememberLogin(value: boolean) {
    setRememberLogin(value);

    if (!value) {
      localStorage.removeItem("solstone_remember_login");
      localStorage.removeItem("solstone_saved_worker");
    }
  }

  async function login() {
    if (loading) return;

    setError("");

    if (!name.trim()) {
      setError(t.chooseWorker);
      return;
    }

    if (!/^\d{4,8}$/.test(pin)) {
      setError(t.pinRule);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          pin,
          remember: rememberLogin,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || t.wrongLogin);
      }

      saveUser(data.user);
      saveAppLanguage(lang);

      if (rememberLogin) {
        localStorage.setItem("solstone_remember_login", "true");
        localStorage.setItem("solstone_saved_worker", String(data.user.name));
      } else {
        localStorage.removeItem("solstone_remember_login");
        localStorage.removeItem("solstone_saved_worker");
      }

      setPin("");

      router.replace("/dashboard");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || t.failed);
    } finally {
      setLoading(false);
    }
  }

  if (checkingSavedLogin) {
    return (
      <main style={pageStyle}>
        <div style={bgStyle} />
        <div style={shadeStyle} />

        <div style={checkingCardStyle}>
          <img src={LOGO_URL} alt="SolStone" style={logoStyle} />
          <div style={checkingTextStyle}>{t.checking}</div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={bgStyle} />
      <div style={shadeStyle} />

      <div style={cardStyle}>
        <img src={LOGO_URL} alt="SolStone" style={logoStyle} />

        <h1 style={titleStyle}>STONE BOUTIQUE</h1>
        <p style={subStyle}>{t.app}</p>

        <div style={languageBoxStyle} aria-label={t.language}>
          {APP_LANGUAGES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => changeLanguage(code)}
              style={lang === code ? activeLanguageButtonStyle : languageButtonStyle}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>

        <label style={labelStyle}>{t.worker}</label>

        <select
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setPin("");
            setError("");
          }}
          style={inputStyle}
        >
          {workers.map((worker) => (
            <option key={worker.id} value={worker.name}>
              {worker.name}
              {worker.role === "admin" ? " — Admin" : ""}
            </option>
          ))}
        </select>

        <label style={labelStyle}>PIN</label>

        <div style={pinRowStyle}>
          <input
            type={showPin ? "text" : "password"}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") login();
            }}
            inputMode="numeric"
            maxLength={8}
            placeholder="PIN"
            style={pinInputStyle}
          />

          <button
            type="button"
            onClick={() => setShowPin((value) => !value)}
            style={eyeStyle}
            title={showPin ? t.hidePin : t.showPin}
          >
            {showPin ? "🙈" : "👁"}
          </button>
        </div>

        <label style={rememberRowStyle}>
          <input
            type="checkbox"
            checked={rememberLogin}
            onChange={(e) => changeRememberLogin(e.target.checked)}
            style={checkboxStyle}
          />

          <span>
            <strong>{t.remember}</strong>
            <small style={rememberHintStyle}>{t.rememberHint}</small>
          </span>
        </label>

        {error && <div style={errorStyle}>{error}</div>}

        <button
          type="button"
          onClick={login}
          disabled={loading}
          style={{
            ...loginStyle,
            opacity: loading ? 0.65 : 1,
          }}
        >
          {loading ? t.loggingIn : t.login}
        </button>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#222222",
  padding: 20,
};

const bgStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: `url("${BACKGROUND_URL}")`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

const shadeStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(0,0,0,.58)",
};

const cardStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 2,
  width: "100%",
  maxWidth: 360,
  background: "rgba(0,0,0,.95)",
  border: "1px solid #444444",
  borderRadius: 18,
  padding: 26,
  color: "#ffffff",
  boxShadow: "0 20px 60px rgba(0,0,0,.55)",
};

const checkingCardStyle: React.CSSProperties = {
  ...cardStyle,
  textAlign: "center",
};

const checkingTextStyle: React.CSSProperties = {
  marginTop: 15,
  color: "#ffffff",
  fontSize: 14,
  fontWeight: 700,
};

const logoStyle: React.CSSProperties = {
  display: "block",
  width: 120,
  margin: "0 auto 12px",
};

const titleStyle: React.CSSProperties = {
  textAlign: "center",
  color: "#ff7417",
  margin: 0,
  fontSize: 28,
  fontWeight: 900,
};

const subStyle: React.CSSProperties = {
  textAlign: "center",
  margin: "9px 0 16px",
  color: "#ffffff",
};

const languageBoxStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: 6,
  marginBottom: 22,
};

const languageButtonStyle: React.CSSProperties = {
  height: 34,
  borderRadius: 8,
  border: "1px solid #555",
  background: "#171717",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const activeLanguageButtonStyle: React.CSSProperties = {
  ...languageButtonStyle,
  background: "#ff7417",
  borderColor: "#ff7417",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  margin: "0 0 7px",
  fontSize: 13,
  fontWeight: 800,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  marginBottom: 17,
  boxSizing: "border-box",
  borderRadius: 10,
  border: "1px solid #aaaaaa",
  background: "#edf4ff",
  color: "#000000",
  padding: "0 12px",
  fontSize: 16,
};

const pinRowStyle: React.CSSProperties = {
  display: "flex",
  marginBottom: 14,
};

const pinInputStyle: React.CSSProperties = {
  ...inputStyle,
  marginBottom: 0,
  borderRadius: "10px 0 0 10px",
  borderRight: "none",
};

const eyeStyle: React.CSSProperties = {
  width: 54,
  border: "1px solid #aaaaaa",
  borderRadius: "0 10px 10px 0",
  background: "#ffffff",
  cursor: "pointer",
  fontSize: 19,
};

const rememberRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  margin: "3px 0 17px",
  cursor: "pointer",
  color: "#ffffff",
  fontSize: 13,
};

const checkboxStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  marginTop: 1,
  accentColor: "#ff7417",
  cursor: "pointer",
};

const rememberHintStyle: React.CSSProperties = {
  display: "block",
  marginTop: 3,
  color: "#aaaaaa",
  fontSize: 11,
  fontWeight: 400,
};

const errorStyle: React.CSSProperties = {
  background: "#5b0a0a",
  border: "1px solid #b91c1c",
  color: "#ffffff",
  borderRadius: 9,
  padding: 11,
  marginBottom: 14,
  fontSize: 13,
};

const loginStyle: React.CSSProperties = {
  width: "100%",
  height: 50,
  border: "none",
  borderRadius: 10,
  background: "#ff7417",
  color: "#ffffff",
  fontWeight: 900,
  fontSize: 16,
  cursor: "pointer",
};
