"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];
const RADNICI = ["Arnes", "Ramiz", "Abror", "Shohruh", "Harun", "Hido", "Steffi"];

export default function ProjektBerichtPage() {
  const params = useParams();
  const router = useRouter();

  const projektId = String(params.id);

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [projekt, setProjekt] = useState<any>(null);
  const [positionen, setPositionen] = useState<any[]>([]);
  const [raeume, setRaeume] = useState<any[]>([]);
  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [leistungen, setLeistungen] = useState<any[]>([]);
  const [regie, setRegie] = useState<any[]>([]);
  const [regieWorkers, setRegieWorkers] = useState<any[]>([]);
  const [materialien, setMaterialien] = useState<any[]>([]);
  const [bewegungen, setBewegungen] = useState<any[]>([]);

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

    const normalStunden = arbeitszeiten.reduce(
      (sum, z) => sum + Number(z.stunden || 0),
      0
    );

    const regieStunden = regieWorkers.reduce(
      (sum, r) => sum + Number(r.stunden || 0),
      0
    );

    const effektivStunden = leistungen.reduce(
      (sum, l) => sum + getEffectiveHours(l),
      0
    );

    const produktivitaet =
      normalStunden > 0 ? (effektivStunden / normalStunden) * 100 : 0;

    const materialVerbrauch = bewegungen
      .filter((b) => b.typ === "Verbrauch")
      .reduce((sum, b) => sum + Number(b.menge || 0), 0);

    return {
      lvWert,
      sollStunden,
      normalStunden,
      regieStunden,
      effektivStunden,
      produktivitaet,
      materialVerbrauch,
      gesamtStunden: normalStunden + regieStunden,
    };
  }, [positionen, arbeitszeiten, leistungen, regieWorkers, bewegungen]);

  const workerRows = useMemo(() => {
    return RADNICI.map((name) => {
      const normal = arbeitszeiten
        .filter((z) => z.worker_name === name)
        .reduce((sum, z) => sum + Number(z.stunden || 0), 0);

      const regieH = regieWorkers
        .filter((r) => r.worker_name === name)
        .reduce((sum, r) => sum + Number(r.stunden || 0), 0);

      return {
        name,
        normal,
        regie: regieH,
        total: normal + regieH,
      };
    }).filter((r) => r.total > 0);
  }, [arbeitszeiten, regieWorkers]);

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
      .eq("projekt_id", Number(projektId));

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

    setLoading(false);
  }

  function getPosition(id: number | string | null) {
    if (!id) return null;
    return positionen.find((p) => String(p.id) === String(id)) || null;
  }

  function getEffectiveHours(leistung: any) {
    const pos = getPosition(leistung.lv_position_id);
    const minuten = Number(pos?.minuten_pro_einheit || 0);
    const menge = Number(leistung.menge_ist || 0);
    const faktor = Number(leistung.faktor || 1);

    return (menge * faktor * minuten) / 60;
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
            }

            .print-box {
              border: 1px solid #ccc !important;
              background: white !important;
              color: black !important;
            }

            .print-table th,
            .print-table td {
              color: black !important;
              border-bottom: 1px solid #ddd !important;
            }

            .print-title {
              color: black !important;
            }
          }
        `}
      </style>

      <div className="no-print" style={topBarStyle}>
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <button onClick={() => window.print()} style={printButtonStyle}>
          🖨️ Drucken / Als PDF speichern
        </button>
      </div>

      <section className="print-page" style={reportStyle}>
        <div style={reportHeaderStyle}>
          <div>
            <h1 className="print-title" style={reportTitleStyle}>
              Projektbericht
            </h1>
            <p style={mutedStyle}>{new Date().toLocaleDateString("de-AT")}</p>
          </div>

          <div style={rightHeaderStyle}>
            <strong>{projekt?.project_name || "-"}</strong>
            <br />
            <span>{projekt?.ort || "-"}</span>
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
              <span style={labelPrintStyle}>Ausführung</span>
              <strong>
                {formatDate(projekt?.start_date)} - {formatDate(projekt?.end_date)}
              </strong>
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
              <span style={labelPrintStyle}>Effektiv Stunden</span>
              <strong>{formatNumber(bericht.effektivStunden)} h</strong>
            </div>

            <div style={summaryPrintCardStyle}>
              <span style={labelPrintStyle}>Produktivität</span>
              <strong>{formatNumber(bericht.produktivitaet, 0)}%</strong>
            </div>
          </div>
        </section>

        <section className="print-box" style={boxStyle}>
          <h2 style={sectionTitlePrintStyle}>Radnik Stunden</h2>

          {workerRows.length === 0 ? (
            <p style={mutedStyle}>Keine Stunden vorhanden.</p>
          ) : (
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
          )}
        </section>

        <section className="print-box" style={boxStyle}>
          <h2 style={sectionTitlePrintStyle}>LV Positionen</h2>

          {positionen.length === 0 ? (
            <p style={mutedStyle}>Keine LV Positionen vorhanden.</p>
          ) : (
            <table className="print-table" style={wideTableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Pos.</th>
                  <th style={thStyle}>Kurztext</th>
                  <th style={thRightStyle}>Soll Menge</th>
                  <th style={thStyle}>EH</th>
                  <th style={thRightStyle}>Preis</th>
                  <th style={thRightStyle}>Min/EH</th>
                </tr>
              </thead>

              <tbody>
                {positionen.map((pos) => (
                  <tr key={pos.id}>
                    <td style={tdStyle}>{pos.position_nr}</td>
                    <td style={tdStyle}>{pos.kurztext}</td>
                    <td style={tdRightStyle}>{formatNumber(pos.menge_soll)}</td>
                    <td style={tdStyle}>{pos.einheit || "-"}</td>
                    <td style={tdRightStyle}>{formatEuro(pos.positionspreis)}</td>
                    <td style={tdRightStyle}>
                      {formatNumber(pos.minuten_pro_einheit, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="print-box" style={boxStyle}>
          <h2 style={sectionTitlePrintStyle}>Material</h2>

          {materialien.length === 0 ? (
            <p style={mutedStyle}>Kein Material vorhanden.</p>
          ) : (
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

const backStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
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
  color: "#f97316",
  fontSize: "38px",
};

const reportStyle: any = {
  background: "white",
  color: "black",
  borderRadius: "14px",
  padding: "30px",
  maxWidth: "1100px",
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
  margin: 0,
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

const tableStyle: any = {
  width: "100%",
  borderCollapse: "collapse",
};

const wideTableStyle: any = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "900px",
};

const thStyle: any = {
  borderBottom: "1px solid #bbb",
  textAlign: "left",
  padding: "8px",
  fontSize: "13px",
};

const thRightStyle: any = {
  ...thStyle,
  textAlign: "right",
};

const tdStyle: any = {
  borderBottom: "1px solid #eee",
  padding: "8px",
  fontSize: "13px",
};

const tdRightStyle: any = {
  ...tdStyle,
  textAlign: "right",
};