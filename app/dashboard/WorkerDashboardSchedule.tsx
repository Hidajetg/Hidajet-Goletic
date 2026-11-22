"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { type AppLanguage, readAppLanguage } from "../lib/language";
import "./original-dashboard.css";

type Assignment = {
  id: string; date: string; worker: string; mine: boolean;
  siteId: string | null; site: string; location: string; note: string;
};
type WeekData = {
  today: string; start: string; end: string; week: string[];
  currentWorker: string; rows: Assignment[];
};

const labels: Record<AppLanguage, {
  title: string; worker: string; previous: string; next: string;
  calendar: string; noWork: string; loading: string; refresh: string;
  own: string; colleagues: string;
}> = {
  de: { title: "Wochenplan (Mo–Sa)", worker: "Mitarbeiter", previous: "Vorherige Woche",
    next: "Nächste Woche", calendar: "Kalender öffnen", noWork: "Keine Einsätze eingetragen.",
    loading: "Wird geladen…", refresh: "Erneut versuchen", own: "Mein Plan",
    colleagues: "Kollegen auf meiner Baustelle" },
  ba: { title: "Sedmični raspored (pon–sub)", worker: "Radnik", previous: "Prethodna sedmica",
    next: "Sljedeća sedmica", calendar: "Otvori kalendar", noWork: "Nema upisanog rasporeda.",
    loading: "Učitavanje…", refresh: "Pokušaj ponovo", own: "Moj raspored",
    colleagues: "Kolege na mom gradilištu" },
  uz: { title: "Haftalik jadval (Du–Sh)", worker: "Ishchi", previous: "Oldingi hafta",
    next: "Keyingi hafta", calendar: "Taqvimni ochish", noWork: "Jadval yo‘q.",
    loading: "Yuklanmoqda…", refresh: "Qayta urinish", own: "Mening jadvalim",
    colleagues: "Obyektimdagi hamkasblar" },
  cz: { title: "Týdenní rozvrh (Po–So)", worker: "Pracovník", previous: "Předchozí týden",
    next: "Další týden", calendar: "Otevřít kalendář", noWork: "Žádné přidělené práce.",
    loading: "Načítání…", refresh: "Zkusit znovu", own: "Můj rozvrh",
    colleagues: "Kolegové na mé stavbě" },
  en: { title: "Weekly schedule (Mon–Sat)", worker: "Worker", previous: "Previous week",
    next: "Next week", calendar: "Open calendar", noWork: "No work assigned.",
    loading: "Loading…", refresh: "Try again", own: "My schedule",
    colleagues: "Colleagues on my site" },
};
const weekday: Record<AppLanguage, string[]> = {
  de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa"],
  ba: ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub"],
  uz: ["Du", "Se", "Ch", "Pa", "Ju", "Sh"],
  cz: ["Po", "Út", "St", "Čt", "Pá", "So"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};
function advance(iso: string, days: number) {
  return new Date(Date.parse(iso + "T12:00:00Z") + days * 86_400_000)
    .toISOString().slice(0, 10);
}

export default function WorkerDashboardSchedule() {
  const [lang, setLang] = useState<AppLanguage>("de");
  const [selected, setSelected] = useState<string | null>(null);
  const [data, setData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const update = () => setLang(readAppLanguage("de"));
    update();
    window.addEventListener("solstone-language-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("solstone-language-change", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const url = "/api/worker/dashboard-schedule" +
      (selected ? "?start=" + encodeURIComponent(selected) : "");
    void fetch(url, { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async response => {
        const json = await response.json();
        if (!response.ok) throw Error(json?.error || "Raspored nije dostupan.");
        if (!controller.signal.aborted) setData(json as WeekData);
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Raspored nije dostupan.");
          setData(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [selected, retry]);

  const people = useMemo(() => {
    if (!data) return [];
    // Self first, then ONLY those colleagues disclosed by the server.
    return [
      data.currentWorker,
      ...Array.from(new Set(data.rows.filter(r => !r.mine).map(r => r.worker)))
        .sort((a, b) => a.localeCompare(b, "de-AT")),
    ];
  }, [data]);

  const t = labels[lang];
  const shift = (days: number) => {
    if (data) setSelected(advance(data.start, days));
  };

  return <section className="solstone-original-overview solstone-worker-overview" aria-label={t.title}
    style={{ marginTop: 17, paddingBottom: 20 }}>
    <div className="solstone-original-panel solstone-original-week">
      <header className="solstone-panel-head">
        <strong>📅 {t.title}</strong>
        <div className="solstone-panel-actions">
          <button type="button" onClick={() => shift(-7)}
            title={t.previous} aria-label={t.previous} disabled={!data || loading}>‹</button>
          <button type="button" onClick={() => shift(7)}
            title={t.next} aria-label={t.next} disabled={!data || loading}>›</button>
          <Link href="/kalendar">{t.calendar}</Link>
        </div>
      </header>
      {error && <p role="alert" className="solstone-small-error">{error}{" "}
        <button type="button" onClick={() => setRetry(n => n + 1)}
          style={{ background: "#223c5c", color: "white", border: "1px solid #57718a",
            borderRadius: 5, padding: "4px 8px", cursor: "pointer" }}>{t.refresh}</button>
      </p>}
      {loading && !data && <p className="solstone-small-muted">{t.loading}</p>}
      {data && <div className="solstone-week-scroll">
        <table className="solstone-week-table">
          <thead><tr>
            <th>{t.worker}</th>
            {data.week.map((day, index) => <th key={day}
              className={day === data.today ? "selected-day" : ""}>
              {weekday[lang][index]} {day.slice(8, 10)}.{day.slice(5, 7)}.
            </th>)}
          </tr></thead>
          <tbody>{people.map((person) =>
            <tr key={person}>
              <th scope="row">{person}</th>
              {data.week.map(day => <td key={day}
                className={day === data.today ? "selected-day" : ""}>
                {data.rows.filter(row => row.worker === person && row.date === day)
                  .map(row => row.siteId ?
                    <Link href={"/baustellen/" + encodeURIComponent(row.siteId)}
                      className="solstone-cell-site" key={row.id}
                      >
                      <strong>{row.site}</strong>
                      {row.location && <small>{row.location}</small>}
                      {row.note && <small>{row.note}</small>}
                    </Link> :
                    <span className="solstone-cell-site" key={row.id}>
                      <strong>{row.site}</strong>{row.note && <small>{row.note}</small>}
                    </span>)}
              </td>)}
            </tr>)}
          </tbody>
        </table>
        {!data.rows.length && <p className="solstone-small-muted">{t.noWork}</p>}
      </div>}
    </div>
  </section>;
}
