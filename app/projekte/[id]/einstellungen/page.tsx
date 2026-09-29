"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  auftraggeber?: string | null;
  bauleiter?: string | null;
  status?: string | null;
  google_location?: string | null;
  google_maps?: string | null;
  google_maps_url?: string | null;
  info?: string | null;
  startdatum?: string | null;
  enddatum?: string | null;
  created_at?: string | null;
  [key: string]: any;
};

type ProjektConfig = {
  table: string;
};

type ProjektForm = {
  name: string;
  ort: string;
  adresse: string;
  auftraggeber: string;
  bauleiter: string;
  status: string;
  google_location: string;
  info: string;
  startdatum: string;
  enddatum: string;
};

const STATUS_LISTE = ["Aktiv", "Pausiert", "Fertig", "Archiv"];

export default function ProjektEinstellungenPage() {
  const params = useParams();
  const router = useRouter();

  const projektId = String(params.id);
  const projektIdValue = isNaN(Number(projektId))
    ? projektId
    : Number(projektId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [projektConfig, setProjektConfig] = useState<ProjektConfig>({
    table: "projekte",
  });

  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  const [form, setForm] = useState<ProjektForm>({
    name: "",
    ort: "",
    adresse: "",
    auftraggeber: "",
    bauleiter: "",
    status: "Aktiv",
    google_location: "",
    info: "",
    startdatum: "",
    enddatum: "",
  });

  useEffect(() => {
    loadProjekt();
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

  function getGoogleLocation(row: Projekt | null) {
    if (!row) return "";

    return (
      row.google_location ||
      row.google_maps ||
      row.google_maps_url ||
      row.maps_url ||
      row.location_url ||
      ""
    );
  }

  function getInfo(row: Projekt | null) {
    if (!row) return "";
    return row.info || row.beschreibung || row.description || row.notiz || row.note || "";
  }

  function fillForm(row: Projekt) {
    setForm({
      name:
        row.name ||
        row.naziv ||
        row.title ||
        row.projekt ||
        row.baustelle_name ||
        "",
      ort: row.ort || row.mjesto || row.location || "",
      adresse: row.adresse || row.address || "",
      auftraggeber: row.auftraggeber || row.kunde || row.client || "",
      bauleiter: row.bauleiter || row.site_manager || row.leiter || "",
      status: row.status || "Aktiv",
      google_location: getGoogleLocation(row),
      info: getInfo(row),
      startdatum: row.startdatum || row.start_date || "",
      enddatum: row.enddatum || row.end_date || "",
    });
  }

  async function loadProjekt() {
    setLoading(true);
    setErrorText("");
    setSuccessText("");

    const tables = ["projekte", "baustellen"];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", projektIdValue)
        .maybeSingle();

      if (!error && data) {
        setProjekt(data as Projekt);
        setProjektConfig({ table });
        fillForm(data as Projekt);
        setLoading(false);
        return;
      }
    }

    setProjekt(null);
    setErrorText("Projekt nije pronađen.");
    setLoading(false);
  }

  function buildPayloads() {
    return [
      {
        name: form.name.trim(),
        ort: form.ort.trim(),
        adresse: form.adresse.trim(),
        auftraggeber: form.auftraggeber.trim(),
        bauleiter: form.bauleiter.trim(),
        status: form.status,
        google_location: form.google_location.trim(),
        info: form.info.trim(),
        startdatum: form.startdatum || null,
        enddatum: form.enddatum || null,
      },
      {
        naziv: form.name.trim(),
        mjesto: form.ort.trim(),
        adresse: form.adresse.trim(),
        auftraggeber: form.auftraggeber.trim(),
        bauleiter: form.bauleiter.trim(),
        status: form.status,
        google_maps: form.google_location.trim(),
        info: form.info.trim(),
        startdatum: form.startdatum || null,
        enddatum: form.enddatum || null,
      },
      {
        title: form.name.trim(),
        location: form.ort.trim(),
        address: form.adresse.trim(),
        client: form.auftraggeber.trim(),
        site_manager: form.bauleiter.trim(),
        status: form.status,
        google_maps_url: form.google_location.trim(),
        description: form.info.trim(),
        start_date: form.startdatum || null,
        end_date: form.enddatum || null,
      },
      {
        baustelle_name: form.name.trim(),
        ort: form.ort.trim(),
        adresse: form.adresse.trim(),
        auftraggeber: form.auftraggeber.trim(),
        bauleiter: form.bauleiter.trim(),
        status: form.status,
      },
      {
        name: form.name.trim(),
        status: form.status,
      },
    ];
  }

  async function saveProjekt() {
    if (!form.name.trim()) {
      alert("Upiši naziv projekta.");
      return;
    }

    setSaving(true);
    setErrorText("");
    setSuccessText("");

    let lastError: any = null;

    for (const payload of buildPayloads()) {
      const { error } = await supabase
        .from(projektConfig.table)
        .update(payload as any)
        .eq("id", projektIdValue);

      if (!error) {
        setSaving(false);
        setSuccessText("Projekt je uspješno sačuvan.");
        await loadProjekt();
        return;
      }

      lastError = error;
    }

    setSaving(false);
    setErrorText("Greška kod spremanja: " + (lastError?.message || ""));
  }

  async function changeStatus(newStatus: string) {
    const ok = confirm(`Status projekta promijeniti na: ${newStatus}?`);

    if (!ok) return;

    setSaving(true);
    let lastError: any = null;

    const payloads = [
      { status: newStatus },
      { status: newStatus, abgeschlossen: newStatus === "Fertig" },
      { status: newStatus, archived: newStatus === "Archiv" },
    ];

    for (const payload of payloads) {
      const { error } = await supabase
        .from(projektConfig.table)
        .update(payload as any)
        .eq("id", projektIdValue);

      if (!error) {
        setSaving(false);
        await loadProjekt();
        setSuccessText(`Status promijenjen na ${newStatus}.`);
        return;
      }

      lastError = error;
    }

    setSaving(false);
    setErrorText("Greška kod statusa: " + (lastError?.message || ""));
  }

  async function deleteProjekt() {
    const first = confirm(
      "Da li stvarno želiš obrisati ovaj projekt? Ovo se ne može vratiti."
    );

    if (!first) return;

    const second = confirm(
      `Potvrdi još jednom brisanje projekta: ${getProjektName()}`
    );

    if (!second) return;

    const { error } = await supabase
      .from(projektConfig.table)
      .delete()
      .eq("id", projektIdValue);

    if (error) {
      alert("Greška kod brisanja projekta: " + error.message);
      return;
    }

    router.push("/projekte");
  }

  function openGoogleLocation() {
    const value = form.google_location.trim();

    if (!value) {
      alert("Google lokacija nije upisana.");
      return;
    }

    if (value.startsWith("http://") || value.startsWith("https://")) {
      window.open(value, "_blank");
      return;
    }

    const query = encodeURIComponent(value);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  }

  function copyProjectInfo() {
    const text = `
Projekt: ${form.name}
Ort: ${form.ort}
Adresse: ${form.adresse}
Auftraggeber: ${form.auftraggeber}
Bauleiter: ${form.bauleiter}
Status: ${form.status}
Google Location: ${form.google_location}
Info:
${form.info}
`.trim();

    navigator.clipboard.writeText(text);
    alert("Projekt informacije kopirane.");
  }

  return (
    <main className="page">
      <section className="top">
        <div>
          <Link className="back" href={`/projekte/${projektId}`}>
            ← Zurück zu Projekt
          </Link>

          <p className="label">Projekt Einstellungen</p>
          <h1>Einstellungen</h1>
          <p className="subtitle">
            {loading ? "Učitavanje..." : getProjektName()}
            {getProjektOrt() ? ` · ${getProjektOrt()}` : ""}
          </p>
        </div>

        <div className="topButtons">
          <button className="btn gray" onClick={loadProjekt}>
            Aktualisieren
          </button>

          <button className="btn blue" onClick={saveProjekt} disabled={saving}>
            {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </section>

      {errorText && <div className="errorBox">{errorText}</div>}
      {successText && <div className="successBox">{successText}</div>}

      {loading ? (
        <div className="emptyBox">Učitavanje Einstellungen...</div>
      ) : (
        <>
          <section className="stats">
            <div className="stat">
              <span>Status</span>
              <strong>{form.status}</strong>
            </div>

            <div className="stat">
              <span>Auftraggeber</span>
              <strong>{form.auftraggeber || "-"}</strong>
            </div>

            <div className="stat">
              <span>Bauleiter</span>
              <strong>{form.bauleiter || "-"}</strong>
            </div>
          </section>

          <section className="formBox">
            <h2>Grunddaten</h2>

            <label>Projekt Name *</label>
            <input
              value={form.name}
              onChange={(e) =>
                setForm((old) => ({ ...old, name: e.target.value }))
              }
              placeholder="Projekt Name"
            />

            <div className="twoGrid">
              <div>
                <label>Ort</label>
                <input
                  value={form.ort}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, ort: e.target.value }))
                  }
                  placeholder="Ort / mjesto"
                />
              </div>

              <div>
                <label>Status</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, status: e.target.value }))
                  }
                >
                  {STATUS_LISTE.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label>Adresse</label>
            <input
              value={form.adresse}
              onChange={(e) =>
                setForm((old) => ({ ...old, adresse: e.target.value }))
              }
              placeholder="Straße, Hausnummer..."
            />

            <div className="twoGrid">
              <div>
                <label>Startdatum</label>
                <input
                  type="date"
                  value={form.startdatum}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, startdatum: e.target.value }))
                  }
                />
              </div>

              <div>
                <label>Enddatum</label>
                <input
                  type="date"
                  value={form.enddatum}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, enddatum: e.target.value }))
                  }
                />
              </div>
            </div>
          </section>

          <section className="formBox">
            <h2>Auftraggeber / Bauleiter</h2>
            <p className="hint">
              Ovdje upišeš jednom. Ove informacije se koriste u Bericht,
              Auswertung i ostalim prikazima projekta.
            </p>

            <div className="twoGrid">
              <div>
                <label>Auftraggeber</label>
                <input
                  value={form.auftraggeber}
                  onChange={(e) =>
                    setForm((old) => ({
                      ...old,
                      auftraggeber: e.target.value,
                    }))
                  }
                  placeholder="Auftraggeber / Kunde"
                />
              </div>

              <div>
                <label>Bauleiter</label>
                <input
                  value={form.bauleiter}
                  onChange={(e) =>
                    setForm((old) => ({
                      ...old,
                      bauleiter: e.target.value,
                    }))
                  }
                  placeholder="Bauleiter"
                />
              </div>
            </div>
          </section>

          <section className="formBox">
            <h2>Google Location</h2>

            <label>Google Standort / Maps Link</label>
            <input
              value={form.google_location}
              onChange={(e) =>
                setForm((old) => ({
                  ...old,
                  google_location: e.target.value,
                }))
              }
              placeholder="Google Maps link ili adresa"
            />

            <div className="miniActions">
              <button onClick={openGoogleLocation}>📍 Google öffnen</button>
              <button onClick={copyProjectInfo}>Projekt Info kopieren</button>
            </div>
          </section>

          <section className="formBox">
            <h2>Baustelle Info</h2>

            <label>Info za projekt</label>
            <textarea
              value={form.info}
              onChange={(e) =>
                setForm((old) => ({ ...old, info: e.target.value }))
              }
              placeholder="Važne informacije za ovu Baustelle..."
            />
          </section>

          <section className="dangerBox">
            <h2>Admin Bereich</h2>
            <p>
              Ovdje možeš završiti, arhivirati ili obrisati projekt. Brisanje je
              trajno.
            </p>

            <div className="dangerActions">
              <button onClick={() => changeStatus("Fertig")}>
                Projekt abschließen
              </button>

              <button onClick={() => changeStatus("Archiv")}>
                Projekt archivieren
              </button>

              <button className="delete" onClick={deleteProjekt}>
                Projekt löschen
              </button>
            </div>
          </section>
        </>
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
        textarea,
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

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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
          font-weight: 800;
        }

        .stat strong {
          font-size: 24px;
          line-height: 1.25;
        }

        .formBox,
        .dangerBox {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 20px;
          margin-bottom: 18px;
        }

        .formBox h2,
        .dangerBox h2 {
          margin: 0 0 14px;
          font-size: 24px;
        }

        .hint {
          color: #cbd5e1;
          margin: -6px 0 16px;
          line-height: 1.5;
        }

        label {
          display: block;
          color: #d1d5db;
          font-weight: 800;
          margin: 14px 0 7px;
        }

        input,
        textarea,
        select {
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

        textarea {
          min-height: 150px;
          resize: vertical;
          line-height: 1.5;
        }

        .twoGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .miniActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 14px;
        }

        .miniActions button {
          background: #374151;
          color: white;
          border: 0;
          border-radius: 14px;
          padding: 13px 16px;
          font-weight: 900;
          cursor: pointer;
        }

        .dangerBox {
          border-color: #7f1d1d;
        }

        .dangerBox p {
          color: #fecaca;
          line-height: 1.5;
          margin: 0 0 14px;
        }

        .dangerActions {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }

        .dangerActions button {
          background: #374151;
          color: white;
          border: 0;
          border-radius: 14px;
          padding: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .dangerActions .delete {
          background: #dc2626;
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

        .successBox {
          background: #064e3b;
          border: 1px solid #16a34a;
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
          font-weight: 800;
        }

        @media (max-width: 900px) {
          .top {
            display: block;
          }

          .topButtons {
            margin-top: 16px;
            display: grid;
            grid-template-columns: 1fr;
          }

          .stats,
          .twoGrid,
          .dangerActions {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .page {
            padding: 16px;
          }

          h1 {
            font-size: 36px;
          }

          .formBox,
          .dangerBox {
            padding: 16px;
          }
        }
      `}</style>
    </main>
  );
}