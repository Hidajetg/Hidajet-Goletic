"use client";

import { useState } from "react";

export default function LoginPage() {
  const [name, setName] = useState("Admin");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  function login() {
    const users = [
      { name: "Arnes", pin: "1111", role: "worker" },
      { name: "Ramiz", pin: "2222", role: "worker" },
      { name: "Abror", pin: "3333", role: "worker" },
      { name: "Shohruh", pin: "4444", role: "worker" },
      { name: "Harun", pin: "5555", role: "worker" },
      { name: "Hido", pin: "0000", role: "admin" },
      { name: "Steffi", pin: "0001", role: "admin" },
      { name: "Admin", pin: "0000", role: "admin" },
    ];

    const user = users.find(
      (u) =>
        u.name.toLowerCase() === name.trim().toLowerCase() &&
        u.pin === pin.trim()
    );

    if (!user) {
      alert("Pogrešno ime ili PIN.");
      return;
    }

    localStorage.setItem("worker_name", user.name);
    localStorage.setItem("worker_role", user.role);

    window.location.href = "/dashboard";
  }

  return (
    <main style={mainStyle}>
      <div style={boxStyle}>
        <div style={logoBoxStyle}>
          <h1 style={brandStyle}>STONE BOUTIQUE</h1>
          <p style={companyStyle}>Nocker & Bernardi GmbH</p>
          <p style={systemStyle}>Baustellen Management System</p>
        </div>

        <label>Ime radnika</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />

        <label>PIN</label>

        <div style={pinBoxStyle}>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            type={showPin ? "text" : "password"}
            style={{ ...inputStyle, marginBottom: 0, paddingRight: "55px" }}
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
          Prijavi se
        </button>
      </div>
    </main>
  );
}

const mainStyle: any = {
  background: "#000",
  minHeight: "100vh",
  color: "white",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "30px",
};

const boxStyle: any = {
  background: "#111",
  padding: "35px",
  borderRadius: "22px",
  width: "100%",
  maxWidth: "500px",
  border: "1px solid #222",
};

const logoBoxStyle: any = {
  textAlign: "center",
  marginBottom: "35px",
  paddingBottom: "25px",
  borderBottom: "1px solid #333",
};

const brandStyle: any = {
  fontSize: "42px",
  fontWeight: "900",
  margin: "0 0 12px 0",
  color: "#f97316",
  letterSpacing: "2px",
};

const companyStyle: any = {
  fontSize: "22px",
  fontWeight: "bold",
  margin: "0 0 8px 0",
};

const systemStyle: any = {
  fontSize: "16px",
  margin: 0,
  color: "#aaa",
};

const inputStyle: any = {
  width: "100%",
  padding: "15px",
  marginTop: "8px",
  marginBottom: "20px",
  borderRadius: "12px",
  border: "1px solid #333",
  background: "#000",
  color: "white",
  fontSize: "18px",
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
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "14px",
  fontSize: "20px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "10px",
};