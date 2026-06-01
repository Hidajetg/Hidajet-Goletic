"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function InfoPage() {
  const router = useRouter();

  const [workerId, setWorkerId] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [workerRole, setWorkerRole] = useState("");

  const [workers, setWorkers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  const [message, setMessage] = useState("");
  const [visibleToAll, setVisibleToAll] = useState(true);
  const [targetWorkerId, setTargetWorkerId] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("worker_id");
    const name = localStorage.getItem("worker_name");
    const role = localStorage.getItem("worker_role");

    if (!id || !name) {
      router.push("/login");
      return;
    }

    setWorkerId(id);
    setWorkerName(name);
    setWorkerRole(role || "");

    loadWorkers();
    loadMessages(id);
  }, [router]);

  async function loadWorkers() {
    const { data, error } = await supabase
      .from("workers")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      alert("Greška kod učitavanja radnika: " + error.message);
      return;
    }

    setWorkers(data || []);
  }

  async function loadMessages(currentWorkerId: string) {
    const { data, error } = await supabase
      .from("info_messages")
      .select("*")
      .or(`visible_to_all.eq.true,target_worker_id.eq.${currentWorkerId}`)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Greška kod učitavanja poruka: " + error.message);
      return;
    }

    setMessages(data || []);
  }

  async function addMessage() {
    if (!message.trim()) {
      alert("Napiši poruku.");
      return;
    }

    if (!visibleToAll && !targetWorkerId) {
      alert("Odaberi radnika ili uključi opciju za sve.");
      return;
    }

    const { error } = await supabase.from("info_messages").insert({
      message: message.trim(),
      sender_id: Number(workerId),
      sender_name: workerName,
      visible_to_all: visibleToAll,
      target_worker_id: visibleToAll ? null : Number(targetWorkerId),
    });

    if (error) {
      alert("Greška kod dodavanja poruke: " + error.message);
      return;
    }

    setMessage("");
    setVisibleToAll(true);
    setTargetWorkerId("");
    loadMessages(workerId);
  }

  async function deleteMessage(id: number) {
    const ok = confirm("Da li želiš obrisati ovu poruku?");
    if (!ok) return;

    const { error } = await supabase
      .from("info_messages")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Greška kod brisanja poruke: " + error.message);
      return;
    }

    loadMessages(workerId);
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

  function workerLabel(worker: any) {
    return worker.name || worker.naziv || worker.ime || `Radnik ${worker.id}`;
  }

  return (
    <main style={mainStyle}>
      <Link href="/dashboard" style={backStyle}>
        ← Nazad na Dashboard
      </Link>

      <h1 style={titleStyle}>📢 Info</h1>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Nova poruka</h2>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Napiši poruku..."
          style={textareaStyle}
        />

        <label style={checkStyle}>
          <input
            type="checkbox"
            checked={visibleToAll}
            onChange={(e) => setVisibleToAll(e.target.checked)}
          />
          Poruka za sve radnike
        </label>

        {!visibleToAll && (
          <select
            value={targetWorkerId}
            onChange={(e) => setTargetWorkerId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Odaberi radnika</option>
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {workerLabel(worker)}
              </option>
            ))}
          </select>
        )}

        <button onClick={addMessage} style={addButtonStyle}>
          Dodaj poruku
        </button>
      </section>

      <section style={messagesStyle}>
        <h2 style={sectionTitleStyle}>Napisane poruke</h2>

        {messages.length === 0 ? (
          <p style={{ color: "#aaa" }}>Nema poruka.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={messageCardStyle}>
              <div style={messageHeaderStyle}>
                <strong>{msg.sender_name}</strong>
                <span>{formatDateTime(msg.created_at)}</span>
              </div>

              <p style={messageTextStyle}>{msg.message}</p>

              <div style={messageFooterStyle}>
                <span>
                  {msg.visible_to_all
                    ? "Vidljivo svima"
                    : "Vidljivo samo označenom radniku"}
                </span>

                <button
                  onClick={() => deleteMessage(msg.id)}
                  style={deleteButtonStyle}
                >
                  Obriši
                </button>
              </div>
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

const backStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
};

const titleStyle: any = {
  fontSize: "46px",
  color: "#f97316",
  marginTop: "30px",
};

const cardStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "18px",
  padding: "25px",
  marginTop: "25px",
  maxWidth: "800px",
};

const sectionTitleStyle: any = {
  fontSize: "26px",
  marginBottom: "15px",
};

const textareaStyle: any = {
  width: "100%",
  minHeight: "130px",
  padding: "15px",
  borderRadius: "12px",
  border: "1px solid #444",
  background: "#000",
  color: "white",
  fontSize: "18px",
  marginBottom: "15px",
};

const inputStyle: any = {
  width: "100%",
  padding: "15px",
  borderRadius: "12px",
  border: "1px solid #444",
  background: "#000",
  color: "white",
  fontSize: "18px",
  marginBottom: "15px",
};

const checkStyle: any = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
  fontSize: "18px",
  marginBottom: "15px",
};

const addButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  padding: "15px 25px",
  borderRadius: "12px",
  border: "none",
  fontSize: "18px",
  fontWeight: "bold",
  cursor: "pointer",
};

const messagesStyle: any = {
  marginTop: "35px",
  maxWidth: "900px",
};

const messageCardStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "20px",
  marginBottom: "15px",
};

const messageHeaderStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  color: "#f97316",
  marginBottom: "12px",
};

const messageTextStyle: any = {
  fontSize: "20px",
  lineHeight: "1.5",
  whiteSpace: "pre-wrap",
};

const messageFooterStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  color: "#aaa",
  marginTop: "15px",
};

const deleteButtonStyle: any = {
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "10px 15px",
  cursor: "pointer",
  fontWeight: "bold",
};