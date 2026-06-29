"use client";

import { useState } from "react";

const LOGO_URL =
  "https://axpfymarrqjebpwosidr.supabase.co/storage/v1/object/public/pdf-assets/logo.png";

const BACKGROUND_URL =
  "https://axpfymarrqjebpwosidr.supabase.co/storage/v1/object/public/pdf-assets/pozadina.png";

const users = [
  { id: 1, name: "Arnes", pin: "1111", role: "worker" },
  { id: 2, name: "Ramiz", pin: "2222", role: "worker" },
  { id: 3, name: "Abror", pin: "3333", role: "worker" },
  { id: 4, name: "Shohruh", pin: "4444", role: "worker" },
  { id: 5, name: "Harun", pin: "5555", role: "worker" },
  { id: 100, name: "Hido", pin: "0000", role: "admin" },
  { id: 101, name: "Steffi", pin: "0001", role: "admin" },
];

export default function LoginSecurePage() {
  const [name, setName] = useState("Hido");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  function login() {
    const foundUser = users.find(
      (user) =>
        user.name.toLowerCase() === name.trim().toLowerCase() &&
        user.pin === pin
    );

    if (!foundUser) {
      alert("Pogrešno ime ili PIN.");
      return;
    }

    localStorage.clear();
    sessionStorage.clear();

    localStorage.setItem("worker_id", String(foundUser.id));
    localStorage.setItem("worker_name", foundUser.name);
    localStorage.setItem("worker_role", foundUser.role);

    localStorage.setItem("userName", foundUser.name);
    localStorage.setItem("user_name", foundUser.name);
    localStorage.setItem("name", foundUser.name);

    localStorage.setItem("role", foundUser.role);
    localStorage.setItem("userRole", foundUser.role);

    localStorage.setItem("loggedIn", "true");
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("authenticated", "true");

    window.location.href = "/dashboard";
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

          <label style={labelStyle}>Ime radnika / Admin</label>

          <select
            value={name}
            onChange={(event) => setName(event.target.value)}
            style={inputStyle}
          >
            {users.map((user) => (
              <option key={user.id} value={user.name}>
                {user.name}
              </option>
            ))}
          </select>

          <label style={labelStyle}>PIN</label>

          <div style={passwordBoxStyle}>
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              type={showPin ? "text" : "password"}
              style={{
                ...inputStyle,
                marginBottom: 0,
                paddingRight: "55px",
              }}
              placeholder="Unesi PIN"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  login();
                }
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

          <button type="button" onClick={login} style={buttonStyle}>
            ANMELDEN
          </button>

          <div style={hintBoxStyle}>
            <p style={hintTextStyle}>Radnici: Arnes 1111, Ramiz 2222, Abror 3333</p>
            <p style={hintTextStyle}>Shohruh 4444, Harun 5555</p>
            <p style={hintTextStyle}>Admin: Hido 0000 / Steffi 0001</p>
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
  cursor: "pointer",
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