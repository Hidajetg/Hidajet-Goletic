"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { type AppLanguage, readAppLanguage, saveAppLanguage } from "../lib/language";
import "./team-chat.css";

type Room = {
  id:string;kind:"private"|"site"|"announcements";label:string;siteId?:string;peerId?:string;
  unread:number;lastMessageId:string|null;lastSender:string|null;lastAt:string|null;
};
type Worker = {id:string;name:string};
type Attachment = {id:string;original_name:string;kind:"image"|"pdf"|"voice";mime:string;size_bytes:number};
type Message = {
  id:string;roomId:string;senderId:string;senderName:string;
  body:string;createdAt:string;attachment:Attachment|null;
};
type ChatState = "loading"|"ready"|"unavailable";

const WORDS:Record<AppLanguage,Record<string,string>> = {
  de:{title:"Team Chat",sites:"Gruppen",private:"Privat",announcements:"Mitteilungen",
    newChat:"Neuer Privatchat",choose:"Mitarbeiter auswählen",start:"Chat starten",
    empty:"Noch keine Nachrichten",write:"Nachricht schreiben…",send:"Senden",
    attach:"Bild oder PDF",record:"Sprachnachricht",stop:"Aufnahme beenden",
    original:"Original",translated:"Übersetzung",sound:"Ton",voice:"Sprachansage",
    autoTranslate:"Automatisch übersetzen",adminOnly:"Nur Admins können hier schreiben.",
    close:"Zurück",unavailable:"Chat ist in der Testdatenbank noch nicht aktiviert.",
    photo:"Bild ansehen",pdf:"PDF öffnen",audio:"Sprachnachricht hören",
    recording:"Aufnahme läuft",noRecords:"Keine Gespräche",load:"Chat wird geladen…",
    pushOn:"🔔 Push-Benachrichtigungen aktivieren",pushOff:"🔕 Push deaktivieren",
    warning:"Web Push funktioniert in unterstützten Browsern und iPhone-Home-Screen-Apps. Android APK-Benachrichtigungen brauchen eine separate Integration."},
  ba:{title:"Team Chat",sites:"Grupni",private:"Privatno",announcements:"Obavijesti",
    newChat:"Novi privatni razgovor",choose:"Odaberi radnika",start:"Započni razgovor",
    empty:"Još nema poruka",write:"Napiši poruku…",send:"Pošalji",
    attach:"Slika ili PDF",record:"Glasovna poruka",stop:"Završi snimanje",
    original:"Original",translated:"Prijevod",sound:"Zvuk",voice:"Glasovno upozorenje",
    autoTranslate:"Automatski prevodi",adminOnly:"Samo administratori mogu pisati ovdje.",
    close:"Nazad",unavailable:"Chat još nije uključen na testnoj bazi.",
    photo:"Pogledaj sliku",pdf:"Otvori PDF",audio:"Preslušaj glasovnu poruku",
    recording:"Snimanje traje",noRecords:"Nema razgovora",load:"Učitavam chat…",
    pushOn:"🔔 Uključi push obavijesti",pushOff:"🔕 Isključi push obavijesti",
    warning:"Web push radi u podržanim preglednicima i instaliranoj iPhone web-aplikaciji. Android APK treba posebno povezivanje."},
  uz:{title:"Team Chat",sites:"Guruhlar",private:"Shaxsiy",announcements:"E’lonlar",
    newChat:"Yangi shaxsiy suhbat",choose:"Xodimni tanlang",start:"Suhbatni boshlash",
    empty:"Hali xabar yo‘q",write:"Xabar yozing…",send:"Yuborish",
    attach:"Rasm yoki PDF",record:"Ovozli xabar",stop:"Yozishni tugatish",
    original:"Asl matn",translated:"Tarjima",sound:"Ovoz",voice:"Ovozli ogohlantirish",
    autoTranslate:"Avtomatik tarjima",adminOnly:"Bu yerga faqat administrator yoza oladi.",
    close:"Orqaga",unavailable:"Chat hali sinov bazasida yoqilmagan.",
    photo:"Rasmni ko‘rish",pdf:"PDF ochish",audio:"Ovozli xabarni eshitish",
    recording:"Yozilmoqda",noRecords:"Suhbatlar yo‘q",load:"Chat yuklanmoqda…",
    pushOn:"🔔 Push xabarlarini yoqish",pushOff:"🔕 Push xabarlarini o‘chirish",
    warning:"Web push brauzer va iPhone bosh ekranidagi ilovada ishlaydi. Android APK uchun alohida sozlama kerak."},
  cz:{title:"Team Chat",sites:"Skupiny",private:"Soukromé",announcements:"Oznámení",
    newChat:"Nový soukromý chat",choose:"Vyberte pracovníka",start:"Začít konverzaci",
    empty:"Zatím žádné zprávy",write:"Napište zprávu…",send:"Odeslat",
    attach:"Fotka nebo PDF",record:"Hlasová zpráva",stop:"Ukončit nahrávání",
    original:"Originál",translated:"Překlad",sound:"Zvuk",voice:"Hlasové upozornění",
    autoTranslate:"Automatický překlad",adminOnly:"Zde může psát jen administrátor.",
    close:"Zpět",unavailable:"Chat ještě není zapnutý v testovací databázi.",
    photo:"Zobrazit fotku",pdf:"Otevřít PDF",audio:"Přehrát hlasovou zprávu",
    recording:"Nahrávání",noRecords:"Žádné konverzace",load:"Načítání chatu…",
    pushOn:"🔔 Zapnout push oznámení",pushOff:"🔕 Vypnout push oznámení",
    warning:"Web push funguje v podporovaných prohlížečích a nainstalované iPhone webové aplikaci; Android APK potřebuje samostatnou integraci."},
  en:{title:"Team Chat",sites:"Groups",private:"Private",announcements:"Announcements",
    newChat:"New private chat",choose:"Choose worker",start:"Start chat",
    empty:"No messages yet",write:"Write a message…",send:"Send",
    attach:"Photo or PDF",record:"Voice message",stop:"Stop recording",
    original:"Original",translated:"Translation",sound:"Sound",voice:"Spoken alert",
    autoTranslate:"Automatic translation",adminOnly:"Only admins can post here.",
    close:"Back",unavailable:"Chat has not yet been enabled on the test database.",
    photo:"View image",pdf:"Open PDF",audio:"Play voice message",
    recording:"Recording",noRecords:"No conversations",load:"Loading chat…",
    pushOn:"🔔 Enable push notifications",pushOff:"🔕 Disable push notifications",
    warning:"Web push works in supported browsers and iPhone Home Screen apps; the Android APK needs separate native integration."},
};

