"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

const FIRMA = "Nocker & Bernardi GmbH / Stone Boutique";
const FIRMA_ADRESA = "Innweg 3, A-6170 Zirl";
const POTPIS = "Hidajet Goletić";

const PDF_BUCKET = "pdf-assets";
const PDF_LOGO_TOP = "gore.png";
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

  return new Date(value).toLocaleDateString("de-AT", {
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

export default function ArchivRegieberichtePage() {
  const params = useParams();
  const baustelleId = String(params.id);

  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [baustelle, setBaustelle] = useState<any>(null);
  const [berichte, setBerichte] = useState<any[]>([]);

  const [logoTopUrl, setLogoTopUrl] = useState("");
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
    loadData();
  }, []);

  function getStoragePublicUrl(fileName: string) {
    const url = supabase.storage.from(PDF_BUCKET).getPublicUrl(fileName).data.publicUrl;
    return `${url}?v=${Date.now()}`;
  }

  function loadPdfImages() {
    setLogoTopUrl(getStoragePublicUrl(PDF_LOGO_TOP));
    setMountainBgUrl(getStoragePublicUrl(PDF_MOUNTAIN_BG));
  }

  function printAllRegieberichte() {
    if (berichte.length === 0) {
      alert("Keine Regieberichte vorhanden.");
      return;
    }

    setTimeout(() => {
      window.print();
    }, 150);
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
      .eq("baustelle_id", Number(baustelleId))
      .order("datum", { ascending: true })
      .order("id", { ascending: true });

    if (berichtError) {
      alert("LOAD REGIEBERICHTE: " + berichtError.message);
      setLoading(false);
      return;
    }

    const ids = (berichtData || []).map((b: any) => b.id);

    let workerRows: any[] = [];
    let roomRows: any[] = [];
    let materialRows: any[] = [];
    let photoRows: any[] = [];

    if (ids.length > 0) {
      const { data: workersData } = await supabase
        .from("regiebericht_workers")
        .select("*")
        .in("regiebericht_id", ids)
        .order("id", { ascending: true });

      workerRows = workersData || [];

      const { data: roomsData } = await supabase
        .from("regiebericht_rooms")
        .select("*")
        .in("regiebericht_id", ids)
        .order("id", { ascending: true });

      roomRows = roomsData || [];

      const { data: materialsData } = await supabase
        .from("regiebericht_materials")
        .select("*")
        .in("regiebericht_id", ids)
        .order("id", { ascending: true });

      materialRows = materialsData || [];

      const { data: photosData } = await supabase
        .from("regiebericht_photos")
        .select("*")
        .in("regiebericht_id", ids)
        .order("id", { ascending: true });

      photoRows = photosData || [];
    }

    const withDetails = (berichtData || []).map((bericht: any) => {
      const workersForBericht = workerRows.filter(
        (w: any) => Number(w.regiebericht_id) === Number(bericht.id)
      );

      const roomsForBericht = roomRows.filter(
        (r: any) => Number(r.regiebericht_id) === Number(bericht.id)
      );

      const materialsForBericht = materialRows.filter(
        (m: any) => Number(m.regiebericht_id) === Number(bericht.id)
      );

      const photosForBericht = photoRows
        .filter((p: any) => Number(p.regiebericht_id) === Number(bericht.id))
        .filter((p: any) => {
          const url = getPhotoUrl(p);
          return url && !String(url).toLowerCase().split("?")[0].endsWith(".pdf");
        });

      const totalHours = workersForBericht.reduce(
        (sum: number, row: any) =>
          sum + toNumberValue(row.stunden || row.sati || row.ukupno_sati),
        0
      );

      const workersText = [
        ...new Set(
          workersForBericht
            .map((w: any) => w.worker_name || w.radnik || w.name)
            .filter(Boolean)
        ),
      ].join(", ");

      const roomsText = roomsForBericht
        .map((r: any) => r.room_name || r.raum || r.name)
        .filter(Boolean)
        .join(", ");

      return {
        ...bericht,
        workers: workersForBericht,
        rooms: roomsForBericht,
        materials: materialsForBericht,
        photos: photosForBericht,
        totalHours,
        workersText,
        roomsText,
      };
    });

    setBerichte(withDetails);
    setLoading(false);
  }

  function getPhotoUrl(photo: any) {
    return (
      photo?.photo_url ||
      photo?.url ||
      photo?.image_url ||
      photo?.public_url ||
      photo?.bild_url ||
      photo?.foto_url ||
      ""
    );
  }

  function getRegieberichtNumber(bericht: any) {
    return bericht?.bericht_nr || bericht?.nummer || bericht?.id || "-";
  }

  function getRegieberichtOrt(bericht: any) {
    return bericht?.ort || bericht?.place || bericht?.location || baustelle?.lokacija || "-";
  }

  function getRegieberichtWorkText(bericht: any) {
    return (
      bericht?.ausgefuehrte_arbeiten ||
      bericht?.arbeiten ||
      bericht?.beschreibung ||
      bericht?.taetigkeit ||
      bericht?.bemerkung ||
      "Keine Beschreibung eingetragen."
    );
  }

  function getRegieberichtRoomText(bericht: any) {
    return (
      bericht?.roomsText ||
      bericht?.bauteile_raeume ||
      bericht?.bauteile ||
      bericht?.raeume ||
      bericht?.raum ||
      bericht?.room_name ||
      "-"
    );
  }

  function getAuftraggeberValue(bericht: any) {
    return (
      bericht?.auftraggeber ||
      baustelle?.auftraggeber ||
      baustelle?.kunde ||
      baustelle?.client ||
      "-"
    );
  }

  function getAuftragnehmerValue(bericht: any) {
    return (
      bericht?.auftragnehmer ||
      baustelle?.auftragnehmer ||
      baustelle?.firma ||
      FIRMA
    );
  }

  function getBauleiterValue(bericht: any) {
    return (
      bericht?.bauleiter ||
      baustelle?.bauleiter ||
      baustelle?.leiter ||
      baustelle?.bauleiter_vertreter ||
      "-"
    );
  }

  function getMaterialName(row: any) {
    return (
      row?.bezeichnung ||
      row?.material_name ||
      row?.name ||
      row?.naziv ||
      row?.material ||
      "-"
    );
  }

  function getMaterialAmount(row: any) {
    return row?.menge || row?.kolicina || row?.quantity || 0;
  }

  function getMaterialUnit(row: any) {
    return row?.einheit || row?.unit || row?.jedinica || "-";
  }

  function handleMountainError(e: any) {
    const img = e.currentTarget as HTMLImageElement;
    const step = img.dataset.step || "0";

    if (step === "0") {
      img.dataset.step = "1";
      img.src = getStoragePublicUrl("Pozadina.png");
      return;
    }

    if (step === "1") {
      img.dataset.step = "2";
      img.src = getStoragePublicUrl("pozadina.jpg");
      return;
    }

    if (step === "2") {
      img.dataset.step = "3";
      img.src = getStoragePublicUrl("planine.png");
      return;
    }

    if (step === "3") {
      img.dataset.step = "4";
      img.src = getStoragePublicUrl("Planine.png");
      return;
    }

    img.style.display = "none";
  }

  function handleLogoError(e: any) {
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
  }

  function renderPrintSheet(bericht: any, index: number) {
    const photos = bericht.photos || [];
    const workers = bericht.workers || [];
    const materials = bericht.materials || [];

    return (
      <section
        key={bericht.id || index}
        className="regie-print-sheet"
        style={styles.printSheet}
      >
        {mountainBgUrl && (
          <img
            src={mountainBgUrl}
            alt=""
            style={styles.mountainBackground}
            onError={handleMountainError}
          />
        )}

        <div style={styles.whiteSoftLayer}></div>

        <div style={styles.printContent}>
          <div style={styles.printHeader}>
            <div style={styles.titleWithLogo}>
              <div style={{ ...styles.logoFallback, display: "block" }}>
                <div style={styles.logoFallbackOrange}>STONE BOUTIQUE</div>
                <div style={styles.logoFallbackSmall}>
                  Nocker & Bernardi GmbH
                </div>
              </div>

              <div>
                <div style={styles.documentTitle}>REGIEBERICHT</div>
                <div style={styles.documentSub}>Tagesbericht / Regiearbeit</div>
              </div>
            </div>

            <div style={styles.headerRight}>
              <div>
                <strong>Nr.:</strong> {getRegieberichtNumber(bericht)}
              </div>
              <div>
                <strong>Datum:</strong> {formatDate(bericht.datum)}
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
              <div style={styles.metaValue}>{getRegieberichtOrt(bericht)}</div>
            </div>

            <div style={styles.metaBox}>
              <div style={styles.metaLabel}>Auftraggeber</div>
              <div style={styles.metaValue}>{getAuftraggeberValue(bericht)}</div>
            </div>

            <div style={styles.metaBox}>
              <div style={styles.metaLabel}>Auftragnehmer</div>
              <div style={styles.metaValue}>
                {getAuftragnehmerValue(bericht)}
                <br />
                {FIRMA_ADRESA}
              </div>
            </div>

            <div style={styles.metaBox}>
              <div style={styles.metaLabel}>Bauleiter / Vertreter</div>
              <div style={styles.metaValue}>{getBauleiterValue(bericht)}</div>
            </div>

            <div style={styles.metaBox}>
              <div style={styles.metaLabel}>Bauteile / Räume</div>
              <div style={styles.metaValue}>{getRegieberichtRoomText(bericht)}</div>
            </div>
          </div>

          <div style={styles.printMainGrid}>
            <div style={styles.leftColumn}>
              <section style={styles.printBlock}>
                <h2 style={styles.printBlockTitle}>Ausgeführte Arbeiten</h2>
                <div style={styles.workText}>{getRegieberichtWorkText(bericht)}</div>
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
                    {materials.length === 0 ? (
                      <tr>
                        <td style={styles.cleanTd} colSpan={3}>
                          Kein Material eingetragen.
                        </td>
                      </tr>
                    ) : (
                      materials.map((m: any, matIndex: number) => (
                        <tr key={m.id || matIndex}>
                          <td style={styles.cleanTd}>{getMaterialName(m)}</td>
                          <td style={styles.cleanTd}>
                            {formatNumber(getMaterialAmount(m))}
                          </td>
                          <td style={styles.cleanTd}>{getMaterialUnit(m)}</td>
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
                  {Array.from({ length: 2 }).map((_, photoIndex) => {
                    const photo = photos[photoIndex];
                    const url = photo ? getPhotoUrl(photo) : "";

                    if (!url) {
                      return (
                        <div key={photoIndex} style={styles.emptyPhoto}>
                          Foto {photoIndex + 1}
                        </div>
                      );
                    }

                    return (
                      <div key={photoIndex} style={styles.printPhotoCard}>
                        <img
                          src={url}
                          alt={`Foto ${photoIndex + 1}`}
                          style={styles.printPhoto}
                        />

                        {(photo.note || photo.bemerkung || photo.description) && (
                          <div style={styles.photoCaption}>
                            {photo.note || photo.bemerkung || photo.description}
                          </div>
                        )}
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
                  <strong>
                    Auftraggeber / Vertreter: {getBauleiterValue(bericht)}
                  </strong>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!accessChecked) {
    return (
      <main style={mainStyle}>
        <p>Zugriff wird geprüft...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main style={mainStyle}>
        <Link href="/baustellen" style={backLinkStyle}>
          ← Zurück zu Baustellen
        </Link>

        <div style={boxStyle}>
          <h1 style={{ color: "#dc2626" }}>Kein Zugriff</h1>
          <p>Diese Seite ist nur für Admins sichtbar.</p>
        </div>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <style>
        {`
          .print-only {
            display: none;
          }

          @page {
            size: A4 landscape;
            margin: 5mm;
          }

          @media print {
            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            main {
              background: white !important;
              color: black !important;
              padding: 0 !important;
              margin: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .no-print {
              display: none !important;
            }

            .print-only {
              display: block !important;
            }

            .regie-print-sheet {
              width: 287mm !important;
              height: 200mm !important;
              min-height: 200mm !important;
              max-height: 200mm !important;
              margin: 0 !important;
              padding: 14px !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              page-break-after: always !important;
              break-after: page !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .regie-print-sheet:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }

            table {
              font-size: 11px !important;
            }
          }
        `}
      </style>

      <div className="no-print">
        <div style={topBarStyle}>
          <Link href="/baustellen/archiv" style={backLinkStyle}>
            ← Zurück zum Archiv
          </Link>

          <div style={topButtonRowStyle}>
            <button
              type="button"
              onClick={printAllRegieberichte}
              style={exportAllButtonStyle}
            >
              📥 Export all / Alle drucken
            </button>

            <Link
              href={`/baustellen/archiv/${baustelleId}`}
              style={abschlussButtonStyle}
            >
              📄 Abschlussbericht öffnen
            </Link>
          </div>
        </div>

        <h1 style={titleStyle}>Regieberichte separat</h1>

        <section style={infoBoxStyle}>
          <h2 style={infoTitleStyle}>{baustelle?.naziv || "-"}</h2>

          <p style={mutedTextStyle}>Ort: {baustelle?.lokacija || "-"}</p>

          <p style={mutedTextStyle}>
            Mit Export all werden alle Regieberichte auf einmal als A4-Landscape
            gedruckt.
          </p>
        </section>

        {loading && <div style={boxStyle}>Regieberichte werden geladen...</div>}

        {!loading && berichte.length === 0 && (
          <div style={boxStyle}>
            Für diese Baustelle sind keine Regieberichte vorhanden.
          </div>
        )}

        {!loading && berichte.length > 0 && (
          <div style={gridStyle}>
            {berichte.map((bericht: any) => (
              <div key={bericht.id} style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <div>
                    <h2 style={cardTitleStyle}>
                      Regiebericht Nr. {bericht.bericht_nr || bericht.id}
                    </h2>

                    <p style={cardSubStyle}>
                      Datum: {formatDate(bericht.datum)}
                    </p>
                  </div>

                  <div style={hoursBadgeStyle}>
                    {formatNumber(bericht.totalHours)} h
                  </div>
                </div>

                <div style={detailGridStyle}>
                  <p>
                    <strong>Ort:</strong>
                    <br />
                    {bericht.ort || baustelle?.lokacija || "-"}
                  </p>

                  <p>
                    <strong>Auftraggeber:</strong>
                    <br />
                    {bericht.auftraggeber || "-"}
                  </p>

                  <p>
                    <strong>Bauleiter:</strong>
                    <br />
                    {bericht.bauleiter || "-"}
                  </p>

                  <p>
                    <strong>Räume:</strong>
                    <br />
                    {bericht.roomsText || "-"}
                  </p>

                  <p>
                    <strong>Mitarbeiter:</strong>
                    <br />
                    {bericht.workersText || "-"}
                  </p>

                  <p>
                    <strong>Fotos:</strong>
                    <br />
                    {bericht.photos.length}
                  </p>
                </div>

                <div style={workBoxStyle}>
                  <strong>Ausgeführte Arbeiten:</strong>
                  <div style={workTextStyle}>
                    {bericht.ausgefuehrte_arbeiten || "-"}
                  </div>
                </div>

                <div style={buttonRowStyle}>
                  <Link
                    href={`/baustellen/archiv/${baustelleId}/regieberichte/${bericht.id}`}
                    style={printButtonStyle}
                  >
                    🖨️ Öffnen / Drucken
                  </Link>

                  <Link
                    href={`/baustellen/${baustelleId}/regiebericht`}
                    style={editButtonStyle}
                  >
                    ✏️ Im Regiebericht-Modul öffnen
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <section className="print-only">
        {berichte.map((bericht: any, index: number) =>
          renderPrintSheet(bericht, index)
        )}
      </section>
    </main>
  );
}

const mainStyle: any = {
  background: "#000",
  minHeight: "100vh",
  color: "white",
  padding: "40px",
};

const topBarStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "30px",
};

const topButtonRowStyle: any = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "center",
};

const backLinkStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
};

const abschlussButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  textDecoration: "none",
  border: "none",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const exportAllButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  textDecoration: "none",
  border: "none",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const titleStyle: any = {
  fontSize: "56px",
  fontWeight: "bold",
  marginTop: 0,
  marginBottom: "25px",
};

const boxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  marginBottom: "20px",
};

const infoBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  padding: "25px",
  borderRadius: "20px",
  marginBottom: "25px",
};

const infoTitleStyle: any = {
  color: "#f97316",
  fontSize: "30px",
  marginTop: 0,
  marginBottom: "8px",
};

const mutedTextStyle: any = {
  color: "#cbd5e1",
  marginBottom: 0,
};

const gridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
  gap: "20px",
};

const cardStyle: any = {
  background: "#111",
  border: "1px solid #333",
  padding: "24px",
  borderRadius: "20px",
};

const cardHeaderStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start",
  marginBottom: "18px",
};

const cardTitleStyle: any = {
  color: "#f97316",
  fontSize: "26px",
  margin: 0,
};

const cardSubStyle: any = {
  color: "#cbd5e1",
  marginTop: "7px",
  marginBottom: 0,
};

const hoursBadgeStyle: any = {
  background: "#14532d",
  border: "1px solid #22c55e",
  color: "white",
  padding: "9px 12px",
  borderRadius: "999px",
  fontWeight: "bold",
  whiteSpace: "nowrap",
};

const detailGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "12px",
  color: "#ddd",
  marginBottom: "18px",
};

const workBoxStyle: any = {
  background: "#000",
  border: "1px solid #333",
  padding: "14px",
  borderRadius: "12px",
  color: "#ddd",
  marginBottom: "18px",
};

const workTextStyle: any = {
  marginTop: "8px",
  whiteSpace: "pre-wrap",
  lineHeight: "1.45",
};

const buttonRowStyle: any = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const printButtonStyle: any = {
  background: "#f97316",
  color: "white",
  textDecoration: "none",
  border: "none",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const editButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  textDecoration: "none",
  border: "none",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const styles: any = {
  printSheet: {
    background: "#fff",
    color: "#111",
    WebkitPrintColorAdjust: "exact",
    printColorAdjust: "exact",
    fontFamily: "Arial, sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  mountainBackground: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center center",
    opacity: 0.34,
    zIndex: 1,
    pointerEvents: "none",
  },
  whiteSoftLayer: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.70), rgba(255,255,255,0.58))",
    zIndex: 2,
    pointerEvents: "none",
  },
  printContent: {
    position: "relative",
    zIndex: 3,
    WebkitPrintColorAdjust: "exact",
    printColorAdjust: "exact",
  },
  titleWithLogo: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
  },
  headerLogo: {
    width: "118px",
    height: "40px",
    objectFit: "contain",
    objectPosition: "left center",
    display: "block",
  },
  logoFallback: {
    display: "none",
    width: "118px",
    minWidth: "118px",
    borderLeft: "4px solid #f97316",
    paddingLeft: "9px",
    lineHeight: "1.1",
  },
  logoFallbackOrange: {
    color: "#f97316",
    fontWeight: "900",
    fontSize: "13px",
    letterSpacing: "1px",
  },
  logoFallbackSmall: {
    color: "#111",
    fontWeight: "700",
    fontSize: "8px",
    marginTop: "3px",
  },
  printHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "2px solid #1e3a8a",
    paddingBottom: "7px",
    marginBottom: "8px",
  },
  documentTitle: {
    color: "#1e3a8a",
    fontSize: "27px",
    fontWeight: "bold",
    letterSpacing: "1px",
  },
  documentSub: {
    color: "#555",
    fontSize: "12px",
    marginTop: "3px",
  },
  headerRight: {
    textAlign: "right",
    fontSize: "13px",
    lineHeight: "1.6",
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.7fr 1fr 1.2fr 1fr 1.2fr",
    gap: "7px",
    marginBottom: "8px",
  },
  metaBox: {
    background: "rgba(255, 255, 255, 0.58)",
    border: "1px solid #d8dee9",
    borderRadius: "6px",
    padding: "7px",
    minHeight: "45px",
  },
  metaLabel: {
    color: "#1e3a8a",
    fontSize: "10px",
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: "4px",
  },
  metaValue: {
    fontSize: "12px",
    lineHeight: "1.25",
    whiteSpace: "pre-wrap",
  },
  printMainGrid: {
    display: "grid",
    gridTemplateColumns: "1.35fr 0.98fr",
    gap: "8px",
  },
  leftColumn: {
    display: "grid",
    gap: "7px",
  },
  rightColumn: {
    display: "grid",
    gap: "7px",
  },
  printBlock: {
    border: "1px solid #d8dee9",
    borderRadius: "7px",
    padding: "7px",
    background: "rgba(255, 255, 255, 0.58)",
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
    minHeight: "210px",
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
    background: "rgba(239, 246, 255, 0.65)",
    color: "#1e3a8a",
    borderBottom: "1px solid #cbd5e1",
  },
  cleanTd: {
    padding: "5px",
    borderBottom: "1px solid #e5e7eb",
    verticalAlign: "top",
  },
  photoPrintBlock: {
    border: "1px solid #d8dee9",
    borderRadius: "7px",
    padding: "7px",
    background: "rgba(255, 255, 255, 0.54)",
  },
  printPhotoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "7px",
    alignItems: "stretch",
  },
  printPhotoCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "7px",
    padding: "5px",
    background: "rgba(248, 250, 252, 0.55)",
  },
  printPhoto: {
    width: "100%",
    height: "300px",
    objectFit: "contain",
    objectPosition: "center",
    background: "rgba(255,255,255,0.65)",
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
    background: "rgba(248, 250, 252, 0.50)",
    fontSize: "13px",
  },
  signatureBlock: {
    border: "1px solid #d8dee9",
    borderRadius: "7px",
    padding: "12px",
    background: "rgba(255, 255, 255, 0.58)",
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
};
