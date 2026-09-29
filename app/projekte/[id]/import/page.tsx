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

type ImportType = "positionen" | "material" | "raeume";

type PreviewRow = {
  rowNumber: number;
  data: any;
  error: string;
};

const IMPORT_TYPES = [
  {
    value: "positionen",
    title: "Positionen / LV",
    description: "Uvoz LV pozicija po projektu",
  },
  {
    value: "material",
    title: "Materialverbrauch",
    description: "Uvoz potrošnje materijala po projektu",
  },
  {
    value: "raeume",
    title: "Räume",
    description: "Uvoz prostorija za projekt",
  },
];

const TEMPLATES: Record<ImportType, string> = {
  positionen:
    "nummer;titel;beschreibung;gruppe;menge_soll;menge_ist;einheit;einzelpreis;status\n01.01;Fliesen verlegen;Boden und Wand;Keramika;120;80;m²;45;Offen\n01.02;Abdichtung ausführen;Bad und Dusche;Hidroizolacija;60;40;m²;18;In Arbeit",
  material:
    "datum;naziv;kolicina;jedinica;gruppe;notiz;status\n2026-06-19;Flexkleber;12;Sack;Ljepilo;Projekt Verbrauch;Offen\n2026-06-19;Silikon;8;Tube;Silikoni;Bad und Küche;Offen",
  raeume:
    "name;etage;bereich;status;beschreibung\nBad EG;EG;Haus A;Offen;Hauptbad\nKüche;EG;Haus A;Offen;Küche Fliesen",
};

