"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { readAppLanguage, type AppLanguage } from "../lib/language";

type Row = { id: string; date: string; worker: string; site: string; location: string; note: string };
type AiQuestion = { id: string; worker: string; question: string; at: string };
type AiInfo = { id: string; site: string; title: string; status: string; at: string };
type Activity = { id: string; title: string; detail: string; actor: string; site: string; at: string };
type Overview = {
  week: string[]; start: string; end: string; today: string; rows: Row[];
  workerCount: number; aiQuestions: AiQuestion[]; aiInfo: AiInfo[]; activities: Activity[];
};
const words = {
  de: { title:"Mitarbeiter-Kalender", week:"Wo arbeiten unsere Mitarbeiter?", back:"Vorherige Woche", next:"Nächste Woche", day:"Tag", worker:"Mitarbeiter", site:"Baustelle", note:"Notiz", none:"Keine Einsätze eingetragen.", manage:"Kalender bearbeiten", ai:"KI – Administrator", questions:"Fragen der Mitarbeiter", aiInfo:"KI-Baustelleninformationen", activity:"Letzte Einträge", noQuestions:"Noch keine KI-Fragen.", noActivities:"Keine neuen Einträge.", open:"KI Fragen verwalten", allSites:"Baustellen / Eingaben", loading:"Wird geladen…", retry:"Erneut versuchen", workers:"Aktive Mitarbeiter", openAi:"KI-Assistent", unnamed:"Ohne Eintrag" },
  ba: { title:"Kalendar radnika", week:"Gdje rade naši radnici?", back:"Prethodna sedmica", next:"Sljedeća sedmica", day:"Dan", worker:"Radnik", site:"Baustelle", note:"Napomena", none:"Nema rasporeda za ovaj dan.", manage:"Uredi kalendar", ai:"AI – Administrator", questions:"Pitanja radnika", aiInfo:"AI informacije gradilišta", activity:"Posljednji unosi", noQuestions:"Još nema AI pitanja.", noActivities:"Nema novih unosa.", open:"Upravljaj AI pitanjima", allSites:"Gradilišta / unosi", loading:"Učitavanje…", retry:"Pokušaj ponovo", workers:"Aktivni radnici", openAi:"AI asistent", unnamed:"Bez unosa" },
  uz: { title:"Ishchilar taqvimi", week:"Ishchilar qayerda ishlaydi?", back:"Oldingi hafta", next:"Keyingi hafta", day:"Kun", worker:"Ishchi", site:"Obyekt", note:"Izoh", none:"Jadval yo‘q.", manage:"Taqvimni tahrirlash", ai:"AI – Administrator", questions:"Ishchilar savollari", aiInfo:"AI obyekt ma’lumotlari", activity:"So‘nggi kiritmalar", noQuestions:"AI savollar yo‘q.", noActivities:"Yangi ma’lumot yo‘q.", open:"AI savollarini ko‘rish", allSites:"Obyektlar / yozuvlar", loading:"Yuklanmoqda…", retry:"Qayta urinish", workers:"Faol ishchilar", openAi:"AI yordamchi", unnamed:"Ma’lumot yo‘q" },
  en: { title:"Worker calendar", week:"Where is everyone working?", back:"Previous week", next:"Next week", day:"Day", worker:"Worker", site:"Site", note:"Note", none:"No assignments.", manage:"Edit calendar", ai:"AI – Admin", questions:"Worker questions", aiInfo:"AI site information", activity:"Latest entries", noQuestions:"No AI questions yet.", noActivities:"No recent entries.", open:"Manage AI questions", allSites:"Sites / entries", loading:"Loading…", retry:"Try again", workers:"Active workers", openAi:"AI assistant", unnamed:"No entry" },
  cz: { title:"Kalendář pracovníků", week:"Kde pracují pracovníci?", back:"Předchozí týden", next:"Další týden", day:"Den", worker:"Pracovník", site:"Stavba", note:"Poznámka", none:"Žádné plány.", manage:"Upravit kalendář", ai:"AI – Administrátor", questions:"Otázky pracovníků", aiInfo:"AI informace o stavbách", activity:"Poslední záznamy", noQuestions:"Zatím žádné AI otázky.", noActivities:"Žádné nové záznamy.", open:"Spravovat otázky AI", allSites:"Stavby / záznamy", loading:"Načítání…", retry:"Zkusit znovu", workers:"Aktivní pracovníci", openAi:"AI asistent", unnamed:"Bez záznamu" },
};
const weekday = (iso: string, lang: AppLanguage) => new Date(iso + "T12:00:00Z").toLocaleDateString(
  lang === "ba" ? "bs-BA" : lang === "cz" ? "cs-CZ" : lang === "uz" ? "uz-UZ" : lang === "en" ? "en-GB" : "de-AT",
  { weekday:"short", day:"2-digit", month:"2-digit", timeZone:"UTC" });
const dateChange = (iso: string, days: number) => new Date(Date.parse(iso + "T12:00:00Z") + days * 86_400_000).toISOString().slice(0, 10);
const card: React.CSSProperties = { border: "1px solid #373737", borderRadius: 15, background:"#101010", padding:16, marginTop:16 };
const actions: React.CSSProperties = { color:"#fff", background:"#1e4770", borderRadius:9, padding:"9px 12px", textDecoration:"none", fontSize:13, fontWeight:700, border:"1px solid #57718a", cursor:"pointer", display:"inline-block" };

