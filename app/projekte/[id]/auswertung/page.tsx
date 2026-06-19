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

export default function ProjektAuswertungPage() {
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
      const relevant =
        isDateInRange(a.datum) ||
        isDateInRange(a.faellig_bis) ||
        isDateInRange(a.erledigt_am);

      if (!relevant) return false;

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

    return {
      arbeitszeit: waitingArbeitszeit,
      leistung: waitingLeistung,
      regie: waitingRegie,
      fotos: waitingFotos,
      total: waitingArbeitszeit + waitingLeistung + waitingRegie + waitingFotos,
    };
  }, [arbeitszeiten, leistungen, regie, fotos, dateFrom, dateTo]);

  const summary = useMemo(() => {
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

    const restSollStunden = sollStunden - effektivStunden;

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
      restSollStunden,
      gesamtStunden: normalStunden + regieStunden,
      fotos: filteredFotos.length,
      offeneAufgaben,
      erledigteAufgaben,
      aufgaben: filteredAufgaben.length,
    };
  }, [
    positionen,
    filteredArbeitszeiten,
    filteredRegieWorkers,
    filteredLeistungen,
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
    }).filter((row) => row.total > 0);
  }, [filteredArbeitszeiten, filteredRegieWorkers]);

  const dailyRows = useMemo(() => {
    const map: any = {};

    filteredArbeitszeiten.forEach((z) => {
      const datum = z.datum || "-";

      if (!map[datum]) {
        map[datum] = {
          datum,
          normal: 0,
          regie: 0,
          leistung: 0,
        };
      }

      map[datum].normal += Number(z.stunden || 0);
    });

    filteredRegie.forEach((r) => {
      const datum = r.datum || "-";

      if (!map[datum]) {
        map[datum] = {
          datum,
          normal: 0,
          regie: 0,
          leistung: 0,
        };
      }

      const workers = filteredRegieWorkers.filter(
        (w) => Number(w.regie_id) === Number(r.id)
      );

      map[datum].regie += workers.reduce(
        (sum, w) => sum + Number(w.stunden || 0),
        0
      );
    });

    filteredLeistungen.forEach((l) => {
      const datum = l.datum || "-";

      if (!map[datum]) {
        map[datum] = {
          datum,
          normal: 0,
          regie: 0,
          leistung: 0,
        };
      }

      map[datum].leistung += getEffectiveHours(l);
    });

    return Object.values(map).sort((a: any, b: any) =>
      String(b.datum).localeCompare(String(a.datum))
    );
  }, [filteredArbeitszeiten, filteredRegie, filteredRegieWorkers, filteredLeistungen]);

  const positionRows = useMemo(() => {
    return positionen.map((pos) => {
      const mengeIst = filteredLeistungen
        .filter((l) => Number(l.lv_position_id) === Number(pos.id))
        .reduce((sum, l) => sum + Number(l.menge_ist || 0), 0);

      const mengeSoll = Number(pos.menge_soll || 0);
      const prozent = mengeSoll > 0 ? (mengeIst / mengeSoll) * 100 : 0;

      const effektiv = filteredLeistungen
        .filter((l) => Number(l.lv_position_id) === Number(pos.id))
        .reduce((sum, l) => sum + getEffectiveHours(l), 0);

      return {
        id: pos.id,
        position_nr: pos.position_nr,
        kurztext: pos.kurztext,
        einheit: pos.einheit || "",
        mengeSoll,
        mengeIst,
        prozent,
        effektiv,
      };
    });
  }, [positionen, filteredLeistungen]);

  const roomRows = useMemo(() => {
    return raeume
      .map((raum) => {
        const normal = filteredArbeitszeiten
          .filter((z) => Number(z.raum_id) === Number(raum.id))
          .reduce((sum, z) => sum + Number(z.stunden || 0), 0);

        const leistungH = filteredLeistungen
          .filter((l) => Number(l.raum_id) === Number(raum.id))
          .reduce((sum, l) => sum + getEffectiveHours(l), 0);

        const fotosCount = filteredFotos.filter(
          (f) => Number(f.raum_id) === Number(raum.id)
        ).length;

        return {
          id: raum.id,
          name: getRaumName(raum.id),
          normal,
          leistungH,
          fotosCount,
        };
      })
      .filter((row) => row.normal > 0 || row.leistungH > 0 || row.fotosCount > 0);
  }, [raeume, filteredArbeitszeiten, filteredLeistungen, filteredFotos]);

  const materialRows = useMemo(() => {
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

      const rest = Number(mat.menge_plan || 0) + zugang + rueckgabe - verbrauch;

      return {
        id: mat.id,
        name: mat.material_name,
        einheit: mat.einheit || "",
        plan: Number(mat.menge_plan || 0),
        zugang,
        verbrauch,
        rueckgabe,
        rest,
      };
    });
  }, [materialien, bewegungen]);

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
      .order("datum", { ascending: false });

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

  function getRaumName(id: number | string | null) {
    const raum = getRaum(id);
    if (!raum) return "-";

    return `${raum.ebene ? raum.ebene + " - " : ""}${raum.raum_name}`;
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    const parts = String(value).slice(0, 10).split("-");
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

  function getPercent(value: number, maxValue: number) {
    if (!maxValue || maxValue <= 0) return 0;

    const percent = (value / maxValue) * 100;
    return Math.max(4, Math.min(100, percent));
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

  const maxWorkerHours = Math.max(...workerRows.map((r) => r.total), 1);
  const maxDailyHours = Math.max(
    ...dailyRows.map((r: any) => Number(r.normal || 0) + Number(r.regie || 0)),
    1
  );

  return (
    <main style={mainStyle}>
      <div style={topBarStyle}>
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <div style={topButtonWrapStyle}>
          <button onClick={loadData} style={refreshButtonStyle}>
            Aktualisieren
          </button>

          <Link href={`/projekte/${projektId}/bericht`} style={printLinkStyle}>
            🖨️ Bericht / Druck
          </Link>
        </div>
      </div>

      <h1 style={titleStyle}>📊 Auswertung</h1>

      <p style={descriptionStyle}>
        Projekt: <strong>{projekt?.project_name || "-"}</strong>
      </p>

      <section style={filterBoxStyle}>
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
            <strong>Hinweis:</strong> {pendingInfo.total} Einträge im Zeitraum sind
            noch nicht genehmigt und werden nicht gerechnet.
            <div style={warningSmallStyle}>
              Arbeitszeit: {pendingInfo.arbeitszeit} · Leistung:{" "}
              {pendingInfo.leistung} · Regie: {pendingInfo.regie} · Fotos:{" "}
              {pendingInfo.fotos}
            </div>
          </div>
        )}
      </section>

      <section style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>LV Wert</span>
          <strong style={summaryValueStyle}>{formatEuro(summary.lvWert)}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Soll Stunden</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.sollStunden)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Normal Stunden</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.normalStunden)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Regie Stunden</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.regieStunden)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Gesamt Stunden</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.gesamtStunden)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Effektiv Stunden</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.effektivStunden)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
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

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Rest Soll</span>
          <strong
            style={{
              ...summaryValueStyle,
              color: summary.restSollStunden <= 0 ? "#22c55e" : "#f97316",
            }}
          >
            {formatNumber(summary.restSollStunden)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Fotos</span>
          <strong style={summaryValueStyle}>{summary.fotos}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Offene Aufgaben</span>
          <strong style={summaryValueStyle}>{summary.offeneAufgaben}</strong>
        </div>
      </section>

      <section style={gridTwoStyle}>
        <div style={boxStyle}>
          <h2 style={sectionTitleStyle}>Stunden po radniku</h2>

          {workerRows.length === 0 ? (
            <p style={emptyStyle}>Nema sati u izabranom periodu.</p>
          ) : (
            <div style={barListStyle}>
              {workerRows.map((row) => (
                <div key={row.name} style={barRowStyle}>
                  <div style={barTopStyle}>
                    <strong>{row.name}</strong>
                    <span>
                      {formatNumber(row.total)} h · Normal {formatNumber(row.normal)} h
                      · Regie {formatNumber(row.regie)} h
                    </span>
                  </div>

                  <div style={barTrackStyle}>
                    <div
                      style={{
                        ...barFillStyle,
                        width: `${getPercent(row.total, maxWorkerHours)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={boxStyle}>
          <h2 style={sectionTitleStyle}>Stunden po danu</h2>

          {dailyRows.length === 0 ? (
            <p style={emptyStyle}>Nema unosa po danima.</p>
          ) : (
            <div style={barListStyle}>
              {dailyRows.map((row: any) => {
                const total = Number(row.normal || 0) + Number(row.regie || 0);

                return (
                  <div key={row.datum} style={barRowStyle}>
                    <div style={barTopStyle}>
                      <strong>{formatDate(row.datum)}</strong>
                      <span>
                        {formatNumber(total)} h · Leistung{" "}
                        {formatNumber(row.leistung)} h
                      </span>
                    </div>

                    <div style={barTrackStyle}>
                      <div
                        style={{
                          ...barFillStyle,
                          width: `${getPercent(total, maxDailyHours)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section style={boxStyle}>
        <h2 style={sectionTitleStyle}>LV Positionen Soll / Ist</h2>

        {positionRows.length === 0 ? (
          <p style={emptyStyle}>Nema LV pozicija.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Pos.</th>
                  <th style={thStyle}>Kurztext</th>
                  <th style={thRightStyle}>Soll</th>
                  <th style={thRightStyle}>Ist</th>
                  <th style={thStyle}>EH</th>
                  <th style={thRightStyle}>%</th>
                  <th style={thRightStyle}>Effektiv h</th>
                </tr>
              </thead>

              <tbody>
                {positionRows.map((row) => (
                  <tr key={row.id}>
                    <td style={tdStyle}>{row.position_nr}</td>
                    <td style={tdStyle}>{row.kurztext}</td>
                    <td style={tdRightStyle}>{formatNumber(row.mengeSoll)}</td>
                    <td style={tdRightStyle}>{formatNumber(row.mengeIst)}</td>
                    <td style={tdStyle}>{row.einheit || "-"}</td>
                    <td style={tdRightStyle}>
                      <span
                        style={
                          row.prozent >= 100
                            ? okBadgeStyle
                            : row.prozent >= 50
                            ? warningBadgeStyle
                            : dangerBadgeStyle
                        }
                      >
                        {formatNumber(row.prozent, 0)}%
                      </span>
                    </td>
                    <td style={tdRightStyle}>
                      <strong>{formatNumber(row.effektiv)} h</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={gridTwoStyle}>
        <div style={boxStyle}>
          <h2 style={sectionTitleStyle}>Auswertung po prostoriji</h2>

          {roomRows.length === 0 ? (
            <p style={emptyStyle}>Nema podataka po prostorijama.</p>
          ) : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Raum</th>
                    <th style={thRightStyle}>Normal h</th>
                    <th style={thRightStyle}>Leistung h</th>
                    <th style={thRightStyle}>Fotos</th>
                  </tr>
                </thead>

                <tbody>
                  {roomRows.map((row) => (
                    <tr key={row.id}>
                      <td style={tdStyle}>{row.name}</td>
                      <td style={tdRightStyle}>{formatNumber(row.normal)} h</td>
                      <td style={tdRightStyle}>{formatNumber(row.leistungH)} h</td>
                      <td style={tdRightStyle}>{row.fotosCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={boxStyle}>
          <h2 style={sectionTitleStyle}>Material Rest</h2>

          {materialRows.length === 0 ? (
            <p style={emptyStyle}>Nema materijala.</p>
          ) : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Material</th>
                    <th style={thRightStyle}>Plan</th>
                    <th style={thRightStyle}>Verbrauch</th>
                    <th style={thRightStyle}>Rest</th>
                    <th style={thStyle}>EH</th>
                  </tr>
                </thead>

                <tbody>
                  {materialRows.map((row) => (
                    <tr key={row.id}>
                      <td style={tdStyle}>{row.name}</td>
                      <td style={tdRightStyle}>{formatNumber(row.plan)}</td>
                      <td style={tdRightStyle}>{formatNumber(row.verbrauch)}</td>
                      <td style={tdRightStyle}>
                        <strong>{formatNumber(row.rest)}</strong>
                      </td>
                      <td style={tdStyle}>{row.einheit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section style={boxStyle}>
        <h2 style={sectionTitleStyle}>Status Kontrolle</h2>

        <div style={statusGridStyle}>
          <div style={statusCardStyle}>
            <span style={summaryLabelStyle}>Arbeitszeit unbestätigt</span>
            <strong style={summaryValueStyle}>{pendingInfo.arbeitszeit}</strong>
          </div>

          <div style={statusCardStyle}>
            <span style={summaryLabelStyle}>Leistung unbestätigt</span>
            <strong style={summaryValueStyle}>{pendingInfo.leistung}</strong>
          </div>

          <div style={statusCardStyle}>
            <span style={summaryLabelStyle}>Regie unbestätigt</span>
            <strong style={summaryValueStyle}>{pendingInfo.regie}</strong>
          </div>

          <div style={statusCardStyle}>
            <span style={summaryLabelStyle}>Fotos unbestätigt</span>
            <strong style={summaryValueStyle}>{pendingInfo.fotos}</strong>
          </div>
        </div>

        <div style={linkRowStyle}>
          <Link href={`/projekte/${projektId}/freigabe`} style={blueLinkStyle}>
            🟢 Zur Freigabe / Kontrolle
          </Link>

          <Link href={`/projekte/${projektId}/tagesbericht`} style={orangeLinkStyle}>
            📅 Tagesbericht öffnen
          </Link>
        </div>
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

const printLinkStyle: any = {
  background: "#16a34a",
  color: "white",
  borderRadius: "12px",
  padding: "12px 16px",
  fontWeight: "bold",
  textDecoration: "none",
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

const grayButtonStyle: any = {
  background: "#4b5563",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px 16px",
  fontWeight: "bold",
  cursor: "pointer",
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

const summaryGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
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

const gridTwoStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "14px",
  marginBottom: "20px",
};

const boxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "20px",
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

const barListStyle: any = {
  display: "grid",
  gap: "12px",
};

const barRowStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "12px",
  padding: "12px",
};

const barTopStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
  color: "#ddd",
  fontSize: "13px",
  marginBottom: "8px",
};

const barTrackStyle: any = {
  width: "100%",
  height: "12px",
  background: "#222",
  borderRadius: "999px",
  overflow: "hidden",
};

const barFillStyle: any = {
  height: "100%",
  background: "#f97316",
  borderRadius: "999px",
};

const tableWrapStyle: any = {
  overflowX: "auto",
};

const tableStyle: any = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "760px",
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

const statusGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};

const statusCardStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "12px",
  padding: "12px",
};

const linkRowStyle: any = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "16px",
};

const blueLinkStyle: any = {
  background: "#2563eb",
  color: "white",
  borderRadius: "12px",
  padding: "12px 16px",
  fontWeight: "bold",
  textDecoration: "none",
};

const orangeLinkStyle: any = {
  background: "#f97316",
  color: "white",
  borderRadius: "12px",
  padding: "12px 16px",
  fontWeight: "bold",
  textDecoration: "none",
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