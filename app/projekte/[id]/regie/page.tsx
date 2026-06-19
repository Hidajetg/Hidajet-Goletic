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
  adresse?: string | null;
  auftraggeber?: string | null;
  bauleiter?: string | null;
  [key: string]: any;
};

type TableConfig = {
  table: string;
  column: string;
};

type RegieForm = {
  datum: string;
  radnik: string;
  arbeit: string;
  beschreibung: string;
  start_time: string;
  end_time: string;
  pause_minuten: string;
  stunden: string;
  material: string;
  preis: string;
  status: string;
  freigabe_status: string;
  notiz: string;
};

const RADNICI = ["Arnes", "Ramiz", "Abror", "Shohruh", "Harun"];

const STATUS_LISTE = ["Offen", "In Arbeit", "Fertig"];

const FREIGABE_LISTE = ["Wartet", "Freigegeben", "Abgelehnt"];

export default function ProjektRegiePage() {
  const params = useParams();
  const projektId = String(params.id);
  const projektIdValue = isNaN(Number(projektId))
    ? projektId
    : Number(projektId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [regieRows, setRegieRows] = useState<any[]>([]);
  const [errorText, setErrorText] = useState("");

  const [regieConfig, setRegieConfig] = useState<TableConfig>({
    table: "regie",
    column: "projekt_id",
  });

  const [search, setSearch] = useState("");
  const [filterRadnik, setFilterRadnik] = useState("Alle");
  const [filterStatus, setFilterStatus] = useState("Alle");
  const [filterFreigabe, setFilterFreigabe] = useState("Alle");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | string | null>(null);

  const [form, setForm] = useState<RegieForm>({
    datum: today(),
    radnik: "",
    arbeit: "",
    beschreibung: "",
    start_time: "08:00",
    end_time: "17:00",
    pause_minuten: "30",
    stunden: "",
    material: "",
    preis: "",
    status: "Offen",
    freigabe_status: "Wartet",
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

  function toNumber(value: any) {
    const n = Number(String(value || "0").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function formatNumber(value: any) {
    const n = toNumber(value);
    return n.toFixed(2).replace(".", ",").replace(",00", "");
  }

  function formatHours(value: any) {
    const n = toNumber(value);
    return n.toFixed(2).replace(".", ",") + " h";
  }

  function formatMoney(value: any) {
    const n = toNumber(value);
    return n.toFixed(2).replace(".", ",") + " €";
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

  function getWork(row: any) {
    return (
      row.arbeit ||
      row.regiearbeit ||
      row.title ||
      row.titel ||
      row.name ||
      row.leistung ||
      row.work ||
      ""
    );
  }

  function getDescription(row: any) {
    return (
      row.beschreibung ||
      row.description ||
      row.text ||
      row.arbeiten ||
      row.work_done ||
      ""
    );
  }

  function getStart(row: any) {
    return row.start_time || row.start || row.von || row.beginn || "";
  }

  function getEnd(row: any) {
    return row.end_time || row.end || row.bis || row.ende || "";
  }

  function getPause(row: any) {
    return row.pause_minuten || row.pause_minutes || row.break_minutes || row.pause || 0;
  }

  function getStoredHours(row: any) {
    return row.stunden || row.hours || row.total_hours || row.gesamt_stunden || "";
  }

  function getMaterial(row: any) {
    return row.material || row.materialien || row.material_text || "";
  }

  function getPrice(row: any) {
    return row.preis || row.price || row.betrag || row.amount || row.kosten || "";
  }

  function getStatus(row: any) {
    return row.status || "Offen";
  }

  function getFreigabeStatus(row: any) {
    const raw = row.freigabe_status || row.approval_status || row.freigabe || "";

    if (raw === true) return "Freigegeben";
    if (raw === false) return "Wartet";

    const s = String(raw || "").toLowerCase();

    if (s.includes("freigegeben") || s.includes("approved")) return "Freigegeben";
    if (s.includes("abgelehnt") || s.includes("rejected")) return "Abgelehnt";

    return raw || "Wartet";
  }

  function getNote(row: any) {
    return row.notiz || row.note || row.bemerkung || row.info || "";
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
    const storedNumber = toNumber(getStoredHours(row));

    if (storedNumber > 0) return storedNumber;

    return calculateHours(getStart(row), getEnd(row), getPause(row));
  }

  function getFormHours() {
    const manual = toNumber(form.stunden);

    if (manual > 0) return manual;

    return calculateHours(form.start_time, form.end_time, form.pause_minuten);
  }

  function resetForm() {
    setEditId(null);
    setForm({
      datum: today(),
      radnik: "",
      arbeit: "",
      beschreibung: "",
      start_time: "08:00",
      end_time: "17:00",
      pause_minuten: "30",
      stunden: "",
      material: "",
      preis: "",
      status: "Offen",
      freigabe_status: "Wartet",
      notiz: "",
    });
  }

  async function loadAll() {
    setLoading(true);
    setErrorText("");

    await loadProjekt();
    await loadRegie();

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

  async function loadRegie() {
    const configs: TableConfig[] = [
      { table: "regie", column: "projekt_id" },
      { table: "regie", column: "project_id" },
      { table: "regie", column: "baustelle_id" },
      { table: "regiearbeiten", column: "projekt_id" },
      { table: "regiearbeiten", column: "project_id" },
      { table: "regiearbeiten", column: "baustelle_id" },
      { table: "projekt_regie", column: "projekt_id" },
      { table: "projekt_regie", column: "project_id" },
      { table: "zusatzarbeiten", column: "projekt_id" },
      { table: "zusatzarbeiten", column: "project_id" },
      { table: "extra_work", column: "project_id" },
      { table: "extra_work", column: "projekt_id" },
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

          if (da === db) {
            return String(getWorker(a)).localeCompare(String(getWorker(b)));
          }

          return db.localeCompare(da);
        });

        setRegieConfig(config);
        setRegieRows(sorted);
        return;
      }
    }

    setRegieRows([]);
    setErrorText("Ne mogu učitati Regie. Provjeri tabelu regie i kolonu projekt_id.");
  }

  const filtered = useMemo(() => {
    return regieRows.filter((row) => {
      const text = `
        ${getDate(row)}
        ${getWorker(row)}
        ${getWork(row)}
        ${getDescription(row)}
        ${getStart(row)}
        ${getEnd(row)}
        ${getHours(row)}
        ${getMaterial(row)}
        ${getPrice(row)}
        ${getStatus(row)}
        ${getFreigabeStatus(row)}
        ${getNote(row)}
      `.toLowerCase();

      const searchOk = text.includes(search.toLowerCase());
      const workerOk = filterRadnik === "Alle" || getWorker(row) === filterRadnik;
      const statusOk = filterStatus === "Alle" || getStatus(row) === filterStatus;
      const freigabeOk =
        filterFreigabe === "Alle" || getFreigabeStatus(row) === filterFreigabe;

      return searchOk && workerOk && statusOk && freigabeOk;
    });
  }, [regieRows, search, filterRadnik, filterStatus, filterFreigabe]);

  const totalHours = useMemo(() => {
    return filtered.reduce((sum, row) => sum + getHours(row), 0);
  }, [filtered]);

  const totalMoney = useMemo(() => {
    return filtered.reduce((sum, row) => sum + toNumber(getPrice(row)), 0);
  }, [filtered]);

  const workerTotals = useMemo(() => {
    const result: { [key: string]: { worker: string; hours: number; count: number } } =
      {};

    filtered.forEach((row) => {
      const worker = getWorker(row) || "Ohne Name";

      if (!result[worker]) {
        result[worker] = {
          worker,
          hours: 0,
          count: 0,
        };
      }

      result[worker].hours += getHours(row);
      result[worker].count += 1;
    });

    return Object.values(result).sort((a, b) => b.hours - a.hours);
  }, [filtered]);

  function isDuplicate(values: RegieForm) {
    return regieRows.some((row) => {
      if (editId && String(row.id) === String(editId)) return false;

      return (
        String(getDate(row)) === String(values.datum) &&
        String(getWorker(row)).trim().toLowerCase() ===
          values.radnik.trim().toLowerCase() &&
        String(getWork(row)).trim().toLowerCase() ===
          values.arbeit.trim().toLowerCase()
      );
    });
  }

  function buildPayloads(values: RegieForm) {
    const base: any = {};
    base[regieConfig.column] = projektIdValue;

    const hours = getFormHours();
    const price = toNumber(values.preis);

    return [
      {
        ...base,
        datum: values.datum,
        radnik: values.radnik.trim(),
        arbeit: values.arbeit.trim(),
        beschreibung: values.beschreibung.trim(),
        start_time: values.start_time,
        end_time: values.end_time,
        pause_minuten: Number(values.pause_minuten || 0),
        stunden: hours,
        material: values.material.trim(),
        preis: price,
        status: values.status,
        freigabe_status: values.freigabe_status,
        notiz: values.notiz.trim(),
      },
      {
        ...base,
        date: values.datum,
        worker: values.radnik.trim(),
        title: values.arbeit.trim(),
        description: values.beschreibung.trim(),
        start: values.start_time,
        end: values.end_time,
        break_minutes: Number(values.pause_minuten || 0),
        hours,
        material: values.material.trim(),
        price,
        status: values.status,
        approval_status: values.freigabe_status,
        note: values.notiz.trim(),
      },
      {
        ...base,
        datum: values.datum,
        arbeiter: values.radnik.trim(),
        regiearbeit: values.arbeit.trim(),
        arbeiten: values.beschreibung.trim(),
        von: values.start_time,
        bis: values.end_time,
        pause: Number(values.pause_minuten || 0),
        stunden: hours,
        materialien: values.material.trim(),
        betrag: price,
        status: values.status,
        freigabe_status: values.freigabe_status,
        bemerkung: values.notiz.trim(),
      },
      {
        ...base,
        datum: values.datum,
        name: values.radnik.trim(),
        leistung: values.arbeit.trim(),
        stunden: hours,
        status: values.status,
      },
      {
        ...base,
        title: values.arbeit.trim(),
        hours,
        status: values.status,
      },
    ];
  }

  async function saveRegie() {
    if (!form.radnik.trim()) {
      alert("Odaberi ili upiši radnika.");
      return;
    }

    if (!form.arbeit.trim()) {
      alert("Upiši Regie Arbeit.");
      return;
    }

    if (isDuplicate(form) && !editId) {
      alert("Ovaj Regie unos već postoji.");
      return;
    }

    setSaving(true);
    let lastError: any = null;

    for (const payload of buildPayloads(form)) {
      const query = editId
        ? supabase.from(regieConfig.table).update(payload as any).eq("id", editId)
        : supabase.from(regieConfig.table).insert(payload as any);

      const { error } = await query;

      if (!error) {
        resetForm();
        setShowForm(false);
        setSaving(false);
        await loadRegie();
        return;
      }

      lastError = error;
    }

    setSaving(false);
    alert("Greška kod spremanja Regie: " + (lastError?.message || ""));
  }

  function quickRegie(work: string) {
    setEditId(null);
    setForm({
      datum: today(),
      radnik: "",
      arbeit: work,
      beschreibung: "",
      start_time: "08:00",
      end_time: "17:00",
      pause_minuten: "30",
      stunden: "",
      material: "",
      preis: "",
      status: "Offen",
      freigabe_status: "Wartet",
      notiz: "",
    });

    setShowForm(true);
  }

  function startEdit(row: any) {
    setEditId(row.id);

    setForm({
      datum: String(getDate(row) || today()),
      radnik: String(getWorker(row) || ""),
      arbeit: String(getWork(row) || ""),
      beschreibung: String(getDescription(row) || ""),
      start_time: String(getStart(row) || "08:00"),
      end_time: String(getEnd(row) || "17:00"),
      pause_minuten: String(getPause(row) || "30"),
      stunden: String(getStoredHours(row) || ""),
      material: String(getMaterial(row) || ""),
      preis: String(getPrice(row) || ""),
      status: String(getStatus(row) || "Offen"),
      freigabe_status: String(getFreigabeStatus(row) || "Wartet"),
      notiz: String(getNote(row) || ""),
    });

    setShowForm(true);
  }

  async function changeStatus(row: any, newStatus: string) {
    const { error } = await supabase
      .from(regieConfig.table)
      .update({ status: newStatus } as any)
      .eq("id", row.id);

    if (error) {
      alert("Greška kod statusa: " + error.message);
      return;
    }

    await loadRegie();
  }

  async function changeFreigabe(row: any, newStatus: string) {
    const payloads: any[] = [
      { freigabe_status: newStatus },
      { approval_status: newStatus },
      { freigabe: newStatus },
      { approved: newStatus === "Freigegeben" },
    ];

    let lastError: any = null;

    for (const payload of payloads) {
      const { error } = await supabase
        .from(regieConfig.table)
        .update(payload as any)
        .eq("id", row.id);

      if (!error) {
        await loadRegie();
        return;
      }

      lastError = error;
    }

    alert("Greška kod Freigabe: " + (lastError?.message || ""));
  }

  async function deleteRegie(row: any) {
    const ok = confirm(`Da li želiš obrisati Regie: ${getWork(row)}?`);

    if (!ok) return;

    const { error } = await supabase
      .from(regieConfig.table)
      .delete()
      .eq("id", row.id);

    if (error) {
      alert("Greška kod brisanja: " + error.message);
      return;
    }

    await loadRegie();
  }

  return (
    <main className="page">
      <section className="top">
        <div>
          <Link className="back" href={`/projekte/${projektId}`}>
            ← Zurück zu Projekt
          </Link>

          <p className="label">Projekt Regie</p>
          <h1>Regie</h1>
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
            + Regie hinzufügen
          </button>
        </div>
      </section>

      {errorText && <div className="errorBox">{errorText}</div>}

      <section className="stats">
        <div className="stat">
          <span>Regie unosi</span>
          <strong>{filtered.length}</strong>
        </div>

        <div className="stat">
          <span>Regie Stunden</span>
          <strong>{formatHours(totalHours)}</strong>
        </div>

        <div className="stat">
          <span>Regie Betrag</span>
          <strong>{formatMoney(totalMoney)}</strong>
        </div>
      </section>

      <section className="toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Traži Regie, radnika, opis, material..."
        />

        <select
          value={filterRadnik}
          onChange={(e) => setFilterRadnik(e.target.value)}
        >
          <option value="Alle">Alle Radnici</option>
          {RADNICI.map((worker) => (
            <option key={worker} value={worker}>
              {worker}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="Alle">Alle Status</option>
          {STATUS_LISTE.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={filterFreigabe}
          onChange={(e) => setFilterFreigabe(e.target.value)}
        >
          <option value="Alle">Alle Freigabe</option>
          {FREIGABE_LISTE.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </section>

      <section className="quickAdd">
        <h2>Brzi Regie unos</h2>

        <div className="quickGrid">
          {[
            "Zusatzarbeit",
            "Wartezeit",
            "Material holen",
            "Baustelle reinigen",
            "Mangel beheben",
            "Sonderwunsch Kunde",
            "Nacharbeit",
            "Transport",
          ].map((item) => (
            <button key={item} onClick={() => quickRegie(item)}>
              + {item}
            </button>
          ))}
        </div>
      </section>

      {workerTotals.length > 0 && (
        <section className="summaryBox">
          <h2>Regie po radniku</h2>

          <div className="summaryGrid">
            {workerTotals.map((item) => (
              <div key={item.worker}>
                <span>{item.worker}</span>
                <strong>{formatHours(item.hours)}</strong>
                <p>{item.count} unosa</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="emptyBox">Učitavanje Regie...</div>
      ) : filtered.length === 0 ? (
        <div className="emptyBox">
          <h2>Nema Regie unosa</h2>
          <p>Dodaj prvi Regie dodatni rad za ovaj projekt.</p>
        </div>
      ) : (
        <section className="grid">
          {filtered.map((row) => (
            <article key={row.id} className="card">
              <div className="cardTop">
                <div>
                  <h2>{getWork(row) || "Regie"}</h2>
                  <p>
                    {getDate(row) || "-"}
                    {getWorker(row) ? ` · ${getWorker(row)}` : ""}
                  </p>
                </div>

                <span
                  className={
                    getFreigabeStatus(row) === "Freigegeben"
                      ? "badge approved"
                      : getFreigabeStatus(row) === "Abgelehnt"
                      ? "badge rejected"
                      : "badge"
                  }
                >
                  {getFreigabeStatus(row)}
                </span>
              </div>

              <div className="detailGrid">
                <div>
                  <span>Zeit</span>
                  <strong>
                    {getStart(row) || "-"} - {getEnd(row) || "-"}
                  </strong>
                </div>

                <div>
                  <span>Stunden</span>
                  <strong>{formatHours(getHours(row))}</strong>
                </div>

                <div>
                  <span>Pause</span>
                  <strong>{getPause(row) || 0} min</strong>
                </div>

                <div>
                  <span>Betrag</span>
                  <strong>{formatMoney(getPrice(row))}</strong>
                </div>
              </div>

              {getDescription(row) && (
                <p className="description">{getDescription(row)}</p>
              )}

              {getMaterial(row) && (
                <p className="description">
                  <b>Material:</b> {getMaterial(row)}
                </p>
              )}

              {getNote(row) && <p className="note">{getNote(row)}</p>}

              <div className="actions">
                <button onClick={() => startEdit(row)}>Bearbeiten</button>
                <button onClick={() => changeStatus(row, "Fertig")}>Fertig</button>
                <button onClick={() => changeFreigabe(row, "Freigegeben")}>
                  Freigeben
                </button>
                <button className="delete" onClick={() => deleteRegie(row)}>
                  Löschen
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {showForm && (
        <div className="modalBg">
          <div className="modal">
            <div className="modalHead">
              <h2>{editId ? "Regie bearbeiten" : "Regie hinzufügen"}</h2>

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

            <label>Radnik *</label>
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

            <label>Regie Arbeit *</label>
            <input
              value={form.arbeit}
              onChange={(e) =>
                setForm((old) => ({ ...old, arbeit: e.target.value }))
              }
              placeholder="z.B. Zusatzarbeit"
            />

            <label>Beschreibung</label>
            <textarea
              value={form.beschreibung}
              onChange={(e) =>
                setForm((old) => ({ ...old, beschreibung: e.target.value }))
              }
              placeholder="Opis dodatnog rada"
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

            <label>Stunden manuell</label>
            <input
              value={form.stunden}
              onChange={(e) =>
                setForm((old) => ({ ...old, stunden: e.target.value }))
              }
              inputMode="decimal"
              placeholder="Prazno = automatski iz vremena"
            />

            <div className="preview">
              Stunden: <strong>{formatHours(getFormHours())}</strong>
            </div>

            <label>Material</label>
            <textarea
              value={form.material}
              onChange={(e) =>
                setForm((old) => ({ ...old, material: e.target.value }))
              }
              placeholder="Korišteni material za Regie"
            />

            <label>Betrag / Preis</label>
            <input
              value={form.preis}
              onChange={(e) =>
                setForm((old) => ({ ...old, preis: e.target.value }))
              }
              inputMode="decimal"
              placeholder="z.B. 150"
            />

            <div className="twoGrid">
              <div>
                <label>Status</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, status: e.target.value }))
                  }
                >
                  {STATUS_LISTE.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Freigabe</label>
                <select
                  value={form.freigabe_status}
                  onChange={(e) =>
                    setForm((old) => ({
                      ...old,
                      freigabe_status: e.target.value,
                    }))
                  }
                >
                  {FREIGABE_LISTE.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label>Notiz</label>
            <textarea
              value={form.notiz}
              onChange={(e) =>
                setForm((old) => ({ ...old, notiz: e.target.value }))
              }
              placeholder="Napomena"
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

              <button className="save" onClick={saveRegie} disabled={saving}>
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
          font-size: 30px;
        }

        .toolbar {
          display: grid;
          grid-template-columns: 1fr 170px 170px 190px;
          gap: 10px;
          margin-bottom: 18px;
        }

        .toolbar input,
        .toolbar select {
          background: #111827;
          color: white;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 15px 16px;
          font-size: 16px;
          outline: none;
        }

        .quickAdd,
        .summaryBox {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 18px;
          margin-bottom: 18px;
        }

        .quickAdd h2,
        .summaryBox h2 {
          margin: 0 0 12px;
          font-size: 22px;
        }

        .quickGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .quickGrid button {
          background: #1f2937;
          border: 1px solid #374151;
          color: white;
          border-radius: 14px;
          padding: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .summaryGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 10px;
        }

        .summaryGrid div {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 14px;
        }

        .summaryGrid span {
          display: block;
          color: #9ca3af;
          font-weight: 800;
          margin-bottom: 6px;
          font-size: 13px;
        }

        .summaryGrid strong {
          display: block;
          color: white;
          font-size: 20px;
        }

        .summaryGrid p {
          margin: 8px 0 0;
          color: #bbf7d0;
          font-weight: 900;
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

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 18px;
        }

        .card {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 22px;
          padding: 20px;
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 14px;
        }

        .card h2 {
          margin: 0;
          font-size: 23px;
        }

        .card p {
          margin: 8px 0 0;
          color: #cbd5e1;
          line-height: 1.45;
        }

        .badge {
          background: #78350f;
          color: #fed7aa;
          border: 1px solid #f97316;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
        }

        .badge.approved {
          background: #064e3b;
          color: #bbf7d0;
          border-color: #16a34a;
        }

        .badge.rejected {
          background: #7f1d1d;
          color: #fecaca;
          border-color: #ef4444;
        }

        .detailGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 12px;
        }

        .detailGrid div {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 12px;
        }

        .detailGrid span {
          display: block;
          color: #9ca3af;
          font-weight: 800;
          font-size: 13px;
          margin-bottom: 6px;
        }

        .detailGrid strong {
          color: white;
          font-size: 17px;
        }

        .description,
        .note {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 12px;
          white-space: pre-wrap;
          margin-bottom: 12px !important;
        }

        .actions {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          padding-top: 14px;
          border-top: 1px solid #1f2937;
        }

        .actions button {
          background: #374151;
          color: white;
          border: 0;
          border-radius: 12px;
          padding: 12px 8px;
          font-weight: 900;
          cursor: pointer;
          font-size: 14px;
        }

        .actions .delete {
          background: #dc2626;
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
          max-width: 720px;
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
          min-height: 95px;
          resize: vertical;
        }

        .timeGrid {
          display: grid;
          grid-template-columns: 1fr 1fr 130px;
          gap: 12px;
        }

        .twoGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
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

        .save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 1050px) {
          .toolbar,
          .quickGrid,
          .detailGrid,
          .timeGrid {
            grid-template-columns: 1fr;
          }

          .actions {
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
          .grid,
          .twoGrid {
            grid-template-columns: 1fr;
          }

          .actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}