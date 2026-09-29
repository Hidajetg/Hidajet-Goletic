"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";

const LOGO_URL = "/logo.png";

type Projekt = {
  id: number | string;
  name?: string | null;
  naziv?: string | null;
  title?: string | null;
  projekt?: string | null;
  baustelle_name?: string | null;
  ort?: string | null;
  mjesto?: string | null;
  adresse?: string | null;
  address?: string | null;
  auftraggeber?: string | null;
  kunde?: string | null;
  bauleiter?: string | null;
  [key: string]: any;
};

export default function PublicRegieSignPage() {
  const params = useParams();
  const token = String(params.token || "");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawingRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [regie, setRegie] = useState<any>(null);
  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);

  const [bauleiterName, setBauleiterName] = useState("");
  const [bauleiterEmail, setBauleiterEmail] = useState("");
  const [bauleiterPositionen, setBauleiterPositionen] = useState("");
  const [bauleiterBeschreibung, setBauleiterBeschreibung] = useState("");
  const [bauleiterNotiz, setBauleiterNotiz] = useState("");

  const [signatureEmpty, setSignatureEmpty] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    loadAll();
  }, [token]);

  useEffect(() => {
    if (!loading && regie && !isLocked()) {
      setTimeout(() => {
        prepareCanvas();
      }, 200);
    }
  }, [loading, regie]);

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

    return projekt.ort || projekt.mjesto || projekt.adresse || projekt.address || "";
  }

  function getAuftraggeber() {
    if (!projekt) return "";

    return projekt.auftraggeber || projekt.kunde || "";
  }

  function getBauleiterFromProjekt() {
    if (!projekt) return "";

    return projekt.bauleiter || "";
  }

  function getDatum() {
    return regie?.datum || regie?.date || "";
  }

  function formatDate(value: any) {
    if (!value) return "-";

    try {
      return new Date(value).toLocaleDateString("de-DE");
    } catch {
      return String(value);
    }
  }

  function toNumber(value: any) {
    const n = Number(String(value || "0").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function formatHours(value: any) {
    return `${toNumber(value).toFixed(2).replace(".", ",")} h`;
  }

  function isLocked() {
    return Boolean(
      regie?.locked ||
        regie?.signed_at ||
        regie?.unterschrieben_am ||
        regie?.signature_url ||
        regie?.signature_data
    );
  }

  function getRegieTitle() {
    return regie?.arbeit || regie?.title || regie?.titel || regie?.regiearbeit || "-";
  }

  function getRegieDescription() {
    return regie?.beschreibung || regie?.description || regie?.arbeiten || "-";
  }

  function getRegieMaterial() {
    return regie?.material || regie?.materialien || regie?.material_text || "-";
  }

  function getWorkersText() {
    if (workers.length > 0) {
      return workers
        .map((x) => x.radnik || x.worker || x.arbeiter || x.name)
        .filter(Boolean)
        .join(", ");
    }

    return regie?.workers_text || regie?.worker_names || regie?.radnik || "-";
  }

  function getPhotoUrl(row: any) {
    return (
      row.url ||
      row.image_url ||
      row.foto_url ||
      row.photo_url ||
      row.public_url ||
      ""
    );
  }

  function getPhotoTitle(row: any) {
    return row.titel || row.title || row.name || "Foto";
  }

  function getQrUrl(pdfUrl: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
      pdfUrl
    )}`;
  }

  async function loadAll() {
    setLoading(true);
    setErrorText("");
    setMessageText("");

    if (!token) {
      setErrorText("Regie Token fehlt.");
      setLoading(false);
      return;
    }

    const { data: regieData, error: regieError } = await supabase
      .from("regie")
      .select("*")
      .eq("public_token", token)
      .maybeSingle();

    if (regieError || !regieData) {
      setRegie(null);
      setErrorText("Regie wurde nicht gefunden.");
      setLoading(false);
      return;
    }

    setRegie(regieData);

    setBauleiterName(regieData.bauleiter_name || "");
    setBauleiterEmail(regieData.bauleiter_email || "");

    setBauleiterPositionen(
      regieData.bauleiter_positionen ||
        `${regieData.position_nr || regieData.lv_nr || ""} ${
          regieData.position_titel ||
          regieData.position_title ||
          regieData.zusatz_position ||
          regieData.extra_position ||
          ""
        }`.trim()
    );

    setBauleiterBeschreibung(
      regieData.bauleiter_beschreibung ||
        regieData.beschreibung ||
        regieData.description ||
        ""
    );

    setBauleiterNotiz(regieData.bauleiter_notiz || "");

    const projektId =
      regieData.projekt_id || regieData.project_id || regieData.baustelle_id;

    if (projektId) {
      const projektValue = isNaN(Number(projektId))
        ? String(projektId)
        : Number(projektId);

      const projektTables = ["projekte", "baustellen"];

      for (const table of projektTables) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("id", projektValue)
          .maybeSingle();

        if (!error && data) {
          setProjekt(data as Projekt);

          if (!regieData.bauleiter_name && data.bauleiter) {
            setBauleiterName(String(data.bauleiter));
          }

          break;
        }
      }
    }

    const { data: workerData } = await supabase
      .from("regie_arbeiter")
      .select("*")
      .eq("regie_id", String(regieData.id))
      .order("id", { ascending: true });

    setWorkers(workerData || []);

    const { data: photoData } = await supabase
      .from("regie_fotos")
      .select("*")
      .eq("regie_id", String(regieData.id))
      .order("id", { ascending: true });

    setPhotos(photoData || []);

    setLoading(false);
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
    drawingRef.current = false;
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

    const p = getPoint(event);

    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function draw(event: any) {
    event.preventDefault();

    const ctx = ctxRef.current;

    if (!drawingRef.current || !ctx) return;

    const p = getPoint(event);

    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    setSignatureEmpty(false);
  }

  function stopDrawing(event?: any) {
    if (event) event.preventDefault();

    drawingRef.current = false;

    if (ctxRef.current) {
      ctxRef.current.closePath();
    }
  }

  function clearSignature() {
    prepareCanvas();
  }

  async function uploadSignature(dataUrl: string) {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      const path = `${regie.projekt_id || "projekt"}/regie-${
        regie.id
      }-${Date.now()}.png`;

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

  async function saveSignatureHistory(signatureData: string, signatureUrl: string) {
    await supabase.from("regie_unterschriften").insert({
      projekt_id: String(regie.projekt_id || ""),
      project_id: String(regie.project_id || regie.projekt_id || ""),
      baustelle_id: String(regie.baustelle_id || regie.projekt_id || ""),
      regie_id: String(regie.id),
      public_token: token,

      bauleiter_name: bauleiterName.trim(),
      bauleiter_email: bauleiterEmail.trim(),
      bauleiter_positionen: bauleiterPositionen.trim(),
      bauleiter_beschreibung: bauleiterBeschreibung.trim(),
      bauleiter_notiz: bauleiterNotiz.trim(),

      signature_data: signatureData,
      signature_url: signatureUrl,

      status: "Unterschrieben",
      signed_at: new Date().toISOString(),
    } as any);
  }

  async function signRegie() {
    if (saving || !regie) return;

    if (isLocked()) {
      setErrorText("Diese Regie ist bereits unterschrieben und gesperrt.");
      return;
    }

    if (!bauleiterName.trim()) {
      setErrorText("Bitte Name Bauleiter eintragen.");
      return;
    }

    if (signatureEmpty) {
      setErrorText("Bitte unterschreiben.");
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) return;

    setSaving(true);
    setErrorText("");
    setMessageText("");

    const signatureData = canvas.toDataURL("image/png");
    const signatureUrl = await uploadSignature(signatureData);
    const signedAt = new Date().toISOString();

    const snapshot = {
      regie,
      projekt,
      workers,
      photos,
      bauleiter: {
        name: bauleiterName.trim(),
        email: bauleiterEmail.trim(),
        positionen: bauleiterPositionen.trim(),
        beschreibung: bauleiterBeschreibung.trim(),
        notiz: bauleiterNotiz.trim(),
        signed_at: signedAt,
      },
    };

    await saveSignatureHistory(signatureData, signatureUrl);

    const { error } = await supabase
      .from("regie")
      .update({
        bauleiter_name: bauleiterName.trim(),
        bauleiter_email: bauleiterEmail.trim(),
        bauleiter_positionen: bauleiterPositionen.trim(),
        bauleiter_beschreibung: bauleiterBeschreibung.trim(),
        bauleiter_notiz: bauleiterNotiz.trim(),

        signature_data: signatureData,
        signature_url: signatureUrl,

        signed_at: signedAt,
        unterschrieben_am: signedAt,

        locked: true,
        locked_at: signedAt,
        locked_by: bauleiterName.trim(),

        status: "Unterschrieben",
        freigabe_status: "Freigegeben",
        approval_status: "Freigegeben",

        signed_snapshot: snapshot,
      } as any)
      .eq("id", regie.id);

    setSaving(false);

    if (error) {
      setErrorText("Unterschrift konnte nicht gespeichert werden.");
      return;
    }

    setMessageText(
      "Regie wurde unterschrieben und gesperrt. Nach der Unterschrift sind keine Änderungen mehr möglich. Änderungen sind nur durch den Admin möglich."
    );

    await loadAll();
  }

  function printPage() {
    window.print();
  }

  if (loading) {
    return (
      <main className="page">
        <div className="standaloneBox">Wird geladen...</div>
      </main>
    );
  }

  if (!regie) {
    return (
      <main className="page">
        <div className="standaloneBox errorStandalone">
          {errorText || "Regie wurde nicht gefunden."}
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="paper">
        <header className="docHeader">
          <div className="logoBox">
            <img src={LOGO_URL} alt="Logo" />
          </div>

          <div>
            <h1>REGIEBERICHT</h1>
            <p>Tagesbericht / Regiearbeit</p>
          </div>

          <div className="nrBox">
            <b>Nr.: {regie.id}</b>
            <span>Datum: {formatDate(getDatum())}</span>
          </div>
        </header>

        <section className="infoGrid">
          <div>
            <span>BAUSTELLE</span>
            <b>{getProjektName()}</b>
          </div>

          <div>
            <span>ORT</span>
            <b>{getProjektOrt() || "-"}</b>
          </div>

          <div>
            <span>AUFTRAGGEBER</span>
            <b>{getAuftraggeber() || "-"}</b>
          </div>

          <div>
            <span>AUFTRAGNEHMER</span>
            <b>Nocker & Bernardi GmbH / Stone Boutique</b>
          </div>

          <div>
            <span>BAULEITER / VERTRETER</span>
            <b>{bauleiterName || getBauleiterFromProjekt() || "-"}</b>
          </div>

          <div>
            <span>BAUTEILE / RÄUME</span>
            <b>{regie.raum_name || regie.room_name || "-"}</b>
          </div>
        </section>

        <section className="mainGrid">
          <div className="leftCol">
            <section className="box">
              <h2>AUSGEFÜHRTE ARBEITEN</h2>

              <p className="pre">
                <b>{getRegieTitle()}</b>
              </p>

              <p className="pre">{getRegieDescription()}</p>

              <p>
                <b>LV Position:</b>{" "}
                {regie.position_nr || regie.lv_nr || "-"}{" "}
                {regie.position_titel ||
                  regie.position_title ||
                  regie.zusatz_position ||
                  regie.extra_position ||
                  ""}
              </p>

              <p>
                <b>Bauleiter bestätigte Positionen:</b>
              </p>

              {isLocked() ? (
                <p className="pre">{regie.bauleiter_positionen || "-"}</p>
              ) : (
                <textarea
                  value={bauleiterPositionen}
                  onChange={(e) => setBauleiterPositionen(e.target.value)}
                />
              )}

              <p>
                <b>Bauleiter Beschreibung:</b>
              </p>

              {isLocked() ? (
                <p className="pre">{regie.bauleiter_beschreibung || "-"}</p>
              ) : (
                <textarea
                  value={bauleiterBeschreibung}
                  onChange={(e) => setBauleiterBeschreibung(e.target.value)}
                />
              )}
            </section>

            <section className="box">
              <div className="boxTitle">
                <h2>ARBEITSKRÄFTE</h2>
                <strong>Gesamt: {formatHours(regie.stunden || regie.hours)}</strong>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Mitarbeiter</th>
                    <th>von</th>
                    <th>bis</th>
                    <th>Pause</th>
                    <th>Std.</th>
                  </tr>
                </thead>

                <tbody>
                  {(workers.length
                    ? workers
                    : [{ radnik: getWorkersText(), stunden: regie.stunden }]
                  ).map((w, i) => (
                    <tr key={i}>
                      <td>{w.radnik || w.worker || w.arbeiter || w.name}</td>
                      <td>{regie.start_time || regie.start || regie.von || "-"}</td>
                      <td>{regie.end_time || regie.end || regie.bis || "-"}</td>
                      <td>{regie.pause_minuten || regie.pause || 0}</td>
                      <td>{formatHours(w.stunden || w.hours || regie.stunden)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="box">
              <h2>MATERIAL / GERÄTE / SONSTIGES</h2>
              <p className="pre">{getRegieMaterial()}</p>
            </section>
          </div>

          <div className="rightCol">
            <section className="box photosBox">
              <h2>FOTODOKUMENTATION</h2>

              {photos.length === 0 ? (
                <div className="photoEmpty">Keine Fotos vorhanden.</div>
              ) : (
                photos.slice(0, 4).map((foto, i) => (
                  <div className="photoSlot" key={foto.id || i}>
                    <img src={getPhotoUrl(foto)} alt={getPhotoTitle(foto)} />
                    <span>Foto {i + 1}</span>
                  </div>
                ))
              )}
            </section>

            <section className="box signatureBox">
              <h2>UNTERSCHRIFT BAULEITER</h2>

              <p className="lockText">
                Nach der Unterschrift sind keine Änderungen mehr möglich.
                Änderungen sind nur durch den Admin möglich.
              </p>

              <label>Name Bauleiter</label>
              {isLocked() ? (
                <b>{regie.bauleiter_name || bauleiterName}</b>
              ) : (
                <input
                  value={bauleiterName}
                  onChange={(e) => setBauleiterName(e.target.value)}
                  placeholder="Name Bauleiter"
                />
              )}

              <label>E-Mail Bauleiter</label>
              {isLocked() ? (
                <span>{regie.bauleiter_email || "-"}</span>
              ) : (
                <input
                  value={bauleiterEmail}
                  onChange={(e) => setBauleiterEmail(e.target.value)}
                  placeholder="E-Mail"
                />
              )}

              <label>Bauleiter Notiz</label>
              {isLocked() ? (
                <p className="pre">{regie.bauleiter_notiz || "-"}</p>
              ) : (
                <textarea
                  value={bauleiterNotiz}
                  onChange={(e) => setBauleiterNotiz(e.target.value)}
                  placeholder="Notiz Bauleiter"
                />
              )}

              {isLocked() ? (
                <div className="signed">
                  <img
                    src={regie.signature_url || regie.signature_data}
                    alt="Unterschrift"
                  />
                  <b>
                    Unterschrieben am{" "}
                    {formatDate(regie.signed_at || regie.unterschrieben_am)}
                  </b>
                </div>
              ) : (
                <>
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

                  <button className="clearBtn noPrint" onClick={clearSignature}>
                    Unterschrift löschen
                  </button>
                </>
              )}

              {!isLocked() && (
                <button
                  className="signBtn noPrint"
                  onClick={signRegie}
                  disabled={saving}
                >
                  {saving
                    ? "Speichern..."
                    : "Regie unterschreiben und sperren"}
                </button>
              )}

              {isLocked() && (
                <button className="printBtn noPrint" onClick={printPage}>
                  Drucken / als PDF speichern
                </button>
              )}

              {regie.pdf_url ? (
                <>
                  <a
                    className="printBtn noPrint"
                    href={regie.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    PDF öffnen
                  </a>

                  <div className="qrBox noPrint">
                    <img src={getQrUrl(regie.pdf_url)} alt="QR PDF" />
                    <span>QR Code führt nur zum PDF.</span>
                  </div>
                </>
              ) : (
                <p className="pdfInfo noPrint">
                  QR Code wird erst angezeigt, wenn ein PDF-Link gespeichert
                  ist. QR darf nicht zur App führen.
                </p>
              )}
            </section>
          </div>
        </section>
      </section>

      {errorText && <div className="errorBox noPrint">{errorText}</div>}
      {messageText && <div className="successBox noPrint">{messageText}</div>}

      <style>{`
        .page {
          min-height: 100vh;
          background: #000;
          padding: 16px;
          color: #071225;
          font-family: Arial, sans-serif;
        }

        .paper {
          background: white;
          max-width: 1160px;
          margin: 0 auto;
          border: 1px solid #c7d7f5;
          border-radius: 8px;
          overflow: hidden;
        }

        .docHeader {
          display: grid;
          grid-template-columns: 150px 1fr 150px;
          gap: 14px;
          align-items: center;
          padding: 16px;
          border-bottom: 2px solid #0b3d91;
        }

        .logoBox {
          border-right: 2px solid #f97316;
          min-height: 70px;
          display: flex;
          align-items: center;
          padding-right: 12px;
        }

        .logoBox img {
          max-width: 130px;
          max-height: 70px;
          object-fit: contain;
        }

        h1 {
          margin: 0;
          color: #0b3d91;
          font-size: 30px;
          letter-spacing: 1px;
        }

        .docHeader p {
          margin: 6px 0 0;
          color: #334155;
        }

        .nrBox {
          text-align: right;
          display: grid;
          gap: 8px;
          font-size: 14px;
        }

        .infoGrid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 6px;
          padding: 8px 14px;
        }

        .infoGrid div,
        .box {
          border: 1px solid #bcd0f4;
          border-radius: 6px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.96);
        }

        .infoGrid span {
          display: block;
          color: #0b3d91;
          font-size: 11px;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .infoGrid b {
          font-size: 13px;
        }

        .mainGrid {
          display: grid;
          grid-template-columns: 58% 42%;
          gap: 8px;
          padding: 8px 14px 14px;
        }

        .leftCol,
        .rightCol {
          display: grid;
          gap: 8px;
          align-content: start;
        }

        .box h2 {
          margin: 0 0 10px;
          color: #0b3d91;
          font-size: 16px;
          letter-spacing: 0.5px;
        }

        .box p {
          margin: 8px 0;
          line-height: 1.35;
        }

        .pre {
          white-space: pre-wrap;
        }

        .boxTitle {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        th,
        td {
          border-bottom: 1px solid #dbe7ff;
          padding: 8px;
          text-align: left;
        }

        th {
          color: #0b3d91;
          background: #f5f9ff;
        }

        input,
        textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #bcd0f4;
          border-radius: 6px;
          padding: 10px;
          font-size: 14px;
        }

        textarea {
          min-height: 76px;
          resize: vertical;
        }

        label {
          display: block;
          margin: 10px 0 5px;
          font-weight: 900;
          color: #0b3d91;
          font-size: 13px;
        }

        .photosBox {
          display: grid;
          gap: 8px;
        }

        .photoSlot {
          min-height: 210px;
          border: 1px dashed #bcd0f4;
          border-radius: 6px;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fbfdff;
        }

        .photoSlot img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          position: absolute;
          inset: 0;
        }

        .photoSlot span {
          position: relative;
          background: rgba(255, 255, 255, 0.8);
          padding: 6px 10px;
          color: #0b3d91;
          font-weight: 900;
          border-radius: 999px;
        }

        .photoEmpty {
          min-height: 220px;
          border: 1px dashed #bcd0f4;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }

        .lockText {
          background: #fff7ed;
          border: 1px solid #f59e0b;
          color: #7c2d12;
          padding: 10px;
          border-radius: 6px;
          font-weight: 900;
        }

        .canvasWrap {
          border: 2px solid #0b3d91;
          border-radius: 6px;
          overflow: hidden;
          background: white;
          touch-action: none;
        }

        canvas {
          display: block;
          width: 100%;
          height: 220px;
          background: white;
          touch-action: none;
        }

        .signed img {
          display: block;
          width: 100%;
          height: 120px;
          object-fit: contain;
          border: 1px solid #bcd0f4;
          border-radius: 6px;
          background: white;
          margin-top: 8px;
        }

        .signed b {
          display: block;
          margin-top: 8px;
          color: #15803d;
        }

        .signBtn,
        .printBtn,
        .clearBtn {
          display: block;
          width: 100%;
          box-sizing: border-box;
          text-align: center;
          margin-top: 12px;
          border: 0;
          border-radius: 8px;
          background: #15803d;
          color: white;
          padding: 14px;
          font-weight: 900;
          text-decoration: none;
          cursor: pointer;
        }

        .signBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .printBtn {
          background: #0b3d91;
        }

        .clearBtn {
          background: #374151;
        }

        .pdfInfo {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          color: #78350f;
          border-radius: 6px;
          padding: 10px;
          font-weight: 900;
        }

        .qrBox {
          background: #f8fafc;
          border: 1px solid #bcd0f4;
          border-radius: 8px;
          padding: 12px;
          text-align: center;
          margin-top: 12px;
        }

        .qrBox img {
          width: 180px;
          max-width: 100%;
          background: white;
          padding: 8px;
          border-radius: 8px;
        }

        .qrBox span {
          display: block;
          margin-top: 8px;
          color: #0b3d91;
          font-weight: 900;
          font-size: 12px;
        }

        .errorBox,
        .successBox {
          max-width: 1160px;
          margin: 12px auto 0;
          padding: 14px;
          border-radius: 8px;
          color: white;
          font-weight: 900;
        }

        .errorBox {
          background: #7f1d1d;
          border: 1px solid #ef4444;
        }

        .successBox {
          background: #064e3b;
          border: 1px solid #16a34a;
        }

        .standaloneBox {
          max-width: 560px;
          margin: 80px auto;
          background: #111827;
          border: 1px solid #374151;
          border-radius: 12px;
          color: white;
          padding: 20px;
          font-weight: 900;
        }

        .errorStandalone {
          background: #7f1d1d;
          border-color: #ef4444;
        }

        @media (max-width: 900px) {
          .docHeader,
          .infoGrid,
          .mainGrid {
            grid-template-columns: 1fr;
          }

          .nrBox {
            text-align: left;
          }
        }

        @media print {
          .page {
            background: white;
            padding: 0;
          }

          .paper {
            max-width: none;
            border: 0;
            border-radius: 0;
          }

          .noPrint {
            display: none !important;
          }

          .box,
          .photoSlot {
            break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}