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

type PositionForm = {
  datum: string;
  nummer: string;
  titel: string;
  beschreibung: string;
  gruppe: string;
  menge_soll: string;
  menge_ist: string;
  einheit: string;
  einzelpreis: string;
  status: string;
  notiz: string;
};

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

const EINHEITEN = ["m²", "m", "Stk.", "Pauschal", "kg", "Sack", "Eimer"];

const STATUS_LISTE = ["Offen", "In Arbeit", "Fertig"];

export default function ProjektPositionenPage() {
  const params = useParams();
  const projektId = String(params.id);
  const projektIdValue = isNaN(Number(projektId))
    ? projektId
    : Number(projektId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [positionen, setPositionen] = useState<any[]>([]);
  const [errorText, setErrorText] = useState("");

  const [positionConfig, setPositionConfig] = useState<TableConfig>({
    table: "positionen",
    column: "projekt_id",
  });

  const [search, setSearch] = useState("");
  const [filterGruppe, setFilterGruppe] = useState("Alle");
  const [filterStatus, setFilterStatus] = useState("Alle");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | string | null>(null);

  const [form, setForm] = useState<PositionForm>({
    datum: today(),
    nummer: "",
    titel: "",
    beschreibung: "",
    gruppe: "Keramika",
    menge_soll: "",
    menge_ist: "",
    einheit: "m²",
    einzelpreis: "",
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
    return row.datum || row.date || row.created_date || row.tag || "";
  }

  function getNumber(row: any) {
    return row.nummer || row.position_nr || row.pos_nr || row.number || row.nr || "";
  }

  function getTitle(row: any) {
    return row.titel || row.title || row.name || row.position || row.bezeichnung || "";
  }

  function getDescription(row: any) {
    return (
      row.beschreibung ||
      row.description ||
      row.text ||
      row.notiz ||
      row.note ||
      row.info ||
      ""
    );
  }

  function getGroup(row: any) {
    return row.gruppe || row.group_name || row.kategorie || row.category || row.typ || "Keramika";
  }

  function getMengeSoll(row: any) {
    return row.menge_soll || row.soll || row.quantity_planned || row.menge || row.quantity || "";
  }

  function getMengeIst(row: any) {
    return row.menge_ist || row.ist || row.quantity_done || row.done_quantity || "";
  }

  function getUnit(row: any) {
    return row.einheit || row.unit || row.jedinica || "m²";
  }

  function getPrice(row: any) {
    return row.einzelpreis || row.price || row.unit_price || row.preis || "";
  }

  function getStatus(row: any) {
    return row.status || "Offen";
  }

  function getNote(row: any) {
    return row.notiz || row.note || row.bemerkung || row.info || "";
  }

  function getProgress(row: any) {
    const soll = toNumber(getMengeSoll(row));
    const ist = toNumber(getMengeIst(row));

    if (soll <= 0) return 0;

    return Math.min(100, Math.round((ist / soll) * 100));
  }

  function getValue(row: any) {
    const qty = toNumber(getMengeSoll(row));
    const price = toNumber(getPrice(row));
    return qty * price;
  }

  function getDoneValue(row: any) {
    const qty = toNumber(getMengeIst(row));
    const price = toNumber(getPrice(row));
    return qty * price;
  }

  function resetForm() {
    setEditId(null);
    setForm({
      datum: today(),
      nummer: "",
      titel: "",
      beschreibung: "",
      gruppe: "Keramika",
      menge_soll: "",
      menge_ist: "",
      einheit: "m²",
      einzelpreis: "",
      status: "Offen",
      notiz: "",
    });
  }

  async function loadAll() {
    setLoading(true);
    setErrorText("");

    await loadProjekt();
    await loadPositionen();

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
      { table: "projekt_positionen", column: "baustelle_id" },
      { table: "lv_positionen", column: "projekt_id" },
      { table: "lv_positionen", column: "project_id" },
      { table: "positions", column: "projekt_id" },
      { table: "positions", column: "project_id" },
      { table: "positions", column: "baustelle_id" },
    ];

    for (const config of configs) {
      const { data, error } = await supabase
        .from(config.table)
        .select("*")
        .eq(config.column, projektIdValue);

      if (!error) {
        const sorted = [...(data || [])].sort((a: any, b: any) => {
          const na = String(getNumber(a));
          const nb = String(getNumber(b));

          if (na && nb) return na.localeCompare(nb, undefined, { numeric: true });

          return String(getDate(b)).localeCompare(String(getDate(a)));
        });

        setPositionConfig(config);
        setPositionen(sorted);
        return;
      }
    }

    setPositionen([]);
    setErrorText(
      "Ne mogu učitati Positionen. Provjeri tabelu positionen i kolonu projekt_id."
    );
  }

  const filtered = useMemo(() => {
    return positionen.filter((row) => {
      const text = `
        ${getDate(row)}
        ${getNumber(row)}
        ${getTitle(row)}
        ${getDescription(row)}
        ${getGroup(row)}
        ${getMengeSoll(row)}
        ${getMengeIst(row)}
        ${getUnit(row)}
        ${getPrice(row)}
        ${getStatus(row)}
        ${getNote(row)}
      `.toLowerCase();

      const searchOk = text.includes(search.toLowerCase());
      const groupOk = filterGruppe === "Alle" || getGroup(row) === filterGruppe;
      const statusOk = filterStatus === "Alle" || getStatus(row) === filterStatus;

      return searchOk && groupOk && statusOk;
    });
  }, [positionen, search, filterGruppe, filterStatus]);

  const totals = useMemo(() => {
    const soll = filtered.reduce((sum, row) => sum + toNumber(getMengeSoll(row)), 0);
    const ist = filtered.reduce((sum, row) => sum + toNumber(getMengeIst(row)), 0);
    const value = filtered.reduce((sum, row) => sum + getValue(row), 0);
    const doneValue = filtered.reduce((sum, row) => sum + getDoneValue(row), 0);

    const progress = soll > 0 ? Math.round((ist / soll) * 100) : 0;

    return {
      soll,
      ist,
      value,
      doneValue,
      progress: Math.min(100, progress),
    };
  }, [filtered]);

  function isDuplicate(values: PositionForm) {
    return positionen.some((row) => {
      if (editId && String(row.id) === String(editId)) return false;

      const sameNumber =
        values.nummer.trim() &&
        String(getNumber(row)).trim().toLowerCase() ===
          values.nummer.trim().toLowerCase();

      const sameTitle =
        String(getTitle(row)).trim().toLowerCase() ===
        values.titel.trim().toLowerCase();

      return sameNumber || sameTitle;
    });
  }

  function buildPayloads(values: PositionForm) {
    const base: any = {};
    base[positionConfig.column] = projektIdValue;

    const soll = toNumber(values.menge_soll);
    const ist = toNumber(values.menge_ist);
    const price = toNumber(values.einzelpreis);
    const gesamt = soll * price;
    const fertigWert = ist * price;

    return [
      {
        ...base,
        datum: values.datum,
        nummer: values.nummer.trim(),
        titel: values.titel.trim(),
        beschreibung: values.beschreibung.trim(),
        gruppe: values.gruppe,
        menge_soll: soll,
        menge_ist: ist,
        einheit: values.einheit,
        einzelpreis: price,
        gesamtpreis: gesamt,
        fertig_wert: fertigWert,
        status: values.status,
        notiz: values.notiz.trim(),
      },
      {
        ...base,
        date: values.datum,
        position_nr: values.nummer.trim(),
        title: values.titel.trim(),
        description: values.beschreibung.trim(),
        category: values.gruppe,
        quantity_planned: soll,
        quantity_done: ist,
        unit: values.einheit,
        unit_price: price,
        total_price: gesamt,
        done_value: fertigWert,
        status: values.status,
        note: values.notiz.trim(),
      },
      {
        ...base,
        datum: values.datum,
        pos_nr: values.nummer.trim(),
        bezeichnung: values.titel.trim(),
        text: values.beschreibung.trim(),
        kategorie: values.gruppe,
        menge: soll,
        ist: ist,
        einheit: values.einheit,
        preis: price,
        status: values.status,
        bemerkung: values.notiz.trim(),
      },
      {
        ...base,
        nummer: values.nummer.trim(),
        name: values.titel.trim(),
        menge: soll,
        einheit: values.einheit,
        status: values.status,
      },
      {
        ...base,
        title: values.titel.trim(),
        quantity: soll,
        unit: values.einheit,
        status: values.status,
      },
    ];
  }

  async function savePosition() {
    if (!form.titel.trim()) {
      alert("Upiši naziv pozicije.");
      return;
    }

    if (isDuplicate(form) && !editId) {
      alert("Ova pozicija već postoji.");
      return;
    }

    setSaving(true);
    let lastError: any = null;

    for (const payload of buildPayloads(form)) {
      const query = editId
        ? supabase
            .from(positionConfig.table)
            .update(payload as any)
            .eq("id", editId)
        : supabase.from(positionConfig.table).insert(payload as any);

      const { error } = await query;

      if (!error) {
        resetForm();
        setShowForm(false);
        setSaving(false);
        await loadPositionen();
        return;
      }

      lastError = error;
    }

    setSaving(false);
    alert("Greška kod spremanja Position: " + (lastError?.message || ""));
  }

  function quickPosition(title: string, group: string, unit: string) {
    setEditId(null);
    setForm({
      datum: today(),
      nummer: "",
      titel: title,
      beschreibung: "",
      gruppe: group,
      menge_soll: "",
      menge_ist: "",
      einheit: unit,
      einzelpreis: "",
      status: "Offen",
      notiz: "",
    });
    setShowForm(true);
  }

  function startEdit(row: any) {
    setEditId(row.id);

    setForm({
      datum: String(getDate(row) || today()),
      nummer: String(getNumber(row) || ""),
      titel: String(getTitle(row) || ""),
      beschreibung: String(getDescription(row) || ""),
      gruppe: String(getGroup(row) || "Keramika"),
      menge_soll: String(getMengeSoll(row) || ""),
      menge_ist: String(getMengeIst(row) || ""),
      einheit: String(getUnit(row) || "m²"),
      einzelpreis: String(getPrice(row) || ""),
      status: String(getStatus(row) || "Offen"),
      notiz: String(getNote(row) || ""),
    });

    setShowForm(true);
  }

  async function changeStatus(row: any, newStatus: string) {
    const payloads: any[] = [{ status: newStatus }];

    let lastError: any = null;

    for (const payload of payloads) {
      const { error } = await supabase
        .from(positionConfig.table)
        .update(payload as any)
        .eq("id", row.id);

      if (!error) {
        await loadPositionen();
        return;
      }

      lastError = error;
    }

    alert("Greška kod statusa: " + (lastError?.message || ""));
  }

  async function deletePosition(row: any) {
    const ok = confirm(`Da li želiš obrisati poziciju: ${getTitle(row)}?`);

    if (!ok) return;

    const { error } = await supabase
      .from(positionConfig.table)
      .delete()
      .eq("id", row.id);

    if (error) {
      alert("Greška kod brisanja: " + error.message);
      return;
    }

    await loadPositionen();
  }

  return (
    <main className="page">
      <section className="top">
        <div>
          <Link className="back" href={`/projekte/${projektId}`}>
            ← Zurück zu Projekt
          </Link>

          <p className="label">Projekt Positionen</p>
          <h1>Positionen</h1>
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
            + Position hinzufügen
          </button>
        </div>
      </section>

      {errorText && <div className="errorBox">{errorText}</div>}

      <section className="stats">
        <div className="stat">
          <span>Positionen</span>
          <strong>{filtered.length}</strong>
        </div>

        <div className="stat">
          <span>Fortschritt</span>
          <strong>{totals.progress}%</strong>
        </div>

        <div className="stat">
          <span>Auftragssumme</span>
          <strong>{formatMoney(totals.value)}</strong>
        </div>
      </section>

      <section className="stats">
        <div className="stat">
          <span>Soll Menge</span>
          <strong>{formatNumber(totals.soll)}</strong>
        </div>

        <div className="stat">
          <span>Ist Menge</span>
          <strong>{formatNumber(totals.ist)}</strong>
        </div>

        <div className="stat">
          <span>Fertig Wert</span>
          <strong>{formatMoney(totals.doneValue)}</strong>
        </div>
      </section>

      <section className="toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Traži poziciju, broj, grupu, opis..."
        />

        <select
          value={filterGruppe}
          onChange={(e) => setFilterGruppe(e.target.value)}
        >
          <option value="Alle">Alle Gruppen</option>
          {GRUPPEN.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

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
      </section>

      <section className="quickAdd">
        <h2>Brze pozicije</h2>

        <div className="quickGrid">
          {[
            { title: "Fliesen verlegen", group: "Keramika", unit: "m²" },
            { title: "Untergrund vorbereiten", group: "Priprema podloge", unit: "m²" },
            { title: "Abdichtung ausführen", group: "Hidroizolacija", unit: "m²" },
            { title: "Schienen setzen", group: "Schienen", unit: "m" },
            { title: "Verfugen", group: "Fuge", unit: "m²" },
            { title: "Silikonfugen", group: "Silikoni", unit: "m" },
            { title: "Estricharbeiten", group: "Estrich", unit: "m²" },
            { title: "Zusatzarbeiten", group: "Dodaci", unit: "Stk." },
          ].map((item) => (
            <button
              key={`${item.title}-${item.group}`}
              onClick={() => quickPosition(item.title, item.group, item.unit)}
            >
              + {item.title}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="emptyBox">Učitavanje Positionen...</div>
      ) : filtered.length === 0 ? (
        <div className="emptyBox">
          <h2>Nema pozicija</h2>
          <p>Dodaj prvu LV poziciju za ovaj projekt.</p>
        </div>
      ) : (
        <section className="grid">
          {filtered.map((row) => {
            const progress = getProgress(row);

            return (
              <article key={row.id} className="card">
                <div className="cardTop">
                  <div>
                    <h2>
                      {getNumber(row) ? `${getNumber(row)} · ` : ""}
                      {getTitle(row) || "Position"}
                    </h2>
                    <p>{getGroup(row)}</p>
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

                {getDescription(row) && (
                  <p className="description">{getDescription(row)}</p>
                )}

                <div className="progressBox">
                  <div className="progressTop">
                    <span>Fortschritt</span>
                    <strong>{progress}%</strong>
                  </div>

                  <div className="bar">
                    <div style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="detailGrid">
                  <div>
                    <span>Soll</span>
                    <strong>
                      {formatNumber(getMengeSoll(row))} {getUnit(row)}
                    </strong>
                  </div>

                  <div>
                    <span>Ist</span>
                    <strong>
                      {formatNumber(getMengeIst(row))} {getUnit(row)}
                    </strong>
                  </div>

                  <div>
                    <span>Einzelpreis</span>
                    <strong>{formatMoney(getPrice(row))}</strong>
                  </div>

                  <div>
                    <span>Gesamt</span>
                    <strong>{formatMoney(getValue(row))}</strong>
                  </div>
                </div>

                {getNote(row) && <p className="note">{getNote(row)}</p>}

                <div className="actions">
                  <button onClick={() => startEdit(row)}>Bearbeiten</button>
                  <button onClick={() => changeStatus(row, "In Arbeit")}>
                    In Arbeit
                  </button>
                  <button onClick={() => changeStatus(row, "Fertig")}>
                    Fertig
                  </button>
                  <button className="delete" onClick={() => deletePosition(row)}>
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
              <h2>{editId ? "Position bearbeiten" : "Position hinzufügen"}</h2>

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

            <div className="twoGrid">
              <div>
                <label>Positionsnummer</label>
                <input
                  value={form.nummer}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, nummer: e.target.value }))
                  }
                  placeholder="z.B. 01.01"
                />
              </div>

              <div>
                <label>Gruppe</label>
                <select
                  value={form.gruppe}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, gruppe: e.target.value }))
                  }
                >
                  {GRUPPEN.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label>Position Titel *</label>
            <input
              value={form.titel}
              onChange={(e) =>
                setForm((old) => ({ ...old, titel: e.target.value }))
              }
              placeholder="z.B. Fliesen verlegen"
            />

            <label>Beschreibung</label>
            <textarea
              value={form.beschreibung}
              onChange={(e) =>
                setForm((old) => ({ ...old, beschreibung: e.target.value }))
              }
              placeholder="Beschreibung der Position"
            />

            <div className="threeGrid">
              <div>
                <label>Soll Menge</label>
                <input
                  value={form.menge_soll}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, menge_soll: e.target.value }))
                  }
                  placeholder="z.B. 120"
                  inputMode="decimal"
                />
              </div>

              <div>
                <label>Ist Menge</label>
                <input
                  value={form.menge_ist}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, menge_ist: e.target.value }))
                  }
                  placeholder="z.B. 80"
                  inputMode="decimal"
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
                  {EINHEITEN.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label>Einzelpreis</label>
            <input
              value={form.einzelpreis}
              onChange={(e) =>
                setForm((old) => ({ ...old, einzelpreis: e.target.value }))
              }
              placeholder="z.B. 45"
              inputMode="decimal"
            />

            <div className="preview">
              <span>Gesamt:</span>
              <strong>
                {formatMoney(toNumber(form.menge_soll) * toNumber(form.einzelpreis))}
              </strong>
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

            <label>Notiz</label>
            <textarea
              value={form.notiz}
              onChange={(e) =>
                setForm((old) => ({ ...old, notiz: e.target.value }))
              }
              placeholder="Napomena za poziciju"
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

              <button className="save" onClick={savePosition} disabled={saving}>
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
          grid-template-columns: 1fr 210px 180px;
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
          font-size: 22px;
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

        .description,
        .note {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 12px;
          white-space: pre-wrap;
          margin-bottom: 12px !important;
        }

        .progressBox {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 12px;
          margin-bottom: 12px;
        }

        .progressTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .progressTop span {
          color: #9ca3af;
          font-weight: 800;
        }

        .progressTop strong {
          font-size: 20px;
        }

        .bar {
          height: 12px;
          background: #030712;
          border-radius: 999px;
          overflow: hidden;
        }

        .bar div {
          height: 100%;
          background: #16a34a;
          border-radius: 999px;
        }

        .detailGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
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
          font-size: 18px;
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
          min-height: 110px;
          resize: vertical;
        }

        .twoGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .threeGrid {
          display: grid;
          grid-template-columns: 1fr 1fr 150px;
          gap: 12px;
        }

        .preview {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 14px;
          margin-top: 14px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }

        .preview span {
          color: #9ca3af;
          font-weight: 800;
        }

        .preview strong {
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

        @media (max-width: 950px) {
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