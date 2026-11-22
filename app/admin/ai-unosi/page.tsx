"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Site = { id: number; naziv: string; lokacija?: string; status?: string };
type Entry = { id: string; baustelle_id: number; kind: "angebot"|"note"; status: string; title: string; source_text: string; created_by: string; created_at: string };
const control: React.CSSProperties = { width:"100%",boxSizing:"border-box",background:"#1b1b1b",color:"white",border:"1px solid #555",borderRadius:9,padding:"11px 12px",fontSize:15 };
const button: React.CSSProperties = { display:"inline-block",background:"#1c4567",color:"#fff",border:"1px solid #6b7280",borderRadius:9,padding:"10px 13px",fontWeight:700,cursor:"pointer",textDecoration:"none" };
export default function AdminAiEntries() {
  const [sites,setSites]=useState<Site[]>([]);
  const [entries,setEntries]=useState<Entry[]>([]);
  const [siteId,setSiteId]=useState("");
  const [kind,setKind]=useState<"note"|"angebot">("note");
  const [title,setTitle]=useState("");
  const [sourceText,setSourceText]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const reload=useCallback(async()=>{
    const response=await fetch("/api/admin/ai-entries",{cache:"no-store",credentials:"same-origin"});
    const data=await response.json();
    if(!response.ok)throw Error(data?.error||"Fehler");
    setSites(data.sites||[]);
    setEntries(data.entries||[]);
  },[]);
  useEffect(()=>{void reload().catch(e=>setError(e instanceof Error?e.message:"Fehler"));},[reload]);
  const save=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError("");setMessage("");
    try{
      const response=await fetch("/api/admin/ai-entries",{
        method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({siteId,kind,title,sourceText}),
      });
      const data=await response.json();
      if(!response.ok)throw Error(data?.error||"Fehler");
      setTitle("");setSourceText("");
      setMessage("AI unos spremljen kao nacrt. Nije objavljen radnicima.");
      await reload();
    }catch(e){setError(e instanceof Error?e.message:"Greška");}
    finally{setBusy(false)}
  };
  return <main style={{background:"#070707",minHeight:"100vh",padding:"20px 14px",color:"#f3f3f3"}}>
    <div style={{maxWidth:980,margin:"0 auto"}}>
      <Link href="/dashboard" style={button}>← Dashboard</Link>
      <h1 style={{color:"#f97316",marginTop:22,fontSize:28}}>🤖 AI Baustellen-Info · Administrator</h1>
      <p style={{color:"#ccc"}}>Dodaj radne upute, napomene i informacije iz ponude za pojedino gradilište. Novi unosi se spremaju kao nacrti i ne objavljuju se automatski.</p>
      <form onSubmit={e=>void save(e)} style={{background:"#121212",border:"1px solid #444",borderRadius:14,padding:16,display:"grid",gap:14}}>
        <label>Baustelle / Gradilište
          <select required value={siteId} onChange={e=>setSiteId(e.target.value)} style={{...control,marginTop:7}}>
            <option value="">Odaberi gradilište…</option>
            {sites.map(s=><option key={s.id} value={s.id}>{s.naziv}{s.lokacija?" · "+s.lokacija:""}</option>)}
          </select>
        </label>
        <label>Vrsta informacija
          <select value={kind} onChange={e=>setKind(e.target.value as "note"|"angebot")} style={{...control,marginTop:7}}>
            <option value="note">Radna napomena / upute</option>
            <option value="angebot">Angebot / Ponuda</option>
          </select>
        </label>
        <label>Naslov
          <input required minLength={2} maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} style={{...control,marginTop:7}} placeholder="Npr. Priprema hidroizolacije"/>
        </label>
        <label>Opis / Materijal / Radni koraci
          <textarea required maxLength={12000} rows={7} value={sourceText} onChange={e=>setSourceText(e.target.value)} style={{...control,marginTop:7,resize:"vertical"}} placeholder="Unesi potrebne materijale, korake rada i napomene…"/>
        </label>
        <button disabled={busy} type="submit" style={{...button,background:"#b45309",opacity:busy?.6:1}}>{busy?"Spremam…":"Spremi nacrt"}</button>
        {message&&<p role="status" style={{color:"#86efac",margin:0}}>{message}</p>}
        {error&&<p role="alert" style={{color:"#fca5a5",margin:0}}>{error}</p>}
      </form>
      <section style={{marginTop:20,background:"#121212",border:"1px solid #444",borderRadius:14,padding:16}}>
        <h2 style={{color:"#f97316",fontSize:20}}>Postojeći AI unosi ({entries.length})</h2>
        {entries.length===0?<p style={{color:"#aaa"}}>Još nema unosa.</p>:entries.map(e=><article key={e.id} style={{borderTop:"1px solid #333",padding:"12px 0"}}>
          <strong>{sites.find(s=>s.id===e.baustelle_id)?.naziv||"Baustelle"} · {e.title}</strong>
          <small style={{display:"block",color:"#aaa"}}>{e.kind} · {e.status} · {e.created_by} · {new Date(e.created_at).toLocaleDateString("de-AT")}</small>
          <p style={{whiteSpace:"pre-wrap",marginBottom:0}}>{e.source_text}</p>
        </article>)}
      </section>
    </div>
  </main>;
}
