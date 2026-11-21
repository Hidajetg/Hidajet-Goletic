import { useEffect, useRef, useState } from "react";
import "./UiPreview.css";
import { SOLSTONE_APPROVED_LOGO } from "./approvedLogo";

type Language="de"|"ba"|"uz"|"cz"|"en";
type ChatKind="site"|"private"|"private2"|"announcement";
type Screen="home"|"chatList"|"chat";
type ChatMessage={id:number;mine:boolean;sender:string;body:string;time:string;attachment?:string;mediaUrl?:string;mediaType?:string};

type MenuKey =
  "baustelle" | "workerProjects" | "projects" | "employees" | "hours" |
  "calendar" | "cars" | "info" | "privateNote" | "adminMaterial" |
  "materialOrder" | "logout";
type MenuTone = "blue" | "green" | "orange" | "cyan" | "purple" | "red";
type MenuItem = { key: MenuKey; icon: string; tone: MenuTone };
const navItems: MenuItem[] = [
  {key:"baustelle",icon:"🏗️",tone:"blue"},
  {key:"workerProjects",icon:"👷",tone:"green"},
  {key:"projects",icon:"📂",tone:"orange"},
  {key:"employees",icon:"👥",tone:"cyan"},
  {key:"hours",icon:"⏰",tone:"blue"},
  {key:"calendar",icon:"📅",tone:"blue"},
  {key:"cars",icon:"🚗",tone:"blue"},
  {key:"info",icon:"📢",tone:"blue"},
  {key:"privateNote",icon:"📝",tone:"blue"},
  {key:"adminMaterial",icon:"🧱",tone:"purple"},
  {key:"materialOrder",icon:"🧱",tone:"blue"},
  {key:"logout",icon:"🚪",tone:"red"},
];
const adminOnlyMenus = new Set<MenuKey>(["projects","employees","adminMaterial"]);
const navLabels:Record<Language,Record<MenuKey,string>> = {
  de:{baustelle:"Baustelle",workerProjects:"Meine Projekte",projects:"Projekte",employees:"Mitarbeiter",hours:"Stunden",calendar:"Kalender",cars:"Autos",info:"Info",privateNote:"Private Notiz",adminMaterial:"Material",materialOrder:"Material bestellen",logout:"Abmelden"},
  ba:{baustelle:"Baustelle",workerProjects:"Moji projekti",projects:"Projekti",employees:"Radnici",hours:"Sati",calendar:"Kalendar",cars:"Auta",info:"Info",privateNote:"Privatna bilješka",adminMaterial:"Materijal",materialOrder:"Naruči materijal",logout:"Odjava"},
  uz:{baustelle:"Ish joyi",workerProjects:"Mening loyihalarim",projects:"Loyihalar",employees:"Xodimlar",hours:"Soatlar",calendar:"Kalendar",cars:"Mashinalar",info:"Info",privateNote:"Shaxsiy eslatma",adminMaterial:"Material",materialOrder:"Material buyurtma",logout:"Chiqish"},
  cz:{baustelle:"Stavba",workerProjects:"Moje projekty",projects:"Projekty",employees:"Pracovníci",hours:"Hodiny",calendar:"Kalendář",cars:"Auta",info:"Info",privateNote:"Soukromá poznámka",adminMaterial:"Materiál",materialOrder:"Objednat materiál",logout:"Odhlásit se"},
  en:{baustelle:"Construction site",workerProjects:"My projects",projects:"Projects",employees:"Employees",hours:"Hours",calendar:"Calendar",cars:"Cars",info:"Info",privateNote:"Private note",adminMaterial:"Material",materialOrder:"Order material",logout:"Logout"},
};
const localeOf:Record<Language,string>={de:"de-AT",ba:"bs-BA",uz:"uz-UZ",cz:"cs-CZ",en:"en-GB"};
const calendarLabels:Record<Language,{title:string,today:string,tomorrow:string,noPlans:string,date:string,select:string,example:string}> = {
  de:{title:"Mein Arbeitsplan",today:"Heute",tomorrow:"Morgen",noPlans:"Kein Demo-Einsatz für diesen Tag.",date:"Tag",select:"Datum auswählen",example:"BEISPIEL – keine echten Kalenderdaten"},
  ba:{title:"Moj raspored",today:"Danas",tomorrow:"Sutra",noPlans:"Za ovaj dan nema primjera rasporeda.",date:"Dan",select:"Odaberi datum",example:"PRIMJER – nisu stvarni podaci"},
  uz:{title:"Ish jadvalim",today:"Bugun",tomorrow:"Ertaga",noPlans:"Bu kunga namuna jadval yo‘q.",date:"Kun",select:"Sanani tanlang",example:"NAMUNA – haqiqiy ma’lumot emas"},
  cz:{title:"Můj rozvrh",today:"Dnes",tomorrow:"Zítra",noPlans:"Pro tento den není ukázkový plán.",date:"Den",select:"Vybrat datum",example:"UKÁZKA – nejde o skutečná data"},
  en:{title:"My schedule",today:"Today",tomorrow:"Tomorrow",noPlans:"No sample assignment for this day.",date:"Day",select:"Choose date",example:"SAMPLE – not actual calendar data"},
};

