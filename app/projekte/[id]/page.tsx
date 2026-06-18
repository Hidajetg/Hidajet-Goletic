"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];

export default function ProjektDetailPage() {
  const params = useParams();
  const router = useRouter();

  const projektId = String(params.id);

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projekt, setProjekt] = useState<any>(null);

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
    loadProjekt();
  }, [router, projektId]);

  async function loadProjekt() {
    setLoading(true);

    const { data, error } = await supabase
      .from("projekte")
      .select("*")
      .eq("id", Number(projektId))
      .single();

    if (error) {
      alert("Greška kod učitavanja projekta: " + error.message);
      setProjekt(null);
      setLoading(false);
      return;
    }

    setProjekt(data);
    setLoading(false);
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    const parts = String(value).split("-");
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }

    return value;
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <Link href="/projekte" style={backStyle}>
          ← Zurück zu Projekte
        </Link>

        <h1 style={titleStyle}>📂 Projekt</h1>
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

        <span
          style={{
            ...statusStyle,
            background:
              projekt.status === "Aktiv"
                ? "#16a34a"
                : projekt.status === "Geplant"
                ? "#2563eb"
                : projekt.status === "Pausiert"
                ? "#ca8a04"
                : projekt.status === "Abgeschlossen"
                ? "#4b5563"
                : "#9333ea",
          }}
        >
          {projekt.status || "Aktiv"}
        </span>
      </div>

      <h1 style={titleStyle}>📂 {projekt.project_name}</h1>

      <section style={infoBoxStyle}>
        <h2 style={sectionTitleStyle}>Projekt Informationen</h2>

        <div style={infoGridStyle}>
          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Auftraggeber</span>
            <strong>{projekt.auftraggeber || "-"}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Bauleiter</span>
            <strong>{projekt.bauleiter || "-"}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Adresse</span>
            <strong>{projekt.adresse || "-"}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>PLZ / Ort</span>
            <strong>{projekt.ort || "-"}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Ausführungsbeginn</span>
            <strong>{formatDate(projekt.start_date)}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Ausführungsende</span>
            <strong>{formatDate(projekt.end_date)}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Erstellt von</span>
            <strong>{projekt.created_by || "-"}</strong>
          </div>

          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Projekt ID</span>
            <strong>{projekt.id}</strong>
          </div>
        </div>

        {projekt.google_location && (
          <a
            href={projekt.google_location}
            target="_blank"
            rel="noopener noreferrer"
            style={mapButtonStyle}
          >
            📍 Google Standort öffnen
          </a>
        )}
      </section>

      <section style={modulesBoxStyle}>
        <h2 style={sectionTitleStyle}>Projekt Module</h2>

        <div style={moduleGridStyle}>
          <Link href={`/projekte/${projekt.id}/import`} style={moduleLinkStyle}>
            <span style={moduleIconStyle}>📥</span>
            <strong>LV Import</strong>
            <small>ONLV / ÖNORM XML import za LV pozicije</small>
          </Link>

          <Link
            href={`/projekte/${projekt.id}/positionen`}
            style={moduleLinkStyle}
          >
            <span style={moduleIconStyle}>📋</span>
            <strong>LV Positionen</strong>
            <small>Soll-Werte, Menge, Einheit, Preis, Normzeit</small>
          </Link>

          <Link href={`/projekte/${projekt.id}/raeume`} style={moduleLinkStyle}>
            <span style={moduleIconStyle}>📐</span>
            <strong>Aufmaß / Räume</strong>
            <small>Prostorije, m², Faktoren, Soll / Ist</small>
          </Link>

          <Link
            href={`/projekte/${projekt.id}/arbeitszeit`}
            style={moduleLinkStyle}
          >
            <span style={moduleIconStyle}>⏱️</span>
            <strong>Arbeitszeit</strong>
            <small>Radno vrijeme po radniku, prostoru i LV poziciji</small>
          </Link>

          <Link
            href={`/projekte/${projekt.id}/leistung`}
            style={moduleLinkStyle}
          >
            <span style={moduleIconStyle}>✅</span>
            <strong>Leistung</strong>
            <small>Dnevni učinak po poziciji, sobi i ekipi</small>
          </Link>

          <Link href={`/projekte/${projekt.id}/regie`} style={moduleLinkStyle}>
            <span style={moduleIconStyle}>🧾</span>
            <strong>Regie</strong>
            <small>Regie sati, više radnika, puni sati po radniku</small>
          </Link>

          <Link href={`/projekte/${projekt.id}/material`} style={moduleLinkStyle}>
            <span style={moduleIconStyle}>🧱</span>
            <strong>Material</strong>
            <small>Planirano, potrošeno, ostatak po projektu</small>
          </Link>

          <Link href={`/projekte/${projekt.id}/fotos`} style={moduleLinkStyle}>
            <span style={moduleIconStyle}>📸</span>
            <strong>Fotos</strong>
            <small>Slike projekta, prostorija, Mangel, Vorher / Nachher</small>
          </Link>

          <Link href={`/projekte/${projekt.id}/aufgaben`} style={moduleLinkStyle}>
            <span style={moduleIconStyle}>✅</span>
            <strong>Aufgaben / Mängel</strong>
            <small>Zadaci, nedostaci, rokovi i zaduženi radnici</small>
          </Link>

          <Link
            href={`/projekte/${projekt.id}/freigabe`}
            style={moduleLinkStyle}
          >
            <span style={moduleIconStyle}>🟢</span>
            <strong>Freigabe / Kontrolle</strong>
            <small>Admin potvrđuje Arbeitszeit, Leistung, Regie, Fotos</small>
          </Link>

          <Link
            href={`/projekte/${projekt.id}/tagesbericht`}
            style={moduleLinkStyle}
          >
            <span style={moduleIconStyle}>📅</span>
            <strong>Tagesbericht</strong>
            <small>Dnevni pregled: sati, učinak, regie, material, slike</small>
          </Link>

          <Link
            href={`/projekte/${projekt.id}/auswertung`}
            style={moduleLinkStyle}
          >
            <span style={moduleIconStyle}>📊</span>
            <strong>Auswertung</strong>
            <small>Soll / Ist, produktivnost, sati, regie, material</small>
          </Link>

          <Link href={`/projekte/${projekt.id}/bericht`} style={moduleLinkStyle}>
            <span style={moduleIconStyle}>🖨️</span>
            <strong>Bericht / Druck</strong>
            <small>Projektbericht drucken oder als PDF speichern</small>
          </Link>

          <Link
            href={`/projekte/${projekt.id}/einstellungen`}
            style={moduleLinkStyle}
          >
            <span style={moduleIconStyle}>⚙️</span>
            <strong>Einstellungen</strong>
            <small>Projekt bearbeiten, Status ändern oder löschen</small>
          </Link>
        </div>
      </section>

      <section style={nextBoxStyle}>
        <h2 style={sectionTitleStyle}>Nächster Schritt</h2>

        <p style={nextTextStyle}>
          Sada je otvoren modul <strong>Freigabe / Kontrolle</strong>. Admin
          ovdje potvrđuje ili odbija unose koje su radnici napravili.
        </p>
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

const backStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "16px",
};

const titleStyle: any = {
  fontSize: "38px",
  color: "#f97316",
  margin: "0 0 18px 0",
};

const loadingStyle: any = {
  color: "#aaa",
  fontSize: "18px",
};

const statusStyle: any = {
  color: "white",
  borderRadius: "999px",
  padding: "7px 13px",
  fontSize: "13px",
  fontWeight: "bold",
  whiteSpace: "nowrap",
};

const infoBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "22px",
};

const modulesBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "22px",
};

const nextBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
};

const sectionTitleStyle: any = {
  color: "#f97316",
  marginTop: 0,
  marginBottom: "14px",
};

const infoGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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

const mapButtonStyle: any = {
  display: "block",
  background: "#9333ea",
  color: "white",
  textDecoration: "none",
  textAlign: "center",
  borderRadius: "12px",
  padding: "12px",
  fontWeight: "bold",
  marginTop: "16px",
};

const moduleGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
};

const moduleButtonStyle: any = {
  background: "#000",
  color: "white",
  border: "1px solid #333",
  borderRadius: "14px",
  padding: "18px",
  minHeight: "150px",
  cursor: "pointer",
  textAlign: "left",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const moduleLinkStyle: any = {
  ...moduleButtonStyle,
  textDecoration: "none",
};

const moduleIconStyle: any = {
  fontSize: "34px",
};

const nextTextStyle: any = {
  color: "#ccc",
  fontSize: "16px",
  lineHeight: "1.5",
  margin: 0,
};