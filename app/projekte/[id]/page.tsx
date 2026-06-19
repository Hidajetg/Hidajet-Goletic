"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];

export default function ProjektDetailPage() {
  const params = useParams();
  const router = useRouter();

  const projektId = String(params.id);

  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [projekt, setProjekt] = useState<any>(null);
  const [raeume, setRaeume] = useState<any[]>([]);
  const [positionen, setPositionen] = useState<any[]>([]);
  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [leistungen, setLeistungen] = useState<any[]>([]);
  const [regie, setRegie] = useState<any[]>([]);
  const [fotos, setFotos] = useState<any[]>([]);
  const [aufgaben, setAufgaben] = useState<any[]>([]);
  const [materialien, setMaterialien] = useState<any[]>([]);
  const [materialBewegungen, setMaterialBewegungen] = useState<any[]>([]);

  const summary = useMemo(() => {
    const arbeitszeitGenehmigt = arbeitszeiten
      .filter((x) => normalizeFreigabe(x.freigabe_status) === "Genehmigt")
      .reduce((sum, x) => sum + Number(x.stunden || 0), 0);

    const arbeitszeitWartet = arbeitszeiten
      .filter((x) => normalizeFreigabe(x.freigabe_status) === "Wartet")
      .reduce((sum, x) => sum + Number(x.stunden || 0), 0);

    const arbeitszeitGesamt = arbeitszeiten.reduce(
      (sum, x) => sum + Number(x.stunden || 0),
      0
    );

    const regieGenehmigt = regie
      .filter((x) => normalizeStatus(x.status) === "Genehmigt")
      .reduce((sum, x) => sum + Number(x.stunden_pro_worker || x.stunden || 0), 0);

    const regieWartet = regie
      .filter((x) => normalizeStatus(x.status) === "Wartet")
      .reduce((sum, x) => sum + Number(x.stunden_pro_worker || x.stunden || 0), 0);

    const leistungGenehmigt = leistungen.filter(
      (x) => normalizeStatus(x.status) === "Genehmigt"
    ).length;

    const leistungWartet = leistungen.filter(
      (x) => normalizeStatus(x.status) === "Wartet"
    ).length;

    const fotosWartet = fotos.filter(
      (x) => normalizeFreigabe(x.freigabe_status) === "Wartet"
    ).length;

    const aufgabenOffen = aufgaben.filter((x) => {
      const status = String(x.status || "Offen");
      return status !== "Erledigt" && status !== "Abgelehnt";
    }).length;

    const wartendeFreigabe =
      arbeitszeiten.filter((x) => normalizeFreigabe(x.freigabe_status) === "Wartet")
        .length +
      leistungen.filter((x) => normalizeStatus(x.status) === "Wartet").length +
      regie.filter((x) => normalizeStatus(x.status) === "Wartet").length +
      fotos.filter((x) => normalizeFreigabe(x.freigabe_status) === "Wartet").length;

    const lvWert = positionen.reduce((sum, p) => {
      return sum + Number(p.menge_soll || 0) * Number(p.positionspreis || 0);
    }, 0);

    const sollStunden = positionen.reduce((sum, p) => {
      return (
        sum +
        (Number(p.menge_soll || 0) * Number(p.minuten_pro_einheit || 0)) / 60
      );
    }, 0);

    return {
      raeume: raeume.length,
      positionen: positionen.length,
      positionenAktiv: positionen.filter((p) => p.aktiv !== false).length,
      arbeitszeitGesamt,
      arbeitszeitGenehmigt,
      arbeitszeitWartet,
      regieGenehmigt,
      regieWartet,
      leistungen: leistungen.length,
      leistungGenehmigt,
      leistungWartet,
      fotos: fotos.length,
      fotosWartet,
      aufgaben: aufgaben.length,
      aufgabenOffen,
      materialien: materialien.length,
      materialBewegungen: materialBewegungen.length,
      wartendeFreigabe,
      lvWert,
      sollStunden,
    };
  }, [
    raeume,
    positionen,
    arbeitszeiten,
    leistungen,
    regie,
    fotos,
    aufgaben,
    materialien,
    materialBewegungen,
  ]);

  const moduleCards = useMemo(() => {
    return [
      {
        href: `/projekte/${projektId}/raeume`,
        icon: "🏠",
        title: "Räume",
        text: "Prostorije / Räume",
        value: summary.raeume,
        color: "#7c3aed",
      },
      {
        href: `/projekte/${projektId}/positionen`,
        icon: "📋",
        title: "LV Positionen",
        text: "Leistungsverzeichnis",
        value: summary.positionenAktiv,
        color: "#2563eb",
      },
      {
        href: `/projekte/${projektId}/arbeitszeit`,
        icon: "⏱️",
        title: "Arbeitszeit",
        text: "Sati radnika",
        value: `${formatNumber(summary.arbeitszeitGesamt)} h`,
        color: "#f97316",
      },
      {
        href: `/projekte/${projektId}/leistung`,
        icon: "📈",
        title: "Leistung",
        text: "Učinak / Menge Ist",
        value: summary.leistungen,
        color: "#16a34a",
      },
      {
        href: `/projekte/${projektId}/material`,
        icon: "🧱",
        title: "Material",
        text: "Materialverbrauch",
        value: summary.materialBewegungen,
        color: "#ca8a04",
      },
      {
        href: `/projekte/${projektId}/regie`,
        icon: "🧾",
        title: "Regie",
        text: "Regiestunden",
        value: `${formatNumber(summary.regieGenehmigt + summary.regieWartet)} h`,
        color: "#0ea5e9",
      },
      {
        href: `/projekte/${projektId}/fotos`,
        icon: "📸",
        title: "Fotos",
        text: "Fotodokumentation",
        value: summary.fotos,
        color: "#db2777",
      },
      {
        href: `/projekte/${projektId}/aufgaben`,
        icon: "✅",
        title: "Aufgaben",
        text: "Aufgaben / Mängel",
        value: summary.aufgabenOffen,
        color: "#dc2626",
      },
      {
        href: `/projekte/${projektId}/freigabe`,
        icon: "🔍",
        title: "Freigabe",
        text: "Kontrolle / Genehmigung",
        value: summary.wartendeFreigabe,
        color: "#facc15",
      },
      {
        href: `/projekte/${projektId}/tagesbericht`,
        icon: "📅",
        title: "Tagesbericht",
        text: "Dnevni izvještaj",
        value: "PDF",
        color: "#22c55e",
      },
      {
        href: `/projekte/${projektId}/auswertung`,
        icon: "📊",
        title: "Auswertung",
        text: "Analiza projekta",
        value: "Analyse",
        color: "#a855f7",
      },
      {
        href: `/projekte/${projektId}/bericht`,
        icon: "🖨️",
        title: "Bericht",
        text: "Druck / Abschluss",
        value: "Druck",
        color: "#64748b",
      },
      {
        href: `/projekte/${projektId}/einstellungen`,
        icon: "⚙️",
        title: "Einstellungen",
        text: "Projektdaten",
        value: "Edit",
        color: "#4b5563",
      },
      {
        href: `/projekte/${projektId}/radnik`,
        icon: "📱",
        title: "Radnik App",
        text: "Link za telefone",
        value: "Mobile",
        color: "#14b8a6",
      },
      {
        href: `/projekte/${projektId}/import`,
        icon: "📥",
        title: "Import",
        text: "LV Import",
        value: "ONLV",
        color: "#1d4ed8",
      },
    ];
  }, [projektId, summary]);

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

    setWorkerName(name);
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
      setProjekt(null);
      setLoading(false);
      return;
    }

    setProjekt(projektRes.data);

    const raeumeRes = await supabase
      .from("projekt_raeume")
      .select("*")
      .eq("projekt_id", Number(projektId));

    setRaeume(raeumeRes.data || []);

    const positionenRes = await supabase
      .from("projekt_lv_positionen")
      .select("*")
      .eq("projekt_id", Number(projektId));

    setPositionen(positionenRes.data || []);

    const arbeitszeitRes = await supabase
      .from("projekt_arbeitszeiten")
      .select("*")
      .eq("projekt_id", Number(projektId));

    setArbeitszeiten(arbeitszeitRes.data || []);

    const leistungRes = await supabase
      .from("projekt_leistungen")
      .select("*")
      .eq("projekt_id", Number(projektId));

    setLeistungen(leistungRes.data || []);

    const regieRes = await supabase
      .from("projekt_regie")
      .select("*")
      .eq("projekt_id", Number(projektId));

    setRegie(regieRes.data || []);

    const fotosRes = await supabase
      .from("projekt_fotos")
      .select("*")
      .eq("projekt_id", Number(projektId));

    setFotos(fotosRes.data || []);

    const aufgabenRes = await supabase
      .from("projekt_aufgaben")
      .select("*")
      .eq("projekt_id", Number(projektId));

    setAufgaben(aufgabenRes.data || []);

    const materialienRes = await supabase
      .from("projekt_materialien")
      .select("*")
      .eq("projekt_id", Number(projektId));

    setMaterialien(materialienRes.data || []);

    const materialBewegungRes = await supabase
      .from("projekt_material_bewegungen")
      .select("*")
      .eq("projekt_id", Number(projektId));

    setMaterialBewegungen(materialBewegungRes.data || []);

    setLoading(false);
  }

  function normalizeStatus(value: string | null) {
    if (value === "Genehmigt") return "Genehmigt";
    if (value === "Abgelehnt") return "Abgelehnt";
    return "Wartet";
  }

  function normalizeFreigabe(value: string | null) {
    if (value === "Genehmigt") return "Genehmigt";
    if (value === "Abgelehnt") return "Abgelehnt";
    return "Wartet";
  }

  function formatNumber(value: any, digits = 2) {
    const num = Number(value || 0);

    return num.toLocaleString("de-AT", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  function formatMoney(value: any) {
    const num = Number(value || 0);

    return num.toLocaleString("de-AT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    const parts = String(value).slice(0, 10).split("-");

    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }

    return value;
  }

  function makeMapsLink() {
    const google = String(projekt?.google_location || "").trim();

    if (google.startsWith("http://") || google.startsWith("https://")) {
      return google;
    }

    if (google) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        google
      )}`;
    }

    const address = `${projekt?.adresse || ""} ${
      projekt?.ort || projekt?.plz_ort || ""
    }`.trim();

    if (!address) return "";

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address
    )}`;
  }

  function getStatusStyle(status: string) {
    if (status === "Aktiv") return okBadgeStyle;
    if (status === "Pausiert") return warningBadgeStyle;
    if (status === "Abgeschlossen") return blueBadgeStyle;
    if (status === "Archiviert") return grayBadgeStyle;
    if (status === "Geplant") return purpleBadgeStyle;

    return grayBadgeStyle;
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <Link href="/projekte" style={backStyle}>
          ← Zurück zu Projekte
        </Link>

        <h1 style={titleStyle}>📂 Projekt Dashboard</h1>
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

  if (!projekt) {
    return (
      <main style={mainStyle}>
        <Link href="/projekte" style={backStyle}>
          ← Zurück zu Projekte
        </Link>

        <h1 style={titleStyle}>Projekt nicht gefunden</h1>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <div style={topBarStyle}>
        <Link href="/projekte" style={backStyle}>
          ← Zurück zu Projekte
        </Link>

        <div style={topButtonWrapStyle}>
          <button onClick={loadData} style={refreshButtonStyle}>
            Aktualisieren
          </button>

          <Link href={`/projekte/${projektId}/einstellungen`} style={settingsButtonStyle}>
            Einstellungen
          </Link>
        </div>
      </div>

      <section style={heroStyle}>
        <div>
          <div style={heroTopLineStyle}>
            <span style={getStatusStyle(projekt.status || "Aktiv")}>
              {projekt.status || "Aktiv"}
            </span>

            {summary.wartendeFreigabe > 0 && (
              <span style={dangerBadgeStyle}>
                {summary.wartendeFreigabe} wartet auf Freigabe
              </span>
            )}
          </div>

          <h1 style={titleStyle}>📂 {projekt.project_name || "Projekt"}</h1>

          <p style={descriptionStyle}>
            Admin: <strong>{workerName}</strong> · Projekt ID:{" "}
            <strong>{projektId}</strong>
          </p>
        </div>

        <div style={heroActionGridStyle}>
          <Link href={`/projekte/${projektId}/freigabe`} style={heroActionStyle}>
            🔍 Freigabe
          </Link>

          <Link href={`/projekte/${projektId}/radnik`} style={heroActionStyle}>
            📱 Radnik App
          </Link>

          <Link href={`/projekte/${projektId}/tagesbericht`} style={heroActionStyle}>
            📅 Tagesbericht
          </Link>

          <Link href={`/projekte/${projektId}/bericht`} style={heroActionStyle}>
            🖨️ Bericht
          </Link>
        </div>
      </section>

      <section style={infoBoxStyle}>
        <h2 style={sectionTitleStyle}>Projekt Informationen</h2>

        <div style={infoGridStyle}>
          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Auftraggeber</span>
            <strong>{projekt.auftraggeber || "-"}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Bauleiter / Vertreter</span>
            <strong>{projekt.bauleiter || "-"}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Adresse</span>
            <strong>{projekt.adresse || "-"}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>PLZ / Ort</span>
            <strong>{projekt.ort || projekt.plz_ort || "-"}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Start</span>
            <strong>{formatDate(projekt.start_date)}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Ende</span>
            <strong>{formatDate(projekt.end_date)}</strong>
          </div>
        </div>

        <div style={infoButtonRowStyle}>
          <a
            href={makeMapsLink() || "#"}
            target="_blank"
            rel="noreferrer"
            style={{
              ...mapButtonStyle,
              opacity: makeMapsLink() ? 1 : 0.5,
              pointerEvents: makeMapsLink() ? "auto" : "none",
            }}
          >
            📍 Google Standort öffnen
          </a>

          <Link href={`/projekte/${projektId}/einstellungen`} style={editInfoButtonStyle}>
            Projektdaten bearbeiten
          </Link>
        </div>
      </section>

      <section style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Räume</span>
          <strong style={summaryValueStyle}>{summary.raeume}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>LV Aktiv</span>
          <strong style={summaryValueStyle}>{summary.positionenAktiv}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Soll Stunden</span>
          <strong style={summaryValueStyle}>{formatNumber(summary.sollStunden)} h</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>LV Wert</span>
          <strong style={summaryValueStyle}>{formatMoney(summary.lvWert)} €</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Arbeitszeit Gesamt</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.arbeitszeitGesamt)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Genehmigte Stunden</span>
          <strong style={{ ...summaryValueStyle, color: "#22c55e" }}>
            {formatNumber(summary.arbeitszeitGenehmigt)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Wartet Stunden</span>
          <strong style={{ ...summaryValueStyle, color: "#facc15" }}>
            {formatNumber(summary.arbeitszeitWartet)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Offene Aufgaben</span>
          <strong
            style={{
              ...summaryValueStyle,
              color: summary.aufgabenOffen > 0 ? "#ef4444" : "#22c55e",
            }}
          >
            {summary.aufgabenOffen}
          </strong>
        </div>
      </section>

      <section style={modulesBoxStyle}>
        <h2 style={sectionTitleStyle}>Projekt Module</h2>

        <div style={moduleGridStyle}>
          {moduleCards.map((item) => (
            <Link key={item.href} href={item.href} style={moduleCardStyle}>
              <div style={moduleTopStyle}>
                <span style={{ ...moduleIconStyle, background: item.color }}>
                  {item.icon}
                </span>

                <strong style={moduleValueStyle}>{item.value}</strong>
              </div>

              <h3 style={moduleTitleStyle}>{item.title}</h3>
              <p style={moduleTextStyle}>{item.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section style={quickBoxStyle}>
        <h2 style={sectionTitleStyle}>Schnelle Aktionen</h2>

        <div style={quickGridStyle}>
          <Link href={`/projekte/${projektId}/arbeitszeit`} style={quickButtonStyle}>
            + Arbeitszeit
          </Link>

          <Link href={`/projekte/${projektId}/leistung`} style={quickButtonStyle}>
            + Leistung
          </Link>

          <Link href={`/projekte/${projektId}/fotos`} style={quickButtonStyle}>
            + Foto
          </Link>

          <Link href={`/projekte/${projektId}/aufgaben`} style={quickButtonStyle}>
            + Aufgabe / Mangel
          </Link>

          <Link href={`/projekte/${projektId}/material`} style={quickButtonStyle}>
            + Material
          </Link>

          <Link href={`/projekte/${projektId}/regie`} style={quickButtonStyle}>
            + Regie
          </Link>

          <Link href={`/projekte/${projektId}/radnik`} style={quickButtonStyle}>
            📱 Radnik App Link
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
  fontSize: "16px",
};

const refreshButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px 18px",
  fontSize: "15px",
  fontWeight: "bold",
  cursor: "pointer",
};

const settingsButtonStyle: any = {
  background: "#4b5563",
  color: "white",
  borderRadius: "12px",
  padding: "12px 18px",
  fontSize: "15px",
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
  marginBottom: "0",
};

const loadingStyle: any = {
  color: "#aaa",
  fontSize: "18px",
};

const heroStyle: any = {
  background: "linear-gradient(135deg, #111, #050505)",
  border: "1px solid #333",
  borderRadius: "18px",
  padding: "20px",
  marginBottom: "20px",
  display: "flex",
  justifyContent: "space-between",
  gap: "18px",
  flexWrap: "wrap",
};

const heroTopLineStyle: any = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "12px",
};

const heroActionGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "10px",
  minWidth: "220px",
};

const heroActionStyle: any = {
  background: "#f97316",
  color: "white",
  borderRadius: "12px",
  padding: "12px 16px",
  textDecoration: "none",
  fontWeight: "bold",
  textAlign: "center",
};

const infoBoxStyle: any = {
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

const infoGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
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

const infoButtonRowStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "12px",
  marginTop: "14px",
};

const mapButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  borderRadius: "12px",
  padding: "13px",
  textAlign: "center",
  textDecoration: "none",
  fontWeight: "bold",
};

const editInfoButtonStyle: any = {
  ...mapButtonStyle,
  background: "#2563eb",
};

const summaryGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))",
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
  fontSize: "21px",
};

const modulesBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "20px",
};

const moduleGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
  gap: "14px",
};

const moduleCardStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "14px",
  color: "white",
  textDecoration: "none",
};

const moduleTopStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
};

const moduleIconStyle: any = {
  width: "42px",
  height: "42px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
};

const moduleValueStyle: any = {
  color: "#f97316",
  fontSize: "18px",
};

const moduleTitleStyle: any = {
  color: "white",
  margin: "14px 0 6px 0",
  fontSize: "18px",
};

const moduleTextStyle: any = {
  color: "#aaa",
  margin: 0,
  fontSize: "13px",
  lineHeight: "1.4",
};

const quickBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "20px",
};

const quickGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};

const quickButtonStyle: any = {
  background: "#f97316",
  color: "white",
  borderRadius: "12px",
  padding: "13px",
  textDecoration: "none",
  fontWeight: "bold",
  textAlign: "center",
};

const okBadgeStyle: any = {
  background: "#16a34a",
  color: "white",
  borderRadius: "999px",
  padding: "7px 11px",
  fontWeight: "bold",
  fontSize: "13px",
  whiteSpace: "nowrap",
};

const warningBadgeStyle: any = {
  background: "#ca8a04",
  color: "white",
  borderRadius: "999px",
  padding: "7px 11px",
  fontWeight: "bold",
  fontSize: "13px",
  whiteSpace: "nowrap",
};

const blueBadgeStyle: any = {
  background: "#2563eb",
  color: "white",
  borderRadius: "999px",
  padding: "7px 11px",
  fontWeight: "bold",
  fontSize: "13px",
  whiteSpace: "nowrap",
};

const purpleBadgeStyle: any = {
  background: "#7c3aed",
  color: "white",
  borderRadius: "999px",
  padding: "7px 11px",
  fontWeight: "bold",
  fontSize: "13px",
  whiteSpace: "nowrap",
};

const grayBadgeStyle: any = {
  background: "#4b5563",
  color: "white",
  borderRadius: "999px",
  padding: "7px 11px",
  fontWeight: "bold",
  fontSize: "13px",
  whiteSpace: "nowrap",
};

const dangerBadgeStyle: any = {
  background: "#dc2626",
  color: "white",
  borderRadius: "999px",
  padding: "7px 11px",
  fontWeight: "bold",
  fontSize: "13px",
  whiteSpace: "nowrap",
};