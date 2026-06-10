"use client";

import { useState } from "react";

const LOGO_URL =
  "https://axpfymarrqjebpwosidr.supabase.co/storage/v1/object/public/pdf-assets/logo.png";

const BACKGROUND_URL =
  "https://axpfymarrqjebpwosidr.supabase.co/storage/v1/object/public/pdf-assets/pozadina.png";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  function login() {
    const users = [
      { id: 1, name: "Arnes", pin: "1111", role: "worker" },
      { id: 2, name: "Ramiz", pin: "2222", role: "worker" },
      { id: 3, name: "Abror", pin: "3333", role: "worker" },
      { id: 4, name: "Shohruh", pin: "4444", role: "worker" },
      { id: 5, name: "Harun", pin: "5555", role: "worker" },
      { id: 6, name: "Hido", pin: "0000", role: "admin" },
      { id: 7, name: "Steffi", pin: "0001", role: "admin" },
      { id: 8, name: "Admin", pin: "0000", role: "admin" },
    ];

    const user = users.find(
      (u) =>
        u.name.toLowerCase() === name.trim().toLowerCase() &&
        u.pin === pin.trim()
    );

    if (!user) {
      alert("Falscher Name oder PIN.");
      return;
    }

    localStorage.setItem("worker_id", String(user.id));
    localStorage.setItem("worker_name", user.name);
    localStorage.setItem("worker_role", user.role);
    localStorage.setItem("userName", user.name);

    window.location.href = "/dashboard";
  }

  return (
    <main style={mainStyle}>
      <div style={overlayStyle}>
        <div style={boxStyle}>
          <div style={logoBoxStyle}>
            <img src={LOGO_URL} alt="Solstone Logo" style={logoStyle} />

            <p style={systemStyle}>Baustellen Management System</p>
            <p style={testStyle}>Testbetrieb</p>
          </div>

          <label style={labelStyle}>Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            placeholder="Name eingeben"
          />

          <label style={labelStyle}>PIN</label>

          <div style={pinBoxStyle}>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              type={showPin ? "text" : "password"}
              style={{ ...inputStyle, marginBottom: 0, paddingRight: "55px" }}
              placeholder="PIN eingeben"
              onKeyDown={(e) => {
                if (e.key === "Enter") login();
              }}
            />

            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              style={eyeButtonStyle}
            >
              {showPin ? "🙈" : "👁"}
            </button>
          </div>

          <button onClick={login} style={buttonStyle}>
            LOGIN
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
  background:
    "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.9))",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "30px",
};

const boxStyle: any = {
  background: "rgba(0,0,0,0.78)",
  padding: "35px",
  borderRadius: "24px",
  width: "100%",
  maxWidth: "520px",
  border: "1px solid rgba(249,115,22,0.45)",
  boxShadow: "0 0 40px rgba(0,0,0,0.8)",
  backdropFilter: "blur(6px)",
};

const logoBoxStyle: any = {
  textAlign: "center",
  marginBottom: "35px",
  paddingBottom: "25px",
  borderBottom: "1px solid #333",
};

const logoStyle: any = {
  width: "100%",
  maxWidth: "360px",
  height: "auto",
  marginBottom: "16px",
};

const systemStyle: any = {
  fontSize: "18px",
  margin: "8px 0 4px 0",
  color: "#ddd",
  fontWeight: "bold",
};

const testStyle: any = {
  fontSize: "15px",
  margin: 0,
  color: "#f97316",
};

const labelStyle: any = {
  fontWeight: "bold",
  color: "#ddd",
};

const inputStyle: any = {
  width: "100%",
  padding: "15px",
  marginTop: "8px",
  marginBottom: "20px",
  borderRadius: "12px",
  border: "1px solid #444",
  background: "rgba(0,0,0,0.75)",
  color: "white",
  fontSize: "18px",
  outline: "none",
};

const pinBoxStyle: any = {
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
  color: "white",
  cursor: "pointer",
  fontSize: "20px",
};

const buttonStyle: any = {
  width: "100%",
  padding: "16px",
  background: "#f97316",
  color: "white",
  border: "none",
  borderRadius: "14px",
  fontSize: "20px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "10px",
};