"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { type AppLanguage, readAppLanguage } from "../lib/language";
import "./worker-ai-chat.css";

type Message = { id: string; role: "user" | "assistant"; text: string; at?: string };
type Mode = "floating" | "page";
type SpeechResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechRecognizer = {
  lang: string; onresult: ((event: SpeechResult) => void) | null;
  onerror: (() => void) | null; start(): void;
};
type Words = {
  title: string; subtitle: string; placeholder: string; empty: string;
  photo: string; auto: string; send: string; sending: string; listen: string;
  info: string; infoBody: string; close: string; reopen: string; reload: string;
  microphoneError: string; imageError: string; readError: string; networkError: string;
  photoPrompt: string; photoReady: string; historyError: string;
};
const words: Record<AppLanguage, Words> = {
  de: { title: "Baustelle AI", subtitle: "Dein Baustellenassistent",
    placeholder: "Stelle deine Frage …", empty: "Frage mich nach deinem Einsatz, den Kollegen oder den Materialien für deine Baustelle.",
    photo: "Foto", auto: "Auto", send: "Senden", sending: "…", listen: "Anhören",
    info: "Info", infoBody: "Ich sehe nur deine freigegebenen Baustellen, deinen Plan und Kollegen am selben Einsatzort und Tag. Fehlende Angaben muss der Administrator ergänzen.",
    close: "Schließen", reopen: "Baustelle AI öffnen", reload: "Gespräch neu laden",
    microphoneError: "Spracheingabe ist auf diesem Gerät nicht verfügbar.", imageError: "Bitte JPG, PNG oder WEBP bis 3 MB verwenden.",
    readError: "Vorlesen wird von diesem Browser nicht unterstützt.", networkError: "Der Server ist nicht erreichbar. Bitte Verbindung prüfen.",
    photoPrompt: "Bitte analysiere dieses Baustellenfoto.", photoReady: "Foto ausgewählt",
    historyError: "Die bisherigen Nachrichten konnten nicht geladen werden." },
  ba: { title: "Baustelle AI", subtitle: "Tvoj pomoćnik za gradilište",
    placeholder: "Postavi pitanje …", empty: "Pitaj gdje radiš, s kim radiš ili koji materijal treba za tvoje gradilište.",
    photo: "Foto", auto: "Auto", send: "Pošalji", sending: "…", listen: "Poslušaj",
    info: "Info", infoBody: "Vidim samo tvoj dozvoljeni raspored, gradilišta i kolege na istom gradilištu istog dana. Podatke koji nedostaju mora unijeti administrator.",
    close: "Zatvori", reopen: "Otvori Baustelle AI", reload: "Učitaj razgovor",
    microphoneError: "Glasovni unos nije dostupan na ovom uređaju.", imageError: "Odaberi JPG, PNG ili WEBP do 3 MB.",
    readError: "Ovaj preglednik ne podržava čitanje naglas.", networkError: "Server nije dostupan. Provjeri internet i prijavu.",
    photoPrompt: "Molim te analiziraj ovu sliku s gradilišta.", photoReady: "Slika je odabrana",
    historyError: "Nije moguće učitati prethodne poruke." },
  uz: { title: "Baustelle AI", subtitle: "Qurilishdagi yordamchingiz",
    placeholder: "Savolingizni yozing …", empty: "Bugungi ish joyingiz, jamoadoshlaringiz yoki kerakli materiallarni so‘rang.",
    photo: "Foto", auto: "Auto", send: "Yuborish", sending: "…", listen: "Tinglash",
    info: "Ma’lumot", infoBody: "Faqat ruxsat berilgan reja va o‘sha kuni birga ishlaydigan hamkasblar ko‘rinadi.",
    close: "Yopish", reopen: "Baustelle AI ni ochish", reload: "Suhbatni yangilash",
    microphoneError: "Ovoz kiritish mavjud emas.", imageError: "3 MB gacha JPG, PNG yoki WEBP tanlang.",
    readError: "Ovozli o‘qish mavjud emas.", networkError: "Server bilan aloqa yo‘q.",
    photoPrompt: "Iltimos, ushbu qurilish suratini tahlil qiling.", photoReady: "Surat tanlandi",
    historyError: "Suhbat tarixi yuklanmadi." },
  cz: { title: "Baustelle AI", subtitle: "Váš stavební asistent",
    placeholder: "Zeptejte se …", empty: "Zeptejte se na dnešní stavbu, kolegy nebo potřebný materiál.",
    photo: "Foto", auto: "Auto", send: "Odeslat", sending: "…", listen: "Přehrát",
    info: "Info", infoBody: "Vidím jen váš povolený plán, stavby a kolegy na stejném místě ve stejný den.",
    close: "Zavřít", reopen: "Otevřít Baustelle AI", reload: "Načíst historii",
    microphoneError: "Hlasový vstup není dostupný.", imageError: "Zvolte JPG, PNG nebo WEBP do 3 MB.",
    readError: "Přehrávání hlasu není podporováno.", networkError: "Server není dostupný.",
    photoPrompt: "Prosím analyzujte tuto fotografii stavby.", photoReady: "Fotografie vybrána",
    historyError: "Historii se nepodařilo načíst." },
  en: { title: "Baustelle AI", subtitle: "Your construction assistant",
    placeholder: "Ask your question …", empty: "Ask about your schedule, colleagues on the same site or materials for today.",
    photo: "Photo", auto: "Auto", send: "Send", sending: "…", listen: "Listen",
    info: "Info", infoBody: "I can only access your assigned sites, your schedule and colleagues on the same site and date.",
    close: "Close", reopen: "Open Baustelle AI", reload: "Reload conversation",
    microphoneError: "Voice input is unavailable on this device.", imageError: "Choose a JPG, PNG or WEBP image up to 3 MB.",
    readError: "Speech playback is unavailable.", networkError: "The server cannot be reached.",
    photoPrompt: "Please analyze this construction site photo.", photoReady: "Photo selected",
    historyError: "Earlier messages could not be loaded." },
};
const speechLanguage: Record<AppLanguage, string> = {
  de: "de-DE", ba: "bs-BA", uz: "uz-UZ", cz: "cs-CZ", en: "en-US",
};