export default function ProjektImportPage() {
  const params = useParams();
  const projektId = String(params.id);
  const projektIdValue = isNaN(Number(projektId))
    ? projektId
    : Number(projektId);

  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [importType, setImportType] = useState<ImportType>("positionen");
  const [csvText, setCsvText] = useState(TEMPLATES.positionen);
  const [delimiter, setDelimiter] = useState<";" | "," | "\t">(";");
  const [errorText, setErrorText] = useState("");
  const [resultText, setResultText] = useState("");

  useEffect(() => {
    loadProjekt();
  }, [projektId]);

  useEffect(() => {
    setCsvText(TEMPLATES[importType]);
    setResultText("");
    setErrorText("");
  }, [importType]);

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

  async function loadProjekt() {
    setLoading(true);

    const tables = ["projekte", "baustellen"];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", projektIdValue)
        .maybeSingle();

      if (!error && data) {
        setProjekt(data as Projekt);
        setLoading(false);
        return;
      }
    }

    setProjekt(null);
    setLoading(false);
  }

  function normalizeKey(key: string) {
    return String(key || "")
      .trim()
      .toLowerCase()
      .replaceAll("ä", "ae")
      .replaceAll("ö", "oe")
      .replaceAll("ü", "ue")
      .replaceAll("ß", "ss")
      .replaceAll(" ", "_")
      .replaceAll("-", "_")
      .replaceAll(".", "")
      .replaceAll("/", "_");
  }

  function mapKey(key: string) {
    const k = normalizeKey(key);

    const aliases: Record<string, string> = {
      nr: "nummer",
      number: "nummer",
      position_nr: "nummer",
      pos_nr: "nummer",
      bezeichnung: "titel",
      title: "titel",
      name: "name",
      position: "titel",
      text: "beschreibung",
      description: "beschreibung",
      desc: "beschreibung",
      category: "gruppe",
      kategorie: "gruppe",
      group: "gruppe",
      group_name: "gruppe",
      soll: "menge_soll",
      menge: "menge_soll",
      quantity_planned: "menge_soll",
      planned: "menge_soll",
      ist: "menge_ist",
      quantity_done: "menge_ist",
      done: "menge_ist",
      unit: "einheit",
      einheit: "einheit",
      jedinica: "einheit",
      price: "einzelpreis",
      preis: "einzelpreis",
      unit_price: "einzelpreis",
      datum: "datum",
      date: "datum",
      material: "naziv",
      material_name: "naziv",
      naziv: "naziv",
      kolicina: "kolicina",
      quantity: "kolicina",
      qty: "kolicina",
      amount: "kolicina",
      notiz: "notiz",
      note: "notiz",
      bemerkung: "notiz",
      info: "notiz",
      raum: "name",
      raum_name: "name",
      room: "name",
      etage: "etage",
      floor: "etage",
      bereich: "bereich",
      zone: "bereich",
      status: "status",
    };

    return aliases[k] || k;
  }

  function parseCsv(text: string, delimiterValue: string) {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === delimiterValue && !inQuotes) {
        row.push(cell.trim());
        cell = "";
        continue;
      }

      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") {
          i++;
        }

        row.push(cell.trim());

        const hasContent = row.some((x) => String(x).trim() !== "");
        if (hasContent) rows.push(row);

        row = [];
        cell = "";
        continue;
      }

      cell += char;
    }

    row.push(cell.trim());

    const hasContent = row.some((x) => String(x).trim() !== "");
    if (hasContent) rows.push(row);

    return rows;
  }

  function autoDetectDelimiter(text: string) {
    const firstLine = text.split(/\r?\n/)[0] || "";
    const semicolon = (firstLine.match(/;/g) || []).length;
    const comma = (firstLine.match(/,/g) || []).length;
    const tab = (firstLine.match(/\t/g) || []).length;

    if (tab > semicolon && tab > comma) return "\t";
    if (comma > semicolon) return ",";
    return ";";
  }

  const previewRows = useMemo<PreviewRow[]>(() => {
    if (!csvText.trim()) return [];

    const detected = autoDetectDelimiter(csvText);
    const selectedDelimiter = delimiter || detected;

    const parsed = parseCsv(csvText, selectedDelimiter);

    if (parsed.length < 2) return [];

    const headers = parsed[0].map((h) => mapKey(h));

    return parsed.slice(1).map((cells, index) => {
      const data: any = {};

      headers.forEach((header, i) => {
        data[header] = cells[i] || "";
      });

      let error = "";

      if (importType === "positionen" && !data.titel) {
        error = "Nedostaje titel / bezeichnung.";
      }

      if (importType === "material" && !data.naziv) {
        error = "Nedostaje naziv / material.";
      }

      if (importType === "material" && !data.kolicina) {
        error = "Nedostaje kolicina / menge.";
      }

      if (importType === "raeume" && !data.name) {
        error = "Nedostaje name / raum_name.";
      }

      return {
        rowNumber: index + 2,
        data,
        error,
      };
    });
  }, [csvText, delimiter, importType]);

  const validRows = useMemo(() => {
    return previewRows.filter((row) => !row.error);
  }, [previewRows]);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    const text = await file.text();
    const detected = autoDetectDelimiter(text);

    setDelimiter(detected as ";" | "," | "\t");
    setCsvText(text);
    setResultText("");
    setErrorText("");
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATES[importType]], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `template-${importType}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  async function resolveConfig(type: ImportType): Promise<TableConfig | null> {
    const configs: Record<ImportType, TableConfig[]> = {
      positionen: [
        { table: "positionen", column: "projekt_id" },
        { table: "positionen", column: "project_id" },
        { table: "positionen", column: "baustelle_id" },
        { table: "projekt_positionen", column: "projekt_id" },
        { table: "projekt_positionen", column: "project_id" },
        { table: "lv_positionen", column: "projekt_id" },
        { table: "positions", column: "project_id" },
      ],
      material: [
        { table: "material_bewegungen", column: "projekt_id" },
        { table: "material_bewegungen", column: "project_id" },
        { table: "material_bewegungen", column: "baustelle_id" },
        { table: "projekt_material", column: "projekt_id" },
        { table: "projekt_material", column: "project_id" },
        { table: "material", column: "projekt_id" },
        { table: "materialien_projekt", column: "projekt_id" },
      ],
      raeume: [
        { table: "projekt_raeume", column: "projekt_id" },
        { table: "raeume", column: "projekt_id" },
        { table: "raeume", column: "project_id" },
        { table: "prostorije", column: "projekt_id" },
        { table: "prostorije", column: "project_id" },
        { table: "rooms", column: "project_id" },
        { table: "raeume", column: "baustelle_id" },
        { table: "prostorije", column: "baustelle_id" },
      ],
    };

    for (const config of configs[type]) {
      const { error } = await supabase
        .from(config.table)
        .select("*")
        .eq(config.column, projektIdValue)
        .limit(1);

      if (!error) return config;
    }

    return null;
  }

  async function loadExisting(config: TableConfig) {
    const { data, error } = await supabase
      .from(config.table)
      .select("*")
      .eq(config.column, projektIdValue);

    if (error) return [];
    return data || [];
  }

  function toNumber(value: any) {
    const n = Number(String(value || "0").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function isDuplicate(type: ImportType, row: any, existing: any[]) {
    if (type === "positionen") {
      const nummer = String(row.nummer || "").trim().toLowerCase();
      const titel = String(row.titel || "").trim().toLowerCase();

      return existing.some((x) => {
        const xNummer = String(
          x.nummer || x.position_nr || x.pos_nr || x.number || x.nr || ""
        )
          .trim()
          .toLowerCase();

        const xTitle = String(
          x.titel || x.title || x.name || x.position || x.bezeichnung || ""
        )
          .trim()
          .toLowerCase();

        if (nummer && xNummer && nummer === xNummer) return true;
        if (titel && xTitle && titel === xTitle) return true;

        return false;
      });
    }

    if (type === "material") {
      const name = String(row.naziv || "").trim().toLowerCase();
      const datum = String(row.datum || "").trim();
      const qty = toNumber(row.kolicina);

      return existing.some((x) => {
        const xName = String(
          x.naziv || x.name || x.material_name || x.material || ""
        )
          .trim()
          .toLowerCase();

        const xDatum = String(x.datum || x.date || "").trim();
        const xQty = toNumber(x.kolicina || x.menge || x.quantity || x.qty);

        return name === xName && datum === xDatum && qty === xQty;
      });
    }

    if (type === "raeume") {
      const name = String(row.name || "").trim().toLowerCase();

      return existing.some((x) => {
        const xName = String(
          x.name || x.raum_name || x.naziv || x.title || x.prostorija || ""
        )
          .trim()
          .toLowerCase();

        return name === xName;
      });
    }

    return false;
  }

  function buildPayloads(type: ImportType, row: any, config: TableConfig) {
    const base: any = {};
    base[config.column] = projektIdValue;

    if (type === "positionen") {
      const soll = toNumber(row.menge_soll);
      const ist = toNumber(row.menge_ist);
      const price = toNumber(row.einzelpreis);

      return [
        {
          ...base,
          datum: row.datum || null,
          nummer: row.nummer || "",
          titel: row.titel || "",
          beschreibung: row.beschreibung || "",
          gruppe: row.gruppe || "Keramika",
          menge_soll: soll,
          menge_ist: ist,
          einheit: row.einheit || "m²",
          einzelpreis: price,
          gesamtpreis: soll * price,
          fertig_wert: ist * price,
          status: row.status || "Offen",
        },
        {
          ...base,
          date: row.datum || null,
          position_nr: row.nummer || "",
          title: row.titel || "",
          description: row.beschreibung || "",
          category: row.gruppe || "Keramika",
          quantity_planned: soll,
          quantity_done: ist,
          unit: row.einheit || "m²",
          unit_price: price,
          status: row.status || "Offen",
        },
        {
          ...base,
          nummer: row.nummer || "",
          name: row.titel || "",
          menge: soll,
          einheit: row.einheit || "m²",
          status: row.status || "Offen",
        },
        {
          ...base,
          title: row.titel || "",
          quantity: soll,
          unit: row.einheit || "m²",
        },
      ];
    }

    if (type === "material") {
      return [
        {
          ...base,
          datum: row.datum || null,
          naziv: row.naziv || "",
          kolicina: toNumber(row.kolicina),
          jedinica: row.jedinica || row.einheit || "Stk.",
          gruppe: row.gruppe || "Dodaci",
          notiz: row.notiz || "",
          status: row.status || "Offen",
        },
        {
          ...base,
          date: row.datum || null,
          name: row.naziv || "",
          quantity: toNumber(row.kolicina),
          unit: row.jedinica || row.einheit || "Stk.",
          category: row.gruppe || "Dodaci",
          note: row.notiz || "",
          status: row.status || "Offen",
        },
        {
          ...base,
          material: row.naziv || "",
          menge: toNumber(row.kolicina),
          einheit: row.jedinica || row.einheit || "Stk.",
        },
        {
          ...base,
          name: row.naziv || "",
          quantity: toNumber(row.kolicina),
          unit: row.jedinica || row.einheit || "Stk.",
        },
      ];
    }

    return [
      {
        ...base,
        name: row.name || "",
        etage: row.etage || "",
        bereich: row.bereich || "",
        status: row.status || "Offen",
        beschreibung: row.beschreibung || "",
      },
      {
        ...base,
        raum_name: row.name || "",
        etage: row.etage || "",
        bereich: row.bereich || "",
        status: row.status || "Offen",
        beschreibung: row.beschreibung || "",
      },
      {
        ...base,
        naziv: row.name || "",
        status: row.status || "Offen",
        info: row.beschreibung || "",
      },
      {
        ...base,
        name: row.name || "",
      },
    ];
  }

  async function startImport() {
    setErrorText("");
    setResultText("");

    if (validRows.length === 0) {
      setErrorText("Nema ispravnih redova za import.");
      return;
    }

    const ok = confirm(`Importovati ${validRows.length} redova?`);

    if (!ok) return;

    setImporting(true);

    const config = await resolveConfig(importType);

    if (!config) {
      setImporting(false);
      setErrorText(
        "Ne mogu pronaći odgovarajuću tabelu u Supabase za ovaj import."
      );
      return;
    }

    const existing = await loadExisting(config);

    let added = 0;
    let skipped = 0;
    let failed = 0;
    let lastError = "";

    for (const preview of validRows) {
      if (isDuplicate(importType, preview.data, existing)) {
        skipped++;
        continue;
      }

      let inserted = false;

      for (const payload of buildPayloads(importType, preview.data, config)) {
        const { data, error } = await supabase
          .from(config.table)
          .insert(payload as any)
          .select("*")
          .maybeSingle();

        if (!error) {
          added++;
          inserted = true;

          if (data) {
            existing.push(data);
          }

          break;
        }

        lastError = error.message;
      }

      if (!inserted) {
        failed++;
      }
    }

    setImporting(false);

    setResultText(
      `Import završen. Dodano: ${added}. Preskočeno duplo: ${skipped}. Greška: ${failed}.`
    );

    if (failed > 0 && lastError) {
      setErrorText("Zadnja greška: " + lastError);
    }
  }

  return (
    <main className="page">
      <section className="top">
        <div>
          <Link className="back" href={`/projekte/${projektId}`}>
            ← Zurück zu Projekt
          </Link>

          <p className="label">Projekt Import</p>
          <h1>Import</h1>
          <p className="subtitle">
            {loading ? "Učitavanje..." : getProjektName()}
            {getProjektOrt() ? ` · ${getProjektOrt()}` : ""}
          </p>
        </div>

        <div className="topButtons">
          <button className="btn gray" onClick={downloadTemplate}>
            Template herunterladen
          </button>

          <button className="btn green" onClick={startImport} disabled={importing}>
            {importing ? "Import läuft..." : "Import starten"}
          </button>
        </div>
      </section>

      {errorText && <div className="errorBox">{errorText}</div>}
      {resultText && <div className="successBox">{resultText}</div>}

      <section className="typeGrid">
        {IMPORT_TYPES.map((item) => (
          <button
            key={item.value}
            className={importType === item.value ? "typeCard active" : "typeCard"}
            onClick={() => setImportType(item.value as ImportType)}
          >
            <strong>{item.title}</strong>
            <span>{item.description}</span>
          </button>
        ))}
      </section>

      <section className="importBox">
        <div className="importHeader">
          <div>
            <h2>CSV Daten</h2>
            <p>
              Možeš zalijepiti CSV tekst ili učitati CSV fajl. Prvi red mora biti
              header.
            </p>
          </div>

          <div className="importControls">
            <select
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value as ";" | "," | "\t")}
            >
              <option value=";">Semikolon ;</option>
              <option value=",">Komma ,</option>
              <option value={"\t"}>Tab</option>
            </select>

            <label className="fileBtn">
              CSV Datei
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </label>
          </div>
        </div>

        <textarea
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setResultText("");
            setErrorText("");
          }}
          spellCheck={false}
        />
      </section>

      <section className="stats">
        <div className="stat">
          <span>Redovi ukupno</span>
          <strong>{previewRows.length}</strong>
        </div>

        <div className="stat">
          <span>Ispravno</span>
          <strong>{validRows.length}</strong>
        </div>

        <div className="stat dangerStat">
          <span>Greške</span>
          <strong>{previewRows.filter((row) => row.error).length}</strong>
        </div>
      </section>

      <section className="previewBox">
        <h2>Preview</h2>

        {previewRows.length === 0 ? (
          <div className="emptyBox">
            Nema podataka za preview. Provjeri CSV tekst.
          </div>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Red</th>
                  <th>Status</th>
                  {Object.keys(previewRows[0]?.data || {}).map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {previewRows.slice(0, 80).map((row) => (
                  <tr key={row.rowNumber} className={row.error ? "badRow" : ""}>
                    <td>{row.rowNumber}</td>
                    <td>{row.error || "OK"}</td>
                    {Object.keys(previewRows[0]?.data || {}).map((key) => (
                      <td key={key}>{String(row.data[key] || "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {previewRows.length > 80 && (
          <p className="hint">Preview prikazuje prvih 80 redova.</p>
        )}
      </section>

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
          text-decoration: none;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .gray {
          background: #374151;
        }

        .green {
          background: #15803d;
        }

        .typeGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }

        .typeCard {
          text-align: left;
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 18px;
          color: white;
          cursor: pointer;
        }

        .typeCard.active {
          border-color: #2563eb;
          background: #172554;
        }

        .typeCard strong {
          display: block;
          font-size: 20px;
          margin-bottom: 8px;
        }

        .typeCard span {
          color: #cbd5e1;
          line-height: 1.4;
        }

        .importBox,
        .previewBox {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 18px;
          margin-bottom: 18px;
        }

        .importHeader {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
          margin-bottom: 14px;
        }

        .importHeader h2,
        .previewBox h2 {
          margin: 0 0 8px;
          font-size: 24px;
        }

        .importHeader p {
          margin: 0;
          color: #cbd5e1;
        }

        .importControls {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .importControls select {
          background: #030712;
          color: white;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 13px;
          font-size: 15px;
          outline: none;
        }

        .fileBtn {
          background: #374151;
          color: white;
          border-radius: 14px;
          padding: 13px 16px;
          font-weight: 900;
          cursor: pointer;
        }

        .fileBtn input {
          display: none;
        }

        textarea {
          width: 100%;
          min-height: 260px;
          box-sizing: border-box;
          background: #030712;
          color: white;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 14px;
          font-size: 15px;
          line-height: 1.5;
          resize: vertical;
          outline: none;
          font-family: Consolas, Monaco, monospace;
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

        .errorBox {
          background: #7f1d1d;
          border: 1px solid #ef4444;
          color: white;
          padding: 16px;
          border-radius: 14px;
          margin-bottom: 18px;
          font-weight: 800;
        }

        .successBox {
          background: #064e3b;
          border: 1px solid #16a34a;
          color: white;
          padding: 16px;
          border-radius: 14px;
          margin-bottom: 18px;
          font-weight: 800;
        }

        .emptyBox {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 20px;
          color: #cbd5e1;
          text-align: center;
        }

        .tableWrap {
          overflow: auto;
          border-radius: 14px;
          border: 1px solid #1f2937;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }

        th,
        td {
          border-bottom: 1px solid #1f2937;
          padding: 12px;
          text-align: left;
          vertical-align: top;
          font-size: 14px;
        }

        th {
          background: #0b1220;
          color: #9ca3af;
          font-weight: 900;
          position: sticky;
          top: 0;
        }

        td {
          color: #e5e7eb;
        }

        .badRow td {
          background: rgba(127, 29, 29, 0.35);
        }

        .hint {
          color: #9ca3af;
          margin: 12px 0 0;
        }

        @media (max-width: 900px) {
          .top {
            display: block;
          }

          .topButtons {
            margin-top: 16px;
            display: grid;
            grid-template-columns: 1fr;
          }

          .typeGrid,
          .stats {
            grid-template-columns: 1fr;
          }

          .importHeader {
            display: block;
          }

          .importControls {
            display: grid;
            grid-template-columns: 1fr;
            margin-top: 14px;
          }

          .fileBtn {
            text-align: center;
          }
        }

        @media (max-width: 760px) {
          .page {
            padding: 16px;
          }

          h1 {
            font-size: 36px;
          }

          textarea {
            min-height: 220px;
          }
        }
      `}</style>
    </main>
  );
}