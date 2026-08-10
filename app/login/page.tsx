"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LOGO_URL =
  "https://axpfymarrqjebpwosidr.supabase.co/storage/v1/object/public/pdf-assets/logo.png";

const BACKGROUND_URL =
  "https://axpfymarrqjebpwosidr.supabase.co/storage/v1/object/public/pdf-assets/pozadina.png";

export default function LoginPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [pin, setPin] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login() {
    setError("");

    const cleanName = name.trim();
    const cleanPin = pin.trim();

    if (!cleanName) {
      setError("Bitte Namen eingeben.");
      return;
    }

    if (!cleanPin) {
      setError("Bitte PIN eingeben.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",

        body: JSON.stringify({
          name: cleanName,
          pin: cleanPin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Anmeldung fehlgeschlagen."
        );
      }

      if (!data?.user) {
        throw new Error(
          "Benutzerdaten konnten nicht geladen werden."
        );
      }

      const user = data.user;

      // ======================================================
      // KOMPATIBILNOST SA POSTOJEĆOM APLIKACIJOM
      // ======================================================

      localStorage.setItem(
        "worker_id",
        String(user.id)
      );

      localStorage.setItem(
        "worker_name",
        String(user.name)
      );

      localStorage.setItem(
        "worker_role",
        String(user.role)
      );

      localStorage.setItem(
        "user_id",
        String(user.id)
      );

      localStorage.setItem(
        "userName",
        String(user.name)
      );

      localStorage.setItem(
        "userRole",
        String(user.role)
      );

      localStorage.setItem(
        "name",
        String(user.name)
      );

      localStorage.setItem(
        "role",
        String(user.role)
      );

      localStorage.setItem(
        "loggedIn",
        "true"
      );

      localStorage.setItem(
        "isLoggedIn",
        "true"
      );

      // Stari formati ako ih neki modul još koristi
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          id: String(user.id),
          name: String(user.name),
          role: String(user.role),
        })
      );

      localStorage.setItem(
        "currentWorker",
        JSON.stringify({
          id: String(user.id),
          name: String(user.name),
          role: String(user.role),
        })
      );

      // ======================================================
      // DASHBOARD
      // ======================================================

      router.replace("/dashboard");
      router.refresh();

    } catch (err: any) {
      console.error("LOGIN ERROR:", err);

      setError(
        err?.message ||
          "Anmeldung fehlgeschlagen."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      login();
    }
  }

  return (
    <main style={pageStyle}>

      <div style={backgroundStyle} />

      <div style={overlayStyle} />

      <section style={loginBoxStyle}>

        <div style={logoBoxStyle}>
          <img
            src={LOGO_URL}
            alt="Stone Boutique"
            style={logoStyle}
          />
        </div>

        <h1 style={titleStyle}>
          STONE BOUTIQUE
        </h1>

        <p style={subtitleStyle}>
          Baustellen App
        </p>

        <div style={formStyle}>

          <label style={labelStyle}>
            Mitarbeiter
          </label>

          <input
            type="text"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Name"
            autoComplete="username"
            style={inputStyle}
          />

          <label style={labelStyle}>
            PIN
          </label>

          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(event) =>
              setPin(
                event.target.value.replace(
                  /\D/g,
                  ""
                )
              )
            }
            onKeyDown={handleKeyDown}
            placeholder="PIN"
            autoComplete="current-password"
            maxLength={8}
            style={inputStyle}
          />

          {error && (
            <div style={errorStyle}>
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={login}
            disabled={loading}
            style={{
              ...loginButtonStyle,

              opacity: loading
                ? 0.6
                : 1,

              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "Anmeldung..."
              : "Anmelden"}
          </button>

        </div>

      </section>

    </main>
  );
}

// ============================================================
// STYLE
// ============================================================

const pageStyle: React.CSSProperties = {
  position: "relative",
  minHeight: "100vh",
  width: "100%",
  overflow: "hidden",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  background: "#000000",

  padding: "20px",
};

const backgroundStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,

  backgroundImage: `url("${BACKGROUND_URL}")`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",

  opacity: 0.55,
};

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,

  background:
    "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.82))",
};

const loginBoxStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 2,

  width: "100%",
  maxWidth: "420px",

  background: "rgba(0,0,0,0.88)",

  border: "1px solid #333333",
  borderRadius: "20px",

  padding: "28px",

  boxShadow:
    "0 20px 60px rgba(0,0,0,0.55)",

  color: "#ffffff",
};

const logoBoxStyle: React.CSSProperties = {
  width: "100%",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  marginBottom: "14px",
};

const logoStyle: React.CSSProperties = {
  display: "block",
  width: "150px",
  maxWidth: "70%",
  height: "auto",
  objectFit: "contain",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  textAlign: "center",

  fontSize: "30px",
  fontWeight: 900,

  color: "#f97316",
};

const subtitleStyle: React.CSSProperties = {
  marginTop: "6px",
  marginBottom: "25px",

  textAlign: "center",

  color: "#bbbbbb",

  fontSize: "15px",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const labelStyle: React.CSSProperties = {
  marginTop: "5px",

  fontSize: "14px",
  fontWeight: 700,

  color: "#dddddd",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",

  padding: "14px 15px",

  background: "#111111",
  color: "#ffffff",

  border: "1px solid #444444",
  borderRadius: "12px",

  outline: "none",

  fontSize: "17px",
};

const loginButtonStyle: React.CSSProperties = {
  width: "100%",

  marginTop: "12px",

  padding: "15px",

  background: "#f97316",
  color: "#ffffff",

  border: "none",
  borderRadius: "12px",

  fontSize: "17px",
  fontWeight: 900,
};

const errorStyle: React.CSSProperties = {
  marginTop: "5px",

  padding: "12px",

  background: "#450a0a",

  border: "1px solid #991b1b",
  borderRadius: "10px",

  color: "#fecaca",

  fontSize: "14px",
  fontWeight: 700,
};