import { useEffect, useRef, useState } from "react";
import "./UiPreview.css";
import { SOLSTONE_APPROVED_LOGO } from "./approvedLogo";

type Language="de"|"ba"|"uz"|"cz"|"en";
type ChatKind="site"|"private"|"announcement";
type Screen="home"|"chat";
type ChatMessage={id:number;mine:boolean;sender:string;body:string;time:string;attachment?:string;mediaUrl?:string;mediaType?:string};

const menus=[
  ["🏗️","Baustelle","Gradilišta"],
  ["👷","Moji projekti","Radni zadaci"],
  ["⏰","Sati","Radno vrijeme"],
  ["📅","Kalendar","Raspored za danas"],
  ["📢","Obavijesti","Informacije firme"],
  ["🧱","Materijal","Narudžbe materijala"],
  ["📝","Privatna bilješka","Moje napomene"],
  ["🚗","Auta","Vozila firme"],
];
const names:Record<Language,string>={de:"Deutsch",ba:"Bosanski",uz:"O‘zbek",cz:"Čeština",en:"English"};
const labels:Record<Language,{chat:string,site:string,private:string,announcement:string,type:string,send:string,attach:string,voice:string,stop:string}> = {
  de:{chat:"Team Chat",site:"Gruppen",private:"Privat",announcement:"Firmeninfo",type:"Nachricht schreiben …",send:"Senden",attach:"Foto / PDF",voice:"Sprachnachricht",stop:"Stopp"},
  ba:{chat:"Team Chat",site:"Grupni",private:"Privatno",announcement:"Obavijesti",type:"Napiši poruku …",send:"Pošalji",attach:"Slika / PDF",voice:"Glasovna",stop:"Zaustavi"},
  uz:{chat:"Jamoa suhbati",site:"Guruhlar",private:"Shaxsiy",announcement:"E’lonlar",type:"Xabar yozing …",send:"Yuborish",attach:"Rasm / PDF",voice:"Ovozli",stop:"To‘xtatish"},
  cz:{chat:"Týmový chat",site:"Skupiny",private:"Soukromé",announcement:"Oznámení",type:"Napište zprávu …",send:"Odeslat",attach:"Foto / PDF",voice:"Hlasová",stop:"Stop"},
  en:{chat:"Team Chat",site:"Groups",private:"Private",announcement:"Announcements",type:"Write a message …",send:"Send",attach:"Photo / PDF",voice:"Voice note",stop:"Stop"},
};
const initial:Record<ChatKind,ChatMessage[]>={
  site:[
    {id:1,mine:false,sender:"Primjer radnika",body:"Da li su pločice i ljepilo stigli na Baustelle?",time:"08:45"},
    {id:2,mine:true,sender:"Ja (demo)",body:"Provjerit ću skladište. Danas nastavljamo izolaciju.",time:"08:48"},
  ],
  private:[
    {id:3,mine:false,sender:"Primjer kolege",body:"Možeš li pogledati novi nacrt?",time:"09:03"},
  ],
  announcement:[
    {id:4,mine:false,sender:"Administrator (demo)",body:"Važno: sutra je sastanak ekipe u 07:00.",time:"09:15"},
  ],
};
const kinds:ChatKind[]=["site","private","announcement"];

