"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";

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
  [key: string]: any;
};

type TableConfig = {
  table: string;
  column: string;
};

export default function RegieQrPdfPage() {
  const params = useParams();

  const projektId = String(params.id);
  const regieId = String(params.regieId);

  const projektIdValue = isNaN(Number(projektId))
    ? projektId
    : Number(projektId);

  const regieIdValue = isNaN(Number(regieId)) ? regieId : Number(regieId);

  const [loading, setLoading] = useState(true);
  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [regie, setRegie] = useState<any>(null);
  const [unterschrift, setUnterschrift] = useState<any>(null);
  const [origin, setOrigin] = useState("");
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  const [regieConfig, setRegieConfig] = useState<TableConfig>({
    table: "regie",
    column: "projekt_id",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }

    loadAll();
  }, [projektId, regieId]);

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

  function getProjektAdresse() {
    if (!projekt) return "";
    return projekt.adresse || projekt.address || "";
  }

  function getAuftraggeber() {
    if (!projekt) return "";
    return projekt.auftraggeber || projekt.kunde || projekt.client || "";
  }

  function getBauleiter() {
    if (!projekt) return "";
    return projekt.bauleiter || projekt.site_manager || projekt.leiter || "";
  }

  function getDate(row: any) {
    return row?.datum || row?.date || row?.tag || row?.day || "";
  }

  function getWorker(row: any) {
    return (
      row?.radnik ||
      row?.arbeiter ||
      row?.worker ||
      row?.worker_name ||
      row?.mitarbeiter ||
      row?.name ||
      ""
    );
  }

  function getWork(row: any) {
    return (
      row?.arbeit ||
      row?.regiearbeit ||
      row?.titel ||
      row?.title ||
      row?.leistung ||
      row?.work ||
      row?.name ||
      ""
    );
  }

  function getDescription(row: any) {
    return (
      row?.beschreibung ||
      row?.description ||
      row?.arbeiten ||
      row?.work_done ||
      row?.text ||
      ""
    );
  }

  function getStart(row: any) {
    return row?.start_time || row?.start || row?.von || row?.beginn || "";
  }

  function getEnd(row: any) {
    return row?.end_time || row?.end || row?.bis || row?.ende || "";
  }

  function getPause(row: any) {
    return row?.pause_minuten || row?.pause_minutes || row?.break_minutes || row?.pause || 0;
  }

  function getStoredHours(row: any) {
    return row?.stunden || row?.hours || row?.total_hours || row?.gesamt_stunden || "";
  }

  function getMaterial(row: any) {
    return row?.material || row?.materialien || row?.material_text || "";
  }

  function getPrice(row: any) {
    return row?.preis || row?.price || row?.betrag || row?.amount || row?.kosten || "";
  }

  function getStatus(row: any) {
    return row?.status || "Offen";
  }

  function getFreigabe(row: any) {
    const raw = row?.freigabe_status || row?.approval_status || row?.freigabe || "";

    if (raw === true) return "Freigegeben";
    if (raw === false) return "Wartet";

    return raw || "Wartet";
  }

  function getBauleiterName() {
    return (
      unterschrift?.bauleiter_name ||
      regie?.bauleiter_name ||
      getBauleiter() ||
      ""
    );
  }

  function getSignatureImage() {
    return (
      unterschrift?.signature_url ||
      unterschrift?.signature_data ||
      regie?.signature_url ||
      regie?.signature_data ||
      ""
    );
  }

  function getSignedAt() {
    return (
      unterschrift?.signed_at ||
      regie?.signed_at ||
      regie?.unterschrieben_am ||
      ""
    );
  }

  function isSigned() {
    return Boolean(getSignatureImage() || getSignedAt());
  }

  function getScheinUrl() {
    if (!origin) {
      return `/projekte/${projektId}/regie/${regieId}/unterschrift`;
    }

    return `${origin}/projekte/${projektId}/regie/${regieId}/unterschrift`;
  }

  function getQrImageUrl() {
    const target = encodeURIComponent(getScheinUrl());

    return `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${target}`;
  }

  function toNumber(value: any) {
    const n = Number(String(value || "0").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function formatHours(value: any) {
    const n = toNumber(value);
    return n.toFixed(2).replace(".", ",") + " h";
  }

  function formatMoney(value: any) {
    const n = toNumber(value);
    return n.toFixed(2).replace(".", ",") + " €";
  }

  function parseTimeToMinutes(value: string) {
    if (!value || !value.includes(":")) return 0;

    const [h, m] = value.split(":").map((x) => Number(x));
    return h * 60 + m;
  }

  function calculateHours(start: string, end: string, pause: string | number) {
    const s = parseTimeToMinutes(start);
    let e = parseTimeToMinutes(end);
    const p = Number(pause || 0);

    if (!s || !e) return 0;
    if (e < s) e += 24 * 60;

    const total = e - s - p;
    return Math.max(0, total / 60);
  }

  function getHours(row: any) {
    const stored = toNumber(getStoredHours(row));

    if (stored > 0) return stored;

    return calculateHours(getStart(row), getEnd(row), getPause(row));
  }

  function formatDate(value: any) {
    if (!value) return "-";

    try {
      return new Date(value).toLocaleDateString("de-DE");
    } catch {
      return String(value);
    }
  }

  async function loadAll() {
    setLoading(true);
    setMessage("");
    setErrorText("");

    await loadProjekt();
    await loadRegie();
    await loadUnterschrift();

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

  async function loadRegie() {
    const configs: TableConfig[] = [
      { table: "regie", column: "projekt_id" },
      { table: "regie", column: "project_id" },
      { table: "regie", column: "baustelle_id" },
      { table: "regiearbeiten", column: "projekt_id" },
      { table: "regiearbeiten", column: "project_id" },
      { table: "projekt_regie", column: "projekt_id" },
      { table: "zusatzarbeiten", column: "projekt_id" },
      { table: "extra_work", column: "project_id" },
    ];

    for (const config of configs) {
      const { data, error } = await supabase
        .from(config.table)
        .select("*")
        .eq("id", regieIdValue)
        .maybeSingle();

      if (!error && data) {
        setRegie(data);
        setRegieConfig(config);
        return;
      }
    }

    setRegie(null);
    setErrorText("Regie unos nije pronađen.");
  }

  async function loadUnterschrift() {
    const { data, error } = await supabase
      .from("regie_unterschriften")
      .select("*")
      .eq("regie_id", regieId)
      .order("signed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setUnterschrift(data);
    }
  }

  async function saveQrLink() {
    const qrUrl = getQrImageUrl();
    const scheinUrl = getScheinUrl();

    const signatureUpdate = {
      qr_url: qrUrl,
      pdf_url: scheinUrl,
    };

    await supabase
      .from("regie_unterschriften")
      .update(signatureUpdate as any)
      .eq("regie_id", regieId);

    const payloads = [
      {
        qr_url: qrUrl,
        pdf_url: scheinUrl,
      },
      {
        qr_url: qrUrl,
      },
    ];

    for (const payload of payloads) {
      const { error } = await supabase
        .from(regieConfig.table)
        .update(payload as any)
        .eq("id", regieIdValue);

      if (!error) {
        setMessage("QR/PDF link je sačuvan u Regie.");
        await loadAll();
        return;
      }
    }

    setMessage("QR link je spremljen u Unterschriften tabelu.");
    await loadAll();
  }

  async function copyScheinLink() {
    try {
      await navigator.clipboard.writeText(getScheinUrl());
      setMessage("Link za Regieschein je kopiran.");
    } catch {
      setErrorText("Ne mogu kopirati link.");
    }
  }

  async function shareScheinLink() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Regieschein ${regieId}`,
          text: `Regieschein ${getProjektName()}`,
          url: getScheinUrl(),
        });
      } else {
        await copyScheinLink();
      }
    } catch {
      setErrorText("Dijeljenje nije uspjelo.");
    }
  }

  function openSchein() {
    window.open(getScheinUrl(), "_blank");
  }

  function printPage() {
    window.print();
  }

  return (
    <main className="page">
      <section className="top noPrint">
        <div>
          <Link className="back" href={`/projekte/${projektId}/regie`}>
            ← Zurück zu Regie
          </Link>

          <p className="label">Regie QR / PDF</p>
          <h1>QR / PDF</h1>
          <p className="subtitle">
            {getProjektName()}
            {getProjektOrt() ? ` · ${getProjektOrt()}` : ""}
          </p>
        </div>

        <div className="topButtons">
          <button className="btn gray" onClick={loadAll}>
            Aktualisieren
          </button>

          <button className="btn green" onClick={saveQrLink}>
            QR Link speichern
          </button>

          <button className="btn blue" onClick={printPage}>
            Drucken / PDF
          </button>
        </div>
      </section>

      {message && <div className="successBox noPrint">{message}</div>}
      {errorText && <div className="errorBox noPrint">{errorText}</div>}

      {loading ? (
        <div className="emptyBox">Učitavanje QR / PDF...</div>
      ) : !regie ? (
        <div className="emptyBox">Regie unos nije pronađen.</div>
      ) : (
        <>
          <section className="qrPanel noPrint">
            <div className="qrBox">
              <img src={getQrImageUrl()} alt="Regieschein QR Code" />
            </div>

            <div className="qrInfo">
              <p className="smallLabel">Regieschein Link</p>
              <h2>{getScheinUrl()}</h2>

              <p>
                QR kod vodi direktno na potpisani Regieschein. Kada se otvori
                Regieschein, može se preuzeti kao PDF preko dugmeta
                <b> Drucken / PDF</b>.
              </p>

              <div className="qrActions">
                <button onClick={openSchein}>Regieschein öffnen</button>
                <button onClick={copyScheinLink}>Link kopieren</button>
                <button onClick={shareScheinLink}>Teilen</button>
              </div>
            </div>
          </section>

          <section className="paper">
            <div className="paperHeader">
              <div>
                <p className="company">Regieschein QR Nachweis</p>
                <h2>Regieschein / Zusatzarbeiten</h2>
                <p>QR Code für digitalen Regieschein</p>
              </div>

              <div className="paperNumber">
                <span>Regie Nr.</span>
                <strong>{regieId}</strong>
              </div>
            </div>

            <section className="paperGrid">
              <div>
                <span>Projekt</span>
                <strong>{getProjektName()}</strong>
              </div>

              <div>
                <span>Ort</span>
                <strong>{getProjektOrt() || "-"}</strong>
              </div>

              <div>
                <span>Adresse</span>
                <strong>{getProjektAdresse() || "-"}</strong>
              </div>

              <div>
                <span>Auftraggeber</span>
                <strong>{getAuftraggeber() || "-"}</strong>
              </div>

              <div>
                <span>Bauleiter</span>
                <strong>{getBauleiterName() || getBauleiter() || "-"}</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>{isSigned() ? "Unterschrieben" : getFreigabe(regie)}</strong>
              </div>
            </section>

            <section className="section">
              <h3>Regiearbeit</h3>

              <table>
                <tbody>
                  <tr>
                    <th>Datum</th>
                    <td>{formatDate(getDate(regie))}</td>
                  </tr>

                  <tr>
                    <th>Arbeiter</th>
                    <td>{getWorker(regie) || "-"}</td>
                  </tr>

                  <tr>
                    <th>Arbeit</th>
                    <td>{getWork(regie) || "-"}</td>
                  </tr>

                  <tr>
                    <th>Beschreibung</th>
                    <td className="pre">{getDescription(regie) || "-"}</td>
                  </tr>

                  <tr>
                    <th>Zeit</th>
                    <td>
                      {getStart(regie) || "-"} bis {getEnd(regie) || "-"} · Pause{" "}
                      {getPause(regie) || 0} min
                    </td>
                  </tr>

                  <tr>
                    <th>Stunden</th>
                    <td>{formatHours(getHours(regie))}</td>
                  </tr>

                  <tr>
                    <th>Material</th>
                    <td className="pre">{getMaterial(regie) || "-"}</td>
                  </tr>

                  <tr>
                    <th>Betrag</th>
                    <td>{formatMoney(getPrice(regie))}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="section qrPrintSection">
              <h3>QR Code</h3>

              <div className="qrPrintGrid">
                <div className="qrPrint">
                  <img src={getQrImageUrl()} alt="Regieschein QR Code" />
                </div>

                <div>
                  <p>
                    Dieser QR Code öffnet den digitalen Regieschein mit
                    Unterschrift und Regie-Nachweis.
                  </p>

                  <p className="printLink">{getScheinUrl()}</p>

                  <div className={isSigned() ? "signedStatus ok" : "signedStatus warn"}>
                    {isSigned()
                      ? `Unterschrieben am ${formatDate(getSignedAt())}`
                      : "Noch nicht unterschrieben"}
                  </div>
                </div>
              </div>
            </section>

            {getSignatureImage() && (
              <section className="section">
                <h3>Unterschrift</h3>

                <div className="signatureBox">
                  <div>
                    <span>Name Bauleiter</span>
                    <strong>{getBauleiterName() || "-"}</strong>
                  </div>

                  <div>
                    <span>Datum</span>
                    <strong>{formatDate(getSignedAt())}</strong>
                  </div>

                  <img src={getSignatureImage()} alt="Unterschrift Bauleiter" />
                </div>
              </section>
            )}
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
        }

        .gray {
          background: #374151;
        }

        .green {
          background: #15803d;
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

        .emptyBox {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 30px;
          text-align: center;
          color: #cbd5e1;
          font-weight: 800;
        }

        .qrPanel {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 20px;
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 22px;
          padding: 22px;
          max-width: 1000px;
          margin: 0 auto 22px;
        }

        .qrBox {
          background: white;
          border-radius: 18px;
          padding: 18px;
        }

        .qrBox img {
          display: block;
          width: 100%;
          height: auto;
        }

        .smallLabel {
          color: #93c5fd;
          margin: 0 0 8px;
          font-weight: 900;
          font-size: 13px;
        }

        .qrInfo h2 {
          margin: 0;
          font-size: 20px;
          line-height: 1.35;
          word-break: break-all;
          background: #030712;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 14px;
        }

        .qrInfo p {
          color: #cbd5e1;
          line-height: 1.5;
        }

        .qrActions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 14px;
        }

        .qrActions button {
          background: #2563eb;
          color: white;
          border: 0;
          border-radius: 14px;
          padding: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .qrActions button:nth-child(2) {
          background: #15803d;
        }

        .qrActions button:nth-child(3) {
          background: #374151;
        }

        .paper {
          background: white;
          color: #111827;
          border-radius: 22px;
          padding: 34px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .paperHeader {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 3px solid #111827;
          padding-bottom: 20px;
          margin-bottom: 20px;
        }

        .company {
          margin: 0 0 8px;
          color: #6b7280;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .paperHeader h2 {
          margin: 0;
          font-size: 34px;
        }

        .paperHeader p {
          color: #374151;
          margin: 10px 0 0;
          font-weight: 700;
        }

        .paperNumber {
          text-align: right;
        }

        .paperNumber span {
          display: block;
          color: #6b7280;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .paperNumber strong {
          display: inline-block;
          border: 2px solid #111827;
          border-radius: 12px;
          padding: 10px 16px;
          font-size: 24px;
        }

        .paperGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        .paperGrid div,
        .signatureBox div {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 14px;
          padding: 14px;
        }

        .paperGrid span,
        .signatureBox span {
          display: block;
          color: #6b7280;
          font-weight: 900;
          margin-bottom: 6px;
          font-size: 13px;
        }

        .paperGrid strong,
        .signatureBox strong {
          display: block;
          color: #111827;
          font-size: 17px;
          line-height: 1.35;
        }

        .section {
          margin-top: 26px;
          page-break-inside: avoid;
        }

        .section h3 {
          margin: 0 0 12px;
          font-size: 24px;
          border-bottom: 1px solid #d1d5db;
          padding-bottom: 8px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th,
        td {
          border: 1px solid #d1d5db;
          padding: 12px;
          text-align: left;
          vertical-align: top;
        }

        th {
          width: 210px;
          background: #f3f4f6;
          font-weight: 900;
        }

        .pre {
          white-space: pre-wrap;
        }

        .qrPrintGrid {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 18px;
          align-items: center;
        }

        .qrPrint {
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 16px;
          padding: 14px;
        }

        .qrPrint img {
          display: block;
          width: 100%;
          height: auto;
        }

        .qrPrintGrid p {
          line-height: 1.5;
          color: #374151;
          font-weight: 700;
        }

        .printLink {
          word-break: break-all;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 12px;
          color: #111827 !important;
        }

        .signedStatus {
          display: inline-block;
          border-radius: 999px;
          padding: 10px 14px;
          font-weight: 900;
        }

        .signedStatus.ok {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #16a34a;
        }

        .signedStatus.warn {
          background: #fef3c7;
          color: #78350f;
          border: 1px solid #f59e0b;
        }

        .signatureBox {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .signatureBox img {
          grid-column: 1 / -1;
          display: block;
          max-width: 430px;
          width: 100%;
          height: 150px;
          object-fit: contain;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 12px;
        }

        @media (max-width: 900px) {
          .top,
          .paperHeader {
            display: block;
          }

          .topButtons {
            margin-top: 16px;
            display: grid;
            grid-template-columns: 1fr;
          }

          .paperNumber {
            text-align: left;
            margin-top: 18px;
          }

          .qrPanel,
          .paperGrid,
          .qrPrintGrid,
          .signatureBox,
          .qrActions {
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

          .qrPanel,
          .paper {
            padding: 18px;
            border-radius: 18px;
          }

          .paperHeader h2 {
            font-size: 28px;
          }

          th,
          td {
            display: block;
            width: auto;
          }

          th {
            border-bottom: 0;
          }
        }

        @media print {
          body {
            background: white !important;
          }

          .page {
            background: white !important;
            padding: 0 !important;
          }

          .noPrint {
            display: none !important;
          }

          .paper {
            border-radius: 0 !important;
            padding: 0 !important;
            max-width: none !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </main>
  );
}