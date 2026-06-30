
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";

const FIRMA = "Nocker & Bernardi GmbH / Stone Boutique";
const FIRMA_ADRESA = "Innweg 3, A-6170 Zirl";
const POTPIS = "Hidajet Goletić";

const PDF_BUCKET = "pdf-assets";
const PDF_LOGO_TOP = "gore.png";
const PDF_SIDE_IMAGE = "strana.png";
const PDF_MOUNTAIN_BG = "pozadina.png";

const ADMIN_NAMES = [
  "hido",
  "steffi",
  "admin",
  "hidajet",
  "hidajet goletic",
  "hidajet goletić",
];

function getLoggedUserFromLocalStorage() {
  if (typeof window === "undefined") return null;

  const keys = [
    "currentWorker",
    "worker",
    "loggedWorker",
    "selectedWorker",
    "currentUser",
    "loggedUser",
    "user",
    "userName",
    "workerName",
    "name",
    "loginUser",
    "baustelle_user",
    "stone_user",
    "app_user",
  ];

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (!value) continue;

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    const value = localStorage.getItem(key);
    if (!value) continue;

    try {
      const parsed = JSON.parse(value);
      if (isAdminUser(parsed)) return parsed;
    } catch {
      if (isAdminUser(value)) return value;
    }
  }

  return null;
}

function isAdminUser(user: any) {
  if (!user) return false;

  if (typeof user === "string") {
    return ADMIN_NAMES.includes(user.trim().toLowerCase());
  }

  const role = String(user.role || user.rolle || user.tip || "").toLowerCase();

  const name = String(
    user.name ||
      user.worker_name ||
      user.radnik ||
      user.username ||
      user.userName ||
      user.displayName ||
      ""
  )
    .trim()
    .toLowerCase();

  return (
    role === "admin" ||
    role === "administrator" ||
    user.is_admin === true ||
    user.admin === true ||
    ADMIN_NAMES.includes(name)
  );
}

