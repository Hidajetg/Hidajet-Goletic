"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  auftraggeber?: string | null;
  bauleiter?: string | null;
  google_location?: string | null;
  google_maps?: string | null;
  google_maps_url?: string | null;
  info?: string | null;
  [key: string]: any;
};

const RADNICI = [
  { name: "Arnes", pin: "1111" },
  { name: "Ramiz", pin: "2222" },
  { name: "Abror", pin: "3333" },
  { name: "Shohruh", pin: "4444" },
  { name: "Harun", pin: "5555" },
];

export default function RadnikLinkAdminPage() {
  const params = useParams();

  const projektId = String(params.id);
  const projektIdValue = isNaN(Number(projektId))
    ? projektId
    : Number(projektId);

  const [loading, setLoading] = useState(true);
  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [origin, setOrigin] = useState("");
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }

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

  function getGoogleLocation() {
    if (!projekt) return "";

    return (
      projekt.google_location ||
      projekt.google_maps ||
      projekt.google_maps_url ||
      projekt.maps_url ||
      projekt.location_url ||
      ""
    );
  }

  function getWorkerLink() {
    if (!origin) return `/projekte/radnik/${projektId}`;
    return `${origin}/projekte/radnik/${projektId}`;
  }

  async function loadProjekt() {
    setLoading(true);
    setErrorText("");
    setMessage("");

    const tables = ["projekte", "baustellen"];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", projektIdValue)
        .maybeSingle();

      if (!error && data) {
        setProjekt(data as Projekt);
        setLoading(false);
        return;
      }
    }

    setProjekt(null);
    setErrorText("Projekt nije pronađen.");
    setLoading(false);
  }

  async function copyLink() {
    const link = getWorkerLink();

    try {
      await navigator.clipboard.writeText(link);
      setMessage("Link za radnike je kopiran.");
    } catch {
      setErrorText("Ne mogu kopirati link. Označi link ručno i kopiraj.");
    }
  }

  async function shareLink() {
    const link = getWorkerLink();

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Radnik App - ${getProjektName()}`,
          text: `Link za unos radnika: ${getProjektName()}`,
          url: link,
        });
      } else {
        await copyLink();
      }
    } catch {
      setErrorText("Dijeljenje nije uspjelo.");
    }
  }

  function openWorkerApp() {
    window.open(getWorkerLink(), "_blank");
  }

  function openGoogleLocation() {
    const value = getGoogleLocation();

    if (!value) {
      alert("Google lokacija nije upisana u Einstellungen.");
      return;
    }

    if (value.startsWith("http://") || value.startsWith("https://")) {
      window.open(value, "_blank");
      return;
    }

    const query = encodeURIComponent(value);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  }

  function copyInstruction() {
    const text = `
Radnik App
Projekt: ${getProjektName()}
Ort: ${getProjektOrt() || "-"}
Link: ${getWorkerLink()}

Uputstvo:
1. Otvori link na telefonu.
2. Odaberi svoje ime.
3. Arbeitszeit je standardno 08:00 - 17:00 sa 30 minuta pauze.
4. Unesi šta je urađeno pod Leistung.
5. Za dodatne radove koristi Regie.
6. Slike se dodaju preko Fotos.
`.trim();

    navigator.clipboard.writeText(text);
    setMessage("Uputstvo je kopirano.");
  }

  return (
    <main className="page">
      <section className="top">
        <div>
          <Link className="back" href={`/projekte/${projektId}`}>
            ← Zurück zu Projekt
          </Link>

          <p className="label">Radnik Mobile Link</p>
          <h1>Radnik App</h1>
          <p className="subtitle">
            {loading ? "Učitavanje..." : getProjektName()}
            {getProjektOrt() ? ` · ${getProjektOrt()}` : ""}
          </p>
        </div>

        <div className="topButtons">
          <button className="btn gray" onClick={loadProjekt}>
            Aktualisieren
          </button>

          <button className="btn blue" onClick={openWorkerApp}>
            Radnik App öffnen
          </button>
        </div>
      </section>

      {message && <div className="successBox">{message}</div>}
      {errorText && <div className="errorBox">{errorText}</div>}

      <section className="heroBox">
        <div>
          <p className="smallLabel">Link za telefon</p>
          <h2>{getWorkerLink()}</h2>
          <p>
            Ovaj link pošalji radnicima. Radnik otvara link na telefonu i odmah
            može unositi Arbeitszeit, Leistung i Regie.
          </p>
        </div>

        <div className="heroActions">
          <button onClick={copyLink}>Link kopieren</button>
          <button onClick={shareLink}>Teilen</button>
          <button onClick={copyInstruction}>Uputstvo kopieren</button>
        </div>
      </section>

      <section className="projectBox">
        <h2>Projekt Informationen</h2>

        <div className="infoGrid">
          <div>
            <span>Projekt</span>
            <strong>{getProjektName()}</strong>
          </div>

          <div>
            <span>Ort</span>
            <strong>{getProjektOrt() || "-"}</strong>
          </div>

          <div>
            <span>Auftraggeber</span>
            <strong>{projekt?.auftraggeber || "-"}</strong>
          </div>

          <div>
            <span>Bauleiter</span>
            <strong>{projekt?.bauleiter || "-"}</strong>
          </div>
        </div>

        <div className="miniActions">
          <button onClick={openGoogleLocation}>📍 Google Location öffnen</button>

          <Link href={`/projekte/${projektId}/einstellungen`}>
            Einstellungen öffnen
          </Link>
        </div>
      </section>

      <section className="workerBox">
        <h2>Radnici</h2>
        <p>
          PIN ostaje isti kao prije. Na mobilnoj stranici radnik samo odabere ime,
          da unos bude brz.
        </p>

        <div className="workerGrid">
          {RADNICI.map((worker) => (
            <div key={worker.name}>
              <strong>{worker.name}</strong>
              <span>PIN {worker.pin}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="stepsBox">
        <h2>Kako radnik koristi</h2>

        <div className="steps">
          <div>
            <span>1</span>
            <strong>Otvori link</strong>
            <p>Radnik otvori link na telefonu.</p>
          </div>

          <div>
            <span>2</span>
            <strong>Odabere ime</strong>
            <p>Ime se pamti na telefonu za sljedeći unos.</p>
          </div>

          <div>
            <span>3</span>
            <strong>Arbeitszeit</strong>
            <p>Standardno 08:00 - 17:00 i 30 minuta pauze.</p>
          </div>

          <div>
            <span>4</span>
            <strong>Leistung / Regie</strong>
            <p>Unosi urađeni rad ili dodatni Regie rad.</p>
          </div>
        </div>
      </section>

      <section className="moduleBox">
        <h2>Schnelle Admin Links</h2>

        <div className="moduleGrid">
          <Link href={`/projekte/${projektId}/arbeitszeit`}>
            ⏱️ Arbeitszeit
          </Link>

          <Link href={`/projekte/${projektId}/leistung`}>
            📈 Leistung
          </Link>

          <Link href={`/projekte/${projektId}/regie`}>
            🧾 Regie
          </Link>

          <Link href={`/projekte/${projektId}/fotos`}>
            📸 Fotos
          </Link>

          <Link href={`/projekte/${projektId}/freigabe`}>
            🔍 Freigabe
          </Link>

          <Link href={`/projekte/${projektId}/bericht`}>
            🖨️ Bericht
          </Link>
        </div>
      </section>

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
        }

        .gray {
          background: #374151;
        }

        .blue {
          background: #2563eb;
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

        .errorBox {
          background: #7f1d1d;
          border: 1px solid #ef4444;
          color: white;
          padding: 16px;
          border-radius: 14px;
          margin-bottom: 18px;
          font-weight: 800;
        }

        .heroBox,
        .projectBox,
        .workerBox,
        .stepsBox,
        .moduleBox {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 18px;
        }

        .heroBox {
          display: grid;
          grid-template-columns: 1fr 260px;
          gap: 18px;
          align-items: start;
          border-color: #2563eb;
        }

        .smallLabel {
          color: #93c5fd;
          margin: 0 0 8px;
          font-weight: 900;
          font-size: 13px;
        }

        .heroBox h2 {
          margin: 0;
          font-size: 22px;
          line-height: 1.35;
          word-break: break-all;
          background: #030712;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 14px;
        }

        .heroBox p,
        .workerBox p {
          color: #cbd5e1;
          line-height: 1.5;
          margin: 12px 0 0;
        }

        .heroActions {
          display: grid;
          gap: 10px;
        }

        .heroActions button,
        .miniActions button,
        .miniActions a,
        .moduleGrid a {
          border: 0;
          background: #2563eb;
          color: white;
          border-radius: 14px;
          padding: 14px 16px;
          font-weight: 900;
          cursor: pointer;
          text-decoration: none;
          text-align: center;
        }

        .heroActions button:nth-child(2) {
          background: #15803d;
        }

        .heroActions button:nth-child(3) {
          background: #374151;
        }

        .projectBox h2,
        .workerBox h2,
        .stepsBox h2,
        .moduleBox h2 {
          margin: 0 0 14px;
          font-size: 24px;
        }

        .infoGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .infoGrid div,
        .workerGrid div,
        .steps div {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 14px;
        }

        .infoGrid span {
          display: block;
          color: #9ca3af;
          font-weight: 800;
          margin-bottom: 6px;
          font-size: 13px;
        }

        .infoGrid strong {
          color: white;
          font-size: 17px;
          line-height: 1.35;
        }

        .miniActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 14px;
        }

        .miniActions button {
          background: #15803d;
        }

        .miniActions a {
          background: #374151;
        }

        .workerGrid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin-top: 14px;
        }

        .workerGrid strong {
          display: block;
          font-size: 19px;
          margin-bottom: 6px;
        }

        .workerGrid span {
          color: #bbf7d0;
          font-weight: 900;
        }

        .steps {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .steps span {
          display: inline-flex;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          background: #2563eb;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          margin-bottom: 10px;
        }

        .steps strong {
          display: block;
          font-size: 18px;
          margin-bottom: 8px;
        }

        .steps p {
          color: #cbd5e1;
          margin: 0;
          line-height: 1.45;
        }

        .moduleGrid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 10px;
        }

        .moduleGrid a {
          background: #1f2937;
          border: 1px solid #374151;
        }

        @media (max-width: 1000px) {
          .heroBox,
          .infoGrid,
          .workerGrid,
          .steps,
          .moduleGrid {
            grid-template-columns: 1fr 1fr;
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

          .heroBox,
          .infoGrid,
          .workerGrid,
          .steps,
          .moduleGrid {
            grid-template-columns: 1fr;
          }

          .miniActions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .heroBox h2 {
            font-size: 17px;
          }
        }
      `}</style>
    </main>
  );
}