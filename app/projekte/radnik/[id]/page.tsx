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
  info?: string | null;
  google_location?: string | null;
  google_maps?: string | null;
  google_maps_url?: string | null;
  [key: string]: any;
};

type TableConfig = {
  table: string;
  column: string;
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

export default function RadnikProjektMobilePage() {
  const params = useParams();

  const projektId = String(params.id);
  const projektIdValue = isNaN(Number(projektId))
    ? projektId
    : Number(projektId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [leistungen, setLeistungen] = useState<any[]>([]);
  const [regieRows, setRegieRows] = useState<any[]>([]);
  const [regieFotos, setRegieFotos] = useState<any[]>([]);

  const [worker, setWorker] = useState("");
  const [datum, setDatum] = useState(today());

  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [pauseMinuten, setPauseMinuten] = useState("30");
  const [zeitNotiz, setZeitNotiz] = useState("");

  const [leistungTitel, setLeistungTitel] = useState("");
  const [leistungMenge, setLeistungMenge] = useState("");
  const [leistungEinheit, setLeistungEinheit] = useState("m²");
  const [leistungGruppe, setLeistungGruppe] = useState("Keramika");
  const [leistungNotiz, setLeistungNotiz] = useState("");

  const [regieArbeit, setRegieArbeit] = useState("");
  const [regieBeschreibung, setRegieBeschreibung] = useState("");
  const [regieMaterial, setRegieMaterial] = useState("");
  const [regieFotoTitel, setRegieFotoTitel] = useState("");
  const [regieFotoNotiz, setRegieFotoNotiz] = useState("");
  const [regieFotoFiles, setRegieFotoFiles] = useState<File[]>([]);

  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    const savedWorker =
      localStorage.getItem("workerName") ||
      localStorage.getItem("radnik") ||
      localStorage.getItem("userName") ||
      "";

    if (savedWorker) {
      setWorker(savedWorker);
    }

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

  function getProjektInfo() {
    if (!projekt) return "";
    return projekt.info || projekt.beschreibung || projekt.description || projekt.notiz || "";
  }

  function getGoogleLocation() {
    if (!projekt) return "";

    const value =
      projekt.google_location ||
      projekt.google_maps ||
      projekt.google_maps_url ||
      "";

    if (!value) return "";

    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      value
    )}`;
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

  function getTitle(row: any) {
    return row.titel || row.title || row.name || row.leistung || row.arbeit || row.work || "";
  }

  function getDescription(row: any) {
    return row.beschreibung || row.description || row.arbeiten || row.work_done || "";
  }

  function getMaterial(row: any) {
    return row.material || row.materialien || row.material_text || "";
  }

  function getQuantity(row: any) {
    return row.menge || row.quantity || row.kolicina || row.qty || "";
  }

  function getUnit(row: any) {
    return row.einheit || row.unit || row.jedinica || "";
  }

  function getNote(row: any) {
    return row.notiz || row.note || row.bemerkung || row.info || "";
  }

  function getFotoUrl(row: any) {
    return row.url || row.image_url || row.foto_url || row.photo_url || row.public_url || "";
  }

  function getFotoTitle(row: any) {
    return row.titel || row.title || row.name || "Regie Foto";
  }

  function getFotoText(row: any) {
    return row.beschreibung || row.description || row.notiz || row.note || "";
  }

  function getFotosForRegie(regieIdValueLocal: any) {
    return regieFotos.filter((foto) => String(foto.regie_id) === String(regieIdValueLocal));
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
    const stored = toNumber(getStoredHours(row));

    if (stored > 0) return stored;

    return calculateHours(getStart(row), getEnd(row), getPause(row));
  }

  async function loadAll() {
    setLoading(true);
    setErrorText("");
    setMessage("");

    await loadProjekt();

    const arbeitszeitData = await loadRows([
      { table: "arbeitszeiten", column: "projekt_id" },
      { table: "arbeitszeiten", column: "project_id" },
      { table: "arbeitszeiten", column: "baustelle_id" },
      { table: "arbeitszeit", column: "projekt_id" },
      { table: "arbeitszeit", column: "project_id" },
      { table: "stunden", column: "projekt_id" },
    ]);

    const leistungData = await loadRows([
      { table: "leistungen", column: "projekt_id" },
      { table: "leistungen", column: "project_id" },
      { table: "leistung", column: "projekt_id" },
      { table: "leistung", column: "project_id" },
      { table: "produktivitaet", column: "projekt_id" },
      { table: "productivity", column: "project_id" },
      { table: "projekt_leistung", column: "projekt_id" },
    ]);

    const regieData = await loadRows([
      { table: "regie", column: "projekt_id" },
      { table: "regie", column: "project_id" },
      { table: "regiearbeiten", column: "projekt_id" },
      { table: "projekt_regie", column: "projekt_id" },
      { table: "zusatzarbeiten", column: "projekt_id" },
      { table: "extra_work", column: "project_id" },
    ]);

    const regieFotoData = await loadRegieFotos();

    setArbeitszeiten(arbeitszeitData);
    setLeistungen(leistungData);
    setRegieRows(regieData);
    setRegieFotos(regieFotoData);

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

  async function loadRows(configs: TableConfig[]) {
    for (const config of configs) {
      const { data, error } = await supabase
        .from(config.table)
        .select("*")
        .eq(config.column, projektIdValue);

      if (!error) {
        return data || [];
      }
    }

    return [];
  }

  async function loadRegieFotos() {
    const configs = [
      { column: "projekt_id", value: String(projektId) },
      { column: "project_id", value: String(projektId) },
      { column: "baustelle_id", value: String(projektId) },
    ];

    for (const config of configs) {
      const { data, error } = await supabase
        .from("regie_fotos")
        .select("*")
        .eq(config.column, config.value);

      if (!error) {
        return data || [];
      }
    }

    return [];
  }

  async function insertFirstWorking(
    configs: TableConfig[],
    buildPayloads: (config: TableConfig) => any[]
  ) {
    let lastError: any = null;

    for (const config of configs) {
      const payloads = buildPayloads(config);

      for (const payload of payloads) {
        const { error } = await supabase.from(config.table).insert(payload as any);

        if (!error) {
          return true;
        }

        lastError = error;
      }
    }

    throw new Error(lastError?.message || "Spremanje nije uspjelo.");
  }

  async function insertFirstWorkingReturnRow(
    configs: TableConfig[],
    buildPayloads: (config: TableConfig) => any[]
  ) {
    let lastError: any = null;

    for (const config of configs) {
      const payloads = buildPayloads(config);

      for (const payload of payloads) {
        const { data, error } = await supabase
          .from(config.table)
          .insert(payload as any)
          .select("*")
          .maybeSingle();

        if (!error) {
          return data;
        }

        lastError = error;
      }
    }

    throw new Error(lastError?.message || "Spremanje nije uspjelo.");
  }

  function saveWorkerName(value: string) {
    setWorker(value);
    localStorage.setItem("workerName", value);
    localStorage.setItem("radnik", value);
  }

  const todayArbeitszeit = useMemo(() => {
    return arbeitszeiten.filter((row) => {
      return (
        String(getDate(row)) === String(datum) &&
        String(getWorker(row)).toLowerCase() === String(worker).toLowerCase()
      );
    });
  }, [arbeitszeiten, datum, worker]);

  const todayLeistung = useMemo(() => {
    return leistungen.filter((row) => {
      return (
        String(getDate(row)) === String(datum) &&
        String(getWorker(row)).toLowerCase() === String(worker).toLowerCase()
      );
    });
  }, [leistungen, datum, worker]);

  const todayRegie = useMemo(() => {
    return regieRows.filter((row) => {
      return (
        String(getDate(row)) === String(datum) &&
        String(getWorker(row)).toLowerCase() === String(worker).toLowerCase()
      );
    });
  }, [regieRows, datum, worker]);

  const todayHours = useMemo(() => {
    return todayArbeitszeit.reduce((sum, row) => sum + getHours(row), 0);
  }, [todayArbeitszeit]);

  function arbeitszeitDuplicate() {
    return arbeitszeiten.some((row) => {
      return (
        String(getDate(row)) === String(datum) &&
        String(getWorker(row)).toLowerCase() === String(worker).toLowerCase() &&
        String(getStart(row)) === String(startTime) &&
        String(getEnd(row)) === String(endTime)
      );
    });
  }

  async function saveArbeitszeit() {
    if (saving) return;

    if (!worker.trim()) {
      alert("Odaberi radnika.");
      return;
    }

    if (arbeitszeitDuplicate()) {
      alert("Ovaj unos vremena već postoji. Dupli unos nije dodan.");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorText("");

    const hours = calculateHours(startTime, endTime, pauseMinuten);

    try {
      await insertFirstWorking(
        [
          { table: "arbeitszeiten", column: "projekt_id" },
          { table: "arbeitszeiten", column: "project_id" },
          { table: "arbeitszeiten", column: "baustelle_id" },
          { table: "arbeitszeit", column: "projekt_id" },
          { table: "arbeitszeit", column: "project_id" },
          { table: "stunden", column: "projekt_id" },
        ],
        (config) => {
          const base: any = {};
          base[config.column] = projektIdValue;

          return [
            {
              ...base,
              datum,
              radnik: worker.trim(),
              start_time: startTime,
              end_time: endTime,
              pause_minuten: Number(pauseMinuten || 0),
              stunden: hours,
              notiz: zeitNotiz.trim(),
              status: "Wartet",
            },
            {
              ...base,
              date: datum,
              worker: worker.trim(),
              start: startTime,
              end: endTime,
              break_minutes: Number(pauseMinuten || 0),
              hours,
              note: zeitNotiz.trim(),
              status: "Wartet",
            },
            {
              ...base,
              datum,
              arbeiter: worker.trim(),
              von: startTime,
              bis: endTime,
              pause: Number(pauseMinuten || 0),
              stunden: hours,
              bemerkung: zeitNotiz.trim(),
            },
            {
              ...base,
              datum,
              name: worker.trim(),
              stunden: hours,
            },
          ];
        }
      );

      setMessage("Arbeitszeit je spremljen. / Radno vrijeme je spremljeno.");
      setZeitNotiz("");
      await loadAll();
    } catch (err: any) {
      setErrorText("Greška kod Arbeitszeit: " + (err?.message || ""));
    }

    setSaving(false);
  }

  function leistungDuplicate() {
    return leistungen.some((row) => {
      return (
        String(getDate(row)) === String(datum) &&
        String(getWorker(row)).toLowerCase() === String(worker).toLowerCase() &&
        String(getTitle(row)).toLowerCase() === String(leistungTitel).toLowerCase() &&
        toNumber(getQuantity(row)) === toNumber(leistungMenge)
      );
    });
  }

  async function saveLeistung() {
    if (saving) return;

    if (!worker.trim()) {
      alert("Odaberi radnika.");
      return;
    }

    if (!leistungTitel.trim()) {
      alert("Upiši šta je urađeno.");
      return;
    }

    if (!leistungMenge.trim()) {
      alert("Upiši količinu.");
      return;
    }

    if (leistungDuplicate()) {
      alert("Ovaj Leistung unos već postoji. Dupli unos nije dodan.");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorText("");

    try {
      await insertFirstWorking(
        [
          { table: "leistungen", column: "projekt_id" },
          { table: "leistungen", column: "project_id" },
          { table: "leistung", column: "projekt_id" },
          { table: "leistung", column: "project_id" },
          { table: "produktivitaet", column: "projekt_id" },
          { table: "productivity", column: "project_id" },
          { table: "projekt_leistung", column: "projekt_id" },
        ],
        (config) => {
          const base: any = {};
          base[config.column] = projektIdValue;

          const qty = toNumber(leistungMenge);

          return [
            {
              ...base,
              datum,
              radnik: worker.trim(),
              titel: leistungTitel.trim(),
              gruppe: leistungGruppe,
              menge: qty,
              einheit: leistungEinheit,
              notiz: leistungNotiz.trim(),
              status: "Wartet",
            },
            {
              ...base,
              date: datum,
              worker: worker.trim(),
              title: leistungTitel.trim(),
              category: leistungGruppe,
              quantity: qty,
              unit: leistungEinheit,
              note: leistungNotiz.trim(),
              status: "Wartet",
            },
            {
              ...base,
              datum,
              arbeiter: worker.trim(),
              leistung: leistungTitel.trim(),
              kategorie: leistungGruppe,
              menge: qty,
              einheit: leistungEinheit,
              bemerkung: leistungNotiz.trim(),
            },
            {
              ...base,
              datum,
              name: worker.trim(),
              title: leistungTitel.trim(),
              quantity: qty,
              unit: leistungEinheit,
            },
          ];
        }
      );

      setMessage("Leistung je spremljen. / Urađeni posao je spremljen.");
      setLeistungTitel("");
      setLeistungMenge("");
      setLeistungNotiz("");
      await loadAll();
    } catch (err: any) {
      setErrorText("Greška kod Leistung: " + (err?.message || ""));
    }

    setSaving(false);
  }

  function regieDuplicate() {
    return regieRows.some((row) => {
      return (
        String(getDate(row)) === String(datum) &&
        String(getWorker(row)).toLowerCase() === String(worker).toLowerCase() &&
        String(getTitle(row)).toLowerCase() === String(regieArbeit).toLowerCase()
      );
    });
  }

  async function uploadRegieFotos(savedRegieId: number | string) {
    if (regieFotoFiles.length === 0) return;

    for (const file of regieFotoFiles) {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${projektId}/regie-${savedRegieId}-${Date.now()}-${cleanName}`;

      const buckets = ["regie-fotos", "fotos", "photos"];
      let publicUrl = "";
      let usedBucket = "";

      for (const bucket of buckets) {
        const { error } = await supabase.storage.from(bucket).upload(path, file, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        });

        if (!error) {
          const { data } = supabase.storage.from(bucket).getPublicUrl(path);
          publicUrl = data.publicUrl || "";
          usedBucket = bucket;
          break;
        }
      }

      if (!publicUrl) {
        continue;
      }

      const payload = {
        projekt_id: String(projektId),
        project_id: String(projektId),
        baustelle_id: String(projektId),
        regie_id: String(savedRegieId),
        titel: regieFotoTitel.trim() || file.name,
        title: regieFotoTitel.trim() || file.name,
        beschreibung: regieFotoNotiz.trim(),
        description: regieFotoNotiz.trim(),
        notiz: regieFotoNotiz.trim(),
        note: regieFotoNotiz.trim(),
        url: publicUrl,
        image_url: publicUrl,
        foto_url: publicUrl,
        photo_url: publicUrl,
        public_url: publicUrl,
        bucket: usedBucket,
        path,
        file_path: path,
        storage_path: path,
      };

      await supabase.from("regie_fotos").insert(payload as any);
    }
  }

  async function saveRegie() {
    if (saving) return;

    if (!worker.trim()) {
      alert("Odaberi radnika.");
      return;
    }

    if (!regieArbeit.trim()) {
      alert("Upiši Regie dodatni rad.");
      return;
    }

    if (regieDuplicate()) {
      alert("Ovaj Regie unos već postoji. Dupli unos nije dodan.");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorText("");

    const hours = calculateHours(startTime, endTime, pauseMinuten);

    try {
      const savedRow = await insertFirstWorkingReturnRow(
        [
          { table: "regie", column: "projekt_id" },
          { table: "regie", column: "project_id" },
          { table: "regiearbeiten", column: "projekt_id" },
          { table: "projekt_regie", column: "projekt_id" },
          { table: "zusatzarbeiten", column: "projekt_id" },
          { table: "extra_work", column: "project_id" },
        ],
        (config) => {
          const base: any = {};
          base[config.column] = projektIdValue;

          return [
            {
              ...base,
              datum,
              radnik: worker.trim(),
              arbeit: regieArbeit.trim(),
              beschreibung: regieBeschreibung.trim(),
              start_time: startTime,
              end_time: endTime,
              pause_minuten: Number(pauseMinuten || 0),
              stunden: hours,
              material: regieMaterial.trim(),
              status: "Wartet",
              freigabe_status: "Wartet",
            },
            {
              ...base,
              date: datum,
              worker: worker.trim(),
              title: regieArbeit.trim(),
              description: regieBeschreibung.trim(),
              start: startTime,
              end: endTime,
              break_minutes: Number(pauseMinuten || 0),
              hours,
              material: regieMaterial.trim(),
              status: "Wartet",
              approval_status: "Wartet",
            },
            {
              ...base,
              datum,
              arbeiter: worker.trim(),
              regiearbeit: regieArbeit.trim(),
              arbeiten: regieBeschreibung.trim(),
              stunden: hours,
              materialien: regieMaterial.trim(),
            },
          ];
        }
      );

      if (savedRow?.id && regieFotoFiles.length > 0) {
        await uploadRegieFotos(savedRow.id);
      }

      setMessage("Regie je spremljen. / Dodatni rad je spremljen.");
      setRegieArbeit("");
      setRegieBeschreibung("");
      setRegieMaterial("");
      setRegieFotoTitel("");
      setRegieFotoNotiz("");
      setRegieFotoFiles([]);
      await loadAll();
    } catch (err: any) {
      setErrorText("Greška kod Regie: " + (err?.message || ""));
    }

    setSaving(false);
  }

  return (
    <main className="page">
      <section className="top">
        <div>
          <p className="label">Radnik Mobile / unos radnika</p>
          <h1>{getProjektName()}</h1>
          <p className="subtitle">{getProjektOrt() || "Projekt"}</p>
        </div>

        <Link className="back" href={`/projekte/${projektId}`}>
          Admin
        </Link>
      </section>

      {message && <div className="successBox">{message}</div>}
      {errorText && <div className="errorBox">{errorText}</div>}

      <section className="workerBox">
        <label>Radnik / Arbeiter</label>
        <select value={worker} onChange={(e) => saveWorkerName(e.target.value)}>
          <option value="">Odaberi ime / Name auswählen</option>
          {RADNICI.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <label>Datum / datum</label>
        <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />

        {getProjektInfo() && (
          <div className="infoBox">
            <b>Info Baustelle</b>
            <p>{getProjektInfo()}</p>
          </div>
        )}

        {getGoogleLocation() && (
          <a className="mapBtn" href={getGoogleLocation()} target="_blank" rel="noreferrer">
            📍 Google Standort öffnen / Otvori lokaciju
          </a>
        )}
      </section>

      <section className="stats">
        <div>
          <span>Danas sati</span>
          <strong>{formatHours(todayHours)}</strong>
        </div>

        <div>
          <span>Leistung</span>
          <strong>{todayLeistung.length}</strong>
        </div>

        <div>
          <span>Regie</span>
          <strong>{todayRegie.length}</strong>
        </div>
      </section>

      <section className="card">
        <h2>Arbeitszeit</h2>
        <p className="translate">Radno vrijeme</p>
        <p className="hint">Standard je 08:00 - 17:00 sa 30 min pauze.</p>

        <div className="timeGrid">
          <div>
            <label>Von / od</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div>
            <label>Bis / do</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <div>
            <label>Pause / pauza</label>
            <input
              type="number"
              value={pauseMinuten}
              onChange={(e) => setPauseMinuten(e.target.value)}
            />
          </div>
        </div>

        <div className="preview">
          Stunden / sati:{" "}
          <strong>
            {formatHours(calculateHours(startTime, endTime, pauseMinuten))}
          </strong>
        </div>

        <label>Notiz / napomena</label>
        <textarea
          value={zeitNotiz}
          onChange={(e) => setZeitNotiz(e.target.value)}
          placeholder="Napomena za vrijeme"
        />

        <button className="saveBtn" onClick={saveArbeitszeit} disabled={saving}>
          {saving ? "Speichern..." : "Arbeitszeit speichern / Spremi radno vrijeme"}
        </button>
      </section>

      <section className="card">
        <h2>Leistung</h2>
        <p className="translate">Urađeni posao</p>

        <div className="quickGrid">
          {[
            "Fliesen verlegt",
            "Abdichtung gemacht",
            "Verfugt",
            "Silikon gemacht",
          ].map((text) => (
            <button key={text} onClick={() => setLeistungTitel(text)}>
              {text}
            </button>
          ))}
        </div>

        <label>Was wurde gemacht? / Šta je urađeno?</label>
        <input
          value={leistungTitel}
          onChange={(e) => setLeistungTitel(e.target.value)}
          placeholder="z.B. Fliesen verlegt"
        />

        <div className="threeGrid">
          <div>
            <label>Menge / količina</label>
            <input
              value={leistungMenge}
              onChange={(e) => setLeistungMenge(e.target.value)}
              inputMode="decimal"
              placeholder="25"
            />
          </div>

          <div>
            <label>Einheit / jedinica</label>
            <select
              value={leistungEinheit}
              onChange={(e) => setLeistungEinheit(e.target.value)}
            >
              {EINHEITEN.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Gruppe / grupa</label>
            <select
              value={leistungGruppe}
              onChange={(e) => setLeistungGruppe(e.target.value)}
            >
              {GRUPPEN.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label>Notiz / napomena</label>
        <textarea
          value={leistungNotiz}
          onChange={(e) => setLeistungNotiz(e.target.value)}
          placeholder="Napomena za Leistung"
        />

        <button className="saveBtn" onClick={saveLeistung} disabled={saving}>
          {saving ? "Speichern..." : "Leistung speichern / Spremi urađeni posao"}
        </button>
      </section>

      <section className="card">
        <h2>Regie / Zusatzarbeit</h2>
        <p className="translate">Dodatni rad</p>
        <p className="hint">
          Ovdje se unosi dodatni rad koji nije u osnovnom dogovoru. Bez cijene.
        </p>

        <div className="quickGrid">
          {["Zusatzarbeit", "Wartezeit", "Mangel beheben", "Transport"].map(
            (text) => (
              <button key={text} onClick={() => setRegieArbeit(text)}>
                {text}
              </button>
            )
          )}
        </div>

        <label>Regie Arbeit / dodatni rad</label>
        <input
          value={regieArbeit}
          onChange={(e) => setRegieArbeit(e.target.value)}
          placeholder="z.B. Zusatzarbeit"
        />

        <label>Beschreibung / opis</label>
        <textarea
          value={regieBeschreibung}
          onChange={(e) => setRegieBeschreibung(e.target.value)}
          placeholder="Opis dodatnog rada"
        />

        <label>Material / materijal</label>
        <textarea
          value={regieMaterial}
          onChange={(e) => setRegieMaterial(e.target.value)}
          placeholder="Ako ima materijala, upiši ovdje"
        />

        <section className="fotoBox">
          <h3>Fotos hinzufügen</h3>
          <p>Dodaj slike za ovaj Regie dodatni rad.</p>

          <label>Foto Titel / naziv slike</label>
          <input
            value={regieFotoTitel}
            onChange={(e) => setRegieFotoTitel(e.target.value)}
            placeholder="z.B. Vorher / Nachher"
          />

          <label>Foto Notiz / opis slike</label>
          <textarea
            value={regieFotoNotiz}
            onChange={(e) => setRegieFotoNotiz(e.target.value)}
            placeholder="Kratak opis slika"
          />

          <label>Slike / Fotos</label>
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={(e) => setRegieFotoFiles(Array.from(e.target.files || []))}
          />

          {regieFotoFiles.length > 0 && (
            <div className="selectedFiles">
              {regieFotoFiles.map((file) => (
                <span key={`${file.name}-${file.size}`}>{file.name}</span>
              ))}
            </div>
          )}
        </section>

        <button className="saveBtn orange" onClick={saveRegie} disabled={saving}>
          {saving ? "Speichern..." : "Regie speichern / Spremi dodatni rad"}
        </button>
      </section>

      <section className="photoBox">
        <h2>Fotos</h2>
        <p>Za opšte slike projekta otvori Foto modul projekta.</p>

        <Link href={`/projekte/${projektId}/fotos`}>📸 Fotos öffnen / Otvori slike</Link>
      </section>

      <section className="todayBox">
        <h2>Današnji unosi</h2>

        {loading ? (
          <p>Učitavanje...</p>
        ) : todayArbeitszeit.length === 0 &&
          todayLeistung.length === 0 &&
          todayRegie.length === 0 ? (
          <p>Nema unosa za ovaj dan.</p>
        ) : (
          <div className="todayList">
            {todayArbeitszeit.map((row) => (
              <div key={`zeit-${row.id}`}>
                <b>Arbeitszeit / radno vrijeme</b>
                <span>
                  {getStart(row)} - {getEnd(row)} · {formatHours(getHours(row))}
                </span>
                {getNote(row) && <p>{getNote(row)}</p>}
              </div>
            ))}

            {todayLeistung.map((row) => (
              <div key={`leistung-${row.id}`}>
                <b>Leistung / urađeni posao</b>
                <span>
                  {getTitle(row)} · {formatNumber(getQuantity(row))} {getUnit(row)}
                </span>
                {getNote(row) && <p>{getNote(row)}</p>}
              </div>
            ))}

            {todayRegie.map((row) => {
              const fotos = getFotosForRegie(row.id);

              return (
                <div key={`regie-${row.id}`}>
                  <b>Regie / dodatni rad</b>
                  <span>
                    {getTitle(row)} · {formatHours(getHours(row))}
                  </span>

                  {getDescription(row) && <p>{getDescription(row)}</p>}
                  {getMaterial(row) && <p>Material: {getMaterial(row)}</p>}

                  {fotos.length > 0 && (
                    <div className="miniPhotos">
                      {fotos.slice(0, 4).map((foto) => (
                        <img
                          key={foto.id}
                          src={getFotoUrl(foto)}
                          alt={getFotoTitle(foto)}
                        />
                      ))}
                    </div>
                  )}

                  <Link
                    className="scheinLink"
                    href={`/projekte/${projektId}/regie/${row.id}/schein`}
                  >
                    📄 Regieschein öffnen
                  </Link>
                </div>
              );
            })}
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

        .top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
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
          font-size: 30px;
          line-height: 1.05;
        }

        .subtitle {
          margin: 8px 0 0;
          color: #cbd5e1;
          font-weight: 700;
        }

        .back {
          background: #374151;
          color: white;
          text-decoration: none;
          border-radius: 14px;
          padding: 12px 14px;
          font-weight: 900;
          white-space: nowrap;
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
          min-height: 88px;
          resize: vertical;
          line-height: 1.45;
        }

        .workerBox,
        .card,
        .photoBox,
        .todayBox {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 20px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .card h2,
        .photoBox h2,
        .todayBox h2 {
          margin: 0 0 4px;
          font-size: 24px;
        }

        .translate {
          margin: 0 0 10px;
          color: #93c5fd;
          font-weight: 900;
        }

        .hint,
        .photoBox p,
        .todayBox p {
          color: #cbd5e1;
          margin: 0 0 12px;
          line-height: 1.45;
        }

        .infoBox {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 13px;
          margin-top: 14px;
        }

        .infoBox b {
          display: block;
          color: #93c5fd;
          margin-bottom: 6px;
        }

        .infoBox p {
          color: #cbd5e1;
          margin: 0;
          line-height: 1.45;
          white-space: pre-wrap;
        }

        .mapBtn {
          display: block;
          background: #15803d;
          color: white;
          text-decoration: none;
          border-radius: 16px;
          padding: 15px;
          text-align: center;
          font-size: 16px;
          font-weight: 900;
          margin-top: 14px;
        }

        .stats {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
          margin-bottom: 16px;
        }

        .stats div {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 16px;
          padding: 14px;
        }

        .stats span {
          display: block;
          color: #9ca3af;
          font-size: 13px;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .stats strong {
          font-size: 22px;
        }

        .timeGrid,
        .threeGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
        }

        .quickGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 12px;
        }

        .quickGrid button {
          background: #1f2937;
          color: white;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 13px;
          font-weight: 900;
          font-size: 14px;
        }

        .preview {
          margin-top: 14px;
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 14px;
          color: #cbd5e1;
          font-weight: 900;
        }

        .preview strong {
          color: #bbf7d0;
          font-size: 22px;
        }

        .saveBtn {
          width: 100%;
          margin-top: 14px;
          background: #2563eb;
          color: white;
          border: 0;
          border-radius: 16px;
          padding: 17px;
          font-size: 17px;
          font-weight: 900;
        }

        .saveBtn.orange {
          background: #ea580c;
        }

        .saveBtn:disabled {
          opacity: 0.6;
        }

        .fotoBox {
          margin-top: 16px;
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 14px;
        }

        .fotoBox h3 {
          margin: 0 0 6px;
          font-size: 20px;
        }

        .fotoBox p {
          margin: 0 0 10px;
          color: #cbd5e1;
        }

        .selectedFiles {
          display: grid;
          gap: 8px;
          margin-top: 12px;
        }

        .selectedFiles span {
          background: #111827;
          border: 1px solid #374151;
          color: #e5e7eb;
          border-radius: 12px;
          padding: 10px;
          font-size: 13px;
          font-weight: 800;
        }

        .photoBox a {
          display: block;
          background: #15803d;
          color: white;
          text-decoration: none;
          border-radius: 16px;
          padding: 16px;
          text-align: center;
          font-size: 17px;
          font-weight: 900;
        }

        .todayList {
          display: grid;
          gap: 10px;
        }

        .todayList > div {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 13px;
        }

        .todayList b {
          display: block;
          color: #93c5fd;
          margin-bottom: 6px;
        }

        .todayList span {
          display: block;
          color: white;
          font-weight: 800;
        }

        .todayList p {
          margin: 8px 0 0;
          color: #cbd5e1;
        }

        .miniPhotos {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-top: 10px;
        }

        .miniPhotos img {
          width: 100%;
          height: 110px;
          object-fit: cover;
          border-radius: 12px;
          border: 1px solid #374151;
        }

        .scheinLink {
          display: block;
          margin-top: 10px;
          background: #2563eb;
          color: white;
          text-align: center;
          text-decoration: none;
          border-radius: 12px;
          padding: 12px;
          font-weight: 900;
        }

        .successBox {
          background: #064e3b;
          border: 1px solid #16a34a;
          color: white;
          padding: 14px;
          border-radius: 14px;
          margin-bottom: 16px;
          font-weight: 900;
        }

        .errorBox {
          background: #7f1d1d;
          border: 1px solid #ef4444;
          color: white;
          padding: 14px;
          border-radius: 14px;
          margin-bottom: 16px;
          font-weight: 900;
        }

        @media (min-width: 760px) {
          .page {
            padding: 28px;
          }

          .top {
            max-width: 880px;
            margin: 0 auto 18px;
          }

          .workerBox,
          .card,
          .photoBox,
          .todayBox,
          .stats {
            max-width: 880px;
            margin-left: auto;
            margin-right: auto;
          }

          .timeGrid {
            grid-template-columns: 1fr 1fr 130px;
            gap: 12px;
          }

          .threeGrid {
            grid-template-columns: 1fr 150px 1fr;
            gap: 12px;
          }

          .quickGrid {
            grid-template-columns: repeat(4, 1fr);
          }

          .miniPhotos {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>
    </main>
  );
}