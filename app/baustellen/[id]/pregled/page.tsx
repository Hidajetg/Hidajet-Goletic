"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import {
  type AppLanguage,
  localeForLanguage,
  readAppLanguage,
} from "../../../lib/language";


const reportTranslations: Record<AppLanguage, Record<string, string>> = {
  de: {
    loading: "Bericht wird geladen...", back: "← Zurück zur Baustelle", download: "📥 PDF herunterladen",
    title: "ABSCHLUSSBERICHT BAUSTELLE", siteOverview: "Baustellenübersicht", site: "Baustelle",
    place: "Ort", projectStart: "Projektbeginn", projectEnd: "Projektende", roomCount: "Anzahl Räume",
    workdayCount: "Anzahl Arbeitstage", worker: "Mitarbeiter", workHours: "Arbeitsstunden",
    regieHours: "Regiestunden", totalWithRegie: "Gesamt inkl. Regie", allWorkHours: "Gesamtübersicht Arbeitsstunden",
    noWorkHours: "Keine Arbeitsstunden vorhanden.", date: "Datum", room: "Raum", start: "Beginn",
    end: "Ende", pause: "Pause", total: "Gesamt", activity: "Tätigkeit", totalRegie: "Gesamt Regiestunden",
    reportCount: "Anzahl Regieberichte", regieTotal: "Regiestunden gesamt", regieEntries: "Einzelne Regieeinträge",
    noRegie: "Keine Regiestunden vorhanden.", reportNo: "Bericht Nr.", from: "Von", to: "Bis",
    hours: "Stunden", workDone: "Ausgeführte Arbeiten", roomOverview: "Raumübersicht", noRooms: "Keine Räume vorhanden.",
    roomSum: "Summe Raum", noRoomHours: "Keine Arbeitsstunden für diesen Raum.", materialUse: "Materialverbrauch",
    noRoomMaterial: "Kein Material für diesen Raum.", material: "Material", quantity: "Menge", unit: "Einheit",
    performance: "Leistungsnachweis", noProductivity: "Keine Produktivitätsdaten für diesen Raum.", output: "Leistung",
    note: "Notiz", photoDocs: "Fotodokumentation", noPhotos: "Keine Fotos für diesen Raum.", addedBy: "Hinzugefügt von",
    description: "Beschreibung", totalEvaluation: "Gesamtauswertung", workerCount: "Anzahl Mitarbeiter",
    photoCount: "Anzahl Fotos", createdAt: "Bericht erstellt am", unknownMaterial: "Unbekannter Materialeintrag",
    notSaved: "Nicht gespeichert", photo: "Foto",
  },
  ba: {
    loading: "Učitavanje izvještaja...", back: "← Nazad na Baustelle", download: "📥 Preuzmi PDF",
    title: "ZAVRŠNI IZVJEŠTAJ BAUSTELLE", siteOverview: "Pregled Baustelle", site: "Baustelle",
    place: "Lokacija", projectStart: "Početak projekta", projectEnd: "Kraj projekta", roomCount: "Broj prostorija",
    workdayCount: "Broj radnih dana", worker: "Radnik", workHours: "Radni sati",
    regieHours: "Regie sati", totalWithRegie: "Ukupno sa Regie satima", allWorkHours: "Ukupan pregled radnih sati",
    noWorkHours: "Nema radnih sati.", date: "Datum", room: "Prostorija", start: "Početak",
    end: "Kraj", pause: "Pauza", total: "Ukupno", activity: "Rad", totalRegie: "Ukupno Regie sati",
    reportCount: "Broj Regieberichta", regieTotal: "Ukupno Regie sati", regieEntries: "Pojedinačni Regie unosi",
    noRegie: "Nema Regie sati.", reportNo: "Broj izvještaja", from: "Od", to: "Do",
    hours: "Sati", workDone: "Izvedeni radovi", roomOverview: "Pregled prostorija", noRooms: "Nema prostorija.",
    roomSum: "Ukupno prostorija", noRoomHours: "Nema radnih sati za ovu prostoriju.", materialUse: "Potrošnja materijala",
    noRoomMaterial: "Nema materijala za ovu prostoriju.", material: "Materijal", quantity: "Količina", unit: "Jedinica",
    performance: "Učinak / produktivnost", noProductivity: "Nema podataka o produktivnosti za ovu prostoriju.", output: "Učinak",
    note: "Napomena", photoDocs: "Fotodokumentacija", noPhotos: "Nema fotografija za ovu prostoriju.", addedBy: "Dodao",
    description: "Opis", totalEvaluation: "Ukupna analiza", workerCount: "Broj radnika",
    photoCount: "Broj fotografija", createdAt: "Izvještaj napravljen", unknownMaterial: "Nepoznat unos materijala",
    notSaved: "Nije sačuvano", photo: "Fotografija",
  },
  uz: {
    loading: "Hisobot yuklanmoqda...", back: "← Obyektga qaytish", download: "📥 PDF yuklab olish",
    title: "OBYEKT YAKUNIY HISOBOTI", siteOverview: "Obyekt ko‘rinishi", site: "Obyekt",
    place: "Manzil", projectStart: "Loyiha boshlanishi", projectEnd: "Loyiha tugashi", roomCount: "Xonalar soni",
    workdayCount: "Ish kunlari soni", worker: "Ishchi", workHours: "Ish soatlari",
    regieHours: "Regie soatlari", totalWithRegie: "Regie bilan jami", allWorkHours: "Ish soatlari umumiy ko‘rinishi",
    noWorkHours: "Ish soatlari mavjud emas.", date: "Sana", room: "Xona", start: "Boshlanish",
    end: "Tugash", pause: "Tanaffus", total: "Jami", activity: "Ish", totalRegie: "Jami Regie soatlari",
    reportCount: "Regie hisobotlari soni", regieTotal: "Jami Regie soatlari", regieEntries: "Alohida Regie yozuvlari",
    noRegie: "Regie soatlari mavjud emas.", reportNo: "Hisobot №", from: "Dan", to: "Gacha",
    hours: "Soatlar", workDone: "Bajarilgan ishlar", roomOverview: "Xonalar ko‘rinishi", noRooms: "Xonalar yo‘q.",
    roomSum: "Xona jami", noRoomHours: "Bu xona uchun ish soatlari yo‘q.", materialUse: "Material sarfi",
    noRoomMaterial: "Bu xona uchun material yo‘q.", material: "Material", quantity: "Miqdor", unit: "Birlik",
    performance: "Ish unumdorligi", noProductivity: "Bu xona uchun unumdorlik ma’lumoti yo‘q.", output: "Natija",
    note: "Izoh", photoDocs: "Foto hujjatlar", noPhotos: "Bu xona uchun rasmlar yo‘q.", addedBy: "Qo‘shgan",
    description: "Tavsif", totalEvaluation: "Umumiy tahlil", workerCount: "Ishchilar soni",
    photoCount: "Rasmlar soni", createdAt: "Hisobot yaratilgan sana", unknownMaterial: "Noma’lum material yozuvi",
    notSaved: "Saqlanmagan", photo: "Rasm",
  },
  cz: {
    loading: "Načítání reportu...", back: "← Zpět na stavbu", download: "📥 Stáhnout PDF",
    title: "ZÁVĚREČNÝ REPORT STAVBY", siteOverview: "Přehled stavby", site: "Stavba",
    place: "Místo", projectStart: "Začátek projektu", projectEnd: "Konec projektu", roomCount: "Počet místností",
    workdayCount: "Počet pracovních dnů", worker: "Pracovník", workHours: "Pracovní hodiny",
    regieHours: "Regie hodiny", totalWithRegie: "Celkem včetně Regie", allWorkHours: "Celkový přehled pracovních hodin",
    noWorkHours: "Nejsou žádné pracovní hodiny.", date: "Datum", room: "Místnost", start: "Začátek",
    end: "Konec", pause: "Přestávka", total: "Celkem", activity: "Činnost", totalRegie: "Celkem Regie hodin",
    reportCount: "Počet Regie reportů", regieTotal: "Regie hodiny celkem", regieEntries: "Jednotlivé Regie záznamy",
    noRegie: "Nejsou žádné Regie hodiny.", reportNo: "Report č.", from: "Od", to: "Do",
    hours: "Hodiny", workDone: "Provedené práce", roomOverview: "Přehled místností", noRooms: "Nejsou žádné místnosti.",
    roomSum: "Součet místnosti", noRoomHours: "Pro tuto místnost nejsou pracovní hodiny.", materialUse: "Spotřeba materiálu",
    noRoomMaterial: "Pro tuto místnost není žádný materiál.", material: "Materiál", quantity: "Množství", unit: "Jednotka",
    performance: "Výkon", noProductivity: "Pro tuto místnost nejsou údaje o produktivitě.", output: "Výkon",
    note: "Poznámka", photoDocs: "Fotodokumentace", noPhotos: "Pro tuto místnost nejsou fotografie.", addedBy: "Přidal",
    description: "Popis", totalEvaluation: "Celkové vyhodnocení", workerCount: "Počet pracovníků",
    photoCount: "Počet fotografií", createdAt: "Report vytvořen", unknownMaterial: "Neznámý záznam materiálu",
    notSaved: "Neuloženo", photo: "Fotografie",
  },
  en: {
    loading: "Loading report...", back: "← Back to site", download: "📥 Download PDF",
    title: "FINAL CONSTRUCTION SITE REPORT", siteOverview: "Site overview", site: "Site",
    place: "Location", projectStart: "Project start", projectEnd: "Project end", roomCount: "Number of rooms",
    workdayCount: "Number of workdays", worker: "Worker", workHours: "Working hours",
    regieHours: "Regie hours", totalWithRegie: "Total incl. Regie", allWorkHours: "Overall working hours overview",
    noWorkHours: "No working hours available.", date: "Date", room: "Room", start: "Start",
    end: "End", pause: "Break", total: "Total", activity: "Activity", totalRegie: "Total Regie hours",
    reportCount: "Number of Regie reports", regieTotal: "Total Regie hours", regieEntries: "Individual Regie entries",
    noRegie: "No Regie hours available.", reportNo: "Report no.", from: "From", to: "To",
    hours: "Hours", workDone: "Work performed", roomOverview: "Room overview", noRooms: "No rooms available.",
    roomSum: "Room total", noRoomHours: "No working hours for this room.", materialUse: "Material consumption",
    noRoomMaterial: "No material for this room.", material: "Material", quantity: "Quantity", unit: "Unit",
    performance: "Performance", noProductivity: "No productivity data for this room.", output: "Performance",
    note: "Note", photoDocs: "Photo documentation", noPhotos: "No photos for this room.", addedBy: "Added by",
    description: "Description", totalEvaluation: "Overall evaluation", workerCount: "Number of workers",
    photoCount: "Number of photos", createdAt: "Report created on", unknownMaterial: "Unknown material entry",
    notSaved: "Not saved", photo: "Photo",
  },
};

