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

type MaterialForm = {
  datum: string;
  material_id: string;
  naziv: string;
  kolicina: string;
  jedinica: string;
  gruppe: string;
  notiz: string;
  status: string;
};

const GRUPPE = [
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

const EINHEITEN = [
  "Stk.",
  "m²",
  "m",
  "kg",
  "Sack",
  "Eimer",
  "Karton",
  "Tube",
  "Liter",
];

export default function ProjektMaterialPage() {
  const params = useParams();
  const projektId = String(params.id);
  const projektIdValue = isNaN(Number(projektId))
    ? projektId
    : Number(projektId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [materialRows, setMaterialRows] = useState<any[]>([]);
  const [katalog, setKatalog] = useState<any[]>([]);
  const [errorText, setErrorText] = useState("");

  const [materialConfig, setMaterialConfig] = useState<TableConfig>({
    table: "material_bewegungen",
    column: "projekt_id",
  });

  const [search, setSearch] = useState("");
  const [filterGruppe, setFilterGruppe] = useState("Alle");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | string | null>(null);

  const [form, setForm] = useState<MaterialForm>({
    datum: today(),
    material_id: "",
    naziv: "",
    kolicina: "",
    jedinica: "Stk.",
    gruppe: "Keramika",
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

  function getMaterialName(row: any) {
    return (
      row.naziv ||
      row.name ||
      row.material_name ||
      row.material ||
      row.title ||
      row.bezeichnung ||
      ""
    );
  }

  function getQuantity(row: any) {
    return row.kolicina || row.menge || row.quantity || row.qty || row.anzahl || "";
  }

  function getUnit(row: any) {
    return row.jedinica || row.einheit || row.unit || "Stk.";
  }

  function getGroup(row: any) {
    return row.gruppe || row.group_name || row.kategorie || row.category || row.typ || "Dodaci";
  }

  function getNote(row: any) {
    return row.notiz || row.note || row.bemerkung || row.info || "";
  }

  function getStatus(row: any) {
    return row.status || "Offen";
  }

  function getCatalogName(item: any) {
    return item.naziv || item.name || item.material_name || item.title || "";
  }

  function getCatalogUnit(item: any) {
    return item.jedinica || item.einheit || item.unit || "Stk.";
  }

  function getCatalogGroup(item: any) {
    return item.gruppe || item.group_name || item.kategorie || item.category || "Dodaci";
  }

  function formatNumber(value: any) {
    const n = Number(String(value || "0").replace(",", "."));

    if (isNaN(n)) return "0";

    return n.toFixed(2).replace(".", ",").replace(",00", "");
  }

  function resetForm() {
    setEditId(null);
    setForm({
      datum: today(),
      material_id: "",
      naziv: "",
      kolicina: "",
      jedinica: "Stk.",
      gruppe: "Keramika",
      notiz: "",
      status: "Offen",
    });
  }

  async function loadAll() {
    setLoading(true);
    setErrorText("");

    await loadProjekt();
    await loadKatalog();
    await loadMaterialRows();

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

  async function loadKatalog() {
    const tables = ["materialien", "materijali", "materials", "katalog"];

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select("*");

      if (!error) {
        const sorted = [...(data || [])].sort((a: any, b: any) => {
          return String(getCatalogName(a)).localeCompare(String(getCatalogName(b)));
        });

        setKatalog(sorted);
        return;
      }
    }

    setKatalog([]);
  }

  async function loadMaterialRows() {
    const configs: TableConfig[] = [
      { table: "material_bewegungen", column: "projekt_id" },
      { table: "material_bewegungen", column: "project_id" },
      { table: "material_bewegungen", column: "baustelle_id" },
      { table: "projekt_material", column: "projekt_id" },
      { table: "projekt_material", column: "project_id" },
      { table: "projekt_material", column: "baustelle_id" },
      { table: "material", column: "projekt_id" },
      { table: "material", column: "project_id" },
      { table: "materialien_projekt", column: "projekt_id" },
      { table: "materials_project", column: "project_id" },
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
            return String(getMaterialName(a)).localeCompare(
              String(getMaterialName(b))
            );
          }

          return db.localeCompare(da);
        });

        setMaterialConfig(config);
        setMaterialRows(sorted);
        return;
      }
    }

    setMaterialRows([]);
    setErrorText(
      "Ne mogu učitati Material. Provjeri tabelu material_bewegungen i kolonu projekt_id."
    );
  }

  const filteredRows = useMemo(() => {
    return materialRows.filter((row) => {
      const text = `
        ${getDate(row)}
        ${getMaterialName(row)}
        ${getQuantity(row)}
        ${getUnit(row)}
        ${getGroup(row)}
        ${getStatus(row)}
        ${getNote(row)}
      `.toLowerCase();

      const searchOk = text.includes(search.toLowerCase());
      const groupOk = filterGruppe === "Alle" || getGroup(row) === filterGruppe;

      return searchOk && groupOk;
    });
  }, [materialRows, search, filterGruppe]);

  const summary = useMemo(() => {
    const result: {
      [key: string]: { name: string; unit: string; qty: number; group: string };
    } = {};

    filteredRows.forEach((row) => {
      const name = getMaterialName(row) || "Ohne Name";
      const unit = getUnit(row);
      const group = getGroup(row);
      const key = `${name}__${unit}`;
      const qty = Number(String(getQuantity(row) || "0").replace(",", "."));

      if (!result[key]) {
        result[key] = {
          name,
          unit,
          group,
          qty: 0,
        };
      }

      result[key].qty += isNaN(qty) ? 0 : qty;
    });

    return Object.values(result).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredRows]);

  function selectCatalogMaterial(materialId: string) {
    const item = katalog.find((x) => String(x.id) === String(materialId));

    if (!item) {
      setForm((old) => ({ ...old, material_id: materialId }));
      return;
    }

    setForm((old) => ({
      ...old,
      material_id: materialId,
      naziv: getCatalogName(item),
      jedinica: getCatalogUnit(item),
      gruppe: getCatalogGroup(item),
    }));
  }

  function buildPayloads(values: MaterialForm) {
    const base: any = {};
    base[materialConfig.column] = projektIdValue;

    const materialValue =
      values.material_id && !isNaN(Number(values.material_id))
        ? Number(values.material_id)
        : values.material_id;

    const materialPayload = values.material_id
      ? { material_id: materialValue }
      : {};

    const qty = Number(String(values.kolicina || "0").replace(",", "."));

    return [
      {
        ...base,
        ...materialPayload,
        datum: values.datum,
        naziv: values.naziv.trim(),
        kolicina: isNaN(qty) ? 0 : qty,
        jedinica: values.jedinica,
        gruppe: values.gruppe,
        notiz: values.notiz.trim(),
        status: values.status,
      },
      {
        ...base,
        ...materialPayload,
        date: values.datum,
        name: values.naziv.trim(),
        quantity: isNaN(qty) ? 0 : qty,
        unit: values.jedinica,
        category: values.gruppe,
        note: values.notiz.trim(),
        status: values.status,
      },
      {
        ...base,
        datum: values.datum,
        material: values.naziv.trim(),
        menge: isNaN(qty) ? 0 : qty,
        einheit: values.jedinica,
        kategorie: values.gruppe,
        bemerkung: values.notiz.trim(),
        status: values.status,
      },
      {
        ...base,
        naziv: values.naziv.trim(),
        kolicina: isNaN(qty) ? 0 : qty,
        jedinica: values.jedinica,
      },
      {
        ...base,
        name: values.naziv.trim(),
        quantity: isNaN(qty) ? 0 : qty,
        unit: values.jedinica,
      },
    ];
  }

  async function saveMaterial() {
    if (!form.naziv.trim()) {
      alert("Upiši ili odaberi material.");
      return;
    }

    if (!form.kolicina.trim()) {
      alert("Upiši količinu.");
      return;
    }

    setSaving(true);
    let lastError: any = null;

    for (const payload of buildPayloads(form)) {
      const query = editId
        ? supabase
            .from(materialConfig.table)
            .update(payload as any)
            .eq("id", editId)
        : supabase.from(materialConfig.table).insert(payload as any);

      const { error } = await query;

      if (!error) {
        resetForm();
        setShowForm(false);
        setSaving(false);
        await loadMaterialRows();
        return;
      }

      lastError = error;
    }

    setSaving(false);
    alert("Greška kod spremanja materijala: " + (lastError?.message || ""));
  }

  function quickAddMaterial(name: string, unit: string, group: string) {
    setForm((old) => ({
      ...old,
      naziv: name,
      jedinica: unit,
      gruppe: group,
    }));

    setShowForm(true);
  }

  function startEdit(row: any) {
    setEditId(row.id);

    setForm({
      datum: String(getDate(row) || today()),
      material_id: String(row.material_id || ""),
      naziv: String(getMaterialName(row) || ""),
      kolicina: String(getQuantity(row) || ""),
      jedinica: String(getUnit(row) || "Stk."),
      gruppe: String(getGroup(row) || "Dodaci"),
      notiz: String(getNote(row) || ""),
      status: String(getStatus(row) || "Offen"),
    });

    setShowForm(true);
  }

  async function changeStatus(row: any, newStatus: string) {
    const { error } = await supabase
      .from(materialConfig.table)
      .update({ status: newStatus } as any)
      .eq("id", row.id);

    if (error) {
      alert("Greška kod statusa: " + error.message);
      return;
    }

    await loadMaterialRows();
  }

  async function deleteMaterial(row: any) {
    const ok = confirm(`Da li želiš obrisati material: ${getMaterialName(row)}?`);

    if (!ok) return;

    const { error } = await supabase
      .from(materialConfig.table)
      .delete()
      .eq("id", row.id);

    if (error) {
      alert("Greška kod brisanja: " + error.message);
      return;
    }

    await loadMaterialRows();
  }

  return (
    <main className="page">
      <section className="top">
        <div>
          <Link className="back" href={`/projekte/${projektId}`}>
            ← Zurück zu Projekt
          </Link>

          <p className="label">Projekt Material</p>
          <h1>Materialverbrauch</h1>
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
            + Material hinzufügen
          </button>
        </div>
      </section>

      {errorText && <div className="errorBox">{errorText}</div>}

      <section className="stats">
        <div className="stat">
          <span>Ukupno unosa</span>
          <strong>{filteredRows.length}</strong>
        </div>

        <div className="stat">
          <span>Različit material</span>
          <strong>{summary.length}</strong>
        </div>

        <div className="stat">
          <span>Gruppen</span>
          <strong>{new Set(filteredRows.map((row) => getGroup(row))).size}</strong>
        </div>
      </section>

      <section className="toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Traži material, grupu, količinu, napomenu..."
        />

        <select
          value={filterGruppe}
          onChange={(e) => setFilterGruppe(e.target.value)}
        >
          <option value="Alle">Alle Gruppen</option>
          {GRUPPE.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </section>

      <section className="quickAdd">
        <h2>Brzi unos materijala</h2>

        <div className="quickGrid">
          {[
            { name: "Flexkleber", unit: "Sack", group: "Ljepilo" },
            { name: "Fugenmasse", unit: "kg", group: "Fuge" },
            { name: "Silikon", unit: "Tube", group: "Silikoni" },
            { name: "Dichtband", unit: "m", group: "Hidroizolacija" },
            { name: "Grundierung", unit: "Eimer", group: "Priprema podloge" },
            { name: "Schiene", unit: "m", group: "Schienen" },
            { name: "Fliesen", unit: "m²", group: "Keramika" },
            { name: "Estrich", unit: "Sack", group: "Estrich" },
          ].map((item) => (
            <button
              key={`${item.name}-${item.group}`}
              onClick={() => quickAddMaterial(item.name, item.unit, item.group)}
            >
              + {item.name}
            </button>
          ))}
        </div>
      </section>

      {summary.length > 0 && (
        <section className="summaryBox">
          <h2>Sažetak potrošnje po projektu</h2>

          <div className="summaryGrid">
            {summary.map((item) => (
              <div key={`${item.name}-${item.unit}`}>
                <span>{item.group}</span>
                <strong>{item.name}</strong>
                <p>
                  {formatNumber(item.qty)} {item.unit}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="emptyBox">Učitavanje Material...</div>
      ) : filteredRows.length === 0 ? (
        <div className="emptyBox">
          <h2>Nema materijala</h2>
          <p>Dodaj prvi material za ovaj projekt.</p>
        </div>
      ) : (
        <section className="grid">
          {filteredRows.map((row) => (
            <article key={row.id} className="card">
              <div className="cardTop">
                <div>
                  <h2>{getMaterialName(row) || "Material"}</h2>
                  <p>{getDate(row) || "-"}</p>
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
                <span>Količina</span>
                <strong>
                  {formatNumber(getQuantity(row))} {getUnit(row)}
                </strong>
              </div>

              <div className="meta">
                <span>{getGroup(row)}</span>
              </div>

              {getNote(row) && <p className="note">{getNote(row)}</p>}

              <div className="actions">
                <button onClick={() => startEdit(row)}>Bearbeiten</button>
                <button onClick={() => changeStatus(row, "Fertig")}>Fertig</button>
                <button onClick={() => changeStatus(row, "Offen")}>Offen</button>
                <button className="delete" onClick={() => deleteMaterial(row)}>
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
              <h2>{editId ? "Material bearbeiten" : "Material hinzufügen"}</h2>

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

            {katalog.length > 0 && (
              <>
                <label>Aus Katalog wählen</label>
                <select
                  value={form.material_id}
                  onChange={(e) => selectCatalogMaterial(e.target.value)}
                >
                  <option value="">Material aus Katalog wählen</option>
                  {katalog.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getCatalogName(item)} · {getCatalogUnit(item)}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label>Material Name *</label>
            <input
              value={form.naziv}
              onChange={(e) =>
                setForm((old) => ({ ...old, naziv: e.target.value }))
              }
              placeholder="z.B. Flexkleber"
            />

            <div className="twoGrid">
              <div>
                <label>Količina *</label>
                <input
                  value={form.kolicina}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, kolicina: e.target.value }))
                  }
                  placeholder="z.B. 12"
                  inputMode="decimal"
                />
              </div>

              <div>
                <label>Einheit</label>
                <select
                  value={form.jedinica}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, jedinica: e.target.value }))
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

            <label>Gruppe</label>
            <select
              value={form.gruppe}
              onChange={(e) =>
                setForm((old) => ({ ...old, gruppe: e.target.value }))
              }
            >
              {GRUPPE.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

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

            <label>Notiz</label>
            <textarea
              value={form.notiz}
              onChange={(e) =>
                setForm((old) => ({ ...old, notiz: e.target.value }))
              }
              placeholder="Napomena za material"
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

              <button className="save" onClick={saveMaterial} disabled={saving}>
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
          grid-template-columns: 1fr 230px;
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
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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
          font-size: 13px;
          margin-bottom: 6px;
        }

        .summaryGrid strong {
          display: block;
          color: white;
          font-size: 17px;
        }

        .summaryGrid p {
          margin: 8px 0 0;
          color: #bbf7d0;
          font-weight: 900;
          font-size: 20px;
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
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
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