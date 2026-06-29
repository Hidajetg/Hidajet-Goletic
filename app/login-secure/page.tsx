"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

const LOGO_URL =
  "https://axpfymarrqjebpwosidr.supabase.co/storage/v1/object/public/pdf-assets/logo.png";

const BACKGROUND_URL =
  "https://axpfymarrqjebpwosidr.supabase.co/storage/v1/object/public/pdf-assets/pozadina.png";

export default function SecureLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!email.trim()) {
      alert("Bitte E-Mail-Adresse eingeben.");
      return;
    }

    if (!password) {
      alert("Bitte Passwort eingeben.");
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (authError || !authData.user) {
        alert("Falsche E-Mail-Adresse oder falsches Passwort.");
        return;
      }

      const { data: worker, error: workerError } = await supabase
        .from("workers")
        .select("id, name, role, active, auth_user_id")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();

      if (workerError) {
        await supabase.auth.signOut();

        alert(
          "Fehler beim Laden des Benutzerkontos: " + workerError.message
        );

        return;
      }

      if (!worker) {
        await supabase.auth.signOut();

        alert(
          "Dieses Benutzerkonto ist noch keinem Mitarbeiter zugeordnet."
        );

        return;
      }

      if (!worker.active) {
        await supabase.auth.signOut();

        alert("Dieses Benutzerkonto wurde deaktiviert.");
        return;
      }

      localStorage.setItem("worker_id", String(worker.id));
      localStorage.setItem("worker_name", worker.name);
      localStorage.setItem("worker_role", worker.role);
      localStorage.setItem("userName", worker.name);

      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Login error:", error);

      alert("Bei der Anmeldung ist ein unerwarteter Fehler aufgetreten.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={mainStyle}>
      <div style={overlayStyle}>
        <div style={boxStyle}>
          <div style={logoBoxStyle}>
            <img
              src={LOGO_URL}
              alt="Solstone Logo"
              style={logoStyle}
            />

            <p style={systemStyle}>
              Baustellen Management System
            </p>

            <p style={secureStyle}>
              Sichere Anmeldung
            </p>
          </div>

          <label style={labelStyle}>
            E-Mail-Adresse
          </label>

          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            style={inputStyle}
            placeholder="E-Mail-Adresse eingeben"
            disabled={loading}
          />

          <label style={labelStyle}>
            Passwort
          </label>

          <div style={passwordBoxStyle}>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              style={{
                ...inputStyle,
                marginBottom: 0,
                paddingRight: "55px",
              }}
              placeholder="Passwort eingeben"
              disabled={loading}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !loading) {
                  login();
                }
              }}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={eyeButtonStyle}
              disabled={loading}
              aria-label={
                showPassword
                  ? "Passwort ausblenden"
                  : "Passwort anzeigen"
              }
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>

          <button
            type="button"
            onClick={login}
            style={{
              ...buttonStyle,
              opacity: loading ? 0.65 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            disabled={loading}
          >
            {loading ? "ANMELDUNG..." : "SICHER ANMELDEN"}
          </button>
        </div>
      </div>
    </main>
  );
}

const mainStyle: any = {
  minHeight: "100vh",
  color: "white",
  backgroundImage: `url(${BACKGROUND_URL})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

const overlayStyle: any = {
  minHeight: "100vh",
  background: "rgba(0,0,0,0.28)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "30px",
};

const boxStyle: any = {
  background: "rgba(0,0,0,0.28)",
  padding: "35px",
  borderRadius: "24px",
  width: "100%",
  maxWidth: "520px",
  border: "1px solid rgba(249,115,22,0.85)",
  boxShadow: "0 0 50px rgba(0,0,0,0.55)",
  backdropFilter: "blur(3px)",
  WebkitBackdropFilter: "blur(3px)",
};

const logoBoxStyle: any = {
  textAlign: "center",
  marginBottom: "35px",
  paddingBottom: "25px",
  borderBottom: "1px solid rgba(255,255,255,0.18)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const logoStyle: any = {
  display: "block",
  width: "100%",
  maxWidth: "360px",
  height: "auto",
  margin: "0 auto 16px auto",
};

const systemStyle: any = {
  fontSize: "18px",
  margin: "8px 0 4px 0",
  color: "#ffffff",
  fontWeight: "bold",
  textShadow: "0 2px 8px rgba(0,0,0,0.9)",
};

const secureStyle: any = {
  fontSize: "15px",
  margin: 0,
  color: "#22c55e",
  fontWeight: "bold",
  textShadow: "0 2px 8px rgba(0,0,0,0.9)",
};

const labelStyle: any = {
  display: "block",
  fontWeight: "bold",
  color: "#ffffff",
  textShadow: "0 2px 8px rgba(0,0,0,0.9)",
};

const inputStyle: any = {
  width: "100%",
  boxSizing: "border-box",
  padding: "15px",
  marginTop: "8px",
  marginBottom: "20px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.5)",
  background: "rgba(255,255,255,0.82)",
  color: "#000000",
  fontSize: "18px",
  outline: "none",
};

const passwordBoxStyle: any = {
  position: "relative",
  marginBottom: "20px",
};

const eyeButtonStyle: any = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  background: "transparent",
  border: "none",
  color: "#111111",
  cursor: "pointer",
  fontSize: "20px",
};

const buttonStyle: any = {
  width: "100%",
  padding: "16px",
  background: "#f97316",
  color: "#ffffff",
  border: "none",
  borderRadius: "14px",
  fontSize: "20px",
  fontWeight: "bold",
  marginTop: "10px",
};