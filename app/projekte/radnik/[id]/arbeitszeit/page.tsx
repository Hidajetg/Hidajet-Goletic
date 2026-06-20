"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

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
  [key: string]: any;
};

const WORKERS = ["Arnes", "Ramiz", "Abror", "Shohruh", "Harun"];

const t: Record<Lang, any> = {
  de: {
    back: "Zurück",
    title: "Arbeitszeit",
    subtitle: "Arbeitszeit muss mit Raum und LV Position verbunden sein.",
    language: "Sprache",
    worker: "Arbeiter",
    selectWorker: "Arbeiter auswählen",
    date: "Datum",
    start: "Von",
    end: "Bis",
    pause: "Pause Minuten",
    room: "Raum",
    selectRoom: "Raum auswählen",
    position: "LV Position",
    selectPosition: "LV Position auswählen",
    note: "Notiz",
    notePlaceholder: "Notiz zur Arbeitszeit",
    calculatedHours: "Berechnete Stunden",
    save: "Arbeitszeit speichern",
    saving: "Speichern...",
    todayEntries: "Heutige Arbeitszeiten",
    noEntries: "Keine Arbeitszeiten für heute.",
    project: "Projekt",
    successSaved: "Arbeitszeit wurde gespeichert.",
    errors: {
      selectWorker: "Bitte Arbeiter auswählen.",
      selectRoom: "Bitte Raum auswählen.",
      selectPosition: "Bitte LV Position auswählen.",
      invalidTime: "Bitte gültige Arbeitszeit eintragen.",
      duplicate: "Diese Arbeitszeit wurde bereits eingetragen.",
      saveFailed: "Arbeitszeit konnte nicht gespeichert werden.",
      sqlMissing:
        "Datenbank ist nicht komplett. Bitte SQL 001_kontrola_radnika_lv_regie ausführen.",
    },
  },
  ba: {
    back: "Nazad",
    title: "Radno vrijeme",
    subtitle: "Radno vrijeme mora biti povezano sa prostorijom i LV pozicijom.",
    language: "Jezik",
    worker: "Radnik",
    selectWorker: "Odaberi radnika",
    date: "Datum",
    start: "Od",
    end: "Do",
    pause: "Pauza minuta",
    room: "Prostorija",
    selectRoom: "Odaberi prostoriju",
    position: "LV pozicija",
    selectPosition: "Odaberi LV poziciju",
    note: "Napomena",
    notePlaceholder: "Napomena za radno vrijeme",
    calculatedHours: "Izračunati sati",
    save: "Spremi radno vrijeme",
    saving: "Spremanje...",
    todayEntries: "Današnja radna vremena",
    noEntries: "Nema radnog vremena za danas.",
    project: "Projekt",
    successSaved: "Radno vrijeme je spremljeno.",
    errors: {
      selectWorker: "Odaberi radnika.",
      selectRoom: "Odaberi prostoriju.",
      selectPosition: "Odaberi LV poziciju.",
      invalidTime: "Upiši ispravno radno vrijeme.",
      duplicate: "Ovo radno vrijeme je već uneseno.",
      saveFailed: "Radno vrijeme nije spremljeno.",
      sqlMissing:
        "Baza nije kompletna. Prvo pokreni SQL 001_kontrola_radnika_lv_regie.",
    },
  },
  en: {
    back: "Back",
    title: "Work time",
    subtitle: "Work time must be connected to a room and LV position.",
    language: "Language",
    worker: "Worker",
    selectWorker: "Select worker",
    date: "Date",
    start: "From",
    end: "To",
    pause: "Break minutes",
    room: "Room",
    selectRoom: "Select room",
    position: "LV position",
    selectPosition: "Select LV position",
    note: "Note",
    notePlaceholder: "Note for work time",
    calculatedHours: "Calculated hours",
    save: "Save work time",
    saving: "Saving...",
    todayEntries: "Today’s work times",
    noEntries: "No work times for today.",
    project: "Project",
    successSaved: "Work time was saved.",
    errors: {
      selectWorker: "Select worker.",
      selectRoom: "Select room.",
      selectPosition: "Select LV position.",
      invalidTime: "Enter valid work time.",
      duplicate: "This work time was already entered.",
      saveFailed: "Work time could not be saved.",
      sqlMissing:
        "Database is not complete. Run SQL 001_kontrola_radnika_lv_regie first.",
    },
  },
  uz: {
    back: "Orqaga",
    title: "Ish vaqti",
    subtitle: "Ish vaqti xona va LV pozitsiya bilan bog‘lanishi kerak.",
    language: "Til",
    worker: "Ishchi",
    selectWorker: "Ishchini tanlang",
    date: "Sana",
    start: "Boshlash",
    end: "Tugatish",
    pause: "Tanaffus daqiqa",
    room: "Xona",
    selectRoom: "Xonani tanlang",
    position: "LV pozitsiya",
    selectPosition: "LV pozitsiyani tanlang",
    note: "Izoh",
    notePlaceholder: "Ish vaqti uchun izoh",
    calculatedHours: "Hisoblangan soat",
    save: "Ish vaqtini saqlash",
    saving: "Saqlanmoqda...",
    todayEntries: "Bugungi ish vaqtlari",
    noEntries: "Bugun ish vaqti yozuvi yo‘q.",
    project: "Loyiha",
    successSaved: "Ish vaqti saqlandi.",
    errors: {
      selectWorker: "Ishchini tanlang.",
      selectRoom: "Xonani tanlang.",
      selectPosition: "LV pozitsiyani tanlang.",
      invalidTime: "To‘g‘ri ish vaqtini kiriting.",
      duplicate: "Bu ish vaqti allaqachon kiritilgan.",
      saveFailed: "Ish vaqtini saqlab bo‘lmadi.",
      sqlMissing:
        "Baza to‘liq emas. Avval SQL 001_kontrola_radnika_lv_regie ni ishga tushiring.",
    },
  },
};

