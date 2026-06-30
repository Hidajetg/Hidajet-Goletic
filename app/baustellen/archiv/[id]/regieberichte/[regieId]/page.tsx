"use client";

import { useEffect, useMemo, useState } from "react";
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

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatNumber(value: any) {
  return Number(value || 0).toLocaleString("de-AT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
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

function getField(row: any, fields: string[], fallback = "-") {
  for (const field of fields) {
    if (row && row[field] !== null && row[field] !== undefined && row[field] !== "") {
      return row[field];
    }
  }

  return fallback;
}

function getStoragePublicUrl(bucket: string, path: string) {
  if (!path) return "";

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || "";
}

function getPhotoUrl(row: any) {
  const directUrl = getField(
    row,
    [
      "url",
      "photo_url",
      "image_url",
      "file_url",
      "public_url",
      "signed_url",
      "download_url",
    ],
    ""
  );

  if (directUrl && String(directUrl).startsWith("http")) {
    return String(directUrl);
  }

  const path = getField(
    row,
    [
      "path",
      "file_path",
      "storage_path",
      "photo_path",
      "image_path",
      "filename",
      "name",
    ],
    ""
  );

  if (!path) return "";

  const bucket = getField(row, ["bucket", "bucket_name"], "");

  if (bucket) {
    return getStoragePublicUrl(String(bucket), String(path));
  }

  return (
    getStoragePublicUrl("regiebericht-photos", String(path)) ||
    getStoragePublicUrl("baustelle-photos", String(path)) ||
    getStoragePublicUrl("room-photos", String(path)) ||
    getStoragePublicUrl("photos", String(path))
  );
}

export default function ArchivSingleRegieberichtPage() {
  const params = useParams();
  const baustelleId = String(params.id);
  const regieId = String(params.regieId);

  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [baustelle, setBaustelle] = useState<any>(null);
  const [bericht, setBericht] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);

  const [logoUrl, setLogoUrl] = useState("");
  const [sideUrl, setSideUrl] = useState("");
  const [bgUrl, setBgUrl] = useState("");

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
    loadData();
  }, []);

  function loadPdfImages() {
    setLogoUrl(getStoragePublicUrl(PDF_BUCKET, PDF_LOGO_TOP));
    setSideUrl(getStoragePublicUrl(PDF_BUCKET, PDF_SIDE_IMAGE));
    setBgUrl(getStoragePublicUrl(PDF_BUCKET, PDF_MOUNTAIN_BG));
  }

  async function loadData() {
    setLoading(true);

    const { data: baustelleData, error: baustelleError } = await supabase
      .from("baustellen")
      .select("*")
      .eq("id", Number(baustelleId))
      .single();

    if (baustelleError) {
      alert("LOAD BAUSTELLE: " + baustelleError.message);
      setLoading(false);
      return;
    }

    setBaustelle(baustelleData);

    const { data: berichtData, error: berichtError } = await supabase
      .from("regieberichte")
      .select("*")
      .eq("id", Number(regieId))
      .eq("baustelle_id", Number(baustelleId))
      .single();

    if (berichtError) {
      alert("LOAD REGIEBERICHT: " + berichtError.message);
      setLoading(false);
      return;
    }

    setBericht(berichtData);

    const { data: workersData } = await supabase
      .from("regiebericht_workers")
      .select("*")
      .eq("regiebericht_id", Number(regieId))
      .order("id", { ascending: true });

    const { data: roomsData } = await supabase
      .from("regiebericht_rooms")
      .select("*")
      .eq("regiebericht_id", Number(regieId))
      .order("id", { ascending: true });

    const { data: materialsData } = await supabase
      .from("regiebericht_materials")
      .select("*")
      .eq("regiebericht_id", Number(regieId))
      .order("id", { ascending: true });

    const { data: photosData } = await supabase
      .from("regiebericht_photos")
      .select("*")
      .eq("regiebericht_id", Number(regieId))
      .order("id", { ascending: true });

    setWorkers(workersData || []);
    setRooms(roomsData || []);
    setMaterials(materialsData || []);
    setPhotos(photosData || []);

    setLoading(false);
  }

  const totalHours = useMemo(() => {
    return workers.reduce((sum, row) => {
      return sum + toNumberValue(getField(row, ["stunden", "total", "gesamt"], 0));
    }, 0);
  }, [workers]);

  const photoUrls = useMemo(() => {
    return photos.map((p) => getPhotoUrl(p)).filter(Boolean).slice(0, 2);
  }, [photos]);

  const roomText = useMemo(() => {
    const names = rooms
      .map((r) => getField(r, ["room_name", "raum", "name", "naziv"], ""))
      .filter(Boolean);

    return names.length > 0 ? names.join(", ") : "-";
  }, [rooms]);

  const arbeitText = String(
    getField(
      bericht,
      [
        "ausgefuehrte_arbeiten",
        "ausgefuhrte_arbeiten",
        "arbeiten",
        "beschreibung",
        "opis",
        "description",
      ],
      "-"
    )
  );

  if (!accessChecked) {
    return (
      <main style={screenMainStyle}>
        <p>Zugriff wird geprüft...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main style={screenMainStyle}>
        <Link href="/baustellen" style={backLinkStyle}>
          ← Zurück zu Baustellen
        </Link>

        <div style={screenBoxStyle}>
          <h1 style={{ color: "#dc2626" }}>Kein Zugriff</h1>
          <p>Diese Seite ist nur für Admins sichtbar.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <style>{`
        @page {
          size: A4 landscape;
          margin: 5mm;
        }

        @media print {
          html,
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .no-print {
            display: none !important;
          }

          .print-page-wrap {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .print-sheet {
            width: 287mm !important;
            height: 200mm !important;
            max-width: none !important;
            min-height: 200mm !important;
            margin: 0 !important;
            padding: 14px !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-inner {
            height: 100% !important;
            overflow: hidden !important;
          }

          .print-button-area {
            display: none !important;
          }
        }
      `}</style>

      <main className="print-page-wrap" style={screenMainStyle}>
        <div className="no-print" style={topBarStyle}>
          <Link
            href={`/baustellen/archiv/${baustelleId}/regieberichte`}
            style={backLinkStyle}
          >
            ← Zurück zu Regieberichte
          </Link>

          <div style={topButtonRowStyle}>
            <Link
              href={`/baustellen/archiv/${baustelleId}`}
              style={blueButtonStyle}
            >
              📄 Abschlussbericht
            </Link>

            <button onClick={() => window.print()} style={orangeButtonStyle}>
              🖨️ Drucken / PDF
            </button>
          </div>
        </div>

        {loading && (
          <div className="no-print" style={screenBoxStyle}>
            Regiebericht wird geladen...
          </div>
        )}

        {!loading && !bericht && (
          <div className="no-print" style={screenBoxStyle}>
            Regiebericht wurde nicht gefunden.
          </div>
        )}

        {!loading && bericht && (
          <section className="print-sheet" style={styles.printSheet}>
            <div
              className="print-inner"
              style={{
                ...styles.printInner,
                backgroundImage: bgUrl ? `url(${bgUrl})` : "none",
              }}
            >
              {sideUrl && (
                <img
                  src={sideUrl}
                  alt=""
                  style={styles.sideImage}
                />
              )}

              <header style={styles.header}>
                <div style={styles.companyBlock}>
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      style={styles.logo}
                    />
                  )}

                  <div>
                    <div style={styles.companyName}>{FIRMA}</div>
                    <div style={styles.companyAddress}>{FIRMA_ADRESA}</div>
                  </div>
                </div>

                <div style={styles.titleBlock}>
                  <h1 style={styles.title}>REGIEBERICHT</h1>
                  <div style={styles.reportNumber}>
                    Nr. {getField(bericht, ["bericht_nr", "nummer", "nr"], bericht.id)}
                  </div>
                </div>
              </header>

              <section style={styles.metaGrid}>
                <div style={styles.metaBox}>
                  <span style={styles.metaLabel}>Baustelle</span>
                  <strong>{baustelle?.naziv || "-"}</strong>
                </div>

                <div style={styles.metaBox}>
                  <span style={styles.metaLabel}>Ort</span>
                  <strong>
                    {getField(bericht, ["ort"], baustelle?.lokacija || "-")}
                  </strong>
                </div>

                <div style={styles.metaBox}>
                  <span style={styles.metaLabel}>Datum</span>
                  <strong>{formatDate(getField(bericht, ["datum"], ""))}</strong>
                </div>

                <div style={styles.metaBox}>
                  <span style={styles.metaLabel}>Auftraggeber</span>
                  <strong>{getField(bericht, ["auftraggeber"], "-")}</strong>
                </div>

                <div style={styles.metaBox}>
                  <span style={styles.metaLabel}>Bauleiter</span>
                  <strong>{getField(bericht, ["bauleiter"], "-")}</strong>
                </div>

                <div style={styles.metaBox}>
                  <span style={styles.metaLabel}>Räume</span>
                  <strong>{roomText}</strong>
                </div>
              </section>

              <section style={styles.mainGrid}>
                <div style={styles.leftColumn}>
                  <section style={styles.block}>
                    <h2 style={styles.blockTitle}>Ausgeführte Arbeiten</h2>
                    <div style={styles.workText}>{arbeitText}</div>
                  </section>

                  <section style={styles.block}>
                    <div style={styles.blockTitleRow}>
                      <h2 style={styles.blockTitle}>Arbeitskräfte</h2>
                      <div style={styles.totalHours}>
                        Gesamt: {formatNumber(totalHours)} h
                      </div>
                    </div>

                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Mitarbeiter</th>
                          <th style={styles.th}>Von</th>
                          <th style={styles.th}>Bis</th>
                          <th style={styles.th}>Pause</th>
                          <th style={styles.th}>Std.</th>
                        </tr>
                      </thead>

                      <tbody>
                        {workers.length === 0 && (
                          <tr>
                            <td style={styles.td} colSpan={5}>
                              Keine Arbeitskräfte eingetragen.
                            </td>
                          </tr>
                        )}

                        {workers.map((w, index) => (
                          <tr key={w.id || index}>
                            <td style={styles.td}>
                              {getField(w, ["worker_name", "name", "radnik"], "-")}
                            </td>
                            <td style={styles.tdSmall}>
                              {getField(w, ["von", "start", "start_time"], "-")}
                            </td>
                            <td style={styles.tdSmall}>
                              {getField(w, ["bis", "ende", "end_time"], "-")}
                            </td>
                            <td style={styles.tdSmall}>
                              {getField(w, ["pause"], "-")}
                            </td>
                            <td style={styles.tdSmall}>
                              {formatNumber(getField(w, ["stunden", "total", "gesamt"], 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>

                  <section style={styles.block}>
                    <h2 style={styles.blockTitle}>Material</h2>

                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Material</th>
                          <th style={styles.th}>Menge</th>
                          <th style={styles.th}>Einheit</th>
                          <th style={styles.th}>Notiz</th>
                        </tr>
                      </thead>

                      <tbody>
                        {materials.length === 0 && (
                          <tr>
                            <td style={styles.td} colSpan={4}>
                              Kein Material eingetragen.
                            </td>
                          </tr>
                        )}

                        {materials.map((m, index) => (
                          <tr key={m.id || index}>
                            <td style={styles.td}>
                              {getField(
                                m,
                                ["material_name", "name", "naziv", "bezeichnung"],
                                "-"
                              )}
                            </td>
                            <td style={styles.tdSmall}>
                              {formatNumber(
                                getField(m, ["menge", "quantity", "kolicina"], 0)
                              )}
                            </td>
                            <td style={styles.tdSmall}>
                              {getField(m, ["einheit", "unit", "jedinica"], "-")}
                            </td>
                            <td style={styles.td}>
                              {getField(m, ["notiz", "note", "napomena"], "-")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                </div>

                <div style={styles.rightColumn}>
                  <section style={styles.block}>
                    <h2 style={styles.blockTitle}>Fotodokumentation</h2>

                    <div style={styles.photoGrid}>
                      <div style={styles.photoBox}>
                        {photoUrls[0] ? (
                          <img
                            src={photoUrls[0]}
                            alt="Foto 1"
                            style={styles.photo}
                          />
                        ) : (
                          <span style={styles.noPhoto}>Foto 1</span>
                        )}
                      </div>

                      <div style={styles.photoBox}>
                        {photoUrls[1] ? (
                          <img
                            src={photoUrls[1]}
                            alt="Foto 2"
                            style={styles.photo}
                          />
                        ) : (
                          <span style={styles.noPhoto}>Foto 2</span>
                        )}
                      </div>
                    </div>
                  </section>

                  <section style={styles.block}>
                    <h2 style={styles.blockTitle}>Bemerkung</h2>
                    <div style={styles.noteText}>
                      {getField(
                        bericht,
                        ["bemerkung", "notiz", "note", "napomena"],
                        "-"
                      )}
                    </div>
                  </section>

                  <section style={styles.signatureBlock}>
                    <div style={styles.signatureBox}>
                      <div style={styles.signatureLine}></div>
                      <div style={styles.signatureLabel}>
                        Auftraggeber / Bauleitung
                      </div>
                    </div>

                    <div style={styles.signatureBox}>
                      <div style={styles.signatureName}>{POTPIS}</div>
                      <div style={styles.signatureLine}></div>
                      <div style={styles.signatureLabel}>
                        Auftragnehmer
                      </div>
                    </div>
                  </section>
                </div>
              </section>
            </div>
          </section>
        )}
      </main>
    </>
  );
}

const screenMainStyle: any = {
  background: "#000",
  minHeight: "100vh",
  color: "white",
  padding: "30px",
};

const topBarStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "25px",
};

const topButtonRowStyle: any = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const backLinkStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
};

const blueButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  textDecoration: "none",
  border: "none",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const orangeButtonStyle: any = {
  background: "#f97316",
  color: "white",
  textDecoration: "none",
  border: "none",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const screenBoxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  marginBottom: "20px",
};

const styles: any = {
  printSheet: {
    width: "287mm",
    minHeight: "200mm",
    background: "white",
    color: "#111",
    margin: "0 auto",
    borderRadius: "8px",
    boxShadow: "0 15px 45px rgba(0,0,0,0.45)",
    padding: "14px",
    boxSizing: "border-box",
    overflow: "hidden",
  },

  printInner: {
    position: "relative",
    height: "100%",
    minHeight: "calc(200mm - 28px)",
    border: "1px solid #ddd",
    padding: "12px 18px 12px 28px",
    boxSizing: "border-box",
    overflow: "hidden",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  },

  sideImage: {
    position: "absolute",
    left: "0",
    top: "0",
    bottom: "0",
    width: "20px",
    height: "100%",
    objectFit: "cover",
    opacity: 0.95,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    borderBottom: "2px solid #111",
    paddingBottom: "8px",
    marginBottom: "8px",
    position: "relative",
    zIndex: 2,
  },

  companyBlock: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  logo: {
    width: "96px",
    height: "46px",
    objectFit: "contain",
  },

  companyName: {
    fontSize: "17px",
    fontWeight: "800",
    letterSpacing: "0.2px",
  },

  companyAddress: {
    fontSize: "11px",
    color: "#444",
    marginTop: "2px",
  },

  titleBlock: {
    textAlign: "right",
  },

  title: {
    fontSize: "30px",
    margin: 0,
    letterSpacing: "1px",
  },

  reportNumber: {
    fontSize: "15px",
    fontWeight: "700",
    marginTop: "3px",
  },

  metaGrid: {
    display: "grid",
    gridTemplateColumns: "1.3fr 1fr 0.8fr 1fr 1fr 1fr",
    gap: "6px",
    marginBottom: "8px",
    position: "relative",
    zIndex: 2,
  },

  metaBox: {
    border: "1px solid #ccc",
    background: "rgba(255,255,255,0.9)",
    padding: "6px 7px",
    minHeight: "38px",
    boxSizing: "border-box",
    fontSize: "11px",
  },

  metaLabel: {
    display: "block",
    color: "#555",
    fontSize: "9px",
    textTransform: "uppercase",
    marginBottom: "2px",
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1.38fr 0.72fr",
    gap: "10px",
    position: "relative",
    zIndex: 2,
  },

  leftColumn: {
    display: "grid",
    gap: "8px",
  },

  rightColumn: {
    display: "grid",
    gap: "8px",
    alignContent: "start",
  },

  block: {
    border: "1px solid #bbb",
    background: "rgba(255,255,255,0.92)",
    padding: "7px",
    boxSizing: "border-box",
  },

  blockTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    marginBottom: "5px",
  },

  blockTitle: {
    fontSize: "13px",
    margin: "0 0 5px 0",
    fontWeight: "800",
    textTransform: "uppercase",
    borderBottom: "1px solid #ddd",
    paddingBottom: "3px",
  },

  totalHours: {
    fontSize: "12px",
    fontWeight: "800",
    background: "#111",
    color: "white",
    padding: "4px 8px",
    borderRadius: "5px",
    whiteSpace: "nowrap",
  },

  workText: {
    minHeight: "54px",
    maxHeight: "78px",
    overflow: "hidden",
    whiteSpace: "pre-wrap",
    fontSize: "12px",
    lineHeight: "1.35",
  },

  noteText: {
    minHeight: "45px",
    maxHeight: "65px",
    overflow: "hidden",
    whiteSpace: "pre-wrap",
    fontSize: "12px",
    lineHeight: "1.35",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "10.5px",
  },

  th: {
    border: "1px solid #bbb",
    background: "#eee",
    color: "#111",
    textAlign: "left",
    padding: "4px",
    fontWeight: "800",
  },

  td: {
    border: "1px solid #ccc",
    padding: "4px",
    verticalAlign: "top",
  },

  tdSmall: {
    border: "1px solid #ccc",
    padding: "4px",
    verticalAlign: "top",
    whiteSpace: "nowrap",
    textAlign: "center",
  },

  photoGrid: {
    display: "grid",
    gap: "7px",
  },

  photoBox: {
    height: "76mm",
    border: "1px solid #aaa",
    background: "#f3f3f3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  photo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  noPhoto: {
    color: "#777",
    fontSize: "14px",
    fontWeight: "700",
  },

  signatureBlock: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginTop: "4px",
  },

  signatureBox: {
    border: "1px solid #bbb",
    background: "rgba(255,255,255,0.94)",
    padding: "9px",
    minHeight: "52px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
  },

  signatureName: {
    textAlign: "center",
    fontSize: "13px",
    fontWeight: "700",
    marginBottom: "8px",
  },

  signatureLine: {
    borderBottom: "1px solid #111",
    height: "14px",
    marginBottom: "4px",
  },

  signatureLabel: {
    textAlign: "center",
    fontSize: "10px",
    color: "#555",
  },
};