async function api<T>(url:string,init?:RequestInit):Promise<T>{
  const response=await fetch(url,{credentials:"include",cache:"no-store",...init});
  const data=await response.json().catch(()=>({}));
  if (!response.ok) {
    if (response.status === 401 && url === "/api/team-chat") throw new Error("CHAT_PIN_REQUIRED");
    throw new Error(String(data.error ?? "Server error"));
  }
  return data as T;
}
// Embedded within the existing top-corner chat launcher. Never send messages
// or credentials to a cross-origin window; this only controls panel sizing.
function notifyChatShell(mode: "group-fullscreen" | "compact") {
  if (typeof window !== "undefined" && window.parent !== window) {
    window.parent.postMessage({ type: "solstone-chat-view", mode }, window.location.origin);
  }
}

function postBody(body:unknown):RequestInit {
  return {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)};
}
function stamp(value:string,lang:AppLanguage){
  const locale=lang==="ba"?"bs-BA":lang==="uz"?"uz-UZ":lang==="cz"?"cs-CZ":lang==="en"?"en-GB":"de-AT";
  return new Date(value).toLocaleString(locale,{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
}

export default function TeamChatPage(){
  const [lang,setLang]=useState<AppLanguage>("ba");
  const [compact,setCompact]=useState(false);
  const [showChatSettings,setShowChatSettings]=useState(false);
  const [state,setState]=useState<ChatState>("loading");
  const [needsChatPin,setNeedsChatPin]=useState(false);
  const [chatPin,setChatPin]=useState("");
  const [pinBusy,setPinBusy]=useState(false);
  const [error,setError]=useState("");
  const [rooms,setRooms]=useState<Room[]>([]);
  const [workers,setWorkers]=useState<Worker[]>([]);
  const [me,setMe]=useState<Worker & {isAdmin:boolean}|null>(null);
  const [current,setCurrent]=useState<Room|null>(null);
  const [messages,setMessages]=useState<Message[]>([]);
  const [canWrite,setCanWrite]=useState(true);
  const [tab,setTab]=useState<"private"|"site"|"announcements">("site");
  const [targetId,setTargetId]=useState("");
  const [text,setText]=useState("");
  const [file,setFile]=useState<File|null>(null);
  const [busy,setBusy]=useState(false);
  const [isRecording,setIsRecording]=useState(false);
  const [sound,setSound]=useState(true);
  const [voice,setVoice]=useState(false);
  const [autoTranslate,setAutoTranslate]=useState(false);
  const [showOriginal,setShowOriginal]=useState<Set<string>>(new Set());
  const [translations,setTranslations]=useState<Record<string,string>>({});
  const translateAttempted=useRef(new Set<string>());
  const [preview,setPreview]=useState<{url:string;name:string;kind:string}|null>(null);
  const recorder=useRef<MediaRecorder|null>(null);
  const parts=useRef<Blob[]>([]);
  const listEnd=useRef<HTMLDivElement|null>(null);
  const initialSiteSelection=useRef(false);
  const t=WORDS[lang];

  const loadRooms=useCallback(async(silent=false)=>{
    try {
      const payload=await api<{
        rooms:Room[];workers:Worker[];unread:number;
        user:Worker&{isAdmin:boolean};
      }>("/api/team-chat");
      setRooms(payload.rooms);
      setWorkers(payload.workers);
      setMe(payload.user);
      setState("ready");
      if (!silent) setError("");
      window.dispatchEvent(new CustomEvent("solstone-chat-unread",{detail:payload.unread}));
    }catch(e){
      if(e instanceof Error && e.message==="CHAT_PIN_REQUIRED") {
        setNeedsChatPin(true);
        setState("unavailable");
        return;
      }
      if (!silent){setState("unavailable");setError(e instanceof Error?e.message:"Chat error");}
    }
  },[]);

  useEffect(()=>{
    setLang(readAppLanguage("ba"));
    setCompact(new URLSearchParams(window.location.search).get("compact")==="1");
    setSound(localStorage.getItem("solstone_chat_sound")!=="false");
    setVoice(localStorage.getItem("solstone_chat_voice")==="true");
    // The user must opt in before text is sent to a third-party translator.
    setAutoTranslate(localStorage.getItem("solstone_chat_auto_translate")==="true");
    void loadRooms();
    const interval=setInterval(()=>void loadRooms(true),12000);
    return ()=>clearInterval(interval);
  },[loadRooms]);

  const loadMessages=useCallback(async(roomId:string,quiet=false)=>{
    try {
      const result=await api<{
        room:{canWrite:boolean};messages:Message[];
      }>("/api/team-chat/messages?roomId="+encodeURIComponent(roomId));
      setMessages(result.messages);
      setCanWrite(result.room.canWrite);
      if (!quiet) listEnd.current?.scrollIntoView({behavior:"instant",block:"end"});
      const last=result.messages[result.messages.length-1];
      if (last) await api("/api/team-chat/read",postBody({roomId,throughId:last.id}));
      if (!quiet) void loadRooms(true);
    }catch(e){
      if (!quiet) setError(e instanceof Error?e.message:"Chat error");
    }
  },[loadRooms]);

  useEffect(()=>{
    if (!current || !/^[0-9a-f-]{36}$/i.test(current.id)) return;
    void loadMessages(current.id);
    const interval=setInterval(()=>void loadMessages(current.id,true),6000);
    return ()=>clearInterval(interval);
  },[current?.id,loadMessages]);

  // Auto-translate recent text only. Original is always available.
  // Translation requests are per-user/per-language, cached on the server.
  useEffect(()=>{
    if (!autoTranslate || !messages.length) return;
    let cancelled=false;
    const queue=messages.slice(-16).filter((m)=>
      m.body.trim() && !translations[m.id+":"+lang] &&
      !translateAttempted.current.has(m.id+":"+lang));
    const run=async()=>{
      for (const item of queue) {
        if (cancelled) break;
        const key=item.id+":"+lang;
        translateAttempted.current.add(key);
        try {
          const result=await api<{translated:string}>("/api/team-chat/translate",
            postBody({messageId:item.id,lang}));
          if (!cancelled) setTranslations((prev)=>({...prev,[key]:result.translated}));
        }catch{
          // Keep original if no translation provider is configured.
          break;
        }
      }
    };
    void run();
    return ()=>{cancelled=true;};
  },[autoTranslate,messages,lang]);

  async function chooseRoom(room:Room){
    setError("");
    setFile(null);setPreview(null);setMessages([]);setText("");
    try{
      let real=room;
      if (room.id==="announcements" || room.id.startsWith("site:")) {
        const result=await api<{id:string}>("/api/team-chat",postBody({
          kind:room.kind,...(room.kind==="site"?{siteId:room.siteId}:{}),
        }));
        real={...room,id:result.id};
      }
      setCurrent(real);
      setTab(real.kind);
      notifyChatShell(real.kind === "site" ? "group-fullscreen" : "compact");
    }catch(e){setError(e instanceof Error?e.message:"Chat error");}
  }

  async function createPrivate(){
    if (!targetId) return;
    setError("");
    try{
      const result=await api<{id:string}>("/api/team-chat",
        postBody({kind:"private",targetWorkerId:targetId}));
      const worker=workers.find((w)=>w.id===targetId);
      const room:Room={id:result.id,kind:"private",peerId:targetId,label:worker?.name ?? "Privat",
        unread:0,lastMessageId:null,lastSender:null,lastAt:null};
      setCurrent(room);setTab("private");notifyChatShell("compact");
      void loadRooms(true);
    }catch(e){setError(e instanceof Error?e.message:"Chat error");}
  }

  async function send(){
    if (!current || (!text.trim()&&!file) || busy || !canWrite) return;
    setBusy(true);setError("");
    try{
      let uploadId:string|null=null;
      if (file) {
        const mime=file.type.split(";")[0] ||
          (file.name.toLowerCase().endsWith(".pdf")?"application/pdf":"");
        if (!mime || file.size>20*1024*1024) throw new Error("Dozvoljeno je do 20 MB.");
        const signed=await api<{uploadId:string;path:string;token:string}>(
          "/api/team-chat/media",postBody({
            roomId:current.id,name:file.name,mime,size:file.size,
          }));
        const {error:uploadError}=await supabase.storage.from("solstone-team-chat")
          .uploadToSignedUrl(signed.path,signed.token,file,{contentType:mime});
        if(uploadError) throw uploadError;
        uploadId=signed.uploadId;
      }
      await api("/api/team-chat/messages",postBody({
        roomId:current.id,text:text.trim(),uploadId,
      }));
      setText("");setFile(null);
      await loadMessages(current.id);
      void loadRooms(true);
      setTimeout(()=>listEnd.current?.scrollIntoView({behavior:"smooth"}),50);
    }catch(e){setError(e instanceof Error?e.message:"Poruka nije poslana.");}
    finally{setBusy(false);}
  }

  async function startRecording(){
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder==="undefined") {
      setError("Ovaj telefon ne podržava snimanje iz web aplikacije.");return;
    }
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mime=["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(
        (item)=>MediaRecorder.isTypeSupported(item)) || "";
      const mr=new MediaRecorder(stream,mime?{mimeType:mime}:{});
      recorder.current=mr;parts.current=[];
      mr.ondataavailable=(event)=>{if(event.data.size)parts.current.push(event.data);};
      mr.onstop=()=>{
        const contentType=(mr.mimeType || "audio/webm").split(";")[0];
        const blob=new Blob(parts.current,{type:contentType});
        const ext=contentType==="audio/mp4"?"m4a":"webm";
        if(blob.size>0) setFile(new File([blob],"Solstone-Sprachnachricht."+ext,{type:contentType}));
        stream.getTracks().forEach((track)=>track.stop());
        setIsRecording(false);
      };
      mr.start(250);setIsRecording(true);
    }catch(e){
      setError(e instanceof Error?e.message:"Mikrofon nije dostupan.");
    }
  }
  function stopRecording(){if(recorder.current?.state==="recording") recorder.current.stop();}

  async function openAttachment(message:Message){
    setError("");
    try{
      const result=await api<{url:string;kind:string;name:string}>(
        "/api/team-chat/media?messageId="+encodeURIComponent(message.id));
      setPreview(result);
    }catch(e){setError(e instanceof Error?e.message:"Prilog nije dostupan.");}
  }

  function settings(key:string,value:boolean){
    localStorage.setItem(key,String(value));
    if(key==="solstone_chat_sound")setSound(value);
    if(key==="solstone_chat_voice")setVoice(value);
    if(key==="solstone_chat_auto_translate")setAutoTranslate(value);
    if(key==="solstone_chat_auto_translate"&&value)translateAttempted.current.clear();
  }

  function setLanguage(nextLanguage:AppLanguage) {
    saveAppLanguage(nextLanguage);
    setLang(nextLanguage);
  }

  useEffect(() => {
    if (state !== "ready" || initialSiteSelection.current || current || !rooms.length) return;
    const roomId = new URLSearchParams(window.location.search).get("roomId");
    if (roomId && /^[0-9a-f-]{36}$/i.test(roomId)) {
      initialSiteSelection.current = true;
      const room = rooms.find((entry) => entry.id === roomId);
      if (room) void chooseRoom(room);
      else setError("Nemaš pristup ovom razgovoru.");
      return;
    }
    const siteId=new URLSearchParams(window.location.search).get("siteId");
    if (!siteId) return;
    initialSiteSelection.current=true;
    if (!/^\d+$/.test(siteId)) return;
    const siteRoom=rooms.find((room)=>room.kind==="site" && room.siteId===siteId);
    if (siteRoom) void chooseRoom(siteRoom);
    else setError("Nemaš pristup razgovoru ove Baustelle.");
  },[state,rooms,current]);


  async function unlockChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pinBusy || !/^\\d{4,8}$/.test(chatPin)) return;
    setPinBusy(true);
    setError("");
    try {
      await api<{success:boolean}>("/api/team-chat/auth",postBody({pin:chatPin}));
      setChatPin("");
      setNeedsChatPin(false);
      setState("loading");
      await loadRooms();
    } catch (e) {
      setError(e instanceof Error ? e.message : "PIN provjera nije uspjela.");
    } finally {
      setPinBusy(false);
    }
  }

  // The ordinary application remains untouched. Chat requires one extra
  // bcrypt PIN verification because legacy logins contain known PINs.
  if (needsChatPin) {
    return <main className={"tc-root"+(compact?" tc-compact":"")}>
      <header className="tc-header">
        <Link href="/dashboard" className="tc-back" aria-label="Nazad na početnu">←</Link>
        <h1>💬 {t.title}</h1>
      </header>
      <form onSubmit={(event)=>void unlockChat(event)}
        style={{maxWidth:420,margin:"48px auto",padding:22,display:"grid",gap:15,
          background:"#172638",borderRadius:16,color:"white"}}>
        <h2 style={{fontSize:19,fontWeight:700,margin:0}}>
          {lang==="de"?"Team Chat: Sicherheits-PIN":lang==="en"?"Team Chat: secure PIN":"Team Chat: sigurni PIN"}
        </h2>
        <p style={{margin:0,fontSize:14}}>
          {lang==="de"
            ? "Bitte gib einmal deinen persönlichen Mitarbeiter-PIN ein, um private Nachrichten zu öffnen."
            : lang==="en"
              ? "Enter your personal employee PIN once to access private conversations."
              : "Unesi svoj lični PIN za pristup privatnim porukama. Prijava u ostatak aplikacije se ne mijenja."}
        </p>
        <input type="password" inputMode="numeric" autoComplete="off"
          minLength={4} maxLength={8} pattern="[0-9]{4,8}"
          value={chatPin} onChange={(e)=>setChatPin(e.target.value)}
          aria-label="Sigurni PIN" placeholder="PIN" required
          style={{padding:13,borderRadius:8,background:"white",color:"#111",fontSize:18}}/>
        {error && <p role="alert" style={{color:"#ffd1d1",margin:0}}>{error}</p>}
        <button type="submit" disabled={pinBusy || !/^\\d{4,8}$/.test(chatPin)}
          style={{padding:13,borderRadius:9,background:"#0f8b54",color:"white",fontWeight:700}}>
          {pinBusy?"…":lang==="de"?"Chat öffnen":lang==="en"?"Open chat":"Otvori chat"}
        </button>
      </form>
    </main>;
  }

  const filtered=rooms.filter((r)=>r.kind===tab);
  const possible=workers.filter((w)=>w.id!==me?.id);

  return (
    <main className={"tc-root"+(compact?" tc-compact":"")}>
      <header className="tc-header">
        <Link href="/dashboard" className="tc-back" aria-label="Nazad na početnu">←</Link>
        <h1>💬 {t.title}</h1>
        <button type="button" className="tc-settings-button"
          aria-label="Postavke chata" aria-expanded={showChatSettings}
          onClick={()=>setShowChatSettings(value=>!value)}>⚙</button>
      </header>

      {showChatSettings && <div className="tc-settings tc-settings-open">
        <label><input type="checkbox" checked={sound}
          onChange={(e)=>settings("solstone_chat_sound",e.target.checked)}/> 🔔 {t.sound}</label>
        <label><input type="checkbox" checked={voice}
          onChange={(e)=>settings("solstone_chat_voice",e.target.checked)}/> 🔊 {t.voice}</label>
        <label><input type="checkbox" checked={autoTranslate}
          onChange={(e)=>settings("solstone_chat_auto_translate",e.target.checked)}/> 🌐 {t.autoTranslate}</label>
        <label className="tc-lang">
          🌐
          <select aria-label="Jezik chata: DE, BA, UZ, CZ, EN"
            value={lang} onChange={event=>setLanguage(event.target.value as AppLanguage)}>
            <option value="de">DE</option>
            <option value="ba">BA</option>
            <option value="uz">UZ</option>
            <option value="cz">CZ</option>
            <option value="en">EN</option>
          </select>
        </label>
      </div>}

      {error && <div className="tc-error" role="alert">{error}</div>}
      {state==="loading" && <p className="tc-muted">{t.load}</p>}
      {state==="unavailable" && <div className="tc-empty">{t.unavailable}</div>}

      {state==="ready" && <div className="tc-layout">
        <aside className={"tc-sidebar"+(current?" tc-mobile-hide":"")}>
          <nav className="tc-tabs" aria-label="Chat topics">
            {(["site","private","announcements"] as const).map((kind)=>{
              const labels={site:t.sites,private:t.private,announcements:t.announcements};
              const unread=rooms.filter((r)=>r.kind===kind).reduce((a,r)=>a+r.unread,0);
              return <button key={kind} className={tab===kind?"tc-selected":""}
                onClick={()=>{setTab(kind);notifyChatShell(kind==="site"?"group-fullscreen":"compact");}}>{labels[kind]} {unread>0 && <b>{unread}</b>}</button>;
            })}
          </nav>
          {tab==="private" && <div className="tc-new">
            <label htmlFor="tc-worker">{t.newChat}</label>
            <select id="tc-worker" value={targetId} onChange={(e)=>setTargetId(e.target.value)}>
              <option value="">{t.choose}</option>
              {possible.map((worker)=><option key={worker.id} value={worker.id}>{worker.name}</option>)}
            </select>
            <button type="button" disabled={!targetId} onClick={()=>void createPrivate()}>{t.start}</button>
          </div>}
          <div className="tc-room-list">
            {filtered.length===0 && <p className="tc-muted">{t.noRecords}</p>}
            {filtered.map((room)=>
              <button key={room.id} type="button"
                className={"tc-room"+(current?.id===room.id?" tc-current":"")}
                onClick={()=>void chooseRoom(room)}>
                <span className="tc-room-name">{room.label}</span>
                <span className="tc-room-meta">
                  {room.lastAt ? stamp(room.lastAt,lang) : " "}
                  {room.unread>0 && <b className="tc-count">{room.unread}</b>}
                </span>
                {room.lastSender && <small>{room.lastSender}</small>}
              </button>)}
          </div>
        </aside>

        <section className={"tc-conversation"+(!current?" tc-mobile-hide":"")} aria-label="Conversation">
          {!current ? <div className="tc-empty">{t.choose}</div> : <>
            <div className="tc-thread-title">
              <button type="button" onClick={()=>{setCurrent(null);setMessages([]);}}
                className="tc-back-thread">{t.close}</button>
              <strong style={{flex:1}}>{current.label}</strong>

            </div>
            <div className="tc-message-list">
              {messages.length===0 && <div className="tc-muted tc-center">{t.empty}</div>}
              {messages.map((message)=>{
                const mine=message.senderId===me?.id;
                const translation=translations[message.id+":"+lang];
                const showTranslation=autoTranslate && !!translation &&
                  !showOriginal.has(message.id) && translation!==message.body;
                return <article key={message.id}
                  className={"tc-message "+(mine?"tc-mine":"tc-other")}>
                  <div className="tc-message-head">
                    <strong>{message.senderName}</strong>
                    <time>{stamp(message.createdAt,lang)}</time>
                  </div>
                  {message.body && <p className="tc-message-text">
                    {showTranslation?translation:message.body}
                  </p>}
                  {translation && translation!==message.body && <button
                    className="tc-trans-toggle" type="button"
                    onClick={()=>{
                      setShowOriginal((prev)=>{
                        const next=new Set(prev);
                        if(next.has(message.id))next.delete(message.id);else next.add(message.id);
                        return next;
                      });
                    }}>
                    {showTranslation?t.original:t.translated}
                  </button>}
                  {message.attachment && <button type="button" className="tc-attachment"
                    onClick={()=>void openAttachment(message)}>
                    {message.attachment.kind==="image"?"🖼️ "+t.photo:
                      message.attachment.kind==="pdf"?"📄 "+t.pdf:"🎤 "+t.audio}
                    <small>{message.attachment.original_name}</small>
                  </button>}
                </article>;
              })}
              <div ref={listEnd}/>
            </div>
            {!canWrite && <div className="tc-muted tc-admin-only">{t.adminOnly}</div>}
            {canWrite && <div className="tc-compose">
              {file && <div className="tc-file">
                📎 {file.name} · {(file.size/1024/1024).toFixed(1)} MB
                <button type="button" onClick={()=>setFile(null)} aria-label="Remove attachment">×</button>
              </div>}
              {isRecording && <div className="tc-recording">🔴 {t.recording}</div>}
              <div className="tc-compose-line">
                <label className="tc-upload" title={t.attach} aria-label={t.attach}>
                  📎
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e)=>setFile(e.target.files?.[0]??null)}/>
                </label>
                <textarea value={text} placeholder={t.write} rows={1}
                  onChange={(e)=>setText(e.target.value)}
                  onKeyDown={(e)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void send();}}}/>
                <button type="button" className="tc-record" title={isRecording?t.stop:t.record}
                  aria-label={isRecording?t.stop:t.record} disabled={busy}
                  onClick={()=>isRecording?stopRecording():void startRecording()}>
                  {isRecording?"⏹":"🎙️"}
                </button>
                <button className="tc-send" title={t.send} aria-label={t.send}
                  disabled={busy||isRecording||(!text.trim()&&!file)}
                  type="button" onClick={()=>void send()}>
                  {busy?"…":"➤"}
                </button>
              </div>
            </div>}
          </>}
        </section>
      </div>}
      {preview && <div className="tc-preview-layer" role="dialog" aria-label={preview.name}>
        <div className="tc-preview-content">
          <div className="tc-preview-head">
            <strong>{preview.name}</strong>
            <button type="button" onClick={()=>setPreview(null)}>✕</button>
          </div>
          {preview.kind==="image" && <img src={preview.url} alt={preview.name}/>}
          {preview.kind==="voice" && <audio src={preview.url} controls autoPlay/>}
          {preview.kind==="pdf" && <div className="tc-preview-pdf">
            <a href={preview.url} target="_blank" rel="noopener noreferrer">{t.pdf} ↗</a>
            <iframe src={preview.url} title={preview.name}/>
          </div>}
          <a href={preview.url} target="_blank" rel="noopener noreferrer">↗ {preview.name}</a>
        </div>
      </div>}
    </main>
  );
}
