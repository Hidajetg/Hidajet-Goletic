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

type AufgabeForm = {
  datum: string;
  titel: string;
  beschreibung: string;
  zugewiesen_an: string;
  faellig_am: string;
  prioritaet: string;
  status: string;
};

const RADNICI = ["Arnes", "Ramiz", "Abror", "Shohruh", "Harun"];

const STATUS_LISTE = ["Offen", "In Arbeit", "Fertig"];

const PRIORITAETEN = ["Normal", "Hoch", "Sehr hoch"];

export default function ProjektAufgabenPage() {
  const params = useParams();
  const projektId = String(params.id);
  const projektIdValue = isNaN(Number(projektId))
    ? projektId
    : Number(projektId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [aufgaben, setAufgaben] = useState<any[]>([]);
  const [errorText, setErrorText] = useState("");

  const [aufgabenConfig, setAufgabenConfig] = useState<TableConfig>({
    table: "aufgaben",
    column: "projekt_id",
  });

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Alle");
  const [filterRadnik, setFilterRadnik] = useState("Alle");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | string | null>(null);

  const [form, setForm] = useState<AufgabeForm>({
    datum: today(),
    titel: "",
    beschreibung: "",
    zugewiesen_an: "",
    faellig_am: "",
    prioritaet: "Normal",
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
    return row.datum || row.date || row.created_date || row.tag || "";
  }

  function getTitle(row: any) {
    return row.titel || row.title || row.name || row.aufgabe || row.task || "";
  }

  function getDescription(row: any) {
    return (
      row.beschreibung ||
      row.description ||
      row.notiz ||
      row.note ||
      row.info ||
      ""
    );
  }

  function getAssigned(row: any) {
    return (
      row.zugewiesen_an ||
      row.assigned_to ||
      row.radnik ||
      row.worker ||
      row.arbeiter ||
      row.mitarbeiter ||
      ""
    );
  }

  function getDueDate(row: any) {
    return row.faellig_am || row.due_date || row.deadline || row.bis_datum || "";
  }

  function getPriority(row: any) {
    return row.prioritaet || row.priority || "Normal";
  }

  function getStatus(row: any) {
    return row.status || "Offen";
  }

  function resetForm() {
    setEditId(null);
    setForm({
      datum: today(),
      titel: "",
      beschreibung: "",
      zugewiesen_an: "",
      faellig_am: "",
      prioritaet: "Normal",
      status: "Offen",
    });
  }

  async function loadAll() {
    setLoading(true);
    setErrorText("");

    await loadProjekt();
    await loadAufgaben();

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

  async function loadAufgaben() {
    const configs: TableConfig[] = [
      { table: "aufgaben", column: "projekt_id" },
      { table: "aufgaben", column: "project_id" },
      { table: "aufgaben", column: "baustelle_id" },
      { table: "tasks", column: "projekt_id" },
      { table: "tasks", column: "project_id" },
      { table: "tasks", column: "baustelle_id" },
      { table: "projekt_aufgaben", column: "projekt_id" },
      { table: "projekt_aufgaben", column: "project_id" },
      { table: "projekt_aufgaben", column: "baustelle_id" },
    ];

    for (const config of configs) {
      const { data, error } = await supabase
        .from(config.table)
        .select("*")
        .eq(config.column, projektIdValue);

      if (!error) {
        const sorted = [...(data || [])].sort((a: any, b: any) => {
          const statusA = String(getStatus(a)).toLowerCase();
          const statusB = String(getStatus(b)).toLowerCase();

          if (statusA === "fertig" && statusB !== "fertig") return 1;
          if (statusA !== "fertig" && statusB === "fertig") return -1;

          const dueA = String(getDueDate(a) || "9999-12-31");
          const dueB = String(getDueDate(b) || "9999-12-31");

          if (dueA === dueB) {
            return String(getDate(b)).localeCompare(String(getDate(a)));
          }

          return dueA.localeCompare(dueB);
        });

        setAufgabenConfig(config);
        setAufgaben(sorted);
        return;
      }
    }

    setAufgaben([]);
    setErrorText(
      "Ne mogu učitati Aufgaben. Provjeri tabelu aufgaben i kolonu projekt_id."
    );
  }

  const filtered = useMemo(() => {
    return aufgaben.filter((row) => {
      const text = `
        ${getDate(row)}
        ${getTitle(row)}
        ${getDescription(row)}
        ${getAssigned(row)}
        ${getDueDate(row)}
        ${getPriority(row)}
        ${getStatus(row)}
      `.toLowerCase();

      const searchOk = text.includes(search.toLowerCase());
      const statusOk = filterStatus === "Alle" || getStatus(row) === filterStatus;
      const workerOk = filterRadnik === "Alle" || getAssigned(row) === filterRadnik;

      return searchOk && statusOk && workerOk;
    });
  }, [aufgaben, search, filterStatus, filterRadnik]);

  const offenCount = useMemo(() => {
    return filtered.filter((row) => {
      return String(getStatus(row)).toLowerCase() !== "fertig";
    }).length;
  }, [filtered]);

  const fertigCount = useMemo(() => {
    return filtered.filter((row) => {
      return String(getStatus(row)).toLowerCase() === "fertig";
    }).length;
  }, [filtered]);

  const overdueCount = useMemo(() => {
    const now = today();

    return filtered.filter((row) => {
      const due = getDueDate(row);
      const status = String(getStatus(row)).toLowerCase();

      return due && due < now && status !== "fertig";
    }).length;
  }, [filtered]);

  function isDuplicate(values: AufgabeForm) {
    return aufgaben.some((row) => {
      if (editId && String(row.id) === String(editId)) return false;

      return (
        String(getTitle(row)).trim().toLowerCase() ===
          values.titel.trim().toLowerCase() &&
        String(getAssigned(row)).trim().toLowerCase() ===
          values.zugewiesen_an.trim().toLowerCase()
      );
    });
  }

  function buildPayloads(values: AufgabeForm) {
    const base: any = {};
    base[aufgabenConfig.column] = projektIdValue;

    return [
      {
        ...base,
        datum: values.datum,
        titel: values.titel.trim(),
        beschreibung: values.beschreibung.trim(),
        zugewiesen_an: values.zugewiesen_an.trim(),
        faellig_am: values.faellig_am || null,
        prioritaet: values.prioritaet,
        status: values.status,
      },
      {
        ...base,
        date: values.datum,
        title: values.titel.trim(),
        description: values.beschreibung.trim(),
        assigned_to: values.zugewiesen_an.trim(),
        due_date: values.faellig_am || null,
        priority: values.prioritaet,
        status: values.status,
      },
      {
        ...base,
        datum: values.datum,
        aufgabe: values.titel.trim(),
        notiz: values.beschreibung.trim(),
        radnik: values.zugewiesen_an.trim(),
        deadline: values.faellig_am || null,
        prioritaet: values.prioritaet,
        status: values.status,
      },
      {
        ...base,
        name: values.titel.trim(),
        info: values.beschreibung.trim(),
        worker: values.zugewiesen_an.trim(),
        status: values.status,
      },
      {
        ...base,
        title: values.titel.trim(),
        status: values.status,
      },
    ];
  }

  async function saveAufgabe() {
    if (!form.titel.trim()) {
      alert("Upiši naziv zadatka.");
      return;
    }

    if (isDuplicate(form) && !editId) {
      alert("Ovaj zadatak već postoji za istog radnika.");
      return;
    }

    setSaving(true);
    let lastError: any = null;

    for (const payload of buildPayloads(form)) {
      const query = editId
        ? supabase
            .from(aufgabenConfig.table)
            .update(payload as any)
            .eq("id", editId)
        : supabase.from(aufgabenConfig.table).insert(payload as any);

      const { error } = await query;

      if (!error) {
        resetForm();
        setShowForm(false);
        setSaving(false);
        await loadAufgaben();
        return;
      }

      lastError = error;
    }

    setSaving(false);
    alert("Greška kod spremanja Aufgabe: " + (lastError?.message || ""));
  }

  function quickAufgabe(title: string, worker: string) {
    setEditId(null);
    setForm({
      datum: today(),
      titel: title,
      beschreibung: "",
      zugewiesen_an: worker,
      faellig_am: "",
      prioritaet: "Normal",
      status: "Offen",
    });
    setShowForm(true);
  }

  function startEdit(row: any) {
    setEditId(row.id);

    setForm({
      datum: String(getDate(row) || today()),
      titel: String(getTitle(row) || ""),
      beschreibung: String(getDescription(row) || ""),
      zugewiesen_an: String(getAssigned(row) || ""),
      faellig_am: String(getDueDate(row) || ""),
      prioritaet: String(getPriority(row) || "Normal"),
      status: String(getStatus(row) || "Offen"),
    });

    setShowForm(true);
  }

  async function changeStatus(row: any, newStatus: string) {
    const payloads: any[] = [
      { status: newStatus },
      { status: newStatus, erledigt: newStatus === "Fertig" },
      { status: newStatus, done: newStatus === "Fertig" },
    ];

    let lastError: any = null;

    for (const payload of payloads) {
      const { error } = await supabase
        .from(aufgabenConfig.table)
        .update(payload as any)
        .eq("id", row.id);

      if (!error) {
        await loadAufgaben();
        return;
      }

      lastError = error;
    }

    alert("Greška kod statusa: " + (lastError?.message || ""));
  }

  async function deleteAufgabe(row: any) {
    const ok = confirm(`Da li želiš obrisati zadatak: ${getTitle(row)}?`);

    if (!ok) return;

    const { error } = await supabase
      .from(aufgabenConfig.table)
      .delete()
      .eq("id", row.id);

    if (error) {
      alert("Greška kod brisanja: " + error.message);
      return;
    }

    await loadAufgaben();
  }

  return (
    <main className="page">
      <section className="top">
        <div>
          <Link className="back" href={`/projekte/${projektId}`}>
            ← Zurück zu Projekt
          </Link>

          <p className="label">Projekt Aufgaben</p>
          <h1>Aufgaben</h1>
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
            + Aufgabe hinzufügen
          </button>
        </div>
      </section>

      {errorText && <div className="errorBox">{errorText}</div>}

      <section className="stats">
        <div className="stat">
          <span>Offen</span>
          <strong>{offenCount}</strong>
        </div>

        <div className="stat">
          <span>Fertig</span>
          <strong>{fertigCount}</strong>
        </div>

        <div className="stat dangerStat">
          <span>Überfällig</span>
          <strong>{overdueCount}</strong>
        </div>
      </section>

      <section className="toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Traži zadatak, radnika, opis, datum..."
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="Alle">Alle Status</option>
          {STATUS_LISTE.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={filterRadnik}
          onChange={(e) => setFilterRadnik(e.target.value)}
        >
          <option value="Alle">Alle Radnici</option>
          {RADNICI.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </section>

      <section className="quickAdd">
        <h2>Brzi zadaci</h2>

        <div className="quickGrid">
          {[
            "Baustelle vorbereiten",
            "Material prüfen",
            "Fotos machen",
            "Mangel melden",
            "Arbeitszeit eintragen",
            "Tagesbericht schreiben",
            "Aufräumen",
            "Abnahme vorbereiten",
          ].map((title) => (
            <button key={title} onClick={() => quickAufgabe(title, "")}>
              + {title}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="emptyBox">Učitavanje Aufgaben...</div>
      ) : filtered.length === 0 ? (
        <div className="emptyBox">
          <h2>Nema zadataka</h2>
          <p>Dodaj prvi zadatak za ovaj projekt.</p>
        </div>
      ) : (
        <section className="grid">
          {filtered.map((row) => {
            const due = getDueDate(row);
            const isDone = String(getStatus(row)).toLowerCase() === "fertig";
            const isOverdue = due && due < today() && !isDone;

            return (
              <article key={row.id} className={isOverdue ? "card overdue" : "card"}>
                <div className="cardTop">
                  <div>
                    <h2>{getTitle(row) || "Aufgabe"}</h2>
                    <p>
                      Erstellt: {getDate(row) || "-"}
                      {due ? ` · Fällig: ${due}` : ""}
                    </p>
                  </div>

                  <span className={isDone ? "badge done" : "badge"}>
                    {getStatus(row)}
                  </span>
                </div>

                <div className="detailGrid">
                  <div>
                    <span>Radnik</span>
                    <strong>{getAssigned(row) || "Nicht zugewiesen"}</strong>
                  </div>

                  <div>
                    <span>Priorität</span>
                    <strong>{getPriority(row)}</strong>
                  </div>
                </div>

                {isOverdue && (
                  <div className="warningBox">
                    Ovaj zadatak je preko roka.
                  </div>
                )}

                {getDescription(row) && (
                  <p className="description">{getDescription(row)}</p>
                )}

                <div className="actions">
                  <button onClick={() => startEdit(row)}>Bearbeiten</button>
                  <button onClick={() => changeStatus(row, "In Arbeit")}>
                    In Arbeit
                  </button>
                  <button onClick={() => changeStatus(row, "Fertig")}>
                    Fertig
                  </button>
                  <button className="delete" onClick={() => deleteAufgabe(row)}>
                    Löschen
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {showForm && (
        <div className="modalBg">
          <div className="modal">
            <div className="modalHead">
              <h2>{editId ? "Aufgabe bearbeiten" : "Aufgabe hinzufügen"}</h2>

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

            <label>Aufgabe *</label>
            <input
              value={form.titel}
              onChange={(e) =>
                setForm((old) => ({ ...old, titel: e.target.value }))
              }
              placeholder="z.B. Material prüfen"
            />

            <label>Beschreibung</label>
            <textarea
              value={form.beschreibung}
              onChange={(e) =>
                setForm((old) => ({ ...old, beschreibung: e.target.value }))
              }
              placeholder="Opis zadatka"
            />

            <label>Zugewiesen an</label>
            <select
              value={form.zugewiesen_an}
              onChange={(e) =>
                setForm((old) => ({
                  ...old,
                  zugewiesen_an: e.target.value,
                }))
              }
            >
              <option value="">Nicht zugewiesen</option>
              {RADNICI.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <label>Oder Name manuell</label>
            <input
              value={form.zugewiesen_an}
              onChange={(e) =>
                setForm((old) => ({
                  ...old,
                  zugewiesen_an: e.target.value,
                }))
              }
              placeholder="Ime radnika"
            />

            <div className="twoGrid">
              <div>
                <label>Fällig am</label>
                <input
                  type="date"
                  value={form.faellig_am}
                  onChange={(e) =>
                    setForm((old) => ({
                      ...old,
                      faellig_am: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label>Priorität</label>
                <select
                  value={form.prioritaet}
                  onChange={(e) =>
                    setForm((old) => ({
                      ...old,
                      prioritaet: e.target.value,
                    }))
                  }
                >
                  {PRIORITAETEN.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label>Status</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((old) => ({ ...old, status: e.target.value }))
              }
            >
              {STATUS_LISTE.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
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

              <button className="save" onClick={saveAufgabe} disabled={saving}>
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

        .dangerStat strong {
          color: #fca5a5;
        }

        .toolbar {
          display: grid;
          grid-template-columns: 1fr 190px 190px;
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

        .quickAdd {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 18px;
          margin-bottom: 18px;
        }

        .quickAdd h2 {
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
          grid-template-columns: repeat(auto-fit, minmax(330px, 1fr));
          gap: 18px;
        }

        .card {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 22px;
          padding: 20px;
        }

        .card.overdue {
          border-color: #dc2626;
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
        }

        .warningBox {
          background: #7f1d1d;
          border: 1px solid #ef4444;
          border-radius: 14px;
          padding: 12px;
          color: white;
          font-weight: 900;
          margin-bottom: 12px;
        }

        .description {
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
          min-height: 110px;
          resize: vertical;
        }

        .twoGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
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

        @media (max-width: 900px) {
          .toolbar,
          .quickGrid {
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
          .detailGrid,
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