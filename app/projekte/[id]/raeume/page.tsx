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

type RaumForm = {
  name: string;
  etage: string;
  bereich: string;
  status: string;
  beschreibung: string;
  laenge: string;
  breite: string;
  hoehe: string;
  qm: string;
  sort_order: string;
};

const STATUS_LISTE = ["Offen", "In Arbeit", "Fertig", "Abnahme"];

const ETAGEN = ["EG", "OG", "UG", "DG", "1. OG", "2. OG", "3. OG"];

export default function ProjektRaeumePage() {
  const params = useParams();
  const projektId = String(params.id);
  const projektIdValue = isNaN(Number(projektId))
    ? projektId
    : Number(projektId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [raeume, setRaeume] = useState<any[]>([]);
  const [errorText, setErrorText] = useState("");

  const [raumConfig, setRaumConfig] = useState<TableConfig>({
    table: "raeume",
    column: "projekt_id",
  });

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Alle");
  const [filterEtage, setFilterEtage] = useState("Alle");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | string | null>(null);

  const [form, setForm] = useState<RaumForm>({
    name: "",
    etage: "EG",
    bereich: "",
    status: "Offen",
    beschreibung: "",
    laenge: "",
    breite: "",
    hoehe: "",
    qm: "",
    sort_order: "",
  });

  useEffect(() => {
    loadAll();
  }, [projektId]);

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

  function toNumber(value: any) {
    const n = Number(String(value || "0").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function formatNumber(value: any) {
    const n = toNumber(value);
    return n.toFixed(2).replace(".", ",").replace(",00", "");
  }

  function getName(row: any) {
    return (
      row.name ||
      row.raum_name ||
      row.naziv ||
      row.title ||
      row.prostorija ||
      row.bezeichnung ||
      ""
    );
  }

  function getEtage(row: any) {
    return row.etage || row.floor || row.sprat || row.stockwerk || "";
  }

  function getBereich(row: any) {
    return row.bereich || row.zone || row.area || row.sektor || "";
  }

  function getStatus(row: any) {
    return row.status || "Offen";
  }

  function getDescription(row: any) {
    return (
      row.beschreibung ||
      row.description ||
      row.info ||
      row.notiz ||
      row.note ||
      row.bemerkung ||
      ""
    );
  }

  function getLength(row: any) {
    return row.laenge || row.length || row.lange || "";
  }

  function getWidth(row: any) {
    return row.breite || row.width || "";
  }

  function getHeight(row: any) {
    return row.hoehe || row.height || "";
  }

  function getQm(row: any) {
    const direct = row.qm || row.m2 || row.flaeche || row.area_m2 || row.square_meter;

    if (direct) return direct;

    const l = toNumber(getLength(row));
    const b = toNumber(getWidth(row));

    if (l > 0 && b > 0) return l * b;

    return "";
  }

  function getSortOrder(row: any) {
    return row.sort_order || row.reihenfolge || row.order || row.position || "";
  }

  function calculateFormQm() {
    const direct = toNumber(form.qm);

    if (direct > 0) return direct;

    const l = toNumber(form.laenge);
    const b = toNumber(form.breite);

    if (l > 0 && b > 0) return l * b;

    return 0;
  }

  function resetForm() {
    setEditId(null);
    setForm({
      name: "",
      etage: "EG",
      bereich: "",
      status: "Offen",
      beschreibung: "",
      laenge: "",
      breite: "",
      hoehe: "",
      qm: "",
      sort_order: "",
    });
  }

  async function loadAll() {
    setLoading(true);
    setErrorText("");

    await loadProjekt();
    await loadRaeume();

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
      { table: "raeume", column: "projekt_id" },
      { table: "raeume", column: "project_id" },
      { table: "raeume", column: "baustelle_id" },
      { table: "prostorije", column: "projekt_id" },
      { table: "prostorije", column: "project_id" },
      { table: "prostorije", column: "baustelle_id" },
      { table: "rooms", column: "projekt_id" },
      { table: "rooms", column: "project_id" },
      { table: "rooms", column: "baustelle_id" },
      { table: "projekt_raeume", column: "projekt_id" },
      { table: "projekt_raeume", column: "project_id" },
    ];

    for (const config of configs) {
      const { data, error } = await supabase
        .from(config.table)
        .select("*")
        .eq(config.column, projektIdValue);

      if (!error) {
        const sorted = [...(data || [])].sort((a: any, b: any) => {
          const oa = toNumber(getSortOrder(a));
          const ob = toNumber(getSortOrder(b));

          if (oa || ob) return oa - ob;

          const ea = String(getEtage(a));
          const eb = String(getEtage(b));

          if (ea === eb) {
            return String(getName(a)).localeCompare(String(getName(b)), undefined, {
              numeric: true,
            });
          }

          return ea.localeCompare(eb, undefined, { numeric: true });
        });

        setRaumConfig(config);
        setRaeume(sorted);
        return;
      }
    }

    setRaeume([]);
    setErrorText(
      "Ne mogu učitati Räume. Provjeri tabelu raeume ili prostorije i kolonu projekt_id."
    );
  }

  const filtered = useMemo(() => {
    return raeume.filter((row) => {
      const text = `
        ${getName(row)}
        ${getEtage(row)}
        ${getBereich(row)}
        ${getStatus(row)}
        ${getDescription(row)}
        ${getQm(row)}
      `.toLowerCase();

      const searchOk = text.includes(search.toLowerCase());
      const statusOk = filterStatus === "Alle" || getStatus(row) === filterStatus;
      const etageOk = filterEtage === "Alle" || getEtage(row) === filterEtage;

      return searchOk && statusOk && etageOk;
    });
  }, [raeume, search, filterStatus, filterEtage]);

  const totalQm = useMemo(() => {
    return filtered.reduce((sum, row) => sum + toNumber(getQm(row)), 0);
  }, [filtered]);

  const etagen = useMemo(() => {
    const values = new Set<string>();

    raeume.forEach((row) => {
      const e = getEtage(row);
      if (e) values.add(e);
    });

    return Array.from(values).sort();
  }, [raeume]);

  function isDuplicate(values: RaumForm) {
    return raeume.some((row) => {
      if (editId && String(row.id) === String(editId)) return false;

      return (
        String(getName(row)).trim().toLowerCase() ===
          values.name.trim().toLowerCase() &&
        String(getEtage(row)).trim().toLowerCase() ===
          values.etage.trim().toLowerCase()
      );
    });
  }

  function buildPayloads(values: RaumForm) {
    const base: any = {};
    base[raumConfig.column] = projektIdValue;

    const qmValue = calculateFormQm();

    return [
      {
        ...base,
        name: values.name.trim(),
        etage: values.etage.trim(),
        bereich: values.bereich.trim(),
        status: values.status,
        beschreibung: values.beschreibung.trim(),
        laenge: toNumber(values.laenge),
        breite: toNumber(values.breite),
        hoehe: toNumber(values.hoehe),
        qm: qmValue,
        sort_order: toNumber(values.sort_order),
      },
      {
        ...base,
        raum_name: values.name.trim(),
        floor: values.etage.trim(),
        zone: values.bereich.trim(),
        status: values.status,
        description: values.beschreibung.trim(),
        length: toNumber(values.laenge),
        width: toNumber(values.breite),
        height: toNumber(values.hoehe),
        area_m2: qmValue,
        sort_order: toNumber(values.sort_order),
      },
      {
        ...base,
        naziv: values.name.trim(),
        sprat: values.etage.trim(),
        sektor: values.bereich.trim(),
        status: values.status,
        info: values.beschreibung.trim(),
        m2: qmValue,
      },
      {
        ...base,
        title: values.name.trim(),
        etage: values.etage.trim(),
        status: values.status,
        note: values.beschreibung.trim(),
      },
      {
        ...base,
        name: values.name.trim(),
        status: values.status,
      },
    ];
  }

  async function saveRaum() {
    if (!form.name.trim()) {
      alert("Upiši naziv prostorije.");
      return;
    }

    if (isDuplicate(form) && !editId) {
      alert("Ova prostorija već postoji na istoj etaži.");
      return;
    }

    setSaving(true);
    let lastError: any = null;

    for (const payload of buildPayloads(form)) {
      const query = editId
        ? supabase.from(raumConfig.table).update(payload as any).eq("id", editId)
        : supabase.from(raumConfig.table).insert(payload as any);

      const { error } = await query;

      if (!error) {
        resetForm();
        setShowForm(false);
        setSaving(false);
        await loadRaeume();
        return;
      }

      lastError = error;
    }

    setSaving(false);
    alert("Greška kod spremanja Raum: " + (lastError?.message || ""));
  }

  function quickRaum(name: string) {
    setEditId(null);
    setForm({
      name,
      etage: "EG",
      bereich: "",
      status: "Offen",
      beschreibung: "",
      laenge: "",
      breite: "",
      hoehe: "",
      qm: "",
      sort_order: "",
    });
    setShowForm(true);
  }

  function startEdit(row: any) {
    setEditId(row.id);

    setForm({
      name: String(getName(row) || ""),
      etage: String(getEtage(row) || "EG"),
      bereich: String(getBereich(row) || ""),
      status: String(getStatus(row) || "Offen"),
      beschreibung: String(getDescription(row) || ""),
      laenge: String(getLength(row) || ""),
      breite: String(getWidth(row) || ""),
      hoehe: String(getHeight(row) || ""),
      qm: String(getQm(row) || ""),
      sort_order: String(getSortOrder(row) || ""),
    });

    setShowForm(true);
  }

  async function changeStatus(row: any, newStatus: string) {
    const { error } = await supabase
      .from(raumConfig.table)
      .update({ status: newStatus } as any)
      .eq("id", row.id);

    if (error) {
      alert("Greška kod statusa: " + error.message);
      return;
    }

    await loadRaeume();
  }

  async function deleteRaum(row: any) {
    const ok = confirm(`Da li želiš obrisati prostoriju: ${getName(row)}?`);

    if (!ok) return;

    const { error } = await supabase
      .from(raumConfig.table)
      .delete()
      .eq("id", row.id);

    if (error) {
      alert("Greška kod brisanja: " + error.message);
      return;
    }

    await loadRaeume();
  }

  return (
    <main className="page">
      <section className="top">
        <div>
          <Link className="back" href={`/projekte/${projektId}`}>
            ← Zurück zu Projekt
          </Link>

          <p className="label">Projekt Räume</p>
          <h1>Räume</h1>
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
            + Raum hinzufügen
          </button>
        </div>
      </section>

      {errorText && <div className="errorBox">{errorText}</div>}

      <section className="stats">
        <div className="stat">
          <span>Räume</span>
          <strong>{filtered.length}</strong>
        </div>

        <div className="stat">
          <span>Gesamt m²</span>
          <strong>{formatNumber(totalQm)} m²</strong>
        </div>

        <div className="stat">
          <span>Fertig</span>
          <strong>
            {
              filtered.filter(
                (row) => String(getStatus(row)).toLowerCase() === "fertig"
              ).length
            }
          </strong>
        </div>
      </section>

      <section className="toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Traži prostoriju, etažu, status..."
        />

        <select
          value={filterEtage}
          onChange={(e) => setFilterEtage(e.target.value)}
        >
          <option value="Alle">Alle Etagen</option>
          {etagen.map((e) => (
            <option key={e} value={e}>
              {e}
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
        <h2>Brzi unos prostorija</h2>

        <div className="quickGrid">
          {[
            "Bad",
            "WC",
            "Küche",
            "Flur",
            "Wohnzimmer",
            "Schlafzimmer",
            "Keller",
            "Terrasse",
          ].map((name) => (
            <button key={name} onClick={() => quickRaum(name)}>
              + {name}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="emptyBox">Učitavanje Räume...</div>
      ) : filtered.length === 0 ? (
        <div className="emptyBox">
          <h2>Nema prostorija</h2>
          <p>Dodaj prvu prostoriju za ovaj projekt.</p>
        </div>
      ) : (
        <section className="grid">
          {filtered.map((row) => (
            <article key={row.id} className="card">
              <div className="cardTop">
                <div>
                  <h2>{getName(row) || "Raum"}</h2>
                  <p>
                    {getEtage(row) || "-"}
                    {getBereich(row) ? ` · ${getBereich(row)}` : ""}
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
                  <span>Fläche</span>
                  <strong>{formatNumber(getQm(row))} m²</strong>
                </div>

                <div>
                  <span>Länge</span>
                  <strong>{formatNumber(getLength(row))} m</strong>
                </div>

                <div>
                  <span>Breite</span>
                  <strong>{formatNumber(getWidth(row))} m</strong>
                </div>

                <div>
                  <span>Höhe</span>
                  <strong>{formatNumber(getHeight(row))} m</strong>
                </div>
              </div>

              {getDescription(row) && (
                <p className="description">{getDescription(row)}</p>
              )}

              <div className="moduleLinks">
                <Link href={`/projekte/${projektId}/fotos`}>Fotos</Link>
                <Link href={`/projekte/${projektId}/leistung`}>Leistung</Link>
                <Link href={`/projekte/${projektId}/material`}>Material</Link>
              </div>

              <div className="actions">
                <button onClick={() => startEdit(row)}>Bearbeiten</button>
                <button onClick={() => changeStatus(row, "In Arbeit")}>
                  In Arbeit
                </button>
                <button onClick={() => changeStatus(row, "Fertig")}>Fertig</button>
                <button className="delete" onClick={() => deleteRaum(row)}>
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
              <h2>{editId ? "Raum bearbeiten" : "Raum hinzufügen"}</h2>

              <button
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                ×
              </button>
            </div>

            <label>Raum Name *</label>
            <input
              value={form.name}
              onChange={(e) =>
                setForm((old) => ({ ...old, name: e.target.value }))
              }
              placeholder="z.B. Bad EG"
            />

            <div className="twoGrid">
              <div>
                <label>Etage</label>
                <select
                  value={form.etage}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, etage: e.target.value }))
                  }
                >
                  {ETAGEN.map((etage) => (
                    <option key={etage} value={etage}>
                      {etage}
                    </option>
                  ))}
                </select>
              </div>

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
            </div>

            <label>Bereich</label>
            <input
              value={form.bereich}
              onChange={(e) =>
                setForm((old) => ({ ...old, bereich: e.target.value }))
              }
              placeholder="z.B. Haus A, Wohnung 2"
            />

            <div className="fourGrid">
              <div>
                <label>Länge m</label>
                <input
                  value={form.laenge}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, laenge: e.target.value }))
                  }
                  inputMode="decimal"
                  placeholder="4,20"
                />
              </div>

              <div>
                <label>Breite m</label>
                <input
                  value={form.breite}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, breite: e.target.value }))
                  }
                  inputMode="decimal"
                  placeholder="3,10"
                />
              </div>

              <div>
                <label>Höhe m</label>
                <input
                  value={form.hoehe}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, hoehe: e.target.value }))
                  }
                  inputMode="decimal"
                  placeholder="2,50"
                />
              </div>

              <div>
                <label>m² manuell</label>
                <input
                  value={form.qm}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, qm: e.target.value }))
                  }
                  inputMode="decimal"
                  placeholder="auto"
                />
              </div>
            </div>

            <div className="preview">
              Fläche: <strong>{formatNumber(calculateFormQm())} m²</strong>
            </div>

            <label>Reihenfolge</label>
            <input
              value={form.sort_order}
              onChange={(e) =>
                setForm((old) => ({ ...old, sort_order: e.target.value }))
              }
              inputMode="numeric"
              placeholder="z.B. 1"
            />

            <label>Beschreibung / Info</label>
            <textarea
              value={form.beschreibung}
              onChange={(e) =>
                setForm((old) => ({ ...old, beschreibung: e.target.value }))
              }
              placeholder="Info za prostoriju"
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

              <button className="save" onClick={saveRaum} disabled={saving}>
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
          grid-template-columns: 1fr 180px 180px;
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

        .description {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 12px;
          white-space: pre-wrap;
          margin-bottom: 12px !important;
        }

        .moduleLinks {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }

        .moduleLinks a {
          background: #1f2937;
          border: 1px solid #374151;
          color: white;
          text-decoration: none;
          border-radius: 12px;
          padding: 11px;
          text-align: center;
          font-weight: 900;
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
          max-width: 760px;
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

        .twoGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .fourGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
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

        @media (max-width: 1000px) {
          .toolbar,
          .quickGrid,
          .detailGrid,
          .fourGrid {
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
          .twoGrid,
          .moduleLinks {
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