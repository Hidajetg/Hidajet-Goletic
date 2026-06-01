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
      alert("Greška kod učitavanja info poruka: " + error.message);
      return;
    }

    setMessages(data || []);
  }

  function logout() {
    localStorage.clear();
    router.push("/login");
  }

  function formatDateTime(value: string) {
    return new Date(value).toLocaleString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

        <Link href="/info" style={infoButtonStyle}>
          📢 Info od Admina
          <br />
          <small>{messages.length} poruka</small>
        </Link>

        <div style={disabledStyle}>
          📋 Napomene za radove i materijale
          <br />
          <small>uskoro</small>
        </div>

        <button onClick={logout} style={logoutButtonStyle}>
          🚪 Odjava
        </button>
      </div>

      <section style={infoBoxStyle}>
        <h2 style={infoTitleStyle}>📢 Info od Admina</h2>

        {messages.length === 0 ? (
          <p style={{ color: "#aaa", fontSize: "20px" }}>
            Trenutno nema info poruka.
          </p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={messageStyle}>
              <div style={messageTopStyle}>
                <strong>{msg.sender_name || "Admin"}</strong>
                <span>{formatDateTime(msg.created_at)}</span>
              </div>

              <p style={messageTextStyle}>{msg.message}</p>
            </div>
          ))
        )}
      </section>
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
  ...buttonStyle,
  background: "#f97316",
};

const logoutButtonStyle: any = {
  ...buttonStyle,
  background: "#dc2626",
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

const infoBoxStyle: any = {
  marginTop: "35px",
  background: "#111",
  border: "1px solid #333",
  borderRadius: "18px",
  padding: "25px",
};

const infoTitleStyle: any = {
  color: "#f97316",
  fontSize: "30px",
  marginBottom: "20px",
};

const messageStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "14px",
  padding: "18px",
  marginBottom: "15px",
};

const messageTopStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: "15px",
  color: "#f97316",
  marginBottom: "10px",
};

const messageTextStyle: any = {
  fontSize: "20px",
  whiteSpace: "pre-wrap",
  margin: 0,
};