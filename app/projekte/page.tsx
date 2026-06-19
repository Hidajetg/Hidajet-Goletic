"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

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

type Filter = "aktiv" | "fertig" | "alle";

export default function ProjektePage() {
  const [projekte, setProjekte] = useState<Projekt[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableName, setTableName] = useState<"projekte" | "baustellen">(
    "projekte"
  );
  const [errorText, setErrorText] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("aktiv");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    ort: "",
    adresse: "",
    auftraggeber: "",
    bauleiter: "",
    google_location: "",
    info: "",
  });

  useEffect(() => {
    loadProjekte();
  }, []);

  function getName(p: Projekt) {
    return (
      p.name ||
      p.naziv ||
      p.title ||
      p.projekt ||
      p.baustelle_name ||
      `Projekt ${p.id}`
    );
  }

  function getOrt(p: Projekt) {
    return p.ort || p.mjesto || p.location || p.adresse || "";
  }

  function getGoogleLink(p: Projekt) {
    return p.google_location || p.google_maps || "";
  }

  function isFertig(p: Projekt) {
    const s = String(p.status || "").toLowerCase();

    return (
      s.includes("fertig") ||
      s.includes("abgeschlossen") ||
      s.includes("closed") ||
      s.includes("zavrs") ||
      s.includes("završen") ||
      s.includes("zavrsen")
    );
  }

  async function loadProjekte() {
    setLoading(true);
    setErrorText("");

    const tables: Array<"projekte" | "baustellen"> = ["projekte", "baustellen"];

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select("*");

      if (!error) {
        const sorted = [...(data || [])].sort((a: Projekt, b: Projekt) => {
          const da = new Date(a.created_at || 0).getTime();
          const db = new Date(b.created_at || 0).getTime();
          return db - da;
        });

        setTableName(table);
        setProjekte(sorted);
        setLoading(false);
        return;
      }
    }

    setErrorText(
      "Ne mogu učitati projekte. Provjeri da li u Supabase postoji tabela projekte ili baustellen."
    );
    setProjekte([]);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return projekte.filter((p) => {
      const text = `
        ${getName(p)}
        ${getOrt(p)}
        ${p.auftraggeber || ""}
        ${p.bauleiter || ""}
        ${p.info || ""}
      `.toLowerCase();

      const searchOk = text.includes(search.toLowerCase());

      if (filter === "aktiv") return searchOk && !isFertig(p);
      if (filter === "fertig") return searchOk && isFertig(p);

      return searchOk;
    });
  }, [projekte, search, filter]);

  async function createProjekt() {
    const projektName = form.name.trim();

    if (!projektName) {
      alert("Upiši naziv projekta.");
      return;
    }

    setSaving(true);

    const payloads = [
      {
        name: projektName,
        ort: form.ort.trim(),
        adresse: form.adresse.trim(),
        auftraggeber: form.auftraggeber.trim(),
        bauleiter: form.bauleiter.trim(),
        google_location: form.google_location.trim(),
        info: form.info.trim(),
        status: "aktiv",
      },
      {
        name: projektName,
        ort: form.ort.trim(),
        auftraggeber: form.auftraggeber.trim(),
        bauleiter: form.bauleiter.trim(),
        status: "aktiv",
      },
      {
        name: projektName,
        ort: form.ort.trim(),
        status: "aktiv",
      },
      {
        name: projektName,
        location: form.ort.trim(),
        status: "aktiv",
      },
      {
        naziv: projektName,
        mjesto: form.ort.trim(),
        status: "aktiv",
      },
      {
        naziv: projektName,
        ort: form.ort.trim(),
        status: "aktiv",
      },
      {
        name: projektName,
      },
      {
        naziv: projektName,
      },
    ];

    let lastError: any = null;

    for (const payload of payloads) {
      const { error } = await supabase.from(tableName).insert(payload);

      if (!error) {
        setForm({
          name: "",
          ort: "",
          adresse: "",
          auftraggeber: "",
          bauleiter: "",
          google_location: "",
          info: "",
        });

        setShowForm(false);
        setSaving(false);
        await loadProjekte();
        return;
      }

      lastError = error;
    }

    setSaving(false);
    alert("Greška kod dodavanja projekta: " + (lastError?.message || ""));
  }

  async function changeStatus(p: Projekt) {
    const newStatus = isFertig(p) ? "aktiv" : "abgeschlossen";

    const { error } = await supabase
      .from(tableName)
      .update({ status: newStatus })
      .eq("id", p.id);

    if (error) {
      alert("Greška kod promjene statusa: " + error.message);
      return;
    }

    await loadProjekte();
  }

  async function deleteProjekt(p: Projekt) {
    const ok = confirm(`Da li stvarno želiš obrisati projekt: ${getName(p)}?`);

    if (!ok) return;

    const { error } = await supabase.from(tableName).delete().eq("id", p.id);

    if (error) {
      alert("Greška kod brisanja: " + error.message);
      return;
    }

    await loadProjekte();
  }

  return (
    <main className="page">
      <section className="header">
        <div>
          <p className="label">Dashboard</p>
          <h1>Projekte</h1>
          <p className="subtitle">
            Pregled projekata, prostorija, sati, slika, materijala i izvještaja.
          </p>
        </div>

        <div className="headerButtons">
          <button className="btn gray" onClick={loadProjekte}>
            Aktualisieren
          </button>

          <button className="btn blue" onClick={() => setShowForm(true)}>
            + Neues Projekt
          </button>
        </div>
      </section>

      <section className="stats">
        <div className="stat">
          <span>Ukupno</span>
          <strong>{projekte.length}</strong>
        </div>

        <div className="stat">
          <span>Aktiv</span>
          <strong>{projekte.filter((p) => !isFertig(p)).length}</strong>
        </div>

        <div className="stat">
          <span>Fertig</span>
          <strong>{projekte.filter((p) => isFertig(p)).length}</strong>
        </div>
      </section>

      <section className="toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Traži projekt, mjesto, Auftraggeber ili Bauleiter..."
        />

        <div className="filterButtons">
          <button
            onClick={() => setFilter("aktiv")}
            className={filter === "aktiv" ? "active" : ""}
          >
            Aktiv
          </button>

          <button
            onClick={() => setFilter("fertig")}
            className={filter === "fertig" ? "active" : ""}
          >
            Fertig
          </button>

          <button
            onClick={() => setFilter("alle")}
            className={filter === "alle" ? "active" : ""}
          >
            Alle
          </button>
        </div>
      </section>

      {errorText && <div className="errorBox">{errorText}</div>}

      {loading ? (
        <div className="emptyBox">Učitavanje...</div>
      ) : filtered.length === 0 ? (
        <div className="emptyBox">
          <h2>Nema projekata</h2>
          <p>Dodaj novi projekt ili promijeni filter.</p>
        </div>
      ) : (
        <section className="grid">
          {filtered.map((p) => (
            <article key={p.id} className="card">
              <div className="cardTop">
                <div>
                  <h2>{getName(p)}</h2>
                  <p>{getOrt(p) || "Ort nije upisan"}</p>
                </div>

                <span className={isFertig(p) ? "badge done" : "badge"}>
                  {isFertig(p) ? "Fertig" : "Aktiv"}
                </span>
              </div>

              {(p.auftraggeber || p.bauleiter) && (
                <div className="details">
                  {p.auftraggeber && <p>Auftraggeber: {p.auftraggeber}</p>}
                  {p.bauleiter && <p>Bauleiter: {p.bauleiter}</p>}
                </div>
              )}

              {p.info && <div className="info">{p.info}</div>}

              {getGoogleLink(p) && (
                <a
                  className="mapButton"
                  href={getGoogleLink(p)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Google Standort öffnen
                </a>
              )}

              <Link className="openButton" href={`/projekte/${p.id}`}>
                Projekt öffnen
              </Link>

              <div className="modules">
                <Link href={`/projekte/${p.id}/raeume`}>Räume</Link>
                <Link href={`/projekte/${p.id}/arbeitszeit`}>Arbeitszeit</Link>
                <Link href={`/projekte/${p.id}/tagesbericht`}>
                  Tagesbericht
                </Link>
                <Link href={`/projekte/${p.id}/fotos`}>Fotos</Link>
                <Link href={`/projekte/${p.id}/material`}>Material</Link>
                <Link href={`/projekte/${p.id}/aufgaben`}>Aufgaben</Link>
                <Link href={`/projekte/${p.id}/positionen`}>Positionen</Link>
                <Link href={`/projekte/${p.id}/auswertung`}>Auswertung</Link>
                <Link href={`/projekte/${p.id}/bericht`}>Bericht</Link>
                <Link href={`/projekte/${p.id}/einstellungen`}>
                  Einstellungen
                </Link>
              </div>

              <div className="adminActions">
                <button onClick={() => changeStatus(p)}>
                  {isFertig(p) ? "Wieder aktiv" : "Abschließen"}
                </button>

                <button className="delete" onClick={() => deleteProjekt(p)}>
                  Löschen
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {showForm && (
        <div className="modalBg">
          <div className="modal">
            <div className="modalHead">
              <h2>Neues Projekt</h2>
              <button onClick={() => setShowForm(false)}>×</button>
            </div>

            <label>Projektname *</label>
            <input
              value={form.name}
              onChange={(e) =>
                setForm((old) => ({ ...old, name: e.target.value }))
              }
              placeholder="z.B. Baustelle München"
            />

            <label>Ort</label>
            <input
              value={form.ort}
              onChange={(e) =>
                setForm((old) => ({ ...old, ort: e.target.value }))
              }
              placeholder="z.B. München"
            />

            <label>Adresse</label>
            <input
              value={form.adresse}
              onChange={(e) =>
                setForm((old) => ({ ...old, adresse: e.target.value }))
              }
              placeholder="Straße und Hausnummer"
            />

            <label>Auftraggeber</label>
            <input
              value={form.auftraggeber}
              onChange={(e) =>
                setForm((old) => ({
                  ...old,
                  auftraggeber: e.target.value,
                }))
              }
              placeholder="Auftraggeber"
            />

            <label>Bauleiter</label>
            <input
              value={form.bauleiter}
              onChange={(e) =>
                setForm((old) => ({ ...old, bauleiter: e.target.value }))
              }
              placeholder="Bauleiter"
            />

            <label>Google Standort / Google Maps Link</label>
            <input
              value={form.google_location}
              onChange={(e) =>
                setForm((old) => ({
                  ...old,
                  google_location: e.target.value,
                }))
              }
              placeholder="Google Maps Link"
            />

            <label>Info</label>
            <textarea
              value={form.info}
              onChange={(e) =>
                setForm((old) => ({ ...old, info: e.target.value }))
              }
              placeholder="Kratka informacija za Baustelle"
            />

            <div className="modalActions">
              <button className="cancel" onClick={() => setShowForm(false)}>
                Abbrechen
              </button>

              <button className="save" onClick={createProjekt} disabled={saving}>
                {saving ? "Speichern..." : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #050505;
          color: white;
          padding: 28px;
          font-family: Arial, sans-serif;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 22px;
        }

        .label {
          color: #9ca3af;
          margin: 0 0 8px;
          font-size: 14px;
          font-weight: 700;
        }

        h1 {
          margin: 0;
          font-size: 44px;
          line-height: 1;
        }

        .subtitle {
          color: #cbd5e1;
          margin: 12px 0 0;
          max-width: 720px;
        }

        .headerButtons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        button,
        a,
        input,
        textarea {
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
          font-weight: 800;
          cursor: pointer;
        }

        .gray {
          background: #374151;
        }

        .blue {
          background: #2563eb;
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
          font-weight: 700;
        }

        .stat strong {
          font-size: 34px;
        }

        .toolbar {
          display: flex;
          gap: 12px;
          margin-bottom: 22px;
        }

        .toolbar input {
          flex: 1;
          background: #111827;
          color: white;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 15px 16px;
          font-size: 16px;
          outline: none;
        }

        .filterButtons {
          display: flex;
          gap: 8px;
        }

        .filterButtons button {
          background: #111827;
          color: white;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 12px 16px;
          font-weight: 800;
          cursor: pointer;
        }

        .filterButtons button.active {
          background: #2563eb;
          border-color: #2563eb;
        }

        .errorBox {
          background: #7f1d1d;
          border: 1px solid #ef4444;
          color: white;
          padding: 16px;
          border-radius: 14px;
          margin-bottom: 18px;
          font-weight: 700;
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
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 18px;
        }

        .card {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 22px;
          padding: 20px;
          box-shadow: 0 12px 38px rgba(0, 0, 0, 0.3);
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 14px;
        }

        .cardTop h2 {
          margin: 0;
          font-size: 24px;
        }

        .cardTop p {
          margin: 8px 0 0;
          color: #cbd5e1;
        }

        .badge {
          background: #064e3b;
          color: #bbf7d0;
          border: 1px solid #16a34a;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
        }

        .badge.done {
          background: #374151;
          color: #e5e7eb;
          border-color: #6b7280;
        }

        .details {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 12px;
          margin-bottom: 12px;
        }

        .details p {
          margin: 5px 0;
          color: #d1d5db;
          font-size: 14px;
        }

        .info {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 12px;
          color: #d1d5db;
          margin-bottom: 12px;
          line-height: 1.4;
        }

        .mapButton {
          display: block;
          text-align: center;
          text-decoration: none;
          background: #15803d;
          color: white;
          border-radius: 14px;
          padding: 13px;
          font-weight: 900;
          margin-bottom: 12px;
        }

        .openButton {
          display: block;
          text-align: center;
          text-decoration: none;
          background: #dc2626;
          color: white;
          border-radius: 16px;
          padding: 15px;
          font-weight: 900;
          margin-bottom: 14px;
        }

        .modules {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .modules a {
          background: #1f2937;
          border: 1px solid #374151;
          color: white;
          text-decoration: none;
          text-align: center;
          border-radius: 14px;
          padding: 13px 10px;
          font-weight: 800;
        }

        .adminActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid #1f2937;
        }

        .adminActions button {
          border: 0;
          border-radius: 14px;
          padding: 13px;
          background: #374151;
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .adminActions .delete {
          background: #dc2626;
        }

        .modalBg {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.78);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 16px;
          z-index: 100;
        }

        .modal {
          width: 100%;
          max-width: 620px;
          max-height: 92vh;
          overflow: auto;
          background: #111827;
          border: 1px solid #374151;
          border-radius: 22px;
          padding: 22px;
        }

        .modalHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .modalHead h2 {
          margin: 0;
          font-size: 28px;
        }

        .modalHead button {
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 12px;
          background: #374151;
          color: white;
          font-size: 28px;
          cursor: pointer;
        }

        label {
          display: block;
          color: #d1d5db;
          font-weight: 800;
          margin: 14px 0 7px;
        }

        .modal input,
        .modal textarea {
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

        .modal textarea {
          min-height: 90px;
          resize: vertical;
        }

        .modalActions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }

        .modalActions button {
          border: 0;
          border-radius: 14px;
          padding: 14px 18px;
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .cancel {
          background: #374151;
        }

        .save {
          background: #2563eb;
        }

        .save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 760px) {
          .page {
            padding: 16px;
          }

          .header {
            display: block;
          }

          h1 {
            font-size: 36px;
          }

          .headerButtons {
            margin-top: 16px;
            display: grid;
            grid-template-columns: 1fr;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .toolbar {
            display: block;
          }

          .toolbar input {
            width: 100%;
            box-sizing: border-box;
            margin-bottom: 10px;
          }

          .filterButtons {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
          }

          .grid {
            grid-template-columns: 1fr;
          }

          .modules {
            grid-template-columns: 1fr;
          }

          .adminActions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}