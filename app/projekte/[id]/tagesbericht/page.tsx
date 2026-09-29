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
  [key: string]: any;
};

type TableConfig = {
  table: string;
  column: string;
};

type BerichtForm = {
  datum: string;
  wetter: string;
  temperatur: string;
  arbeiter: string;
  stunden: string;
  leistung: string;
  material: string;
  behinderung: string;
  besondere_vorkommnisse: string;
  notiz: string;
  status: string;
};

const RADNICI = ["Arnes", "Ramiz", "Abror", "Shohruh", "Harun"];

export default function ProjektTagesberichtPage() {
  const params = useParams();
  const projektId = String(params.id);
  const projektIdValue = isNaN(Number(projektId)) ? projektId : Number(projektId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [berichte, setBerichte] = useState<any[]>([]);
  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [errorText, setErrorText] = useState("");

  const [berichtConfig, setBerichtConfig] = useState<TableConfig>({
    table: "tagesberichte",
    column: "projekt_id",
  });

  const [search, setSearch] = useState("");
  const [filterDatum, setFilterDatum] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | string | null>(null);

  const [form, setForm] = useState<BerichtForm>({
    datum: today(),
    wetter: "",
    temperatur: "",
    arbeiter: "",
    stunden: "",
    leistung: "",
    material: "",
    behinderung: "",
    besondere_vorkommnisse: "",
    notiz: "",
    status: "Offen",
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

  function getWetter(row: any) {
    return row.wetter || row.weather || "";
  }

  function getTemperatur(row: any) {
    return row.temperatur || row.temperature || "";
  }

  function getArbeiter(row: any) {
    return row.arbeiter || row.radnici || row.workers || row.mitarbeiter || "";
  }

  function getStunden(row: any) {
    return row.stunden || row.hours || row.total_hours || "";
  }

  function getLeistung(row: any) {
    return row.leistung || row.arbeiten || row.work_done || row.beschreibung || "";
  }

  function getMaterial(row: any) {
    return row.material || row.materialien || "";
  }

  function getBehinderung(row: any) {
    return row.behinderung || row.hindrance || row.probleme || "";
  }

  function getBesondere(row: any) {
    return (
      row.besondere_vorkommnisse ||
      row.vorkommnisse ||
      row.special_events ||
      row.besonderes ||
      ""
    );
  }

  function getNote(row: any) {
    return row.notiz || row.note || row.bemerkung || row.info || "";
  }

  function getStatus(row: any) {
    return row.status || "Offen";
  }

  function getWorkerFromTime(row: any) {
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

  function getTimeDate(row: any) {
    return row.datum || row.date || row.tag || row.day || "";
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
      wetter: "",
      temperatur: "",
      arbeiter: "",
      stunden: "",
      leistung: "",
      material: "",
      behinderung: "",
      besondere_vorkommnisse: "",
      notiz: "",
      status: "Offen",
    });
  }

  async function loadAll() {
    setLoading(true);
    setErrorText("");

    await loadProjekt();
    await loadArbeitszeiten();
    await loadBerichte();

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
        setArbeitszeiten(data || []);
        return;
      }
    }

    setArbeitszeiten([]);
  }

  async function loadBerichte() {
    const configs: TableConfig[] = [
      { table: "tagesberichte", column: "projekt_id" },
      { table: "tagesberichte", column: "project_id" },
      { table: "tagesberichte", column: "baustelle_id" },
      { table: "tagesbericht", column: "projekt_id" },
      { table: "tagesbericht", column: "project_id" },
      { table: "tagesbericht", column: "baustelle_id" },
      { table: "regieberichte", column: "projekt_id" },
      { table: "regieberichte", column: "project_id" },
      { table: "regieberichte", column: "baustelle_id" },
      { table: "regiebericht", column: "projekt_id" },
      { table: "regiebericht", column: "project_id" },
      { table: "regiebericht", column: "baustelle_id" },
    ];

    for (const config of configs) {
      const { data, error } = await supabase
        .from(config.table)
        .select("*")
        .eq(config.column, projektIdValue);

      if (!error) {
        const sorted = [...(data || [])].sort((a: any, b: any) => {
          return String(getDate(b)).localeCompare(String(getDate(a)));
        });

        setBerichtConfig(config);
        setBerichte(sorted);
        return;
      }
    }

    setBerichte([]);
    setErrorText(
      "Ne mogu učitati Tagesbericht. Provjeri tabelu tagesberichte i kolonu projekt_id."
    );
  }

  const filtered = useMemo(() => {
    return berichte.filter((row) => {
      const text = `
        ${getDate(row)}
        ${getWetter(row)}
        ${getTemperatur(row)}
        ${getArbeiter(row)}
        ${getStunden(row)}
        ${getLeistung(row)}
        ${getMaterial(row)}
        ${getBehinderung(row)}
        ${getBesondere(row)}
        ${getNote(row)}
        ${getStatus(row)}
      `.toLowerCase();

      const searchOk = text.includes(search.toLowerCase());
      const dateOk = !filterDatum || String(getDate(row)) === filterDatum;

      return searchOk && dateOk;
    });
  }, [berichte, search, filterDatum]);

  function getTodaySummary(dateValue: string) {
    const rows = arbeitszeiten.filter((row) => String(getTimeDate(row)) === dateValue);

    const workers = Array.from(
      new Set(
        rows
          .map((row) => getWorkerFromTime(row))
          .filter((name) => String(name).trim() !== "")
      )
    );

    const hours = rows.reduce((sum, row) => sum + getHours(row), 0);

    return {
      workers,
      hours,
      count: rows.length,
    };
  }

  function fillFromArbeitszeit() {
    const summary = getTodaySummary(form.datum);

    setForm((old) => ({
      ...old,
      arbeiter:
        summary.workers.length > 0
          ? summary.workers.join(", ")
          : RADNICI.join(", "),
      stunden: summary.hours > 0 ? formatHours(summary.hours) : old.stunden,
    }));
  }

  function isDuplicate(values: BerichtForm) {
    return berichte.some((row) => {
      if (editId && String(row.id) === String(editId)) return false;
      return String(getDate(row)) === String(values.datum);
    });
  }

  function buildPayloads(values: BerichtForm) {
    const base: any = {};
    base[berichtConfig.column] = projektIdValue;

    return [
      {
        ...base,
        datum: values.datum,
        wetter: values.wetter.trim(),
        temperatur: values.temperatur.trim(),
        arbeiter: values.arbeiter.trim(),
        stunden: values.stunden.trim(),
        leistung: values.leistung.trim(),
        material: values.material.trim(),
        behinderung: values.behinderung.trim(),
        besondere_vorkommnisse: values.besondere_vorkommnisse.trim(),
        notiz: values.notiz.trim(),
        status: values.status,
      },
      {
        ...base,
        date: values.datum,
        weather: values.wetter.trim(),
        temperature: values.temperatur.trim(),
        workers: values.arbeiter.trim(),
        hours: values.stunden.trim(),
        work_done: values.leistung.trim(),
        material: values.material.trim(),
        hindrance: values.behinderung.trim(),
        special_events: values.besondere_vorkommnisse.trim(),
        note: values.notiz.trim(),
        status: values.status,
      },
      {
        ...base,
        datum: values.datum,
        wetter: values.wetter.trim(),
        arbeiter: values.arbeiter.trim(),
        stunden: values.stunden.trim(),
        arbeiten: values.leistung.trim(),
        material: values.material.trim(),
        bemerkung: values.notiz.trim(),
        status: values.status,
      },
      {
        ...base,
        date: values.datum,
        workers: values.arbeiter.trim(),
        hours: values.stunden.trim(),
        beschreibung: values.leistung.trim(),
        info: values.notiz.trim(),
        status: values.status,
      },
      {
        ...base,
        datum: values.datum,
        leistung: values.leistung.trim(),
        status: values.status,
      },
    ];
  }

  async function saveBericht() {
    if (!form.datum) {
      alert("Odaberi datum.");
      return;
    }

    if (!form.leistung.trim()) {
      alert("Upiši šta je urađeno taj dan.");
      return;
    }

    if (isDuplicate(form)) {
      alert("Za ovaj datum već postoji Tagesbericht. Otvori postojeći i uredi ga.");
      return;
    }

    setSaving(true);
    let lastError: any = null;

    for (const payload of buildPayloads(form)) {
      const query = editId
        ? supabase.from(berichtConfig.table).update(payload as any).eq("id", editId)
        : supabase.from(berichtConfig.table).insert(payload as any);

      const { error } = await query;

      if (!error) {
        resetForm();
        setShowForm(false);
        setSaving(false);
        await loadBerichte();
        return;
      }

      lastError = error;
    }

    setSaving(false);
    alert("Greška kod spremanja Tagesbericht: " + (lastError?.message || ""));
  }

  function startEdit(row: any) {
    setEditId(row.id);

    setForm({
      datum: String(getDate(row) || today()),
      wetter: String(getWetter(row) || ""),
      temperatur: String(getTemperatur(row) || ""),
      arbeiter: String(getArbeiter(row) || ""),
      stunden: String(getStunden(row) || ""),
      leistung: String(getLeistung(row) || ""),
      material: String(getMaterial(row) || ""),
      behinderung: String(getBehinderung(row) || ""),
      besondere_vorkommnisse: String(getBesondere(row) || ""),
      notiz: String(getNote(row) || ""),
      status: String(getStatus(row) || "Offen"),
    });

    setShowForm(true);
  }

  async function changeStatus(row: any, newStatus: string) {
    const payloads: any[] = [{ status: newStatus }];

    let lastError: any = null;

    for (const payload of payloads) {
      const { error } = await supabase
        .from(berichtConfig.table)
        .update(payload as any)
        .eq("id", row.id);

      if (!error) {
        await loadBerichte();
        return;
      }

      lastError = error;
    }

    alert("Greška kod statusa: " + (lastError?.message || ""));
  }

  async function deleteBericht(row: any) {
    const ok = confirm(`Da li želiš obrisati Tagesbericht od ${getDate(row)}?`);

    if (!ok) return;

    const { error } = await supabase
      .from(berichtConfig.table)
      .delete()
      .eq("id", row.id);

    if (error) {
      alert("Greška kod brisanja: " + error.message);
      return;
    }

    await loadBerichte();
  }

  return (
    <main className="page">
      <section className="top">
        <div>
          <Link className="back" href={`/projekte/${projektId}`}>
            ← Zurück zu Projekt
          </Link>

          <p className="label">Projekt Tagesbericht</p>
          <h1>Tagesbericht</h1>
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
            + Tagesbericht
          </button>
        </div>
      </section>

      {errorText && <div className="errorBox">{errorText}</div>}

      <section className="stats">
        <div className="stat">
          <span>Berichte</span>
          <strong>{filtered.length}</strong>
        </div>

        <div className="stat">
          <span>Heute Arbeitszeit</span>
          <strong>{formatHours(getTodaySummary(today()).hours)} h</strong>
        </div>

        <div className="stat">
          <span>Heute Radnici</span>
          <strong>{getTodaySummary(today()).workers.length}</strong>
        </div>
      </section>

      <section className="toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Traži datum, radnike, radove, material, napomenu..."
        />

        <input
          type="date"
          value={filterDatum}
          onChange={(e) => setFilterDatum(e.target.value)}
        />

        <button onClick={() => setFilterDatum("")}>Alle</button>
      </section>

      {loading ? (
        <div className="emptyBox">Učitavanje Tagesbericht...</div>
      ) : filtered.length === 0 ? (
        <div className="emptyBox">
          <h2>Nema Tagesbericht</h2>
          <p>Dodaj prvi dnevni izvještaj za ovaj projekt.</p>
        </div>
      ) : (
        <section className="grid">
          {filtered.map((row) => (
            <article key={row.id} className="card">
              <div className="cardTop">
                <div>
                  <h2>{getDate(row) || "Bez datuma"}</h2>
                  <p>
                    {getWetter(row) || "Wetter nije upisan"}
                    {getTemperatur(row) ? ` · ${getTemperatur(row)}` : ""}
                  </p>
                </div>

                <span
                  className={
                    String(getStatus(row)).toLowerCase() === "fertig"
                      ? "badge done"
                      : "badge"
                  }
                >
                  {getStatus(row)}
                </span>
              </div>

              <div className="detailGrid">
                <div>
                  <span>Arbeiter</span>
                  <strong>{getArbeiter(row) || "-"}</strong>
                </div>

                <div>
                  <span>Stunden</span>
                  <strong>{getStunden(row) || "-"}</strong>
                </div>
              </div>

              <div className="sectionBox">
                <h3>Leistung / Arbeiten</h3>
                <p>{getLeistung(row) || "-"}</p>
              </div>

              {getMaterial(row) && (
                <div className="sectionBox">
                  <h3>Material</h3>
                  <p>{getMaterial(row)}</p>
                </div>
              )}

              {getBehinderung(row) && (
                <div className="sectionBox warning">
                  <h3>Behinderung / Probleme</h3>
                  <p>{getBehinderung(row)}</p>
                </div>
              )}

              {getBesondere(row) && (
                <div className="sectionBox">
                  <h3>Besondere Vorkommnisse</h3>
                  <p>{getBesondere(row)}</p>
                </div>
              )}

              {getNote(row) && (
                <div className="sectionBox">
                  <h3>Notiz</h3>
                  <p>{getNote(row)}</p>
                </div>
              )}

              <div className="actions">
                <button onClick={() => startEdit(row)}>Bearbeiten</button>
                <button onClick={() => changeStatus(row, "Fertig")}>Fertig</button>
                <button onClick={() => changeStatus(row, "Offen")}>Offen</button>
                <button className="delete" onClick={() => deleteBericht(row)}>
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
              <h2>{editId ? "Tagesbericht bearbeiten" : "Tagesbericht hinzufügen"}</h2>

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

            <button className="fillBtn" onClick={fillFromArbeitszeit}>
              Radnici i sati iz Arbeitszeit übernehmen
            </button>

            <div className="twoGrid">
              <div>
                <label>Wetter</label>
                <input
                  value={form.wetter}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, wetter: e.target.value }))
                  }
                  placeholder="z.B. Sonnig, Regen..."
                />
              </div>

              <div>
                <label>Temperatur</label>
                <input
                  value={form.temperatur}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, temperatur: e.target.value }))
                  }
                  placeholder="z.B. 18°C"
                />
              </div>
            </div>

            <label>Arbeiter</label>
            <input
              value={form.arbeiter}
              onChange={(e) =>
                setForm((old) => ({ ...old, arbeiter: e.target.value }))
              }
              placeholder="Arnes, Ramiz, Abror..."
            />

            <label>Stunden</label>
            <input
              value={form.stunden}
              onChange={(e) =>
                setForm((old) => ({ ...old, stunden: e.target.value }))
              }
              placeholder="z.B. 32,00"
            />

            <label>Leistung / Arbeiten *</label>
            <textarea
              value={form.leistung}
              onChange={(e) =>
                setForm((old) => ({ ...old, leistung: e.target.value }))
              }
              placeholder="Šta je urađeno danas?"
            />

            <label>Material</label>
            <textarea
              value={form.material}
              onChange={(e) =>
                setForm((old) => ({ ...old, material: e.target.value }))
              }
              placeholder="Koji materijal je korišten?"
            />

            <label>Behinderung / Probleme</label>
            <textarea
              value={form.behinderung}
              onChange={(e) =>
                setForm((old) => ({ ...old, behinderung: e.target.value }))
              }
              placeholder="Problemi, kašnjenja, prepreke..."
            />

            <label>Besondere Vorkommnisse</label>
            <textarea
              value={form.besondere_vorkommnisse}
              onChange={(e) =>
                setForm((old) => ({
                  ...old,
                  besondere_vorkommnisse: e.target.value,
                }))
              }
              placeholder="Posebni događaji..."
            />

            <label>Notiz</label>
            <textarea
              value={form.notiz}
              onChange={(e) =>
                setForm((old) => ({ ...old, notiz: e.target.value }))
              }
              placeholder="Dodatna napomena"
            />

            <label>Status</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((old) => ({ ...old, status: e.target.value }))
              }
            >
              <option value="Offen">Offen</option>
              <option value="Fertig">Fertig</option>
            </select>

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

              <button className="save" onClick={saveBericht} disabled={saving}>
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
          font-size: 24px;
        }

        .card p {
          margin: 8px 0 0;
          color: #cbd5e1;
          line-height: 1.45;
          white-space: pre-wrap;
        }

        .badge {
          background: #064e3b;
          color: #bbf7d0;
          border: 1px solid #16a34a;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
        }

        .badge.done {
          background: #374151;
          color: #e5e7eb;
          border-color: #6b7280;
        }

        .detailGrid {
          display: grid;
          grid-template-columns: 1fr 140px;
          gap: 10px;
          margin-bottom: 12px;
        }

        .detailGrid div,
        .sectionBox {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 12px;
        }

        .detailGrid span {
          display: block;
          color: #9ca3af;
          font-weight: 800;
          margin-bottom: 6px;
          font-size: 13px;
        }

        .detailGrid strong {
          color: white;
          line-height: 1.4;
        }

        .sectionBox {
          margin-bottom: 12px;
        }

        .sectionBox h3 {
          margin: 0 0 8px;
          font-size: 15px;
          color: white;
        }

        .sectionBox.warning {
          border-color: #f97316;
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
          max-width: 680px;
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

        .twoGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .fillBtn {
          width: 100%;
          background: #15803d;
          color: white;
          border: 0;
          border-radius: 14px;
          padding: 14px;
          font-weight: 900;
          cursor: pointer;
          margin: 12px 0 4px;
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
          .grid,
          .detailGrid,
          .actions,
          .twoGrid {
            grid-template-columns: 1fr;
          }

          .toolbar button {
            padding: 14px;
          }
        }
      `}</style>
    </main>
  );
}