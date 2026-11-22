"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { readAppLanguage, type AppLanguage } from "../lib/language";
import "./original-dashboard.css";

type Assignment = { id: string; date: string; worker: string; site: string; siteId: string | null; location: string; note: string; startTime?: string|null; endTime?: string|null; task?: string|null; priority?: string|null; responsible?: string|null; planStatus?: string|null; teamNote?: string|null };
type Question = { id: string; worker: string; question: string; at: string };
type DailyActivity = { id: string; type: "photo" | "hours" | "work" | "material"; at: string; actor: string; site: string; siteId: number | null; title: string; detail: string };
type Overview = { week: string[]; start: string; end: string; today: string; rows: Assignment[]; workerCount: number; aiQuestions: Question[]; dailyActivities: DailyActivity[];
  dayCounts: { photo: number; hours: number; work: number; material: number } };

const labels = {
  de: { calendar: "Wochenplan (Mo–Sa)", openCalendar: "Kalender öffnen", worker: "Mitarbeiter", noPlans: "Für diese Woche sind keine Einsätze eingetragen.", today: "Heutige Einträge", photo: "Fotos", hours: "Arbeitszeit", work: "Produktivität", material: "Material", noToday: "Heute noch keine Einträge.", questions: "APP FRAGEN – Übersicht", recent: "Letzte Gespräche. Offene Fragen bitte unter APP FRAGEN beantworten.", manage: "APP FRAGEN", inputs: "KI-Baustelleninfos", older: "Vorherige Woche", newer: "Nächste Woche", loading: "Wird geladen…", empty: "Noch keine Fragen.", back: "←", next: "→" },
  ba: { calendar: "Sedmični raspored (pon–sub)", openCalendar: "Otvori kalendar", worker: "Radnik", noPlans: "Nema upisanih rasporeda za ovu sedmicu.", today: "Današnja dodavanja", photo: "Slika", hours: "Radno vrijeme", work: "Produktivnost", material: "Materijal", noToday: "Danas nema novih unosa.", questions: "APP PITANJA – pregled", recent: "Posljednji razgovori. Status neriješenih pitanja provjeri u APP PITANJA.", manage: "APP PITANJA", inputs: "AI unosi gradilišta", older: "Prethodna sedmica", newer: "Sljedeća sedmica", loading: "Učitavanje…", empty: "Još nema pitanja.", back: "←", next: "→" },
  uz: { calendar: "Haftalik jadval (Du–Sh)", openCalendar: "Taqvimni ochish", worker: "Ishchi", noPlans: "Bu hafta rejalar yo‘q.", today: "Bugungi kiritmalar", photo: "Surat", hours: "Ish vaqti", work: "Unumdorlik", material: "Material", noToday: "Bugun maʼlumot yoʻq.", questions: "APP SAVOLLAR – Ko‘rish", recent: "Oxirgi savollar va javoblar.", manage: "APP SAVOLLAR", inputs: "AI obyekt maʼlumotlari", older: "Oldingi hafta", newer: "Keyingi hafta", loading: "Yuklanmoqda…", empty: "Savollar yo‘q.", back: "←", next: "→" },
  cz: { calendar: "Týdenní rozvrh (Po–So)", openCalendar: "Otevřít kalendář", worker: "Pracovník", noPlans: "Žádné pracovní plány.", today: "Dnešní záznamy", photo: "Fotografie", hours: "Pracovní hodiny", work: "Produktivita", material: "Materiál", noToday: "Dnes žádné záznamy.", questions: "APP DOTAZY – přehled", recent: "Poslední rozhovory a otázky.", manage: "APP DOTAZY", inputs: "AI informace o stavbách", older: "Předchozí týden", newer: "Další týden", loading: "Načítání…", empty: "Žádné dotazy.", back: "←", next: "→" },
  en: { calendar: "Weekly schedule (Mon–Sat)", openCalendar: "Open calendar", worker: "Worker", noPlans: "No assignments this week.", today: "Today's additions", photo: "Photos", hours: "Work hours", work: "Productivity", material: "Material", noToday: "No entries today.", questions: "APP QUESTIONS – overview", recent: "Recent conversations and unanswered questions.", manage: "APP QUESTIONS", inputs: "AI site entries", older: "Previous week", newer: "Next week", loading: "Loading…", empty: "No questions yet.", back: "←", next: "→" },
};
const datePlus = (iso: string, days: number) => new Date(Date.parse(iso + "T12:00:00Z") + days * 86_400_000).toISOString().slice(0, 10);
const weekdays: Record<AppLanguage, string[]> = {
  de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa"], ba: ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub"],
  uz: ["Du", "Se", "Ch", "Pa", "Ju", "Sh"], cz: ["Po", "Út", "St", "Čt", "Pá", "So"], en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};
const showTime = (date: string) => new Date(date).toLocaleTimeString("de-AT", { timeZone: "Europe/Vienna", hour: "2-digit", minute: "2-digit" });
const showDate = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("de-AT", { timeZone: "UTC" });

