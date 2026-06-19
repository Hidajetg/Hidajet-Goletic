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
  const [regiePreis, setRegiePreis] = useState("");

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

  function getQuantity(row: any) {
    return row.menge || row.quantity || row.kolicina || row.qty || "";
  }

  function getUnit(row: any) {
    return row.einheit || row.unit || row.jedinica || "";
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

    setArbeitszeiten(arbeitszeitData);
    setLeistungen(leistungData);
    setRegieRows(regieData);

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

      setMessage("Arbeitszeit je spremljen.");
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

      setMessage("Leistung je spremljen.");
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
      await insertFirstWorking(
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
              preis: toNumber(regiePreis),
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
              price: toNumber(regiePreis),
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
              betrag: toNumber(regiePreis),
            },
          ];
        }
      );

      setMessage("Regie je spremljen.");
      setRegieArbeit("");
      setRegieBeschreibung("");
      setRegiePreis("");
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
          <p className="label">Radnik Mobile</p>
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
        <label>Radnik</label>
        <select value={worker} onChange={(e) => saveWorkerName(e.target.value)}>
          <option value="">Odaberi ime</option>
          {RADNICI.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <label>Datum</label>
        <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
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
        <p className="hint">Standard je 08:00 - 17:00 sa 30 min pauze.</p>

        <div className="timeGrid">
          <div>
            <label>Von</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div>
            <label>Bis</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <div>
            <label>Pause</label>
            <input
              type="number"
              value={pauseMinuten}
              onChange={(e) => setPauseMinuten(e.target.value)}
            />
          </div>
        </div>

        <div className="preview">
          Stunden:{" "}
          <strong>
            {formatHours(calculateHours(startTime, endTime, pauseMinuten))}
          </strong>
        </div>

        <label>Notiz</label>
        <textarea
          value={zeitNotiz}
          onChange={(e) => setZeitNotiz(e.target.value)}
          placeholder="Napomena za vrijeme"
        />

        <button className="saveBtn" onClick={saveArbeitszeit} disabled={saving}>
          {saving ? "Speichern..." : "Arbeitszeit speichern"}
        </button>
      </section>

      <section className="card">
        <h2>Leistung</h2>

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

        <label>Šta je urađeno?</label>
        <input
          value={leistungTitel}
          onChange={(e) => setLeistungTitel(e.target.value)}
          placeholder="z.B. Fliesen verlegt"
        />

        <div className="threeGrid">
          <div>
            <label>Menge</label>
            <input
              value={leistungMenge}
              onChange={(e) => setLeistungMenge(e.target.value)}
              inputMode="decimal"
              placeholder="25"
            />
          </div>

          <div>
            <label>Einheit</label>
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
            <label>Gruppe</label>
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

        <label>Notiz</label>
        <textarea
          value={leistungNotiz}
          onChange={(e) => setLeistungNotiz(e.target.value)}
          placeholder="Napomena za Leistung"
        />

        <button className="saveBtn" onClick={saveLeistung} disabled={saving}>
          {saving ? "Speichern..." : "Leistung speichern"}
        </button>
      </section>

      <section className="card">
        <h2>Regie / dodatni rad</h2>

        <div className="quickGrid">
          {["Zusatzarbeit", "Wartezeit", "Mangel beheben", "Transport"].map(
            (text) => (
              <button key={text} onClick={() => setRegieArbeit(text)}>
                {text}
              </button>
            )
          )}
        </div>

        <label>Regie Arbeit</label>
        <input
          value={regieArbeit}
          onChange={(e) => setRegieArbeit(e.target.value)}
          placeholder="z.B. Zusatzarbeit"
        />

        <label>Beschreibung</label>
        <textarea
          value={regieBeschreibung}
          onChange={(e) => setRegieBeschreibung(e.target.value)}
          placeholder="Opis dodatnog rada"
        />

        <label>Betrag / Preis</label>
        <input
          value={regiePreis}
          onChange={(e) => setRegiePreis(e.target.value)}
          inputMode="decimal"
          placeholder="z.B. 150"
        />

        <button className="saveBtn orange" onClick={saveRegie} disabled={saving}>
          {saving ? "Speichern..." : "Regie speichern"}
        </button>
      </section>

      <section className="photoBox">
        <h2>Fotos</h2>
        <p>Za slike otvori Foto modul projekta.</p>

        <Link href={`/projekte/${projektId}/fotos`}>📸 Fotos öffnen</Link>
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
                <b>Arbeitszeit</b>
                <span>
                  {getStart(row)} - {getEnd(row)} · {formatHours(getHours(row))}
                </span>
                {getNote(row) && <p>{getNote(row)}</p>}
              </div>
            ))}

            {todayLeistung.map((row) => (
              <div key={`leistung-${row.id}`}>
                <b>Leistung</b>
                <span>
                  {getTitle(row)} · {formatNumber(getQuantity(row))} {getUnit(row)}
                </span>
                {getNote(row) && <p>{getNote(row)}</p>}
              </div>
            ))}

            {todayRegie.map((row) => (
              <div key={`regie-${row.id}`}>
                <b>Regie</b>
                <span>
                  {getTitle(row)} · {formatHours(getHours(row))}
                </span>
                {getNote(row) && <p>{getNote(row)}</p>}
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
          margin: 0 0 10px;
          font-size: 24px;
        }

        .hint,
        .photoBox p,
        .todayBox p {
          color: #cbd5e1;
          margin: 0 0 12px;
          line-height: 1.45;
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

        .todayList div {
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
        }
      `}</style>
    </main>
  );
}