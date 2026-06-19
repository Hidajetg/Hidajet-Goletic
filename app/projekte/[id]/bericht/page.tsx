"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];
const RADNICI = ["Arnes", "Ramiz", "Abror", "Shohruh", "Harun", "Hido", "Steffi"];

function getTodayLocalDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function ProjektBerichtPage() {
  const params = useParams();
  const router = useRouter();

  const projektId = String(params.id);

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState(getTodayLocalDate());
  const [onlyApproved, setOnlyApproved] = useState(true);

  const [projekt, setProjekt] = useState<any>(null);
  const [positionen, setPositionen] = useState<any[]>([]);
  const [raeume, setRaeume] = useState<any[]>([]);
  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [leistungen, setLeistungen] = useState<any[]>([]);
  const [regie, setRegie] = useState<any[]>([]);
  const [regieWorkers, setRegieWorkers] = useState<any[]>([]);
  const [materialien, setMaterialien] = useState<any[]>([]);
  const [bewegungen, setBewegungen] = useState<any[]>([]);
  const [fotos, setFotos] = useState<any[]>([]);
  const [aufgaben, setAufgaben] = useState<any[]>([]);

  const filteredArbeitszeiten = useMemo(() => {
    return arbeitszeiten.filter(
      (z) =>
        isDateInRange(z.datum) &&
        (!onlyApproved || z.freigabe_status === "Genehmigt")
    );
  }, [arbeitszeiten, dateFrom, dateTo, onlyApproved]);

  const filteredLeistungen = useMemo(() => {
    return leistungen.filter(
      (l) => isDateInRange(l.datum) && (!onlyApproved || l.status === "Genehmigt")
    );
  }, [leistungen, dateFrom, dateTo, onlyApproved]);

  const filteredRegie = useMemo(() => {
    return regie.filter(
      (r) => isDateInRange(r.datum) && (!onlyApproved || r.status === "Genehmigt")
    );
  }, [regie, dateFrom, dateTo, onlyApproved]);

  const filteredRegieWorkers = useMemo(() => {
    const ids = filteredRegie.map((r) => Number(r.id));

    return regieWorkers.filter((w) => ids.includes(Number(w.regie_id)));
  }, [regieWorkers, filteredRegie]);

  const filteredBewegungen = useMemo(() => {
    return bewegungen.filter((b) => isDateInRange(b.datum));
  }, [bewegungen, dateFrom, dateTo]);

  const filteredFotos = useMemo(() => {
    return fotos.filter(
      (f) =>
        isDateInRange(f.datum) &&
        (!onlyApproved || f.freigabe_status === "Genehmigt")
    );
  }, [fotos, dateFrom, dateTo, onlyApproved]);

  const filteredAufgaben = useMemo(() => {
    return aufgaben.filter((a) => {
      const relevantDate =
        isDateInRange(a.datum) ||
        isDateInRange(a.faellig_bis) ||
        isDateInRange(a.erledigt_am);

      if (!relevantDate) return false;

      if (onlyApproved) {
        return a.status !== "Abgelehnt";
      }

      return true;
    });
  }, [aufgaben, dateFrom, dateTo, onlyApproved]);

  const pendingInfo = useMemo(() => {
    const waitingArbeitszeit = arbeitszeiten.filter(
      (z) => isDateInRange(z.datum) && z.freigabe_status !== "Genehmigt"
    ).length;

    const waitingLeistung = leistungen.filter(
      (l) => isDateInRange(l.datum) && l.status !== "Genehmigt"
    ).length;

    const waitingRegie = regie.filter(
      (r) => isDateInRange(r.datum) && r.status !== "Genehmigt"
    ).length;

    const waitingFotos = fotos.filter(
      (f) => isDateInRange(f.datum) && f.freigabe_status !== "Genehmigt"
    ).length;

    const waitingAufgaben = aufgaben.filter(
      (a) =>
        (isDateInRange(a.datum) ||
          isDateInRange(a.faellig_bis) ||
          isDateInRange(a.erledigt_am)) &&
        a.status === "Offen"
    ).length;

    return {
      arbeitszeit: waitingArbeitszeit,
      leistung: waitingLeistung,
      regie: waitingRegie,
      fotos: waitingFotos,
      aufgaben: waitingAufgaben,
      total:
        waitingArbeitszeit +
        waitingLeistung +
        waitingRegie +
        waitingFotos +
        waitingAufgaben,
    };
  }, [arbeitszeiten, leistungen, regie, fotos, aufgaben, dateFrom, dateTo]);

  const bericht = useMemo(() => {
    const lvWert = positionen.reduce(
      (sum, p) => sum + Number(p.positionspreis || 0),
      0
    );

    const sollStunden = positionen.reduce((sum, p) => {
      const menge = Number(p.menge_soll || 0);
      const minuten = Number(p.minuten_pro_einheit || 0);
      return sum + (menge * minuten) / 60;
    }, 0);

    const normalStunden = filteredArbeitszeiten.reduce(
      (sum, z) => sum + Number(z.stunden || 0),
      0
    );

    const regieStunden = filteredRegieWorkers.reduce(
      (sum, r) => sum + Number(r.stunden || 0),
      0
    );

    const effektivStunden = filteredLeistungen.reduce(
      (sum, l) => sum + getEffectiveHours(l),
      0
    );

    const produktivitaet =
      normalStunden > 0 ? (effektivStunden / normalStunden) * 100 : 0;

    const materialVerbrauch = filteredBewegungen
      .filter((b) => b.typ === "Verbrauch")
      .reduce((sum, b) => sum + Number(b.menge || 0), 0);

    const offeneAufgaben = filteredAufgaben.filter(
      (a) => a.status !== "Erledigt"
    ).length;

    const erledigteAufgaben = filteredAufgaben.filter(
      (a) => a.status === "Erledigt"
    ).length;

    return {
      lvWert,
      sollStunden,
      normalStunden,
      regieStunden,
      effektivStunden,
      produktivitaet,
      materialVerbrauch,
      offeneAufgaben,
      erledigteAufgaben,
      gesamtStunden: normalStunden + regieStunden,
      fotos: filteredFotos.length,
      aufgaben: filteredAufgaben.length,
    };
  }, [
    positionen,
    filteredArbeitszeiten,
    filteredLeistungen,
    filteredRegieWorkers,
    filteredBewegungen,
    filteredFotos,
    filteredAufgaben,
  ]);

  const workerRows = useMemo(() => {
    return RADNICI.map((name) => {
      const normal = filteredArbeitszeiten
        .filter((z) => z.worker_name === name)
        .reduce((sum, z) => sum + Number(z.stunden || 0), 0);

      const regieH = filteredRegieWorkers
        .filter((r) => r.worker_name === name)
        .reduce((sum, r) => sum + Number(r.stunden || 0), 0);

      return {
        name,
        normal,
        regie: regieH,
        total: normal + regieH,
      };
    }).filter((r) => r.total > 0);
  }, [filteredArbeitszeiten, filteredRegieWorkers]);

  useEffect(() => {
    const name = localStorage.getItem("worker_name");

    if (!name) {
      router.push("/login");
      return;
    }

    const adminStatus = ADMINI.includes(name);

    if (!adminStatus) {
      router.push("/");
      return;
    }

    setIsAdmin(adminStatus);
    loadData();
  }, [router, projektId]);

  async function loadData() {
    setLoading(true);

    const projektRes = await supabase
      .from("projekte")
      .select("*")
      .eq("id", Number(projektId))
      .single();

    if (projektRes.error) {
      alert("Greška kod učitavanja projekta: " + projektRes.error.message);
      setLoading(false);
      return;
    }

    setProjekt(projektRes.data);

    if (!dateFrom && projektRes.data?.start_date) {
      setDateFrom(projektRes.data.start_date);
    }

    if (!dateTo && projektRes.data?.end_date) {
      setDateTo(projektRes.data.end_date);
    }

    const positionenRes = await supabase
      .from("projekt_lv_positionen")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("position_nr", { ascending: true });

    setPositionen(positionenRes.data || []);

    const raeumeRes = await supabase
      .from("projekt_raeume")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("created_at", { ascending: true });

    setRaeume(raeumeRes.data || []);

    const arbeitszeitRes = await supabase
      .from("projekt_arbeitszeiten")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("datum", { ascending: false })
      .order("start_time", { ascending: true });

    setArbeitszeiten(arbeitszeitRes.data || []);

    const leistungRes = await supabase
      .from("projekt_leistungen")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("datum", { ascending: false });

    setLeistungen(leistungRes.data || []);

    const regieRes = await supabase
      .from("projekt_regie")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("datum", { ascending: false });

    const regieData = regieRes.data || [];
    setRegie(regieData);

    const regieIds = regieData.map((r) => r.id);

    if (regieIds.length > 0) {
      const workersRes = await supabase
        .from("projekt_regie_workers")
        .select("*")
        .in("regie_id", regieIds);

      setRegieWorkers(workersRes.data || []);
    } else {
      setRegieWorkers([]);
    }

    const materialRes = await supabase
      .from("projekt_materialien")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("material_name", { ascending: true });

    setMaterialien(materialRes.data || []);

    const bewegungRes = await supabase
      .from("projekt_material_bewegungen")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("datum", { ascending: false });

    setBewegungen(bewegungRes.data || []);

    const fotosRes = await supabase
      .from("projekt_fotos")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("datum", { ascending: false });

    setFotos(fotosRes.data || []);

    const aufgabenRes = await supabase
      .from("projekt_aufgaben")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("created_at", { ascending: false });

    setAufgaben(aufgabenRes.data || []);

    setLoading(false);
  }

  function isDateInRange(value: string | null) {
    if (!value) return false;

    const d = String(value).slice(0, 10);

    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;

    return true;
  }

  function resetDates() {
    setDateFrom(projekt?.start_date || "");
    setDateTo(projekt?.end_date || getTodayLocalDate());
  }

  function getPosition(id: number | string | null) {
    if (!id) return null;
    return positionen.find((p) => String(p.id) === String(id)) || null;
  }

  function getRaum(id: number | string | null) {
    if (!id) return null;
    return raeume.find((r) => String(r.id) === String(id)) || null;
  }

  function getEffectiveHours(leistung: any) {
    const pos = getPosition(leistung.lv_position_id);
    const minuten = Number(pos?.minuten_pro_einheit || 0);
    const menge = Number(leistung.menge_ist || 0);
    const faktor = Number(leistung.faktor || 1);

    return (menge * faktor * minuten) / 60;
  }

  function getPositionText(id: number | string | null) {
    const pos = getPosition(id);
    if (!pos) return "-";

    return `${pos.position_nr} - ${pos.kurztext}`;
  }

  function getRaumName(id: number | string | null) {
    const raum = getRaum(id);
    if (!raum) return "-";

    return `${raum.ebene ? raum.ebene + " - " : ""}${raum.raum_name}`;
  }

  function getMaterialName(id: number | string | null) {
    const mat = materialien.find((m) => String(m.id) === String(id));
    if (!mat) return "-";

    return mat.material_name;
  }

  function getMaterialEinheit(id: number | string | null) {
    const mat = materialien.find((m) => String(m.id) === String(id));
    if (!mat) return "";

    return mat.einheit || "";
  }

  function getWorkersForRegie(regieId: number) {
    return filteredRegieWorkers.filter((w) => Number(w.regie_id) === Number(regieId));
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    const parts = String(value).slice(0, 10).split("-");
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }

    return value;
  }

  function formatDateTime(value: string | null) {
    if (!value) return "-";

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
      return String(value);
    }

    return d.toLocaleString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatNumber(value: any, digits = 2) {
    const num = Number(value || 0);

    return num.toLocaleString("de-AT", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  function formatEuro(value: any) {
    const num = Number(value || 0);

    return num.toLocaleString("de-AT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function getMaterialRest(mat: any) {
    const entries = bewegungen.filter(
      (b) => Number(b.material_id) === Number(mat.id)
    );

    const zugang = entries
      .filter((b) => b.typ === "Zugang")
      .reduce((sum, b) => sum + Number(b.menge || 0), 0);

    const verbrauch = entries
      .filter((b) => b.typ === "Verbrauch")
      .reduce((sum, b) => sum + Number(b.menge || 0), 0);

    const rueckgabe = entries
      .filter((b) => b.typ === "Rückgabe")
      .reduce((sum, b) => sum + Number(b.menge || 0), 0);

    return Number(mat.menge_plan || 0) + zugang + rueckgabe - verbrauch;
  }

  if (loading) {
    return (
      <main style={screenStyle}>
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <h1 style={titleStyle}>🖨️ Bericht / Druck</h1>
        <p>Wird geladen...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main style={screenStyle}>
        <h1>Kein Zugriff</h1>
      </main>
    );
  }

  return (
    <main style={screenStyle}>
      <style>
        {`
          @media print {
            body {
              background: white !important;
            }

            .no-print {
              display: none !important;
            }

            .print-page {
              background: white !important;
              color: black !important;
              padding: 0 !important;
              max-width: none !important;
              margin: 0 !important;
              border-radius: 0 !important;
            }

            .print-box {
              border: 1px solid #ccc !important;
              background: white !important;
              color: black !important;
              break-inside: avoid;
            }

            .print-table th,
            .print-table td {
              color: black !important;
              border-bottom: 1px solid #ddd !important;
            }

            .print-title {
              color: black !important;
            }

            img {
              break-inside: avoid;
            }
          }
        `}
      </style>

      <div className="no-print" style={topBarStyle}>
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <div style={topButtonWrapStyle}>
          <button onClick={loadData} style={refreshButtonStyle}>
            Aktualisieren
          </button>

          <button onClick={() => window.print()} style={printButtonStyle}>
            🖨️ Drucken / Als PDF speichern
          </button>
        </div>
      </div>

      <section className="no-print" style={filterBoxStyle}>
        <h1 style={titleStyle}>🖨️ Bericht / Druck</h1>

        <div style={filterGridStyle}>
          <div>
            <label style={labelStyle}>Datum von</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Datum bis</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button onClick={resetDates} style={grayButtonStyle}>
            Zeitraum Projekt
          </button>

          <label style={checkboxLineStyle}>
            <input
              type="checkbox"
              checked={onlyApproved}
              onChange={(e) => setOnlyApproved(e.target.checked)}
              style={checkboxStyle}
            />
            Nur genehmigte Einträge rechnen
          </label>
        </div>

        {onlyApproved && pendingInfo.total > 0 && (
          <div style={warningBoxStyle}>
            <strong>Hinweis:</strong> Es gibt noch {pendingInfo.total} nicht
            genehmigte Einträge im gewählten Zeitraum. Diese werden nicht gerechnet.
            <div style={warningSmallStyle}>
              Arbeitszeit: {pendingInfo.arbeitszeit} · Leistung:{" "}
              {pendingInfo.leistung} · Regie: {pendingInfo.regie} · Fotos:{" "}
              {pendingInfo.fotos} · Aufgaben offen: {pendingInfo.aufgaben}
            </div>
          </div>
        )}
      </section>

      <section className="print-page" style={reportStyle}>
        <div style={reportHeaderStyle}>
          <div>
            <h1 className="print-title" style={reportTitleStyle}>
              Projektbericht
            </h1>

            <p style={mutedStyle}>
              Zeitraum: {formatDate(dateFrom)} - {formatDate(dateTo)}
            </p>

            <p style={mutedStyle}>
              Erstellt am: {new Date().toLocaleDateString("de-AT")}
            </p>
          </div>

          <div style={rightHeaderStyle}>
            <strong>{projekt?.project_name || "-"}</strong>
            <br />
            <span>{projekt?.adresse || "-"}</span>
            <br />
            <span>{projekt?.plz_ort || projekt?.ort || "-"}</span>
          </div>
        </div>

        <section className="print-box" style={boxStyle}>
          <h2 style={sectionTitlePrintStyle}>Projekt Informationen</h2>

          <div style={infoGridStyle}>
            <div>
              <span style={labelPrintStyle}>Auftraggeber</span>
              <strong>{projekt?.auftraggeber || "-"}</strong>
            </div>

            <div>
              <span style={labelPrintStyle}>Bauleiter</span>
              <strong>{projekt?.bauleiter || "-"}</strong>
            </div>

            <div>
              <span style={labelPrintStyle}>Adresse</span>
              <strong>{projekt?.adresse || "-"}</strong>
            </div>

            <div>
              <span style={labelPrintStyle}>PLZ / Ort</span>
              <strong>{projekt?.plz_ort || projekt?.ort || "-"}</strong>
            </div>

            <div>
              <span style={labelPrintStyle}>Ausführung</span>
              <strong>
                {formatDate(projekt?.start_date)} - {formatDate(projekt?.end_date)}
              </strong>
            </div>

            <div>
              <span style={labelPrintStyle}>Status</span>
              <strong>{projekt?.status || "-"}</strong>
            </div>
          </div>
        </section>

        <section className="print-box" style={boxStyle}>
          <h2 style={sectionTitlePrintStyle}>Gesamt Übersicht</h2>

          <div style={summaryPrintGridStyle}>
            <div style={summaryPrintCardStyle}>
              <span style={labelPrintStyle}>LV Wert</span>
              <strong>{formatEuro(bericht.lvWert)}</strong>
            </div>

            <div style={summaryPrintCardStyle}>
              <span style={labelPrintStyle}>Soll Stunden</span>
              <strong>{formatNumber(bericht.sollStunden)} h</strong>
            </div>

            <div style={summaryPrintCardStyle}>
              <span style={labelPrintStyle}>Normal Stunden</span>
              <strong>{formatNumber(bericht.normalStunden)} h</strong>
            </div>

            <div style={summaryPrintCardStyle}>
              <span style={labelPrintStyle}>Regie Stunden</span>
              <strong>{formatNumber(bericht.regieStunden)} h</strong>
            </div>

            <div style={summaryPrintCardStyle}>
              <span style={labelPrintStyle}>Gesamt Stunden</span>
              <strong>{formatNumber(bericht.gesamtStunden)} h</strong>
            </div>

            <div style={summaryPrintCardStyle}>
              <span style={labelPrintStyle}>Effektiv Stunden</span>
              <strong>{formatNumber(bericht.effektivStunden)} h</strong>
            </div>

            <div style={summaryPrintCardStyle}>
              <span style={labelPrintStyle}>Produktivität</span>
              <strong>{formatNumber(bericht.produktivitaet, 0)}%</strong>
            </div>

            <div style={summaryPrintCardStyle}>
              <span style={labelPrintStyle}>Fotos</span>
              <strong>{bericht.fotos}</strong>
            </div>

            <div style={summaryPrintCardStyle}>
              <span style={labelPrintStyle}>Aufgaben / Mängel</span>
              <strong>{bericht.aufgaben}</strong>
            </div>
          </div>
        </section>

        <section className="print-box" style={boxStyle}>
          <h2 style={sectionTitlePrintStyle}>Radnik Stunden</h2>

          {workerRows.length === 0 ? (
            <p style={mutedStyle}>Keine Stunden im Zeitraum vorhanden.</p>
          ) : (
            <div style={tableWrapStyle}>
              <table className="print-table" style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Radnik</th>
                    <th style={thRightStyle}>Normal h</th>
                    <th style={thRightStyle}>Regie h</th>
                    <th style={thRightStyle}>Gesamt h</th>
                  </tr>
                </thead>

                <tbody>
                  {workerRows.map((row) => (
                    <tr key={row.name}>
                      <td style={tdStyle}>{row.name}</td>
                      <td style={tdRightStyle}>{formatNumber(row.normal)} h</td>
                      <td style={tdRightStyle}>{formatNumber(row.regie)} h</td>
                      <td style={tdRightStyle}>
                        <strong>{formatNumber(row.total)} h</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="print-box" style={boxStyle}>
          <h2 style={sectionTitlePrintStyle}>Arbeitszeit</h2>

          {filteredArbeitszeiten.length === 0 ? (
            <p style={mutedStyle}>Keine Arbeitszeit im Zeitraum vorhanden.</p>
          ) : (
            <div style={tableWrapStyle}>
              <table className="print-table" style={wideTableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Datum</th>
                    <th style={thStyle}>Radnik</th>
                    <th style={thStyle}>Zeit</th>
                    <th style={thRightStyle}>Stunden</th>
                    <th style={thStyle}>Raum</th>
                    <th style={thStyle}>LV Position</th>
                    <th style={thStyle}>Art</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredArbeitszeiten.map((z) => (
                    <tr key={z.id}>
                      <td style={tdStyle}>{formatDate(z.datum)}</td>
                      <td style={tdStyle}>{z.worker_name || "-"}</td>
                      <td style={tdStyle}>
                        {String(z.start_time || "").slice(0, 5)} -{" "}
                        {String(z.end_time || "").slice(0, 5)}
                      </td>
                      <td style={tdRightStyle}>{formatNumber(z.stunden)} h</td>
                      <td style={tdStyle}>{getRaumName(z.raum_id)}</td>
                      <td style={tdStyle}>{getPositionText(z.lv_position_id)}</td>
                      <td style={tdStyle}>{z.arbeitsart || "-"}</td>
                      <td style={tdStyle}>{z.freigabe_status || "Wartet"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="print-box" style={boxStyle}>
          <h2 style={sectionTitlePrintStyle}>Leistung / Produktivität</h2>

          {filteredLeistungen.length === 0 ? (
            <p style={mutedStyle}>Keine Leistung im Zeitraum vorhanden.</p>
          ) : (
            <div style={tableWrapStyle}>
              <table className="print-table" style={wideTableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Datum</th>
                    <th style={thStyle}>Raum</th>
                    <th style={thStyle}>LV Position</th>
                    <th style={thRightStyle}>Menge</th>
                    <th style={thStyle}>EH</th>
                    <th style={thRightStyle}>Faktor</th>
                    <th style={thRightStyle}>Effektiv h</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLeistungen.map((l) => (
                    <tr key={l.id}>
                      <td style={tdStyle}>{formatDate(l.datum)}</td>
                      <td style={tdStyle}>{getRaumName(l.raum_id)}</td>
                      <td style={tdStyle}>{getPositionText(l.lv_position_id)}</td>
                      <td style={tdRightStyle}>{formatNumber(l.menge_ist)}</td>
                      <td style={tdStyle}>{l.einheit || "-"}</td>
                      <td style={tdRightStyle}>{formatNumber(l.faktor)}</td>
                      <td style={tdRightStyle}>
                        <strong>{formatNumber(getEffectiveHours(l))} h</strong>
                      </td>
                      <td style={tdStyle}>{l.status || "Offen"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="print-box" style={boxStyle}>
          <h2 style={sectionTitlePrintStyle}>Regie</h2>

          {filteredRegie.length === 0 ? (
            <p style={mutedStyle}>Keine Regie im Zeitraum vorhanden.</p>
          ) : (
            <div style={tableWrapStyle}>
              <table className="print-table" style={wideTableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Datum</th>
                    <th style={thStyle}>Zeit</th>
                    <th style={thStyle}>Raum</th>
                    <th style={thRightStyle}>h / Arbeiter</th>
                    <th style={thStyle}>Arbeiter</th>
                    <th style={thStyle}>Beschreibung</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRegie.map((r) => {
                    const workers = getWorkersForRegie(r.id);

                    return (
                      <tr key={r.id}>
                        <td style={tdStyle}>{formatDate(r.datum)}</td>
                        <td style={tdStyle}>
                          {String(r.start_time || "").slice(0, 5)} -{" "}
                          {String(r.end_time || "").slice(0, 5)}
                        </td>
                        <td style={tdStyle}>{getRaumName(r.raum_id)}</td>
                        <td style={tdRightStyle}>
                          {formatNumber(r.stunden_pro_worker)} h
                        </td>
                        <td style={tdStyle}>
                          {workers.map((w) => w.worker_name).join(", ") || "-"}
                        </td>
                        <td style={tdStyle}>{r.beschreibung || "-"}</td>
                        <td style={tdStyle}>{r.status || "Wartet"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="print-box" style={boxStyle}>
          <h2 style={sectionTitlePrintStyle}>Material Bewegungen</h2>

          {filteredBewegungen.length === 0 ? (
            <p style={mutedStyle}>Keine Materialbewegung im Zeitraum vorhanden.</p>
          ) : (
            <div style={tableWrapStyle}>
              <table className="print-table" style={wideTableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Datum</th>
                    <th style={thStyle}>Typ</th>
                    <th style={thStyle}>Material</th>
                    <th style={thRightStyle}>Menge</th>
                    <th style={thStyle}>EH</th>
                    <th style={thStyle}>Raum</th>
                    <th style={thStyle}>LV Position</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBewegungen.map((b) => (
                    <tr key={b.id}>
                      <td style={tdStyle}>{formatDate(b.datum)}</td>
                      <td style={tdStyle}>{b.typ || "-"}</td>
                      <td style={tdStyle}>{getMaterialName(b.material_id)}</td>
                      <td style={tdRightStyle}>{formatNumber(b.menge)}</td>
                      <td style={tdStyle}>{getMaterialEinheit(b.material_id)}</td>
                      <td style={tdStyle}>{getRaumName(b.raum_id)}</td>
                      <td style={tdStyle}>{getPositionText(b.lv_position_id)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="print-box" style={boxStyle}>
          <h2 style={sectionTitlePrintStyle}>Material Rest</h2>

          {materialien.length === 0 ? (
            <p style={mutedStyle}>Kein Material vorhanden.</p>
          ) : (
            <div style={tableWrapStyle}>
              <table className="print-table" style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Material</th>
                    <th style={thStyle}>EH</th>
                    <th style={thRightStyle}>Plan</th>
                    <th style={thRightStyle}>Rest</th>
                  </tr>
                </thead>

                <tbody>
                  {materialien.map((mat) => (
                    <tr key={mat.id}>
                      <td style={tdStyle}>{mat.material_name}</td>
                      <td style={tdStyle}>{mat.einheit || "-"}</td>
                      <td style={tdRightStyle}>{formatNumber(mat.menge_plan)}</td>
                      <td style={tdRightStyle}>
                        <strong>{formatNumber(getMaterialRest(mat))}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="print-box" style={boxStyle}>
          <h2 style={sectionTitlePrintStyle}>Aufgaben / Mängel</h2>

          {filteredAufgaben.length === 0 ? (
            <p style={mutedStyle}>Keine Aufgaben oder Mängel im Zeitraum vorhanden.</p>
          ) : (
            <div style={taskGridStyle}>
              {filteredAufgaben.map((a) => (
                <div key={a.id} style={taskCardStyle}>
                  <div style={taskTopStyle}>
                    <strong>{a.typ || "Aufgabe"}</strong>
                    <span>{a.status || "Offen"}</span>
                  </div>

                  <h3 style={taskTitleStyle}>{a.titel || "-"}</h3>

                  <p style={taskTextStyle}>{a.beschreibung || "-"}</p>

                  <p style={taskMetaStyle}>
                    Zuständig: <strong>{a.assigned_to || "-"}</strong>
                  </p>

                  <p style={taskMetaStyle}>
                    Raum: <strong>{getRaumName(a.raum_id)}</strong>
                  </p>

                  <p style={taskMetaStyle}>
                    Fällig bis: <strong>{formatDate(a.faellig_bis)}</strong>
                  </p>

                  <p style={taskMetaStyle}>
                    Erledigt am: <strong>{formatDate(a.erledigt_am)}</strong>
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="print-box" style={boxStyle}>
          <h2 style={sectionTitlePrintStyle}>Fotos</h2>

          {filteredFotos.length === 0 ? (
            <p style={mutedStyle}>Keine Fotos im Zeitraum vorhanden.</p>
          ) : (
            <div style={photoGridStyle}>
              {filteredFotos.map((foto) => (
                <div key={foto.id} style={photoCardStyle}>
                  {foto.foto_url && (
                    <img
                      src={foto.foto_url}
                      alt={foto.titel || "Foto"}
                      style={photoStyle}
                    />
                  )}

                  <div style={photoBodyStyle}>
                    <strong>{foto.titel || "Foto"}</strong>

                    <p style={taskMetaStyle}>
                      Datum: <strong>{formatDate(foto.datum)}</strong>
                    </p>

                    <p style={taskMetaStyle}>
                      Status: <strong>{foto.freigabe_status || "Wartet"}</strong>
                    </p>

                    <p style={taskMetaStyle}>
                      Raum: <strong>{getRaumName(foto.raum_id)}</strong>
                    </p>

                    <p style={taskMetaStyle}>
                      Erstellt: <strong>{formatDateTime(foto.created_at)}</strong>
                    </p>

                    {foto.beschreibung && (
                      <p style={taskTextStyle}>{foto.beschreibung}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

const screenStyle: any = {
  background: "#000",
  minHeight: "100vh",
  color: "white",
  padding: "20px",
};

const topBarStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "20px",
  flexWrap: "wrap",
};

const topButtonWrapStyle: any = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const backStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
};

const refreshButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px 16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const printButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px 16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const grayButtonStyle: any = {
  background: "#4b5563",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px 16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const titleStyle: any = {
  color: "#f97316",
  fontSize: "38px",
  marginTop: 0,
};

const filterBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "20px",
};

const filterGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
  alignItems: "end",
};

const labelStyle: any = {
  display: "block",
  color: "#ddd",
  fontWeight: "bold",
  marginBottom: "8px",
};

const inputStyle: any = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #333",
  background: "#000",
  color: "white",
  fontSize: "15px",
  boxSizing: "border-box",
};

const checkboxLineStyle: any = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  color: "#ddd",
  fontWeight: "bold",
  background: "#000",
  border: "1px solid #333",
  borderRadius: "12px",
  padding: "12px",
  cursor: "pointer",
};

const checkboxStyle: any = {
  width: "18px",
  height: "18px",
};

const warningBoxStyle: any = {
  background: "#221a00",
  border: "1px solid #ca8a04",
  color: "#fde68a",
  borderRadius: "12px",
  padding: "12px",
  marginTop: "14px",
  lineHeight: "1.5",
};

const warningSmallStyle: any = {
  color: "#facc15",
  marginTop: "6px",
  fontSize: "13px",
};

const reportStyle: any = {
  background: "white",
  color: "black",
  borderRadius: "14px",
  padding: "30px",
  maxWidth: "1200px",
  margin: "0 auto",
};

const reportHeaderStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  borderBottom: "2px solid #111",
  paddingBottom: "18px",
  marginBottom: "20px",
};

const reportTitleStyle: any = {
  margin: 0,
  fontSize: "34px",
  color: "#111",
};

const rightHeaderStyle: any = {
  textAlign: "right",
  fontSize: "15px",
};

const boxStyle: any = {
  border: "1px solid #ddd",
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "18px",
  background: "#fff",
};

const sectionTitlePrintStyle: any = {
  marginTop: 0,
  marginBottom: "12px",
  color: "#111",
  fontSize: "20px",
};

const mutedStyle: any = {
  color: "#555",
  margin: "4px 0",
};

const infoGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
};

const labelPrintStyle: any = {
  display: "block",
  color: "#666",
  fontSize: "12px",
  marginBottom: "4px",
};

const summaryPrintGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "10px",
};

const summaryPrintCardStyle: any = {
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "10px",
};

const tableWrapStyle: any = {
  overflowX: "auto",
};

const tableStyle: any = {
  width: "100%",
  borderCollapse: "collapse",
};

const wideTableStyle: any = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "1100px",
};

const thStyle: any = {
  borderBottom: "1px solid #bbb",
  textAlign: "left",
  padding: "8px",
  fontSize: "13px",
  whiteSpace: "nowrap",
};

const thRightStyle: any = {
  ...thStyle,
  textAlign: "right",
};

const tdStyle: any = {
  borderBottom: "1px solid #eee",
  padding: "8px",
  fontSize: "13px",
  verticalAlign: "top",
};

const tdRightStyle: any = {
  ...tdStyle,
  textAlign: "right",
  whiteSpace: "nowrap",
};

const taskGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "12px",
};

const taskCardStyle: any = {
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "12px",
  background: "#fff",
};

const taskTopStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  color: "#111",
};

const taskTitleStyle: any = {
  color: "#111",
  fontSize: "16px",
  margin: "10px 0 8px 0",
};

const taskTextStyle: any = {
  color: "#333",
  fontSize: "13px",
  lineHeight: "1.4",
};

const taskMetaStyle: any = {
  color: "#555",
  fontSize: "12px",
  margin: "6px 0",
};

const photoGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "14px",
};

const photoCardStyle: any = {
  border: "1px solid #ddd",
  borderRadius: "10px",
  overflow: "hidden",
  background: "#fff",
};

const photoStyle: any = {
  width: "100%",
  height: "180px",
  objectFit: "cover",
  display: "block",
};

const photoBodyStyle: any = {
  padding: "10px",
};