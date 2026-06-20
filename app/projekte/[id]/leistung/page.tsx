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

type LeistungForm = {
  datum: string;
  radnik: string;
  titel: string;
  beschreibung: string;
  gruppe: string;
  menge: string;
  einheit: string;
  position_id: string;
  status: string;
  notiz: string;
};

const RADNICI = ["Arnes", "Ramiz", "Abror", "Shohruh", "Harun"];

const GRUPPEN = [
  "Keramika",
  "Priprema podloge",
  "Estrich",
  "Hidroizolacija",
  "Ljepilo",
  "Schienen",
  "Fuge",
  "Silikoni",
  "Terase",
  "Dodaci",
];

const EINHEITEN = ["m²", "m", "Stk.", "kg", "Sack", "Eimer", "Pauschal"];

const STATUS_LISTE = ["Offen", "In Arbeit", "Fertig"];

export default function ProjektLeistungPage() {
  const params = useParams();
  const projektId = String(params.id);
  const projektIdValue = isNaN(Number(projektId))
    ? projektId
    : Number(projektId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [leistungen, setLeistungen] = useState<any[]>([]);
  const [positionen, setPositionen] = useState<any[]>([]);
  const [errorText, setErrorText] = useState("");

  const [leistungConfig, setLeistungConfig] = useState<TableConfig>({
    table: "leistungen",
    column: "projekt_id",
  });

  const [search, setSearch] = useState("");
  const [filterRadnik, setFilterRadnik] = useState("Alle");
  const [filterGruppe, setFilterGruppe] = useState("Alle");
  const [filterStatus, setFilterStatus] = useState("Alle");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | string | null>(null);

  const [form, setForm] = useState<LeistungForm>({
    datum: today(),
    radnik: "",
    titel: "",
    beschreibung: "",
    gruppe: "Keramika",
    menge: "",
    einheit: "m²",
    position_id: "",
    status: "Offen",
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

  function getTitle(row: any) {
    return row.titel || row.title || row.name || row.leistung || row.work || "";
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

  function getGroup(row: any) {
    return row.gruppe || row.group_name || row.kategorie || row.category || row.typ || "Dodaci";
  }

  function getQuantity(row: any) {
    return row.menge || row.quantity || row.kolicina || row.qty || row.anzahl || "";
  }

  function getUnit(row: any) {
    return row.einheit || row.unit || row.jedinica || "m²";
  }

  function getPositionId(row: any) {
    return row.position_id || row.pos_id || row.lv_position_id || "";
  }

  function getStatus(row: any) {
    return row.status || "Offen";
  }

  function getNote(row: any) {
    return row.notiz || row.note || row.bemerkung || row.info || "";
  }

  function getPositionTitle(row: any) {
    return row.titel || row.title || row.name || row.position || row.bezeichnung || "";
  }

  function getPositionNumber(row: any) {
    return row.nummer || row.position_nr || row.pos_nr || row.number || row.nr || "";
  }

  function getPositionDisplay(position: any) {
    const nr = getPositionNumber(position);
    const title = getPositionTitle(position);

    if (nr && title) return `${nr} · ${title}`;
    if (title) return title;
    if (nr) return nr;

    return `Position ${position.id}`;
  }

  function findPositionName(positionId: string | number) {
    if (!positionId) return "";
    const position = positionen.find((p) => String(p.id) === String(positionId));
    return position ? getPositionDisplay(position) : "";
  }

  function resetForm() {
    setEditId(null);
    setForm({
      datum: today(),
      radnik: "",
      titel: "",
      beschreibung: "",
      gruppe: "Keramika",
      menge: "",
      einheit: "m²",
      position_id: "",
      status: "Offen",
      notiz: "",
    });
  }

  async function loadAll() {
    setLoading(true);
    setErrorText("");

    await loadProjekt();
    await loadPositionen();
    await loadLeistungen();

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

  async function loadPositionen() {
    const configs: TableConfig[] = [
      { table: "positionen", column: "projekt_id" },
      { table: "positionen", column: "project_id" },
      { table: "positionen", column: "baustelle_id" },
      { table: "projekt_positionen", column: "projekt_id" },
      { table: "projekt_positionen", column: "project_id" },
      { table: "lv_positionen", column: "projekt_id" },
      { table: "positions", column: "project_id" },
    ];

    for (const config of configs) {
      const { data, error } = await supabase
        .from(config.table)
        .select("*")
        .eq(config.column, projektIdValue);

      if (!error) {
        const sorted = [...(data || [])].sort((a: any, b: any) => {
          return String(getPositionDisplay(a)).localeCompare(
            String(getPositionDisplay(b)),
            undefined,
            { numeric: true }
          );
        });

        setPositionen(sorted);
        return;
      }
    }

    setPositionen([]);
  }

  async function loadLeistungen() {
    const configs: TableConfig[] = [
      { table: "leistungen", column: "projekt_id" },
      { table: "leistungen", column: "project_id" },
      { table: "leistungen", column: "baustelle_id" },
      { table: "leistung", column: "projekt_id" },
      { table: "leistung", column: "project_id" },
      { table: "leistung", column: "baustelle_id" },
      { table: "produktivitaet", column: "projekt_id" },
      { table: "produktivitaet", column: "project_id" },
      { table: "productivity", column: "projekt_id" },
      { table: "productivity", column: "project_id" },
      { table: "projekt_leistung", column: "projekt_id" },
      { table: "projekt_leistung", column: "project_id" },
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

        setLeistungConfig(config);
        setLeistungen(sorted);
        return;
      }
    }

    setLeistungen([]);
    setErrorText(
      "Ne mogu učitati Leistung. Provjeri tabelu leistungen i kolonu projekt_id."
    );
  }

  const filtered = useMemo(() => {
    return leistungen.filter((row) => {
      const positionName = findPositionName(getPositionId(row));

      const text = `
        ${getDate(row)}
        ${getWorker(row)}
        ${getTitle(row)}
        ${getDescription(row)}
        ${getGroup(row)}
        ${getQuantity(row)}
        ${getUnit(row)}
        ${getStatus(row)}
        ${getNote(row)}
        ${positionName}
      `.toLowerCase();

      const searchOk = text.includes(search.toLowerCase());
      const workerOk = filterRadnik === "Alle" || getWorker(row) === filterRadnik;
      const groupOk = filterGruppe === "Alle" || getGroup(row) === filterGruppe;
      const statusOk = filterStatus === "Alle" || getStatus(row) === filterStatus;

      return searchOk && workerOk && groupOk && statusOk;
    });
  }, [leistungen, search, filterRadnik, filterGruppe, filterStatus, positionen]);

  const summaryByWorker = useMemo(() => {
    const result: { [key: string]: number } = {};

    filtered.forEach((row) => {
      const worker = getWorker(row) || "Ohne Name";
      result[worker] = (result[worker] || 0) + 1;
    });

    return Object.entries(result)
      .map(([worker, count]) => ({ worker, count }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const summaryByGroup = useMemo(() => {
    const result: {
      [key: string]: { group: string; unit: string; qty: number; count: number };
    } = {};

    filtered.forEach((row) => {
      const group = getGroup(row);
      const unit = getUnit(row);
      const key = `${group}__${unit}`;
      const qty = toNumber(getQuantity(row));

      if (!result[key]) {
        result[key] = {
          group,
          unit,
          qty: 0,
          count: 0,
        };
      }

      result[key].qty += qty;
      result[key].count += 1;
    });

    return Object.values(result).sort((a, b) => a.group.localeCompare(b.group));
  }, [filtered]);

  function selectPosition(positionId: string) {
    const position = positionen.find((p) => String(p.id) === String(positionId));

    if (!position) {
      setForm((old) => ({ ...old, position_id: positionId }));
      return;
    }

    setForm((old) => ({
      ...old,
      position_id: positionId,
      titel: old.titel || getPositionTitle(position),
      gruppe: getGroup(position),
      einheit: getUnit(position),
    }));
  }

  function isDuplicate(values: LeistungForm) {
    return leistungen.some((row) => {
      if (editId && String(row.id) === String(editId)) return false;

      return (
        String(getDate(row)) === String(values.datum) &&
        String(getWorker(row)).trim().toLowerCase() ===
          values.radnik.trim().toLowerCase() &&
        String(getTitle(row)).trim().toLowerCase() ===
          values.titel.trim().toLowerCase() &&
        toNumber(getQuantity(row)) === toNumber(values.menge)
      );
    });
  }

  function buildPayloads(values: LeistungForm) {
    const base: any = {};
    base[leistungConfig.column] = projektIdValue;

    const qty = toNumber(values.menge);

    const positionValue =
      values.position_id && !isNaN(Number(values.position_id))
        ? Number(values.position_id)
        : values.position_id;

    const positionPayload = values.position_id
      ? { position_id: positionValue }
      : {};

    return [
      {
        ...base,
        ...positionPayload,
        datum: values.datum,
        radnik: values.radnik.trim(),
        titel: values.titel.trim(),
        beschreibung: values.beschreibung.trim(),
        gruppe: values.gruppe,
        menge: qty,
        einheit: values.einheit,
        status: values.status,
        notiz: values.notiz.trim(),
      },
      {
        ...base,
        ...positionPayload,
        date: values.datum,
        worker: values.radnik.trim(),
        title: values.titel.trim(),
        description: values.beschreibung.trim(),
        category: values.gruppe,
        quantity: qty,
        unit: values.einheit,
        status: values.status,
        note: values.notiz.trim(),
      },
      {
        ...base,
        ...positionPayload,
        datum: values.datum,
        arbeiter: values.radnik.trim(),
        leistung: values.titel.trim(),
        arbeiten: values.beschreibung.trim(),
        kategorie: values.gruppe,
        menge: qty,
        einheit: values.einheit,
        status: values.status,
        bemerkung: values.notiz.trim(),
      },
      {
        ...base,
        datum: values.datum,
        name: values.radnik.trim(),
        title: values.titel.trim(),
        quantity: qty,
        unit: values.einheit,
        status: values.status,
      },
      {
        ...base,
        datum: values.datum,
        leistung: values.titel.trim(),
        menge: qty,
      },
    ];
  }

  async function saveLeistung() {
    if (!form.radnik.trim()) {
      alert("Odaberi ili upiši radnika.");
      return;
    }

    if (!form.titel.trim()) {
      alert("Upiši naziv rada / Leistung.");
      return;
    }

    if (!form.menge.trim()) {
      alert("Upiši količinu.");
      return;
    }

    if (isDuplicate(form) && !editId) {
      alert("Ovaj Leistung unos već postoji.");
      return;
    }

    setSaving(true);
    let lastError: any = null;

    for (const payload of buildPayloads(form)) {
      const query = editId
        ? supabase
            .from(leistungConfig.table)
            .update(payload as any)
            .eq("id", editId)
        : supabase.from(leistungConfig.table).insert(payload as any);

      const { error } = await query;

      if (!error) {
        resetForm();
        setShowForm(false);
        setSaving(false);
        await loadLeistungen();
        return;
      }

      lastError = error;
    }

    setSaving(false);
    alert("Greška kod spremanja Leistung: " + (lastError?.message || ""));
  }

  function quickLeistung(title: string, group: string, unit: string) {
    setEditId(null);
    setForm({
      datum: today(),
      radnik: "",
      titel: title,
      beschreibung: "",
      gruppe: group,
      menge: "",
      einheit: unit,
      position_id: "",
      status: "Offen",
      notiz: "",
    });
    setShowForm(true);
  }

  function startEdit(row: any) {
    setEditId(row.id);

    setForm({
      datum: String(getDate(row) || today()),
      radnik: String(getWorker(row) || ""),
      titel: String(getTitle(row) || ""),
      beschreibung: String(getDescription(row) || ""),
      gruppe: String(getGroup(row) || "Keramika"),
      menge: String(getQuantity(row) || ""),
      einheit: String(getUnit(row) || "m²"),
      position_id: String(getPositionId(row) || ""),
      status: String(getStatus(row) || "Offen"),
      notiz: String(getNote(row) || ""),
    });

    setShowForm(true);
  }

  async function changeStatus(row: any, newStatus: string) {
    const { error } = await supabase
      .from(leistungConfig.table)
      .update({ status: newStatus } as any)
      .eq("id", row.id);

    if (error) {
      alert("Greška kod statusa: " + error.message);
      return;
    }

    await loadLeistungen();
  }

  async function deleteLeistung(row: any) {
    const ok = confirm(`Da li želiš obrisati Leistung: ${getTitle(row)}?`);

    if (!ok) return;

    const { error } = await supabase
      .from(leistungConfig.table)
      .delete()
      .eq("id", row.id);

    if (error) {
      alert("Greška kod brisanja: " + error.message);
      return;
    }

    await loadLeistungen();
  }

  return (
    <main className="page">
      <section className="top">
        <div>
          <Link className="back" href={`/projekte/${projektId}`}>
            ← Zurück zu Projekt
          </Link>

          <p className="label">Projekt Leistung</p>
          <h1>Leistung</h1>
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
            + Leistung hinzufügen
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
          <span>Radnici</span>
          <strong>{summaryByWorker.length}</strong>
        </div>

        <div className="stat">
          <span>Gruppen</span>
          <strong>{new Set(filtered.map((row) => getGroup(row))).size}</strong>
        </div>
      </section>

      <section className="toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Traži radnika, Leistung, grupu, poziciju..."
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
          value={filterGruppe}
          onChange={(e) => setFilterGruppe(e.target.value)}
        >
          <option value="Alle">Alle Gruppen</option>
          {GRUPPEN.map((gruppe) => (
            <option key={gruppe} value={gruppe}>
              {gruppe}
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
      </section>

      <section className="quickAdd">
        <h2>Brzi unos Leistung</h2>

        <div className="quickGrid">
          {[
            { title: "Fliesen verlegt", group: "Keramika", unit: "m²" },
            { title: "Untergrund vorbereitet", group: "Priprema podloge", unit: "m²" },
            { title: "Abdichtung gemacht", group: "Hidroizolacija", unit: "m²" },
            { title: "Schienen gesetzt", group: "Schienen", unit: "m" },
            { title: "Verfugt", group: "Fuge", unit: "m²" },
            { title: "Silikon gemacht", group: "Silikoni", unit: "m" },
            { title: "Estrich gemacht", group: "Estrich", unit: "m²" },
            { title: "Zusatzarbeit", group: "Dodaci", unit: "Stk." },
          ].map((item) => (
            <button
              key={`${item.title}-${item.group}`}
              onClick={() => quickLeistung(item.title, item.group, item.unit)}
            >
              + {item.title}
            </button>
          ))}
        </div>
      </section>

      {summaryByGroup.length > 0 && (
        <section className="summaryBox">
          <h2>Sažetak po grupama</h2>

          <div className="summaryGrid">
            {summaryByGroup.map((item) => (
              <div key={`${item.group}-${item.unit}`}>
                <span>{item.group}</span>
                <strong>
                  {formatNumber(item.qty)} {item.unit}
                </strong>
                <p>{item.count} unosa</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {summaryByWorker.length > 0 && (
        <section className="summaryBox">
          <h2>Unosi po radniku</h2>

          <div className="summaryGrid">
            {summaryByWorker.map((item) => (
              <div key={item.worker}>
                <span>Radnik</span>
                <strong>{item.worker}</strong>
                <p>{item.count} unosa</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="emptyBox">Učitavanje Leistung...</div>
      ) : filtered.length === 0 ? (
        <div className="emptyBox">
          <h2>Nema Leistung unosa</h2>
          <p>Dodaj prvi urađeni rad za ovaj projekt.</p>
        </div>
      ) : (
        <section className="grid">
          {filtered.map((row) => (
            <article key={row.id} className="card">
              <div className="cardTop">
                <div>
                  <h2>{getTitle(row) || "Leistung"}</h2>
                  <p>
                    {getDate(row) || "-"}
                    {getWorker(row) ? ` · ${getWorker(row)}` : ""}
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

              <div className="amount">
                <span>Menge</span>
                <strong>
                  {formatNumber(getQuantity(row))} {getUnit(row)}
                </strong>
              </div>

              <div className="meta">
                <span>{getGroup(row)}</span>
                {findPositionName(getPositionId(row)) && (
                  <span>{findPositionName(getPositionId(row))}</span>
                )}
              </div>

              {getDescription(row) && (
                <p className="description">{getDescription(row)}</p>
              )}

              {getNote(row) && <p className="note">{getNote(row)}</p>}

              <div className="actions">
                <button onClick={() => startEdit(row)}>Bearbeiten</button>
                <button onClick={() => changeStatus(row, "In Arbeit")}>
                  In Arbeit
                </button>
                <button onClick={() => changeStatus(row, "Fertig")}>
                  Fertig
                </button>
                <button className="delete" onClick={() => deleteLeistung(row)}>
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
              <h2>{editId ? "Leistung bearbeiten" : "Leistung hinzufügen"}</h2>

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

            {positionen.length > 0 && (
              <>
                <label>Position / LV</label>
                <select
                  value={form.position_id}
                  onChange={(e) => selectPosition(e.target.value)}
                >
                  <option value="">Ohne Position</option>
                  {positionen.map((position) => (
                    <option key={position.id} value={position.id}>
                      {getPositionDisplay(position)}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label>Leistung *</label>
            <input
              value={form.titel}
              onChange={(e) =>
                setForm((old) => ({ ...old, titel: e.target.value }))
              }
              placeholder="z.B. Fliesen verlegt"
            />

            <label>Beschreibung</label>
            <textarea
              value={form.beschreibung}
              onChange={(e) =>
                setForm((old) => ({ ...old, beschreibung: e.target.value }))
              }
              placeholder="Opis urađenog rada"
            />

            <div className="threeGrid">
              <div>
                <label>Menge *</label>
                <input
                  value={form.menge}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, menge: e.target.value }))
                  }
                  inputMode="decimal"
                  placeholder="z.B. 25"
                />
              </div>

              <div>
                <label>Einheit</label>
                <select
                  value={form.einheit}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, einheit: e.target.value }))
                  }
                >
                  {EINHEITEN.map((einheit) => (
                    <option key={einheit} value={einheit}>
                      {einheit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Gruppe</label>
                <select
                  value={form.gruppe}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, gruppe: e.target.value }))
                  }
                >
                  {GRUPPEN.map((gruppe) => (
                    <option key={gruppe} value={gruppe}>
                      {gruppe}
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
              {STATUS_LISTE.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

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

              <button className="save" onClick={saveLeistung} disabled={saving}>
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
          grid-template-columns: 1fr 170px 210px 170px;
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
          grid-template-columns: repeat(auto-fit, minmax(330px, 1fr));
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

        .amount {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 14px;
          margin-bottom: 12px;
        }

        .amount span {
          display: block;
          color: #9ca3af;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .amount strong {
          font-size: 30px;
          color: #bbf7d0;
        }

        .meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .meta span {
          display: inline-block;
          background: #0b1220;
          border: 1px solid #374151;
          color: #d1d5db;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 13px;
          font-weight: 800;
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
          min-height: 100px;
          resize: vertical;
        }

        .threeGrid {
          display: grid;
          grid-template-columns: 1fr 150px 1fr;
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

        @media (max-width: 1050px) {
          .toolbar,
          .quickGrid,
          .threeGrid {
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
          .grid {
            grid-template-columns: 1fr;
          }

          .actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}"use client";

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

const t: Record<Lang, any> = {
  de: {
    back: "Zurück",
    title: "Leistung",
    subtitle:
      "Leistung muss mit Raum und LV Position verbunden sein. Nur so kann die Arbeit richtig kontrolliert werden.",
    language: "Sprache",
    worker: "Angemeldeter Arbeiter",
    noWorker:
      "Kein Arbeiter angemeldet. Bitte zuerst über Login mit PIN anmelden.",
    date: "Datum",
    room: "Raum",
    selectRoom: "Raum auswählen",
    position: "LV Position",
    selectPosition: "LV Position auswählen",
    noRooms: "Keine Räume vorhanden. Bitte zuerst im Admin Räume hinzufügen.",
    noPositions:
      "Keine LV Positionen vorhanden. Bitte zuerst im Admin LV Positionen hinzufügen.",
    work: "Ausgeführte Arbeit",
    workPlaceholder: "Was wurde gemacht?",
    quantity: "Menge",
    unit: "Einheit",
    planned: "Geplant",
    doneBefore: "Bisher erfasst",
    remaining: "Rest",
    note: "Notiz",
    notePlaceholder: "Notiz zur Leistung",
    save: "Leistung speichern",
    saving: "Speichern...",
    todayEntries: "Heutige Leistungen",
    noEntries: "Keine Leistungen für heute.",
    successSaved: "Leistung wurde gespeichert.",
    errors: {
      noWorker:
        "Kein Arbeiter angemeldet. Bitte zuerst über Login mit PIN anmelden.",
      selectRoom: "Bitte Raum auswählen.",
      selectPosition: "Bitte LV Position auswählen.",
      enterWork: "Bitte eintragen, was gemacht wurde.",
      enterQuantity: "Bitte Menge eintragen.",
      invalidQuantity: "Bitte gültige Menge eintragen.",
      duplicate: "Diese Leistung wurde bereits eingetragen.",
      saveFailed: "Leistung konnte nicht gespeichert werden.",
    },
  },
  ba: {
    back: "Nazad",
    title: "Urađeni posao",
    subtitle:
      "Urađeni posao mora biti povezan sa prostorijom i LV pozicijom.",
    language: "Jezik",
    worker: "Prijavljeni radnik",
    noWorker:
      "Radnik nije prijavljen. Prvo se prijavi preko Login stranice sa PIN kodom.",
    date: "Datum",
    room: "Prostorija",
    selectRoom: "Odaberi prostoriju",
    position: "LV pozicija",
    selectPosition: "Odaberi LV poziciju",
    noRooms: "Nema prostorija. Prvo u adminu dodaj prostorije.",
    noPositions: "Nema LV pozicija. Prvo u adminu dodaj LV pozicije.",
    work: "Šta je urađeno",
    workPlaceholder: "Upiši šta je urađeno",
    quantity: "Količina",
    unit: "Jedinica",
    planned: "Planirano",
    doneBefore: "Do sada uneseno",
    remaining: "Ostalo",
    note: "Napomena",
    notePlaceholder: "Napomena za urađeni posao",
    save: "Spremi urađeni posao",
    saving: "Spremanje...",
    todayEntries: "Današnji urađeni poslovi",
    noEntries: "Nema unosa za danas.",
    successSaved: "Urađeni posao je spremljen.",
    errors: {
      noWorker:
        "Radnik nije prijavljen. Prvo se prijavi preko Login stranice sa PIN kodom.",
      selectRoom: "Odaberi prostoriju.",
      selectPosition: "Odaberi LV poziciju.",
      enterWork: "Upiši šta je urađeno.",
      enterQuantity: "Upiši količinu.",
      invalidQuantity: "Upiši ispravnu količinu.",
      duplicate: "Ovaj unos već postoji.",
      saveFailed: "Urađeni posao nije spremljen.",
    },
  },
  en: {
    back: "Back",
    title: "Work performance",
    subtitle: "Work performance must be connected to a room and LV position.",
    language: "Language",
    worker: "Logged-in worker",
    noWorker:
      "No worker is logged in. Please log in first with PIN on the Login page.",
    date: "Date",
    room: "Room",
    selectRoom: "Select room",
    position: "LV position",
    selectPosition: "Select LV position",
    noRooms: "No rooms available. Please add rooms in admin first.",
    noPositions: "No LV positions available. Please add LV positions in admin first.",
    work: "Work done",
    workPlaceholder: "Enter what was done",
    quantity: "Quantity",
    unit: "Unit",
    planned: "Planned",
    doneBefore: "Already entered",
    remaining: "Remaining",
    note: "Note",
    notePlaceholder: "Note for work performance",
    save: "Save work performance",
    saving: "Saving...",
    todayEntries: "Today’s work performance",
    noEntries: "No entries for today.",
    successSaved: "Work performance was saved.",
    errors: {
      noWorker:
        "No worker is logged in. Please log in first with PIN on the Login page.",
      selectRoom: "Select room.",
      selectPosition: "Select LV position.",
      enterWork: "Enter what was done.",
      enterQuantity: "Enter quantity.",
      invalidQuantity: "Enter a valid quantity.",
      duplicate: "This entry already exists.",
      saveFailed: "Work performance could not be saved.",
    },
  },
  uz: {
    back: "Orqaga",
    title: "Bajarilgan ish",
    subtitle: "Bajarilgan ish xona va LV pozitsiya bilan bog‘lanishi kerak.",
    language: "Til",
    worker: "Kirilgan ishchi",
    noWorker:
      "Ishchi tizimga kirmagan. Avval Login sahifasida PIN bilan kiring.",
    date: "Sana",
    room: "Xona",
    selectRoom: "Xonani tanlang",
    position: "LV pozitsiya",
    selectPosition: "LV pozitsiyani tanlang",
    noRooms: "Xonalar yo‘q. Avval admin qismida xona qo‘shing.",
    noPositions: "LV pozitsiyalar yo‘q. Avval admin qismida LV qo‘shing.",
    work: "Qilingan ish",
    workPlaceholder: "Nima ish qilinganini yozing",
    quantity: "Miqdor",
    unit: "Birlik",
    planned: "Reja",
    doneBefore: "Oldin kiritilgan",
    remaining: "Qolgan",
    note: "Izoh",
    notePlaceholder: "Bajarilgan ish uchun izoh",
    save: "Bajarilgan ishni saqlash",
    saving: "Saqlanmoqda...",
    todayEntries: "Bugungi bajarilgan ishlar",
    noEntries: "Bugun yozuv yo‘q.",
    successSaved: "Bajarilgan ish saqlandi.",
    errors: {
      noWorker:
        "Ishchi tizimga kirmagan. Avval Login sahifasida PIN bilan kiring.",
      selectRoom: "Xonani tanlang.",
      selectPosition: "LV pozitsiyani tanlang.",
      enterWork: "Nima ish qilinganini yozing.",
      enterQuantity: "Miqdorni kiriting.",
      invalidQuantity: "To‘g‘ri miqdorni kiriting.",
      duplicate: "Bu yozuv allaqachon mavjud.",
      saveFailed: "Bajarilgan ishni saqlab bo‘lmadi.",
    },
  },
};

export default function RadnikLeistungPage() {
  const params = useParams();

  const projektId = String(params.id);
  const projektIdValue = isNaN(Number(projektId))
    ? projektId
    : Number(projektId);

  const [lang, setLang] = useState<Lang>("ba");
  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [raeume, setRaeume] = useState<any[]>([]);
  const [positionen, setPositionen] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);

  const [worker, setWorker] = useState("");
  const [datum, setDatum] = useState(today());
  const [raumId, setRaumId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [arbeit, setArbeit] = useState("");
  const [menge, setMenge] = useState("");
  const [einheit, setEinheit] = useState("");
  const [notiz, setNotiz] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [messageText, setMessageText] = useState("");

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

  function err(key: string) {
    return t[lang]?.errors?.[key] || t.ba.errors[key] || key;
  }

  function showError(key: string) {
    setMessageText("");
    setErrorText(err(key));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showSuccess(key: string) {
    setErrorText("");
    setMessageText(t[lang]?.[key] || t.ba[key] || key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function changeLang(next: Lang) {
    setLang(next);
    localStorage.setItem("appLanguage", next);
    localStorage.setItem("lang", next);
    localStorage.setItem("language", next);
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

  function getRoomEtage(row: any) {
    return row.etage || row.floor || "";
  }

  function getRoomStatus(row: any) {
    return row.status || "";
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
      row.naziv ||
      row.beschreibung ||
      row.description ||
      "LV Position"
    );
  }

  function getPositionDescription(row: any) {
    return row.beschreibung || row.description || row.langtext || row.text || "";
  }

  function getPositionEinheit(row: any) {
    return row.einheit || row.unit || row.jedinica || "";
  }

  function getPositionPlanned(row: any) {
    return (
      row.menge_geplant ||
      row.planned_quantity ||
      row.quantity_planned ||
      row.menge ||
      row.quantity ||
      0
    );
  }

  function getEntryWorker(row: any) {
    return (
      row.radnik ||
      row.worker ||
      row.worker_name ||
      row.arbeiter ||
      row.mitarbeiter ||
      row.name ||
      ""
    );
  }

  function getEntryTitle(row: any) {
    return (
      row.arbeit ||
      row.titel ||
      row.title ||
      row.leistung ||
      row.position_titel ||
      ""
    );
  }

  function toNumber(value: any) {
    const n = Number(String(value || "0").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function formatNumber(value: any) {
    const n = toNumber(value);
    return n.toFixed(2).replace(".", ",").replace(",00", "");
  }

  async function loadAll(workerName = worker, dateValue = datum) {
    setLoading(true);
    setErrorText("");
    setMessageText("");

    await loadProjekt();
    await loadRaeume();
    await loadPositionen();
    await loadEntries(workerName, dateValue);

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
    const tables = ["prostorije", "raeume"];
    let finalRows: any[] = [];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .or(
          `projekt_id.eq.${String(projektId)},project_id.eq.${String(
            projektId
          )},baustelle_id.eq.${String(projektId)}`
        )
        .order("id", { ascending: true });

      if (!error && data && data.length > 0) {
        finalRows = data;
        break;
      }
    }

    setRaeume(finalRows || []);
  }

  async function loadPositionen() {
    const tables = ["positionen", "lv_positionen", "projekt_positionen"];
    let finalRows: any[] = [];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .or(
          `projekt_id.eq.${String(projektId)},project_id.eq.${String(
            projektId
          )},baustelle_id.eq.${String(projektId)}`
        )
        .order("id", { ascending: true });

      if (!error && data && data.length > 0) {
        finalRows = data;
        break;
      }
    }

    setPositionen(finalRows || []);
  }

  async function loadEntries(workerName = worker, dateValue = datum) {
    const { data, error } = await supabase
      .from("leistungen")
      .select("*")
      .eq("projekt_id", String(projektId))
      .eq("datum", dateValue)
      .order("created_at", { ascending: false });

    if (error) {
      setEntries([]);
      return;
    }

    const w = String(workerName || "").toLowerCase();

    setEntries(
      (data || []).filter((row: any) => {
        return !w || String(getEntryWorker(row)).toLowerCase() === w;
      })
    );
  }

  const filteredPositionen = useMemo(() => {
    if (!raumId) return positionen;

    return positionen.filter((row: any) => {
      const rowRaumId = row.raum_id || row.room_id || "";

      return !rowRaumId || String(rowRaumId) === String(raumId);
    });
  }, [positionen, raumId]);

  const selectedRoom = useMemo(() => {
    return raeume.find((row: any) => String(row.id) === String(raumId));
  }, [raeume, raumId]);

  const selectedPosition = useMemo(() => {
    return positionen.find((row: any) => String(row.id) === String(positionId));
  }, [positionen, positionId]);

  const alreadyDoneForPosition = useMemo(() => {
    if (!positionId) return 0;

    return entries
      .filter((row: any) => {
        return (
          String(row.position_id || row.lv_position_id || "") ===
          String(positionId)
        );
      })
      .reduce((sum, row) => sum + toNumber(row.menge || row.quantity || 0), 0);
  }, [entries, positionId]);

  const plannedQty = useMemo(() => {
    if (!selectedPosition) return 0;
    return toNumber(getPositionPlanned(selectedPosition));
  }, [selectedPosition]);

  const remainingQty = useMemo(() => {
    return plannedQty - alreadyDoneForPosition - toNumber(menge);
  }, [plannedQty, alreadyDoneForPosition, menge]);

  const unitFromPosition = useMemo(() => {
    if (!selectedPosition) return "";
    return getPositionEinheit(selectedPosition);
  }, [selectedPosition]);

  function isDuplicate() {
    return entries.some((row: any) => {
      return (
        String(row.datum) === String(datum) &&
        String(getEntryWorker(row)).toLowerCase() === worker.toLowerCase() &&
        String(row.raum_id || "") === String(raumId) &&
        String(row.position_id || "") === String(positionId) &&
        toNumber(row.menge || row.quantity || 0) === toNumber(menge)
      );
    });
  }

  async function saveLeistung() {
    if (saving) return;

    if (!worker.trim()) {
      showError("noWorker");
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

    if (!arbeit.trim()) {
      showError("enterWork");
      return;
    }

    if (!menge.trim()) {
      showError("enterQuantity");
      return;
    }

    const quantity = toNumber(menge);

    if (quantity <= 0) {
      showError("invalidQuantity");
      return;
    }

    if (isDuplicate()) {
      showError("duplicate");
      return;
    }

    setSaving(true);
    setErrorText("");
    setMessageText("");

    const unit = einheit.trim() || unitFromPosition || "";

    const payload = {
      projekt_id: String(projektId),
      project_id: String(projektId),
      baustelle_id: String(projektId),

      datum,
      date: datum,

      radnik: worker.trim(),
      arbeiter: worker.trim(),
      worker: worker.trim(),
      worker_name: worker.trim(),
      name: worker.trim(),

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

      arbeit: arbeidTrim(arbeit),
      titel: arbeit.trim(),
      title: arbeit.trim(),
      leistung: arbeit.trim(),

      beschreibung: selectedPosition ? getPositionDescription(selectedPosition) : "",
      description: selectedPosition ? getPositionDescription(selectedPosition) : "",

      menge: quantity,
      quantity,
      kolicina: quantity,

      einheit: unit,
      unit,
      jedinica: unit,

      notiz: notiz.trim(),
      note: notiz.trim(),
      bemerkung: notiz.trim(),

      status: "Wartet",
      freigabe_status: "Wartet",
      approval_status: "Wartet",
    };

    const { error } = await supabase.from("leistungen").insert(payload as any);

    if (error) {
      setSaving(false);
      showError("saveFailed");
      return;
    }

    setArbeit("");
    setMenge("");
    setEinheit("");
    setNotiz("");

    showSuccess("successSaved");
    await loadEntries(worker, datum);
    setSaving(false);
  }

  function arbeidTrim(value: string) {
    return value.trim();
  }

  return (
    <main className="page">
      <section className="hero">
        <div>
          <Link className="back" href={`/projekte/radnik/${projektId}`}>
            ← {tr("back")}
          </Link>

          <p className="label">{getProjektName()}</p>
          <h1>{tr("title")}</h1>
          <p className="subtitle">
            {getProjektOrt() ? `${getProjektOrt()} · ` : ""}
            {tr("subtitle")}
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
          onChange={(e) => {
            const nextDate = e.target.value;
            setDatum(nextDate);
            loadEntries(worker, nextDate);
          }}
        />

        <label>{tr("room")}</label>
        <select
          value={raumId}
          onChange={(e) => {
            setRaumId(e.target.value);
            setPositionId("");
            setArbeit("");
            setEinheit("");
          }}
        >
          <option value="">{tr("selectRoom")}</option>

          {raeume.map((row: any) => (
            <option key={row.id} value={row.id}>
              {getRoomName(row)}
              {getRoomEtage(row) ? ` · ${getRoomEtage(row)}` : ""}
              {getRoomStatus(row) ? ` · ${getRoomStatus(row)}` : ""}
            </option>
          ))}
        </select>

        {raeume.length === 0 && <div className="warningBox">{tr("noRooms")}</div>}

        <label>{tr("position")}</label>
        <select
          value={positionId}
          onChange={(e) => {
            const id = e.target.value;
            const pos = positionen.find(
              (row: any) => String(row.id) === String(id)
            );

            setPositionId(id);

            if (pos) {
              setArbeit(getPositionTitle(pos));
              setEinheit(getPositionEinheit(pos));
            }
          }}
        >
          <option value="">{tr("selectPosition")}</option>

          {filteredPositionen.map((row: any) => (
            <option key={row.id} value={row.id}>
              {getPositionNr(row) ? `${getPositionNr(row)} · ` : ""}
              {getPositionTitle(row)}
              {getPositionEinheit(row) ? ` · ${getPositionEinheit(row)}` : ""}
            </option>
          ))}
        </select>

        {positionen.length === 0 && (
          <div className="warningBox">{tr("noPositions")}</div>
        )}

        {selectedPosition && (
          <div className="positionInfo">
            <b>
              {getPositionNr(selectedPosition)
                ? `${getPositionNr(selectedPosition)} · `
                : ""}
              {getPositionTitle(selectedPosition)}
            </b>

            {getPositionDescription(selectedPosition) && (
              <p>{getPositionDescription(selectedPosition)}</p>
            )}
          </div>
        )}

        <label>{tr("work")}</label>
        <input
          value={arbeit}
          onChange={(e) => setArbeit(e.target.value)}
          placeholder={tr("workPlaceholder")}
        />

        <div className="qtyGrid">
          <div>
            <label>{tr("quantity")}</label>
            <input
              value={menge}
              onChange={(e) => setMenge(e.target.value)}
              inputMode="decimal"
              placeholder="0"
            />
          </div>

          <div>
            <label>{tr("unit")}</label>
            <input
              value={einheit || unitFromPosition}
              onChange={(e) => setEinheit(e.target.value)}
              placeholder="m²"
            />
          </div>
        </div>

        <div className="calcGrid">
          <div>
            <span>{tr("planned")}</span>
            <strong>
              {formatNumber(plannedQty)} {unitFromPosition}
            </strong>
          </div>

          <div>
            <span>{tr("doneBefore")}</span>
            <strong>
              {formatNumber(alreadyDoneForPosition)} {unitFromPosition}
            </strong>
          </div>

          <div>
            <span>{tr("remaining")}</span>
            <strong>
              {formatNumber(remainingQty)} {unitFromPosition}
            </strong>
          </div>
        </div>

        <label>{tr("note")}</label>
        <textarea
          value={notiz}
          onChange={(e) => setNotiz(e.target.value)}
          placeholder={tr("notePlaceholder")}
        />

        <button className="saveBtn" onClick={saveLeistung} disabled={saving}>
          {saving ? tr("saving") : tr("save")}
        </button>
      </section>

      <section className="todayBox">
        <div className="todayTop">
          <h2>{tr("todayEntries")}</h2>
          <button onClick={() => loadEntries(worker, datum)} type="button">
            {loading ? "..." : "↻"}
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="empty">{tr("noEntries")}</p>
        ) : (
          <div className="entryList">
            {entries.map((row: any) => (
              <div key={row.id}>
                <b>{getEntryTitle(row) || "-"}</b>

                <span>
                  {formatNumber(row.menge || row.quantity || 0)}{" "}
                  {row.einheit || row.unit || ""}
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
          line-height: 1.4;
        }

        .panel,
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

        .warningBox {
          background: #78350f;
          border: 1px solid #f59e0b;
          color: #fed7aa;
          padding: 14px;
          border-radius: 14px;
          font-weight: 900;
          margin-top: 12px;
        }

        .positionInfo {
          margin-top: 14px;
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 14px;
        }

        .positionInfo b {
          display: block;
          color: #93c5fd;
          margin-bottom: 8px;
        }

        .positionInfo p {
          margin: 0;
          color: #cbd5e1;
          line-height: 1.45;
          white-space: pre-wrap;
        }

        .qtyGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
        }

        .calcGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          margin-top: 14px;
        }

        .calcGrid div {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 14px;
        }

        .calcGrid span {
          display: block;
          color: #9ca3af;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .calcGrid strong {
          display: block;
          color: #bbf7d0;
          font-size: 22px;
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

          .qtyGrid {
            grid-template-columns: 1fr 150px;
            gap: 12px;
          }

          .calcGrid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </main>
  );
}