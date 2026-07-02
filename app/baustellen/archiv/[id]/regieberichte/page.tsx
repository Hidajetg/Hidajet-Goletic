"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

const FIRMA = "Nocker & Bernardi GmbH / Stone Boutique";
const FIRMA_ADRESA = "Innweg 3, A-6170 Zirl";
const POTPIS = "Hidajet Goletić";

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

function getPhotoNote(photo: any) {
  return photo?.note || photo?.opis || photo?.beschreibung || photo?.description || "";
}

export default function ArchivRegieberichtePage() {
  const params = useParams();
  const baustelleId = String(params.id);

  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [baustelle, setBaustelle] = useState<any>(null);
  const [berichte, setBerichte] = useState<any[]>([]);

  useEffect(() => {
    const loggedUser = getLoggedUserFromLocalStorage();
    const adminOk = isAdminUser(loggedUser);

    setIsAdmin(adminOk);
    setAccessChecked(true);

    if (!adminOk) {
      setLoading(false);
      return;
    }

    loadData();
  }, []);

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
    let photoRows: any[] = [];
    let materialRows: any[] = [];

    if (ids.length > 0) {
      const { data: workersData } = await supabase
        .from("regiebericht_workers")
        .select("*")
        .in("regiebericht_id", ids);

      workerRows = workersData || [];

      const { data: roomsData } = await supabase
        .from("regiebericht_rooms")
        .select("*")
        .in("regiebericht_id", ids);

      roomRows = roomsData || [];

      const { data: photosData } = await supabase
        .from("regiebericht_photos")
        .select("*")
        .in("regiebericht_id", ids)
        .order("id", { ascending: true });

      photoRows = photosData || [];

      const { data: materialsData } = await supabase
        .from("regiebericht_materials")
        .select("*")
        .in("regiebericht_id", ids);

      materialRows = materialsData || [];
    }

    const withDetails = (berichtData || []).map((bericht: any) => {
      const workersForBericht = workerRows.filter(
        (w: any) => Number(w.regiebericht_id) === Number(bericht.id)
      );

      const roomsForBericht = roomRows.filter(
        (r: any) => Number(r.regiebericht_id) === Number(bericht.id)
      );

      const photosForBericht = photoRows.filter(
        (p: any) => Number(p.regiebericht_id) === Number(bericht.id)
      );

      const materialsForBericht = materialRows.filter(
        (m: any) => Number(m.regiebericht_id) === Number(bericht.id)
      );

      const totalHours = workersForBericht.reduce(
        (sum: number, row: any) => sum + toNumberValue(row.stunden || row.sati || row.ukupno_sati),
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
        photos: photosForBericht,
        materials: materialsForBericht,
        totalHours,
        workersText,
        roomsText,
      };
    });

    setBerichte(withDetails);
    setLoading(false);
  }

  function printAllRegieberichte() {
    if (loading) return;

    if (berichte.length === 0) {
      alert("Keine Regieberichte vorhanden.");
      return;
    }

    setTimeout(() => {
      window.print();
    }, 100);
  }

  function getRegieberichtNumber(bericht: any) {
    return bericht?.bericht_nr || bericht?.nummer || bericht?.id || "-";
  }

  function getRegieberichtOrt(bericht: any) {
    return bericht?.ort || baustelle?.lokacija || "-";
  }

  function getAuftraggeberValue(bericht: any) {
    return bericht?.auftraggeber || baustelle?.auftraggeber || baustelle?.kunde || "-";
  }

  function getAuftragnehmerValue(bericht: any) {
    return bericht?.auftragnehmer || baustelle?.auftragnehmer || baustelle?.firma || FIRMA;
  }

  function getBauleiterValue(bericht: any) {
    return bericht?.bauleiter || baustelle?.bauleiter || baustelle?.leiter || "-";
  }

  function getWorkText(bericht: any) {
    return (
      bericht?.ausgefuehrte_arbeiten ||
      bericht?.arbeiten ||
      bericht?.beschreibung ||
      bericht?.taetigkeit ||
      bericht?.bemerkung ||
      "-"
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
          .regie-print-only {
            display: none;
          }

          @page {
            size: A4 landscape;
            margin: 7mm;
          }

          @media print {
            body {
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

            .screen-only {
              display: none !important;
            }

            .regie-print-only {
              display: block !important;
            }

            .regie-print-page {
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            .regie-print-page:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
          }
        `}
      </style>

      <div className="screen-only">
        <div style={topBarStyle}>
          <Link href="/baustellen/archiv" style={backLinkStyle}>
            ← Zurück zum Archiv
          </Link>

          <div style={topButtonRowStyle}>
            <button
              type="button"
              onClick={printAllRegieberichte}
              style={{
                ...exportAllButtonStyle,
                opacity: loading || berichte.length === 0 ? 0.6 : 1,
                cursor: loading || berichte.length === 0 ? "not-allowed" : "pointer",
              }}
              disabled={loading || berichte.length === 0}
            >
              📥 Export all / Alle Regieberichte drucken
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
            Mit Export all werden alle Regieberichte zusammen gedruckt oder als PDF gespeichert.
            Einzelne Regieberichte können weiterhin separat geöffnet werden.
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

      <section className="regie-print-only">
        {berichte.map((bericht: any) => {
          const photoRows = (bericht.photos || [])
            .filter((photo: any) => {
              const url = getPhotoUrl(photo);
              return url && !String(url).toLowerCase().split("?")[0].endsWith(".pdf");
            })
            .slice(0, 2);

          return (
            <section
              key={bericht.id}
              className="regie-print-page"
              style={printPageStyle}
            >
              <div style={printHeaderStyle}>
                <div style={logoBoxStyle}>
                  <div style={logoMainStyle}>STONE BOUTIQUE</div>
                  <div style={logoSubStyle}>Nocker & Bernardi GmbH</div>
                </div>

                <div>
                  <div style={printTitleStyle}>REGIEBERICHT</div>
                  <div style={printSubTitleStyle}>Tagesbericht / Regiearbeit</div>
                </div>

                <div style={printHeaderRightStyle}>
                  <div>
                    <strong>Nr.:</strong> {getRegieberichtNumber(bericht)}
                  </div>
                  <div>
                    <strong>Datum:</strong> {formatDate(bericht.datum)}
                  </div>
                </div>
              </div>

              <div style={printMetaGridStyle}>
                <div style={printMetaBoxStyle}>
                  <div style={printMetaLabelStyle}>Baustelle</div>
                  <div style={printMetaValueStyle}>{baustelle?.naziv || "-"}</div>
                </div>

                <div style={printMetaBoxStyle}>
                  <div style={printMetaLabelStyle}>Ort</div>
                  <div style={printMetaValueStyle}>{getRegieberichtOrt(bericht)}</div>
                </div>

                <div style={printMetaBoxStyle}>
                  <div style={printMetaLabelStyle}>Auftraggeber</div>
                  <div style={printMetaValueStyle}>{getAuftraggeberValue(bericht)}</div>
                </div>

                <div style={printMetaBoxStyle}>
                  <div style={printMetaLabelStyle}>Auftragnehmer</div>
                  <div style={printMetaValueStyle}>
                    {getAuftragnehmerValue(bericht)}
                    <br />
                    {FIRMA_ADRESA}
                  </div>
                </div>

                <div style={printMetaBoxStyle}>
                  <div style={printMetaLabelStyle}>Bauleiter / Vertreter</div>
                  <div style={printMetaValueStyle}>{getBauleiterValue(bericht)}</div>
                </div>

                <div style={printMetaBoxStyle}>
                  <div style={printMetaLabelStyle}>Bauteile / Räume</div>
                  <div style={printMetaValueStyle}>{bericht.roomsText || bericht.raum || "-"}</div>
                </div>
              </div>

              <div style={printMainGridStyle}>
                <div style={printLeftColumnStyle}>
                  <section style={printBlockStyle}>
                    <h2 style={printBlockTitleStyle}>Ausgeführte Arbeiten</h2>
                    <div style={printWorkTextStyle}>{getWorkText(bericht)}</div>
                  </section>

                  <section style={printBlockStyle}>
                    <div style={printBlockHeaderRowStyle}>
                      <h2 style={printBlockTitleStyle}>Arbeitskräfte</h2>
                      <strong>Gesamt: {formatNumber(bericht.totalHours)} h</strong>
                    </div>

                    <table style={printTableStyle}>
                      <thead>
                        <tr>
                          <th style={printThStyle}>Mitarbeiter</th>
                          <th style={printThStyle}>von</th>
                          <th style={printThStyle}>bis</th>
                          <th style={printThStyle}>Pause</th>
                          <th style={printThStyle}>Std.</th>
                          <th style={printThStyle}>Bemerkung</th>
                        </tr>
                      </thead>

                      <tbody>
                        {bericht.workers.length === 0 ? (
                          <tr>
                            <td style={printTdStyle} colSpan={6}>
                              Keine Arbeitskräfte eingetragen.
                            </td>
                          </tr>
                        ) : (
                          bericht.workers.map((worker: any, index: number) => (
                            <tr key={worker.id || index}>
                              <td style={printTdStyle}>
                                {worker.worker_name || worker.radnik || "-"}
                              </td>
                              <td style={printTdStyle}>{worker.von || worker.pocetak || "-"}</td>
                              <td style={printTdStyle}>{worker.bis || worker.kraj || "-"}</td>
                              <td style={printTdStyle}>
                                {formatNumber(worker.pause || worker.pauza || 0)} h
                              </td>
                              <td style={printTdStyle}>
                                {formatNumber(worker.stunden || worker.sati || worker.ukupno_sati)} h
                              </td>
                              <td style={printTdStyle}>{worker.bemerkung || worker.notiz || "-"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </section>

                  <section style={printBlockStyle}>
                    <h2 style={printBlockTitleStyle}>Material / Geräte / Sonstiges</h2>

                    <table style={printTableStyle}>
                      <thead>
                        <tr>
                          <th style={printThStyle}>Bezeichnung</th>
                          <th style={printThStyle}>Menge</th>
                          <th style={printThStyle}>EH</th>
                        </tr>
                      </thead>

                      <tbody>
                        {bericht.materials.length === 0 ? (
                          <tr>
                            <td style={printTdStyle} colSpan={3}>
                              Kein Material eingetragen.
                            </td>
                          </tr>
                        ) : (
                          bericht.materials.map((material: any, index: number) => (
                            <tr key={material.id || index}>
                              <td style={printTdStyle}>
                                {material.bezeichnung || material.material_name || material.name || "-"}
                              </td>
                              <td style={printTdStyle}>
                                {formatNumber(material.menge || material.kolicina || 0)}
                              </td>
                              <td style={printTdStyle}>{material.einheit || material.unit || "-"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </section>
                </div>

                <div style={printRightColumnStyle}>
                  <section style={printPhotoBlockStyle}>
                    <h2 style={printBlockTitleStyle}>Fotodokumentation</h2>

                    <div style={printPhotoGridStyle}>
                      {Array.from({ length: 2 }).map((_, index) => {
                        const photo = photoRows[index];
                        const url = photo ? getPhotoUrl(photo) : "";

                        if (!url) {
                          return (
                            <div key={index} style={printEmptyPhotoStyle}>
                              Foto {index + 1}
                            </div>
                          );
                        }

                        return (
                          <div key={photo.id || index} style={printPhotoCardStyle}>
                            <img
                              src={url}
                              alt={`Foto ${index + 1}`}
                              style={printPhotoStyle}
                            />

                            {getPhotoNote(photo) && (
                              <div style={printPhotoCaptionStyle}>{getPhotoNote(photo)}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section style={printSignatureBlockStyle}>
                    <div style={printSignatureItemStyle}>
                      <div style={printSignatureLineStyle}></div>
                      <strong>Auftragnehmer: {POTPIS}</strong>
                    </div>

                    <div style={printSignatureItemStyle}>
                      <div style={printSignatureLineStyle}></div>
                      <strong>Auftraggeber / Vertreter: {getBauleiterValue(bericht)}</strong>
                    </div>
                  </section>
                </div>
              </div>
            </section>
          );
        })}
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
  alignItems: "center",
  flexWrap: "wrap",
};

const backLinkStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
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

const printPageStyle: any = {
  width: "283mm",
  minHeight: "196mm",
  boxSizing: "border-box",
  background: "#fff",
  color: "#111",
  padding: "10mm",
  fontFamily: "Arial, sans-serif",
  overflow: "hidden",
  position: "relative",
};

const printHeaderStyle: any = {
  display: "grid",
  gridTemplateColumns: "150px 1fr 130px",
  gap: "18px",
  alignItems: "start",
  borderBottom: "3px solid #1e3a8a",
  paddingBottom: "8px",
  marginBottom: "10px",
};

const logoBoxStyle: any = {
  borderLeft: "5px solid #f97316",
  paddingLeft: "10px",
  lineHeight: 1.05,
};

const logoMainStyle: any = {
  color: "#f97316",
  fontWeight: "900",
  fontSize: "18px",
  letterSpacing: "1px",
};

const logoSubStyle: any = {
  color: "#111",
  fontWeight: "700",
  fontSize: "9px",
  marginTop: "5px",
};

const printTitleStyle: any = {
  color: "#1e3a8a",
  fontSize: "31px",
  fontWeight: "900",
  letterSpacing: "1px",
};

const printSubTitleStyle: any = {
  color: "#555",
  fontSize: "12px",
  marginTop: "4px",
};

const printHeaderRightStyle: any = {
  textAlign: "right",
  fontSize: "13px",
  lineHeight: 1.6,
};

const printMetaGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "1.2fr 0.7fr 1fr 1.25fr 1fr 1.1fr",
  gap: "7px",
  marginBottom: "10px",
};

const printMetaBoxStyle: any = {
  border: "1px solid #cbd5e1",
  borderRadius: "7px",
  padding: "7px",
  minHeight: "48px",
  background: "#fff",
};

const printMetaLabelStyle: any = {
  color: "#1e3a8a",
  fontSize: "10px",
  fontWeight: "900",
  textTransform: "uppercase",
  marginBottom: "4px",
};

const printMetaValueStyle: any = {
  fontSize: "12px",
  lineHeight: 1.25,
  whiteSpace: "pre-wrap",
};

const printMainGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "1.35fr 0.9fr",
  gap: "9px",
};

const printLeftColumnStyle: any = {
  display: "grid",
  gap: "8px",
};

const printRightColumnStyle: any = {
  display: "grid",
  gap: "8px",
};

const printBlockStyle: any = {
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  padding: "8px",
  background: "#fff",
};

const printBlockTitleStyle: any = {
  fontSize: "13px",
  color: "#1e3a8a",
  margin: "0 0 7px 0",
  textTransform: "uppercase",
  letterSpacing: "0.4px",
};

const printBlockHeaderRowStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
};

const printWorkTextStyle: any = {
  minHeight: "70px",
  whiteSpace: "pre-wrap",
  fontSize: "12px",
  lineHeight: 1.45,
};

const printTableStyle: any = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "11px",
};

const printThStyle: any = {
  textAlign: "left",
  padding: "5px",
  background: "#f1f5f9",
  color: "#1e3a8a",
  borderBottom: "1px solid #cbd5e1",
};

const printTdStyle: any = {
  padding: "5px",
  borderBottom: "1px solid #e5e7eb",
  verticalAlign: "top",
};

const printPhotoBlockStyle: any = {
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  padding: "8px",
  background: "#fff",
};

const printPhotoGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "7px",
};

const printPhotoCardStyle: any = {
  border: "1px solid #e5e7eb",
  borderRadius: "7px",
  padding: "5px",
  background: "#fff",
};

const printPhotoStyle: any = {
  width: "100%",
  height: "285px",
  objectFit: "contain",
  objectPosition: "center",
  background: "#fff",
  borderRadius: "5px",
  display: "block",
};

const printPhotoCaptionStyle: any = {
  fontSize: "10px",
  color: "#555",
  marginTop: "4px",
};

const printEmptyPhotoStyle: any = {
  height: "285px",
  border: "1px dashed #cbd5e1",
  borderRadius: "7px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#94a3b8",
  background: "#f8fafc",
  fontSize: "13px",
};

const printSignatureBlockStyle: any = {
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  padding: "14px",
  background: "#fff",
  display: "grid",
  gap: "25px",
  alignContent: "end",
};

const printSignatureItemStyle: any = {
  fontSize: "11px",
};

const printSignatureLineStyle: any = {
  borderTop: "1px solid #111",
  marginBottom: "6px",
  paddingTop: "6px",
};
