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

export default function ProjektTagesberichtPage() {
  const params = useParams();
  const router = useRouter();

  const projektId = String(params.id);

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [datum, setDatum] = useState(getTodayLocalDate());
  const [onlyApproved, setOnlyApproved] = useState(true);

  const [projekt, setProjekt] = useState<any>(null);
  const [raeume, setRaeume] = useState<any[]>([]);
  const [positionen, setPositionen] = useState<any[]>([]);
  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [leistungen, setLeistungen] = useState<any[]>([]);
  const [regie, setRegie] = useState<any[]>([]);
  const [regieWorkers, setRegieWorkers] = useState<any[]>([]);
  const [materialien, setMaterialien] = useState<any[]>([]);
  const [bewegungen, setBewegungen] = useState<any[]>([]);
  const [fotos, setFotos] = useState<any[]>([]);
  const [aufgaben, setAufgaben] = useState<any[]>([]);

  const pendingInfo = useMemo(() => {
    const waitingArbeitszeit = arbeitszeiten.filter(
      (z) => z.datum === datum && !isArbeitszeitApproved(z)
    ).length;

    const waitingLeistung = leistungen.filter(
      (l) => l.datum === datum && !isLeistungApproved(l)
    ).length;

    const waitingRegie = regie.filter(
      (r) => r.datum === datum && !isRegieApproved(r)
    ).length;

    const waitingFotos = fotos.filter(
      (f) => f.datum === datum && !isFotoApproved(f)
    ).length;

    const waitingAufgaben = aufgaben.filter(
      (a) =>
        (a.datum === datum || a.faellig_bis === datum || a.erledigt_am === datum) &&
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
  }, [arbeitszeiten, leistungen, regie, fotos, aufgaben, datum]);

  const dayArbeitszeiten = useMemo(
    () =>
      arbeitszeiten.filter(
        (z) => z.datum === datum && (!onlyApproved || isArbeitszeitApproved(z))
      ),
    [arbeitszeiten, datum, onlyApproved]
  );

  const dayLeistungen = useMemo(
    () =>
      leistungen.filter(
        (l) => l.datum === datum && (!onlyApproved || isLeistungApproved(l))
      ),
    [leistungen, datum, onlyApproved]
  );

  const dayRegie = useMemo(
    () =>
      regie.filter(
        (r) => r.datum === datum && (!onlyApproved || isRegieApproved(r))
      ),
    [regie, datum, onlyApproved]
  );

  const dayRegieWorkers = useMemo(() => {
    const ids = dayRegie.map((r) => Number(r.id));

    return regieWorkers.filter((w) => ids.includes(Number(w.regie_id)));
  }, [regieWorkers, dayRegie]);

  const dayBewegungen = useMemo(
    () => bewegungen.filter((b) => b.datum === datum),
    [bewegungen, datum]
  );

  const dayFotos = useMemo(
    () =>
      fotos.filter(
        (f) => f.datum === datum && (!onlyApproved || isFotoApproved(f))
      ),
    [fotos, datum, onlyApproved]
  );

  const dayAufgaben = useMemo(
    () =>
      aufgaben.filter((a) => {
        const sameDay =
          a.datum === datum || a.faellig_bis === datum || a.erledigt_am === datum;

        if (!sameDay) return false;

        if (onlyApproved) {
          return a.status !== "Abgelehnt";
        }

        return true;
      }),
    [aufgaben, datum, onlyApproved]
  );

  const summary = useMemo(() => {
    const normalHours = dayArbeitszeiten.reduce(
      (sum, z) => sum + Number(z.stunden || 0),
      0
    );

    const regieHours = dayRegieWorkers.reduce(
      (sum, w) => sum + Number(w.stunden || 0),
      0
    );

    const effectiveHours = dayLeistungen.reduce(
      (sum, l) => sum + getEffectiveHours(l),
      0
    );

    const materialVerbrauch = dayBewegungen
      .filter((b) => b.typ === "Verbrauch")
      .reduce((sum, b) => sum + Number(b.menge || 0), 0);

    const offen = dayAufgaben.filter((a) => a.status !== "Erledigt").length;
    const erledigt = dayAufgaben.filter((a) => a.status === "Erledigt").length;

    const produktivitaet =
      normalHours > 0 ? (effectiveHours / normalHours) * 100 : 0;

    return {
      normalHours,
      regieHours,
      effectiveHours,
      produktivitaet,
      materialVerbrauch,
      fotos: dayFotos.length,
      aufgaben: dayAufgaben.length,
      offen,
      erledigt,
      gesamtHours: normalHours + regieHours,
    };
  }, [
    dayArbeitszeiten,
    dayRegieWorkers,
    dayLeistungen,
    dayBewegungen,
    dayFotos,
    dayAufgaben,
  ]);

  const workerRows = useMemo(() => {
    return RADNICI.map((name) => {
      const normal = dayArbeitszeiten
        .filter((z) => z.worker_name === name)
        .reduce((sum, z) => sum + Number(z.stunden || 0), 0);

      const regieH = dayRegieWorkers
        .filter((w) => w.worker_name === name)
        .reduce((sum, w) => sum + Number(w.stunden || 0), 0);

      return {
        name,
        normal,
        regie: regieH,
        total: normal + regieH,
      };
    }).filter((row) => row.total > 0);
  }, [dayArbeitszeiten, dayRegieWorkers]);

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

    const raeumeRes = await supabase
      .from("projekt_raeume")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("created_at", { ascending: true });

    setRaeume(raeumeRes.data || []);

    const positionenRes = await supabase
      .from("projekt_lv_positionen")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("position_nr", { ascending: true });

    setPositionen(positionenRes.data || []);

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

  function isArbeitszeitApproved(item: any) {
    return item.freigabe_status === "Genehmigt";
  }

  function isLeistungApproved(item: any) {
    return item.status === "Genehmigt";
  }

  function isRegieApproved(item: any) {
    return item.status === "Genehmigt";
  }

  function isFotoApproved(item: any) {
    return item.freigabe_status === "Genehmigt";
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
    return regieWorkers.filter((w) => Number(w.regie_id) === Number(regieId));
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    const parts = String(value).split("-");
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }

    return value;
  }

  function formatNumber(value: any, digits = 2) {
    const num = Number(value || 0);

    return num.toLocaleString("de-AT", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  function getStatusBadge(status: string) {
    if (status === "Genehmigt" || status === "Erledigt") return okBadgeStyle;
    if (status === "Abgelehnt") return dangerBadgeStyle;
    if (status === "Offen") return warningBadgeStyle;

    return grayBadgeStyle;
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <h1 style={titleStyle}>📅 Tagesbericht</h1>
        <p style={loadingStyle}>Wird geladen...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main style={mainStyle}>
        <h1 style={titleStyle}>Kein Zugriff</h1>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <style>
        {`
          @media print {
            body {
              background: white !important;
            }

            .no-print {
              display: none !important;
            }

            main {
              background: white !important;
              color: black !important;
            }

            .print-box {
              background: white !important;
              color: black !important;
              border: 1px solid #ddd !important;
            }

            .print-table th,
            .print-table td {
              color: black !important;
              border-bottom: 1px solid #ddd !important;
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
            🖨️ Drucken / PDF
          </button>
        </div>
      </div>

      <h1 style={titleStyle}>📅 Tagesbericht</h1>

      <p style={descriptionStyle}>
        Projekt: <strong>{projekt?.project_name || "-"}</strong>
      </p>

      <section className="no-print" style={filterBoxStyle}>
        <div style={filterGridStyle}>
          <div>
            <label style={labelStyle}>Datum auswählen</label>
            <input
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              style={inputStyle}
            />
          </div>

          <label style={checkboxLineStyle}>
            <input
              type="checkbox"
              checked={onlyApproved}
              onChange={(e) => setOnlyApproved(e.target.checked)}
              style={checkboxStyle}
            />
            Nur genehmigte Einträge im Tagesbericht rechnen
          </label>
        </div>

        {onlyApproved && pendingInfo.total > 0 && (
          <div style={warningBoxStyle}>
            <strong>Hinweis:</strong> Es gibt noch {pendingInfo.total} nicht
            genehmigte Einträge für diesen Tag. Diese werden nicht in Stunden,
            Leistung, Regie und Fotos gerechnet.
            <div style={warningSmallStyle}>
              Arbeitszeit: {pendingInfo.arbeitszeit} · Leistung:{" "}
              {pendingInfo.leistung} · Regie: {pendingInfo.regie} · Fotos:{" "}
              {pendingInfo.fotos} · Aufgaben: {pendingInfo.aufgaben}
            </div>
          </div>
        )}
      </section>

      <section className="print-box" style={infoBoxStyle}>
        <h2 style={sectionTitleStyle}>Tagesbericht {formatDate(datum)}</h2>

        <div style={infoGridStyle}>
          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Auftraggeber</span>
            <strong>{projekt?.auftraggeber || "-"}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Bauleiter</span>
            <strong>{projekt?.bauleiter || "-"}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Ort</span>
            <strong>{projekt?.ort || "-"}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Status</span>
            <strong>{projekt?.status || "-"}</strong>
          </div>
        </div>
      </section>

      <section style={summaryGridStyle}>
        <div className="print-box" style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Normal Stunden</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.normalHours)} h
          </strong>
        </div>

        <div className="print-box" style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Regie Stunden</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.regieHours)} h
          </strong>
        </div>

        <div className="print-box" style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Gesamt Stunden</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.gesamtHours)} h
          </strong>
        </div>

        <div className="print-box" style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Effektive Stunden</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.effectiveHours)} h
          </strong>
        </div>

        <div className="print-box" style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Produktivität</span>
          <strong
            style={{
              ...summaryValueStyle,
              color:
                summary.produktivitaet >= 100
                  ? "#22c55e"
                  : summary.produktivitaet >= 80
                  ? "#f97316"
                  : "#ef4444",
            }}
          >
            {formatNumber(summary.produktivitaet, 0)}%
          </strong>
        </div>

        <div className="print-box" style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Fotos</span>
          <strong style={summaryValueStyle}>{summary.fotos}</strong>
        </div>

        <div className="print-box" style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Aufgaben</span>
          <strong style={summaryValueStyle}>{summary.aufgaben}</strong>
        </div>
      </section>

      <section className="print-box" style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Radnik Stunden</h2>

        {workerRows.length === 0 ? (
          <p style={emptyStyle}>Keine Stunden an diesem Tag.</p>
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
                    <td style={tdStyle}>
                      <strong>{row.name}</strong>
                    </td>
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

      <section className="print-box" style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Arbeitszeit</h2>

        {dayArbeitszeiten.length === 0 ? (
          <p style={emptyStyle}>Keine genehmigte Arbeitszeit an diesem Tag.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table className="print-table" style={wideTableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Radnik</th>
                  <th style={thStyle}>Zeit</th>
                  <th style={thRightStyle}>Stunden</th>
                  <th style={thStyle}>Raum</th>
                  <th style={thStyle}>LV Position</th>
                  <th style={thStyle}>Art</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Notiz</th>
                </tr>
              </thead>

              <tbody>
                {dayArbeitszeiten.map((z) => (
                  <tr key={z.id}>
                    <td style={tdStyle}>{z.worker_name}</td>
                    <td style={tdStyle}>
                      {String(z.start_time || "").slice(0, 5)} -{" "}
                      {String(z.end_time || "").slice(0, 5)}
                    </td>
                    <td style={tdRightStyle}>{formatNumber(z.stunden)} h</td>
                    <td style={tdStyle}>{getRaumName(z.raum_id)}</td>
                    <td style={tdStyle}>{getPositionText(z.lv_position_id)}</td>
                    <td style={tdStyle}>{z.arbeitsart || "-"}</td>
                    <td style={tdStyle}>{z.freigabe_status || "Wartet"}</td>
                    <td style={tdStyle}>{z.notiz || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="print-box" style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Leistung</h2>

        {dayLeistungen.length === 0 ? (
          <p style={emptyStyle}>Keine genehmigte Leistung an diesem Tag.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table className="print-table" style={wideTableStyle}>
              <thead>
                <tr>
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
                {dayLeistungen.map((l) => (
                  <tr key={l.id}>
                    <td style={tdStyle}>{getRaumName(l.raum_id)}</td>
                    <td style={tdStyle}>{getPositionText(l.lv_position_id)}</td>
                    <td style={tdRightStyle}>{formatNumber(l.menge_ist)}</td>
                    <td style={tdStyle}>{l.einheit || "-"}</td>
                    <td style={tdRightStyle}>{formatNumber(l.faktor)}</td>
                    <td style={tdRightStyle}>
                      <strong>{formatNumber(getEffectiveHours(l))} h</strong>
                    </td>
                    <td style={tdStyle}>{l.status || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="print-box" style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Regie</h2>

        {dayRegie.length === 0 ? (
          <p style={emptyStyle}>Keine genehmigte Regie an diesem Tag.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table className="print-table" style={wideTableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Zeit</th>
                  <th style={thStyle}>Raum</th>
                  <th style={thRightStyle}>h / Arbeiter</th>
                  <th style={thStyle}>Arbeiter</th>
                  <th style={thStyle}>Beschreibung</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>

              <tbody>
                {dayRegie.map((r) => {
                  const workers = getWorkersForRegie(r.id);

                  return (
                    <tr key={r.id}>
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
                      <td style={tdStyle}>{r.status || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="print-box" style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Material Bewegungen</h2>

        {dayBewegungen.length === 0 ? (
          <p style={emptyStyle}>Keine Material Bewegung an diesem Tag.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table className="print-table" style={wideTableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Typ</th>
                  <th style={thStyle}>Material</th>
                  <th style={thRightStyle}>Menge</th>
                  <th style={thStyle}>EH</th>
                  <th style={thStyle}>Raum</th>
                  <th style={thStyle}>LV Position</th>
                  <th style={thStyle}>Notiz</th>
                </tr>
              </thead>

              <tbody>
                {dayBewegungen.map((b) => (
                  <tr key={b.id}>
                    <td style={tdStyle}>{b.typ}</td>
                    <td style={tdStyle}>{getMaterialName(b.material_id)}</td>
                    <td style={tdRightStyle}>{formatNumber(b.menge)}</td>
                    <td style={tdStyle}>{getMaterialEinheit(b.material_id)}</td>
                    <td style={tdStyle}>{getRaumName(b.raum_id)}</td>
                    <td style={tdStyle}>{getPositionText(b.lv_position_id)}</td>
                    <td style={tdStyle}>{b.notiz || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="print-box" style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Aufgaben / Mängel</h2>

        {dayAufgaben.length === 0 ? (
          <p style={emptyStyle}>Keine Aufgaben an diesem Tag.</p>
        ) : (
          <div style={taskGridStyle}>
            {dayAufgaben.map((a) => (
              <div key={a.id} style={taskCardStyle}>
                <div style={taskTopStyle}>
                  <span
                    style={
                      a.typ === "Mangel"
                        ? warningBadgeStyle
                        : a.typ === "Info"
                        ? blueBadgeStyle
                        : okBadgeStyle
                    }
                  >
                    {a.typ}
                  </span>

                  <span style={getStatusBadge(a.status)}>{a.status}</span>
                </div>

                <h3 style={taskTitleStyle}>{a.titel}</h3>

                {a.beschreibung && <p style={taskTextStyle}>{a.beschreibung}</p>}

                <p style={taskMetaStyle}>
                  Zuständig: <strong>{a.assigned_to || "-"}</strong>
                </p>

                <p style={taskMetaStyle}>
                  Raum: <strong>{getRaumName(a.raum_id)}</strong>
                </p>

                <p style={taskMetaStyle}>
                  Fällig: <strong>{formatDate(a.faellig_bis)}</strong>
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="print-box" style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Fotos</h2>

        {dayFotos.length === 0 ? (
          <p style={emptyStyle}>Keine genehmigten Fotos an diesem Tag.</p>
        ) : (
          <div style={photoGridStyle}>
            {dayFotos.map((foto) => (
              <div key={foto.id} style={photoCardStyle}>
                <a href={foto.foto_url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={foto.foto_url}
                    alt={foto.titel || "Foto"}
                    style={photoStyle}
                  />
                </a>

                <div style={photoBodyStyle}>
                  <span style={warningBadgeStyle}>{foto.typ || "Foto"}</span>
                  <h3 style={photoTitleStyle}>{foto.titel || "-"}</h3>

                  <p style={taskMetaStyle}>
                    Status: <strong>{foto.freigabe_status || "Wartet"}</strong>
                  </p>

                  <p style={taskMetaStyle}>
                    Raum: <strong>{getRaumName(foto.raum_id)}</strong>
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
    </main>
  );
}

const mainStyle: any = {
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
  fontSize: "16px",
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

const titleStyle: any = {
  fontSize: "38px",
  color: "#f97316",
  margin: "0 0 10px 0",
};

const descriptionStyle: any = {
  color: "#bbb",
  fontSize: "16px",
  marginBottom: "18px",
};

const loadingStyle: any = {
  color: "#aaa",
  fontSize: "18px",
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
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
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
  maxWidth: "280px",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #333",
  background: "#000",
  color: "white",
  fontSize: "15px",
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

const infoBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "20px",
};

const infoGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};

const infoItemStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "12px",
  padding: "12px",
};

const infoLabelStyle: any = {
  display: "block",
  color: "#aaa",
  fontSize: "13px",
  marginBottom: "5px",
};

const summaryGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
  marginBottom: "20px",
};

const summaryCardStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "14px",
  padding: "14px",
};

const summaryLabelStyle: any = {
  display: "block",
  color: "#aaa",
  fontSize: "13px",
  marginBottom: "6px",
};

const summaryValueStyle: any = {
  color: "#f97316",
  fontSize: "22px",
};

const listBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "22px",
};

const sectionTitleStyle: any = {
  color: "#f97316",
  marginTop: 0,
  marginBottom: "14px",
};

const emptyStyle: any = {
  color: "#aaa",
  fontSize: "16px",
};

const tableWrapStyle: any = {
  overflowX: "auto",
};

const tableStyle: any = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "750px",
};

const wideTableStyle: any = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "1100px",
};

const thStyle: any = {
  borderBottom: "1px solid #333",
  color: "#f97316",
  padding: "10px",
  textAlign: "left",
  fontSize: "13px",
  whiteSpace: "nowrap",
};

const thRightStyle: any = {
  ...thStyle,
  textAlign: "right",
};

const tdStyle: any = {
  borderBottom: "1px solid #222",
  color: "#ddd",
  padding: "10px",
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
  background: "#000",
  border: "1px solid #333",
  borderRadius: "14px",
  padding: "12px",
};

const taskTopStyle: any = {
  display: "flex",
  gap: "8px",
  justifyContent: "space-between",
  flexWrap: "wrap",
};

const taskTitleStyle: any = {
  color: "#f97316",
  fontSize: "17px",
  margin: "12px 0 8px 0",
};

const taskTextStyle: any = {
  color: "#ccc",
  fontSize: "13px",
  lineHeight: "1.4",
};

const taskMetaStyle: any = {
  color: "#aaa",
  fontSize: "13px",
  margin: "7px 0",
};

const photoGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "14px",
};

const photoCardStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "14px",
  overflow: "hidden",
};

const photoStyle: any = {
  width: "100%",
  height: "180px",
  objectFit: "cover",
  display: "block",
};

const photoBodyStyle: any = {
  padding: "12px",
};

const photoTitleStyle: any = {
  color: "#f97316",
  fontSize: "16px",
  margin: "10px 0 6px 0",
};

const okBadgeStyle: any = {
  background: "#16a34a",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const warningBadgeStyle: any = {
  background: "#ca8a04",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const dangerBadgeStyle: any = {
  background: "#dc2626",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const blueBadgeStyle: any = {
  background: "#2563eb",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const grayBadgeStyle: any = {
  background: "#4b5563",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};