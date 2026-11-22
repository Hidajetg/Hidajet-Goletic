"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type AiMessage = { id: string; role: "user" | "assistant"; text: string; at?: string };
type HistoricMessage = { id: number; role: string; content: string; created_at: string };
type AiConversation = { id: string; worker_name: string; last_message_at: string };
type SpeechResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechRecognizer = {
  lang: string; onresult: ((ev: SpeechResult) => void) | null;
  onerror: (() => void) | null; start(): void;
};

const panel: React.CSSProperties = {
  position: "fixed", right: 20, bottom: 72, zIndex: 500,
  width: 377, maxWidth: "calc(100vw - 20px)", height: "min(570px, calc(100dvh - 100px))",
  background: "#111b2b", border: "1px solid #405067", borderRadius: 18, color: "#edf4ff",
  boxShadow: "0 16px 45px #000b", display: "flex", flexDirection: "column", overflow: "hidden",
  fontFamily: "system-ui, sans-serif", fontSize: 13,
};
const tinyButton: React.CSSProperties = {
  border: "1px solid #40526c", borderRadius: 9, background: "#233147", color: "white",
  minHeight: 34, padding: "6px 9px", cursor: "pointer", fontSize: 12,
};

export default function AdminAiFloating() {
  const [opened, setOpened] = useState(false);
  const [user, setUser] = useState("");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [notice, setNotice] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [info, setInfo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    void fetch("/api/auth/login", { credentials: "same-origin", cache: "no-store" })
      .then(res => res.json()).then(data => {
        if (mounted && data?.user?.role === "admin") {
          const name = String(data.user.name || "");
          setUser(name);
          return fetch("/api/admin/ai-questions", { credentials: "same-origin", cache: "no-store" })
            .then(r => r.json()).then(history => {
              const mine = (history.conversations as AiConversation[] | undefined || []).find(c => c.worker_name.toLowerCase() === name.toLowerCase());
              if (!mine || !mounted) return;
              return fetch("/api/admin/ai-questions?conversation=" + encodeURIComponent(mine.id), { credentials: "same-origin", cache: "no-store" })
                .then(r => r.json()).then(thread => {
                  if (!mounted || !Array.isArray(thread.messages)) return;
                  setMessages((thread.messages as HistoricMessage[]).slice(-22).map(m => ({
                    id: "stored-" + m.id,
                    role: m.role === "user" ? "user" : "assistant",
                    text: m.content,
                    at: m.created_at,
                  })));
                });
            });
        }
      }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, opened]);

  const speak = (message: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setNotice("Vorlesen ist in diesem Browser nicht verfügbar."); return;
    }
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(message);
    speech.rate = 0.95;
    window.speechSynthesis.speak(speech);
  };

  const choosePhoto = (file?: File) => {
    if (!file) return;
    setNotice("");
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 4_000_000) {
      setNotice("Bitte JPG, PNG oder WEBP bis 4 MB wählen."); return;
    }
    const reader = new FileReader();
    reader.onload = () => { setPhoto(String(reader.result)); setPhotoName(file.name); };
    reader.onerror = () => setNotice("Foto konnte nicht geladen werden.");
    reader.readAsDataURL(file);
  };
  const dictate = () => {
    const browser = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognizer;
      webkitSpeechRecognition?: new () => SpeechRecognizer;
    };
    const Recognition = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Recognition) { setNotice("Spracheingabe ist auf diesem Gerät nicht verfügbar."); return; }
    try {
      const recognition = new Recognition();
      recognition.lang = (localStorage.getItem("lang") || "de") === "ba" ? "bs-BA" : "de-DE";
      recognition.onresult = ev => {
        const spoken = Array.from(ev.results).map(result => result[0]?.transcript || "").join(" ");
        setText(old => (old ? old + " " : "") + spoken);
      };
      recognition.onerror = () => setNotice("Spracheingabe fehlgeschlagen.");
      recognition.start();
    } catch { setNotice("Mikrofon konnte nicht gestartet werden."); }
  };
  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || (!text.trim() && !photo)) return;
    const body = text.trim() || "Bitte analysiere dieses Foto aus der Baustelle.";
    const currentPhoto = photo;
    const id = String(++countRef.current);
    setMessages(old => [...old, { id: "new-" + id, role: "user", text: body }]);
    setText(""); setPhoto(null); setPhotoName(""); setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/solstone-ai", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: body, image: currentPhoto }),
      });
      const answer = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(String(answer.error || "AI ist derzeit nicht verfügbar."));
      const reply = String(answer.answer || "");
      setMessages(old => [...old, { id: "reply-" + id, role: "assistant", text: reply }]);
      if (autoSpeak && reply) speak(reply);
    } catch (ex) {
      setNotice(ex instanceof Error ? ex.message : "AI ist momentan nicht erreichbar.");
    } finally { setBusy(false); }
  };

  if (!opened) return (
    <button type="button" onClick={() => setOpened(true)} aria-label="Baustelle AI öffnen"
      style={{ position: "fixed", right: 20, bottom: 20, zIndex: 500, padding: "11px 16px",
        borderRadius: 20, background: "#f97316", border: "1px solid #fb923c", color: "white",
        boxShadow: "0 5px 20px #0008", cursor: "pointer", fontWeight: 750 }}>✦ Baustelle AI</button>
  );

  return <>
    <section style={panel} aria-label="Baustelle AI">
      <header style={{ background: "#1d293a", borderBottom: "1px solid #35455b", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div><strong style={{ display: "block", color: "white", fontSize: 14 }}>Baustelle AI</strong>
          <small style={{ color: "#a9b9ce" }}>👤 {user || "Admin"}</small></div>
        <div style={{ display: "flex", gap: 5 }}>
          <button type="button" title="Gespräch zurücksetzen" onClick={() => { setMessages([]); setNotice(""); }} style={tinyButton}>↻</button>
          <button type="button" title="Info" onClick={() => setInfo(v => !v)} style={tinyButton}>ⓘ</button>
          <button type="button" title="Schließen" onClick={() => setOpened(false)} style={tinyButton}>×</button>
        </div>
      </header>
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {info && <p style={{ background: "#26364b", borderRadius: 10, padding: 11, margin: 0 }}>
          Baustelle AI antwortet über den sicheren Server. Die Foto- und Sprachfunktion hängt von Berechtigungen und der AI-Serverkonfiguration ab.
        </p>}
        {!messages.length && <p style={{ color: "#aebdd1", textAlign: "center", margin: "auto 0" }}>Stelle deine Frage zur Baustelle oder zum Kalender.</p>}
        {messages.map(m => <div key={m.id} style={{
          background: m.role === "user" ? "#a84919" : "#324259", color: "#fff",
          borderRadius: 11, maxWidth: m.role === "user" ? "88%" : "94%",
          alignSelf: m.role === "user" ? "flex-end" : "flex-start",
          padding: 12, whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.45,
        }}>
          <strong style={{ fontSize: 12 }}>{m.role === "user" ? "👤 " + (user || "Admin") : "✦ KI"}</strong>
          <div style={{ marginTop: 6 }}>{m.text}</div>
          {m.role === "assistant" && <button type="button" onClick={() => speak(m.text)} style={{ ...tinyButton, marginTop: 9 }}>🔊 Anhören</button>}
        </div>)}
      </div>
      {notice && <p role="alert" style={{ color: "#ffcca9", margin: "0 10px 6px", fontSize: 12 }}>{notice}</p>}
      <form onSubmit={e => void send(e)} style={{ borderTop: "1px solid #3c4b61", padding: "8px 9px 10px", background: "#182638" }}>
        {photoName && <p style={{ margin: "0 0 6px", color: "#b7d7fa", fontSize: 12 }}>📷 {photoName}
          <button type="button" onClick={() => { setPhoto(null); setPhotoName(""); }} style={{ ...tinyButton, marginLeft: 8 }}>×</button></p>}
        <textarea placeholder="Stelle deine Frage ..." value={text} onChange={e => setText(e.target.value)}
          maxLength={1500} aria-label="Frage an Baustelle AI" rows={2} style={{
            width: "100%", boxSizing: "border-box", resize: "vertical", maxHeight: 120,
            padding: 10, borderRadius: 10, background: "#090f1c", color: "white",
            font: "13px system-ui", border: "1px solid #9cacbb",
          }} />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 4, alignItems: "center", marginTop: 5 }}>
          <div style={{ display: "flex", gap: 4 }}>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => choosePhoto(e.target.files?.[0])} />
            <button type="button" onClick={() => inputRef.current?.click()} style={tinyButton}>📷 Foto</button>
            <button type="button" onClick={dictate} aria-label="Sprachfrage diktieren" style={tinyButton}>🎤</button>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 3, color: "#cbd5e1", fontSize: 11 }}>
            <input type="checkbox" checked={autoSpeak} onChange={e => setAutoSpeak(e.target.checked)} /> 🔊 Auto
          </label>
          <button type="submit" disabled={busy || (!text.trim() && !photo)} style={{
            border: 0, borderRadius: 9, background: "#b65e24", color: "white",
            padding: "11px 13px", fontWeight: 750, cursor: "pointer",
            opacity: busy || (!text.trim() && !photo) ? .6 : 1,
          }}>{busy ? "…" : "Senden"}</button>
        </div>
      </form>
    </section>
    <button type="button" onClick={() => setOpened(false)} style={{
      position: "fixed", right: 20, bottom: 20, zIndex: 501, border: 0,
      borderRadius: 20, background: "#f97316", color: "white",
      padding: "11px 15px", fontWeight: 750, cursor: "pointer",
    }}>✦ Schließen</button>
  </>;
}
