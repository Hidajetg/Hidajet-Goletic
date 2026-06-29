"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

const LOGO_URL =
  "https://axpfymarrqjebpwosidr.supabase.co/storage/v1/object/public/pdf-assets/logo.png";

const BACKGROUND_URL =
  "https://axpfymarrqjebpwosidr.supabase.co/storage/v1/object/public/pdf-assets/pozadina.png";

const legacyUsers = [
  { name: "Arnes", pin: "1111", role: "worker" },
  { name: "Ramiz", pin: "2222", role: "worker" },
  { name: "Abror", pin: "3333", role: "worker" },
  { name: "Shohruh", pin: "4444", role: "worker" },
  { name: "Harun", pin: "5555", role: "worker" },
  { name: "Hido", pin: "0000", role: "admin" },
  { name: "Steffi", pin: "0001", role: "admin" },
];

export default function SecureLoginPage() {
  const [loginName, setLoginName] = useState("Hido");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function saveUserAndGoDashboard(user: any) {
    localStorage.setItem("worker_id", String(user.id || user.name));
    localStorage.setItem("worker_name", user.name);
    localStorage.setItem("worker_role", user.role);
    localStorage.setItem("userName", user.name);

    window.location.href = "/dashboard";
  }

  function loginLegacyUser() {
    const inputName = loginName.trim().toLowerCase();

    const foundUser = legacyUsers.find(
      (user) =>
        user.name.toLowerCase() === inputName &&
        String(user.pin) === String(password)
    );

    if (!foundUser) {
      alert("Falscher Name oder falsche PIN.");
      return false;
    }

    saveUserAndGoDashboard(foundUser);
    return true;
  }

  async function loginSecureEmail() {
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: loginName.trim().toLowerCase(),
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
      alert("Fehler beim Laden des Benutzerkontos: " + workerError.message);
      return;
    }

    if (!worker) {
      await supabase.auth.signOut();
      alert("Dieses Benutzerkonto ist noch keinem Mitarbeiter zugeordnet.");
      return;
    }

    if (!worker.active) {
      await supabase.auth.signOut();
      alert("Dieses Benutzerkonto wurde deaktiviert.");
      return;
    }

    saveUserAndGoDashboard(worker);
  }

  async function login() {
    if (!loginName.trim()) {
      alert("Bitte Name oder E-Mail-Adresse eingeben.");
      return;
    }

    if (!password) {
      alert("Bitte Passwort oder PIN eingeben.");
      return;
    }

    setLoading(true);

    try {
      const isEmailLogin = loginName.includes("@");

      if (isEmailLogin) {
        await loginSecureEmail();
      } else {
        loginLegacyUser();
      }
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
            <img src={LOGO_URL} alt="Solstone Logo" style={logoStyle} />

            <p style={systemStyle}>Baustellen Management System</p>

            <p style={secureStyle}>Anmeldung</p>
          </div>

          <label style={labelStyle}>Name oder E-Mail-Adresse</label>

          <input
            value={loginName}
            onChange={(event) => setLoginName(event.target.value)}
            type="text"
            autoComplete="username"
            style={inputStyle}
            placeholder="Name oder E-Mail eingeben"
            disabled={loading}
          />

          <label style={labelStyle}>Passwort / PIN</label>

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
              placeholder="Passwort oder PIN eingeben"
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
            {loading ? "ANMELDUNG..." : "ANMELDEN"}
          </button>

          <div style={hintBoxStyle}>
            <p style={hintTextStyle}>
              Radnici se prijavljuju sa imenom i PIN-om.
            </p>
            <p style={hintTextStyle}>
              Admin: Hido 0000 / Steffi 0001
            </p>
          </div>
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

const hintBoxStyle: any = {
  marginTop: "18px",
  textAlign: "center",
};

const hintTextStyle: any = {
  margin: "4px 0",
  fontSize: "13px",
  color: "#e5e7eb",
  textShadow: "0 2px 8px rgba(0,0,0,0.9)",
};