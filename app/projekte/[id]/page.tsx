"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

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
  google_location?: string | null;
  google_maps?: string | null;
  info?: string | null;
  created_at?: string | null;
  [key: string]: any;
};

type LoginUser = {
  name?: string;
  role?: string;
};

type ModuleItem = {
  title: string;
  subtitle: string;
  href: string;
  color: string;
  count?: number;
};

export default function ProjektDetailPage() {
  const params = useParams();
  const router = useRouter();

  const projektId = String(params.id);

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [tableName, setTableName] = useState<"projekte" | "baustellen">(
    "projekte"
  );

  const [user, setUser] = useState<LoginUser | null>(null);

  const [counts, setCounts] = useState({
    raeume: 0,
    arbeitszeit: 0,
    tagesbericht: 0,
    fotos: 0,
    material: 0,
    aufgaben: 0,
    positionen: 0,
    freigabe: 0,
  });

  useEffect(() => {
    loadUser();
    loadAll();
  }, [projektId]);

  const isAdmin = useMemo(() => {
    return (
      user?.role === "admin" ||
      user?.name === "Hido" ||
      user?.name === "Steffi" ||
      user?.name === "Admin" ||
      !user
    );
  }, [user]);

  function loadUser() {
    try {
      const keys = ["user", "currentUser", "loggedUser", "baustelleUser"];

      for (const key of keys) {
        const value = localStorage.getItem(key);

        if (value) {
          setUser(JSON.parse(value));
          return;
        }
      }
    } catch {
      setUser(null);
    }
  }

  function getName(p: Projekt | null) {
    if (!p) return "Projekt";

    return (
      p.name ||
      p.naziv ||
      p.title ||
      p.projekt ||
      p.baustelle_name ||
      `Projekt ${p.id}`
    );
  }

  function getOrt(p: Projekt | null) {
    if (!p) return "";
    return p.ort || p.mjesto || p.location || p.adresse || "";
  }

  function getAdresse(p: Projekt | null) {
    if (!p) return "";
    return p.adresse || "";
  }

  function getGoogleLink(p: Projekt | null) {
    if (!p) return "";
    return p.google_location || p.google_maps || "";
  }

  function isFertig(p: Projekt | null) {
    if (!p) return false;

    const status = String(p.status || "").toLowerCase();

    return (
      status.includes("fertig") ||
      status.includes("abgeschlossen") ||
      status.includes("closed") ||
      status.includes("zavrs") ||
      status.includes("završen") ||
      status.includes("zavrsen")
    );
  }

  async function loadAll() {
    setLoading(true);
    setErrorText("");

    const loadedProjekt = await loadProjekt();

    if (!loadedProjekt) {
      setLoading(false);
      return;
    }

    await loadCounts();

    setLoading(false);
  }

  async function loadProjekt() {
    const tables: Array<"projekte" | "baustellen"> = ["projekte", "baustellen"];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", projektId)
        .maybeSingle();

      if (!error && data) {
        setTableName(table);
        setProjekt(data as Projekt);
        return data as Projekt;
      }
    }

    setProjekt(null);
    setErrorText("Projekt nije pronađen.");
    return null;
  }

  async function loadRows(tableNames: string[], columnNames: string[]) {
    for (const table of tableNames) {
      for (const column of columnNames) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq(column, projektId);

        if (!error) {
          return data || [];
        }
      }
    }

    return [];
  }

  async function loadCounts() {
    const projectColumns = [
      "projekt_id",
      "project_id",
      "baustelle_id",
      "baustellen_id",
    ];

    const [
      raeume,
      arbeitszeit,
      tagesbericht,
      fotos,
      material,
      aufgaben,
      positionen,
      freigabeArbeitszeit,
      freigabeFotos,
    ] = await Promise.all([
      loadRows(["raeume", "prostorije", "rooms"], projectColumns),
      loadRows(["arbeitszeiten", "arbeitszeit", "stunden"], projectColumns),
      loadRows(["tagesberichte", "tagesbericht", "regieberichte"], projectColumns),
      loadRows(["fotos", "photos", "bilder"], projectColumns),
      loadRows(
        ["material_bewegungen", "room_material", "materialien", "materials"],
        projectColumns
      ),
      loadRows(["aufgaben", "tasks"], projectColumns),
      loadRows(["positionen", "positions"], projectColumns),
      loadRows(["arbeitszeiten", "arbeitszeit", "stunden"], projectColumns),
      loadRows(["fotos", "photos", "bilder"], projectColumns),
    ]);

    const wartetArbeitszeit = freigabeArbeitszeit.filter((x: any) => {
      const status = String(
        x.freigabe_status || x.status || x.approved || ""
      ).toLowerCase();

      return (
        status.includes("wartet") ||
        status.includes("pending") ||
        status.includes("offen") ||
        status === ""
      );
    }).length;

    const wartetFotos = freigabeFotos.filter((x: any) => {
      const status = String(
        x.freigabe_status || x.status || x.approved || ""
      ).toLowerCase();

      return (
        status.includes("wartet") ||
        status.includes("pending") ||
        status.includes("offen")
      );
    }).length;

    setCounts({
      raeume: raeume.length,
      arbeitszeit: arbeitszeit.length,
      tagesbericht: tagesbericht.length,
      fotos: fotos.length,
      material: material.length,
      aufgaben: aufgaben.length,
      positionen: positionen.length,
      freigabe: wartetArbeitszeit + wartetFotos,
    });
  }

  async function changeStatus() {
    if (!projekt) return;

    const newStatus = isFertig(projekt) ? "aktiv" : "abgeschlossen";

    const { error } = await supabase
      .from(tableName)
      .update({ status: newStatus } as any)
      .eq("id", projekt.id);

    if (error) {
      alert("Greška kod promjene statusa: " + error.message);
      return;
    }

    await loadAll();
  }

  async function deleteProjekt() {
    if (!projekt) return;

    const ok = confirm(
      `Da li stvarno želiš obrisati projekt "${getName(projekt)}"?`
    );

    if (!ok) return;

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq("id", projekt.id);

    if (error) {
      alert("Greška kod brisanja: " + error.message);
      return;
    }

    router.push("/projekte");
  }

  const modules: ModuleItem[] = [
    {
      title: "Räume",
      subtitle: "Prostorije i radovi",
      href: `/projekte/${projektId}/raeume`,
      color: "blue",
      count: counts.raeume,
    },
    {
      title: "Arbeitszeit",
      subtitle: "Sati radnika",
      href: `/projekte/${projektId}/arbeitszeit`,
      color: "green",
      count: counts.arbeitszeit,
    },
    {
      title: "Tagesbericht",
      subtitle: "Dnevni izvještaj",
      href: `/projekte/${projektId}/tagesbericht`,
      color: "orange",
      count: counts.tagesbericht,
    },
    {
      title: "Fotos",
      subtitle: "Slike sa Baustelle",
      href: `/projekte/${projektId}/fotos`,
      color: "purple",
      count: counts.fotos,
    },
    {
      title: "Material",
      subtitle: "Materijal i potrošnja",
      href: `/projekte/${projektId}/material`,
      color: "cyan",
      count: counts.material,
    },
    {
      title: "Aufgaben",
      subtitle: "Zadaci za radnike",
      href: `/projekte/${projektId}/aufgaben`,
      color: "yellow",
      count: counts.aufgaben,
    },
    {
      title: "Positionen",
      subtitle: "LV pozicije",
      href: `/projekte/${projektId}/positionen`,
      color: "red",
      count: counts.positionen,
    },
    {
      title: "Freigabe",
      subtitle: "Odobrenja i kontrola",
      href: `/projekte/${projektId}/freigabe`,
      color: "pink",
      count: counts.freigabe,
    },
    {
      title: "Auswertung",
      subtitle: "Analiza projekta",
      href: `/projekte/${projektId}/auswertung`,
      color: "gray",
    },
    {
      title: "Bericht",
      subtitle: "Finalni izvještaj",
      href: `/projekte/${projektId}/bericht`,
      color: "gray",
    },
    {
      title: "Import",
      subtitle: "Uvoz podataka",
      href: `/projekte/${projektId}/import`,
      color: "gray",
    },
    {
      title: "Einstellungen",
      subtitle: "Postavke projekta",
      href: `/projekte/${projektId}/einstellungen`,
      color: "gray",
    },
  ];

  if (loading) {
    return (
      <main className="page">
        <div className="loading">Učitavanje projekta...</div>

        <style>{`
          .page {
            min-height: 100vh;
            background: #050505;
            color: white;
            padding: 28px;
            font-family: Arial, sans-serif;
          }

          .loading {
            background: #111827;
            border: 1px solid #1f2937;
            border-radius: 18px;
            padding: 30px;
            text-align: center;
            color: #cbd5e1;
            font-weight: 800;
          }
        `}</style>
      </main>
    );
  }

  if (errorText || !projekt) {
    return (
      <main className="page">
        <Link className="back" href="/projekte">
          ← Zurück zu Projekte
        </Link>

        <div className="errorBox">{errorText || "Projekt nije pronađen."}</div>

        <style>{`
          .page {
            min-height: 100vh;
            background: #050505;
            color: white;
            padding: 28px;
            font-family: Arial, sans-serif;
          }

          .back {
            display: inline-block;
            color: white;
            text-decoration: none;
            background: #374151;
            border-radius: 14px;
            padding: 12px 16px;
            font-weight: 800;
            margin-bottom: 20px;
          }

          .errorBox {
            background: #7f1d1d;
            border: 1px solid #ef4444;
            color: white;
            padding: 18px;
            border-radius: 16px;
            font-weight: 800;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="top">
        <div>
          <Link className="back" href="/projekte">
            ← Zurück zu Projekte
          </Link>

          <p className="label">Projekt Dashboard</p>

          <div className="titleRow">
            <h1>{getName(projekt)}</h1>

            <span className={isFertig(projekt) ? "badge done" : "badge"}>
              {isFertig(projekt) ? "Fertig" : "Aktiv"}
            </span>
          </div>

          <p className="subtitle">{getOrt(projekt) || "Ort nije upisan"}</p>
        </div>

        <div className="topButtons">
          <button className="btn gray" onClick={loadAll}>
            Aktualisieren
          </button>

          {getGoogleLink(projekt) && (
            <a
              className="btn green"
              href={getGoogleLink(projekt)}
              target="_blank"
              rel="noreferrer"
            >
              Google Standort
            </a>
          )}
        </div>
      </section>

      <section className="infoGrid">
        <div className="infoCard">
          <span>Auftraggeber</span>
          <strong>{projekt.auftraggeber || "Nicht eingetragen"}</strong>
        </div>

        <div className="infoCard">
          <span>Bauleiter</span>
          <strong>{projekt.bauleiter || "Nicht eingetragen"}</strong>
        </div>

        <div className="infoCard">
          <span>Ort</span>
          <strong>{getOrt(projekt) || "Nicht eingetragen"}</strong>
        </div>

        <div className="infoCard">
          <span>Adresse</span>
          <strong>{getAdresse(projekt) || "Nicht eingetragen"}</strong>
        </div>
      </section>

      {projekt.info && (
        <section className="projectInfo">
          <h2>Baustelle Info</h2>
          <p>{projekt.info}</p>
        </section>
      )}

      <section className="quickStats">
        <div>
          <span>Räume</span>
          <strong>{counts.raeume}</strong>
        </div>

        <div>
          <span>Arbeitszeit</span>
          <strong>{counts.arbeitszeit}</strong>
        </div>

        <div>
          <span>Fotos</span>
          <strong>{counts.fotos}</strong>
        </div>

        <div>
          <span>Freigabe</span>
          <strong>{counts.freigabe}</strong>
        </div>
      </section>

      <section className="mainActions">
        <Link className="mainButton red" href={`/projekte/${projektId}/raeume`}>
          Räume öffnen
        </Link>

        <Link
          className="mainButton blue"
          href={`/projekte/${projektId}/arbeitszeit`}
        >
          Arbeitszeit öffnen
        </Link>
      </section>

      <section className="modules">
        {modules.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`module ${item.color}`}
          >
            <div>
              <h3>{item.title}</h3>
              <p>{item.subtitle}</p>
            </div>

            {typeof item.count === "number" && (
              <span className="count">{item.count}</span>
            )}
          </Link>
        ))}
      </section>

      {isAdmin && (
        <section className="adminBox">
          <h2>Admin Aktionen</h2>

          <div className="adminActions">
            <button onClick={changeStatus}>
              {isFertig(projekt) ? "Wieder aktiv setzen" : "Projekt abschließen"}
            </button>

            <Link href={`/projekte/${projektId}/einstellungen`}>
              Einstellungen öffnen
            </Link>

            <button className="delete" onClick={deleteProjekt}>
              Projekt löschen
            </button>
          </div>
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

        .titleRow {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
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

        .badge {
          background: #064e3b;
          color: #bbf7d0;
          border: 1px solid #16a34a;
          border-radius: 999px;
          padding: 8px 13px;
          font-size: 13px;
          font-weight: 900;
        }

        .badge.done {
          background: #374151;
          color: #e5e7eb;
          border-color: #6b7280;
        }

        .topButtons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        button,
        a {
          font-family: inherit;
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
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .gray {
          background: #374151;
        }

        .green {
          background: #15803d;
        }

        .infoGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }

        .infoCard {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 18px;
        }

        .infoCard span {
          display: block;
          color: #9ca3af;
          font-size: 14px;
          margin-bottom: 8px;
          font-weight: 800;
        }

        .infoCard strong {
          display: block;
          color: white;
          font-size: 16px;
          line-height: 1.35;
        }

        .projectInfo {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 20px;
          margin-bottom: 18px;
        }

        .projectInfo h2 {
          margin: 0 0 10px;
          font-size: 22px;
        }

        .projectInfo p {
          margin: 0;
          color: #d1d5db;
          line-height: 1.5;
          white-space: pre-wrap;
        }

        .quickStats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }

        .quickStats div {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 18px;
        }

        .quickStats span {
          display: block;
          color: #9ca3af;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .quickStats strong {
          font-size: 34px;
        }

        .mainActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 18px;
        }

        .mainButton {
          text-align: center;
          color: white;
          text-decoration: none;
          border-radius: 18px;
          padding: 18px;
          font-weight: 900;
          font-size: 17px;
        }

        .mainButton.red {
          background: #dc2626;
        }

        .mainButton.blue {
          background: #2563eb;
        }

        .modules {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }

        .module {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 18px;
          text-decoration: none;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          min-height: 92px;
        }

        .module h3 {
          margin: 0;
          font-size: 20px;
        }

        .module p {
          margin: 8px 0 0;
          color: #cbd5e1;
          font-size: 14px;
          line-height: 1.35;
        }

        .count {
          min-width: 42px;
          height: 42px;
          border-radius: 999px;
          background: #030712;
          border: 1px solid #374151;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 18px;
        }

        .module.blue {
          border-color: #1d4ed8;
        }

        .module.green {
          border-color: #15803d;
        }

        .module.orange {
          border-color: #f97316;
        }

        .module.purple {
          border-color: #7c3aed;
        }

        .module.cyan {
          border-color: #0891b2;
        }

        .module.yellow {
          border-color: #ca8a04;
        }

        .module.red {
          border-color: #dc2626;
        }

        .module.pink {
          border-color: #db2777;
        }

        .module.gray {
          border-color: #374151;
        }

        .adminBox {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 20px;
        }

        .adminBox h2 {
          margin: 0 0 14px;
          font-size: 22px;
        }

        .adminActions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .adminActions button,
        .adminActions a {
          border: 0;
          border-radius: 14px;
          padding: 14px;
          color: white;
          font-weight: 900;
          text-decoration: none;
          cursor: pointer;
          background: #374151;
          text-align: center;
          font-size: 15px;
        }

        .adminActions .delete {
          background: #dc2626;
        }

        @media (max-width: 980px) {
          .infoGrid {
            grid-template-columns: repeat(2, 1fr);
          }

          .quickStats {
            grid-template-columns: repeat(2, 1fr);
          }

          .modules {
            grid-template-columns: repeat(2, 1fr);
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
            font-size: 34px;
          }

          .topButtons {
            display: grid;
            grid-template-columns: 1fr;
            margin-top: 16px;
          }

          .infoGrid,
          .quickStats,
          .mainActions,
          .modules,
          .adminActions {
            grid-template-columns: 1fr;
          }

          .module {
            min-height: auto;
          }
        }
      `}</style>
    </main>
  );
}