function viennaISO():string {
  const parts=new Intl.DateTimeFormat("en-GB",{
    timeZone:"Europe/Vienna",year:"numeric",month:"2-digit",day:"2-digit",
  }).formatToParts(new Date());
  const v=(name:string)=>parts.find(part=>part.type===name)?.value??"";
  return v("year")+"-"+v("month")+"-"+v("day");
}
function moveISO(date:string,days:number):string {
  return new Date(Date.parse(date+"T00:00:00Z")+days*86_400_000).toISOString().slice(0,10);
}
function inDateWindow(date:string):boolean {
  const from=Date.parse(viennaISO()+"T00:00:00Z");
  const actual=Date.parse(date+"T00:00:00Z");
  return Number.isFinite(actual)&&Math.abs(actual-from)<=365*86_400_000;
}

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
    {id:3,mine:false,sender:"Primjer kolege 1",body:"Možeš li pogledati novi nacrt?",time:"09:03"},
  ],
  private2:[
    {id:5,mine:false,sender:"Primjer kolege 2",body:"Javi kad bude spreman materijal.",time:"09:11"},
  ],
  announcement:[
    {id:4,mine:false,sender:"Administrator (demo)",body:"Važno: sutra je sastanak ekipe u 07:00.",time:"09:15"},
  ],
};

