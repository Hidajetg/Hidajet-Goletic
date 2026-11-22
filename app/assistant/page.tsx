"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

type Message = { role: "user" | "assistant"; body: string };
type Language = "de" | "ba" | "uz" | "cz" | "en";
const translations: Record<Language, { title: string; intro: string; hint: string; placeholder: string; send: string; back: string; chatgpt: string }> = {
  de: {title:"Solstone AI",intro:"Dein Baustellenassistent",hint:"Der Assistent kann deinen freigegebenen Arbeitsplan lesen, sobald die sichere Verbindung aktiviert ist.",placeholder:"Was mache ich heute?",send:"Senden",back:"Zum Dashboard",chatgpt:"Mein ChatGPT öffnen"},
  ba: {title:"Solstone AI",intro:"Tvoj pomoćnik za gradilišta",hint:"AI može čitati tvoj dozvoljeni raspored kada administrator uključi sigurnu vezu.",placeholder:"Gdje danas radim?",send:"Pošalji",back:"Nazad na početnu",chatgpt:"Otvori moj ChatGPT"},
  uz: {title:"Solstone AI",intro:"Qurilishdagi yordamchingiz",hint:"Xavfsiz ulanish yoqilgach, AI ruxsat berilgan ish jadvalingizni o‘qiydi.",placeholder:"Bugun qayerda ishlayman?",send:"Yuborish",back:"Bosh sahifa",chatgpt:"Mening ChatGPT'im"},
  cz: {title:"Solstone AI",intro:"Asistent na stavbě",hint:"Po bezpečném zapnutí může AI číst váš povolený pracovní rozvrh.",placeholder:"Kde dnes pracuji?",send:"Odeslat",back:"Zpět",chatgpt:"Otevřít můj ChatGPT"},
  en: {title:"Solstone AI",intro:"Your construction-site assistant",hint:"AI can read your authorized schedule once secure integration is enabled.",placeholder:"Where do I work today?",send:"Send",back:"Back to dashboard",chatgpt:"Open my ChatGPT"},
};

export default function SolstoneAssistantPage() {
  const [language, setLanguage] = useState<Language>("ba");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const [warning, setWarning] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const saved = (localStorage.getItem("appLanguage") || localStorage.getItem("lang") || "ba").toLowerCase();
    if (saved in translations) setLanguage(saved as Language);
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [messages]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || pending) return;
    setPending(true); setWarning(""); setInput("");
    setMessages(old => [...old, { role: "user", body: message }]);
    try {
      const response = await fetch("/api/solstone-ai", {
        method: "POST", credentials: "include", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setWarning(String(data?.error || "AI unavailable")); return; }
      setMessages(old => [...old, { role: "assistant", body: String(data.answer || "") }]);
    } catch {
      setWarning("Server nije dostupan. Provjeri internet i prijavu.");
    } finally {
      setPending(false);
    }
  }

  const t = translations[language];
  return (
    <main style={{ minHeight: "100dvh", background: "#151f2b", color: "#eff6ff", padding: "22px 14px 85px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 17 }}>
          <Link href="/dashboard" style={{ color: "#fdba74", textDecoration: "none" }}>← {t.back}</Link>
          <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" style={{ color: "#bfdbfe", textDecoration: "underline", fontSize: 12 }}>{t.chatgpt}</a>
        </nav>
        <h1 style={{ fontSize: 25, fontWeight: 800, color: "#fff", margin: "0 0 5px" }}>🚶 {t.title}</h1>
        <p style={{ color: "#cbd5e1", marginBottom: 5 }}>{t.intro}</p>
        <p style={{ color: "#94a3b8", fontSize: 12, marginBottom: 18 }}>{t.hint}</p>
        <section aria-label="AI razgovor" style={{ borderRadius: 13, border: "1px solid #394c62", padding: 13, background: "#111a25", minHeight: 250, maxHeight: "56dvh", overflowY: "auto" }}>
          {messages.length === 0 && <p style={{ color: "#a3b7ca", fontSize: 13 }}>{t.placeholder}</p>}
          {messages.map((m, i) => (
            <div key={i} style={{ maxWidth: "90%", margin: m.role === "user" ? "9px 0 9px auto" : "9px auto 9px 0", background: m.role === "user" ? "#23533e" : "#26364a", padding: "12px", borderRadius: 12, whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 14 }}>
              {m.body}
            </div>
          ))}
          <div ref={endRef} />
        </section>
        {warning && <p role="alert" style={{ background: "#522b1f", borderRadius: 9, padding: 11, marginTop: 10, color: "#fff", fontSize: 13 }}>{warning}</p>}
        <form onSubmit={submit} style={{ display: "flex", gap: 9, marginTop: 12 }}>
          <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder={t.placeholder}
            maxLength={1500} disabled={pending} aria-label="Pitanje za Solstone AI"
            style={{ flex: 1, minWidth: 0, padding: "12px 11px", color: "#fff", background: "#101722", border: "1px solid #536780", borderRadius: 9, fontSize: 14 }} />
          <button type="submit" disabled={pending || !input.trim()}
            style={{ padding: "10px 15px", background: "#f97316", color: "#111", border: 0, borderRadius: 9, fontWeight: 750, opacity: pending || !input.trim() ? 0.5 : 1 }}>{pending ? "…" : t.send}</button>
        </form>
      </div>
    </main>
  );
}
