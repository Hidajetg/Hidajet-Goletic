"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

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

const ADMIN_NAMES = new Set(["hido", "steffi", "admin", "hidajet"]);

export default function LoginPage() {
  const router = useRouter();

  const [workers, setWorkers] = useState<Worker[]>(FALLBACK_WORKERS);
  const [name, setName] = useState("Hido");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadWorkers();
  }, []);

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
      }
    } catch (e) {
      console.error(e);
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

  async function login() {
    if (loading) return;

    setError("");

    if (!name.trim()) {
      setError("Bitte Mitarbeiter auswählen.");
      return;
    }

    if (!/^\d{4,8}$/.test(pin)) {
      setError("PIN muss aus 4 bis 8 Zahlen bestehen.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), pin }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Name oder PIN ist falsch.");
      }

      saveUser(data.user);
      setPin("");

      router.replace("/dashboard");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Anmeldung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={bgStyle} />
      <div style={shadeStyle} />

      <div style={cardStyle}>
        <img src={LOGO_URL} alt="SolStone" style={logoStyle} />

        <h1 style={titleStyle}>STONE BOUTIQUE</h1>
        <p style={subStyle}>Baustellen App</p>

        <label style={labelStyle}>Mitarbeiter</label>
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
            onClick={() => setShowPin((v) => !v)}
            style={eyeStyle}
            title={showPin ? "PIN verbergen" : "PIN anzeigen"}
          >
            {showPin ? "🙈" : "👁"}
          </button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <button
          type="button"
          onClick={login}
          disabled={loading}
          style={loginStyle}
        >
          {loading ? "Anmeldung..." : "Anmelden"}
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
  background: "#222",
  padding: 20,
};

const bgStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: `url("${BACKGROUND_URL}")`,
  backgroundSize: "cover",
  backgroundPosition: "center",
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
  border: "1px solid #444",
  borderRadius: 18,
  padding: 26,
  color: "#fff",
  boxShadow: "0 20px 60px rgba(0,0,0,.55)",
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
  margin: "9px 0 28px",
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
  border: "1px solid #aaa",
  background: "#edf4ff",
  color: "#000",
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
  border: "1px solid #aaa",
  borderRadius: "0 10px 10px 0",
  background: "#fff",
  cursor: "pointer",
  fontSize: 19,
};

const errorStyle: React.CSSProperties = {
  background: "#5b0a0a",
  border: "1px solid #b91c1c",
  color: "#fff",
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
  color: "#fff",
  fontWeight: 900,
  fontSize: 16,
  cursor: "pointer",
};