export default function AdminDashboardExtras() {
  const [lang, setLang] = useState<AppLanguage>("de");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const update = () => setLang(readAppLanguage("de"));
    update();
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);
  const load = useCallback(async (selected: string | null, signal: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/dashboard-overview" + (selected ? "?start=" + encodeURIComponent(selected) : ""), {
        credentials:"same-origin", cache:"no-store", signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Fehler");
      setOverview(data as Overview);
      if (!selected) setStart((data as Overview).start);
    } catch (e) {
      if (!signal.aborted) setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const ctrl = new AbortController();
    void load(start, ctrl.signal);
    return () => ctrl.abort();
  }, [start, load]);
  const t = words[lang] || words.de;
  const shift = (days: number) => {
    if (overview) setStart(dateChange(overview.start, days));
  };
  return (
    <section aria-label={t.title} style={{marginTop:24, maxWidth:1100}}>
      <div style={card}>
        <h2 style={{margin:"0 0 6px", fontSize:23, color:"#f97316"}}>📅 {t.title}</h2>
        <p style={{margin:"0 0 13px",color:"#ccc"}}>{t.week}</p>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap",marginBottom:14}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button type="button" style={actions} onClick={() => shift(-7)} disabled={!overview || loading}>{t.back}</button>
            <button type="button" style={actions} onClick={() => shift(7)} disabled={!overview || loading}>{t.next}</button>
          </div>
          <Link href="/kalendar" style={{...actions,background:"#c26021"}}>+ {t.manage}</Link>
        </div>
        {error ? <p role="alert" style={{color:"#fca5a5"}}>{error} <button type="button" style={actions} onClick={() => {setStart(null);setOverview(null)}}>{t.retry}</button></p> : null}
        {loading && !overview ? <p>{t.loading}</p> : null}
        {overview ? <div style={{overflowX:"auto"}}>
          <table style={{borderCollapse:"collapse",width:"100%",minWidth:490,fontSize:14}}>
            <thead><tr style={{color:"#f97316",borderBottom:"1px solid #555",textAlign:"left"}}>
              <th style={{padding:9,width:100}}>{t.day}</th>
              <th style={{padding:9}}>{t.worker}</th><th style={{padding:9}}>{t.site}</th><th style={{padding:9}}>{t.note}</th>
            </tr></thead>
            <tbody>{overview.week.map((day) => {
              const rows = overview.rows.filter(row => row.date === day);
              return rows.length ? rows.map((entry, i) => (
                <tr key={entry.id} style={{borderBottom:"1px solid #292929",background:day===overview.today?"#231c12":"transparent"}}>
                  <td style={{padding:9,whiteSpace:"nowrap",fontWeight:700}}>{i===0?weekday(day,lang):""}</td>
                  <td style={{padding:9}}>{entry.worker}</td>
                  <td style={{padding:9}}>{entry.site}{entry.location ? <small style={{display:"block",color:"#aaa"}}>{entry.location}</small>:null}</td>
                  <td style={{padding:9,color:"#ccc"}}>{entry.note}</td>
                </tr>
              )) : <tr key={day} style={{borderBottom:"1px solid #292929"}}>
                <td style={{padding:9,fontWeight:700}}>{weekday(day,lang)}</td>
                <td colSpan={3} style={{padding:9,color:"#888"}}>{t.none}</td>
              </tr>;
            })}</tbody>
          </table>
          <p style={{margin:"12px 0 0",color:"#aaa",fontSize:12}}>{t.workers}: {overview.workerCount}</p>
        </div> : null}
      </div>
      <div style={card}>
        <h2 style={{margin:"0 0 12px",fontSize:22,color:"#f97316"}}>🤖 {t.ai}</h2>
        <div style={{display:"flex",gap:9,flexWrap:"wrap",marginBottom:14}}>
          <Link href="/admin/ai-pitanja" style={actions}>{t.open}</Link>
          <Link href="/admin/ai-unosi" style={{...actions,background:"#8d4b17"}}>+ AI Baustellen-Info</Link>
          <Link href="/assistant" style={actions}>{t.openAi}</Link>
          <Link href="/baustellen" style={actions}>{t.allSites}</Link>
        </div>
        <h3 style={{fontSize:16,margin:"12px 0",color:"#ddd"}}>{t.questions}</h3>
        {overview?.aiQuestions.length ? overview.aiQuestions.slice(0,5).map(q=><div key={q.id} style={{padding:"9px 0",borderTop:"1px solid #303030"}}>
          <strong>{q.worker}</strong><span style={{color:"#aaa",fontSize:12,marginLeft:8}}>{q.at ? new Date(q.at).toLocaleDateString("de-AT") : ""}</span>
          <p style={{margin:"4px 0",whiteSpace:"pre-wrap"}}>{q.question}</p>
        </div>) : <p style={{color:"#888"}}>{t.noQuestions}</p>}
        <h3 style={{fontSize:16,margin:"15px 0 8px",color:"#ddd"}}>{t.aiInfo}</h3>
        {overview?.aiInfo.length ? overview.aiInfo.slice(0,6).map(q=><div key={q.id} style={{padding:"7px 0",borderTop:"1px solid #303030"}}>
          <strong>{q.site}</strong> – {q.title} <span style={{color:"#aaa",fontSize:12}}>({q.status})</span>
        </div>) : <p style={{color:"#888"}}>{t.unnamed}</p>}
      </div>
      <div style={card}>
        <h2 style={{margin:"0 0 12px",fontSize:22,color:"#f97316"}}>📋 {t.activity}</h2>
        {overview?.activities.length ? overview.activities.map(a=><div key={a.id} style={{padding:"9px 0",borderTop:"1px solid #303030"}}>
          <strong>{a.title}</strong> – {a.site}
          <span style={{display:"block",color:"#aaa",fontSize:12}}>{a.actor} · {a.at ? new Date(a.at).toLocaleString("de-AT") : ""}</span>
          <span style={{fontSize:13}}>{a.detail}</span>
        </div>) : <p style={{color:"#888"}}>{t.noActivities}</p>}
      </div>
    </section>
  );
}
