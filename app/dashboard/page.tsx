"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  const [workerName, setWorkerName] = useState("");

  useEffect(() => {
    const name = localStorage.getItem("worker_name");

    if (!name) {
      router.push("/login");
      return;
    }

    setWorkerName(name);
  }, [router]);

  function logout() {
    localStorage.removeItem("worker_id");
    localStorage.removeItem("worker_name");
    localStorage.removeItem("worker_role");

    router.push("/login");
  }

  return (
    <main style={mainStyle}>
      <h1 style={titleStyle}>STONE BOUTIQUE</h1>

      <h2 style={subtitleStyle}>Dobrodošao {workerName}</h2>

      <div style={gridStyle}>
        <Link href="/baustellen" style={buttonStyle}>
          🏗️ Baustelle
        </Link>

        <Link href="/pregled-sati" style={buttonStyle}>
          ⏰ Pregled sati
        </Link>

        <div style={disabledStyle}>
          📅 Kalendar
          <br />
          <small>uskoro</small>
        </div>

        <div style={disabledStyle}>
          📢 Info od Admina
          <br />
          <small>uskoro</small>
        </div>

        <div style={disabledStyle}>
          📋 Napomene za radove i materijale
          <br />
          <small>uskoro</small>
        </div>

        <button
          onClick={logout}
          style={{
            ...buttonStyle,
            background: "#dc2626",
          }}
        >
          🚪 Odjava
        </button>
      </div>
    </main>
  );
}

const mainStyle: any = {
  background: "#000",
  minHeight: "100vh",
  color: "white",
  padding: "30px",
};

const titleStyle: any = {
  fontSize: "48px",
  marginBottom: "10px",
  color: "#f97316",
};

const subtitleStyle: any = {
  marginBottom: "40px",
  color: "#ccc",
};

const gridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
  gap: "20px",
};

const buttonStyle: any = {
  background: "#2563eb",
  color: "white",
  textDecoration: "none",
  padding: "35px",
  borderRadius: "18px",
  textAlign: "center",
  fontSize: "24px",
  fontWeight: "bold",
  border: "none",
  cursor: "pointer",
};

const disabledStyle: any = {
  background: "#111",
  color: "white",
  padding: "35px",
  borderRadius: "18px",
  textAlign: "center",
  fontSize: "24px",
  fontWeight: "bold",
  border: "1px solid #333",
};