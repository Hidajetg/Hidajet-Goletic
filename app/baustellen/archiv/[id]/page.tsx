"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

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

export default function ArchivBerichtPage() {
  const params = useParams();
  const baustelleId = String(params.id);

  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [baustelle, setBaustelle] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [hours, setHours] = useState<any[]>([]);
  const [regieberichte, setRegieberichte] = useState<any[]>([]);
  const [regieHours, setRegieHours] = useState<any[]>([]);
  const [regieRooms, setRegieRooms] = useState<any[]>([]);
  const [regieMaterials, setRegieMaterials] = useState<any[]>([]);
  const [regiePhotos, setRegiePhotos] = useState<any[]>([]);
  const [productivity, setProductivity] = useState<any[]>([]);
  const [roomMaterials, setRoomMaterials] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [baustelleInfo, setBaustelleInfo] = useState<any[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

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
    loadReport();
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

  async function loadReport() {
    setLoading(true);

    const { data: baustelleData, error: baustelleError } = await supabase
      .from("baustellen")
      .select("*")
      .eq("id", Number(baustelleId))
      .single();

    if (baustelleError) {
      alert("Fehler beim Laden der Baustelle: " + baustelleError.message);
      setLoading(false);
      return;
    }

    const { data: roomsData } = await supabase
      .from("prostorije")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("id", { ascending: true });

    const { data: hoursData } = await supabase
      .from("baustelle_hours")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("datum", { ascending: true });

    const workerIds = [
      ...new Set((hoursData || []).map((h: any) => h.worker_id).filter(Boolean)),
    ];

    let workersData: any[] = [];

    if (workerIds.length > 0) {
      const { data } = await supabase
        .from("workers")
        .select("id, name")
        .in("id", workerIds);

      workersData = data || [];
    }

    const workerNameById = new Map(
      workersData.map((w: any) => [Number(w.id), w.name])
    );

    const hoursWithFullWorkerNames = (hoursData || []).map((h: any) => ({
      ...h,
      worker_full_name:
        workerNameById.get(Number(h.worker_id)) ||
        h.radnik ||
        h.worker_name ||
        h.worker ||
        "",
    }));

    const { data: regieberichteData } = await supabase
      .from("regieberichte")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("datum", { ascending: true });

    const regieberichtIds = (regieberichteData || []).map((r: any) => r.id);

    let regieWorkersData: any[] = [];
    let regieRoomsData: any[] = [];
    let regieMaterialsData: any[] = [];
    let regiePhotosData: any[] = [];

    if (regieberichtIds.length > 0) {
      const { data: workersData } = await supabase
        .from("regiebericht_workers")
        .select("*")
        .in("regiebericht_id", regieberichtIds);

      regieWorkersData = workersData || [];

      const { data: roomsRegieData } = await supabase
        .from("regiebericht_rooms")
        .select("*")
        .in("regiebericht_id", regieberichtIds);

      regieRoomsData = roomsRegieData || [];

      const { data: materialsRegieData } = await supabase
        .from("regiebericht_materials")
        .select("*")
        .in("regiebericht_id", regieberichtIds);

      regieMaterialsData = materialsRegieData || [];

      const { data: photosRegieData } = await supabase
        .from("regiebericht_photos")
        .select("*")
        .in("regiebericht_id", regieberichtIds)
        .order("id", { ascending: true });

      regiePhotosData = photosRegieData || [];
    }

    const { data: productivityData } = await supabase
      .from("produktivnost")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("datum", { ascending: true });

    const { data: infoData } = await supabase
      .from("baustelle_info")
      .select("*")
      .eq("baustelle_id", Number(baustelleId));

    const roomIds = (roomsData || []).map((r: any) => r.id);

    let roomMaterialData: any[] = [];
    let photosData: any[] = [];

    if (roomIds.length > 0) {
      const { data: rmData } = await supabase
        .from("room_material")
        .select("*")
        .in("room_id", roomIds);

      roomMaterialData = rmData || [];

      const { data: phData } = await supabase
        .from("room_photos")
        .select("*")
        .in("room_id", roomIds)
        .order("created_at", { ascending: true });

      photosData = phData || [];
    }

    const materialIds = [
      ...new Set(roomMaterialData.map((m: any) => m.material_id)),
    ].filter(Boolean);

    let materialsData: any[] = [];

    if (materialIds.length > 0) {
      const { data } = await supabase
        .from("materials")
        .select("*")
        .in("id", materialIds);

      materialsData = data || [];
    }

    setBaustelle(baustelleData);
    setRooms(roomsData || []);
    setHours(hoursWithFullWorkerNames || []);
    setRegieberichte(regieberichteData || []);
    setRegieHours(regieWorkersData || []);
    setRegieRooms(regieRoomsData || []);
    setRegieMaterials(regieMaterialsData || []);
    setRegiePhotos(regiePhotosData || []);
    setProductivity(productivityData || []);
    setRoomMaterials(roomMaterialData || []);
    setMaterials(materialsData || []);
    setPhotos(photosData || []);
    setBaustelleInfo(infoData || []);
    setLoading(false);
  }

  function formatDate(value: string) {
    if (!value) return "-";

    return new Date(value).toLocaleDateString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatDateTime(value: string) {
    if (!value) return "-";

    return new Date(value).toLocaleString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

  function translatePosition(position: string) {
    const raw = String(position || "").trim();
    const value = raw.toLowerCase();

    const translations: Record<string, string> = {
      zid: "Wand",
      devor: "Wand",
      wall: "Wand",
      wand: "Wand",
      pod: "Boden",
      pol: "Boden",
      floor: "Boden",
      boden: "Boden",
      plintus: "Sockelleiste",
      randlajsna: "Sockelleiste",
      lajsna: "Sockelleiste",
      sockelleiste: "Sockelleiste",
      profil: "Profil",
      profile: "Profil",
      schiene: "Schiene",
      "schiene / lajsna": "Schiene / Sockelleiste",
      "schiene/lajsna": "Schiene / Sockelleiste",
      silikon: "Silikon",
      "silikon 5 mm gacha": "Silikon 5 mm",
      "silikon 5mm gacha": "Silikon 5 mm",
      silicone: "Silikon",
      acryl: "Acryl",
      akril: "Acryl",
      "akril 5 mm gacha": "Acryl 5 mm",
      "akril 5mm gacha": "Acryl 5 mm",
      stepenice: "Stufen",
      stufen: "Stufen",
      fuge: "Fugen",
      fugovanje: "Fugen",
      fugen: "Fugen",
    };

    return translations[value] || raw || "-";
  }

  function getMaterialName(materialId: number) {
    const mat = materials.find((m: any) => Number(m.id) === Number(materialId));
    return mat?.naziv || mat?.name || mat?.material || mat?.bezeichnung || "";
  }

  function getMaterialNameFromRoomMaterial(m: any) {
    const manualName =
      m?.custom_naziv ||
      m?.custom_name ||
      m?.material_name ||
      m?.naziv ||
      m?.name ||
      m?.material ||
      m?.bezeichnung ||
      m?.opis ||
      m?.description ||
      m?.manual_name ||
      m?.keramika_naziv ||
      m?.title ||
      "";

    const catalogName = m?.material_id ? getMaterialName(m.material_id) : "";

    return manualName || catalogName || "Unbekannter Materialeintrag";
  }

  function getMaterialUnitFromRoomMaterial(m: any) {
    return (
      m?.custom_jedinica ||
      m?.custom_unit ||
      m?.jedinica ||
      m?.unit ||
      m?.einheit ||
      "-"
    );
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

  function getPhotoWorker(photo: any) {
    const name = String(
      photo?.worker_name ||
        photo?.radnik ||
        photo?.worker ||
        photo?.uploaded_by ||
        photo?.created_by ||
        ""
    ).trim();

    const lowerName = name.toLowerCase();

    if (
      !name ||
      lowerName === "radnik" ||
      lowerName === "mitarbeiter" ||
      lowerName === "nepoznat radnik" ||
      lowerName === "nicht gespeichert"
    ) {
      return "Nicht gespeichert";
    }

    return name;
  }

  function getPhotoCreatedAt(photo: any) {
    return (
      photo?.created_at ||
      photo?.datum ||
      photo?.date ||
      photo?.uploaded_at ||
      ""
    );
  }

  function getPhotoDescription(photo: any) {
    return (
      photo?.opis ||
      photo?.napomena ||
      photo?.description ||
      photo?.title ||
      ""
    );
  }

  function getRoomName(roomId: number) {
    const room = rooms.find((r: any) => Number(r.id) === Number(roomId));
    return room?.naziv || `Raum ${roomId}`;
  }

  function getHourWorkerName(hour: any) {
    return (
      hour?.worker_full_name ||
      hour?.workers?.name ||
      hour?.worker?.name ||
      hour?.radnik ||
      hour?.worker_name ||
      hour?.worker ||
      "-"
    );
  }

  function getHoursForRoom(roomId: number) {
    return hours.filter((h: any) => Number(h.room_id) === Number(roomId));
  }

  function getProductivityForRoom(roomId: number) {
    return productivity.filter((p: any) => Number(p.room_id) === Number(roomId));
  }

  function getMaterialsForRoom(roomId: number) {
    return roomMaterials.filter((m: any) => Number(m.room_id) === Number(roomId));
  }

  function getPhotosForRoom(roomId: number) {
    return photos.filter((p: any) => Number(p.room_id) === Number(roomId));
  }

  function roomHasReportContent(roomId: number) {
    return (
      getHoursForRoom(roomId).length > 0 ||
      getProductivityForRoom(roomId).length > 0 ||
      getMaterialsForRoom(roomId).length > 0 ||
      getPhotosForRoom(roomId).length > 0
    );
  }

  function getRegiebericht(row: any) {
    return regieberichte.find(
      (r: any) => Number(r.id) === Number(row.regiebericht_id)
    );
  }

  function getRegieDate(row: any) {
    const bericht = getRegiebericht(row);
    return bericht?.datum || row?.datum || row?.created_at || "";
  }

  function getRegieNumber(row: any) {
    const bericht = getRegiebericht(row);
    return bericht?.bericht_nr || bericht?.id || row?.regiebericht_id || "-";
  }

  function getRegieWorkText(row: any) {
    const bericht = getRegiebericht(row);

    return (
      bericht?.ausgefuehrte_arbeiten ||
      bericht?.arbeiten ||
      bericht?.beschreibung ||
      row?.ausgefuehrte_arbeiten ||
      row?.taetigkeit ||
      row?.bemerkung ||
      "-"
    );
  }

  function getRegieberichtRows(berichtId: number) {
    return regieHours.filter(
      (row: any) => Number(row.regiebericht_id) === Number(berichtId)
    );
  }

  function getRegieberichtTotalHours(berichtId: number) {
    return getRegieberichtRows(berichtId).reduce(
      (sum: number, row: any) =>
        sum + Number(row.stunden || row.sati || row.ukupno_sati || 0),
      0
    );
  }

  function getRegieberichtRooms(berichtId: number) {
    return regieRooms.filter((r: any) => Number(r.regiebericht_id) === Number(berichtId));
  }

  function getRegieberichtMaterials(berichtId: number) {
    return regieMaterials.filter((m: any) => Number(m.regiebericht_id) === Number(berichtId));
  }

  function getRegieberichtPhotos(berichtId: number) {
    return regiePhotos
      .filter((p: any) => Number(p.regiebericht_id) === Number(berichtId))
      .filter((p: any) => {
        const url = getPhotoUrl(p);
        return url && !String(url).toLowerCase().split("?")[0].endsWith(".pdf");
      });
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

  function getRegieberichtRoomText(berichtId: number, bericht: any) {
    const rows = getRegieberichtRooms(berichtId);
    const roomText = rows
      .map((r: any) => r.room_name || r.raum || r.name || "")
      .filter(Boolean)
      .join(", ");

    return (
      roomText ||
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

  function getGoogleMapsUrl() {
    const row = baustelleInfo.find((x: any) => x.type === "google_maps");
    return row?.google_maps_url || "";
  }

  function getVisualizationUrl() {
    const row = baustelleInfo.find((x: any) => x.type === "visualization_3d");
    return row?.visualization_url || "";
  }

  function renderPaperBranding(useSideStrip = false) {
    return (
      <>
        {mountainBgUrl && (
          <img
            src={mountainBgUrl}
            alt=""
            className="paper-mountain-inline"
            style={paperMountainStyle}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.style.display = "none";
            }}
          />
        )}

        <div className="paper-overlay-inline" style={paperOverlayStyle}></div>

        {useSideStrip && sideImageUrl && (
          <img
            src={sideImageUrl}
            alt=""
            className="paper-side-strip-inline"
            style={paperSideStripStyle}
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.style.display = "none";
            }}
          />
        )}

        <div className="paper-brand-badge-inline" style={paperBrandBadgeStyle}>
          {logoTopUrl ? (
            <>
              <img
                src={logoTopUrl}
                alt="Stone Boutique"
                style={paperBrandLogoStyle}
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.style.display = "none";
                  const next = img.nextElementSibling as HTMLElement | null;
                  if (next) next.style.display = "block";
                }}
              />

              <div style={{ ...paperBrandFallbackStyle, display: "none" }}>
                <div style={paperBrandFallbackOrangeStyle}>STONE BOUTIQUE</div>
                <div style={paperBrandFallbackSmallStyle}>Nocker & Bernardi GmbH</div>
              </div>
            </>
          ) : (
            <div style={paperBrandFallbackStyle}>
              <div style={paperBrandFallbackOrangeStyle}>STONE BOUTIQUE</div>
              <div style={paperBrandFallbackSmallStyle}>Nocker & Bernardi GmbH</div>
            </div>
          )}
        </div>
      </>
    );
  }

  const totalHours = hours.reduce(
    (sum, h) => sum + Number(h.ukupno_sati || h.sati || 0),
    0
  );

  const totalRegieHours = regieHours.reduce(
    (sum, h) => sum + Number(h.stunden || h.sati || h.ukupno_sati || 0),
    0
  );

  const startDate = hours.length > 0 ? hours[0].datum : "-";
  const endDate = hours.length > 0 ? hours[hours.length - 1].datum : "-";

  const workers = [...new Set(hours.map((h: any) => getHourWorkerName(h)).filter((name: any) => name && name !== "-"))];

  const regieWorkers = [
    ...new Set(regieHours.map((h: any) => h.worker_name).filter(Boolean)),
  ];

  const allWorkers = [...new Set(workers)];
  const hasPrintableRegie = totalRegieHours > 0;
  const roomsForReport = rooms.filter((room: any) => roomHasReportContent(room.id));

  const workDays = [...new Set(hours.map((h: any) => h.datum).filter(Boolean))];

  const regieHoursByWorker = regieWorkers.map((workerName: any) => {
    const sum = regieHours
      .filter((r: any) => r.worker_name === workerName)
      .reduce((total, r) => total + Number(r.stunden || 0), 0);

    return {
      workerName,
      sum,
    };
  });

  const sortedRegieberichte = [...regieberichte].sort((a: any, b: any) => {
    const aNr = Number(String(a?.bericht_nr || a?.nummer || a?.id || 0).replace(/\D/g, ""));
    const bNr = Number(String(b?.bericht_nr || b?.nummer || b?.id || 0).replace(/\D/g, ""));

    if (aNr !== bNr) return aNr - bNr;

    return String(a?.datum || "").localeCompare(String(b?.datum || ""));
  });

  function printPdf() {
    window.print();
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
        <div style={boxStyle}>
          <h1 style={{ color: "#dc2626" }}>Kein Zugriff</h1>
          <p>Der Archivbereich ist nur für Admins sichtbar.</p>
          <Link href="/dashboard" style={backLinkStyle}>
            ← Zurück zum Dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <p>Bericht wird geladen...</p>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <style>
        {`
          .print-only,
          .print-fixed-page-bg,
          .print-fixed-logo {
            display: none;
          }

          @page {
            size: A4 portrait;
            margin: 0;
          }

          @media print {
            * {
              box-sizing: border-box !important;
            }

            html,
            body {
              width: 210mm !important;
              max-width: 210mm !important;
              min-width: 0 !important;
              min-height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow-x: hidden !important;
              background: transparent !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            main {
              width: 210mm !important;
              max-width: 210mm !important;
              min-width: 0 !important;
              margin: 0 !important;
              background: transparent !important;
              color: black !important;
              padding: 22mm 8mm 8mm 8mm !important;
              overflow-x: hidden !important;
              position: relative !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            main > *:not(.print-fixed-page-bg):not(.print-fixed-logo) {
              position: relative !important;
              z-index: 2 !important;
            }

            .print-fixed-page-bg {
              display: block !important;
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 210mm !important;
              height: 297mm !important;
              object-fit: cover !important;
              object-position: center center !important;
              opacity: 0.24 !important;
              z-index: 0 !important;
              pointer-events: none !important;
            }

            .print-fixed-logo {
              display: block !important;
              position: fixed !important;
              left: 8mm !important;
              top: 7mm !important;
              width: 38mm !important;
              height: auto !important;
              max-height: 14mm !important;
              object-fit: contain !important;
              object-position: left top !important;
              z-index: 50 !important;
              background: transparent !important;
              pointer-events: none !important;
            }

            .paper-mountain-inline,
            .paper-overlay-inline,
            .paper-side-strip-inline,
            .paper-brand-badge-inline {
              display: none !important;
            }

            .no-print {
              display: none !important;
            }

            .print-box {
              width: 100% !important;
              max-width: 100% !important;
              min-width: 0 !important;
              margin: 0 0 5mm 0 !important;
              padding: 5mm !important;
              padding-bottom: 5mm !important;
              background: rgba(255, 255, 255, 0.34) !important;
              color: black !important;
              border: 1px solid rgba(120, 120, 120, 0.35) !important;
              border-radius: 0 !important;
              page-break-inside: auto !important;
              break-inside: auto !important;
              page-break-before: auto !important;
              break-before: auto !important;
              position: relative !important;
              overflow: visible !important;
              box-shadow: none !important;
            }

            .print-room {
              width: 100% !important;
              max-width: 100% !important;
              min-width: 0 !important;
              margin: 0 0 4mm 0 !important;
              padding: 4mm !important;
              padding-bottom: 4mm !important;
              background: rgba(255, 255, 255, 0.26) !important;
              color: black !important;
              border: 1px solid rgba(120, 120, 120, 0.35) !important;
              border-radius: 0 !important;
              page-break-inside: auto !important;
              break-inside: auto !important;
              position: relative !important;
              overflow: visible !important;
              box-shadow: none !important;
            }

            .room-overview-print {
              page-break-before: auto !important;
              break-before: auto !important;
              page-break-inside: auto !important;
              break-inside: auto !important;
              padding-top: 4mm !important;
            }

            h1 {
              display: none !important;
            }

            h2 {
              font-size: 19px !important;
              margin-top: 0 !important;
              margin-bottom: 4mm !important;
              color: #1f2937 !important;
              break-after: avoid !important;
              page-break-after: avoid !important;
            }

            h3 {
              font-size: 15px !important;
              margin-top: 4mm !important;
              margin-bottom: 2mm !important;
              color: #1f2937 !important;
              break-after: avoid !important;
              page-break-after: avoid !important;
            }

            p {
              margin-top: 0 !important;
              margin-bottom: 2.5mm !important;
            }

            table {
              page-break-inside: auto !important;
              break-inside: auto !important;
              background: rgba(255, 255, 255, 0.42) !important;
            }

            thead {
              display: table-header-group !important;
            }

            tr,
            .photo-card {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            .photo-grid {
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 10px !important;
            }

            .photo-card {
              background: white !important;
              border: 1px solid #ddd !important;
              padding: 6px !important;
              page-break-inside: avoid;
            }

            .photo-img {
              height: 120px !important;
              object-fit: cover !important;
            }

            table {
              width: 100% !important;
              max-width: 100% !important;
              table-layout: fixed !important;
              font-size: 10px !important;
            }

            th, td {
              color: black !important;
              border-color: #ccc !important;
              padding: 4px !important;
              word-break: break-word !important;
              overflow-wrap: anywhere !important;
            }

            img {
              max-width: 100% !important;
            }

            h1 {
              font-size: 28px !important;
              color: black !important;
            }

            h2, h3 {
              color: black !important;
            }
          }
        `}
      </style>

      {mountainBgUrl && (
        <img
          src={mountainBgUrl}
          alt=""
          className="print-fixed-page-bg"
          style={printFixedPageBgStyle}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            img.style.display = "none";
          }}
        />
      )}

      {logoTopUrl && (
        <img
          src={logoTopUrl}
          alt="Stone Boutique"
          className="print-fixed-logo"
          style={printFixedLogoStyle}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            img.style.display = "none";
          }}
        />
      )}

      <div style={topBarStyle} className="no-print">
        <Link href="/baustellen/archiv" style={backLinkStyle}>
          ← Zurück zum Archiv
        </Link>

        <div style={topButtonRowStyle}>
          {getGoogleMapsUrl() && (
            <a href={getGoogleMapsUrl()} target="_blank" style={mapsButtonStyle}>
              📍 Google Maps
            </a>
          )}

          {getVisualizationUrl() && (
            <a
              href={getVisualizationUrl()}
              target="_blank"
              style={visualizationButtonStyle}
            >
              🏗️ 3D Visualisierung
            </a>
          )}

          <button onClick={printPdf} style={pdfButtonStyle}>
            📥 PDF herunterladen
          </button>
        </div>
      </div>

      <h1 style={titleStyle}>ABSCHLUSSBERICHT BAUSTELLE</h1>

      <section style={boxStyle} className="print-box">
        {renderPaperBranding()}
        <div style={paperContentStyle}>
          <h2 style={sectionTitleStyle}>Baustellenübersicht</h2>

        <div style={infoGridStyle}>
          <p>
            <strong>Baustelle:</strong>
            <br />
            {baustelle?.naziv || "-"}
          </p>

          <p>
            <strong>Ort:</strong>
            <br />
            {baustelle?.lokacija || "-"}
          </p>

          <p>
            <strong>Projektbeginn:</strong>
            <br />
            {formatDate(startDate)}
          </p>

          <p>
            <strong>Projektende:</strong>
            <br />
            {formatDate(endDate)}
          </p>

          <p>
            <strong>Anzahl Räume:</strong>
            <br />
            {rooms.length}
          </p>

          <p>
            <strong>Anzahl Arbeitstage:</strong>
            <br />
            {workDays.length}
          </p>

          <p>
            <strong>Mitarbeiter:</strong>
            <br />
            {allWorkers.length > 0 ? allWorkers.join(", ") : "-"}
          </p>

          <p>
            <strong>Arbeitsstunden:</strong>
            <br />
            {formatNumber(totalHours)} h
          </p>

          {hasPrintableRegie && (
            <>
              <p>
                <strong>Regiestunden:</strong>
                <br />
                {formatNumber(totalRegieHours)} h
              </p>

              <p>
                <strong>Gesamt inkl. Regie:</strong>
                <br />
                {formatNumber(totalHours + totalRegieHours)} h
              </p>
            </>
          )}
        </div>
        </div>
      </section>

      <section style={boxStyle} className="print-box">
        {renderPaperBranding()}
        <div style={paperContentStyle}>
          <h2 style={sectionTitleStyle}>Gesamtübersicht Arbeitsstunden</h2>

        {hours.length === 0 ? (
          <p style={mutedTextStyle}>Keine Arbeitsstunden vorhanden.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Datum</th>
                  <th style={thStyle}>Mitarbeiter</th>
                  <th style={thStyle}>Raum</th>
                  <th style={thStyle}>Beginn</th>
                  <th style={thStyle}>Ende</th>
                  <th style={thStyle}>Pause</th>
                  <th style={thStyle}>Gesamt</th>
                  <th style={thStyle}>Tätigkeit</th>
                </tr>
              </thead>

              <tbody>
                {hours.map((h: any) => (
                  <tr key={h.id}>
                    <td style={tdStyle}>{formatDate(h.datum)}</td>
                    <td style={tdStyle}>{getHourWorkerName(h)}</td>
                    <td style={tdStyle}>
                      {h.room_id ? getRoomName(h.room_id) : "-"}
                    </td>
                    <td style={tdStyle}>{h.pocetak || "-"}</td>
                    <td style={tdStyle}>{h.kraj || "-"}</td>
                    <td style={tdStyle}>{formatNumber(h.pauza)} h</td>
                    <td style={tdStyle}>
                      {formatNumber(h.ukupno_sati || h.sati)} h
                    </td>
                    <td style={tdStyle}>{h.opis_posla || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </section>


      {hasPrintableRegie && (
        <section style={boxStyle} className="print-box">
          {renderPaperBranding()}
          <div style={paperContentStyle}>
            <h2 style={sectionTitleStyle}>Regiestunden</h2>

          <div style={regieSummaryStyle}>
            <p>
              <strong>Gesamt Regiestunden:</strong> {formatNumber(totalRegieHours)} h
            </p>

            <p>
              <strong>Anzahl Regieberichte:</strong> {regieberichte.length}
            </p>
          </div>

          {regieHoursByWorker.length > 0 && (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Mitarbeiter</th>
                    <th style={thStyle}>Regiestunden gesamt</th>
                  </tr>
                </thead>

                <tbody>
                  {regieHoursByWorker.map((row: any) => (
                    <tr key={row.workerName}>
                      <td style={tdStyle}>{row.workerName}</td>
                      <td style={tdStyle}>{formatNumber(row.sum)} h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 style={subTitleStyle}>Einzelne Regieeinträge</h3>

          {regieHours.length === 0 ? (
            <p style={mutedTextStyle}>Keine Regiestunden vorhanden.</p>
          ) : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Bericht Nr.</th>
                    <th style={thStyle}>Datum</th>
                    <th style={thStyle}>Mitarbeiter</th>
                    <th style={thStyle}>Von</th>
                    <th style={thStyle}>Bis</th>
                    <th style={thStyle}>Stunden</th>
                    <th style={thStyle}>Ausgeführte Arbeiten</th>
                  </tr>
                </thead>

                <tbody>
                  {regieHours.map((r: any) => (
                    <tr key={r.id}>
                      <td style={tdStyle}>{getRegieNumber(r)}</td>
                      <td style={tdStyle}>{formatDate(getRegieDate(r))}</td>
                      <td style={tdStyle}>{r.worker_name || "-"}</td>
                      <td style={tdStyle}>{r.von || "-"}</td>
                      <td style={tdStyle}>{r.bis || "-"}</td>
                      <td style={tdStyle}>{formatNumber(r.stunden)} h</td>
                      <td style={tdStyle}>{getRegieWorkText(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </section>
      )}

      <section style={boxStyle} className="print-box room-overview-print">
        {renderPaperBranding()}
        <div style={paperContentStyle}>
          <h2 style={sectionTitleStyle}>Raumübersicht</h2>

        {roomsForReport.length === 0 && (
          <p style={mutedTextStyle}>Keine Räume mit Berichtsdaten vorhanden.</p>
        )}

        {roomsForReport.map((room: any) => {
          const roomHours = getHoursForRoom(room.id);
          const roomProd = getProductivityForRoom(room.id);
          const roomMat = getMaterialsForRoom(room.id);
          const roomPhotos = getPhotosForRoom(room.id);

          const roomTotalHours = roomHours.reduce(
            (sum, h) => sum + Number(h.ukupno_sati || h.sati || 0),
            0
          );

          return (
            <div key={room.id} style={roomBoxStyle} className="print-room">
              {renderPaperBranding()}
              <div style={paperContentStyle}>
                <h2 style={roomTitleStyle}>Raum: {room.naziv}</h2>

              <h3 style={subTitleStyle}>Arbeitsstunden</h3>

              <p>
                <strong>Summe Raum:</strong> {formatNumber(roomTotalHours)} h
              </p>

              {roomHours.length === 0 ? (
                <p style={mutedTextStyle}>Keine Arbeitsstunden für diesen Raum.</p>
              ) : (
                <div style={tableWrapStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Datum</th>
                        <th style={thStyle}>Mitarbeiter</th>
                        <th style={thStyle}>Beginn</th>
                        <th style={thStyle}>Ende</th>
                        <th style={thStyle}>Pause</th>
                        <th style={thStyle}>Gesamt</th>
                        <th style={thStyle}>Tätigkeit</th>
                      </tr>
                    </thead>

                    <tbody>
                      {roomHours.map((h: any) => (
                        <tr key={h.id}>
                          <td style={tdStyle}>{formatDate(h.datum)}</td>
                          <td style={tdStyle}>{getHourWorkerName(h)}</td>
                          <td style={tdStyle}>{h.pocetak || "-"}</td>
                          <td style={tdStyle}>{h.kraj || "-"}</td>
                          <td style={tdStyle}>{formatNumber(h.pauza)} h</td>
                          <td style={tdStyle}>
                            {formatNumber(h.ukupno_sati || h.sati)} h
                          </td>
                          <td style={tdStyle}>{h.opis_posla || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 style={subTitleStyle}>Materialverbrauch</h3>

              {roomMat.length === 0 ? (
                <p style={mutedTextStyle}>Kein Material für diesen Raum.</p>
              ) : (
                <div style={tableWrapStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Material</th>
                        <th style={thStyle}>Menge</th>
                        <th style={thStyle}>Einheit</th>
                      </tr>
                    </thead>

                    <tbody>
                      {roomMat.map((m: any) => (
                        <tr key={m.id}>
                          <td style={tdStyle}>{getMaterialNameFromRoomMaterial(m)}</td>
                          <td style={tdStyle}>{formatNumber(m.kolicina)}</td>
                          <td style={tdStyle}>{getMaterialUnitFromRoomMaterial(m)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 style={subTitleStyle}>Leistungsnachweis</h3>

              {roomProd.length === 0 ? (
                <p style={mutedTextStyle}>
                  Keine Produktivitätsdaten für diesen Raum.
                </p>
              ) : (
                <div style={tableWrapStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Datum</th>
                        <th style={thStyle}>Mitarbeiter</th>
                        <th style={thStyle}>Leistung</th>
                        <th style={thStyle}>Menge</th>
                        <th style={thStyle}>Einheit</th>
                        <th style={thStyle}>Notiz</th>
                      </tr>
                    </thead>

                    <tbody>
                      {roomProd.map((p: any) => (
                        <tr key={p.id}>
                          <td style={tdStyle}>{formatDate(p.datum)}</td>
                          <td style={tdStyle}>{p.radnik || "-"}</td>
                          <td style={tdStyle}>{translatePosition(p.pozicija)}</td>
                          <td style={tdStyle}>{formatNumber(p.kolicina)}</td>
                          <td style={tdStyle}>{p.jedinica || "-"}</td>
                          <td style={tdStyle}>{p.napomena || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 style={subTitleStyle}>Fotodokumentation</h3>

              {roomPhotos.length === 0 ? (
                <p style={mutedTextStyle}>Keine Fotos für diesen Raum.</p>
              ) : (
                <div style={photoGridStyle} className="photo-grid">
                  {roomPhotos.map((photo: any) => {
                    const url = getPhotoUrl(photo);

                    if (!url) return null;

                    return (
                      <div key={photo.id} style={photoCardStyle} className="photo-card">
                        <img
                          src={url}
                          alt={getPhotoDescription(photo) || "Foto"}
                          style={photoStyle}
                          className="photo-img"
                          onClick={() => setSelectedPhoto(url)}
                        />

                        <div style={photoInfoStyle}>
                          <p style={photoRoomStyle}>{getRoomName(photo.room_id)}</p>
                          <p style={photoCaptionStyle}>
                            <strong>Hinzugefügt von:</strong> {getPhotoWorker(photo)}
                          </p>
                          <p style={photoCaptionStyle}>
                            <strong>Datum:</strong>{" "}
                            {formatDateTime(getPhotoCreatedAt(photo))}
                          </p>
                          {getPhotoDescription(photo) && (
                            <p style={photoCaptionStyle}>
                              <strong>Beschreibung:</strong>{" "}
                              {getPhotoDescription(photo)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </div>
            </div>
          );
        })}
        </div>
      </section>

      <section style={boxStyle} className="print-box">
        {renderPaperBranding()}
        <div style={paperContentStyle}>
          <h2 style={sectionTitleStyle}>Gesamtauswertung</h2>

        <p>
          <strong>Arbeitsstunden:</strong> {formatNumber(totalHours)} h
        </p>

        {hasPrintableRegie && (
          <>
            <p>
              <strong>Regiestunden:</strong> {formatNumber(totalRegieHours)} h
            </p>

            <p>
              <strong>Gesamtstunden inkl. Regie:</strong>{" "}
              {formatNumber(totalHours + totalRegieHours)} h
            </p>
          </>
        )}

        <p>
          <strong>Anzahl Mitarbeiter:</strong> {allWorkers.length}
        </p>

        <p>
          <strong>Anzahl Räume:</strong> {rooms.length}
        </p>

        <p>
          <strong>Anzahl Arbeitstage:</strong> {workDays.length}
        </p>

        <p>
          <strong>Anzahl Fotos:</strong> {photos.length}
        </p>

        <p>
          <strong>Bericht erstellt am:</strong>{" "}
          {new Date().toLocaleDateString("de-AT")}
        </p>
        </div>
      </section>


      {selectedPhoto && (
        <div
          style={modalOverlayStyle}
          className="no-print"
          onClick={() => setSelectedPhoto(null)}
        >
          <img src={selectedPhoto} alt="Foto" style={modalImageStyle} />
        </div>
      )}
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
  gap: "20px",
  alignItems: "center",
  marginBottom: "30px",
  flexWrap: "wrap",
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

const pdfButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "12px 20px",
  fontWeight: "bold",
  cursor: "pointer",
  textDecoration: "none",
};

const mapsButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "12px 20px",
  fontWeight: "bold",
  cursor: "pointer",
  textDecoration: "none",
};

const visualizationButtonStyle: any = {
  background: "#7c3aed",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "12px 20px",
  fontWeight: "bold",
  cursor: "pointer",
  textDecoration: "none",
};

const titleStyle: any = {
  fontSize: "56px",
  fontWeight: "bold",
  marginBottom: "30px",
};

const boxStyle: any = {
  background: "#111",
  padding: "25px",
  paddingBottom: "70px",
  borderRadius: "20px",
  marginBottom: "30px",
  position: "relative",
  overflow: "hidden",
};

const sectionTitleStyle: any = {
  fontSize: "28px",
  color: "#f97316",
  marginBottom: "20px",
};

const infoGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "20px",
};

const regieSummaryStyle: any = {
  display: "flex",
  gap: "30px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const roomBoxStyle: any = {
  background: "#000",
  border: "1px solid #333",
  padding: "25px",
  paddingBottom: "70px",
  borderRadius: "18px",
  marginBottom: "30px",
  position: "relative",
  overflow: "hidden",
};

const roomTitleStyle: any = {
  fontSize: "30px",
  color: "#f97316",
  marginBottom: "20px",
};

const subTitleStyle: any = {
  fontSize: "22px",
  marginTop: "25px",
  marginBottom: "12px",
};

const mutedTextStyle: any = {
  color: "#999",
};

const tableWrapStyle: any = {
  overflowX: "auto",
};

const tableStyle: any = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "10px",
};

const thStyle: any = {
  borderBottom: "1px solid #444",
  padding: "10px",
  textAlign: "left",
  color: "#f97316",
  whiteSpace: "nowrap",
};

const tdStyle: any = {
  borderBottom: "1px solid #333",
  padding: "10px",
  verticalAlign: "top",
};

const photoGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 260px))",
  gap: "16px",
  marginTop: "15px",
};

const photoCardStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "14px",
  padding: "10px",
  maxWidth: "260px",
};

const photoStyle: any = {
  width: "100%",
  height: "150px",
  objectFit: "cover",
  borderRadius: "10px",
  display: "block",
  cursor: "pointer",
};

const photoCaptionStyle: any = {
  color: "#aaa",
  fontSize: "13px",
  marginTop: "8px",
  marginBottom: 0,
};

const modalOverlayStyle: any = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.85)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: "30px",
  cursor: "pointer",
};

const modalImageStyle: any = {
  maxWidth: "90vw",
  maxHeight: "90vh",
  borderRadius: "14px",
  objectFit: "contain",
};

const photoInfoStyle: any = {
  marginTop: "8px",
};

const photoRoomStyle: any = {
  color: "#f97316",
  fontSize: "12px",
  fontWeight: "bold",
  marginTop: "8px",
  marginBottom: "6px",
};

const printFixedPageBgStyle: any = {
  display: "none",
};

const printFixedLogoStyle: any = {
  display: "none",
};

const paperContentStyle: any = {
  position: "relative",
  zIndex: 3,
};

const paperMountainStyle: any = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center center",
  opacity: 0.12,
  zIndex: 0,
  pointerEvents: "none",
};

const paperOverlayStyle: any = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(180deg, rgba(249,115,22,0.06) 0%, rgba(255,255,255,0) 28%, rgba(30,58,138,0.04) 100%)",
  zIndex: 1,
  pointerEvents: "none",
};

const paperSideStripStyle: any = {
  position: "absolute",
  left: 0,
  top: 0,
  width: "76px",
  height: "100%",
  objectFit: "cover",
  opacity: 0.15,
  zIndex: 1,
  pointerEvents: "none",
  borderRight: "1px solid rgba(249,115,22,0.15)",
};

const paperBrandBadgeStyle: any = {
  position: "absolute",
  top: "14px",
  left: "18px",
  zIndex: 4,
  background: "transparent",
  border: "none",
  borderRadius: 0,
  padding: 0,
  boxShadow: "none",
};

const paperBrandLogoStyle: any = {
  width: "112px",
  height: "34px",
  objectFit: "contain",
  display: "block",
};

const paperBrandFallbackStyle: any = {
  minWidth: "112px",
  borderLeft: "4px solid #f97316",
  paddingLeft: "10px",
  lineHeight: "1.05",
};

const paperBrandFallbackOrangeStyle: any = {
  color: "#f97316",
  fontWeight: "900",
  fontSize: "12px",
  letterSpacing: "0.9px",
};

const paperBrandFallbackSmallStyle: any = {
  color: "#111",
  fontWeight: "700",
  fontSize: "8px",
  marginTop: "4px",
};


const styles: any = {
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
    width: "118px",
    height: "40px",
    objectFit: "contain",
    objectPosition: "left center",
    display: "block",
  },
  logoFallback: {
    display: "none",
    width: "118px",
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
    fontSize: "8px",
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
    fontSize: "8px",
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
    fontSize: "8px",
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
};