export default function WorkerAiChat({ mode = "page", verifiedName }: { mode?: Mode; verifiedName?: string }) {
  const [open, setOpen] = useState(mode === "page");
  const [lang, setLang] = useState<AppLanguage>("de");
  const [name, setName] = useState(verifiedName || "");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [notice, setNotice] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const loadedHistory = useRef(false);
  const t = words[lang];

  useEffect(() => {
    setLang(readAppLanguage("de"));
    const onLanguageChange = () => setLang(readAppLanguage("de"));
    window.addEventListener("solstone-language-change", onLanguageChange);
    // Reuse the application login; never require a separate AI/ChatGPT login.
    if (!verifiedName) void fetch("/api/auth/login", { credentials: "same-origin", cache: "no-store" })
      .then(async r => r.ok ? r.json() : null)
      .then(data => setName(String(data?.user?.name || "")))
      .catch(() => {});
    return () => window.removeEventListener("solstone-language-change", onLanguageChange);
  }, [verifiedName]);

  const reloadHistory = useCallback(async (visibleNotice = false) => {
    setLoadingHistory(true);
    try {
      const response = await fetch("/api/assistant/history", {
        credentials: "same-origin", cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(String(body?.error || "History unavailable"));
      const rows = Array.isArray(body?.messages) ? body.messages : [];
      setMessages(rows.filter((m: Message) => m.role === "user" || m.role === "assistant")
        .map((m: Message, i: number) => ({
          id: String(m.id || "stored-" + i),
          role: m.role, text: String(m.text || ""), at: m.at,
        })));
      loadedHistory.current = true;
      if (visibleNotice) setNotice("");
    } catch {
      if (visibleNotice) setNotice(words[readAppLanguage("de")].historyError);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (open && !loadedHistory.current) void reloadHistory(false);
  }, [open, reloadHistory]);
  useEffect(() => {
    if (!open) return;
    const node = messagesRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, open]);

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) { setNotice(t.readError); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLanguage[lang];
    utterance.rate = 0.94;
    window.speechSynthesis.speak(utterance);
  };

  const dictate = () => {
    const browser = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognizer;
      webkitSpeechRecognition?: new () => SpeechRecognizer;
    };
    const Recognition = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Recognition) { setNotice(t.microphoneError); return; }
    try {
      const recognition = new Recognition();
      recognition.lang = speechLanguage[lang];
      recognition.onresult = e => {
        const recognized = Array.from(e.results).map(x => x[0]?.transcript || "").join(" ");
        setInput(old => (old ? old + " " : "") + recognized);
      };
      recognition.onerror = () => setNotice(t.microphoneError);
      recognition.start();
    } catch { setNotice(t.microphoneError); }
  };

  const selectPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 3_000_000) {
      setNotice(t.imageError);
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setPhoto(reader.result);
      setPhotoName(file.name);
      setNotice("");
    };
    reader.onerror = () => setNotice(t.imageError);
    reader.readAsDataURL(file);
  };

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || (!input.trim() && !photo)) return;
    const question = input.trim() || t.photoPrompt;
    const attachedImage = photo;
    const id = "local-" + (++nextId.current);
    setMessages(old => [...old, { id, role: "user", text: question }]);
    setInput(""); setPhoto(null); setPhotoName(""); setBusy(true); setNotice("");
    if (fileRef.current) fileRef.current.value = "";
    try {
      const response = await fetch("/api/solstone-ai", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, image: attachedImage }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(String(data?.error || t.networkError));
      const answer = String(data?.answer || "").trim();
      if (!answer) throw Error(t.networkError);
      setMessages(old => [...old, { id: id + "-ai", role: "assistant", text: answer }]);
      if (autoSpeak) speak(answer);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t.networkError);
    } finally {
      setBusy(false);
    }
  };

  const chat = (
    <section className="wai-panel" aria-label={t.title}>
      <header className="wai-header">
        <div><strong>{t.title}</strong><small>👤 {name || t.subtitle}</small></div>
        <div className="wai-top-buttons">
          <button type="button" title={t.reload} aria-label={t.reload}
            onClick={() => void reloadHistory(true)} disabled={busy || loadingHistory}>↻</button>
          <button type="button" title={t.info} aria-label={t.info}
            onClick={() => setShowInfo(v => !v)}>ⓘ</button>
          {mode === "floating" && <button type="button" title={t.close} aria-label={t.close}
            onClick={() => setOpen(false)}>×</button>}
        </div>
      </header>
      <div className="wai-messages" ref={messagesRef} aria-live="polite" aria-relevant="additions">
        {showInfo && <p className="wai-info">{t.infoBody}</p>}
        {loadingHistory && !messages.length && <p className="wai-empty">…</p>}
        {!loadingHistory && !messages.length && <p className="wai-empty">{t.empty}</p>}
        {messages.map(m => <article key={m.id}
          className={"wai-bubble " + (m.role === "user" ? "wai-user" : "wai-assistant")}>
          <strong>{m.role === "user" ? "👤 " + (name || "Worker") : "✦ KI"}</strong>
          <p>{m.text}</p>
          {m.role === "assistant" && <button type="button" className="wai-small-btn"
            onClick={() => speak(m.text)}>🔊 {t.listen}</button>}
        </article>)}
      </div>
      {notice && <p className="wai-notice" role="alert">{notice}</p>}
      <form onSubmit={e => void send(e)} className="wai-form">
        {photoName && <p className="wai-photo">{t.photoReady}: {photoName}
          <button type="button" aria-label={t.close} onClick={() => {
            setPhoto(null); setPhotoName("");
            if (fileRef.current) fileRef.current.value = "";
          }}>×</button>
        </p>}
        <textarea rows={2} maxLength={1500} value={input}
          aria-label={t.placeholder} placeholder={t.placeholder}
          onChange={e => setInput(e.target.value)} />
        <div className="wai-tools">
          <div className="wai-tool-group">
            <input type="file" ref={fileRef} hidden
              accept="image/jpeg,image/png,image/webp" onChange={selectPhoto}/>
            <button className="wai-small-btn" type="button" onClick={() => fileRef.current?.click()}>
              📷 {t.photo}
            </button>
            <button className="wai-small-btn" type="button" onClick={dictate}
              aria-label={lang === "de" ? "Spracheingabe" : "Glasovni unos"}>🎤</button>
          </div>
          <label className="wai-auto"><input type="checkbox" checked={autoSpeak}
            onChange={e => setAutoSpeak(e.target.checked)} /> 🔊 {t.auto}</label>
          <button className="wai-send" type="submit" disabled={busy || (!input.trim() && !photo)}>
            {busy ? t.sending : t.send}
          </button>
        </div>
      </form>
    </section>
  );

  if (mode === "page") return <div className="wai-page">{chat}</div>;
  return <div className="wai-floating">
    {open && chat}
    <button className="wai-launcher" type="button" aria-label={open ? t.close : t.reopen}
      onClick={() => setOpen(v => !v)}>
      {open ? "✦ " + t.close : "✦ AI"}
    </button>
  </div>;
}