export default function UiPreview(){
  const [lang,setLang]=useState<Language>(() => {
    if (typeof window === "undefined") return "ba";
    const saved = (localStorage.getItem("appLanguage") || localStorage.getItem("lang") || "ba").toLowerCase();
    return (["de","ba","uz","cz","en"] as string[]).includes(saved)
      ? saved as Language : "ba";
  });
  const [selectedDate,setSelectedDate]=useState(viennaISO);
  const [screen,setScreen]=useState<Screen>("home");
  const [previewRole,setPreviewRole]=useState<"worker"|"admin">("worker");
  const [profileOpen,setProfileOpen]=useState(false);
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
  const cl=calendarLabels[lang];
  function setLanguage(language:Language) {
    setLang(language);
    for(const key of ["appLanguage","lang","language","worker_language","selectedLanguage"]){
      localStorage.setItem(key,language);
    }
  }
  function selectDay(date:string) {
    if(inDateWindow(date)&&date!==selectedDate)setSelectedDate(date);
  }


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
  function openChatList(){setScreen("chatList");setShowChatOptions(false);setNotice("");setProfileOpen(false);}
  function openThread(group:ChatKind){setKind(group);setScreen("chat");setNotice("");setText("");setFile(null);}

  const titleFor=(group:ChatKind)=>group==="site"?"Baustelle – Primjer":group==="private"?"Primjer kolege 1":group==="private2"?"Primjer kolege 2":"Obavijesti firme";

  return <div className={"spv"+(screen!=="home"?" spv-chat-active":"")} data-solstone-preview="SOLSTONE_UI_PREVIEW_PRESENT_20261120">
    {screen==="home" && <div className="spv-alert" role="status">
      <b>TEST IZGLEDA</b>
      <span>Nije prava prijava ni aktivni chat • ništa se ne šalje u bazu</span>
    </div>}
    {screen==="home" && previewRole==="worker" && <header className="spv-header">
      <div className="spv-brand"><img className="spv-brand-icon" src={SOLSTONE_APPROVED_LOGO} alt="Solstone – originalni logo" />
        <span><strong>Solstone</strong><small>BAUSTELLE · NOCKER & BERNARDI</small>
          <span className="spv-worker-name">👷 Primjer radnika</span>
        </span>
      </div>
    </header>}
    {screen==="home" && <button type="button" className="spv-chat-corner"
      aria-label="Otvori Team Chat kao novu stranicu"
      onClick={openChatList}>💬</button>}
    {screen==="home" && previewRole==="worker" &&
      <div className="spv-language-select-wrap">
        <select className="spv-language-code-select"
          aria-label="Jezik: odaberi DE, BA, UZ, CZ ili EN"
          value={lang} onChange={e=>setLanguage(e.target.value as Language)}>
          <option value="de">DE</option>
          <option value="ba">BA</option>
          <option value="uz">UZ</option>
          <option value="cz">CZ</option>
          <option value="en">EN</option>
        </select>
      </div>}
    {screen==="home" && <>
      {previewRole==="admin" ? (
        <section className="spv-admin-web-preview" aria-label="Admin pregled iz web aplikacije">
          <h1>STONE BOUTIQUE</h1>
          <h2>{{
            de:"Willkommen", ba:"Dobrodošao", uz:"Xush kelibsiz",
            cz:"Vítejte",en:"Welcome",
          }[lang]} Demo Admin</h2>
          <nav className="spv-admin-web-langs" aria-label="Web izbor jezika">
            {(["de","ba","uz","cz","en"] as Language[]).map(code=>
              <button key={code} type="button" className={code===lang?"active":""}
                onClick={()=>setLanguage(code)}>{code.toUpperCase()}</button>)}
          </nav>
          <div className="spv-admin-web-grid">
            {navItems.map(item=>
              <button key={item.key} type="button"
                className={"spv-admin-web-button spv-admin-tone-"+item.tone}
                onClick={()=>alertDemo(navLabels[lang][item.key])}>
                <span aria-hidden="true">{item.icon}</span> {navLabels[lang][item.key]}
              </button>)}
          </div>
          <section className="spv-admin-web-info">
            <h2>📢 {navLabels[lang].info}</h2>
            <p>TESTNI PRIKAZ — stvarne obavijesti nisu učitane.</p>
          </section>
        </section>
      ) : (
        <div className="spv-worker-home">
      <section className="spv-today-card" aria-label={cl.title}>
        <div className="spv-today-heading">
          <strong>📅 {cl.title}</strong><small>{cl.example}</small>
        </div>
        <div className="spv-today-nav">
          <button type="button" aria-label="Prethodni dan" onClick={()=>selectDay(moveISO(selectedDate,-1))}>‹</button>
          <button type="button" onClick={()=>selectDay(viennaISO())}>{cl.today}</button>
          <button type="button" onClick={()=>selectDay(moveISO(viennaISO(),1))}>{cl.tomorrow}</button>
          <input type="date" aria-label={cl.select} value={selectedDate}
            min={moveISO(viennaISO(),-365)} max={moveISO(viennaISO(),365)}
            onChange={e=>selectDay(e.target.value)}/>
          <button type="button" aria-label="Naredni dan" onClick={()=>selectDay(moveISO(selectedDate,1))}>›</button>
        </div>
        <p className="spv-day-label">
          {new Intl.DateTimeFormat(localeOf[lang],{
            weekday:"long",day:"2-digit",month:"long",year:"numeric",timeZone:"UTC",
          }).format(new Date(selectedDate+"T00:00:00Z"))}
        </p>
        {selectedDate===viennaISO() ?
          <div className="spv-today-site"><b>🏗️ Baustelle — demonstracijski primjer</b>
            <span>📍 Primjer lokacije</span>
            <span>👷 Primjer kolega s istog gradilišta</span>
            <small>Stvarni raspored je u radničkom pogledu povezanim s kalendarom nakon prijave.</small>
          </div> :
          <p className="spv-empty-day">{cl.noPlans}</p>}
      </section>
      <div className="spv-section-title"><h2>Moja aplikacija</h2>
        <small>Brzi pristup</small></div>
      <div className="spv-cards">
        {navItems.filter(item=>!adminOnlyMenus.has(item.key))
          .map(item=><button key={item.key} type="button"
            className={"spv-menu spv-tone-"+item.tone}
            onClick={()=>alertDemo(navLabels[lang][item.key])}>
            <span aria-hidden="true" className="spv-menu-icon">{item.icon}</span>
            <b>{navLabels[lang][item.key]}</b>
          </button>)}
      </div>
        </div>
      )}
    </>}
    {screen!=="home" && <section className="spv-chat-page"
      aria-label="Solstone Team Chat – zasebna stranica">
      <div className="spv-chat-head">
        <button type="button" className="spv-back" aria-label={screen==="chat"?"Nazad na razgovore":"Nazad na početnu"} onClick={()=>screen==="chat"?setScreen("chatList"):setScreen("home")}>←</button>
        <strong className="spv-page-title">💬 {screen==="chat"?titleFor(kind):t.chat}</strong>
        <small className="spv-demo-mark">DEMO</small>
        <button type="button" className="spv-options-button"
          aria-label="Postavke chata" aria-expanded={showChatOptions}
          onClick={()=>setShowChatOptions(v=>!v)}>⚙</button>
      </div>
      {showChatOptions && <div className="spv-prefs" aria-label="Postavke chata">
        <label><input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)}/> 🔔 Zvuk</label>
        <label><input type="checkbox" checked={speech} onChange={e=>setSpeech(e.target.checked)}/> 🔊 Glas</label>
        <label><input type="checkbox" checked={autoTranslation} onChange={e=>setAutoTranslation(e.target.checked)}/> 🌐 Auto prevod</label>
        <label className="spv-chat-language-select">
          🌐
          <select className="spv-language-code-select"
            aria-label="Jezik chata: odaberi DE, BA, UZ, CZ ili EN"
            value={lang} onChange={e=>setLanguage(e.target.value as Language)}>
            <option value="de">DE</option>
            <option value="ba">BA</option>
            <option value="uz">UZ</option>
            <option value="cz">CZ</option>
            <option value="en">EN</option>
          </select>
        </label>
      </div>}
      {screen==="chatList" ? (
        <section className="spv-conversations" aria-label="Lista grupnih i privatnih razgovora">
          <p className="spv-conversation-caption">Primjeri razgovora – kao lista u WhatsAppu. Poruke ostaju samo u ovom testu.</p>
          {(["site","private","private2","announcement"] as ChatKind[]).map(group=>{
            const items=messages[group];
            const last=items[items.length-1];
            return <button key={group} type="button" className="spv-conversation-row"
                onClick={()=>openThread(group)}>
              <span className={"spv-conversation-avatar spv-avatar-"+group} aria-hidden="true">
                {group==="site"?"🏗️":group==="announcement"?"📢":"👤"}
              </span>
              <span className="spv-conversation-copy">
                <b>{titleFor(group)}</b>
                <small>{last?.body||""}</small>
              </span>
              <time>{last?.time||""}</time>
              <span className="spv-conversation-chevron" aria-hidden="true">›</span>
            </button>;
          })}
        </section>
      ) : (
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
      )}
    </section>}
    {profileOpen&&screen==="home"&&<div className="spv-profile-overlay" role="dialog" aria-modal="true" aria-label="Testna promjena uloge">
      <div className="spv-profile-panel">
        <div className="spv-profile-heading"><b>Test prikaza</b>
          <button type="button" aria-label="Zatvori" onClick={()=>setProfileOpen(false)}>✕</button>
        </div>
        <p>Odaberi prikaz za test. U pravoj aplikaciji ulogu određuje prijava.</p>
        <button type="button" onClick={()=>{setPreviewRole("worker");setProfileOpen(false);}}>👷 Radnik</button>
        <button type="button" onClick={()=>{setPreviewRole("admin");setProfileOpen(false);}}>🔧 Admin</button>
      </div>
    </div>}
    {notice&&<div className="spv-toast" role="alert"><span>{notice}</span><button onClick={()=>setNotice("")}>✕</button></div>}
    {screen==="home" && <footer className="spv-bottom"><button onClick={()=>setScreen("home")} className={screen==="home"?"active":""}>⌂ <span>Početna</span></button>
      <button onClick={openChatList}>💬 <span>Chat</span></button>
      <button onClick={()=>setProfileOpen(true)}>♙ <span>Profil</span></button>
      <button type="button" className="spv-ai-bottom" title="Otvori svoj ChatGPT" aria-label="Otvori svoj ChatGPT" onClick={()=>window.open("https://chatgpt.com/","_blank","noopener,noreferrer")}><span className="spv-ai-walker" aria-hidden="true">🚶</span><span>AI</span></button></footer>}
  </div>;
}