export default function AdminDashboardExtras({ language }: { language?: AppLanguage }) {
  const [lang, setLang] = useState<AppLanguage>("de");
  const [schedule, setSchedule] = useState<Overview | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const read = () => setLang(readAppLanguage("de"));
    read();
    window.addEventListener("storage", read);
    window.addEventListener("solstone-language-change", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("solstone-language-change", read);
    };
  }, []);
  const load = useCallback(async (start: string | null, signal: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const result = await fetch("/api/admin/dashboard-overview" + (start ? "?start=" + encodeURIComponent(start) : ""), { credentials: "same-origin", cache: "no-store", signal });
      const data = await result.json();
      if (!result.ok) throw Error(data.error || "Kalender nicht verfügbar");
      if (!signal.aborted) {
        setSchedule(data as Overview);
        setDate(data.start);
      }
    } catch (ex) {
      if (!signal.aborted) setError(ex instanceof Error ? ex.message : "Fehler");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const ctrl = new AbortController();
    void load(date, ctrl.signal);
    return () => ctrl.abort();
  }, [date, load]);
  const workers = useMemo(() => [...new Set((schedule?.rows || []).map(r => r.worker).filter(Boolean))].sort((a,b) => a.localeCompare(b, "de-AT")), [schedule]);
  const activeLang = language ?? lang;
  const t = labels[activeLang] || labels.de;
  const week = schedule?.week || [];
  const count = schedule?.dayCounts || { photo:0, hours:0, work:0, material:0 };
  const activities = schedule?.dailyActivities || [];
  const questions = schedule?.aiQuestions || [];
  return (
    <div className="solstone-original-overview">
      <div className="solstone-original-duo">
        <section className="solstone-original-panel solstone-original-week">
          <header className="solstone-panel-head">
            <strong>📅 {t.calendar}</strong>
            <div className="solstone-panel-actions">
              <button type="button" onClick={() => schedule && setDate(datePlus(schedule.start,-7))} title={t.older} aria-label={t.older} disabled={!schedule || loading}>‹</button>
              <button type="button" onClick={() => schedule && setDate(datePlus(schedule.start,7))} title={t.newer} aria-label={t.newer} disabled={!schedule || loading}>›</button>
              <Link href="/kalendar">{t.openCalendar}</Link>
            </div>
          </header>
          {error && <p role="alert" className="solstone-small-error">{error}</p>}
          {loading && !schedule && <p className="solstone-small-muted">{t.loading}</p>}
          {schedule && <div className="solstone-week-scroll"><table className="solstone-week-table">
            <thead><tr><th>{t.worker}</th>{week.map((day,i)=><th key={day} className={day===schedule.today?"selected-day":""}>{weekdays[activeLang][i]} {day.slice(8,10)}.{day.slice(5,7)}.</th>)}</tr></thead>
            <tbody>{workers.length ? workers.map(worker => <tr key={worker}>
              <th scope="row">{worker}</th>
              {week.map(day => <td key={day} className={day===schedule.today?"selected-day":""}>
                {schedule.rows.filter(r => r.worker===worker && r.date===day).map(r =>
                  r.siteId ? <Link key={r.id} className="solstone-cell-site" href={"/baustellen/"+encodeURIComponent(r.siteId)}>
                    <strong>{r.site}</strong>{r.location && <small>{r.location}</small>}{(r.startTime||r.endTime) && <small>⏰ {r.startTime?.slice(0,5)||"?"}–{r.endTime?.slice(0,5)||"?"}</small>}{r.task && <small>{r.task}</small>}{r.planStatus && <small>{r.planStatus==="confirmed"?"✓":"◌"} {r.planStatus}</small>}{r.note && <small>{r.note}</small>}
                  </Link> : <span key={r.id} className="solstone-cell-site"><strong>{r.site}</strong></span>)}
              </td>)}
            </tr>) : <tr><td colSpan={7} className="solstone-small-muted">{t.noPlans}</td></tr>}</tbody>
          </table></div>}
        </section>
        <section className="solstone-original-panel solstone-original-daily">
          <header className="solstone-panel-head"><strong>📝 {t.today} – {schedule ? showDate(schedule.today) : ""}</strong></header>
          <div className="solstone-daily-counters">
            <span>🖼️ {t.photo}: <b>{count.photo}</b></span>
            <span>⏱️ {t.hours}: <b>{count.hours}</b></span>
            <span>🧱 {t.work}: <b>{count.work}</b></span>
            <span>📦 {t.material}: <b>{count.material}</b></span>
          </div>
          <div className="solstone-daily-feed">
            {activities.map(a=><div key={a.id} className={"solstone-daily-entry type-"+a.type}>
              <time>{showTime(a.at)}</time>
              <div><strong>{a.type==="photo"?"🖼️":a.type==="hours"?"⏱️":a.type==="work"?"🧱":"📦"} {a.title}</strong>
                <div>{a.siteId ? <Link href={"/baustellen/"+encodeURIComponent(a.siteId)}>{a.site}</Link> : a.site} {a.actor ? "· "+a.actor:""}</div>
                {a.detail && <small>{a.detail}</small>}
              </div>
            </div>)}
            {!activities.length && <p className="solstone-small-muted">{loading ? t.loading : t.noToday}</p>}
          </div>
          <small className="solstone-panel-footnote">Klick auf einen Eintrag öffnet die Baustelle.</small>
        </section>
      </div>
      <section className="solstone-original-panel solstone-original-questions">
        <header className="solstone-panel-head">
          <strong>💬 {t.questions}</strong>
          <div className="solstone-panel-actions">
            <Link href="/admin/ai-pitanja">{t.manage}</Link>
            <Link href="/admin/ai-unosi">{t.inputs}</Link>
          </div>
        </header>
        <p className="solstone-small-muted">{t.recent}</p>
        {questions.length ? questions.slice(0,8).map(q=><Link href="/admin/ai-pitanja" key={q.id} className="solstone-question-line">
          <strong>{q.worker}</strong>
          <span>{q.question}</span>
        </Link>) : <p className="solstone-small-muted">{t.empty}</p>}
      </section>
    </div>
  );
}
