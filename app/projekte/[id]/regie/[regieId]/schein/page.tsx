"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";

const LOGO_URL = "/logo.png";
const MOUNTAIN_BG_URL = "/planine.jpg";

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

export default function RegieScheinPage() {
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
  const [regieFotos, setRegieFotos] = useState<any[]>([]);
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
    return projekt.ort || projekt.mjesto || projekt.location || "";
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
    return (
      row?.pause_minuten ||
      row?.pause_minutes ||
      row?.break_minutes ||
      row?.pause ||
      0
    );
  }

  function getStoredHours(row: any) {
    return row?.stunden || row?.hours || row?.total_hours || row?.gesamt_stunden || "";
  }

  function getMaterial(row: any) {
    return row?.material || row?.materialien || row?.material_text || "";
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

  function getFotoUrl(row: any) {
    return (
      row.url ||
      row.image_url ||
      row.foto_url ||
      row.photo_url ||
      row.public_url ||
      ""
    );
  }

  function getFotoTitle(row: any) {
    return row.titel || row.title || row.name || "Regie Foto";
  }

  function getFotoText(row: any) {
    return row.beschreibung || row.description || row.notiz || row.note || "";
  }

  function getScheinUrl() {
    if (!origin) return `/projekte/${projektId}/regie/${regieId}/schein`;
    return `${origin}/projekte/${projektId}/regie/${regieId}/schein`;
  }

  function getQrImageUrl() {
    const target = encodeURIComponent(getScheinUrl());

    return `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${target}`;
  }

  function toNumber(value: any) {
    const n = Number(String(value || "0").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function formatHours(value: any) {
    const n = toNumber(value);
    return n.toFixed(2).replace(".", ",") + " h";
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
    await loadRegieFotos();

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

  async function loadRegieFotos() {
    const { data, error } = await supabase
      .from("regie_fotos")
      .select("*")
      .eq("regie_id", regieId)
      .order("created_at", { ascending: true });

    if (!error) {
      setRegieFotos(data || []);
      return;
    }

    setRegieFotos([]);
  }

  async function savePdfLink() {
    const scheinUrl = getScheinUrl();
    const qrUrl = getQrImageUrl();

    await supabase
      .from("regie_unterschriften")
      .update({
        pdf_url: scheinUrl,
        qr_url: qrUrl,
      } as any)
      .eq("regie_id", regieId);

    const payloads = [
      {
        pdf_url: scheinUrl,
        qr_url: qrUrl,
      },
      {
        pdf_url: scheinUrl,
      },
    ];

    for (const payload of payloads) {
      const { error } = await supabase
        .from(regieConfig.table)
        .update(payload as any)
        .eq("id", regieIdValue);

      if (!error) {
        setMessage("PDF / QR link je sačuvan.");
        await loadAll();
        return;
      }
    }

    setMessage("PDF link je sačuvan u Unterschrift tabelu.");
    await loadAll();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getScheinUrl());
      setMessage("Regieschein link je kopiran.");
    } catch {
      setErrorText("Ne mogu kopirati link.");
    }
  }

  async function shareLink() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Regieschein ${regieId}`,
          text: `Digitaler Regieschein - ${getProjektName()}`,
          url: getScheinUrl(),
        });
      } else {
        await copyLink();
      }
    } catch {
      setErrorText("Dijeljenje nije uspjelo.");
    }
  }

  function printPdf() {
    window.print();
  }

  return (
    <main className="page">
      <section className="top noPrint">
        <div>
          <Link className="back" href={`/projekte/${projektId}/regie`}>
            ← Zurück zu Regie
          </Link>

          <p className="label">Regieschein PDF / dodatni rad</p>
          <h1>Regieschein</h1>
          <p className="subtitle">
            {getProjektName()}
            {getProjektOrt() ? ` · ${getProjektOrt()}` : ""}
          </p>
        </div>

        <div className="topButtons">
          <button className="btn gray" onClick={loadAll}>
            Aktualisieren / Osvježi
          </button>

          <button className="btn green" onClick={savePdfLink}>
            PDF Link speichern
          </button>

          <button className="btn blue" onClick={printPdf}>
            Drucken / PDF
          </button>
        </div>
      </section>

      {message && <div className="successBox noPrint">{message}</div>}
      {errorText && <div className="errorBox noPrint">{errorText}</div>}

      {loading ? (
        <div className="emptyBox">Učitavanje Regieschein...</div>
      ) : !regie ? (
        <div className="emptyBox">Regie unos nije pronađen.</div>
      ) : (
        <>
          <section className="actionPanel noPrint">
            <div>
              <p className="smallLabel">Digitaler Link</p>
              <h2>{getScheinUrl()}</h2>
            </div>

            <div className="actionButtons">
              <button onClick={copyLink}>Link kopieren</button>
              <button onClick={shareLink}>Teilen</button>
              <Link href={`/projekte/${projektId}/regie/${regieId}/unterschrift`}>
                ✍️ Unterschrift
              </Link>
            </div>
          </section>

          <section className="paper">
            <div
              className="brandHero"
              style={{
                backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.80), rgba(0,0,0,0.38)), url(${MOUNTAIN_BG_URL})`,
              }}
            >
              <div className="logoBox">
                <img src={LOGO_URL} alt="Logo" />
              </div>

              <div>
                <p>Digitaler Regieschein</p>
                <h2>Regiearbeiten / Zusatzarbeiten</h2>
                <span>Dodatni radovi · {getProjektName()}</span>
              </div>

              <div className="regieNr">
                <span>Regie Nr.</span>
                <strong>{regieId}</strong>
              </div>
            </div>

            <section className="paperIntro">
              <div>
                <p className="documentLabel">
                  Nachweis für ausgeführte Regiearbeiten
                </p>
                <h3>Regieschein</h3>
                <p className="translation">
                  Dokaz za urađene dodatne radove.
                </p>
              </div>

              <div className={isSigned() ? "status ok" : "status wait"}>
                {isSigned() ? "Unterschrieben" : "Wartet auf Unterschrift"}
              </div>
            </section>

            <section className="infoGrid">
              <div>
                <span>Projekt</span>
                <strong>{getProjektName()}</strong>
              </div>

              <div>
                <span>Ort / mjesto</span>
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
                <span>Datum Regie</span>
                <strong>{formatDate(getDate(regie))}</strong>
              </div>
            </section>

            <section className="section">
              <h3>1. Ausgeführte Regiearbeit</h3>
              <p className="sectionTranslation">Urađeni dodatni rad</p>

              <table>
                <tbody>
                  <tr>
                    <th>Arbeiter / radnik</th>
                    <td>{getWorker(regie) || "-"}</td>
                  </tr>

                  <tr>
                    <th>Regiearbeit / dodatni rad</th>
                    <td>{getWork(regie) || "-"}</td>
                  </tr>

                  <tr>
                    <th>Beschreibung / opis</th>
                    <td className="pre">{getDescription(regie) || "-"}</td>
                  </tr>

                  <tr>
                    <th>Arbeitszeit / vrijeme</th>
                    <td>
                      {getStart(regie) || "-"} bis {getEnd(regie) || "-"} · Pause{" "}
                      {getPause(regie) || 0} min
                    </td>
                  </tr>

                  <tr>
                    <th>Stunden / sati</th>
                    <td>{formatHours(getHours(regie))}</td>
                  </tr>

                  <tr>
                    <th>Material / materijal</th>
                    <td className="pre">{getMaterial(regie) || "-"}</td>
                  </tr>

                  <tr>
                    <th>Status</th>
                    <td>
                      {getStatus(regie)} · {getFreigabe(regie)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="section">
              <h3>2. Fotos / Bilder</h3>
              <p className="sectionTranslation">
                Slike povezane sa ovim Regie unosom.
              </p>

              {regieFotos.length === 0 ? (
                <div className="noPhotos">Keine Fotos vorhanden.</div>
              ) : (
                <div className="photoGrid">
                  {regieFotos.map((foto) => (
                    <div key={foto.id} className="photoItem">
                      <img src={getFotoUrl(foto)} alt={getFotoTitle(foto)} />
                      <div>
                        <strong>{getFotoTitle(foto)}</strong>
                        {getFotoText(foto) && <p>{getFotoText(foto)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="section">
              <h3>3. Bestätigung Bauleiter</h3>
              <p className="sectionTranslation">
                Potvrda Bauleitera.
              </p>

              <p className="confirmText">
                Der Bauleiter bestätigt mit seiner Unterschrift, dass die oben
                aufgeführten Regiearbeiten ausgeführt und zur Kenntnis genommen
                wurden.
              </p>

              {isSigned() ? (
                <div className="signatureArea">
                  <div>
                    <span>Name Bauleiter</span>
                    <strong>{getBauleiterName() || "-"}</strong>
                  </div>

                  <div>
                    <span>Unterschrieben am</span>
                    <strong>{formatDate(getSignedAt())}</strong>
                  </div>

                  <div className="signatureImage">
                    <img src={getSignatureImage()} alt="Unterschrift Bauleiter" />
                  </div>
                </div>
              ) : (
                <div className="notSigned">
                  Noch nicht unterschrieben. Bitte zuerst über die
                  Unterschrift-Seite unterschreiben.
                </div>
              )}
            </section>

            <section className="section">
              <h3>4. QR Code / Digitaler Nachweis</h3>

              <div className="qrGrid">
                <div className="qrBox">
                  <img src={getQrImageUrl()} alt="QR Code Regieschein" />
                </div>

                <div>
                  <p>
                    Dieser QR Code öffnet den digitalen Regieschein mit
                    Projektangaben, Regiearbeit, Fotos und Unterschrift.
                  </p>

                  <p className="linkText">{getScheinUrl()}</p>

                  <p className="hintText">
                    Zum Speichern als PDF im Browser auf „Drucken / PDF“ klicken
                    und als PDF speichern.
                  </p>
                </div>
              </div>
            </section>
          </section>
        </>
      )}

      <style>{`
        .page {
          min-height: 100vh;
          background:
            linear-gradient(rgba(0, 0, 0, 0.78), rgba(0, 0, 0, 0.92)),
            url(${MOUNTAIN_BG_URL});
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
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
          background: rgba(31, 41, 55, 0.9);
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 11px 15px;
          font-weight: 800;
          margin-bottom: 18px;
        }

        .label {
          color: #d1d5db;
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
          color: #e5e7eb;
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

        .actionPanel {
          max-width: 1050px;
          margin: 0 auto 22px;
          background: rgba(17, 24, 39, 0.92);
          border: 1px solid #374151;
          border-radius: 22px;
          padding: 20px;
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 18px;
        }

        .smallLabel {
          margin: 0 0 8px;
          color: #93c5fd;
          font-weight: 900;
          font-size: 13px;
        }

        .actionPanel h2 {
          margin: 0;
          font-size: 18px;
          line-height: 1.4;
          word-break: break-all;
          background: #030712;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 14px;
        }

        .actionButtons {
          display: grid;
          gap: 10px;
        }

        .actionButtons button,
        .actionButtons a {
          border: 0;
          border-radius: 14px;
          padding: 14px;
          color: white;
          font-weight: 900;
          cursor: pointer;
          text-align: center;
          text-decoration: none;
          background: #2563eb;
        }

        .actionButtons button:nth-child(2) {
          background: #15803d;
        }

        .actionButtons a {
          background: #7c3aed;
        }

        .paper {
          background: white;
          color: #111827;
          border-radius: 22px;
          overflow: hidden;
          max-width: 1050px;
          margin: 0 auto;
          box-shadow: 0 25px 90px rgba(0,0,0,0.45);
        }

        .brandHero {
          min-height: 190px;
          background-size: cover;
          background-position: center;
          color: white;
          padding: 28px;
          display: grid;
          grid-template-columns: 140px 1fr 150px;
          gap: 22px;
          align-items: center;
        }

        .logoBox {
          width: 120px;
          height: 120px;
          border-radius: 22px;
          background: rgba(255,255,255,0.92);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
        }

        .logoBox img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .brandHero p {
          margin: 0 0 8px;
          color: #d1d5db;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .brandHero h2 {
          margin: 0;
          font-size: 36px;
          line-height: 1.05;
        }

        .brandHero span {
          display: block;
          margin-top: 10px;
          color: #f3f4f6;
          font-weight: 800;
          font-size: 18px;
        }

        .regieNr {
          text-align: right;
        }

        .regieNr span {
          display: block;
          font-weight: 900;
          color: #d1d5db;
          margin-bottom: 8px;
        }

        .regieNr strong {
          display: inline-block;
          border: 2px solid white;
          border-radius: 14px;
          padding: 12px 16px;
          font-size: 28px;
          background: rgba(0,0,0,0.35);
        }

        .paperIntro {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 24px 28px 0;
          align-items: flex-start;
        }

        .documentLabel {
          margin: 0 0 8px;
          color: #6b7280;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .paperIntro h3 {
          margin: 0;
          font-size: 30px;
        }

        .translation {
          margin: 8px 0 0;
          color: #6b7280;
          font-weight: 700;
        }

        .status {
          border-radius: 999px;
          padding: 10px 14px;
          font-weight: 900;
          white-space: nowrap;
        }

        .status.ok {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #16a34a;
        }

        .status.wait {
          background: #fef3c7;
          color: #78350f;
          border: 1px solid #f59e0b;
        }

        .infoGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          padding: 24px 28px 0;
        }

        .infoGrid div,
        .signatureArea > div {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 14px;
          padding: 14px;
        }

        .infoGrid span,
        .signatureArea span {
          display: block;
          color: #6b7280;
          font-weight: 900;
          margin-bottom: 6px;
          font-size: 13px;
        }

        .infoGrid strong,
        .signatureArea strong {
          display: block;
          color: #111827;
          font-size: 17px;
          line-height: 1.35;
        }

        .section {
          margin: 28px;
          page-break-inside: avoid;
        }

        .section h3 {
          margin: 0 0 5px;
          font-size: 24px;
          border-bottom: 1px solid #d1d5db;
          padding-bottom: 8px;
        }

        .sectionTranslation {
          color: #6b7280;
          margin: 0 0 12px;
          font-weight: 700;
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
          width: 220px;
          background: #f3f4f6;
          font-weight: 900;
        }

        .pre {
          white-space: pre-wrap;
        }

        .noPhotos {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 14px;
          padding: 16px;
          color: #6b7280;
          font-weight: 900;
        }

        .photoGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .photoItem {
          border: 1px solid #d1d5db;
          border-radius: 16px;
          overflow: hidden;
          background: #f9fafb;
          page-break-inside: avoid;
        }

        .photoItem img {
          display: block;
          width: 100%;
          height: 260px;
          object-fit: cover;
          background: #e5e7eb;
        }

        .photoItem div {
          padding: 12px;
        }

        .photoItem strong {
          display: block;
          margin-bottom: 6px;
          color: #111827;
        }

        .photoItem p {
          margin: 0;
          color: #4b5563;
          line-height: 1.4;
        }

        .confirmText {
          line-height: 1.5;
          color: #374151;
          font-weight: 700;
        }

        .signatureArea {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .signatureImage {
          grid-column: 1 / -1;
          background: white !important;
        }

        .signatureImage img {
          display: block;
          max-width: 430px;
          width: 100%;
          height: 145px;
          object-fit: contain;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          background: white;
        }

        .notSigned {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          color: #78350f;
          border-radius: 14px;
          padding: 14px;
          font-weight: 900;
        }

        .qrGrid {
          display: grid;
          grid-template-columns: 230px 1fr;
          gap: 18px;
          align-items: center;
        }

        .qrBox {
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 18px;
          padding: 14px;
        }

        .qrBox img {
          width: 100%;
          height: auto;
          display: block;
        }

        .qrGrid p {
          color: #374151;
          line-height: 1.5;
          font-weight: 700;
        }

        .linkText {
          word-break: break-all;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 12px;
          color: #111827 !important;
        }

        .hintText {
          color: #6b7280 !important;
          font-size: 14px;
        }

        @media (max-width: 900px) {
          .top,
          .paperIntro {
            display: block;
          }

          .topButtons {
            margin-top: 16px;
            display: grid;
            grid-template-columns: 1fr;
          }

          .actionPanel,
          .brandHero,
          .infoGrid,
          .signatureArea,
          .qrGrid,
          .photoGrid {
            grid-template-columns: 1fr;
          }

          .regieNr {
            text-align: left;
          }
        }

        @media (max-width: 760px) {
          .page {
            padding: 16px;
          }

          h1 {
            font-size: 36px;
          }

          .paper {
            border-radius: 18px;
          }

          .brandHero {
            padding: 20px;
          }

          .brandHero h2 {
            font-size: 28px;
          }

          .logoBox {
            width: 96px;
            height: 96px;
          }

          th,
          td {
            display: block;
            width: auto;
          }

          th {
            border-bottom: 0;
          }

          .section {
            margin: 20px;
          }

          .infoGrid {
            padding: 20px 20px 0;
          }

          .photoItem img {
            height: 220px;
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
            box-shadow: none !important;
            max-width: none !important;
            margin: 0 !important;
          }

          .brandHero {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .section {
            page-break-inside: avoid;
          }

          .photoItem {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}