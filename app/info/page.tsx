"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import {
  type AppLanguage,
  readAppLanguage,
  localeForLanguage,
} from "../lib/language";

const translations: Record<AppLanguage, Record<string, string>> = {
  de: {
    back: "← Zurück zum Dashboard",
    title: "📢 Info",
    newMessage: "Neue Nachricht",
    placeholder: "Nachricht schreiben...",
    allWorkers: "Nachricht für alle Mitarbeiter",
    chooseWorker: "Mitarbeiter auswählen",
    add: "Nachricht hinzufügen",
    written: "Geschriebene Nachrichten",
    noMessages: "Keine Nachrichten.",
    visibleAll: "Für alle sichtbar",
    visibleOne: "Nur für den ausgewählten Mitarbeiter sichtbar",
    delete: "Löschen",
    loadWorkersError: "Fehler beim Laden der Mitarbeiter",
    loadMessagesError: "Fehler beim Laden der Nachrichten",
    writeMessage: "Bitte Nachricht schreiben.",
    chooseWorkerOrAll: "Mitarbeiter auswählen oder Option für alle aktivieren.",
    addError: "Fehler beim Hinzufügen der Nachricht",
    deleteConfirm: "Möchten Sie diese Nachricht wirklich löschen?",
    deleteError: "Fehler beim Löschen der Nachricht",
    workerFallback: "Mitarbeiter",
  },
  ba: {
    back: "← Nazad na Dashboard",
    title: "📢 Info",
    newMessage: "Nova poruka",
    placeholder: "Napiši poruku...",
    allWorkers: "Poruka za sve radnike",
    chooseWorker: "Odaberi radnika",
    add: "Dodaj poruku",
    written: "Napisane poruke",
    noMessages: "Nema poruka.",
    visibleAll: "Vidljivo svima",
    visibleOne: "Vidljivo samo označenom radniku",
    delete: "Obriši",
    loadWorkersError: "Greška kod učitavanja radnika",
    loadMessagesError: "Greška kod učitavanja poruka",
    writeMessage: "Napiši poruku.",
    chooseWorkerOrAll: "Odaberi radnika ili uključi opciju za sve.",
    addError: "Greška kod dodavanja poruke",
    deleteConfirm: "Da li želiš obrisati ovu poruku?",
    deleteError: "Greška kod brisanja poruke",
    workerFallback: "Radnik",
  },
  uz: {
    back: "← Dashboardga qaytish",
    title: "📢 Ma’lumot",
    newMessage: "Yangi xabar",
    placeholder: "Xabar yozing...",
    allWorkers: "Barcha ishchilar uchun xabar",
    chooseWorker: "Ishchini tanlang",
    add: "Xabar qo‘shish",
    written: "Yozilgan xabarlar",
    noMessages: "Xabarlar yo‘q.",
    visibleAll: "Hammaga ko‘rinadi",
    visibleOne: "Faqat tanlangan ishchiga ko‘rinadi",
    delete: "O‘chirish",
    loadWorkersError: "Ishchilarni yuklashda xato",
    loadMessagesError: "Xabarlarni yuklashda xato",
    writeMessage: "Xabar yozing.",
    chooseWorkerOrAll: "Ishchini tanlang yoki hamma uchun variantni yoqing.",
    addError: "Xabar qo‘shishda xato",
    deleteConfirm: "Bu xabarni o‘chirmoqchimisiz?",
    deleteError: "Xabarni o‘chirishda xato",
    workerFallback: "Ishchi",
  },
  cz: {
    back: "← Zpět na Dashboard",
    title: "📢 Info",
    newMessage: "Nová zpráva",
    placeholder: "Napište zprávu...",
    allWorkers: "Zpráva pro všechny pracovníky",
    chooseWorker: "Vyberte pracovníka",
    add: "Přidat zprávu",
    written: "Napsané zprávy",
    noMessages: "Žádné zprávy.",
    visibleAll: "Viditelné pro všechny",
    visibleOne: "Viditelné pouze pro vybraného pracovníka",
    delete: "Smazat",
    loadWorkersError: "Chyba při načítání pracovníků",
    loadMessagesError: "Chyba při načítání zpráv",
    writeMessage: "Napište zprávu.",
    chooseWorkerOrAll: "Vyberte pracovníka nebo zapněte možnost pro všechny.",
    addError: "Chyba při přidávání zprávy",
    deleteConfirm: "Opravdu chcete tuto zprávu smazat?",
    deleteError: "Chyba při mazání zprávy",
    workerFallback: "Pracovník",
  },
  en: {
    back: "← Back to Dashboard",
    title: "📢 Info",
    newMessage: "New message",
    placeholder: "Write a message...",
    allWorkers: "Message for all workers",
    chooseWorker: "Select worker",
    add: "Add message",
    written: "Written messages",
    noMessages: "No messages.",
    visibleAll: "Visible to everyone",
    visibleOne: "Visible only to the selected worker",
    delete: "Delete",
    loadWorkersError: "Error loading workers",
    loadMessagesError: "Error loading messages",
    writeMessage: "Write a message.",
    chooseWorkerOrAll: "Select a worker or enable the option for everyone.",
    addError: "Error adding message",
    deleteConfirm: "Do you really want to delete this message?",
    deleteError: "Error deleting message",
    workerFallback: "Worker",
  },
};

