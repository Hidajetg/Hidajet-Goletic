"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Lang = "de" | "ba" | "en" | "uz";

type Projekt = {
  id: number | string;
  name?: string | null;
  naziv?: string | null;
  title?: string | null;
  projekt?: string | null;
  baustelle_name?: string | null;
  ort?: string | null;
  mjesto?: string | null;
  location?: string | null;
  adresse?: string | null;
  address?: string | null;
  info?: string | null;
  beschreibung?: string | null;
  description?: string | null;
  google_location?: string | null;
  google_maps?: string | null;
  google_maps_url?: string | null;
  [key: string]: any;
};

const t: Record<Lang, any> = {
  de: {
    app: "Arbeiter Mobile App",
    language: "Sprache",
    worker: "Angemeldeter Arbeiter",
    noWorker:
      "Kein Arbeiter angemeldet. Bitte zuerst über Login mit PIN anmelden.",
    date: "Datum",
    siteInfo: "Baustelleninfo",
    location: "Standort öffnen",
    workTime: "Arbeitszeit",
    photos: "Fotos",
    performance: "Leistung",
    regie: "Regie / Zusatzarbeit",
    todayEntries: "Heutige Übersicht",
    noEntries: "Keine Einträge für heute.",
    hours: "Stunden",
    room: "Raum",
    position: "LV Position",
    signed: "Unterschrieben",
    waiting: "Wartet",
    open: "Öffnen",
    control: "Kontrolle",
    controlText:
      "Jeder Eintrag wird automatisch auf den angemeldeten Arbeiter gespeichert.",
  },
  ba: {
    app: "Radnik Mobile / unos radnika",
    language: "Jezik",
    worker: "Prijavljeni radnik",
    noWorker:
      "Radnik nije prijavljen. Prvo se prijavi preko Login stranice sa PIN kodom.",
    date: "Datum",
    siteInfo: "Info baustele",
    location: "Otvori lokaciju",
    workTime: "Radno vrijeme",
    photos: "Slike",
    performance: "Urađeni posao",
    regie: "Regie / dodatni rad",
    todayEntries: "Današnji pregled",
    noEntries: "Nema unosa za danas.",
    hours: "Sati",
    room: "Prostorija",
    position: "LV pozicija",
    signed: "Potpisano",
    waiting: "Čeka",
    open: "Otvori",
    control: "Kontrola",
    controlText:
      "Svaki unos se automatski sprema na radnika koji je prijavljen.",
  },
  en: {
    app: "Worker Mobile App",
    language: "Language",
    worker: "Logged-in worker",
    noWorker:
      "No worker is logged in. Please log in first with PIN on the Login page.",
    date: "Date",
    siteInfo: "Site info",
    location: "Open location",
    workTime: "Work time",
    photos: "Photos",
    performance: "Work performance",
    regie: "Extra work / Regie",
    todayEntries: "Today overview",
    noEntries: "No entries for today.",
    hours: "Hours",
    room: "Room",
    position: "LV position",
    signed: "Signed",
    waiting: "Waiting",
    open: "Open",
    control: "Control",
    controlText:
      "Every entry is automatically saved under the logged-in worker.",
  },
  uz: {
    app: "Ishchi Mobile App",
    language: "Til",
    worker: "Kirilgan ishchi",
    noWorker:
      "Ishchi tizimga kirmagan. Avval Login sahifasida PIN bilan kiring.",
    date: "Sana",
    siteInfo: "Obyekt maʼlumoti",
    location: "Lokatsiyani ochish",
    workTime: "Ish vaqti",
    photos: "Rasmlar",
    performance: "Bajarilgan ish",
    regie: "Qo‘shimcha ish / Regie",
    todayEntries: "Bugungi nazorat",
    noEntries: "Bugun yozuv yo‘q.",
    hours: "Soat",
    room: "Xona",
    position: "LV pozitsiya",
    signed: "Imzolangan",
    waiting: "Kutilmoqda",
    open: "Ochish",
    control: "Nazorat",
    controlText:
      "Har bir yozuv avtomatik ravishda kirgan ishchi nomiga saqlanadi.",
  },
};

