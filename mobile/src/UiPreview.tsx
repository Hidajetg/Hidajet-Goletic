import { useEffect, useRef, useState } from "react";
import "./UiPreview.css";

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
const labels:Record<Language,{welcome:string,subtitle:string,chat:string,site:string,private:string,announcement:string,type:string,send:string,attach:string,voice:string,stop:string}> = {
  de:{welcome:"Willkommen",subtitle:"Heute bei Solstone",chat:"Team Chat",site:"Baustellen",private:"Privat",announcement:"Firmeninfo",type:"Nachricht schreiben …",send:"Senden",attach:"Foto / PDF",voice:"Sprachnachricht",stop:"Stopp"},
  ba:{welcome:"Dobrodošli",subtitle:"Danas u Solstone",chat:"Team Chat",site:"Baustelle",private:"Privatno",announcement:"Obavijesti",type:"Napiši poruku …",send:"Pošalji",attach:"Slika / PDF",voice:"Glasovna",stop:"Zaustavi"},
  uz:{welcome:"Xush kelibsiz",subtitle:"Solstone bugun",chat:"Jamoa suhbati",site:"Qurilish",private:"Shaxsiy",announcement:"E’lonlar",type:"Xabar yozing …",send:"Yuborish",attach:"Rasm / PDF",voice:"Ovozli",stop:"To‘xtatish"},
  cz:{welcome:"Vítejte",subtitle:"Dnes v Solstone",chat:"Týmový chat",site:"Stavby",private:"Soukromé",announcement:"Oznámení",type:"Napište zprávu …",send:"Odeslat",attach:"Foto / PDF",voice:"Hlasová",stop:"Stop"},
  en:{welcome:"Welcome",subtitle:"Today in Solstone",chat:"Team Chat",site:"Sites",private:"Private",announcement:"Announcements",type:"Write a message …",send:"Send",attach:"Photo / PDF",voice:"Voice note",stop:"Stop"},
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
  const recorder=useRef<MediaRecorder|null>(null);
  const chunks=useRef<Blob[]>([]);
  const bottom=useRef<HTMLDivElement|null>(null);
  const t=labels[lang];
  const count=messages.site.length+messages.private.length+messages.announcement.length;

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
  function enterChat(group:ChatKind="site"){setKind(group);setScreen("chat");setNotice("");}

  const titleFor=(group:ChatKind)=>group==="site"?"🏗️ Baustelle – Primjer":group==="private"?"👤 Privatni razgovor – Primjer":"📢 Obavijesti firme";

  return <div className="spv" data-solstone-preview="SOLSTONE_UI_PREVIEW_PRESENT_20261120">
    <div className="spv-alert" role="status">
      <b>TEST IZGLEDA</b>
      <span>Nije prava prijava ni aktivni chat • ništa se ne šalje u bazu</span>
    </div>
    <header className="spv-header">
      <div className="spv-brand"><span className="spv-brand-icon">S</span>
        <span><strong>Solstone</strong><small>BAUSTELLE · NOCKER & BERNARDI</small></span>
      </div>
      <div className="spv-user">👷 <span>Demo korisnik</span></div>
    </header>
    <button type="button" className={"spv-chat-corner"+(screen==="chat"?" open":"")}
      aria-label={screen==="chat"?"Zatvori Team Chat":"Otvori Team Chat"}
      aria-expanded={screen==="chat"}
      onClick={()=>screen==="chat"?setScreen("home"):enterChat("site")}>
      {screen==="chat"?"✕":"💬"}
    </button>
    <nav className="spv-languages">
      {(Object.keys(names) as Language[]).map(code=>
        <button key={code} className={code===lang?"active":""} onClick={()=>setLang(code)} title={names[code]}>{code.toUpperCase()}</button>)}
    </nav>
    <>
      <div className="spv-hero">
        <p className="spv-upper">{t.subtitle}</p>
        <h1>{t.welcome} <span>👋</span></h1>
        <p>Vaša gradilišta, zadaci i komunikacija na jednom mjestu.</p>
      </div>
      <div className="spv-section-title"><h2>Moja aplikacija</h2><small>Brzi pristup</small></div>
      <div className="spv-cards">
        {menus.map(([icon,name,desc],idx)=>
          <button key={name} className="spv-menu" onClick={()=>alertDemo(name)}>
            <span className={idx===3?"spv-menu-icon gold":"spv-menu-icon"}>{icon}</span>
            <b>{name}</b><small>{desc}</small>
          </button>)}
      </div>
    </>
    {screen==="chat" && <aside className="spv-chat-float-panel"
      role="dialog" aria-label="Solstone Team Chat" aria-modal="false">
      <div className="spv-chat-head">
        <div><h1>💬 {t.chat}</h1><p>🏗️ Grupe · 👤 Privatno · 📢 Obavijesti · {count}</p></div>
        <button aria-label="Zatvori chat" onClick={()=>setScreen("home")}>✕</button>
      </div>
      <div className="spv-prefs">
        <label><input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)}/> 🔔 Zvuk</label>
        <label><input type="checkbox" checked={speech} onChange={e=>setSpeech(e.target.checked)}/> 🔊 Glas</label>
        <label><input type="checkbox" checked={autoTranslation} onChange={e=>setAutoTranslation(e.target.checked)}/> 🌐 Auto prevod</label>
      </div>
      <nav className="spv-tabs">{kinds.map(group=>
        <button key={group} className={kind===group?"active":""} onClick={()=>{setKind(group);setNotice("");}}>
          {group==="site"?t.site:group==="private"?t.private:t.announcement}
        </button>)}</nav>
      <section className="spv-thread">
        <div className="spv-thread-title">
          <span className="spv-circle">{kind==="site"?"🏗️":kind==="private"?"👤":"📢"}</span>
          <span><b>{titleFor(kind)}</b><small>Primjer razgovora · bez stvarnih podataka</small></span>
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
          {file&&<div className="spv-file">📎 {file.name} <button onClick={()=>setFile(null)}>✕</button></div>}
          <textarea rows={2} placeholder={t.type} value={text} onChange={e=>setText(e.target.value)}/>
          <div><label className="spv-upload">📎 {t.attach}<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
            <button className="spv-voice" onClick={()=>recording?stopVoice():void startVoice()}>{recording?"🔴 "+t.stop:"🎙️ "+t.voice}</button>
            <button className="spv-send" disabled={!text.trim()&&!file} onClick={send}>➤ {t.send}</button></div>
        </div>
      </section>
    </aside>}
    {notice&&<div className="spv-toast" role="alert"><span>{notice}</span><button onClick={()=>setNotice("")}>✕</button></div>}
    <footer className="spv-bottom"><button onClick={()=>setScreen("home")} className="active">⌂ <span>Početna</span></button>
      <button onClick={()=>alertDemo("Baustelle")}>🏗️ <span>Baustelle</span></button>
      <button onClick={()=>alertDemo("Moj profil")}>♙ <span>Profil</span></button></footer>
  </div>;
}
