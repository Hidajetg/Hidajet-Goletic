"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
type Conversation = { id: string; worker_name: string; worker_role: string; language: string; last_question: string; last_message_at: string };
type Message = { id: string | number; role: string; content: string; created_at: string };
const button: React.CSSProperties = { background:"#1d4566",color:"#fff",border:"1px solid #64748b",borderRadius:10,padding:"10px 13px",textDecoration:"none",cursor:"pointer",fontSize:14 };
export default function AdminAiQuestionsPage() {
  const [items,setItems]=useState<Conversation[]>([]);
  const [selected,setSelected]=useState<Conversation|null>(null);
  const [messages,setMessages]=useState<Message[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  useEffect(() => {
    let active=true;
    void fetch("/api/admin/ai-questions",{credentials:"same-origin",cache:"no-store"})
      .then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||"Fehler");if(active)setItems(d.conversations||[])})
      .catch(e=>{if(active)setError(e instanceof Error?e.message:"Fehler")})
      .finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[]);
  const open = async (item:Conversation) => {
    setSelected(item);setMessages([]);setError("");
    try {
      const r=await fetch("/api/admin/ai-questions?conversation="+encodeURIComponent(item.id),{credentials:"same-origin",cache:"no-store"});
      const d=await r.json();
      if(!r.ok)throw Error(d.error||"Fehler");
      setMessages(d.messages||[]);
    } catch(e){setError(e instanceof Error?e.message:"Fehler")}
  };
  return <main style={{minHeight:"100vh",background:"#070707",color:"#eee",padding:"20px 14px"}}>
    <div style={{maxWidth:1040,margin:"0 auto"}}>
      <Link href="/dashboard" style={button}>← Dashboard</Link>
      <h1 style={{color:"#f97316",fontSize:29,marginTop:22}}>🤖 AI Fragen – Administrator</h1>
      <p style={{color:"#aaa"}}>Pregled pitanja i AI odgovora radnika. Prikaz samo za administratore.</p>
      {error&&<p role="alert" style={{color:"#fca5a5"}}>{error}</p>}
      {loading?<p>Učitavanje…</p>:null}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(320px,100%),1fr))",gap:16,alignItems:"start"}}>
        <section style={{background:"#151515",border:"1px solid #444",borderRadius:12,padding:14}}>
          <h2 style={{color:"#f97316",fontSize:18,marginTop:0}}>Fragen / Pitanja ({items.length})</h2>
          {items.length===0?<p style={{color:"#999"}}>Trenutno nema AI razgovora.</p>:items.map(item=>
            <button type="button" key={item.id} onClick={()=>void open(item)} style={{display:"block",width:"100%",textAlign:"left",color:"#fff",border:selected?.id===item.id?"1px solid #f97316":"1px solid #333",borderRadius:9,background:"#222",padding:12,marginBottom:8,cursor:"pointer"}}>
              <strong>{item.worker_name}</strong>
              <span style={{display:"block",color:"#aaa",fontSize:12}}>{item.last_message_at ? new Date(item.last_message_at).toLocaleString("de-AT") : ""}</span>
              <span style={{display:"block",whiteSpace:"pre-wrap",marginTop:5}}>{item.last_question}</span>
            </button>)}
        </section>
        <section style={{background:"#151515",border:"1px solid #444",borderRadius:12,padding:14}}>
          <h2 style={{color:"#f97316",fontSize:18,marginTop:0}}>Antworten / Odgovori</h2>
          {selected ? <p style={{color:"#aaa"}}>{selected.worker_name}</p> : <p style={{color:"#999"}}>Odaberi razgovor s lijeve strane.</p>}
          {messages.map(m=><div key={m.id} style={{borderRadius:10,padding:12,background:m.role==="user"?"#242424":"#15283d",marginBottom:10}}>
            <strong>{m.role==="user"?"Radnik":"AI"}</strong>
            <p style={{whiteSpace:"pre-wrap",margin:"6px 0 0"}}>{m.content}</p>
            <small style={{color:"#aaa"}}>{m.created_at?new Date(m.created_at).toLocaleString("de-AT"):""}</small>
          </div>)}
          {selected&&messages.length===0&&!error?<p style={{color:"#999"}}>Nema spremljenih poruka u ovom razgovoru.</p>:null}
        </section>
      </div>
    </div>
  </main>;
}