export default function InfoPage() {
  const router = useRouter();

  const [lang, setLang] = useState<AppLanguage>("de");
  const [workerId, setWorkerId] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [workerRole, setWorkerRole] = useState("");

  const [workers, setWorkers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  const [message, setMessage] = useState("");
  const [visibleToAll, setVisibleToAll] = useState(true);
  const [targetWorkerId, setTargetWorkerId] = useState("");

  const t = translations[lang];

  useEffect(() => {
    setLang(readAppLanguage("de"));

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

  function playNotificationSound() {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 1;
    audio.play().catch(() => {});
  }

  async function loadWorkers() {
    const { data, error } = await supabase
      .from("workers")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      alert(t.loadWorkersError + ": " + error.message);
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
      alert(t.loadMessagesError + ": " + error.message);
      return;
    }

    setMessages(data || []);
  }

  async function addMessage() {
    if (!message.trim()) {
      alert(t.writeMessage);
      return;
    }

    if (!visibleToAll && !targetWorkerId) {
      alert(t.chooseWorkerOrAll);
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
      alert(t.addError + ": " + error.message);
      return;
    }

    playNotificationSound();

    setMessage("");
    setVisibleToAll(true);
    setTargetWorkerId("");
    loadMessages(workerId);
  }

  async function deleteMessage(id: number) {
    const ok = confirm(t.deleteConfirm);
    if (!ok) return;

    const { error } = await supabase
      .from("info_messages")
      .delete()
      .eq("id", id);

    if (error) {
      alert(t.deleteError + ": " + error.message);
      return;
    }

    loadMessages(workerId);
  }

  function formatDateTime(value: string) {
    const date = new Date(value);
    return date.toLocaleString(localeForLanguage(lang), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function workerLabel(worker: any) {
    return worker.name || worker.naziv || worker.ime || `${t.workerFallback} ${worker.id}`;
  }

  return (
    <main style={mainStyle}>
      <Link href="/dashboard" style={backStyle}>
        {t.back}
      </Link>

      <h1 style={titleStyle}>{t.title}</h1>

      <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>{t.newMessage}</h2>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.placeholder}
            style={textareaStyle}
          />

          <label style={checkStyle}>
            <input
              type="checkbox"
              checked={visibleToAll}
              onChange={(e) => setVisibleToAll(e.target.checked)}
            />
            {t.allWorkers}
          </label>

          {!visibleToAll && (
            <select
              value={targetWorkerId}
              onChange={(e) => setTargetWorkerId(e.target.value)}
              style={inputStyle}
            >
              <option value="">{t.chooseWorker}</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {workerLabel(worker)}
                </option>
              ))}
            </select>
          )}

          <button onClick={addMessage} style={addButtonStyle}>
            {t.add}
          </button>
      </section>

      <section style={messagesStyle}>
        <h2 style={sectionTitleStyle}>{t.written}</h2>

        {messages.length === 0 ? (
          <p style={{ color: "#aaa" }}>{t.noMessages}</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={messageCardStyle}>
              <div style={messageHeaderStyle}>
                <strong>{msg.sender_name}</strong>
                <span>{formatDateTime(msg.created_at)}</span>
              </div>

              <p style={messageTextStyle}>{msg.message}</p>

              <div style={messageFooterStyle}>
                <span>{msg.visible_to_all ? t.visibleAll : t.visibleOne}</span>

                <button
                  onClick={() => deleteMessage(msg.id)}
                  style={deleteButtonStyle}
                >
                  {t.delete}
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
