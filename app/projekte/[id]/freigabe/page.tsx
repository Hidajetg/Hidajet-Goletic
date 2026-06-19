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
  [key: string]: any;
};

type TableConfig = {
  table: string;
  column: string;
};

type FreigabeRow = {
  id: number | string;
  typ: "Arbeitszeit" | "Fotos" | "Tagesbericht" | "Aufgaben" | "Positionen" | "Material";
  table: string;
  original: any;
  datum: string;
  titel: string;
  untertitel: string;
  beschreibung: string;
  status: string;
};

const STATUS_FILTER = ["Alle", "Wartet", "Freigegeben", "Abgelehnt", "Fertig"];

export default function ProjektFreigabePage() {
  const params = useParams();
  const projektId = String(params.id);
  const projektIdValue = isNaN(Number(projektId))
    ? projektId
    : Number(projektId);

  const [loading, setLoading] = useState(true);
  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [rows, setRows] = useState<FreigabeRow[]>([]);
  const [errorText, setErrorText] = useState("");

  const [search, setSearch] = useState("");
  const [filterTyp, setFilterTyp] = useState("Alle");
  const [filterStatus, setFilterStatus] = useState("Wartet");

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

  function getStatus(row: any) {
    const raw =
      row.freigabe_status ||
      row.approval_status ||
      row.status ||
      row.approved ||
      "";

    if (raw === true) return "Freigegeben";
    if (raw === false) return "Wartet";

    const s = String(raw || "").toLowerCase();

    if (
      s.includes("freigegeben") ||
      s.includes("approved") ||
      s.includes("odobreno")
    ) {
      return "Freigegeben";
    }

    if (
      s.includes("abgelehnt") ||
      s.includes("rejected") ||
      s.includes("odbijeno")
    ) {
      return "Abgelehnt";
    }

    if (s.includes("fertig")) {
      return "Fertig";
    }

    return "Wartet";
  }

  function isWaiting(status: string) {
    return status === "Wartet";
  }

  function getWorker(row: any) {
    return (
      row.radnik ||
      row.arbeiter ||
      row.worker ||
      row.worker_name ||
      row.mitarbeiter ||
      row.name ||
      ""
    );
  }

  function getStart(row: any) {
    return row.start_time || row.start || row.von || row.beginn || "";
  }

  function getEnd(row: any) {
    return row.end_time || row.end || row.bis || row.ende || "";
  }

  function getHours(row: any) {
    return row.stunden || row.hours || row.total_hours || row.gesamt_stunden || "";
  }

  function getTitle(row: any) {
    return row.titel || row.title || row.name || row.naziv || row.bezeichnung || "";
  }

  function getDescription(row: any) {
    return (
      row.beschreibung ||
      row.description ||
      row.notiz ||
      row.note ||
      row.info ||
      row.bemerkung ||
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

  function getMaterialName(row: any) {
    return row.naziv || row.name || row.material_name || row.material || "";
  }

  function getQuantity(row: any) {
    return row.kolicina || row.menge || row.quantity || row.qty || "";
  }

  function getUnit(row: any) {
    return row.jedinica || row.einheit || row.unit || "";
  }

  async function loadAll() {
    setLoading(true);
    setErrorText("");

    await loadProjekt();

    const allRows: FreigabeRow[] = [];

    const arbeitszeitRows = await loadRows([
      { table: "arbeitszeiten", column: "projekt_id" },
      { table: "arbeitszeiten", column: "project_id" },
      { table: "arbeitszeiten", column: "baustelle_id" },
      { table: "arbeitszeit", column: "projekt_id" },
      { table: "arbeitszeit", column: "project_id" },
      { table: "stunden", column: "projekt_id" },
    ]);

    arbeitszeitRows.forEach((row) => {
      allRows.push({
        id: row.id,
        typ: "Arbeitszeit",
        table: row.__table,
        original: row,
        datum: getDate(row),
        titel: getWorker(row) || "Arbeitszeit",
        untertitel: `${getStart(row) || "-"} - ${getEnd(row) || "-"} ${
          getHours(row) ? `· ${getHours(row)} h` : ""
        }`,
        beschreibung: getDescription(row),
        status: getStatus(row),
      });
    });

    const fotoRows = await loadRows([
      { table: "fotos", column: "projekt_id" },
      { table: "fotos", column: "project_id" },
      { table: "fotos", column: "baustelle_id" },
      { table: "photos", column: "projekt_id" },
      { table: "photos", column: "project_id" },
      { table: "bilder", column: "projekt_id" },
    ]);

    fotoRows.forEach((row) => {
      allRows.push({
        id: row.id,
        typ: "Fotos",
        table: row.__table,
        original: row,
        datum: getDate(row),
        titel: getTitle(row) || "Foto",
        untertitel: row.kategorie || row.category || row.typ || "Foto",
        beschreibung: getDescription(row),
        status: getStatus(row),
      });
    });

    const tagesberichtRows = await loadRows([
      { table: "tagesberichte", column: "projekt_id" },
      { table: "tagesberichte", column: "project_id" },
      { table: "tagesberichte", column: "baustelle_id" },
      { table: "tagesbericht", column: "projekt_id" },
      { table: "regieberichte", column: "projekt_id" },
      { table: "regiebericht", column: "projekt_id" },
    ]);

    tagesberichtRows.forEach((row) => {
      allRows.push({
        id: row.id,
        typ: "Tagesbericht",
        table: row.__table,
        original: row,
        datum: getDate(row),
        titel: getTitle(row) || `Tagesbericht ${getDate(row)}`,
        untertitel: row.arbeiter || row.workers || row.radnici || "",
        beschreibung:
          row.leistung ||
          row.arbeiten ||
          row.work_done ||
          getDescription(row),
        status: getStatus(row),
      });
    });

    const aufgabenRows = await loadRows([
      { table: "aufgaben", column: "projekt_id" },
      { table: "aufgaben", column: "project_id" },
      { table: "aufgaben", column: "baustelle_id" },
      { table: "tasks", column: "projekt_id" },
      { table: "tasks", column: "project_id" },
      { table: "projekt_aufgaben", column: "projekt_id" },
    ]);

    aufgabenRows.forEach((row) => {
      allRows.push({
        id: row.id,
        typ: "Aufgaben",
        table: row.__table,
        original: row,
        datum: getDate(row),
        titel: getTitle(row) || row.aufgabe || row.task || "Aufgabe",
        untertitel:
          row.zugewiesen_an ||
          row.assigned_to ||
          row.radnik ||
          row.worker ||
          "",
        beschreibung: getDescription(row),
        status: getStatus(row),
      });
    });

    const positionRows = await loadRows([
      { table: "positionen", column: "projekt_id" },
      { table: "positionen", column: "project_id" },
      { table: "projekt_positionen", column: "projekt_id" },
      { table: "lv_positionen", column: "projekt_id" },
      { table: "positions", column: "project_id" },
    ]);

    positionRows.forEach((row) => {
      allRows.push({
        id: row.id,
        typ: "Positionen",
        table: row.__table,
        original: row,
        datum: getDate(row),
        titel: getTitle(row) || "Position",
        untertitel: row.gruppe || row.category || row.kategorie || "",
        beschreibung: getDescription(row),
        status: getStatus(row),
      });
    });

    const materialRows = await loadRows([
      { table: "material_bewegungen", column: "projekt_id" },
      { table: "material_bewegungen", column: "project_id" },
      { table: "projekt_material", column: "projekt_id" },
      { table: "material", column: "projekt_id" },
      { table: "materialien_projekt", column: "projekt_id" },
    ]);

    materialRows.forEach((row) => {
      allRows.push({
        id: row.id,
        typ: "Material",
        table: row.__table,
        original: row,
        datum: getDate(row),
        titel: getMaterialName(row) || "Material",
        untertitel: `${getQuantity(row) || ""} ${getUnit(row) || ""}`.trim(),
        beschreibung: getDescription(row),
        status: getStatus(row),
      });
    });

    const sorted = allRows.sort((a, b) => {
      if (isWaiting(a.status) && !isWaiting(b.status)) return -1;
      if (!isWaiting(a.status) && isWaiting(b.status)) return 1;

      return String(b.datum).localeCompare(String(a.datum));
    });

    setRows(sorted);
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
        return (data || []).map((row: any) => ({
          ...row,
          __table: config.table,
        }));
      }
    }

    return [];
  }

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const text = `
        ${row.typ}
        ${row.datum}
        ${row.titel}
        ${row.untertitel}
        ${row.beschreibung}
        ${row.status}
      `.toLowerCase();

      const searchOk = text.includes(search.toLowerCase());
      const typOk = filterTyp === "Alle" || row.typ === filterTyp;
      const statusOk = filterStatus === "Alle" || row.status === filterStatus;

      return searchOk && typOk && statusOk;
    });
  }, [rows, search, filterTyp, filterStatus]);

  const counts = useMemo(() => {
    return {
      wartet: rows.filter((row) => row.status === "Wartet").length,
      freigegeben: rows.filter((row) => row.status === "Freigegeben").length,
      abgelehnt: rows.filter((row) => row.status === "Abgelehnt").length,
    };
  }, [rows]);

  async function updateFreigabe(row: FreigabeRow, status: string) {
    const payloads: any[] = [
      {
        freigabe_status: status,
        status,
      },
      {
        approval_status: status,
        status,
      },
      {
        status,
      },
      {
        approved: status === "Freigegeben",
      },
    ];

    let lastError: any = null;

    for (const payload of payloads) {
      const { error } = await supabase
        .from(row.table)
        .update(payload as any)
        .eq("id", row.id);

      if (!error) {
        await loadAll();
        return;
      }

      lastError = error;
    }

    alert("Greška kod Freigabe: " + (lastError?.message || ""));
  }

  async function approveAllWaiting() {
    const waiting = filtered.filter((row) => row.status === "Wartet");

    if (waiting.length === 0) {
      alert("Nema unosa koji čekaju odobrenje.");
      return;
    }

    const ok = confirm(`Odobriti sve prikazane unose? (${waiting.length})`);

    if (!ok) return;

    for (const row of waiting) {
      await supabase
        .from(row.table)
        .update({
          freigabe_status: "Freigegeben",
          status: "Freigegeben",
        } as any)
        .eq("id", row.id);
    }

    await loadAll();
  }

  return (
    <main className="page">
      <section className="top">
        <div>
          <Link className="back" href={`/projekte/${projektId}`}>
            ← Zurück zu Projekt
          </Link>

          <p className="label">Projekt Freigabe</p>
          <h1>Freigabe</h1>
          <p className="subtitle">
            {getProjektName()}
            {getProjektOrt() ? ` · ${getProjektOrt()}` : ""}
          </p>
        </div>

        <div className="topButtons">
          <button className="btn gray" onClick={loadAll}>
            Aktualisieren
          </button>

          <button className="btn green" onClick={approveAllWaiting}>
            Alle sichtbaren freigeben
          </button>
        </div>
      </section>

      {errorText && <div className="errorBox">{errorText}</div>}

      <section className="stats">
        <div className="stat">
          <span>Wartet</span>
          <strong>{counts.wartet}</strong>
        </div>

        <div className="stat">
          <span>Freigegeben</span>
          <strong>{counts.freigegeben}</strong>
        </div>

        <div className="stat dangerStat">
          <span>Abgelehnt</span>
          <strong>{counts.abgelehnt}</strong>
        </div>
      </section>

      <section className="toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Traži Freigabe, radnika, datum, opis..."
        />

        <select value={filterTyp} onChange={(e) => setFilterTyp(e.target.value)}>
          <option value="Alle">Alle Typen</option>
          <option value="Arbeitszeit">Arbeitszeit</option>
          <option value="Fotos">Fotos</option>
          <option value="Tagesbericht">Tagesbericht</option>
          <option value="Aufgaben">Aufgaben</option>
          <option value="Positionen">Positionen</option>
          <option value="Material">Material</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          {STATUS_FILTER.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </section>

      {loading ? (
        <div className="emptyBox">Učitavanje Freigabe...</div>
      ) : filtered.length === 0 ? (
        <div className="emptyBox">
          <h2>Nema unosa</h2>
          <p>Nema unosa za ovaj filter.</p>
        </div>
      ) : (
        <section className="grid">
          {filtered.map((row) => {
            const imageUrl = getImageUrl(row.original);

            return (
              <article key={`${row.typ}-${row.table}-${row.id}`} className="card">
                <div className="cardTop">
                  <div>
                    <p className="type">{row.typ}</p>
                    <h2>{row.titel || row.typ}</h2>
                    <p>
                      {row.datum || "-"}
                      {row.untertitel ? ` · ${row.untertitel}` : ""}
                    </p>
                  </div>

                  <span
                    className={
                      row.status === "Freigegeben"
                        ? "badge approved"
                        : row.status === "Abgelehnt"
                        ? "badge rejected"
                        : "badge"
                    }
                  >
                    {row.status}
                  </span>
                </div>

                {imageUrl && (
                  <a className="imageLink" href={imageUrl} target="_blank" rel="noreferrer">
                    <img src={imageUrl} alt={row.titel || "Foto"} />
                  </a>
                )}

                {row.beschreibung && (
                  <p className="description">{row.beschreibung}</p>
                )}

                <div className="actions">
                  <button
                    className="approve"
                    onClick={() => updateFreigabe(row, "Freigegeben")}
                  >
                    Freigeben
                  </button>

                  <button
                    className="reject"
                    onClick={() => updateFreigabe(row, "Abgelehnt")}
                  >
                    Ablehnen
                  </button>

                  <button onClick={() => updateFreigabe(row, "Wartet")}>
                    Zurück
                  </button>
                </div>
              </article>
            );
          })}
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
        input,
        select {
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

        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
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
          font-size: 34px;
        }

        .dangerStat strong {
          color: #fca5a5;
        }

        .toolbar {
          display: grid;
          grid-template-columns: 1fr 200px 180px;
          gap: 10px;
          margin-bottom: 18px;
        }

        .toolbar input,
        .toolbar select {
          background: #111827;
          color: white;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 15px 16px;
          font-size: 16px;
          outline: none;
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
        }

        .emptyBox h2 {
          color: white;
          margin-top: 0;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(330px, 1fr));
          gap: 18px;
        }

        .card {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 22px;
          padding: 20px;
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 14px;
        }

        .type {
          color: #93c5fd !important;
          font-weight: 900;
          margin: 0 0 6px !important;
          font-size: 13px;
        }

        .card h2 {
          margin: 0;
          font-size: 23px;
        }

        .card p {
          margin: 8px 0 0;
          color: #cbd5e1;
          line-height: 1.45;
        }

        .badge {
          background: #78350f;
          color: #fed7aa;
          border: 1px solid #f97316;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
        }

        .badge.approved {
          background: #064e3b;
          color: #bbf7d0;
          border-color: #16a34a;
        }

        .badge.rejected {
          background: #7f1d1d;
          color: #fecaca;
          border-color: #ef4444;
        }

        .imageLink {
          display: block;
          height: 220px;
          background: #030712;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .imageLink img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .description {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 12px;
          white-space: pre-wrap;
          margin-bottom: 12px !important;
        }

        .actions {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          padding-top: 14px;
          border-top: 1px solid #1f2937;
        }

        .actions button {
          background: #374151;
          color: white;
          border: 0;
          border-radius: 12px;
          padding: 12px 8px;
          font-weight: 900;
          cursor: pointer;
          font-size: 14px;
        }

        .actions .approve {
          background: #15803d;
        }

        .actions .reject {
          background: #dc2626;
        }

        @media (max-width: 900px) {
          .toolbar {
            grid-template-columns: 1fr;
          }

          .actions {
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
          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}