export default function RadnikStartPage() {
  const params = useParams();

  const projektId = String(params.id);
  const projektIdValue = isNaN(Number(projektId))
    ? projektId
    : Number(projektId);

  const [lang, setLang] = useState<Lang>("ba");
  const [worker, setWorker] = useState("");
  const [datum, setDatum] = useState(today());

  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [leistungen, setLeistungen] = useState<any[]>([]);
  const [regieRows, setRegieRows] = useState<any[]>([]);
  const [fotos, setFotos] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    const savedLang = getSavedLanguage();
    const loggedWorker = getLoggedWorker();

    setLang(savedLang);
    setWorker(loggedWorker);

    if (loggedWorker) {
      saveWorkerEverywhere(loggedWorker);
    }

    loadAll(loggedWorker, datum);
  }, [projektId]);

  function today() {
    const d = new Date();

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function getSavedLanguage(): Lang {
    const value =
      localStorage.getItem("appLanguage") ||
      localStorage.getItem("lang") ||
      localStorage.getItem("language") ||
      "ba";

    if (["de", "ba", "en", "uz"].includes(value)) {
      return value as Lang;
    }

    return "ba";
  }

  function getLoggedWorker() {
    const direct =
      localStorage.getItem("worker_name") ||
      localStorage.getItem("workerName") ||
      localStorage.getItem("radnik") ||
      localStorage.getItem("userName") ||
      localStorage.getItem("name") ||
      localStorage.getItem("worker") ||
      localStorage.getItem("mitarbeiter") ||
      localStorage.getItem("logged_worker") ||
      localStorage.getItem("loggedWorker") ||
      localStorage.getItem("current_worker") ||
      localStorage.getItem("username") ||
      "";

    if (direct) return direct;

    const jsonKeys = ["user", "currentUser", "loggedUser", "sessionUser"];

    for (const key of jsonKeys) {
      try {
        const raw = localStorage.getItem(key);

        if (!raw) continue;

        const parsed = JSON.parse(raw);

        const name =
          parsed?.worker_name ||
          parsed?.workerName ||
          parsed?.name ||
          parsed?.userName ||
          parsed?.radnik ||
          parsed?.worker ||
          "";

        if (name) return String(name);
      } catch {}
    }

    return "";
  }

  function saveWorkerEverywhere(name: string) {
    localStorage.setItem("worker_name", name);
    localStorage.setItem("workerName", name);
    localStorage.setItem("radnik", name);
    localStorage.setItem("userName", name);
    localStorage.setItem("name", name);
  }

  function tr(key: string) {
    return t[lang]?.[key] || t.ba[key] || key;
  }

  function changeLang(next: Lang) {
    setLang(next);
    localStorage.setItem("appLanguage", next);
    localStorage.setItem("lang", next);
    localStorage.setItem("language", next);
  }

  function changeDatum(next: string) {
    setDatum(next);
    loadAll(worker, next);
  }

  function getProjektName() {
    if (!projekt) return `Projekt ${projektId}`;

    return (
      projekt.name ||
      projekt.naziv ||
      projekt.title ||
      projekt.projekt ||
      projekt.baustelle_name ||
      `Projekt ${projekt.id}`
    );
  }

  function getProjektOrt() {
    if (!projekt) return "";

    return (
      projekt.ort ||
      projekt.mjesto ||
      projekt.location ||
      projekt.adresse ||
      projekt.address ||
      ""
    );
  }

  function getInfo() {
    if (!projekt) return "";

    return projekt.info || projekt.beschreibung || projekt.description || "";
  }

  function getMapUrl() {
    if (!projekt) return "";

    const value =
      projekt.google_location ||
      projekt.google_maps ||
      projekt.google_maps_url ||
      projekt.adresse ||
      projekt.address ||
      "";

    if (!value) return "";

    if (String(value).startsWith("http")) {
      return String(value);
    }

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      String(value)
    )}`;
  }

  function toNumber(value: any) {
    const n = Number(String(value || "0").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function formatHours(value: any) {
    return `${toNumber(value).toFixed(2).replace(".", ",")} h`;
  }

  function getWorker(row: any) {
    return (
      row.radnik ||
      row.arbeiter ||
      row.worker ||
      row.worker_name ||
      row.mitarbeiter ||
      row.name ||
      ""
    );
  }

  function getHours(row: any) {
    return row.stunden || row.hours || row.total_hours || 0;
  }

  function getLeistungTitle(row: any) {
    return (
      row.arbeit ||
      row.titel ||
      row.title ||
      row.leistung ||
      row.position_titel ||
      "Leistung"
    );
  }

  function getRegieTitle(row: any) {
    return row.arbeit || row.title || row.regiearbeit || row.beschreibung || "Regie";
  }

  async function loadAll(workerName = worker, dateValue = datum) {
    setLoading(true);
    setErrorText("");

    await loadProjekt();
    await loadArbeitszeiten(workerName, dateValue);
    await loadLeistungen(workerName, dateValue);
    await loadRegie(workerName, dateValue);
    await loadFotos(workerName, dateValue);

    setLoading(false);
  }

  async function loadProjekt() {
    const tables = ["projekte", "baustellen"];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", projektIdValue)
        .maybeSingle();

      if (!error && data) {
        setProjekt(data as Projekt);
        return;
      }
    }

    setProjekt(null);
  }

  async function loadArbeitszeiten(workerName: string, dateValue: string) {
    const { data, error } = await supabase
      .from("arbeitszeiten")
      .select("*")
      .eq("projekt_id", String(projektId))
      .eq("datum", dateValue)
      .order("created_at", { ascending: false });

    if (error) {
      setArbeitszeiten([]);
      return;
    }

    const w = String(workerName || "").toLowerCase();

    setArbeitszeiten(
      (data || []).filter((row: any) => {
        return !w || String(getWorker(row)).toLowerCase() === w;
      })
    );
  }

  async function loadLeistungen(workerName: string, dateValue: string) {
    const { data, error } = await supabase
      .from("leistungen")
      .select("*")
      .eq("projekt_id", String(projektId))
      .eq("datum", dateValue)
      .order("created_at", { ascending: false });

    if (error) {
      setLeistungen([]);
      return;
    }

    const w = String(workerName || "").toLowerCase();

    setLeistungen(
      (data || []).filter((row: any) => {
        return !w || String(getWorker(row)).toLowerCase() === w;
      })
    );
  }

  async function loadRegie(workerName: string, dateValue: string) {
    const { data, error } = await supabase
      .from("regie")
      .select("*")
      .eq("projekt_id", String(projektId))
      .eq("datum", dateValue)
      .order("created_at", { ascending: false });

    if (error) {
      setRegieRows([]);
      return;
    }

    const w = String(workerName || "").toLowerCase();

    setRegieRows(
      (data || []).filter((row: any) => {
        return (
          !w ||
          String(row.workers_text || row.worker_names || row.radnik || "")
            .toLowerCase()
            .includes(w)
        );
      })
    );
  }

  async function loadFotos(workerName: string, dateValue: string) {
    const { data, error } = await supabase
      .from("fotos")
      .select("*")
      .eq("projekt_id", String(projektId))
      .eq("datum", dateValue)
      .order("created_at", { ascending: false });

    if (error) {
      setFotos([]);
      return;
    }

    const w = String(workerName || "").toLowerCase();

    setFotos(
      (data || []).filter((row: any) => {
        return !w || String(getWorker(row)).toLowerCase() === w;
      })
    );
  }

  const totalHours = useMemo(() => {
    return arbeitszeiten.reduce((sum, row) => {
      return sum + toNumber(getHours(row));
    }, 0);
  }, [arbeitszeiten]);

  const canOpenWorkerPages = Boolean(worker);

  return (
    <main className="page">
      <section className="hero">
        <p className="label">{tr("app")}</p>
        <h1>{getProjektName()}</h1>
        <p className="subtitle">{getProjektOrt()}</p>
      </section>

      {errorText && <div className="errorBox">{errorText}</div>}

      <section className="panel">
        <label>{tr("language")}</label>

        <div className="langGrid">
          {(["de", "ba", "en", "uz"] as Lang[]).map((x) => (
            <button
              key={x}
              className={lang === x ? "active" : ""}
              onClick={() => changeLang(x)}
              type="button"
            >
              {x.toUpperCase()}
            </button>
          ))}
        </div>

        <label>{tr("worker")}</label>

        {worker ? (
          <div className="workerBox">👷 {worker}</div>
        ) : (
          <div className="warningBox">{tr("noWorker")}</div>
        )}

        <label>{tr("date")}</label>

        <input
          type="date"
          value={datum}
          onChange={(e) => changeDatum(e.target.value)}
        />

        {getInfo() && (
          <div className="infoBox">
            <b>{tr("siteInfo")}</b>
            <p>{getInfo()}</p>
          </div>
        )}

        {getMapUrl() && (
          <a
            className="mapBtn"
            href={getMapUrl()}
            target="_blank"
            rel="noreferrer"
          >
            📍 {tr("location")}
          </a>
        )}
      </section>

      <section className="controlBox">
        <h2>{tr("control")}</h2>
        <p>{tr("controlText")}</p>
      </section>

      <section className="menuGrid">
        {canOpenWorkerPages ? (
          <>
            <Link href={`/projekte/radnik/${projektId}/arbeitszeit`}>
              <strong>⏱️</strong>
              <span>{tr("workTime")}</span>
            </Link>

            <Link href={`/projekte/radnik/${projektId}/leistung`}>
              <strong>📐</strong>
              <span>{tr("performance")}</span>
            </Link>

            <Link href={`/projekte/radnik/${projektId}/regie`}>
              <strong>📝</strong>
              <span>{tr("regie")}</span>
            </Link>

            <Link href={`/projekte/radnik/${projektId}/fotos`}>
              <strong>📸</strong>
              <span>{tr("photos")}</span>
            </Link>
          </>
        ) : (
          <>
            <div className="disabledCard">
              <strong>⏱️</strong>
              <span>{tr("workTime")}</span>
            </div>

            <div className="disabledCard">
              <strong>📐</strong>
              <span>{tr("performance")}</span>
            </div>

            <div className="disabledCard">
              <strong>📝</strong>
              <span>{tr("regie")}</span>
            </div>

            <div className="disabledCard">
              <strong>📸</strong>
              <span>{tr("photos")}</span>
            </div>
          </>
        )}
      </section>

      <section className="todayBox">
        <div className="todayTop">
          <h2>{tr("todayEntries")}</h2>
          <button onClick={() => loadAll(worker, datum)} type="button">
            {loading ? "..." : "↻"}
          </button>
        </div>

        <div className="stats">
          <div>
            <span>{tr("hours")}</span>
            <strong>{formatHours(totalHours)}</strong>
          </div>

          <div>
            <span>{tr("performance")}</span>
            <strong>{leistungen.length}</strong>
          </div>

          <div>
            <span>{tr("regie")}</span>
            <strong>{regieRows.length}</strong>
          </div>

          <div>
            <span>{tr("photos")}</span>
            <strong>{fotos.length}</strong>
          </div>
        </div>

        {!loading &&
        arbeitszeiten.length === 0 &&
        leistungen.length === 0 &&
        regieRows.length === 0 &&
        fotos.length === 0 ? (
          <p className="empty">{tr("noEntries")}</p>
        ) : (
          <div className="entryList">
            {arbeitszeiten.map((row: any) => (
              <div key={`a-${row.id}`}>
                <b>{tr("workTime")}</b>

                <span>
                  {row.start_time || row.start || "-"} -{" "}
                  {row.end_time || row.end || "-"} · {formatHours(getHours(row))}
                </span>

                <small>
                  {tr("room")}: {row.raum_name || row.room_name || "-"} ·{" "}
                  {tr("position")}: {row.position_nr || row.lv_nr || "-"}
                </small>
              </div>
            ))}

            {leistungen.map((row: any) => (
              <div key={`l-${row.id}`}>
                <b>{tr("performance")}</b>

                <span>
                  {getLeistungTitle(row)} · {row.menge || row.quantity || 0}{" "}
                  {row.einheit || row.unit || ""}
                </span>

                <small>
                  {tr("room")}: {row.raum_name || row.room_name || "-"} ·{" "}
                  {tr("position")}: {row.position_nr || row.lv_nr || "-"}
                </small>
              </div>
            ))}

            {regieRows.map((row: any) => (
              <div key={`r-${row.id}`}>
                <b>{tr("regie")}</b>

                <span>
                  {getRegieTitle(row)} · {formatHours(row.stunden || row.hours)}
                </span>

                <small>
                  {row.locked ? tr("signed") : tr("waiting")} ·{" "}
                  {row.workers_text || row.worker_names || row.radnik || "-"}
                </small>

                {row.public_token && (
                  <Link
                    className="miniLink"
                    href={`/projekte/${projektId}/regie/sign/${row.public_token}`}
                  >
                    {tr("open")}
                  </Link>
                )}
              </div>
            ))}

            {fotos.slice(0, 6).map((row: any) => (
              <div key={`f-${row.id}`}>
                <b>{tr("photos")}</b>
                <span>{row.titel || row.title || "Foto"}</span>
                <small>
                  {tr("room")}: {row.raum_name || row.room_name || "-"} ·{" "}
                  {tr("position")}: {row.position_nr || row.lv_nr || "-"}
                </small>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .page {
          min-height: 100vh;
          background: #050505;
          color: white;
          padding: 16px;
          font-family: Arial, sans-serif;
        }

        .hero,
        .panel,
        .controlBox,
        .todayBox,
        .menuGrid,
        .errorBox {
          max-width: 980px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero {
          margin-bottom: 16px;
        }

        .label {
          color: #93c5fd;
          margin: 0 0 6px;
          font-weight: 900;
          font-size: 13px;
        }

        h1 {
          margin: 0;
          font-size: 32px;
          line-height: 1.05;
        }

        .subtitle {
          margin: 8px 0 0;
          color: #cbd5e1;
          font-weight: 700;
        }

        .panel,
        .controlBox,
        .todayBox {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 20px;
          padding: 16px;
          margin-bottom: 16px;
        }

        label {
          display: block;
          color: #d1d5db;
          font-weight: 900;
          margin: 14px 0 7px;
        }

        input {
          width: 100%;
          box-sizing: border-box;
          background: #030712;
          color: white;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 15px;
          font-size: 17px;
          outline: none;
        }

        .workerBox {
          width: 100%;
          box-sizing: border-box;
          background: #064e3b;
          color: white;
          border: 1px solid #16a34a;
          border-radius: 16px;
          padding: 17px;
          font-size: 20px;
          font-weight: 900;
        }

        .langGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .langGrid button {
          background: #1f2937;
          color: white;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 14px;
          font-weight: 900;
        }

        .langGrid .active {
          background: #2563eb;
          border-color: #60a5fa;
        }

        .infoBox {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 13px;
          margin-top: 14px;
        }

        .infoBox b {
          display: block;
          color: #93c5fd;
          margin-bottom: 6px;
        }

        .infoBox p,
        .controlBox p {
          color: #cbd5e1;
          margin: 0;
          line-height: 1.45;
          white-space: pre-wrap;
        }

        .mapBtn {
          display: block;
          background: #15803d;
          color: white;
          text-decoration: none;
          border-radius: 16px;
          padding: 15px;
          text-align: center;
          font-size: 16px;
          font-weight: 900;
          margin-top: 14px;
        }

        .warningBox {
          background: #78350f;
          border: 1px solid #f59e0b;
          color: #fed7aa;
          padding: 14px;
          border-radius: 14px;
          font-weight: 900;
        }

        .menuGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .menuGrid a,
        .disabledCard {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 20px;
          min-height: 110px;
          color: white;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 10px;
        }

        .disabledCard {
          opacity: 0.45;
        }

        .menuGrid strong,
        .disabledCard strong {
          font-size: 36px;
        }

        .menuGrid span,
        .disabledCard span {
          font-size: 21px;
          font-weight: 900;
          text-align: center;
        }

        .todayTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .todayTop h2,
        .controlBox h2 {
          margin: 0 0 10px;
        }

        .todayTop button {
          background: #2563eb;
          color: white;
          border: 0;
          border-radius: 12px;
          padding: 10px 14px;
          font-weight: 900;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 14px;
        }

        .stats div {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 12px;
        }

        .stats span {
          display: block;
          color: #9ca3af;
          font-size: 12px;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .stats strong {
          font-size: 22px;
        }

        .empty {
          color: #cbd5e1;
          font-weight: 800;
        }

        .entryList {
          display: grid;
          gap: 10px;
        }

        .entryList > div {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 13px;
        }

        .entryList b {
          display: block;
          color: #93c5fd;
          margin-bottom: 6px;
        }

        .entryList span,
        .entryList small {
          display: block;
          color: white;
          font-weight: 800;
          margin-top: 4px;
        }

        .entryList small {
          color: #cbd5e1;
          font-weight: 700;
        }

        .miniLink {
          margin-top: 10px;
          background: #15803d;
          color: white;
          text-decoration: none;
          border-radius: 12px;
          padding: 10px 12px;
          font-weight: 900;
          display: inline-block;
        }

        .errorBox {
          background: #7f1d1d;
          border: 1px solid #ef4444;
          color: white;
          padding: 14px;
          border-radius: 14px;
          margin-bottom: 16px;
          font-weight: 900;
        }

        @media (min-width: 780px) {
          .page {
            padding: 28px;
          }

          .menuGrid {
            grid-template-columns: repeat(4, 1fr);
          }

          .stats {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>
    </main>
  );
}