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
  info?: string | null;
  created_at?: string | null;
  [key: string]: any;
};

type TableConfig = {
  table: string;
  column: string;
};

export default function ProjektBerichtPage() {
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
    return projekt.ort || projekt.mjesto || projekt.location || "";
  }

  function getProjektAdresse() {
    if (!projekt) return "";
    return projekt.adresse || "";
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

  function getBerichtText(row: any) {
    return (
      row.leistung ||
      row.arbeiten ||
      row.work_done ||
      row.beschreibung ||
      row.description ||
      row.notiz ||
      row.note ||
      row.info ||
      ""
    );
  }

  function getBerichtWorkers(row: any) {
    return row.arbeiter || row.workers || row.radnici || row.mitarbeiter || "";
  }

  function getBerichtWeather(row: any) {
    const wetter = row.wetter || row.weather || "";
    const temperatur = row.temperatur || row.temperature || "";

    if (wetter && temperatur) return `${wetter} · ${temperatur}`;
    return wetter || temperatur || "";
  }

  function getTaskTitle(row: any) {
    return row.titel || row.title || row.name || row.aufgabe || row.task || "";
  }

  function getTaskAssigned(row: any) {
    return (
      row.zugewiesen_an ||
      row.assigned_to ||
      row.radnik ||
      row.worker ||
      row.arbeiter ||
      ""
    );
  }

  function getImageUrl(row: any) {
    return (
      row.url ||
      row.image_url ||
      row.foto_url ||
      row.photo_url ||
      row.bild_url ||
      row.public_url ||
      ""
    );
  }

  function getImageTitle(row: any) {
    return row.titel || row.title || row.name || row.foto_name || row.bild_name || "Foto";
  }

  function getImageDescription(row: any) {
    return row.beschreibung || row.description || row.notiz || row.note || row.info || "";
  }

  async function loadAll() {
    setLoading(true);

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
    return berichte
      .filter(inDateRange)
      .sort((a, b) => String(getDate(a)).localeCompare(String(getDate(b))));
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

  function printReport() {
    window.print();
  }

  function exportCsv() {
    const lines: string[] = [];

    lines.push("BERICHT");
    lines.push(`Projekt;${getProjektName()}`);
    lines.push(`Ort;${getProjektOrt()}`);
    lines.push(`Adresse;${getProjektAdresse()}`);
    lines.push(`Auftraggeber;${projekt?.auftraggeber || ""}`);
    lines.push(`Bauleiter;${projekt?.bauleiter || ""}`);
    lines.push(`Zeitraum;${dateFrom || "Start"} bis ${dateTo || "Ende"}`);
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
    a.download = `bericht-${projektId}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="page">
      <section className="top noPrint">
        <div>
          <Link className="back" href={`/projekte/${projektId}`}>
            ← Zurück zu Projekt
          </Link>

          <p className="label">Projekt Bericht</p>
          <h1>Bericht</h1>
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

          <button className="btn blue" onClick={printReport}>
            Drucken / PDF
          </button>
        </div>
      </section>

      <section className="filters noPrint">
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
        <div className="emptyBox">Učitavanje Bericht...</div>
      ) : (
        <section className="report">
          <div className="reportHeader">
            <div>
              <p className="company">Projektbericht</p>
              <h1>{getProjektName()}</h1>
              <p>
                {dateFrom || dateTo
                  ? `Zeitraum: ${dateFrom || "Start"} bis ${dateTo || "Ende"}`
                  : "Gesamtbericht"}
              </p>
            </div>

            <div className="reportDate">
              <span>Datum</span>
              <strong>{new Date().toLocaleDateString("de-DE")}</strong>
            </div>
          </div>

          <section className="projectData">
            <div>
              <span>Projekt</span>
              <strong>{getProjektName()}</strong>
            </div>

            <div>
              <span>Ort</span>
              <strong>{getProjektOrt() || "-"}</strong>
            </div>

            <div>
              <span>Adresse</span>
              <strong>{getProjektAdresse() || "-"}</strong>
            </div>

            <div>
              <span>Auftraggeber</span>
              <strong>{projekt?.auftraggeber || "-"}</strong>
            </div>

            <div>
              <span>Bauleiter</span>
              <strong>{projekt?.bauleiter || "-"}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong>{projekt?.status || "Aktiv"}</strong>
            </div>
          </section>

          {projekt?.info && (
            <section className="section">
              <h2>Baustelle Info</h2>
              <p className="textBlock">{projekt.info}</p>
            </section>
          )}

          <section className="summaryGrid">
            <div>
              <span>Arbeitszeit</span>
              <strong>{formatHours(totalHours)}</strong>
            </div>

            <div>
              <span>Radnici</span>
              <strong>{workerTotals.length}</strong>
            </div>

            <div>
              <span>Fotos</span>
              <strong>{filteredFotos.length}</strong>
            </div>

            <div>
              <span>Tagesberichte</span>
              <strong>{filteredBerichte.length}</strong>
            </div>

            <div>
              <span>Material Einträge</span>
              <strong>{filteredMaterial.length}</strong>
            </div>

            <div>
              <span>Fortschritt</span>
              <strong>{positionTotals.progress}%</strong>
            </div>
          </section>

          <section className="section">
            <h2>Finanzen / Positionen Übersicht</h2>

            <div className="moneyGrid">
              <div>
                <span>Auftragssumme</span>
                <strong>{formatMoney(positionTotals.auftrag)}</strong>
              </div>

              <div>
                <span>Fertig Wert</span>
                <strong>{formatMoney(positionTotals.fertigWert)}</strong>
              </div>

              <div>
                <span>Soll Menge</span>
                <strong>{formatNumber(positionTotals.soll)}</strong>
              </div>

              <div>
                <span>Ist Menge</span>
                <strong>{formatNumber(positionTotals.ist)}</strong>
              </div>
            </div>

            <div className="bar">
              <div style={{ width: `${positionTotals.progress}%` }} />
            </div>
          </section>

          <section className="section">
            <h2>Arbeitszeit pro Radnik</h2>

            {workerTotals.length === 0 ? (
              <p className="muted">Keine Arbeitszeit vorhanden.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Radnik</th>
                    <th>Stunden</th>
                  </tr>
                </thead>

                <tbody>
                  {workerTotals.map((item) => (
                    <tr key={item.worker}>
                      <td>{item.worker}</td>
                      <td>{formatHours(item.hours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="section">
            <h2>Tagesberichte</h2>

            {filteredBerichte.length === 0 ? (
              <p className="muted">Keine Tagesberichte vorhanden.</p>
            ) : (
              <div className="berichtList">
                {filteredBerichte.map((row) => (
                  <div key={row.id} className="berichtItem">
                    <div className="berichtTop">
                      <strong>{getDate(row) || "Ohne Datum"}</strong>
                      <span>{getBerichtWeather(row)}</span>
                    </div>

                    {getBerichtWorkers(row) && (
                      <p>
                        <b>Arbeiter:</b> {getBerichtWorkers(row)}
                      </p>
                    )}

                    <p>{getBerichtText(row) || "-"}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="section">
            <h2>Materialverbrauch</h2>

            {materialSummary.length === 0 ? (
              <p className="muted">Kein Material vorhanden.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Gruppe</th>
                    <th>Material</th>
                    <th>Menge</th>
                    <th>Einheit</th>
                  </tr>
                </thead>

                <tbody>
                  {materialSummary.map((item) => (
                    <tr key={`${item.name}-${item.unit}`}>
                      <td>{item.group}</td>
                      <td>{item.name}</td>
                      <td>{formatNumber(item.qty)}</td>
                      <td>{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="section">
            <h2>Positionen</h2>

            {positionen.length === 0 ? (
              <p className="muted">Keine Positionen vorhanden.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Nr.</th>
                    <th>Position</th>
                    <th>Gruppe</th>
                    <th>Soll</th>
                    <th>Ist</th>
                    <th>Einheit</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {positionen.map((row) => (
                    <tr key={row.id}>
                      <td>{getPositionNumber(row)}</td>
                      <td>{getPositionTitle(row)}</td>
                      <td>{getPositionGroup(row)}</td>
                      <td>{formatNumber(getMengeSoll(row))}</td>
                      <td>{formatNumber(getMengeIst(row))}</td>
                      <td>{getPositionUnit(row)}</td>
                      <td>{getStatus(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="section">
            <h2>Aufgaben</h2>

            {aufgaben.length === 0 ? (
              <p className="muted">Keine Aufgaben vorhanden.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Aufgabe</th>
                    <th>Radnik</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {aufgaben.map((row) => (
                    <tr key={row.id}>
                      <td>{getTaskTitle(row)}</td>
                      <td>{getTaskAssigned(row) || "-"}</td>
                      <td>{getStatus(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="section photosSection">
            <h2>Fotos</h2>

            {filteredFotos.length === 0 ? (
              <p className="muted">Keine Fotos vorhanden.</p>
            ) : (
              <div className="photoGrid">
                {filteredFotos.slice(0, 24).map((row) => {
                  const imageUrl = getImageUrl(row);

                  return (
                    <div key={row.id} className="photoItem">
                      {imageUrl ? (
                        <img src={imageUrl} alt={getImageTitle(row)} />
                      ) : (
                        <div className="noImage">Kein Bild</div>
                      )}

                      <div>
                        <strong>{getImageTitle(row)}</strong>
                        <span>{getDate(row)}</span>
                        {getImageDescription(row) && (
                          <p>{getImageDescription(row)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="signature">
            <div>
              <span>Auftraggeber</span>
            </div>

            <div>
              <span>Bauleiter / Firma</span>
            </div>
          </section>
        </section>
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

        .blue {
          background: #2563eb;
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

        .emptyBox {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 30px;
          text-align: center;
          color: #cbd5e1;
          font-weight: 800;
        }

        .report {
          background: white;
          color: #111827;
          border-radius: 22px;
          padding: 34px;
          max-width: 1150px;
          margin: 0 auto;
        }

        .reportHeader {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          border-bottom: 3px solid #111827;
          padding-bottom: 22px;
          margin-bottom: 22px;
        }

        .company {
          margin: 0 0 8px;
          color: #6b7280;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .reportHeader h1 {
          font-size: 34px;
          color: #111827;
        }

        .reportHeader p {
          margin: 10px 0 0;
          color: #374151;
          font-weight: 700;
        }

        .reportDate {
          text-align: right;
        }

        .reportDate span {
          display: block;
          color: #6b7280;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .reportDate strong {
          font-size: 20px;
        }

        .projectData {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 22px;
        }

        .projectData div,
        .summaryGrid div,
        .moneyGrid div {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 14px;
        }

        .projectData span,
        .summaryGrid span,
        .moneyGrid span {
          display: block;
          color: #6b7280;
          font-weight: 800;
          margin-bottom: 6px;
          font-size: 13px;
        }

        .projectData strong,
        .summaryGrid strong,
        .moneyGrid strong {
          display: block;
          color: #111827;
          font-size: 17px;
          line-height: 1.35;
        }

        .summaryGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 22px;
        }

        .summaryGrid strong {
          font-size: 25px;
        }

        .section {
          margin-top: 26px;
          page-break-inside: avoid;
        }

        .section h2 {
          margin: 0 0 12px;
          color: #111827;
          border-bottom: 1px solid #d1d5db;
          padding-bottom: 8px;
          font-size: 24px;
        }

        .textBlock {
          white-space: pre-wrap;
          line-height: 1.5;
          margin: 0;
        }

        .moneyGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 14px;
        }

        .bar {
          height: 16px;
          background: #e5e7eb;
          border-radius: 999px;
          overflow: hidden;
        }

        .bar div {
          height: 100%;
          background: #16a34a;
          border-radius: 999px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        th,
        td {
          border: 1px solid #d1d5db;
          padding: 10px;
          text-align: left;
          vertical-align: top;
        }

        th {
          background: #f3f4f6;
          color: #111827;
          font-weight: 900;
        }

        td {
          color: #1f2937;
        }

        .muted {
          color: #6b7280;
          margin: 0;
        }

        .berichtList {
          display: grid;
          gap: 12px;
        }

        .berichtItem {
          border: 1px solid #d1d5db;
          border-radius: 14px;
          padding: 14px;
          background: #f9fafb;
        }

        .berichtTop {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }

        .berichtTop strong {
          font-size: 18px;
        }

        .berichtTop span {
          color: #6b7280;
          font-weight: 800;
        }

        .berichtItem p {
          margin: 8px 0 0;
          line-height: 1.5;
          white-space: pre-wrap;
        }

        .photoGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .photoItem {
          border: 1px solid #d1d5db;
          border-radius: 14px;
          overflow: hidden;
          background: #f9fafb;
          page-break-inside: avoid;
        }

        .photoItem img,
        .noImage {
          width: 100%;
          height: 190px;
          object-fit: cover;
          display: block;
          background: #e5e7eb;
        }

        .noImage {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          font-weight: 900;
        }

        .photoItem div {
          padding: 12px;
        }

        .photoItem strong {
          display: block;
          color: #111827;
          margin-bottom: 4px;
        }

        .photoItem span {
          display: block;
          color: #6b7280;
          font-size: 13px;
          font-weight: 800;
        }

        .photoItem p {
          margin: 8px 0 0;
          color: #374151;
          font-size: 13px;
          line-height: 1.4;
        }

        .signature {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-top: 60px;
          padding-top: 20px;
        }

        .signature div {
          border-top: 2px solid #111827;
          padding-top: 10px;
          min-height: 50px;
        }

        .signature span {
          color: #374151;
          font-weight: 800;
        }

        @media (max-width: 900px) {
          .filters,
          .projectData,
          .summaryGrid,
          .moneyGrid,
          .photoGrid {
            grid-template-columns: 1fr;
          }

          .reportHeader {
            display: block;
          }

          .reportDate {
            text-align: left;
            margin-top: 18px;
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

          .report {
            padding: 18px;
            border-radius: 18px;
          }

          .reportHeader h1 {
            font-size: 28px;
          }

          table {
            font-size: 13px;
          }

          th,
          td {
            padding: 8px;
          }

          .signature {
            grid-template-columns: 1fr;
          }
        }

        @media print {
          body {
            background: white !important;
          }

          .page {
            background: white !important;
            color: #111827 !important;
            padding: 0 !important;
          }

          .noPrint {
            display: none !important;
          }

          .report {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: none !important;
            padding: 0 !important;
          }

          .section {
            page-break-inside: avoid;
          }

          .photosSection {
            page-break-before: always;
          }
        }
      `}</style>
    </main>
  );
}