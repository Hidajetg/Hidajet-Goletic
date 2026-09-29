"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

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
  [key: string]: any;
};

type TableConfig = {
  table: string;
  column: string;
};

type ArbeitszeitForm = {
  datum: string;
  radnik: string;
  start_time: string;
  end_time: string;
  pause_minuten: string;
  raum_id: string;
  notiz: string;
};

const RADNICI = ["Arnes", "Ramiz", "Abror", "Shohruh", "Harun"];

export default function ProjektArbeitszeitPage() {
  const params = useParams();
  const projektId = String(params.id);
  const projektIdValue = isNaN(Number(projektId)) ? projektId : Number(projektId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [raeume, setRaeume] = useState<any[]>([]);
  const [errorText, setErrorText] = useState("");

  const [timeConfig, setTimeConfig] = useState<TableConfig>({
    table: "arbeitszeiten",
    column: "projekt_id",
  });

  const [search, setSearch] = useState("");
  const [filterDatum, setFilterDatum] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | string | null>(null);

  const [form, setForm] = useState<ArbeitszeitForm>({
    datum: today(),
    radnik: "",
    start_time: "08:00",
    end_time: "17:00",
    pause_minuten: "30",
    raum_id: "",
    notiz: "",
  });

  useEffect(() => {
    loadAll();
  }, [projektId]);

  function today() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
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
    return projekt.ort || projekt.mjesto || projekt.location || projekt.adresse || "";
  }

  function getDate(row: any) {
    return row.datum || row.date || row.tag || row.day || row.created_date || "";
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

  function getStart(row: any) {
    return (
      row.start_time ||
      row.start ||
      row.von ||
      row.beginn ||
      row.arbeitsbeginn ||
      ""
    );
  }

  function getEnd(row: any) {
    return row.end_time || row.end || row.bis || row.ende || row.arbeitsende || "";
  }

  function getPause(row: any) {
    return (
      row.pause_minuten ||
      row.pause_minutes ||
      row.break_minutes ||
      row.pause ||
      0
    );
  }

  function getStoredHours(row: any) {
    return row.stunden || row.hours || row.total_hours || row.gesamt_stunden || "";
  }

  function getNote(row: any) {
    return row.notiz || row.note || row.bemerkung || row.info || "";
  }

  function getRoomId(row: any) {
    return row.raum_id || row.room_id || row.prostorija_id || "";
  }

  function getRoomName(room: any) {
    return (
      room.name ||
      room.raum_name ||
      room.naziv ||
      room.title ||
      room.prostorija ||
      `Raum ${room.id}`
    );
  }

  function findRoomName(roomId: string | number) {
    if (!roomId) return "";
    const room = raeume.find((r) => String(r.id) === String(roomId));
    return room ? getRoomName(room) : "";
  }

  function parseTimeToMinutes(value: string) {
    if (!value || !value.includes(":")) return 0;

    const [h, m] = value.split(":").map((x) => Number(x));
    return h * 60 + m;
  }

  function calculateHours(start: string, end: string, pause: string | number) {
    const s = parseTimeToMinutes(start);
    let e = parseTimeToMinutes(end);
    const p = Number(pause || 0);

    if (!s || !e) return 0;

    if (e < s) e += 24 * 60;

    const total = e - s - p;
    return Math.max(0, total / 60);
  }

  function getHours(row: any) {
    const stored = Number(getStoredHours(row));

    if (!isNaN(stored) && stored > 0) {
      return stored;
    }

    return calculateHours(getStart(row), getEnd(row), getPause(row));
  }

  function formatHours(value: number) {
    return value.toFixed(2).replace(".", ",");
  }

  function resetForm() {
    setEditId(null);
    setForm({
      datum: today(),
      radnik: "",
      start_time: "08:00",
      end_time: "17:00",
      pause_minuten: "30",
      raum_id: "",
      notiz: "",
    });
  }

  async function loadAll() {
    setLoading(true);
    setErrorText("");

    await loadProjekt();
    await loadRaeume();
    await loadArbeitszeiten();

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
    const configs: TableConfig[] = [
      { table: "projekt_raeume", column: "projekt_id" },
      { table: "raeume", column: "projekt_id" },
      { table: "raeume", column: "project_id" },
      { table: "prostorije", column: "projekt_id" },
      { table: "prostorije", column: "project_id" },
      { table: "rooms", column: "projekt_id" },
      { table: "rooms", column: "project_id" },
      { table: "prostorije", column: "baustelle_id" },
      { table: "raeume", column: "baustelle_id" },
    ];

    for (const config of configs) {
      const { data, error } = await supabase
        .from(config.table)
        .select("*")
        .eq(config.column, projektIdValue);

      if (!error) {
        setRaeume(data || []);
        return;
      }
    }

    setRaeume([]);
  }

  async function loadArbeitszeiten() {
    const configs: TableConfig[] = [
      { table: "arbeitszeiten", column: "projekt_id" },
      { table: "arbeitszeiten", column: "project_id" },
      { table: "arbeitszeiten", column: "baustelle_id" },
      { table: "arbeitszeit", column: "projekt_id" },
      { table: "arbeitszeit", column: "project_id" },
      { table: "arbeitszeit", column: "baustelle_id" },
      { table: "stunden", column: "projekt_id" },
      { table: "stunden", column: "project_id" },
      { table: "stunden", column: "baustelle_id" },
    ];

    for (const config of configs) {
      const { data, error } = await supabase
        .from(config.table)
        .select("*")
        .eq(config.column, projektIdValue);

      if (!error) {
        const sorted = [...(data || [])].sort((a: any, b: any) => {
          const da = String(getDate(a));
          const db = String(getDate(b));
          const sa = String(getStart(a));
          const sb = String(getStart(b));

          if (da === db) return sb.localeCompare(sa);
          return db.localeCompare(da);
        });

        setTimeConfig(config);
        setArbeitszeiten(sorted);
        return;
      }
    }

    setArbeitszeiten([]);
    setErrorText(
      "Ne mogu učitati Arbeitszeit. Provjeri tabelu arbeitszeiten i kolonu projekt_id."
    );
  }

  const filtered = useMemo(() => {
    return arbeitszeiten.filter((row) => {
      const roomName = findRoomName(getRoomId(row));

      const text = `
        ${getDate(row)}
        ${getWorker(row)}
        ${getStart(row)}
        ${getEnd(row)}
        ${getPause(row)}
        ${getNote(row)}
        ${roomName}
      `.toLowerCase();

      const searchOk = text.includes(search.toLowerCase());
      const dateOk = !filterDatum || String(getDate(row)) === filterDatum;

      return searchOk && dateOk;
    });
  }, [arbeitszeiten, search, filterDatum, raeume]);

  const totalHours = useMemo(() => {
    return filtered.reduce((sum, row) => sum + getHours(row), 0);
  }, [filtered]);

  const workerTotals = useMemo(() => {
    const result: { [key: string]: number } = {};

    filtered.forEach((row) => {
      const worker = getWorker(row) || "Ohne Name";
      result[worker] = (result[worker] || 0) + getHours(row);
    });

    return result;
  }, [filtered]);

  function isDuplicate(values: ArbeitszeitForm) {
    return arbeitszeiten.some((row) => {
      if (editId && String(row.id) === String(editId)) return false;

      return (
        String(getDate(row)) === String(values.datum) &&
        String(getWorker(row)).toLowerCase() ===
          String(values.radnik).toLowerCase() &&
        String(getStart(row)) === String(values.start_time) &&
        String(getEnd(row)) === String(values.end_time)
      );
    });
  }

  function buildPayloads(values: ArbeitszeitForm) {
    const hours = calculateHours(
      values.start_time,
      values.end_time,
      values.pause_minuten
    );

    const base: any = {};
    base[timeConfig.column] = projektIdValue;

    const roomValue =
      values.raum_id && !isNaN(Number(values.raum_id))
        ? Number(values.raum_id)
        : values.raum_id;

    const roomPayload1 = values.raum_id ? { raum_id: roomValue } : {};
    const roomPayload2 = values.raum_id ? { room_id: roomValue } : {};

    return [
      {
        ...base,
        datum: values.datum,
        radnik: values.radnik.trim(),
        start_time: values.start_time,
        end_time: values.end_time,
        pause_minuten: Number(values.pause_minuten || 0),
        stunden: hours,
        notiz: values.notiz.trim(),
        ...roomPayload1,
      },
      {
        ...base,
        datum: values.datum,
        arbeiter: values.radnik.trim(),
        von: values.start_time,
        bis: values.end_time,
        pause: Number(values.pause_minuten || 0),
        stunden: hours,
        bemerkung: values.notiz.trim(),
        ...roomPayload1,
      },
      {
        ...base,
        date: values.datum,
        worker_name: values.radnik.trim(),
        start: values.start_time,
        end: values.end_time,
        break_minutes: Number(values.pause_minuten || 0),
        total_hours: hours,
        info: values.notiz.trim(),
        ...roomPayload2,
      },
      {
        ...base,
        date: values.datum,
        worker: values.radnik.trim(),
        start: values.start_time,
        end: values.end_time,
        hours: hours,
        ...roomPayload2,
      },
      {
        ...base,
        datum: values.datum,
        name: values.radnik.trim(),
        start: values.start_time,
        ende: values.end_time,
        pause: Number(values.pause_minuten || 0),
        stunden: hours,
      },
      {
        ...base,
        datum: values.datum,
        radnik: values.radnik.trim(),
        stunden: hours,
      },
      {
        ...base,
        date: values.datum,
        worker: values.radnik.trim(),
        hours: hours,
      },
    ];
  }

  async function saveWithValues(values: ArbeitszeitForm) {
    if (!values.datum) {
      alert("Odaberi datum.");
      return;
    }

    if (!values.radnik.trim()) {
      alert("Odaberi ili upiši radnika.");
      return;
    }

    if (!values.start_time || !values.end_time) {
      alert("Upiši početak i kraj rada.");
      return;
    }

    if (isDuplicate(values)) {
      alert("Ovaj unos već postoji. Nije dodan dupli unos.");
      return;
    }

    setSaving(true);
    let lastError: any = null;

    for (const payload of buildPayloads(values)) {
      const query = editId
        ? supabase.from(timeConfig.table).update(payload as any).eq("id", editId)
        : supabase.from(timeConfig.table).insert(payload as any);

      const { error } = await query;

      if (!error) {
        resetForm();
        setShowForm(false);
        setSaving(false);
        await loadArbeitszeiten();
        return;
      }

      lastError = error;
    }

    setSaving(false);
    alert("Greška kod spremanja Arbeitszeit: " + (lastError?.message || ""));
  }

  async function quickAddWorker(worker: string) {
    if (saving) return;

    const values: ArbeitszeitForm = {
      datum: today(),
      radnik: worker,
      start_time: "08:00",
      end_time: "17:00",
      pause_minuten: "30",
      raum_id: "",
      notiz: "",
    };

    await saveWithValues(values);
  }

  function startEdit(row: any) {
    setEditId(row.id);

    setForm({
      datum: String(getDate(row) || today()),
      radnik: String(getWorker(row) || ""),
      start_time: String(getStart(row) || "08:00"),
      end_time: String(getEnd(row) || "17:00"),
      pause_minuten: String(getPause(row) || "30"),
      raum_id: String(getRoomId(row) || ""),
      notiz: String(getNote(row) || ""),
    });

    setShowForm(true);
  }

  async function deleteRow(row: any) {
    const ok = confirm(
      `Da li želiš obrisati unos za ${getWorker(row)} od ${getDate(row)}?`
    );

    if (!ok) return;

    const { error } = await supabase
      .from(timeConfig.table)
      .delete()
      .eq("id", row.id);

    if (error) {
      alert("Greška kod brisanja: " + error.message);
      return;
    }

    await loadArbeitszeiten();
  }

  return (
    <main className="page">
      <section className="top">
        <div>
          <Link className="back" href={`/projekte/${projektId}`}>
            ← Zurück zu Projekt
          </Link>

          <p className="label">Projekt Arbeitszeit</p>
          <h1>Arbeitszeit</h1>
          <p className="subtitle">
            {getProjektName()}
            {getProjektOrt() ? ` · ${getProjektOrt()}` : ""}
          </p>
        </div>

        <div className="topButtons">
          <button className="btn gray" onClick={loadAll}>
            Aktualisieren
          </button>

          <button
            className="btn blue"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + Zeit hinzufügen
          </button>
        </div>
      </section>

      {errorText && <div className="errorBox">{errorText}</div>}

      <section className="stats">
        <div className="stat">
          <span>Ukupno unosa</span>
          <strong>{filtered.length}</strong>
        </div>

        <div className="stat">
          <span>Ukupno sati</span>
          <strong>{formatHours(totalHours)}</strong>
        </div>

        <div className="stat">
          <span>Radnici</span>
          <strong>{Object.keys(workerTotals).length}</strong>
        </div>
      </section>

      <section className="toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Traži radnika, datum, Raum ili napomenu..."
        />

        <input
          type="date"
          value={filterDatum}
          onChange={(e) => setFilterDatum(e.target.value)}
        />

        <button onClick={() => setFilterDatum("")}>Alle</button>
      </section>

      <section className="quickAdd">
        <h2>Brzi unos 08:00 - 17:00 / Pause 30 min</h2>

        <div className="quickGrid">
          {RADNICI.map((worker) => (
            <button
              key={worker}
              onClick={() => quickAddWorker(worker)}
              disabled={saving}
            >
              + {worker}
            </button>
          ))}
        </div>
      </section>

      {Object.keys(workerTotals).length > 0 && (
        <section className="workerTotals">
          <h2>Sati po radniku</h2>

          <div className="workerGrid">
            {Object.entries(workerTotals).map(([worker, hours]) => (
              <div key={worker}>
                <span>{worker}</span>
                <strong>{formatHours(hours)} h</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="emptyBox">Učitavanje Arbeitszeit...</div>
      ) : filtered.length === 0 ? (
        <div className="emptyBox">
          <h2>Nema unosa</h2>
          <p>Dodaj radno vrijeme za ovaj projekt.</p>
        </div>
      ) : (
        <section className="tableBox">
          <div className="tableHeader">
            <span>Datum</span>
            <span>Radnik</span>
            <span>Vrijeme</span>
            <span>Pause</span>
            <span>Sati</span>
            <span>Raum</span>
            <span>Akcije</span>
          </div>

          {filtered.map((row) => (
            <div key={row.id} className="tableRow">
              <span>{getDate(row) || "-"}</span>
              <span className="strong">{getWorker(row) || "-"}</span>
              <span>
                {getStart(row) || "-"} - {getEnd(row) || "-"}
              </span>
              <span>{getPause(row) || 0} min</span>
              <span className="hours">{formatHours(getHours(row))} h</span>
              <span>{findRoomName(getRoomId(row)) || "-"}</span>

              <span className="rowActions">
                <button onClick={() => startEdit(row)}>Bearbeiten</button>
                <button className="delete" onClick={() => deleteRow(row)}>
                  Löschen
                </button>
              </span>

              {getNote(row) && <p className="note">{getNote(row)}</p>}
            </div>
          ))}
        </section>
      )}

      {showForm && (
        <div className="modalBg">
          <div className="modal">
            <div className="modalHead">
              <h2>{editId ? "Arbeitszeit bearbeiten" : "Arbeitszeit hinzufügen"}</h2>

              <button
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                ×
              </button>
            </div>

            <label>Datum</label>
            <input
              type="date"
              value={form.datum}
              onChange={(e) =>
                setForm((old) => ({ ...old, datum: e.target.value }))
              }
            />

            <label>Radnik</label>
            <select
              value={form.radnik}
              onChange={(e) =>
                setForm((old) => ({ ...old, radnik: e.target.value }))
              }
            >
              <option value="">Radnik auswählen</option>
              {RADNICI.map((worker) => (
                <option key={worker} value={worker}>
                  {worker}
                </option>
              ))}
            </select>

            <label>Oder Name manuell</label>
            <input
              value={form.radnik}
              onChange={(e) =>
                setForm((old) => ({ ...old, radnik: e.target.value }))
              }
              placeholder="Ime radnika"
            />

            <div className="timeGrid">
              <div>
                <label>Von</label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, start_time: e.target.value }))
                  }
                />
              </div>

              <div>
                <label>Bis</label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, end_time: e.target.value }))
                  }
                />
              </div>

              <div>
                <label>Pause min</label>
                <input
                  type="number"
                  value={form.pause_minuten}
                  onChange={(e) =>
                    setForm((old) => ({
                      ...old,
                      pause_minuten: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="preview">
              Stunden:{" "}
              <strong>
                {formatHours(
                  calculateHours(
                    form.start_time,
                    form.end_time,
                    form.pause_minuten
                  )
                )}{" "}
                h
              </strong>
            </div>

            <label>Raum / prostorija</label>
            <select
              value={form.raum_id}
              onChange={(e) =>
                setForm((old) => ({ ...old, raum_id: e.target.value }))
              }
            >
              <option value="">Ohne Raum</option>
              {raeume.map((room) => (
                <option key={room.id} value={room.id}>
                  {getRoomName(room)}
                </option>
              ))}
            </select>

            <label>Notiz</label>
            <textarea
              value={form.notiz}
              onChange={(e) =>
                setForm((old) => ({ ...old, notiz: e.target.value }))
              }
              placeholder="Napomena za ovaj unos"
            />

            <div className="modalActions">
              <button
                className="cancel"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Abbrechen
              </button>

              <button
                className="save"
                onClick={() => saveWithValues(form)}
                disabled={saving}
              >
                {saving ? "Speichern..." : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .page {
          min-height: 100vh;
          background: #050505;
          color: white;
          padding: 28px;
          font-family: Arial, sans-serif;
        }

        .top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 22px;
        }

        .back {
          display: inline-block;
          color: white;
          text-decoration: none;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 11px 15px;
          font-weight: 800;
          margin-bottom: 18px;
        }

        .label {
          color: #9ca3af;
          margin: 0 0 8px;
          font-size: 14px;
          font-weight: 800;
        }

        h1 {
          margin: 0;
          font-size: 44px;
          line-height: 1;
        }

        .subtitle {
          color: #cbd5e1;
          margin: 12px 0 0;
          font-size: 17px;
          font-weight: 700;
        }

        .topButtons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        button,
        a,
        input,
        textarea,
        select {
          font-family: inherit;
        }

        button,
        a {
          -webkit-tap-highlight-color: transparent;
        }

        .btn {
          border: 0;
          border-radius: 14px;
          padding: 14px 18px;
          color: white;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
        }

        .gray {
          background: #374151;
        }

        .blue {
          background: #2563eb;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }

        .stat {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 18px;
        }

        .stat span {
          display: block;
          color: #9ca3af;
          margin-bottom: 8px;
          font-weight: 800;
        }

        .stat strong {
          font-size: 34px;
        }

        .toolbar {
          display: grid;
          grid-template-columns: 1fr 190px 90px;
          gap: 10px;
          margin-bottom: 18px;
        }

        .toolbar input {
          background: #111827;
          color: white;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 15px 16px;
          font-size: 16px;
          outline: none;
        }

        .toolbar button {
          background: #374151;
          color: white;
          border: 0;
          border-radius: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .quickAdd,
        .workerTotals {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 18px;
          margin-bottom: 18px;
        }

        .quickAdd h2,
        .workerTotals h2 {
          margin: 0 0 12px;
          font-size: 22px;
        }

        .quickGrid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
        }

        .quickGrid button {
          background: #1f2937;
          border: 1px solid #374151;
          color: white;
          border-radius: 14px;
          padding: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .workerGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 10px;
        }

        .workerGrid div {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 14px;
        }

        .workerGrid span {
          display: block;
          color: #9ca3af;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .workerGrid strong {
          font-size: 22px;
        }

        .errorBox {
          background: #7f1d1d;
          border: 1px solid #ef4444;
          color: white;
          padding: 16px;
          border-radius: 14px;
          margin-bottom: 18px;
          font-weight: 800;
        }

        .emptyBox {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 30px;
          text-align: center;
          color: #cbd5e1;
        }

        .emptyBox h2 {
          color: white;
          margin-top: 0;
        }

        .tableBox {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          overflow: hidden;
        }

        .tableHeader,
        .tableRow {
          display: grid;
          grid-template-columns: 130px 1fr 150px 90px 100px 1fr 210px;
          gap: 10px;
          align-items: center;
          padding: 14px;
        }

        .tableHeader {
          background: #0b1220;
          color: #9ca3af;
          font-weight: 900;
          border-bottom: 1px solid #1f2937;
        }

        .tableRow {
          border-bottom: 1px solid #1f2937;
          color: #e5e7eb;
        }

        .tableRow:last-child {
          border-bottom: 0;
        }

        .strong {
          font-weight: 900;
          color: white;
        }

        .hours {
          font-weight: 900;
          color: #bbf7d0;
        }

        .rowActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .rowActions button {
          background: #374151;
          color: white;
          border: 0;
          border-radius: 12px;
          padding: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .rowActions .delete {
          background: #dc2626;
        }

        .note {
          grid-column: 1 / -1;
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 12px;
          padding: 10px;
          margin: 4px 0 0;
          color: #cbd5e1;
        }

        .modalBg {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.78);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 16px;
          z-index: 100;
        }

        .modal {
          width: 100%;
          max-width: 620px;
          max-height: 92vh;
          overflow: auto;
          background: #111827;
          border: 1px solid #374151;
          border-radius: 22px;
          padding: 22px;
        }

        .modalHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .modalHead h2 {
          margin: 0;
          font-size: 28px;
        }

        .modalHead button {
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 12px;
          background: #374151;
          color: white;
          font-size: 28px;
          cursor: pointer;
        }

        label {
          display: block;
          color: #d1d5db;
          font-weight: 800;
          margin: 14px 0 7px;
        }

        .modal input,
        .modal textarea,
        .modal select {
          width: 100%;
          box-sizing: border-box;
          background: #030712;
          color: white;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 14px;
          font-size: 16px;
          outline: none;
        }

        .modal textarea {
          min-height: 90px;
          resize: vertical;
        }

        .timeGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .preview {
          margin-top: 14px;
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 14px;
          color: #cbd5e1;
          font-weight: 800;
        }

        .preview strong {
          color: white;
          font-size: 22px;
        }

        .modalActions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }

        .modalActions button {
          border: 0;
          border-radius: 14px;
          padding: 14px 18px;
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .cancel {
          background: #374151;
        }

        .save {
          background: #2563eb;
        }

        .save:disabled,
        .quickGrid button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 1050px) {
          .tableHeader {
            display: none;
          }

          .tableRow {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .rowActions {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 760px) {
          .page {
            padding: 16px;
          }

          .top {
            display: block;
          }

          h1 {
            font-size: 36px;
          }

          .topButtons {
            display: grid;
            grid-template-columns: 1fr;
            margin-top: 16px;
          }

          .stats,
          .toolbar,
          .quickGrid,
          .timeGrid {
            grid-template-columns: 1fr;
          }

          .toolbar button {
            padding: 14px;
          }

          .rowActions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}