export default function BaustellePregledPage() {
  const params = useParams();
  const baustelleId = String(params.id);
  const [lang, setLang] = useState<AppLanguage>("de");
  const t = reportTranslations[lang];

  const [loading, setLoading] = useState(true);
  const [baustelle, setBaustelle] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [hours, setHours] = useState<any[]>([]);
  const [regieberichte, setRegieberichte] = useState<any[]>([]);
  const [regieHours, setRegieHours] = useState<any[]>([]);
  const [productivity, setProductivity] = useState<any[]>([]);
  const [roomMaterials, setRoomMaterials] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    setLang(readAppLanguage("de"));
    loadReport();
  }, []);

  async function loadReport() {
    setLoading(true);

    const { data: baustelleData, error: baustelleError } = await supabase
      .from("baustellen")
      .select("*")
      .eq("id", Number(baustelleId))
      .single();

    if (baustelleError) {
      alert(`${t.loading}: ${baustelleError.message}`);
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

    const { data: regieberichteData } = await supabase
      .from("regieberichte")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("datum", { ascending: true });

    const regieberichtIds = (regieberichteData || []).map((item: any) => item.id);

    let regieWorkersData: any[] = [];

    if (regieberichtIds.length > 0) {
      const { data } = await supabase
        .from("regiebericht_workers")
        .select("*")
        .in("regiebericht_id", regieberichtIds);

      regieWorkersData = data || [];
    }

    const { data: productivityData } = await supabase
      .from("produktivnost")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("datum", { ascending: true });

    const roomIds = (roomsData || []).map((room: any) => room.id);

    let roomMaterialData: any[] = [];
    let photosData: any[] = [];

    if (roomIds.length > 0) {
      const { data: materialData } = await supabase
        .from("room_material")
        .select("*")
        .in("room_id", roomIds);

      roomMaterialData = materialData || [];

      const { data: photoData } = await supabase
        .from("room_photos")
        .select("*")
        .in("room_id", roomIds)
        .order("created_at", { ascending: true });

      photosData = photoData || [];
    }

    const materialIds = [
      ...new Set(roomMaterialData.map((item: any) => item.material_id)),
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
    setHours(hoursData || []);
    setRegieberichte(regieberichteData || []);
    setRegieHours(regieWorkersData || []);
    setProductivity(productivityData || []);
    setRoomMaterials(roomMaterialData);
    setMaterials(materialsData);
    setPhotos(photosData);
    setLoading(false);
  }

  function formatDate(value: string) {
    if (!value || value === "-") return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString(localeForLanguage(lang), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatDateTime(value: string) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString(localeForLanguage(lang), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatNumber(value: any) {
    return Number(value || 0).toLocaleString(localeForLanguage(lang), {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    });
  }

  function translatePosition(position: string) {
    const raw = String(position || "").trim();
    const value = raw.toLowerCase();

    const aliases: Record<string, string> = {
      zid: "wall", devor: "wall", wall: "wall", wand: "wall",
      pod: "floor", pol: "floor", floor: "floor", boden: "floor",
      plintus: "skirting", randlajsna: "skirting", lajsna: "skirting", sockelleiste: "skirting",
      profil: "profile", profile: "profile",
      schiene: "rail", "schiene / lajsna": "rail", "schiene/lajsna": "rail",
      silikon: "silicone", "silikon 5 mm gacha": "silicone5", "silikon 5mm gacha": "silicone5", silicone: "silicone",
      acryl: "acrylic", akril: "acrylic", "akril 5 mm gacha": "acrylic5", "akril 5mm gacha": "acrylic5",
      stepenice: "steps", stufen: "steps",
      fuge: "grout", fugovanje: "grout", fugen: "grout",
    };

    const labels: Record<AppLanguage, Record<string, string>> = {
      de: { wall: "Wand", floor: "Boden", skirting: "Sockelleiste", profile: "Profil", rail: "Schiene / Sockelleiste", silicone: "Silikon", silicone5: "Silikon 5 mm", acrylic: "Acryl", acrylic5: "Acryl 5 mm", steps: "Stufen", grout: "Fugen" },
      ba: { wall: "Zid", floor: "Pod", skirting: "Sokl / lajsna", profile: "Profil", rail: "Schiene / lajsna", silicone: "Silikon", silicone5: "Silikon 5 mm", acrylic: "Akril", acrylic5: "Akril 5 mm", steps: "Stepenice", grout: "Fuge" },
      uz: { wall: "Devor", floor: "Pol", skirting: "Plintus", profile: "Profil", rail: "Profil / plintus", silicone: "Silikon", silicone5: "Silikon 5 mm", acrylic: "Akril", acrylic5: "Akril 5 mm", steps: "Zinalar", grout: "Fuga" },
      cz: { wall: "Stěna", floor: "Podlaha", skirting: "Sokl", profile: "Profil", rail: "Lišta / profil", silicone: "Silikon", silicone5: "Silikon 5 mm", acrylic: "Akryl", acrylic5: "Akryl 5 mm", steps: "Schody", grout: "Spáry" },
      en: { wall: "Wall", floor: "Floor", skirting: "Skirting", profile: "Profile", rail: "Rail / skirting", silicone: "Silicone", silicone5: "Silicone 5 mm", acrylic: "Acrylic", acrylic5: "Acrylic 5 mm", steps: "Steps", grout: "Grout" },
    };

    const key = aliases[value];
    return key ? labels[lang][key] || raw : raw || "-";
  }

  function getMaterialName(materialId: number) {
    const material = materials.find(
      (item: any) => Number(item.id) === Number(materialId)
    );

    return (
      material?.naziv ||
      material?.name ||
      material?.material ||
      material?.bezeichnung ||
      ""
    );
  }

  function getMaterialNameFromRoomMaterial(item: any) {
    const manualName =
      item?.custom_naziv ||
      item?.custom_name ||
      item?.material_name ||
      item?.naziv ||
      item?.name ||
      item?.material ||
      item?.bezeichnung ||
      item?.opis ||
      item?.description ||
      item?.manual_name ||
      item?.keramika_naziv ||
      item?.title ||
      "";

    const catalogName = item?.material_id
      ? getMaterialName(item.material_id)
      : "";

    return manualName || catalogName || t.unknownMaterial;
  }

  function getMaterialUnitFromRoomMaterial(item: any) {
    return (
      item?.custom_jedinica ||
      item?.custom_unit ||
      item?.jedinica ||
      item?.unit ||
      item?.einheit ||
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
      return t.notSaved;
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
    const room = rooms.find(
      (item: any) => Number(item.id) === Number(roomId)
    );

    return room?.naziv || `${t.room} ${roomId}`;
  }

  function getHoursForRoom(roomId: number) {
    return hours.filter(
      (item: any) => Number(item.room_id) === Number(roomId)
    );
  }

  function getProductivityForRoom(roomId: number) {
    return productivity.filter(
      (item: any) => Number(item.room_id) === Number(roomId)
    );
  }

  function getMaterialsForRoom(roomId: number) {
    return roomMaterials.filter(
      (item: any) => Number(item.room_id) === Number(roomId)
    );
  }

  function getPhotosForRoom(roomId: number) {
    return photos.filter(
      (item: any) => Number(item.room_id) === Number(roomId)
    );
  }

  function getRegiebericht(row: any) {
    return regieberichte.find(
      (item: any) => Number(item.id) === Number(row.regiebericht_id)
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

  const totalHours = hours.reduce(
    (sum, item) =>
      sum + Number(item.ukupno_sati || item.sati || 0),
    0
  );

  const totalRegieHours = regieHours.reduce(
    (sum, item) =>
      sum + Number(item.stunden || item.sati || item.ukupno_sati || 0),
    0
  );

  const totalHoursIncludingRegie = totalHours + totalRegieHours;

  const startDate = hours.length > 0 ? hours[0].datum : "-";

  const endDate =
    hours.length > 0 ? hours[hours.length - 1].datum : "-";

  const workers = [
    ...new Set(hours.map((item: any) => item.radnik).filter(Boolean)),
  ];

  const regieWorkers = [
    ...new Set(
      regieHours.map((item: any) => item.worker_name).filter(Boolean)
    ),
  ];

  const allWorkers = [...new Set([...workers, ...regieWorkers])];

  const workDays = [
    ...new Set(hours.map((item: any) => item.datum).filter(Boolean)),
  ];

  const regieHoursByWorker = regieWorkers.map((workerName: any) => {
    const sum = regieHours
      .filter((item: any) => item.worker_name === workerName)
      .reduce((total, item) => total + Number(item.stunden || 0), 0);

    return {
      workerName,
      sum,
    };
  });

  function printPdf() {
    window.print();
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <p>{t.loading}</p>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <style>
        {`
          @media print {
            body {
              background: white !important;
            }

            main {
              background: white !important;
              color: black !important;
              padding: 20px !important;
            }

            .no-print {
              display: none !important;
            }

            .print-box {
              background: white !important;
              color: black !important;
              border: 1px solid #ddd !important;
              page-break-inside: avoid;
            }

            .print-room {
              background: white !important;
              color: black !important;
              border: 1px solid #ddd !important;
              page-break-inside: avoid;
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
              font-size: 11px !important;
            }

            th,
            td {
              color: black !important;
              border-color: #ccc !important;
              padding: 5px !important;
            }

            h1 {
              font-size: 28px !important;
              color: black !important;
            }

            h2,
            h3 {
              color: black !important;
            }
          }

          @media (max-width: 700px) {
            .report-main {
              padding: 16px !important;
            }

            .report-title {
              font-size: 34px !important;
            }

            .report-topbar {
              align-items: stretch !important;
              flex-direction: column !important;
            }

            .report-pdf-button {
              width: 100% !important;
            }
          }
        `}
      </style>

      <div
        style={topBarStyle}
        className="no-print report-topbar"
      >
        <Link
          href={`/baustellen/${baustelleId}`}
          style={backLinkStyle}
        >
          {t.back}
        </Link>

        <button
          onClick={printPdf}
          style={pdfButtonStyle}
          className="report-pdf-button"
        >
          {t.download}
        </button>
      </div>

      <h1 style={titleStyle} className="report-title">
        {t.title}
      </h1>

      <section style={boxStyle} className="print-box">
        <h2 style={sectionTitleStyle}>{t.siteOverview}</h2>

        <div style={infoGridStyle}>
          <p>
            <strong>{t.site}:</strong>
            <br />
            {baustelle?.naziv || "-"}
          </p>

          <p>
            <strong>{t.place}:</strong>
            <br />
            {baustelle?.lokacija || "-"}
          </p>

          <p>
            <strong>{t.projectStart}:</strong>
            <br />
            {formatDate(startDate)}
          </p>

          <p>
            <strong>{t.projectEnd}:</strong>
            <br />
            {formatDate(endDate)}
          </p>

          <p>
            <strong>{t.roomCount}:</strong>
            <br />
            {rooms.length}
          </p>

          <p>
            <strong>{t.workdayCount}:</strong>
            <br />
            {workDays.length}
          </p>

          <p>
            <strong>{t.worker}:</strong>
            <br />
            {allWorkers.length > 0 ? allWorkers.join(", ") : "-"}
          </p>

          <p>
            <strong>{t.workHours}:</strong>
            <br />
            {formatNumber(totalHours)} h
          </p>

          <p>
            <strong>{t.regieHours}:</strong>
            <br />
            {formatNumber(totalRegieHours)} h
          </p>

          <p>
            <strong>{t.totalWithRegie}:</strong>
            <br />
            {formatNumber(totalHoursIncludingRegie)} h
          </p>
        </div>
      </section>

      <section style={boxStyle} className="print-box">
        <h2 style={sectionTitleStyle}>{t.allWorkHours}</h2>

        {hours.length === 0 ? (
          <p style={mutedTextStyle}>{t.noWorkHours}</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{t.date}</th>
                  <th style={thStyle}>{t.worker}</th>
                  <th style={thStyle}>{t.room}</th>
                  <th style={thStyle}>{t.start}</th>
                  <th style={thStyle}>{t.end}</th>
                  <th style={thStyle}>{t.pause}</th>
                  <th style={thStyle}>{t.total}</th>
                  <th style={thStyle}>{t.activity}</th>
                </tr>
              </thead>

              <tbody>
                {hours.map((item: any) => (
                  <tr key={item.id}>
                    <td style={tdStyle}>
                      {formatDate(item.datum)}
                    </td>

                    <td style={tdStyle}>
                      {item.radnik || "-"}
                    </td>

                    <td style={tdStyle}>
                      {item.room_id
                        ? getRoomName(item.room_id)
                        : "-"}
                    </td>

                    <td style={tdStyle}>
                      {item.pocetak || "-"}
                    </td>

                    <td style={tdStyle}>
                      {item.kraj || "-"}
                    </td>

                    <td style={tdStyle}>
                      {formatNumber(item.pauza)} h
                    </td>

                    <td style={tdStyle}>
                      {formatNumber(
                        item.ukupno_sati || item.sati
                      )}{" "}
                      h
                    </td>

                    <td style={tdStyle}>
                      {item.opis_posla || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={boxStyle} className="print-box">
        <h2 style={sectionTitleStyle}>{t.regieHours}</h2>

        <div style={regieSummaryStyle}>
          <p>
            <strong>{t.totalRegie}:</strong>{" "}
            {formatNumber(totalRegieHours)} h
          </p>

          <p>
            <strong>{t.reportCount}:</strong>{" "}
            {regieberichte.length}
          </p>
        </div>

        {regieHoursByWorker.length > 0 && (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{t.worker}</th>
                  <th style={thStyle}>{t.regieTotal}</th>
                </tr>
              </thead>

              <tbody>
                {regieHoursByWorker.map((item: any) => (
                  <tr key={item.workerName}>
                    <td style={tdStyle}>{item.workerName}</td>
                    <td style={tdStyle}>{formatNumber(item.sum)} h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 style={subTitleStyle}>{t.regieEntries}</h3>

        {regieHours.length === 0 ? (
          <p style={mutedTextStyle}>{t.noRegie}</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{t.reportNo}</th>
                  <th style={thStyle}>{t.date}</th>
                  <th style={thStyle}>{t.worker}</th>
                  <th style={thStyle}>{t.from}</th>
                  <th style={thStyle}>{t.to}</th>
                  <th style={thStyle}>{t.hours}</th>
                  <th style={thStyle}>{t.workDone}</th>
                </tr>
              </thead>

              <tbody>
                {regieHours.map((item: any) => (
                  <tr key={item.id}>
                    <td style={tdStyle}>{getRegieNumber(item)}</td>
                    <td style={tdStyle}>{formatDate(getRegieDate(item))}</td>
                    <td style={tdStyle}>{item.worker_name || "-"}</td>
                    <td style={tdStyle}>{item.von || "-"}</td>
                    <td style={tdStyle}>{item.bis || "-"}</td>
                    <td style={tdStyle}>{formatNumber(item.stunden)} h</td>
                    <td style={tdStyle}>{getRegieWorkText(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={boxStyle} className="print-box">
        <h2 style={sectionTitleStyle}>{t.roomOverview}</h2>

        {rooms.length === 0 && (
          <p style={mutedTextStyle}>{t.noRooms}</p>
        )}

        {rooms.map((room: any) => {
          const roomHours = getHoursForRoom(room.id);
          const roomProductivity =
            getProductivityForRoom(room.id);
          const roomMaterial = getMaterialsForRoom(room.id);
          const roomPhotos = getPhotosForRoom(room.id);

          const roomTotalHours = roomHours.reduce(
            (sum, item) =>
              sum +
              Number(item.ukupno_sati || item.sati || 0),
            0
          );

          return (
            <div
              key={room.id}
              style={roomBoxStyle}
              className="print-room"
            >
              <h2 style={roomTitleStyle}>
                Raum: {room.naziv}
              </h2>

              <h3 style={subTitleStyle}>{t.workHours}</h3>

              <p>
                <strong>{t.roomSum}:</strong>{" "}
                {formatNumber(roomTotalHours)} h
              </p>

              {roomHours.length === 0 ? (
                <p style={mutedTextStyle}>{t.noRoomHours}</p>
              ) : (
                <div style={tableWrapStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>{t.date}</th>
                        <th style={thStyle}>{t.worker}</th>
                        <th style={thStyle}>{t.start}</th>
                        <th style={thStyle}>{t.end}</th>
                        <th style={thStyle}>{t.pause}</th>
                        <th style={thStyle}>{t.total}</th>
                        <th style={thStyle}>{t.activity}</th>
                      </tr>
                    </thead>

                    <tbody>
                      {roomHours.map((item: any) => (
                        <tr key={item.id}>
                          <td style={tdStyle}>
                            {formatDate(item.datum)}
                          </td>

                          <td style={tdStyle}>
                            {item.radnik || "-"}
                          </td>

                          <td style={tdStyle}>
                            {item.pocetak || "-"}
                          </td>

                          <td style={tdStyle}>
                            {item.kraj || "-"}
                          </td>

                          <td style={tdStyle}>
                            {formatNumber(item.pauza)} h
                          </td>

                          <td style={tdStyle}>
                            {formatNumber(
                              item.ukupno_sati || item.sati
                            )}{" "}
                            h
                          </td>

                          <td style={tdStyle}>
                            {item.opis_posla || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 style={subTitleStyle}>{t.materialUse}</h3>

              {roomMaterial.length === 0 ? (
                <p style={mutedTextStyle}>{t.noRoomMaterial}</p>
              ) : (
                <div style={tableWrapStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>{t.material}</th>
                        <th style={thStyle}>{t.quantity}</th>
                        <th style={thStyle}>{t.unit}</th>
                      </tr>
                    </thead>

                    <tbody>
                      {roomMaterial.map((item: any) => (
                        <tr key={item.id}>
                          <td style={tdStyle}>
                            {getMaterialNameFromRoomMaterial(
                              item
                            )}
                          </td>

                          <td style={tdStyle}>
                            {formatNumber(item.kolicina)}
                          </td>

                          <td style={tdStyle}>
                            {getMaterialUnitFromRoomMaterial(
                              item
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 style={subTitleStyle}>{t.performance}</h3>

              {roomProductivity.length === 0 ? (
                <p style={mutedTextStyle}>{t.noProductivity}</p>
              ) : (
                <div style={tableWrapStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>{t.date}</th>
                        <th style={thStyle}>{t.worker}</th>
                        <th style={thStyle}>{t.output}</th>
                        <th style={thStyle}>{t.quantity}</th>
                        <th style={thStyle}>{t.unit}</th>
                        <th style={thStyle}>{t.note}</th>
                      </tr>
                    </thead>

                    <tbody>
                      {roomProductivity.map((item: any) => (
                        <tr key={item.id}>
                          <td style={tdStyle}>
                            {formatDate(item.datum)}
                          </td>

                          <td style={tdStyle}>
                            {item.radnik || "-"}
                          </td>

                          <td style={tdStyle}>
                            {translatePosition(item.pozicija)}
                          </td>

                          <td style={tdStyle}>
                            {formatNumber(item.kolicina)}
                          </td>

                          <td style={tdStyle}>
                            {item.jedinica || "-"}
                          </td>

                          <td style={tdStyle}>
                            {item.napomena || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 style={subTitleStyle}>{t.photoDocs}</h3>

              {roomPhotos.length === 0 ? (
                <p style={mutedTextStyle}>{t.noPhotos}</p>
              ) : (
                <div
                  style={photoGridStyle}
                  className="photo-grid"
                >
                  {roomPhotos.map((photo: any) => {
                    const url = getPhotoUrl(photo);

                    if (!url) return null;

                    return (
                      <div
                        key={photo.id}
                        style={photoCardStyle}
                        className="photo-card"
                      >
                        <img
                          src={url}
                          alt={
                            getPhotoDescription(photo) ||
                            "Foto"
                          }
                          style={photoStyle}
                          className="photo-img"
                          onClick={() =>
                            setSelectedPhoto(url)
                          }
                        />

                        <div style={photoInfoStyle}>
                          <p style={photoRoomStyle}>
                            {getRoomName(photo.room_id)}
                          </p>

                          <p style={photoCaptionStyle}>
                            <strong>{t.addedBy}:</strong>{" "}
                            {getPhotoWorker(photo)}
                          </p>

                          <p style={photoCaptionStyle}>
                            <strong>{t.date}:</strong>{" "}
                            {formatDateTime(
                              getPhotoCreatedAt(photo)
                            )}
                          </p>

                          {getPhotoDescription(photo) && (
                            <p style={photoCaptionStyle}>
                              <strong>{t.description}:</strong>{" "}
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
          );
        })}
      </section>

      <section style={boxStyle} className="print-box">
        <h2 style={sectionTitleStyle}>{t.totalEvaluation}</h2>

        <p>
          <strong>{t.workHours}:</strong>{" "}
          {formatNumber(totalHours)} h
        </p>

        <p>
          <strong>{t.regieHours}:</strong>{" "}
          {formatNumber(totalRegieHours)} h
        </p>

        <p>
          <strong>{t.totalWithRegie}:</strong>{" "}
          {formatNumber(totalHoursIncludingRegie)} h
        </p>

        <p>
          <strong>{t.workerCount}:</strong>{" "}
          {allWorkers.length}
        </p>

        <p>
          <strong>{t.roomCount}:</strong> {rooms.length}
        </p>

        <p>
          <strong>{t.workdayCount}:</strong>{" "}
          {workDays.length}
        </p>

        <p>
          <strong>{t.reportCount}:</strong>{" "}
          {regieberichte.length}
        </p>

        <p>
          <strong>{t.photoCount}:</strong> {photos.length}
        </p>

        <p>
          <strong>{t.createdAt}:</strong>{" "}
          {new Date().toLocaleDateString(localeForLanguage(lang))}
        </p>
      </section>

      {selectedPhoto && (
        <div
          style={modalOverlayStyle}
          className="no-print"
          onClick={() => setSelectedPhoto(null)}
        >
          <img
            src={selectedPhoto}
            alt={t.photo}
            style={modalImageStyle}
          />
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
};

const titleStyle: any = {
  fontSize: "56px",
  fontWeight: "bold",
  marginBottom: "30px",
};

const boxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  marginBottom: "30px",
};

const sectionTitleStyle: any = {
  fontSize: "28px",
  color: "#f97316",
  marginBottom: "20px",
};

const infoGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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
  borderRadius: "18px",
  marginBottom: "30px",
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
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 260px))",
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

const photoInfoStyle: any = {
  marginTop: "8px",
};

const photoRoomStyle: any = {
  color: "#f97316",
  fontSize: "14px",
  fontWeight: "bold",
  marginTop: "8px",
  marginBottom: "6px",
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