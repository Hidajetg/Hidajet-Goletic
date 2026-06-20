"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

export default function RegieUnterschriftPage() {
  const params = useParams();

  const projektId = String(params.id);
  const regieId = String(params.regieId);

  const projektIdValue = isNaN(Number(projektId))
    ? projektId
    : Number(projektId);

  const regieIdValue = isNaN(Number(regieId)) ? regieId : Number(regieId);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawingRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [regie, setRegie] = useState<any>(null);
  const [unterschrift, setUnterschrift] = useState<any>(null);

  const [regieConfig, setRegieConfig] = useState<TableConfig>({
    table: "regie",
    column: "projekt_id",
  });

  const [bauleiterName, setBauleiterName] = useState("");
  const [bauleiterEmail, setBauleiterEmail] = useState("");

  const [signatureEmpty, setSignatureEmpty] = useState(true);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    loadAll();
  }, [projektId, regieId]);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        prepareCanvas();
      }, 150);
    }
  }, [loading]);

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

  function getSignatureImage() {
    return (
      unterschrift?.signature_url ||
      unterschrift?.signature_data ||
      regie?.signature_url ||
      regie?.signature_data ||
      ""
    );
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

        const name =
          data.bauleiter ||
          data.site_manager ||
          data.leiter ||
          "";

        setBauleiterName(String(name || ""));

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

        if (data.bauleiter_name && !bauleiterName) {
          setBauleiterName(String(data.bauleiter_name));
        }

        if (data.bauleiter_email && !bauleiterEmail) {
          setBauleiterEmail(String(data.bauleiter_email));
        }

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

      if (data.bauleiter_name) {
        setBauleiterName(String(data.bauleiter_name));
      }

      if (data.bauleiter_email) {
        setBauleiterEmail(String(data.bauleiter_email));
      }
    }
  }

  function prepareCanvas() {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, rect.width || 320);
    const height = 220;
    const ratio = window.devicePixelRatio || 1;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctxRef.current = ctx;
    setSignatureEmpty(true);
  }

  function getPoint(event: any) {
    const canvas = canvasRef.current;

    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if (event.touches && event.touches.length > 0) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      };
    }

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDrawing(event: any) {
    event.preventDefault();

    const ctx = ctxRef.current;
    if (!ctx) return;

    const point = getPoint(event);

    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function draw(event: any) {
    event.preventDefault();

    const ctx = ctxRef.current;

    if (!drawingRef.current || !ctx) return;

    const point = getPoint(event);

    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    setSignatureEmpty(false);
  }

  function stopDrawing(event?: any) {
    if (event) event.preventDefault();

    drawingRef.current = false;

    const ctx = ctxRef.current;
    if (ctx) ctx.closePath();
  }

  function clearSignature() {
    prepareCanvas();
  }

  async function uploadSignature(dataUrl: string) {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      const path = `${projektId}/regie-${regieId}-${Date.now()}.png`;

      const { error } = await supabase.storage
        .from("regie-signatures")
        .upload(path, blob, {
          contentType: "image/png",
          upsert: true,
        });

      if (error) return "";

      const { data } = supabase.storage
        .from("regie-signatures")
        .getPublicUrl(path);

      return data.publicUrl || "";
    } catch {
      return "";
    }
  }

  async function saveUnterschrift() {
    if (saving) return;

    if (!bauleiterName.trim()) {
      alert("Bitte Name Bauleiter eintragen.");
      return;
    }

    if (signatureEmpty) {
      alert("Bitte zuerst unterschreiben.");
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      alert("Unterschrift Feld nije spremno.");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorText("");

    const signatureData = canvas.toDataURL("image/png");
    const signatureUrl = await uploadSignature(signatureData);
    const signedAt = new Date().toISOString();

    const signaturePayload = {
      projekt_id: projektId,
      project_id: projektId,
      baustelle_id: projektId,
      regie_id: regieId,
      bauleiter_name: bauleiterName.trim(),
      bauleiter_email: bauleiterEmail.trim(),
      signature_data: signatureData,
      signature_url: signatureUrl,
      status: "Unterschrieben",
      signed_at: signedAt,
    };

    const { error: insertError } = await supabase
      .from("regie_unterschriften")
      .insert(signaturePayload as any);

    if (insertError) {
      setSaving(false);
      setErrorText("Greška kod spremanja potpisa: " + insertError.message);
      return;
    }

    const updatePayloads: any[] = [
      {
        bauleiter_name: bauleiterName.trim(),
        bauleiter_email: bauleiterEmail.trim(),
        signature_data: signatureData,
        signature_url: signatureUrl,
        unterschrieben_am: signedAt,
        signed_at: signedAt,
        status: "Fertig",
        freigabe_status: "Freigegeben",
        approval_status: "Freigegeben",
        freigabe: "Freigegeben",
        approved: true,
      },
      {
        bauleiter_name: bauleiterName.trim(),
        signature_data: signatureData,
        signature_url: signatureUrl,
        signed_at: signedAt,
        status: "Fertig",
        freigabe_status: "Freigegeben",
      },
      {
        status: "Fertig",
        freigabe_status: "Freigegeben",
      },
    ];

    for (const payload of updatePayloads) {
      const { error } = await supabase
        .from(regieConfig.table)
        .update(payload as any)
        .eq("id", regieIdValue);

      if (!error) {
        await loadAll();
        setMessage("Regieschein wurde erfolgreich unterschrieben.");
        setSaving(false);
        return;
      }
    }

    await loadAll();
    setMessage("Unterschrift gespeichert. Regie Status konnte nicht vollständig aktualisiert werden.");
    setSaving(false);
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

          <p className="label">Regie Unterschrift</p>
          <h1>Bauleiter Unterschrift</h1>
          <p className="subtitle">
            {getProjektName()}
            {getProjektOrt() ? ` · ${getProjektOrt()}` : ""}
          </p>
        </div>

        <div className="topButtons">
          <button className="btn gray" onClick={loadAll}>
            Aktualisieren
          </button>

          <button className="btn blue" onClick={printPage}>
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
          <section className="schein">
            <div className="scheinHeader">
              <div>
                <p className="company">Regieschein</p>
                <h2>Regiearbeiten / Zusatzarbeiten</h2>
                <p>Nachweis für ausgeführte Regiearbeiten</p>
              </div>

              <div className="scheinNumber">
                <span>Regie Nr.</span>
                <strong>{regieId}</strong>
              </div>
            </div>

            <section className="infoGrid">
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
                <strong>{getBauleiter() || bauleiterName || "-"}</strong>
              </div>

              <div>
                <span>Datum</span>
                <strong>{formatDate(getDate(regie))}</strong>
              </div>
            </section>

            <section className="section">
              <h3>Ausgeführte Regiearbeit</h3>

              <table>
                <tbody>
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
                    <th>Arbeitszeit</th>
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
              <h3>Bestätigung</h3>

              <p className="confirmText">
                Der Bauleiter bestätigt mit seiner Unterschrift, dass die oben
                aufgeführten Regiearbeiten ausgeführt und zur Kenntnis genommen
                wurden.
              </p>

              {getSignatureImage() ? (
                <div className="signedBox">
                  <div>
                    <span>Name Bauleiter</span>
                    <strong>
                      {unterschrift?.bauleiter_name ||
                        regie?.bauleiter_name ||
                        bauleiterName ||
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>Unterschrieben am</span>
                    <strong>
                      {formatDate(
                        unterschrift?.signed_at ||
                          regie?.signed_at ||
                          regie?.unterschrieben_am
                      )}
                    </strong>
                  </div>

                  <div className="signaturePreview">
                    <img src={getSignatureImage()} alt="Unterschrift Bauleiter" />
                  </div>
                </div>
              ) : (
                <p className="notSigned">Noch nicht unterschrieben.</p>
              )}
            </section>
          </section>

          <section className="signPanel noPrint">
            <h2>Auf dem Telefon unterschreiben</h2>
            <p>
              Bauleiter trägt Namen ein und unterschreibt mit Finger oder Stift.
            </p>

            <label>Name Bauleiter *</label>
            <input
              value={bauleiterName}
              onChange={(e) => setBauleiterName(e.target.value)}
              placeholder="Name Bauleiter"
            />

            <label>E-Mail Bauleiter</label>
            <input
              value={bauleiterEmail}
              onChange={(e) => setBauleiterEmail(e.target.value)}
              placeholder="optional"
            />

            <label>Unterschrift</label>
            <div className="canvasWrap">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>

            <div className="signActions">
              <button className="clear" onClick={clearSignature}>
                Unterschrift löschen
              </button>

              <button className="save" onClick={saveUnterschrift} disabled={saving}>
                {saving ? "Speichern..." : "Regieschein unterschreiben"}
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
        input {
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

        .emptyBox {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 30px;
          text-align: center;
          color: #cbd5e1;
          font-weight: 800;
        }

        .schein {
          background: white;
          color: #111827;
          border-radius: 22px;
          padding: 34px;
          max-width: 1000px;
          margin: 0 auto 22px;
        }

        .scheinHeader {
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

        .scheinHeader h2 {
          margin: 0;
          font-size: 34px;
        }

        .scheinHeader p {
          color: #374151;
          margin: 10px 0 0;
          font-weight: 700;
        }

        .scheinNumber {
          text-align: right;
        }

        .scheinNumber span {
          display: block;
          color: #6b7280;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .scheinNumber strong {
          display: inline-block;
          border: 2px solid #111827;
          border-radius: 12px;
          padding: 10px 16px;
          font-size: 24px;
        }

        .infoGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        .infoGrid div,
        .signedBox > div {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 14px;
          padding: 14px;
        }

        .infoGrid span,
        .signedBox span {
          display: block;
          color: #6b7280;
          font-weight: 900;
          margin-bottom: 6px;
          font-size: 13px;
        }

        .infoGrid strong,
        .signedBox strong {
          display: block;
          color: #111827;
          font-size: 17px;
          line-height: 1.35;
        }

        .section {
          margin-top: 26px;
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

        .confirmText {
          line-height: 1.5;
          color: #374151;
          font-weight: 700;
        }

        .notSigned {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 14px;
          padding: 14px;
          color: #78350f;
          font-weight: 900;
        }

        .signedBox {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .signaturePreview {
          grid-column: 1 / -1;
          background: white !important;
        }

        .signaturePreview img {
          display: block;
          max-width: 420px;
          width: 100%;
          height: 140px;
          object-fit: contain;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          background: white;
        }

        .signPanel {
          max-width: 1000px;
          margin: 0 auto;
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 22px;
          padding: 22px;
        }

        .signPanel h2 {
          margin: 0 0 8px;
          font-size: 28px;
        }

        .signPanel p {
          color: #cbd5e1;
          line-height: 1.5;
          margin: 0 0 14px;
        }

        label {
          display: block;
          color: #d1d5db;
          font-weight: 900;
          margin: 14px 0 7px;
        }

        input {
          width: 100%;
          box-sizing: border-box;
          background: #030712;
          color: white;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 15px;
          font-size: 17px;
          outline: none;
        }

        .canvasWrap {
          background: white;
          border: 2px solid #374151;
          border-radius: 16px;
          overflow: hidden;
          touch-action: none;
        }

        canvas {
          display: block;
          width: 100%;
          height: 220px;
          background: white;
          touch-action: none;
          cursor: crosshair;
        }

        .signActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 16px;
        }

        .signActions button {
          border: 0;
          border-radius: 16px;
          padding: 16px;
          color: white;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
        }

        .clear {
          background: #374151;
        }

        .save {
          background: #15803d;
        }

        .save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 900px) {
          .top,
          .scheinHeader {
            display: block;
          }

          .topButtons {
            margin-top: 16px;
            display: grid;
            grid-template-columns: 1fr;
          }

          .scheinNumber {
            text-align: left;
            margin-top: 18px;
          }

          .infoGrid,
          .signedBox,
          .signActions {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .page {
            padding: 16px;
          }

          h1 {
            font-size: 34px;
          }

          .schein {
            padding: 18px;
            border-radius: 18px;
          }

          .scheinHeader h2 {
            font-size: 27px;
          }

          th,
          td {
            display: block;
            width: auto;
          }

          th {
            border-bottom: 0;
          }

          .signPanel {
            padding: 16px;
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

          .schein {
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