export default function UiPreview(){
  const [lang,setLang]=useState<Language>("ba");
  const [screen,setScreen]=useState<Screen>("home");
  const [kind,setKind]=useState<ChatKind>("site");
  const [text,setText]=useState("");
  const [messages,setMessages]=useState(initial);
  const [notice,setNotice]=useState("");
  const [file,setFile]=useState<File|null>(null);
  const [recording,setRecording]=useState(false);
  const [sound,setSound]=useState(true);
  const [speech,setSpeech]=useState(false);
  const [autoTranslation,setAutoTranslation]=useState(true);
  const [showChatOptions,setShowChatOptions]=useState(false);
  const recorder=useRef<MediaRecorder|null>(null);
  const chunks=useRef<Blob[]>([]);
  const bottom=useRef<HTMLDivElement|null>(null);
  const t=labels[lang];


  useEffect(()=>{bottom.current?.scrollIntoView({behavior:"smooth",block:"nearest"});},[messages,kind,screen]);

  function alertDemo(feature:string){
    setNotice(feature+" — samo pregled dizajna. Ovdje se ne čuvaju stvarni podaci.");
  }
  function send(){
    if(!text.trim()&&!file)return;
    const label=file?.name? "📎 "+file.name:"";
    const previewUrl=file?URL.createObjectURL(file):undefined;
    const entry:ChatMessage={
      id:Date.now(),mine:true,sender:"Ja (lokalni demo)",
      body:[text.trim(),label].filter(Boolean).join("\n"),
      time:new Date().toLocaleTimeString("de-AT",{hour:"2-digit",minute:"2-digit"}),
      attachment:file?.name,mediaUrl:previewUrl,mediaType:file?.type,
    };
    setMessages(old=>({...old,[kind]:[...old[kind],entry]}));
    setText("");setFile(null);
    setNotice("Poruka je prikazana samo na ovom telefonu. Nije poslana radnicima.");
  }
  async function startVoice(){
    try{
      if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)throw Error("Mikrofon nije dostupan.");
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mime=["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(m=>MediaRecorder.isTypeSupported(m));
      const mr=new MediaRecorder(stream,mime?{mimeType:mime}:{});
      chunks.current=[];
      recorder.current=mr;
      mr.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data)};
      mr.onstop=()=>{
        const typ=mr.mimeType.split(";")[0]||"audio/webm";
        const blob=new Blob(chunks.current,{type:typ});
        if(blob.size>0)setFile(new File([blob],"solstone-demo."+(typ==="audio/mp4"?"m4a":"webm"),{type:typ}));
        stream.getTracks().forEach(track=>track.stop());
        setRecording(false);
      };
      mr.start();setRecording(true);
    }catch(e){setNotice(e instanceof Error?e.message:"Mikrofon nije dostupan.");}
  }
  function stopVoice(){if(recorder.current?.state==="recording")recorder.current.stop()}
  function enterChat(group:ChatKind="site"){setKind(group);setScreen("chat");setShowChatOptions(false);setNotice("");}

  const titleFor=(group:ChatKind)=>group==="site"?"🏗️ Baustelle – Primjer":group==="private"?"👤 Privatni razgovor – Primjer":"📢 Obavijesti firme";

  return <div className={"spv"+(screen==="chat"?" spv-chat-active":"")} data-solstone-preview="SOLSTONE_UI_PREVIEW_PRESENT_20261120">
    {screen==="home" && <div className="spv-alert" role="status">
      <b>TEST IZGLEDA</b>
      <span>Nije prava prijava ni aktivni chat • ništa se ne šalje u bazu</span>
    </div>}
    {screen==="home" && <header className="spv-header">
      <div className="spv-brand"><img className="spv-brand-icon" src={SOLSTONE_APPROVED_LOGO} alt="Solstone – originalni logo" />
        <span><strong>Solstone</strong><small>BAUSTELLE · NOCKER & BERNARDI</small></span>
      </div>
      <div className="spv-user">👷 <span>Demo korisnik</span></div>
    </header>}
    {screen==="home" && <button type="button" className="spv-chat-corner"
      aria-label="Otvori Team Chat kao novu stranicu"
      onClick={()=>enterChat("site")}>💬</button>}
    {screen==="home" && <nav className="spv-languages">
      {(Object.keys(names) as Language[]).map(code=>
        <button key={code} className={code===lang?"active":""} onClick={()=>setLang(code)} title={names[code]}>{code.toUpperCase()}</button>)}
    </nav>}
    {screen==="home" && <>
      <div className="spv-section-title"><h2>Moja aplikacija</h2><small>Brzi pristup</small></div>
      <div className="spv-cards">
        {menus.map(([icon,name,desc],idx)=>
          <button key={name} className="spv-menu" onClick={()=>alertDemo(name)}>
            <span className={idx===3?"spv-menu-icon gold":"spv-menu-icon"}>{icon}</span>
            <b>{name}</b><small>{desc}</small>
          </button>)}
      </div>
    </>}
    {screen==="chat" && <section className="spv-chat-page"
      aria-label="Solstone Team Chat – zasebna stranica">
      <div className="spv-chat-head">
        <button type="button" className="spv-back" aria-label="Nazad na početnu" onClick={()=>setScreen("home")}>←</button>
        <strong className="spv-page-title">💬 {t.chat}</strong>
        <small className="spv-demo-mark">DEMO</small>
        <button type="button" className="spv-options-button"
          aria-label="Postavke chata" aria-expanded={showChatOptions}
          onClick={()=>setShowChatOptions(v=>!v)}>⚙</button>
      </div>
      {showChatOptions && <div className="spv-prefs" aria-label="Postavke chata">
        <label><input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)}/> 🔔 Zvuk</label>
        <label><input type="checkbox" checked={speech} onChange={e=>setSpeech(e.target.checked)}/> 🔊 Glas</label>
        <label><input type="checkbox" checked={autoTranslation} onChange={e=>setAutoTranslation(e.target.checked)}/> 🌐 Auto prevod</label>
        <div className="spv-chat-language">
          {(Object.keys(names) as Language[]).map(code=>
            <button key={code} className={code===lang?"active":""}
              onClick={()=>setLang(code)} title={names[code]}>{code.toUpperCase()}</button>)}
        </div>
      </div>}
      <nav className="spv-tabs" aria-label="Vrsta razgovora">{kinds.map(group=>
        <button key={group} className={kind===group?"active":""}
          onClick={()=>{setKind(group);setNotice("");}}>
          {group==="site"?t.site:group==="private"?t.private:t.announcement}
        </button>)}</nav>
      <section className="spv-thread">
        <div className="spv-thread-title">
          <b>{titleFor(kind)}</b>
        </div>
        <div className="spv-messages">
          {messages[kind].map(msg=><article key={msg.id} className={msg.mine?"mine":""}>
            <div><b>{msg.sender}</b><time>{msg.time}</time></div>
            <p>{msg.body}</p>
            {msg.mediaUrl && (msg.mediaType?.startsWith("image/")?<img src={msg.mediaUrl} alt={msg.attachment||"Prilog"}/>:msg.mediaType?.startsWith("audio/")?<audio controls src={msg.mediaUrl}/>:<small>{msg.attachment}</small>)}
          </article>)}
          <div ref={bottom}/>
        </div>
        <div className="spv-compose">
          {file&&<div className="spv-file">📎 {file.name}
            <button type="button" onClick={()=>setFile(null)} aria-label="Ukloni prilog">✕</button>
          </div>}
          <div className="spv-compose-line">
            <label className="spv-upload" title={t.attach} aria-label={t.attach}>
              📎<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={e=>setFile(e.target.files?.[0]||null)}/>
            </label>
            <textarea rows={1} placeholder={t.type} value={text}
              onChange={e=>setText(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}/>
            <button type="button" className="spv-voice" title={t.voice}
              aria-label={recording?t.stop:t.voice}
              onClick={()=>recording?stopVoice():void startVoice()}>{recording?"⏹":"🎙️"}</button>
            <button type="button" className="spv-send" title={t.send}
              aria-label={t.send} disabled={!text.trim()&&!file} onClick={send}>➤</button>
          </div>
        </div>
      </section>
    </section>}
    {notice&&<div className="spv-toast" role="alert"><span>{notice}</span><button onClick={()=>setNotice("")}>✕</button></div>}
    {screen==="home" && <footer className="spv-bottom"><button onClick={()=>setScreen("home")} className={screen==="home"?"active":""}>⌂ <span>Početna</span></button>
      <button onClick={()=>enterChat("site")} className={screen==="chat"?"active":""}>💬 <span>Chat</span></button>
      <button onClick={()=>alertDemo("Moj profil")}>♙ <span>Profil</span></button></footer>}
  </div>;
}