export default function ArchivSingleRegieberichtPage() {
  const params = useParams();
  const baustelleId = String((params as any).id || "");
  const regieId = String((params as any).regieId || (params as any).regieid || "");

  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [baustelle, setBaustelle] = useState<any>(null);
  const [berichtNr, setBerichtNr] = useState("");
  const [datum, setDatum] = useState("");
  const [auftraggeber, setAuftraggeber] = useState("");
  const [bauleiter, setBauleiter] = useState("");
  const [ort, setOrt] = useState("");
  const [arbeiten, setArbeiten] = useState("");
  const [selectedRooms, setSelectedRooms] = useState<any[]>([]);
  const [workerRows, setWorkerRows] = useState<any[]>([]);
  const [materialRows, setMaterialRows] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);

  const [logoTopUrl, setLogoTopUrl] = useState("");
  const [sideImageUrl, setSideImageUrl] = useState("");
  const [mountainBgUrl, setMountainBgUrl] = useState("");

  useEffect(() => {
    const loggedUser = getLoggedUserFromLocalStorage();
    const adminOk = isAdminUser(loggedUser);

    setIsAdmin(adminOk);
    setAccessChecked(true);

    if (!adminOk) {
      setLoading(false);
      return;
    }

    loadPdfImages();
    loadArchivedRegiebericht();
  }, []);

  function getStoragePublicUrl(fileName: string) {
    const url = supabase.storage.from(PDF_BUCKET).getPublicUrl(fileName).data.publicUrl;
    return `${url}?v=${Date.now()}`;
  }

  function loadPdfImages() {
    setLogoTopUrl(getStoragePublicUrl(PDF_LOGO_TOP));
    setSideImageUrl(getStoragePublicUrl(PDF_SIDE_IMAGE));
    setMountainBgUrl(getStoragePublicUrl(PDF_MOUNTAIN_BG));
  }

  function toNumberValue(value: any) {
    if (value === null || value === undefined || value === "") return 0;

    const cleaned = String(value)
      .replace(",", ".")
      .replace(/[^0-9.-]/g, "");

    const numberValue = Number(cleaned);

    if (Number.isNaN(numberValue)) return 0;
    return numberValue;
  }

  function isPdfUrl(url: string) {
    return String(url || "").toLowerCase().split("?")[0].endsWith(".pdf");
  }

  function getFileNameFromUrl(url: string) {
    try {
      const cleanUrl = String(url || "").split("?")[0];
      const lastPart = cleanUrl.split("/").pop() || "Datei";
      return decodeURIComponent(lastPart);
    } catch {
      return "Datei";
    }
  }

  function getImagePhotos() {
    return photos.filter((p) => p.kind !== "pdf");
  }

  function getPdfAttachments() {
    return photos.filter((p) => p.kind === "pdf");
  }

  function formatDatum(value: string) {
    if (!value) return "";
    return new Date(value).toLocaleDateString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  async function loadArchivedRegiebericht() {
    setLoading(true);

    const baustelleRes = await supabase
      .from("baustellen")
      .select("*")
      .eq("id", Number(baustelleId))
      .single();

    if (baustelleRes.error) {
      alert("LOAD BAUSTELLE: " + baustelleRes.error.message);
      setLoading(false);
      return;
    }

    setBaustelle(baustelleRes.data);

    const berichtRes = await supabase
      .from("regieberichte")
      .select("*")
      .eq("id", Number(regieId))
      .eq("baustelle_id", Number(baustelleId))
      .single();

    if (berichtRes.error) {
      alert("LOAD REGIEBERICHT: " + berichtRes.error.message);
      setLoading(false);
      return;
    }

    const bericht = berichtRes.data;

    setBerichtNr(bericht.bericht_nr || "");
    setDatum(bericht.datum || "");
    setAuftraggeber(bericht.auftraggeber || "");
    setBauleiter(bericht.bauleiter || "");
    setOrt(bericht.ort || baustelleRes.data?.lokacija || "");
    setArbeiten(bericht.ausgefuehrte_arbeiten || "");

    const roomsRes = await supabase
      .from("regiebericht_rooms")
      .select("*")
      .eq("regiebericht_id", Number(regieId));

    const workersRes = await supabase
      .from("regiebericht_workers")
      .select("*")
      .eq("regiebericht_id", Number(regieId));

    const materialsRes = await supabase
      .from("regiebericht_materials")
      .select("*")
      .eq("regiebericht_id", Number(regieId));

    const photosRes = await supabase
      .from("regiebericht_photos")
      .select("*")
      .eq("regiebericht_id", Number(regieId));

    setSelectedRooms(
      (roomsRes.data || []).map((r: any) => ({
        room_id: r.room_id,
        room_name: r.room_name,
      }))
    );

    setWorkerRows(
      (workersRes.data || []).map((w: any) => ({
        worker_name: w.worker_name,
        von: w.von,
        bis: w.bis,
        pause: w.pause ?? 0,
        stunden: toNumberValue(w.stunden),
        bemerkung: w.bemerkung,
      }))
    );

    setMaterialRows(
      (materialsRes.data || []).map((m: any) => ({
        material_id: m.material_id,
        bezeichnung: m.bezeichnung || m.material_name || m.name || m.naziv || "-",
        menge: m.menge ?? m.quantity ?? m.kolicina ?? "",
        einheit: m.einheit || m.unit || m.jedinica || "",
      }))
    );

    setPhotos(
      (photosRes.data || []).map((p: any) => {
        const url = p.photo_url || p.url || p.image_url || "";
        const isPdf = isPdfUrl(url);

        return {
          file: null,
          preview: url,
          photo_url: url,
          note: p.note || p.notiz || p.napomena || "",
          kind: isPdf ? "pdf" : "image",
          file_name: getFileNameFromUrl(url),
        };
      })
    );

    setLoading(false);
  }

  function exportPrint() {
    window.print();
  }

  const gesamtStunden = workerRows.reduce(
    (sum, row) => sum + toNumberValue(row.stunden),
    0
  );

  if (!accessChecked) {
    return (
      <main style={styles.page}>
        <p>Zugriff wird geprüft...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main style={styles.page}>
        <Link href="/baustellen" style={styles.backLink}>
          ← Zurück zu Baustellen
        </Link>

        <section style={styles.inputPanel}>
          <h1 style={styles.inputTitle}>Kein Zugriff</h1>
          <p>Diese Seite ist nur für Admins sichtbar.</p>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div className="no-print" style={styles.topBar}>
        <Link href={`/baustellen/archiv/${baustelleId}/regieberichte`} style={styles.backLink}>
          ← Zurück zu Regieberichte
        </Link>

        <div style={styles.topButtons}>
          <Link href={`/baustellen/archiv/${baustelleId}`} style={styles.blueButton}>
            Abschlussbericht
          </Link>

          <button onClick={exportPrint} style={styles.printButtonSmall}>
            Vorschau / Drucken
          </button>
        </div>
      </div>

      {loading ? (
        <section className="no-print" style={styles.inputPanel}>
          Regiebericht wird geladen...
        </section>
      ) : (
        <>
      <section className="print-sheet" style={styles.printSheet}>
        {mountainBgUrl && (
          <img
            src={mountainBgUrl}
            alt=""
            style={styles.mountainBackground}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.style.display = "none";
            }}
          />
        )}

        {sideImageUrl && (
          <img
            src={sideImageUrl}
            alt=""
            style={styles.sidePaperImage}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              const step = img.dataset.step || "0";

              if (step === "0") {
                img.dataset.step = "1";
                img.src = getStoragePublicUrl("Strana.png");
                return;
              }

              if (step === "1") {
                img.dataset.step = "2";
                img.src = getStoragePublicUrl("strana.heic");
                return;
              }

              if (step === "2") {
                img.dataset.step = "3";
                img.src = getStoragePublicUrl("Strana.heic");
                return;
              }

              if (step === "3") {
                img.dataset.step = "4";
                img.src = getStoragePublicUrl("srtana.heic");
                return;
              }

              img.style.display = "none";
            }}
          />
        )}

        <div style={styles.printContent}>
          <div style={styles.printHeader}>
            <div style={styles.titleWithLogo}>
              {logoTopUrl && (
                <>
                  <img
                    src={logoTopUrl}
                    alt="Stone Boutique"
                    style={styles.headerLogo}
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      const step = img.dataset.step || "0";

                      if (step === "0") {
                        img.dataset.step = "1";
                        img.src = getStoragePublicUrl("Gore.png");
                        return;
                      }

                      if (step === "1") {
                        img.dataset.step = "2";
                        img.src = getStoragePublicUrl("gore.heic");
                        return;
                      }

                      if (step === "2") {
                        img.dataset.step = "3";
                        img.src = getStoragePublicUrl("Gore.heic");
                        return;
                      }

                      img.style.display = "none";
                      const next = img.nextElementSibling as HTMLElement | null;
                      if (next) next.style.display = "block";
                    }}
                  />

                  <div style={styles.logoFallback}>
                    <div style={styles.logoFallbackOrange}>STONE BOUTIQUE</div>
                    <div style={styles.logoFallbackSmall}>
                      Nocker & Bernardi GmbH
                    </div>
                  </div>
                </>
              )}

              <div>
                <div style={styles.documentTitle}>REGIEBERICHT</div>
                <div style={styles.documentSub}>
                  Tagesbericht / Regiearbeit
                </div>
              </div>
            </div>

            <div style={styles.headerRight}>
              <div>
                <strong>Nr.:</strong> {berichtNr || "-"}
              </div>
              <div>
                <strong>Datum:</strong> {formatDatum(datum)}
              </div>
            </div>
          </div>

        <div style={styles.metaGrid}>
          <div style={styles.metaBox}>
            <div style={styles.metaLabel}>Baustelle</div>
            <div style={styles.metaValue}>{baustelle?.naziv || "-"}</div>
          </div>

          <div style={styles.metaBox}>
            <div style={styles.metaLabel}>Ort</div>
            <div style={styles.metaValue}>{ort || "-"}</div>
          </div>

          <div style={styles.metaBox}>
            <div style={styles.metaLabel}>Auftraggeber</div>
            <div style={styles.metaValue}>{auftraggeber || "-"}</div>
          </div>

          <div style={styles.metaBox}>
            <div style={styles.metaLabel}>Auftragnehmer</div>
            <div style={styles.metaValue}>
              {FIRMA}
              <br />
              {FIRMA_ADRESA}
            </div>
          </div>

          <div style={styles.metaBox}>
            <div style={styles.metaLabel}>Bauleiter / Vertreter</div>
            <div style={styles.metaValue}>{bauleiter || "-"}</div>
          </div>

          <div style={styles.metaBox}>
            <div style={styles.metaLabel}>Bauteile / Räume</div>
            <div style={styles.metaValue}>
              {selectedRooms.length > 0
                ? selectedRooms.map((r) => r.room_name).join(", ")
                : "-"}
            </div>
          </div>
        </div>

        <div style={styles.printMainGrid}>
          <div style={styles.leftColumn}>
            <section style={styles.printBlock}>
              <h2 style={styles.printBlockTitle}>Ausgeführte Arbeiten</h2>
              <div style={styles.workText}>
                {arbeiten || "Keine Beschreibung eingetragen."}
              </div>
            </section>

            <section style={styles.printBlock}>
              <div style={styles.blockHeaderRow}>
                <h2 style={styles.printBlockTitle}>Arbeitskräfte</h2>
                <strong>Gesamt: {gesamtStunden.toFixed(2)} h</strong>
              </div>

              <table style={styles.cleanTable}>
                <thead>
                  <tr>
                    <th style={styles.cleanTh}>Mitarbeiter</th>
                    <th style={styles.cleanTh}>von</th>
                    <th style={styles.cleanTh}>bis</th>
                    <th style={styles.cleanTh}>Pause</th>
                    <th style={styles.cleanTh}>Std.</th>
                    <th style={styles.cleanTh}>Bemerkung</th>
                  </tr>
                </thead>

                <tbody>
                  {workerRows.length === 0 ? (
                    <tr>
                      <td style={styles.cleanTd} colSpan={6}>
                        Keine Arbeitskräfte eingetragen.
                      </td>
                    </tr>
                  ) : (
                    workerRows.map((w, index) => (
                      <tr key={index}>
                        <td style={styles.cleanTd}>{w.worker_name}</td>
                        <td style={styles.cleanTd}>{w.von}</td>
                        <td style={styles.cleanTd}>{w.bis}</td>
                        <td style={styles.cleanTd}>{w.pause ?? 0} h</td>
                        <td style={styles.cleanTd}>{w.stunden}</td>
                        <td style={styles.cleanTd}>{w.bemerkung || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

            </section>

            <section style={styles.printBlock}>
              <h2 style={styles.printBlockTitle}>Material / Geräte / Sonstiges</h2>

              <table style={styles.cleanTable}>
                <thead>
                  <tr>
                    <th style={styles.cleanTh}>Bezeichnung</th>
                    <th style={styles.cleanTh}>Menge</th>
                    <th style={styles.cleanTh}>EH</th>
                  </tr>
                </thead>

                <tbody>
                  {materialRows.length === 0 ? (
                    <tr>
                      <td style={styles.cleanTd} colSpan={3}>
                        Kein Material eingetragen.
                      </td>
                    </tr>
                  ) : (
                    materialRows.map((m, index) => (
                      <tr key={index}>
                        <td style={styles.cleanTd}>{m.bezeichnung}</td>
                        <td style={styles.cleanTd}>{m.menge}</td>
                        <td style={styles.cleanTd}>{m.einheit}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

            </section>
          </div>

          <div style={styles.rightColumn}>
            <section style={styles.photoPrintBlock}>
              <h2 style={styles.printBlockTitle}>Fotodokumentation</h2>

              <div style={styles.printPhotoGrid}>
                {Array.from({ length: 2 }).map((_, index) => {
                  const p = getImagePhotos()[index];

                  if (!p) {
                    return (
                      <div key={index} style={styles.emptyPhoto}>
                        Foto {index + 1}
                      </div>
                    );
                  }

                  return (
                    <div key={index} style={styles.printPhotoCard}>
                      <img
                        src={p.preview}
                        alt={`Foto ${index + 1}`}
                        style={styles.printPhoto}
                      />

                      {p.note && <div style={styles.photoCaption}>{p.note}</div>}
                    </div>
                  );
                })}
              </div>
            </section>

            <section style={styles.signatureBlock}>
              <div style={styles.signatureItem}>
                <div style={styles.signatureLine}></div>
                <strong>Auftragnehmer: {POTPIS}</strong>
              </div>

              <div style={styles.signatureItem}>
                <div style={styles.signatureLine}></div>
                <strong>Auftraggeber / Vertreter: {bauleiter || "-"}</strong>
              </div>
            </section>
          </div>
        </div>
        </div>
      </section>

      {getImagePhotos().slice(2).map((p, index) => (
        <section
          key={`image-beilage-${index}`}
          className="print-sheet beilage-sheet"
          style={styles.beilageSheet}
        >
          <div style={styles.beilageHeader}>
            <div>
              <strong>REGIEBERICHT Nr. {berichtNr || "-"}</strong>
              <br />
              Fotobeilage {index + 1}
            </div>
            <div>{formatDatum(datum)}</div>
          </div>

          <div style={styles.beilageTitle}>Fotodokumentation / Beilage</div>

          <img
            src={p.preview}
            alt={`Fotobeilage ${index + 1}`}
            style={styles.beilageImage}
          />

          {p.note && <div style={styles.beilageNote}>{p.note}</div>}
        </section>
      ))}

      {getPdfAttachments().length > 0 && (
        <section className="print-sheet beilage-sheet" style={styles.beilageSheet}>
          <div style={styles.beilageHeader}>
            <div>
              <strong>REGIEBERICHT Nr. {berichtNr || "-"}</strong>
              <br />
              PDF-Beilagen
            </div>
            <div>{formatDatum(datum)}</div>
          </div>

          <div style={styles.beilageTitle}>PDF-Beilagen / Rechnungen / Lieferscheine</div>

          <div style={styles.pdfList}>
            {getPdfAttachments().map((p, index) => (
              <div key={index} style={styles.pdfListItem}>
                <strong>PDF {index + 1}:</strong> {p.file_name || "Beilage"}
                {p.note ? <div style={styles.pdfNote}>{p.note}</div> : null}
                {p.preview ? (
                  <a
                    className="no-print"
                    href={p.preview}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.pdfLink}
                  >
                    PDF öffnen
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      )}


      <style>{`
        @page {
          size: A4 landscape;
          margin: 5mm;
        }

        @media print {
          .no-print {
            display: none !important;
          }

          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          main {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-sheet {
            width: 100% !important;
            min-height: auto !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .beilage-sheet {
            page-break-before: always !important;
            page-break-after: always !important;
          }
        }
      `}</style>
        </>
      )}
    </main>
  );
}

const styles: any = {
  page: {
    background: "#000",
    minHeight: "100vh",
    color: "white",
    padding: "28px",
  },
  topBar: {
    marginBottom: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
  },
  topButtons: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  backLink: {
    color: "#3b82f6",
    textDecoration: "none",
    fontWeight: "bold",
  },
  inputPanel: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: "18px",
    padding: "20px",
    marginBottom: "20px",
  },
  inputTitle: {
    color: "#f97316",
    fontSize: "42px",
    marginTop: 0,
    marginBottom: "20px",
  },
  panelTitle: {
    color: "#60a5fa",
    marginTop: 0,
    marginBottom: "15px",
  },
  editNotice: {
    background: "#1e3a8a",
    color: "white",
    padding: "12px",
    borderRadius: "10px",
    marginBottom: "18px",
    fontWeight: "bold",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
  },
  inlineGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 220px",
    gap: "14px",
  },
  workerGrid: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1.5fr 180px",
    gap: "12px",
  },
  materialGrid: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1.5fr 1fr 1fr 180px",
    gap: "12px",
  },
  label: {
    display: "block",
    color: "#aaa",
    marginBottom: "6px",
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    background: "#222",
    color: "white",
    border: "1px solid #333",
    padding: "14px",
    borderRadius: "10px",
    fontSize: "16px",
  },
  readonlyInput: {
    width: "100%",
    background: "#1a1a1a",
    color: "#d1d5db",
    border: "1px solid #333",
    padding: "14px",
    borderRadius: "10px",
    fontSize: "16px",
    cursor: "not-allowed",
    opacity: 1,
  },
  smallHint: {
    marginTop: "6px",
    color: "#fbbf24",
    fontSize: "12px",
    fontWeight: "bold",
  },
  readonlyBox: {
    background: "#222",
    color: "white",
    border: "1px solid #333",
    padding: "14px",
    borderRadius: "10px",
    minHeight: "42px",
  },
  textarea: {
    width: "100%",
    minHeight: "140px",
    background: "#222",
    color: "white",
    border: "1px solid #333",
    padding: "14px",
    borderRadius: "10px",
    fontSize: "16px",
    resize: "vertical",
  },
  blueButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "14px 20px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  newButton: {
    background: "#7c3aed",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "14px 20px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  listButton: {
    background: "#0ea5e9",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "14px 20px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  printButtonSmall: {
    background: "#f97316",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "14px 20px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  saveButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "16px 24px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px",
  },
  printButton: {
    background: "#f97316",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "16px 24px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px",
  },
  deleteButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  chipBox: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap",
    marginTop: "15px",
  },
  chip: {
    background: "#2563eb",
    padding: "10px 14px",
    borderRadius: "999px",
    fontWeight: "bold",
  },
  smallDelete: {
    marginLeft: "10px",
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  fileInput: {
    marginTop: "12px",
    marginBottom: "8px",
    color: "white",
  },
  hint: {
    color: "#aaa",
    marginBottom: 0,
  },
  actionRow: {
    display: "flex",
    gap: "15px",
    flexWrap: "wrap",
    marginTop: "25px",
    marginBottom: "40px",
  },
  emptyListBox: {
    background: "#222",
    border: "1px solid #333",
    borderRadius: "12px",
    padding: "18px",
    color: "#aaa",
    fontWeight: "bold",
  },
  listBox: {
    display: "grid",
    gap: "14px",
  },
  berichtCard: {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "14px",
    padding: "16px",
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  berichtListContent: {
    flex: 1,
    minWidth: "320px",
  },
  berichtWorkBlock: {
    marginTop: "14px",
    paddingTop: "12px",
    borderTop: "1px solid #333",
  },
  berichtWorkTitle: {
    color: "#60a5fa",
    fontWeight: "bold",
    marginBottom: "6px",
    textTransform: "uppercase",
  },
  berichtWorkText: {
    color: "#ddd",
    marginBottom: "10px",
    lineHeight: "1.45",
  },
  berichtTotalHours: {
    color: "#fff",
    fontWeight: "bold",
  },
  berichtTitle: {
    color: "#f97316",
    fontSize: "22px",
    fontWeight: "bold",
    marginBottom: "6px",
  },
  berichtInfo: {
    color: "#ddd",
    marginTop: "3px",
  },
  berichtActions: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap",
  },
  printSheet: {
    background: "#fff",
    color: "#111",
    WebkitPrintColorAdjust: "exact",
    printColorAdjust: "exact",
    maxWidth: "1100px",
    margin: "30px auto",
    padding: "14px",
    borderRadius: "8px",
    boxShadow: "0 10px 35px rgba(0,0,0,0.35)",
    fontFamily: "Arial, sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  printContent: {
    position: "relative",
    zIndex: 3,
    WebkitPrintColorAdjust: "exact",
    printColorAdjust: "exact",
  },
  logoTopBox: {
    height: "70px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "4px",
  },
  logoTopImage: {
    maxWidth: "360px",
    width: "45%",
    maxHeight: "68px",
    objectFit: "contain",
    display: "block",
  },
  mountainBackground: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center center",
    opacity: 0.48,
    zIndex: 1,
    pointerEvents: "none",
  },
  sidePaperImage: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "86px",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    opacity: 0.30,
    zIndex: 1,
    pointerEvents: "none",
    borderRight: "2px solid rgba(249, 115, 22, 0.35)",
  },
  titleWithLogo: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },
  headerLogo: {
    width: "140px",
    height: "48px",
    objectFit: "contain",
    objectPosition: "left center",
    display: "block",
  },
  logoFallback: {
    display: "none",
    width: "140px",
    minWidth: "145px",
    borderLeft: "4px solid #f97316",
    paddingLeft: "10px",
    lineHeight: "1.1",
  },
  logoFallbackOrange: {
    color: "#f97316",
    fontWeight: "900",
    fontSize: "15px",
    letterSpacing: "1px",
  },
  logoFallbackSmall: {
    color: "#111",
    fontWeight: "700",
    fontSize: "9px",
    marginTop: "4px",
  },
  printHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "2px solid #1e3a8a",
    paddingBottom: "6px",
    marginBottom: "7px",
  },
  documentTitle: {
    color: "#1e3a8a",
    fontSize: "26px",
    fontWeight: "bold",
    letterSpacing: "1px",
  },
  documentSub: {
    color: "#555",
    fontSize: "12px",
    marginTop: "2px",
  },
  headerRight: {
    textAlign: "right",
    fontSize: "13px",
    lineHeight: "1.6",
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.7fr 1fr 1.2fr 1fr 1.2fr",
    gap: "6px",
    marginBottom: "7px",
  },
  metaBox: {
    background: "rgba(255, 255, 255, 0.44)",
    border: "1px solid #d8dee9",
    borderRadius: "6px",
    padding: "6px",
    minHeight: "42px",
  },
  metaLabel: {
    color: "#1e3a8a",
    fontSize: "10px",
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: "3px",
  },
  metaValue: {
    fontSize: "12px",
    lineHeight: "1.25",
    whiteSpace: "pre-wrap",
  },
  printMainGrid: {
    display: "grid",
    gridTemplateColumns: "1.32fr 0.98fr",
    gap: "7px",
  },
  leftColumn: {
    display: "grid",
    gap: "6px",
  },
  rightColumn: {
    display: "grid",
    gap: "6px",
  },
  printBlock: {
    border: "1px solid #d8dee9",
    borderRadius: "7px",
    padding: "6px",
    background: "rgba(255, 255, 255, 0.44)",
  },
  printBlockTitle: {
    fontSize: "13px",
    color: "#1e3a8a",
    margin: "0 0 6px 0",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  blockHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "7px",
  },
  workText: {
    minHeight: "80px",
    whiteSpace: "pre-wrap",
    fontSize: "12px",
    lineHeight: "1.45",
  },
  cleanTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "11px",
  },
  cleanTh: {
    textAlign: "left",
    padding: "5px",
    background: "rgba(239, 246, 255, 0.48)",
    color: "#1e3a8a",
    borderBottom: "1px solid #cbd5e1",
  },
  cleanTd: {
    padding: "5px",
    borderBottom: "1px solid #e5e7eb",
    verticalAlign: "top",
  },
  editList: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
    marginTop: "10px",
  },
  photoPrintBlock: {
    border: "1px solid #d8dee9",
    borderRadius: "7px",
    padding: "6px",
    background: "rgba(255, 255, 255, 0.38)",
  },
  printPhotoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "6px",
    alignItems: "stretch",
  },
  printPhotoCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "7px",
    padding: "5px",
    background: "rgba(248, 250, 252, 0.34)",
  },
  printPhoto: {
    width: "100%",
    height: "300px",
    objectFit: "contain",
    objectPosition: "center",
    background: "#fff",
    borderRadius: "5px",
    display: "block",
  },
  photoCaption: {
    fontSize: "10px",
    color: "#555",
    marginTop: "4px",
  },
  emptyPhoto: {
    height: "300px",
    border: "1px dashed #cbd5e1",
    borderRadius: "7px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#94a3b8",
    background: "rgba(248, 250, 252, 0.30)",
    fontSize: "13px",
  },
  photoRemoveButton: {
    marginTop: "5px",
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "6px 8px",
    cursor: "pointer",
  },
  signatureBlock: {
    border: "1px solid #d8dee9",
    borderRadius: "7px",
    padding: "12px",
    background: "rgba(255, 255, 255, 0.38)",
    display: "grid",
    gap: "25px",
    alignContent: "end",
  },
  signatureItem: {
    fontSize: "11px",
  },
  signatureLine: {
    borderTop: "1px solid #111",
    marginBottom: "6px",
    paddingTop: "6px",
  },
  listTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  listTotalBadge: {
    background: "#14532d",
    color: "white",
    border: "1px solid #22c55e",
    borderRadius: "12px",
    padding: "12px 18px",
    fontSize: "20px",
    fontWeight: "bold",
  },
  attachmentPreviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginTop: "16px",
  },
  attachmentPreviewCard: {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "12px",
    padding: "10px",
  },
  attachmentPreviewTitle: {
    color: "#60a5fa",
    fontWeight: "bold",
    marginBottom: "8px",
  },
  attachmentPreviewImage: {
    width: "100%",
    height: "120px",
    objectFit: "cover",
    borderRadius: "8px",
    display: "block",
    marginBottom: "8px",
  },
  pdfPreviewBox: {
    minHeight: "80px",
    background: "#222",
    border: "1px dashed #555",
    borderRadius: "8px",
    padding: "12px",
    color: "#ddd",
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
  },
  beilageSheet: {
    background: "#fff",
    color: "#111",
    maxWidth: "1100px",
    minHeight: "760px",
    margin: "30px auto",
    padding: "22px",
    borderRadius: "8px",
    boxShadow: "0 10px 35px rgba(0,0,0,0.35)",
    fontFamily: "Arial, sans-serif",
    WebkitPrintColorAdjust: "exact",
    printColorAdjust: "exact",
  },
  beilageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "2px solid #1e3a8a",
    paddingBottom: "10px",
    marginBottom: "18px",
    color: "#1e3a8a",
  },
  beilageTitle: {
    color: "#f97316",
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "18px",
    textTransform: "uppercase",
  },
  beilageImage: {
    width: "100%",
    maxHeight: "620px",
    objectFit: "contain",
    border: "1px solid #ddd",
    borderRadius: "8px",
    display: "block",
  },
  beilageNote: {
    marginTop: "12px",
    fontSize: "14px",
    color: "#333",
  },
  pdfList: {
    display: "grid",
    gap: "12px",
  },
  pdfListItem: {
    border: "1px solid #d8dee9",
    borderRadius: "8px",
    padding: "14px",
    background: "#f8fafc",
    fontSize: "14px",
  },
  pdfNote: {
    marginTop: "6px",
    color: "#555",
  },
  pdfLink: {
    display: "inline-block",
    marginTop: "8px",
    color: "#2563eb",
    fontWeight: "bold",
  },
};

