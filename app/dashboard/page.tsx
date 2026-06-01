"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function DashboardPage() {
  const router = useRouter();

  const [workerId, setWorkerId] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const id = localStorage.getItem("worker_id");
    const name = localStorage.getItem("worker_name");

    if (!id || !name) {
      router.push("/login");
      return;
    }

    setWorkerId(id);
    setWorkerName(name);
    loadMessages(id);
  }, [router]);

  async function loadMessages(currentWorkerId: string) {
    const { data, error } = await supabase
      .from("info_messages")
      .select("*")
      .or(`visible_to_all.eq.true,target_worker_id.eq.${currentWorkerId}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Greška kod učitavanja info poruka:", error.message);
      return;
    }

    setMessages(data || []);
  }

  function logout() {
    localStorage.removeItem("worker_id");
    localStorage.removeItem("worker_name");
    localStorage.removeItem("worker_role");
    router.push("/login");
  }

  function formatDateTime(value: string) {
    const date = new Date(value);
    return date.toLocaleString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const lastMessage = messages[0];

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

        <Link href="/info" style={infoButtonStyle}>
          <div style={infoTitleStyle}>📢 Info ({messages.length})</div>

          {lastMessage ? (
            <div style={lastMessageStyle}>
              <strong>{lastMessage.sender_name}</strong>
              <br />
              {lastMessage.message}
              <br />
              <small>{formatDateTime(lastMessage.created_at)}</small>
            </div>
          ) : (
            <small>Nema poruka</small>
          )}
        </Link>

        <div style={disabledStyle}>
          📋 Napomene za radove i materijale
          <br />
          <small>uskoro</small>
        </div>

        <button
          onClick={logout}
          style={{ ...buttonStyle, background: "#dc2626" }}
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

const infoButtonStyle: any = {
  background: "#111",
  color: "white",
  textDecoration: "none",
  padding: "25px",
  borderRadius: "18px",
  textAlign: "center",
  fontSize: "22px",
  fontWeight: "bold",
  border: "1px solid #333",
};

const infoTitleStyle: any = {
  fontSize: "24px",
  marginBottom: "12px",
};

const lastMessageStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "12px",
  padding: "12px",
  fontSize: "15px",
  lineHeight: "1.4",
  color: "#ddd",
  textAlign: "left",
  whiteSpace: "pre-wrap",
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