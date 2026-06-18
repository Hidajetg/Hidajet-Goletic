"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];
const RADNICI = ["Arnes", "Ramiz", "Abror", "Shohruh", "Harun", "Hido", "Steffi"];

export default function ProjektAuswertungPage() {
  const params = useParams();
  const router = useRouter();

  const projektId = String(params.id);

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [projekt, setProjekt] = useState<any>(null);
  const [positionen, setPositionen] = useState<any[]>([]);
  const [raeume, setRaeume] = useState<any[]>([]);
  const [aufmass, setAufmass] = useState<any[]>([]);
  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [leistungen, setLeistungen] = useState<any[]>([]);
  const [regie, setRegie] = useState<any[]>([]);
  const [regieWorkers, setRegieWorkers] = useState<any[]>([]);
  const [materialien, setMaterialien] = useState<any[]>([]);
  const [bewegungen, setBewegungen] = useState<any[]>([]);

  const auswertung = useMemo(() => {
    const lvPreis = positionen.reduce(
      (sum, p) => sum + Number(p.positionspreis || 0),
      0
    );

    const lvSollMenge = positionen.reduce(
      (sum, p) => sum + Number(p.menge_soll || 0),
      0
    );

    const lvSollStunden = positionen.reduce((sum, p) => {
      const menge = Number(p.menge_soll || 0);
      const minuten = Number(p.minuten_pro_einheit || 0);
      return sum + (menge * minuten) / 60;
    }, 0);

    const aufmassMenge = aufmass.reduce(
      (sum, a) => sum + Number(a.menge_soll || 0),
      0
    );

    const normalStunden = arbeitszeiten.reduce(
      (sum, z) => sum + Number(z.stunden || 0),
      0
    );

    const regieStunden = regieWorkers.reduce(
      (sum, r) => sum + Number(r.stunden || 0),
      0
    );

    const leistungMenge = leistungen.reduce(
      (sum, l) => sum + Number(l.menge_ist || 0),
      0
    );

    const effektiveStunden = leistungen.reduce((sum, l) => {
      return sum + getEffectiveHours(l);
    }, 0);

    const produktivitaet =
      normalStunden > 0 ? (effektiveStunden / normalStunden) * 100 : 0;

    const materialPlan = materialien.reduce(
      (sum, m) => sum + Number(m.menge_plan || 0),
      0
    );

    const materialVerbrauch = bewegungen
      .filter((b) => b.typ === "Verbrauch")
      .reduce((sum, b) => sum + Number(b.menge || 0), 0);

    return {
      lvPreis,
      lvSollMenge,
      lvSollStunden,
      aufmassMenge,
      normalStunden,
      regieStunden,
      leistungMenge,
      effektiveStunden,
      produktivitaet,
      materialPlan,
      materialVerbrauch,
      gesamtStunden: normalStunden + regieStunden,
    };
  }, [
    positionen,
    aufmass,
    arbeitszeiten,
    leistungen,
    regieWorkers,
    materialien,
    bewegungen,
  ]);

  const workerAuswertung = useMemo(() => {
    return RADNICI.map((name) => {
      const normalHours = arbeitszeiten
        .filter((z) => z.worker_name === name)
        .reduce((sum, z) => sum + Number(z.stunden || 0), 0);

      const regieHours = regieWorkers
        .filter((r) => r.worker_name === name)
        .reduce((sum, r) => sum + Number(r.stunden || 0), 0);

      const effectiveHours = getEffectiveHoursForWorker(name);

      const produktivitaet =
        normalHours > 0 ? (effectiveHours / normalHours) * 100 : 0;

      return {
        name,
        normalHours,
        regieHours,
        effectiveHours,
        produktivitaet,
        totalHours: normalHours + regieHours,
      };
    }).filter((row) => row.totalHours > 0 || row.effectiveHours > 0);
  }, [arbeitszeiten, regieWorkers, leistungen, positionen]);

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

    const aufmassRes = await supabase
      .from("projekt_aufmass")
      .select("*")
      .eq("projekt_id", Number(projektId));

    setAufmass(aufmassRes.data || []);

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

  function getPosition(id: number | string | null) {
    if (!id) return null;
    return positionen.find((p) => String(p.id) === String(id)) || null;
  }

  function getRaum(id: number | string | null) {
    if (!id) return null;
    return raeume.find((r) => String(r.id) === String(id)) || null;
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

  function getEffectiveHours(leistung: any) {
    const pos = getPosition(leistung.lv_position_id);
    const minuten = Number(pos?.minuten_pro_einheit || 0);
    const menge = Number(leistung.menge_ist || 0);
    const faktor = Number(leistung.faktor || 1);

    return (menge * faktor * minuten) / 60;
  }

  function getRelatedArbeitszeiten(leistung: any) {
    return arbeitszeiten.filter((zeit) => {
      const sameDate = zeit.datum === leistung.datum;
      const sameRaum = Number(zeit.raum_id) === Number(leistung.raum_id);

      const samePosition =
        !zeit.lv_position_id ||
        Number(zeit.lv_position_id) === Number(leistung.lv_position_id);

      return sameDate && sameRaum && samePosition;
    });
  }

  function getEffectiveHoursForWorker(workerName: string) {
    let total = 0;

    leistungen.forEach((leistung) => {
      const related = getRelatedArbeitszeiten(leistung);
      const totalRealHours = related.reduce(
        (sum, z) => sum + Number(z.stunden || 0),
        0
      );

      if (totalRealHours <= 0) return;

      const workerHours = related
        .filter((z) => z.worker_name === workerName)
        .reduce((sum, z) => sum + Number(z.stunden || 0), 0);

      if (workerHours <= 0) return;

      const share = workerHours / totalRealHours;
      total += getEffectiveHours(leistung) * share;
    });

    return total;
  }

  function getPositionRows() {
    return positionen.map((pos) => {
      const positionLeistungen = leistungen.filter(
        (l) => Number(l.lv_position_id) === Number(pos.id)
      );

      const istMenge = positionLeistungen.reduce(
        (sum, l) => sum + Number(l.menge_ist || 0),
        0
      );

      const effectiveHours = positionLeistungen.reduce(
        (sum, l) => sum + getEffectiveHours(l),
        0
      );

      const realHours = arbeitszeiten
        .filter((z) => Number(z.lv_position_id) === Number(pos.id))
        .reduce((sum, z) => sum + Number(z.stunden || 0), 0);

      const sollMenge = Number(pos.menge_soll || 0);
      const fertig = sollMenge > 0 ? (istMenge / sollMenge) * 100 : 0;
      const produktivitaet = realHours > 0 ? (effectiveHours / realHours) * 100 : 0;

      return {
        pos,
        istMenge,
        effectiveHours,
        realHours,
        fertig,
        produktivitaet,
      };
    });
  }

  function getRaumRows() {
    return raeume.map((raum) => {
      const roomLeistungen = leistungen.filter(
        (l) => Number(l.raum_id) === Number(raum.id)
      );

      const istMenge = roomLeistungen.reduce(
        (sum, l) => sum + Number(l.menge_ist || 0),
        0
      );

      const effectiveHours = roomLeistungen.reduce(
        (sum, l) => sum + getEffectiveHours(l),
        0
      );

      const realHours = arbeitszeiten
        .filter((z) => Number(z.raum_id) === Number(raum.id))
        .reduce((sum, z) => sum + Number(z.stunden || 0), 0);

      const produktivitaet = realHours > 0 ? (effectiveHours / realHours) * 100 : 0;

      return {
        raum,
        istMenge,
        effectiveHours,
        realHours,
        produktivitaet,
      };
    });
  }

  function getMaterialRows() {
    return materialien.map((mat) => {
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

      const plan = Number(mat.menge_plan || 0);
      const rest = plan + zugang + rueckgabe - verbrauch;
      const niedrig = Number(mat.mindestbestand || 0) > 0 && rest <= Number(mat.mindestbestand || 0);

      return {
        mat,
        plan,
        zugang,
        verbrauch,
        rueckgabe,
        rest,
        niedrig,
      };
    });
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <h1 style={titleStyle}>📊 Auswertung</h1>
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
      <Link href={`/projekte/${projektId}`} style={backStyle}>
        ← Zurück zum Projekt
      </Link>

      <h1 style={titleStyle}>📊 Auswertung</h1>

      <p style={descriptionStyle}>
        Projekt: <strong>{projekt?.project_name || "-"}</strong>
      </p>

      <section style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>LV Wert</span>
          <strong style={summaryValueStyle}>{formatEuro(auswertung.lvPreis)}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Soll Stunden</span>
          <strong style={summaryValueStyle}>
            {formatNumber(auswertung.lvSollStunden)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Normal Stunden</span>
          <strong style={summaryValueStyle}>
            {formatNumber(auswertung.normalStunden)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Regie Stunden</span>
          <strong style={summaryValueStyle}>
            {formatNumber(auswertung.regieStunden)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Effektive Stunden</span>
          <strong style={summaryValueStyle}>
            {formatNumber(auswertung.effektiveStunden)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Produktivität</span>
          <strong
            style={{
              ...summaryValueStyle,
              color:
                auswertung.produktivitaet >= 100
                  ? "#22c55e"
                  : auswertung.produktivitaet >= 80
                  ? "#f97316"
                  : "#ef4444",
            }}
          >
            {formatNumber(auswertung.produktivitaet, 0)}%
          </strong>
        </div>
      </section>

      <section style={infoBoxStyle}>
        <h2 style={sectionTitleStyle}>Projekt Gesamt</h2>

        <div style={infoGridStyle}>
          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>LV Positionen</span>
            <strong>{positionen.length}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Räume</span>
            <strong>{raeume.length}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Aufmaß Einträge</span>
            <strong>{aufmass.length}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Leistung Einträge</span>
            <strong>{leistungen.length}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Material Plan</span>
            <strong>{formatNumber(auswertung.materialPlan)}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Material Verbrauch</span>
            <strong>{formatNumber(auswertung.materialVerbrauch)}</strong>
          </div>
        </div>
      </section>

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Radnik Auswertung</h2>

        {workerAuswertung.length === 0 ? (
          <p style={emptyStyle}>Noch keine Stunden vorhanden.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Radnik</th>
                  <th style={thStyle}>Normal h</th>
                  <th style={thStyle}>Regie h</th>
                  <th style={thStyle}>Gesamt h</th>
                  <th style={thStyle}>Effektiv h</th>
                  <th style={thStyle}>Produktivität</th>
                </tr>
              </thead>

              <tbody>
                {workerAuswertung.map((row) => (
                  <tr key={row.name}>
                    <td style={tdStyle}>
                      <strong>{row.name}</strong>
                    </td>
                    <td style={tdRightStyle}>{formatNumber(row.normalHours)} h</td>
                    <td style={tdRightStyle}>{formatNumber(row.regieHours)} h</td>
                    <td style={tdRightStyle}>
                      <strong>{formatNumber(row.totalHours)} h</strong>
                    </td>
                    <td style={tdRightStyle}>
                      {formatNumber(row.effectiveHours)} h
                    </td>
                    <td style={tdRightStyle}>
                      <span
                        style={
                          row.produktivitaet >= 100
                            ? okBadgeStyle
                            : row.produktivitaet >= 80
                            ? warningBadgeStyle
                            : dangerBadgeStyle
                        }
                      >
                        {formatNumber(row.produktivitaet, 0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>LV Positionen Soll / Ist</h2>

        {positionen.length === 0 ? (
          <p style={emptyStyle}>Noch keine LV Positionen vorhanden.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={wideTableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>LV Position</th>
                  <th style={thStyle}>Soll Menge</th>
                  <th style={thStyle}>Ist Menge</th>
                  <th style={thStyle}>Einheit</th>
                  <th style={thStyle}>Fertig</th>
                  <th style={thStyle}>Real h</th>
                  <th style={thStyle}>Effektiv h</th>
                  <th style={thStyle}>Produktivität</th>
                </tr>
              </thead>

              <tbody>
                {getPositionRows().map((row) => (
                  <tr key={row.pos.id}>
                    <td style={tdStyle}>
                      <strong>{row.pos.position_nr}</strong>
                      <br />
                      <span style={smallTextStyle}>{row.pos.kurztext}</span>
                    </td>
                    <td style={tdRightStyle}>
                      {formatNumber(row.pos.menge_soll)} {row.pos.einheit}
                    </td>
                    <td style={tdRightStyle}>
                      {formatNumber(row.istMenge)} {row.pos.einheit}
                    </td>
                    <td style={tdStyle}>{row.pos.einheit || "-"}</td>
                    <td style={tdRightStyle}>{formatNumber(row.fertig, 0)}%</td>
                    <td style={tdRightStyle}>{formatNumber(row.realHours)} h</td>
                    <td style={tdRightStyle}>
                      {formatNumber(row.effectiveHours)} h
                    </td>
                    <td style={tdRightStyle}>
                      <span
                        style={
                          row.produktivitaet >= 100
                            ? okBadgeStyle
                            : row.produktivitaet >= 80
                            ? warningBadgeStyle
                            : dangerBadgeStyle
                        }
                      >
                        {formatNumber(row.produktivitaet, 0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Räume Auswertung</h2>

        {raeume.length === 0 ? (
          <p style={emptyStyle}>Noch keine Räume vorhanden.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Raum</th>
                  <th style={thStyle}>Ist Menge</th>
                  <th style={thStyle}>Real h</th>
                  <th style={thStyle}>Effektiv h</th>
                  <th style={thStyle}>Produktivität</th>
                </tr>
              </thead>

              <tbody>
                {getRaumRows().map((row) => (
                  <tr key={row.raum.id}>
                    <td style={tdStyle}>
                      <strong>{getRaumName(row.raum.id)}</strong>
                    </td>
                    <td style={tdRightStyle}>{formatNumber(row.istMenge)}</td>
                    <td style={tdRightStyle}>{formatNumber(row.realHours)} h</td>
                    <td style={tdRightStyle}>
                      {formatNumber(row.effectiveHours)} h
                    </td>
                    <td style={tdRightStyle}>
                      <span
                        style={
                          row.produktivitaet >= 100
                            ? okBadgeStyle
                            : row.produktivitaet >= 80
                            ? warningBadgeStyle
                            : dangerBadgeStyle
                        }
                      >
                        {formatNumber(row.produktivitaet, 0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Material Auswertung</h2>

        {materialien.length === 0 ? (
          <p style={emptyStyle}>Noch kein Material vorhanden.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Material</th>
                  <th style={thStyle}>Einheit</th>
                  <th style={thStyle}>Plan</th>
                  <th style={thStyle}>Zugang</th>
                  <th style={thStyle}>Verbrauch</th>
                  <th style={thStyle}>Rückgabe</th>
                  <th style={thStyle}>Rest</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>

              <tbody>
                {getMaterialRows().map((row) => (
                  <tr key={row.mat.id}>
                    <td style={tdStyle}>
                      <strong>{row.mat.material_name}</strong>
                    </td>
                    <td style={tdStyle}>{row.mat.einheit || "-"}</td>
                    <td style={tdRightStyle}>{formatNumber(row.plan)}</td>
                    <td style={tdRightStyle}>{formatNumber(row.zugang)}</td>
                    <td style={tdRightStyle}>{formatNumber(row.verbrauch)}</td>
                    <td style={tdRightStyle}>{formatNumber(row.rueckgabe)}</td>
                    <td style={tdRightStyle}>
                      <strong>{formatNumber(row.rest)}</strong>
                    </td>
                    <td style={tdStyle}>
                      <span style={row.niedrig ? dangerBadgeStyle : okBadgeStyle}>
                        {row.niedrig ? "Niedrig" : "OK"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

const backStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "16px",
};

const titleStyle: any = {
  fontSize: "38px",
  color: "#f97316",
  margin: "20px 0 10px 0",
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

const summaryGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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

const infoBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "22px",
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
  minWidth: "900px",
};

const wideTableStyle: any = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "1150px",
};

const thStyle: any = {
  borderBottom: "1px solid #333",
  color: "#f97316",
  padding: "10px",
  textAlign: "left",
  fontSize: "13px",
  whiteSpace: "nowrap",
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

const smallTextStyle: any = {
  color: "#aaa",
  fontSize: "12px",
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