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
  status?: string | null;
  auftraggeber?: string | null;
  bauleiter?: string | null;
  [key: string]: any;
};

type TableConfig = {
  table: string;
  column: string;
};

export default function ProjektAuswertungPage() {
  const params = useParams();
  const projektId = String(params.id);
  const projektIdValue = isNaN(Number(projektId))
    ? projektId
    : Number(projektId);

  const [loading, setLoading] = useState(true);
  const [projekt, setProjekt] = useState<Projekt | null>(null);

  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [materialRows, setMaterialRows] = useState<any[]>([]);
  const [positionen, setPositionen] = useState<any[]>([]);
  const [fotos, setFotos] = useState<any[]>([]);
  const [berichte, setBerichte] = useState<any[]>([]);
  const [aufgaben, setAufgaben] = useState<any[]>([]);

  const [errorText, setErrorText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

  function getDate(row: any) {
    return row.datum || row.date || row.tag || row.day || row.created_date || "";
  }

  function inDateRange(row: any) {
    const d = String(getDate(row) || "");

    if (!d) return true;
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;

    return true;
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

  function getWorker(row: any) {
    return (
      row.radnik ||
      row.arbeiter ||
      row.worker ||
      row.worker_name ||
      row.mitarbeiter ||
      row.name ||
      "Ohne Name"
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
    const stored =
      row.stunden || row.hours || row.total_hours || row.gesamt_stunden || "";

    const storedNumber = toNumber(stored);

    if (storedNumber > 0) return storedNumber;

    return calculateHours(getStart(row), getEnd(row), getPause(row));
  }

  function getMaterialName(row: any) {
    return (
      row.naziv ||
      row.name ||
      row.material_name ||
      row.material ||
      row.title ||
      row.bezeichnung ||
      "Ohne Name"
    );
  }

  function getMaterialQuantity(row: any) {
    return row.kolicina || row.menge || row.quantity || row.qty || row.anzahl || 0;
  }

  function getMaterialUnit(row: any) {
    return row.jedinica || row.einheit || row.unit || "Stk.";
  }

  function getMaterialGroup(row: any) {
    return row.gruppe || row.group_name || row.kategorie || row.category || row.typ || "Dodaci";
  }

  function getPositionTitle(row: any) {
    return row.titel || row.title || row.name || row.position || row.bezeichnung || "Position";
  }

  function getPositionNumber(row: any) {
    return row.nummer || row.position_nr || row.pos_nr || row.number || row.nr || "";
  }

  function getPositionGroup(row: any) {
    return row.gruppe || row.group_name || row.kategorie || row.category || row.typ || "Dodaci";
  }

  function getMengeSoll(row: any) {
    return row.menge_soll || row.soll || row.quantity_planned || row.menge || row.quantity || 0;
  }

  function getMengeIst(row: any) {
    return row.menge_ist || row.ist || row.quantity_done || row.done_quantity || 0;
  }

  function getPositionUnit(row: any) {
    return row.einheit || row.unit || row.jedinica || "m²";
  }

  function getPrice(row: any) {
    return row.einzelpreis || row.price || row.unit_price || row.preis || 0;
  }

  function getStatus(row: any) {
    return row.status || "Offen";
  }

  function isDone(row: any) {
    const s = String(getStatus(row)).toLowerCase();
    return (
      s.includes("fertig") ||
      s.includes("done") ||
      s.includes("freigegeben") ||
      s.includes("approved")
    );
  }

  function getPositionProgress(row: any) {
    const soll = toNumber(getMengeSoll(row));
    const ist = toNumber(getMengeIst(row));

    if (soll <= 0) return 0;

    return Math.min(100, Math.round((ist / soll) * 100));
  }

  async function loadAll() {
    setLoading(true);
    setErrorText("");

    await loadProjekt();

    const [
      arbeitszeitData,
      materialData,
      positionData,
      fotoData,
      berichtData,
      aufgabenData,
    ] = await Promise.all([
      loadRows([
        { table: "arbeitszeiten", column: "projekt_id" },
        { table: "arbeitszeiten", column: "project_id" },
        { table: "arbeitszeiten", column: "baustelle_id" },
        { table: "arbeitszeit", column: "projekt_id" },
        { table: "arbeitszeit", column: "project_id" },
        { table: "stunden", column: "projekt_id" },
      ]),
      loadRows([
        { table: "material_bewegungen", column: "projekt_id" },
        { table: "material_bewegungen", column: "project_id" },
        { table: "projekt_material", column: "projekt_id" },
        { table: "material", column: "projekt_id" },
        { table: "materialien_projekt", column: "projekt_id" },
      ]),
      loadRows([
        { table: "positionen", column: "projekt_id" },
        { table: "positionen", column: "project_id" },
        { table: "projekt_positionen", column: "projekt_id" },
        { table: "lv_positionen", column: "projekt_id" },
        { table: "positions", column: "project_id" },
      ]),
      loadRows([
        { table: "fotos", column: "projekt_id" },
        { table: "fotos", column: "project_id" },
        { table: "fotos", column: "baustelle_id" },
        { table: "photos", column: "projekt_id" },
        { table: "bilder", column: "projekt_id" },
      ]),
      loadRows([
        { table: "tagesberichte", column: "projekt_id" },
        { table: "tagesberichte", column: "project_id" },
        { table: "tagesbericht", column: "projekt_id" },
        { table: "regieberichte", column: "projekt_id" },
        { table: "regiebericht", column: "projekt_id" },
      ]),
      loadRows([
        { table: "aufgaben", column: "projekt_id" },
        { table: "aufgaben", column: "project_id" },
        { table: "tasks", column: "projekt_id" },
        { table: "projekt_aufgaben", column: "projekt_id" },
      ]),
    ]);

    setArbeitszeiten(arbeitszeitData);
    setMaterialRows(materialData);
    setPositionen(positionData);
    setFotos(fotoData);
    setBerichte(berichtData);
    setAufgaben(aufgabenData);

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

  const filteredArbeitszeiten = useMemo(() => {
    return arbeitszeiten.filter(inDateRange);
  }, [arbeitszeiten, dateFrom, dateTo]);

  const filteredMaterial = useMemo(() => {
    return materialRows.filter(inDateRange);
  }, [materialRows, dateFrom, dateTo]);

  const filteredFotos = useMemo(() => {
    return fotos.filter(inDateRange);
  }, [fotos, dateFrom, dateTo]);

  const filteredBerichte = useMemo(() => {
    return berichte.filter(inDateRange);
  }, [berichte, dateFrom, dateTo]);

  const totalHours = useMemo(() => {
    return filteredArbeitszeiten.reduce((sum, row) => sum + getHours(row), 0);
  }, [filteredArbeitszeiten]);

  const workerTotals = useMemo(() => {
    const result: { [key: string]: number } = {};

    filteredArbeitszeiten.forEach((row) => {
      const worker = getWorker(row);
      result[worker] = (result[worker] || 0) + getHours(row);
    });

    return Object.entries(result)
      .map(([worker, hours]) => ({ worker, hours }))
      .sort((a, b) => b.hours - a.hours);
  }, [filteredArbeitszeiten]);

  const materialSummary = useMemo(() => {
    const result: {
      [key: string]: { name: string; unit: string; qty: number; group: string };
    } = {};

    filteredMaterial.forEach((row) => {
      const name = getMaterialName(row);
      const unit = getMaterialUnit(row);
      const group = getMaterialGroup(row);
      const key = `${name}__${unit}`;
      const qty = toNumber(getMaterialQuantity(row));

      if (!result[key]) {
        result[key] = {
          name,
          unit,
          qty: 0,
          group,
        };
      }

      result[key].qty += qty;
    });

    return Object.values(result).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredMaterial]);

  const positionTotals = useMemo(() => {
    const soll = positionen.reduce((sum, row) => sum + toNumber(getMengeSoll(row)), 0);
    const ist = positionen.reduce((sum, row) => sum + toNumber(getMengeIst(row)), 0);

    const auftrag = positionen.reduce((sum, row) => {
      return sum + toNumber(getMengeSoll(row)) * toNumber(getPrice(row));
    }, 0);

    const fertigWert = positionen.reduce((sum, row) => {
      return sum + toNumber(getMengeIst(row)) * toNumber(getPrice(row));
    }, 0);

    const progress = soll > 0 ? Math.round((ist / soll) * 100) : 0;

    return {
      soll,
      ist,
      auftrag,
      fertigWert,
      progress: Math.min(100, progress),
    };
  }, [positionen]);

  const statusCounts = useMemo(() => {
    return {
      aufgabenOffen: aufgaben.filter((row) => !isDone(row)).length,
      aufgabenFertig: aufgaben.filter((row) => isDone(row)).length,
      positionenFertig: positionen.filter((row) => isDone(row)).length,
      positionenOffen: positionen.filter((row) => !isDone(row)).length,
    };
  }, [aufgaben, positionen]);

  function exportCsv() {
    const lines: string[] = [];

    lines.push("Projekt;" + getProjektName());
    lines.push("Ort;" + getProjektOrt());
    lines.push("Zeitraum;" + `${dateFrom || "Start"} bis ${dateTo || "Ende"}`);
    lines.push("");
    lines.push("ÜBERSICHT");
    lines.push(`Arbeitszeit;${formatHours(totalHours)}`);
    lines.push(`Fotos;${filteredFotos.length}`);
    lines.push(`Tagesberichte;${filteredBerichte.length}`);
    lines.push(`Material Einträge;${filteredMaterial.length}`);
    lines.push(`Positionen;${positionen.length}`);
    lines.push(`Auftragssumme;${formatMoney(positionTotals.auftrag)}`);
    lines.push(`Fertig Wert;${formatMoney(positionTotals.fertigWert)}`);
    lines.push(`Fortschritt;${positionTotals.progress}%`);
    lines.push("");

    lines.push("STUNDEN PRO RADNIK");
    lines.push("Radnik;Stunden");
    workerTotals.forEach((item) => {
      lines.push(`${item.worker};${formatHours(item.hours)}`);
    });

    lines.push("");
    lines.push("MATERIAL");
    lines.push("Gruppe;Material;Menge;Einheit");
    materialSummary.forEach((item) => {
      lines.push(`${item.group};${item.name};${formatNumber(item.qty)};${item.unit}`);
    });

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `auswertung-${projektId}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="page">
      <section className="top">
        <div>
          <Link className="back" href={`/projekte/${projektId}`}>
            ← Zurück zu Projekt
          </Link>

          <p className="label">Projekt Auswertung</p>
          <h1>Auswertung</h1>
          <p className="subtitle">
            {getProjektName()}
            {getProjektOrt() ? ` · ${getProjektOrt()}` : ""}
          </p>
        </div>

        <div className="topButtons">
          <button className="btn gray" onClick={loadAll}>
            Aktualisieren
          </button>

          <button className="btn green" onClick={exportCsv}>
            CSV Export
          </button>
        </div>
      </section>

      {errorText && <div className="errorBox">{errorText}</div>}

      <section className="filters">
        <div>
          <label>Von Datum</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div>
          <label>Bis Datum</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <button
          onClick={() => {
            setDateFrom("");
            setDateTo("");
          }}
        >
          Zeitraum löschen
        </button>
      </section>

      {loading ? (
        <div className="emptyBox">Učitavanje Auswertung...</div>
      ) : (
        <>
          <section className="stats">
            <div className="stat">
              <span>Arbeitszeit</span>
              <strong>{formatHours(totalHours)}</strong>
            </div>

            <div className="stat">
              <span>Radnici</span>
              <strong>{workerTotals.length}</strong>
            </div>

            <div className="stat">
              <span>Fotos</span>
              <strong>{filteredFotos.length}</strong>
            </div>

            <div className="stat">
              <span>Tagesberichte</span>
              <strong>{filteredBerichte.length}</strong>
            </div>
          </section>

          <section className="stats">
            <div className="stat">
              <span>Positionen</span>
              <strong>{positionen.length}</strong>
            </div>

            <div className="stat">
              <span>Fortschritt</span>
              <strong>{positionTotals.progress}%</strong>
            </div>

            <div className="stat">
              <span>Auftragssumme</span>
              <strong>{formatMoney(positionTotals.auftrag)}</strong>
            </div>

            <div className="stat">
              <span>Fertig Wert</span>
              <strong>{formatMoney(positionTotals.fertigWert)}</strong>
            </div>
          </section>

          <section className="progressBox">
            <div className="progressTop">
              <div>
                <h2>Projekt Fortschritt</h2>
                <p>
                  Soll: {formatNumber(positionTotals.soll)} · Ist:{" "}
                  {formatNumber(positionTotals.ist)}
                </p>
              </div>

              <strong>{positionTotals.progress}%</strong>
            </div>

            <div className="bar">
              <div style={{ width: `${positionTotals.progress}%` }} />
            </div>
          </section>

          <section className="gridTwo">
            <div className="box">
              <h2>Stunden pro Radnik</h2>

              {workerTotals.length === 0 ? (
                <p className="muted">Nema unosa Arbeitszeit.</p>
              ) : (
                <div className="list">
                  {workerTotals.map((item) => {
                    const percent =
                      totalHours > 0 ? Math.round((item.hours / totalHours) * 100) : 0;

                    return (
                      <div key={item.worker} className="listItem">
                        <div>
                          <strong>{item.worker}</strong>
                          <span>{formatHours(item.hours)}</span>
                        </div>

                        <div className="smallBar">
                          <div style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="box">
              <h2>Status Übersicht</h2>

              <div className="statusGrid">
                <div>
                  <span>Aufgaben offen</span>
                  <strong>{statusCounts.aufgabenOffen}</strong>
                </div>

                <div>
                  <span>Aufgaben fertig</span>
                  <strong>{statusCounts.aufgabenFertig}</strong>
                </div>

                <div>
                  <span>Positionen offen</span>
                  <strong>{statusCounts.positionenOffen}</strong>
                </div>

                <div>
                  <span>Positionen fertig</span>
                  <strong>{statusCounts.positionenFertig}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="box">
            <h2>Materialverbrauch</h2>

            {materialSummary.length === 0 ? (
              <p className="muted">Nema unosa materijala.</p>
            ) : (
              <div className="materialGrid">
                {materialSummary.map((item) => (
                  <div key={`${item.name}-${item.unit}`}>
                    <span>{item.group}</span>
                    <strong>{item.name}</strong>
                    <p>
                      {formatNumber(item.qty)} {item.unit}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="box">
            <h2>Positionen Detail</h2>

            {positionen.length === 0 ? (
              <p className="muted">Nema pozicija.</p>
            ) : (
              <div className="positionList">
                {positionen.map((row) => {
                  const progress = getPositionProgress(row);

                  return (
                    <div key={row.id} className="positionItem">
                      <div className="positionTop">
                        <div>
                          <strong>
                            {getPositionNumber(row)
                              ? `${getPositionNumber(row)} · `
                              : ""}
                            {getPositionTitle(row)}
                          </strong>
                          <span>
                            {getPositionGroup(row)} · {getStatus(row)}
                          </span>
                        </div>

                        <b>{progress}%</b>
                      </div>

                      <div className="smallBar">
                        <div style={{ width: `${progress}%` }} />
                      </div>

                      <p>
                        Soll: {formatNumber(getMengeSoll(row))}{" "}
                        {getPositionUnit(row)} · Ist:{" "}
                        {formatNumber(getMengeIst(row))} {getPositionUnit(row)} · Wert:{" "}
                        {formatMoney(toNumber(getMengeSoll(row)) * toNumber(getPrice(row)))}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
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
        input {
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

        .gray {
          background: #374151;
        }

        .green {
          background: #15803d;
        }

        .filters {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 18px;
          display: grid;
          grid-template-columns: 1fr 1fr 180px;
          gap: 12px;
          align-items: end;
          margin-bottom: 18px;
        }

        label {
          display: block;
          color: #d1d5db;
          font-weight: 800;
          margin-bottom: 7px;
        }

        .filters input {
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

        .filters button {
          background: #374151;
          color: white;
          border: 0;
          border-radius: 14px;
          padding: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
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
          font-size: 28px;
        }

        .progressBox,
        .box {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 20px;
          margin-bottom: 18px;
        }

        .progressTop {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
          margin-bottom: 14px;
        }

        .progressTop h2,
        .box h2 {
          margin: 0 0 10px;
          font-size: 24px;
        }

        .progressTop p {
          margin: 0;
          color: #cbd5e1;
        }

        .progressTop strong {
          font-size: 34px;
        }

        .bar,
        .smallBar {
          background: #030712;
          border-radius: 999px;
          overflow: hidden;
        }

        .bar {
          height: 18px;
        }

        .smallBar {
          height: 10px;
          margin-top: 10px;
        }

        .bar div,
        .smallBar div {
          height: 100%;
          background: #16a34a;
          border-radius: 999px;
        }

        .gridTwo {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-bottom: 18px;
        }

        .muted {
          color: #9ca3af;
          margin: 0;
        }

        .list {
          display: grid;
          gap: 12px;
        }

        .listItem {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 14px;
        }

        .listItem div:first-child {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .listItem strong {
          color: white;
        }

        .listItem span {
          color: #bbf7d0;
          font-weight: 900;
        }

        .statusGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .statusGrid div {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 14px;
        }

        .statusGrid span {
          display: block;
          color: #9ca3af;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .statusGrid strong {
          font-size: 28px;
        }

        .materialGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }

        .materialGrid div {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 14px;
        }

        .materialGrid span {
          display: block;
          color: #9ca3af;
          font-weight: 800;
          font-size: 13px;
          margin-bottom: 6px;
        }

        .materialGrid strong {
          display: block;
          color: white;
          font-size: 17px;
        }

        .materialGrid p {
          margin: 8px 0 0;
          color: #bbf7d0;
          font-weight: 900;
          font-size: 20px;
        }

        .positionList {
          display: grid;
          gap: 12px;
        }

        .positionItem {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 14px;
        }

        .positionTop {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .positionTop strong {
          display: block;
          color: white;
          margin-bottom: 6px;
        }

        .positionTop span {
          color: #9ca3af;
          font-weight: 800;
          font-size: 13px;
        }

        .positionTop b {
          font-size: 22px;
          color: #bbf7d0;
        }

        .positionItem p {
          margin: 10px 0 0;
          color: #cbd5e1;
          line-height: 1.45;
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
          font-weight: 800;
        }

        @media (max-width: 1000px) {
          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .gridTwo {
            grid-template-columns: 1fr;
          }

          .filters {
            grid-template-columns: 1fr;
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
          .statusGrid {
            grid-template-columns: 1fr;
          }

          .stat strong {
            font-size: 26px;
          }

          .progressTop,
          .positionTop,
          .listItem div:first-child {
            display: block;
          }

          .progressTop strong {
            display: block;
            margin-top: 10px;
          }
        }
      `}</style>
    </main>
  );
}