export default function RadnikArbeitszeitPage() {
  const params = useParams();

  const projektId = String(params.id);
  const projektIdValue = isNaN(Number(projektId))
    ? projektId
    : Number(projektId);

  const [lang, setLang] = useState<Lang>("de");
  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [raeume, setRaeume] = useState<any[]>([]);
  const [positionen, setPositionen] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);

  const [worker, setWorker] = useState("");
  const [datum, setDatum] = useState(today());
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [pauseMinuten, setPauseMinuten] = useState("30");
  const [raumId, setRaumId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [notiz, setNotiz] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    const savedLang = (localStorage.getItem("appLanguage") || "de") as Lang;
    const savedWorker =
      localStorage.getItem("workerName") ||
      localStorage.getItem("radnik") ||
      "";

    if (["de", "ba", "en", "uz"].includes(savedLang)) {
      setLang(savedLang);
    }

    if (savedWorker) {
      setWorker(savedWorker);
    }

    loadAll(savedWorker);
  }, [projektId]);

  function today() {
    const d = new Date();

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function tr(key: string) {
    return t[lang]?.[key] || t.de[key] || key;
  }

  function err(key: string) {
    return t[lang]?.errors?.[key] || t.de.errors[key] || key;
  }

  function showError(key: string) {
    setMessageText("");
    setErrorText(err(key));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showSuccess(key: string) {
    setErrorText("");
    setMessageText(t[lang]?.[key] || t.de[key] || key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function changeLang(next: Lang) {
    setLang(next);
    localStorage.setItem("appLanguage", next);
  }

  function changeWorker(next: string) {
    setWorker(next);
    localStorage.setItem("workerName", next);
    localStorage.setItem("radnik", next);
  }

  function getProjektName() {
    if (!projekt) return "Projekt";

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

  function getRoomName(row: any) {
    return (
      row.name ||
      row.naziv ||
      row.raum ||
      row.room ||
      row.titel ||
      row.title ||
      `Raum ${row.id}`
    );
  }

  function getPositionNr(row: any) {
    return row.position_nr || row.nr || row.pos || row.lv_nr || row.number || "";
  }

  function getPositionTitle(row: any) {
    return (
      row.titel ||
      row.title ||
      row.kurztext ||
      row.name ||
      row.beschreibung ||
      row.description ||
      "LV Position"
    );
  }

  function getPositionEinheit(row: any) {
    return row.einheit || row.unit || row.jedinica || "";
  }

  function toNumber(value: any) {
    const n = Number(String(value || "0").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function formatHours(value: any) {
    return `${toNumber(value).toFixed(2).replace(".", ",")} h`;
  }

  function parseTimeToMinutes(value: string) {
    if (!value || !value.includes(":")) return 0;

    const [h, m] = value.split(":").map((x) => Number(x));
    return h * 60 + m;
  }

  function calculateHours() {
    const start = parseTimeToMinutes(startTime);
    let end = parseTimeToMinutes(endTime);
    const pause = Number(pauseMinuten || 0);

    if (!start || !end) return 0;

    if (end < start) {
      end += 24 * 60;
    }

    const total = end - start - pause;

    return Math.max(0, total / 60);
  }

  function getEntryWorker(row: any) {
    return row.radnik || row.worker || row.arbeiter || row.name || "";
  }

  async function loadAll(workerName = worker) {
    setLoading(true);
    setErrorText("");
    setMessageText("");

    await loadProjekt();
    await loadRaeume();
    await loadPositionen();
    await loadEntries(workerName);

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

  async function loadRaeume() {
    const { data, error } = await supabase
      .from("raeume")
      .select("*")
      .eq("projekt_id", String(projektId))
      .order("id", { ascending: true });

    if (!error) {
      setRaeume(data || []);
      return;
    }

    setRaeume([]);
  }

  async function loadPositionen() {
    const { data, error } = await supabase
      .from("positionen")
      .select("*")
      .eq("projekt_id", String(projektId))
      .order("position_nr", { ascending: true });

    if (!error) {
      setPositionen(data || []);
      return;
    }

    setPositionen([]);
  }

  async function loadEntries(workerName = worker) {
    const { data, error } = await supabase
      .from("arbeitszeiten")
      .select("*")
      .eq("projekt_id", String(projektId))
      .eq("datum", datum)
      .order("created_at", { ascending: false });

    if (error) {
      setEntries([]);
      return;
    }

    const w = String(workerName || "").toLowerCase();

    setEntries(
      (data || []).filter((row) => {
        return !w || String(getEntryWorker(row)).toLowerCase() === w;
      })
    );
  }

  const filteredPositionen = useMemo(() => {
    if (!raumId) return positionen;

    return positionen.filter((row) => {
      const rowRaumId = row.raum_id || row.room_id || "";
      return !rowRaumId || String(rowRaumId) === String(raumId);
    });
  }, [positionen, raumId]);

  const selectedRoom = useMemo(() => {
    return raeume.find((row) => String(row.id) === String(raumId));
  }, [raeume, raumId]);

  const selectedPosition = useMemo(() => {
    return positionen.find((row) => String(row.id) === String(positionId));
  }, [positionen, positionId]);

  const totalTodayHours = useMemo(() => {
    return entries.reduce((sum, row) => {
      return sum + toNumber(row.stunden || row.hours || 0);
    }, 0);
  }, [entries]);

  function isDuplicate() {
    return entries.some((row) => {
      return (
        String(row.datum) === String(datum) &&
        String(getEntryWorker(row)).toLowerCase() === worker.toLowerCase() &&
        String(row.start_time || "") === String(startTime) &&
        String(row.end_time || "") === String(endTime) &&
        String(row.raum_id || "") === String(raumId) &&
        String(row.position_id || "") === String(positionId)
      );
    });
  }

  async function saveArbeitszeit() {
    if (saving) return;

    if (!worker.trim()) {
      showError("selectWorker");
      return;
    }

    if (!raumId) {
      showError("selectRoom");
      return;
    }

    if (!positionId) {
      showError("selectPosition");
      return;
    }

    const hours = calculateHours();

    if (hours <= 0) {
      showError("invalidTime");
      return;
    }

    if (isDuplicate()) {
      showError("duplicate");
      return;
    }

    setSaving(true);
    setErrorText("");
    setMessageText("");

    const payload = {
      projekt_id: String(projektId),
      project_id: String(projektId),
      baustelle_id: String(projektId),

      datum,
      date: datum,

      radnik: worker.trim(),
      arbeiter: worker.trim(),
      worker: worker.trim(),
      name: worker.trim(),

      start_time: startTime,
      end_time: endTime,
      start: startTime,
      end: endTime,
      von: startTime,
      bis: endTime,

      pause_minuten: Number(pauseMinuten || 0),
      pause_minutes: Number(pauseMinuten || 0),
      break_minutes: Number(pauseMinuten || 0),
      pause: Number(pauseMinuten || 0),

      stunden: hours,
      hours,
      total_hours: hours,
      gesamt_stunden: hours,

      raum_id: String(raumId),
      room_id: String(raumId),
      raum_name: selectedRoom ? getRoomName(selectedRoom) : "",
      room_name: selectedRoom ? getRoomName(selectedRoom) : "",

      position_id: String(positionId),
      lv_position_id: String(positionId),
      position_nr: selectedPosition ? getPositionNr(selectedPosition) : "",
      lv_nr: selectedPosition ? getPositionNr(selectedPosition) : "",
      position_titel: selectedPosition ? getPositionTitle(selectedPosition) : "",
      position_title: selectedPosition ? getPositionTitle(selectedPosition) : "",

      notiz: notiz.trim(),
      note: notiz.trim(),
      bemerkung: notiz.trim(),

      status: "Wartet",
      freigabe_status: "Wartet",
      approval_status: "Wartet",
    };

    const { error } = await supabase.from("arbeitszeiten").insert(payload as any);

    if (error) {
      setSaving(false);
      showError("saveFailed");
      return;
    }

    setNotiz("");
    showSuccess("successSaved");
    await loadEntries(worker);
    setSaving(false);
  }

  return (
    <main className="page">
      <section className="hero">
        <div>
          <Link className="back" href={`/projekte/radnik/${projektId}`}>
            ← {tr("back")}
          </Link>

          <p className="label">{tr("project")}</p>
          <h1>{tr("title")}</h1>
          <p className="subtitle">
            {getProjektName()}
            {getProjektOrt() ? ` · ${getProjektOrt()}` : ""}
          </p>
        </div>
      </section>

      {errorText && <div className="errorBox">{errorText}</div>}
      {messageText && <div className="successBox">{messageText}</div>}

      <section className="panel">
        <label>{tr("language")}</label>

        <div className="langGrid">
          {(["de", "ba", "en", "uz"] as Lang[]).map((x) => (
            <button
              key={x}
              className={lang === x ? "active" : ""}
              onClick={() => changeLang(x)}
            >
              {x.toUpperCase()}
            </button>
          ))}
        </div>

        <p className="explain">{tr("subtitle")}</p>

        <label>{tr("worker")}</label>
        <select value={worker} onChange={(e) => changeWorker(e.target.value)}>
          <option value="">{tr("selectWorker")}</option>

          {WORKERS.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>

        <label>{tr("date")}</label>
        <input
          type="date"
          value={datum}
          onChange={(e) => {
            setDatum(e.target.value);
            setTimeout(() => loadEntries(worker), 50);
          }}
        />

        <div className="timeGrid">
          <div>
            <label>{tr("start")}</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div>
            <label>{tr("end")}</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <div>
            <label>{tr("pause")}</label>
            <input
              type="number"
              value={pauseMinuten}
              onChange={(e) => setPauseMinuten(e.target.value)}
            />
          </div>
        </div>

        <label>{tr("room")}</label>
        <select
          value={raumId}
          onChange={(e) => {
            setRaumId(e.target.value);
            setPositionId("");
          }}
        >
          <option value="">{tr("selectRoom")}</option>

          {raeume.map((row) => (
            <option key={row.id} value={row.id}>
              {getRoomName(row)}
            </option>
          ))}
        </select>

        <label>{tr("position")}</label>
        <select
          value={positionId}
          onChange={(e) => setPositionId(e.target.value)}
        >
          <option value="">{tr("selectPosition")}</option>

          {filteredPositionen.map((row) => (
            <option key={row.id} value={row.id}>
              {getPositionNr(row) ? `${getPositionNr(row)} · ` : ""}
              {getPositionTitle(row)}
              {getPositionEinheit(row) ? ` · ${getPositionEinheit(row)}` : ""}
            </option>
          ))}
        </select>

        <div className="preview">
          <span>{tr("calculatedHours")}</span>
          <strong>{formatHours(calculateHours())}</strong>
        </div>

        <label>{tr("note")}</label>
        <textarea
          value={notiz}
          onChange={(e) => setNotiz(e.target.value)}
          placeholder={tr("notePlaceholder")}
        />

        <button className="saveBtn" onClick={saveArbeitszeit} disabled={saving}>
          {saving ? tr("saving") : tr("save")}
        </button>
      </section>

      <section className="todayBox">
        <div className="todayTop">
          <h2>{tr("todayEntries")}</h2>
          <button onClick={() => loadEntries(worker)}>
            {loading ? "..." : "↻"}
          </button>
        </div>

        <div className="totalBox">
          <span>{tr("calculatedHours")}</span>
          <strong>{formatHours(totalTodayHours)}</strong>
        </div>

        {entries.length === 0 ? (
          <p className="empty">{tr("noEntries")}</p>
        ) : (
          <div className="entryList">
            {entries.map((row) => (
              <div key={row.id}>
                <b>{row.radnik || row.worker || "-"}</b>

                <span>
                  {row.start_time || row.start || "-"} -{" "}
                  {row.end_time || row.end || "-"} ·{" "}
                  {formatHours(row.stunden || row.hours || 0)}
                </span>

                <small>
                  {tr("room")}: {row.raum_name || row.room_name || "-"}
                </small>

                <small>
                  {tr("position")}: {row.position_nr || row.lv_nr || "-"} ·{" "}
                  {row.position_titel || row.position_title || "-"}
                </small>

                {row.notiz && <p>{row.notiz}</p>}
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
        .todayBox {
          max-width: 980px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero {
          margin-bottom: 16px;
        }

        .back {
          display: inline-block;
          background: #374151;
          color: white;
          text-decoration: none;
          border-radius: 14px;
          padding: 12px 14px;
          font-weight: 900;
          margin-bottom: 16px;
        }

        .label {
          color: #9ca3af;
          margin: 0 0 6px;
          font-weight: 900;
          font-size: 13px;
        }

        h1 {
          margin: 0;
          font-size: 34px;
          line-height: 1.05;
        }

        .subtitle {
          margin: 8px 0 0;
          color: #cbd5e1;
          font-weight: 700;
        }

        .panel,
        .todayBox {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 20px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .explain {
          color: #cbd5e1;
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 12px;
          line-height: 1.45;
          font-weight: 800;
        }

        label {
          display: block;
          color: #d1d5db;
          font-weight: 900;
          margin: 14px 0 7px;
        }

        input,
        textarea,
        select {
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

        textarea {
          min-height: 95px;
          resize: vertical;
          line-height: 1.45;
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

        .timeGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
        }

        .preview,
        .totalBox {
          margin-top: 14px;
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 14px;
        }

        .preview span,
        .totalBox span {
          display: block;
          color: #9ca3af;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .preview strong,
        .totalBox strong {
          color: #bbf7d0;
          font-size: 24px;
        }

        .saveBtn {
          width: 100%;
          margin-top: 16px;
          background: #2563eb;
          color: white;
          border: 0;
          border-radius: 16px;
          padding: 17px;
          font-size: 17px;
          font-weight: 900;
        }

        .saveBtn:disabled {
          opacity: 0.6;
        }

        .todayTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .todayTop h2 {
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

        .empty {
          color: #cbd5e1;
          font-weight: 800;
        }

        .entryList {
          display: grid;
          gap: 10px;
          margin-top: 14px;
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

        .entryList p {
          color: #d1d5db;
          margin: 8px 0 0;
        }

        .errorBox {
          max-width: 980px;
          margin: 0 auto 16px;
          background: #7f1d1d;
          border: 1px solid #ef4444;
          color: white;
          padding: 14px;
          border-radius: 14px;
          font-weight: 900;
        }

        .successBox {
          max-width: 980px;
          margin: 0 auto 16px;
          background: #064e3b;
          border: 1px solid #16a34a;
          color: white;
          padding: 14px;
          border-radius: 14px;
          font-weight: 900;
        }

        @media (min-width: 780px) {
          .page {
            padding: 28px;
          }

          .timeGrid {
            grid-template-columns: 1fr 1fr 150px;
            gap: 12px;
          }
        }
      `}</style>
    </main>
  );
}