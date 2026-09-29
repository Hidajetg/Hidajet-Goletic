"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { type AppLanguage, readAppLanguage } from "../../../lib/language";

const FIRMA = "Nocker & Bernardi GmbH / Stone Boutique";
const FIRMA_ADRESA = "Innweg 3, A-6170 Zirl";
const POTPIS = "Hidajet Goletić";

const PDF_BUCKET = "pdf-assets";
const PDF_LOGO_TOP = "gore.png";
const PDF_SIDE_IMAGE = "strana.png";
const PDF_MOUNTAIN_BG = "pozadina.png";

const regieTranslations: Record<AppLanguage, Record<string, string>> = {
  de: {
    back: "← Zurück zur Baustelle", showForm: "Formular anzeigen", list: "Liste Regieberichte",
    newReport: "Neuer Regiebericht", previewPrint: "Vorschau / Drucken", total: "Gesamt",
    noReports: "Noch keine Regieberichte gespeichert.", reportNo: "Regiebericht Nr.",
    date: "Datum", place: "Ort", client: "Auftraggeber", manager: "Bauleiter",
    workDone: "Ausgeführte Arbeiten", totalHours: "Gesamtstunden", openEdit: "Öffnen / Bearbeiten",
    delete: "Löschen", editReport: "Regiebericht bearbeiten", createReport: "Regiebericht erfassen",
    editing: "Du bearbeitest gespeicherten Regiebericht ID:", reportNumber: "Bericht Nr.",
    managerName: "Name Bauleiter", inherited: "Wird automatisch vom ersten Regiebericht übernommen.",
    site: "Baustelle", componentsRooms: "Bauteile / Räume", chooseRoom: "Raum auswählen",
    addRoom: "Raum hinzufügen", workPlaceholder: "Beschreibung der ausgeführten Arbeiten...",
    workers: "Arbeitskräfte", chooseWorker: "Mitarbeiter auswählen", pause: "Pause",
    remark: "Bemerkung", add: "Hinzufügen", materialOther: "Material / Sonstiges",
    catalogMaterial: "Material aus Katalog", freeDescription: "Freie Bezeichnung", quantity: "Menge",
    unit: "EH", photos: "Fotos", photoRemark: "Fotobemerkung",
    photoHint: "Die ersten 2 Bilder erscheinen am Hauptblatt. Weitere Bilder und PDFs werden als Beilage geführt.",
    image: "Bild", attachment: "Beilage", remove: "Entfernen", saveChanges: "Änderungen speichern",
    saveReport: "Regiebericht speichern", exportPrint: "Export / Drucken",
    deleteConfirm: "Regiebericht wirklich löschen?", deleted: "Regiebericht wurde gelöscht.",
    chooseWorkerAlert: "Mitarbeiter auswählen.", materialAlert: "Material auswählen oder Bezeichnung eingeben.",
    quantityAlert: "Menge eingeben.", fileAlert: "Bitte nur Bilder oder PDF-Dateien auswählen.",
    siteMissing: "Baustelle wurde nicht geladen.", clientAlert: "Auftraggeber eingeben.",
    managerAlert: "Bauleiter eingeben.", workAlert: "Ausgeführte Arbeiten eingeben.",
    updated: "Regiebericht wurde aktualisiert.", saved: "Regiebericht wurde gespeichert.",
  },
  ba: {
    back: "← Nazad na Baustelle", showForm: "Prikaži formular", list: "Lista Regieberichta",
    newReport: "Novi Regiebericht", previewPrint: "Pregled / štampa", total: "Ukupno",
    noReports: "Još nema sačuvanih Regieberichta.", reportNo: "Regiebericht br.",
    date: "Datum", place: "Mjesto", client: "Naručilac", manager: "Bauleiter",
    workDone: "Izvedeni radovi", totalHours: "Ukupno sati", openEdit: "Otvori / Uredi",
    delete: "Obriši", editReport: "Uredi Regiebericht", createReport: "Unesi Regiebericht",
    editing: "Uređuješ sačuvani Regiebericht ID:", reportNumber: "Broj izvještaja",
    managerName: "Ime Bauleitera", inherited: "Automatski se preuzima iz prvog Regieberichta.",
    site: "Baustelle", componentsRooms: "Dijelovi / prostorije", chooseRoom: "Odaberi prostoriju",
    addRoom: "Dodaj prostoriju", workPlaceholder: "Opis izvedenih radova...",
    workers: "Radnici", chooseWorker: "Odaberi radnika", pause: "Pauza",
    remark: "Napomena", add: "Dodaj", materialOther: "Materijal / Ostalo",
    catalogMaterial: "Materijal iz kataloga", freeDescription: "Slobodan naziv", quantity: "Količina",
    unit: "JM", photos: "Fotografije", photoRemark: "Napomena uz fotografiju",
    photoHint: "Prve 2 slike prikazuju se na glavnom listu. Ostale slike i PDF dokumenti idu kao prilog.",
    image: "Slika", attachment: "Prilog", remove: "Ukloni", saveChanges: "Sačuvaj izmjene",
    saveReport: "Sačuvaj Regiebericht", exportPrint: "Izvoz / štampa",
    deleteConfirm: "Da li stvarno želiš obrisati Regiebericht?", deleted: "Regiebericht je obrisan.",
    chooseWorkerAlert: "Odaberi radnika.", materialAlert: "Odaberi materijal ili unesi naziv.",
    quantityAlert: "Unesi količinu.", fileAlert: "Odaberi samo slike ili PDF fajlove.",
    siteMissing: "Baustelle nije učitana.", clientAlert: "Unesi naručioca.",
    managerAlert: "Unesi Bauleitera.", workAlert: "Unesi izvedene radove.",
    updated: "Regiebericht je ažuriran.", saved: "Regiebericht je sačuvan.",
  },
  uz: {
    back: "← Obyektga qaytish", showForm: "Formani ko‘rsatish", list: "Regie hisobotlari ro‘yxati",
    newReport: "Yangi Regie hisoboti", previewPrint: "Ko‘rish / Chop etish", total: "Jami",
    noReports: "Hali Regie hisoboti saqlanmagan.", reportNo: "Regie hisoboti №",
    date: "Sana", place: "Joy", client: "Buyurtmachi", manager: "Qurilish rahbari",
    workDone: "Bajarilgan ishlar", totalHours: "Jami soat", openEdit: "Ochish / Tahrirlash",
    delete: "O‘chirish", editReport: "Regie hisobotini tahrirlash", createReport: "Regie hisobotini kiritish",
    editing: "Saqlangan Regie hisoboti tahrirlanmoqda, ID:", reportNumber: "Hisobot raqami",
    managerName: "Qurilish rahbari ismi", inherited: "Birinchi Regie hisobotidan avtomatik olinadi.",
    site: "Obyekt", componentsRooms: "Qismlar / xonalar", chooseRoom: "Xonani tanlang",
    addRoom: "Xona qo‘shish", workPlaceholder: "Bajarilgan ishlar tavsifi...",
    workers: "Ishchilar", chooseWorker: "Ishchini tanlang", pause: "Tanaffus",
    remark: "Izoh", add: "Qo‘shish", materialOther: "Material / Boshqa",
    catalogMaterial: "Katalogdan material", freeDescription: "Erkin nom", quantity: "Miqdor",
    unit: "Birlik", photos: "Rasmlar", photoRemark: "Rasm izohi",
    photoHint: "Birinchi 2 ta rasm asosiy sahifada ko‘rinadi. Qolgan rasmlar va PDFlar ilova sifatida beriladi.",
    image: "Rasm", attachment: "Ilova", remove: "Olib tashlash", saveChanges: "O‘zgarishlarni saqlash",
    saveReport: "Regie hisobotini saqlash", exportPrint: "Eksport / Chop etish",
    deleteConfirm: "Regie hisobotini o‘chirmoqchimisiz?", deleted: "Regie hisoboti o‘chirildi.",
    chooseWorkerAlert: "Ishchini tanlang.", materialAlert: "Materialni tanlang yoki nomini kiriting.",
    quantityAlert: "Miqdorni kiriting.", fileAlert: "Faqat rasm yoki PDF fayl tanlang.",
    siteMissing: "Obyekt yuklanmadi.", clientAlert: "Buyurtmachini kiriting.",
    managerAlert: "Qurilish rahbarini kiriting.", workAlert: "Bajarilgan ishlarni kiriting.",
    updated: "Regie hisoboti yangilandi.", saved: "Regie hisoboti saqlandi.",
  },
  cz: {
    back: "← Zpět na stavbu", showForm: "Zobrazit formulář", list: "Seznam Regie reportů",
    newReport: "Nový Regie report", previewPrint: "Náhled / Tisk", total: "Celkem",
    noReports: "Zatím není uložen žádný Regie report.", reportNo: "Regie report č.",
    date: "Datum", place: "Místo", client: "Objednatel", manager: "Stavbyvedoucí",
    workDone: "Provedené práce", totalHours: "Celkem hodin", openEdit: "Otevřít / Upravit",
    delete: "Smazat", editReport: "Upravit Regie report", createReport: "Zadat Regie report",
    editing: "Upravujete uložený Regie report ID:", reportNumber: "Číslo reportu",
    managerName: "Jméno stavbyvedoucího", inherited: "Automaticky se převezme z prvního Regie reportu.",
    site: "Stavba", componentsRooms: "Části / místnosti", chooseRoom: "Vyberte místnost",
    addRoom: "Přidat místnost", workPlaceholder: "Popis provedených prací...",
    workers: "Pracovníci", chooseWorker: "Vyberte pracovníka", pause: "Přestávka",
    remark: "Poznámka", add: "Přidat", materialOther: "Materiál / Ostatní",
    catalogMaterial: "Materiál z katalogu", freeDescription: "Volný název", quantity: "Množství",
    unit: "MJ", photos: "Fotografie", photoRemark: "Poznámka k fotografii",
    photoHint: "První 2 fotografie se zobrazí na hlavním listu. Další obrázky a PDF budou vedeny jako přílohy.",
    image: "Obrázek", attachment: "Příloha", remove: "Odstranit", saveChanges: "Uložit změny",
    saveReport: "Uložit Regie report", exportPrint: "Export / Tisk",
    deleteConfirm: "Opravdu chcete Regie report smazat?", deleted: "Regie report byl smazán.",
    chooseWorkerAlert: "Vyberte pracovníka.", materialAlert: "Vyberte materiál nebo zadejte název.",
    quantityAlert: "Zadejte množství.", fileAlert: "Vyberte pouze obrázky nebo PDF soubory.",
    siteMissing: "Stavba nebyla načtena.", clientAlert: "Zadejte objednatele.",
    managerAlert: "Zadejte stavbyvedoucího.", workAlert: "Zadejte provedené práce.",
    updated: "Regie report byl aktualizován.", saved: "Regie report byl uložen.",
  },
  en: {
    back: "← Back to site", showForm: "Show form", list: "Regie report list",
    newReport: "New Regie report", previewPrint: "Preview / Print", total: "Total",
    noReports: "No Regie reports saved yet.", reportNo: "Regie report no.",
    date: "Date", place: "Location", client: "Client", manager: "Site manager",
    workDone: "Work performed", totalHours: "Total hours", openEdit: "Open / Edit",
    delete: "Delete", editReport: "Edit Regie report", createReport: "Create Regie report",
    editing: "You are editing saved Regie report ID:", reportNumber: "Report no.",
    managerName: "Site manager name", inherited: "Automatically copied from the first Regie report.",
    site: "Site", componentsRooms: "Components / Rooms", chooseRoom: "Select room",
    addRoom: "Add room", workPlaceholder: "Description of work performed...",
    workers: "Workers", chooseWorker: "Select worker", pause: "Break",
    remark: "Remark", add: "Add", materialOther: "Material / Other",
    catalogMaterial: "Material from catalogue", freeDescription: "Free description", quantity: "Quantity",
    unit: "Unit", photos: "Photos", photoRemark: "Photo note",
    photoHint: "The first 2 images appear on the main sheet. Additional images and PDFs are included as attachments.",
    image: "Image", attachment: "Attachment", remove: "Remove", saveChanges: "Save changes",
    saveReport: "Save Regie report", exportPrint: "Export / Print",
    deleteConfirm: "Do you really want to delete this Regie report?", deleted: "Regie report was deleted.",
    chooseWorkerAlert: "Select a worker.", materialAlert: "Select material or enter a description.",
    quantityAlert: "Enter quantity.", fileAlert: "Please select images or PDF files only.",
    siteMissing: "Site was not loaded.", clientAlert: "Enter the client.",
    managerAlert: "Enter the site manager.", workAlert: "Enter the work performed.",
    updated: "Regie report was updated.", saved: "Regie report was saved.",
  },
};


export default function RegieberichtPage() {
  const params = useParams();
  const baustelleId = String(params.id);
  const [lang, setLang] = useState<AppLanguage>("de");
  const t = regieTranslations[lang];

  const [baustelle, setBaustelle] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [berichte, setBerichte] = useState<any[]>([]);
  const [firstMeta, setFirstMeta] = useState<any>(null);

  const [activeBerichtId, setActiveBerichtId] = useState<number | null>(null);
  const [showList, setShowList] = useState(false);

  const [berichtNr, setBerichtNr] = useState("");
  const [datum, setDatum] = useState(new Date().toISOString().split("T")[0]);
  const [auftraggeber, setAuftraggeber] = useState("");
  const [bauleiter, setBauleiter] = useState("");
  const [ort, setOrt] = useState("");
  const [arbeiten, setArbeiten] = useState("");

  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedRooms, setSelectedRooms] = useState<any[]>([]);

  const [workerName, setWorkerName] = useState("");
  const [von, setVon] = useState("08:00");
  const [bis, setBis] = useState("17:00");
  const [pause, setPause] = useState("0.5");
  const [bemerkung, setBemerkung] = useState("");
  const [workerRows, setWorkerRows] = useState<any[]>([]);

  const [materialId, setMaterialId] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [menge, setMenge] = useState("");
  const [einheit, setEinheit] = useState("");
  const [materialRows, setMaterialRows] = useState<any[]>([]);

  const [photos, setPhotos] = useState<any[]>([]);
  const [photoNote, setPhotoNote] = useState("");

  const [logoTopUrl, setLogoTopUrl] = useState("");
  const [sideImageUrl, setSideImageUrl] = useState("");
  const [mountainBgUrl, setMountainBgUrl] = useState("");

  function getStoragePublicUrl(fileName: string) {
    const url = supabase.storage.from(PDF_BUCKET).getPublicUrl(fileName).data.publicUrl;
    return `${url}?v=${Date.now()}`;
  }

  function loadPdfImages() {
    setLogoTopUrl(getStoragePublicUrl(PDF_LOGO_TOP));
    setSideImageUrl(getStoragePublicUrl(PDF_SIDE_IMAGE));
    setMountainBgUrl(getStoragePublicUrl(PDF_MOUNTAIN_BG));
  }

  useEffect(() => {
    setLang(readAppLanguage("de"));
    loadPdfImages();
    loadData();
    loadBerichte();
    loadFirstMeta();
    generateNextBerichtNr().then((nr) => setBerichtNr(nr));
  }, []);

  function playNotificationSound() {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 1;
    audio.play().catch(() => {});
  }

  async function loadData() {
    const baustelleRes = await supabase
      .from("baustellen")
      .select("*")
      .eq("id", Number(baustelleId))
      .single();

    if (baustelleRes.error) {
      alert("LOAD BAUSTELLE: " + baustelleRes.error.message);
      return;
    }

    setBaustelle(baustelleRes.data);
    setOrt(baustelleRes.data?.lokacija || "");
    setAuftraggeber((prev) => prev || baustelleRes.data?.auftraggeber || "");

    const roomsRes = await supabase
      .from("prostorije")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("naziv", { ascending: true });

    setRooms(roomsRes.data || []);

    const workersRes = await supabase
      .from("workers")
      .select("*")
      .order("name", { ascending: true });

    const loadedWorkers = workersRes.data || [];

    const manualWorkers = [
      { id: "manual-hido", name: "Hido", role: "admin" },
      { id: "manual-steffi", name: "Steffi", role: "admin" },
    ];

    const mergedWorkers = [...loadedWorkers];

    manualWorkers.forEach((manualWorker) => {
      const exists = mergedWorkers.some(
        (w: any) =>
          String(w.name || "").toLowerCase() ===
          String(manualWorker.name).toLowerCase()
      );

      if (!exists) {
        mergedWorkers.push(manualWorker);
      }
    });

    setWorkers(
      mergedWorkers.sort((a: any, b: any) =>
        String(a.name || "").localeCompare(String(b.name || ""))
      )
    );

    const materialsRes = await supabase
      .from("materials")
      .select("*")
      .order("naziv", { ascending: true });

    setMaterials(materialsRes.data || []);
  }

  async function loadBerichte() {
    const { data, error } = await supabase
      .from("regieberichte")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("datum", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      alert("LOAD REGIEBERICHTE: " + error.message);
      return;
    }

    const berichtData = data || [];
    const berichtIds = berichtData.map((b: any) => b.id);

    if (berichtIds.length === 0) {
      setBerichte([]);
      return;
    }

    const { data: workerData, error: workerError } = await supabase
      .from("regiebericht_workers")
      .select("regiebericht_id, stunden")
      .in("regiebericht_id", berichtIds);

    if (workerError) {
      alert("LOAD REGIEBERICHT WORKERS: " + workerError.message);
      setBerichte(
        berichtData.map((b: any) => ({
          ...b,
          gesamtstunden: 0,
        }))
      );
      return;
    }

    const totalsByBerichtId: { [key: number]: number } = {};

    (workerData || []).forEach((w: any) => {
      const id = Number(w.regiebericht_id);
      totalsByBerichtId[id] =
        (totalsByBerichtId[id] || 0) + toNumberValue(w.stunden);
    });

    setBerichte(
      berichtData.map((b: any) => ({
        ...b,
        gesamtstunden: totalsByBerichtId[Number(b.id)] || 0,
      }))
    );
  }


  async function loadFirstMeta() {
    const { data, error } = await supabase
      .from("regieberichte")
      .select("id, auftraggeber, bauleiter")
      .eq("baustelle_id", Number(baustelleId))
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      alert("LOAD ERSTER REGIEBERICHT: " + error.message);
      return null;
    }

    if (data) {
      setFirstMeta(data);

      if (!activeBerichtId) {
        setAuftraggeber(data.auftraggeber || "");
        setBauleiter(data.bauleiter || "");
      }
    } else {
      setFirstMeta(null);
    }

    return data;
  }

  async function generateNextBerichtNr() {
    const { data, error } = await supabase
      .from("regieberichte")
      .select("bericht_nr")
      .eq("baustelle_id", Number(baustelleId));

    if (error) {
      alert("AUTO NR FEHLER: " + error.message);
      return "001";
    }

    const numbers = (data || [])
      .map((x: any) => Number(String(x.bericht_nr || "0").replace(/\D/g, "")))
      .filter((n: number) => !Number.isNaN(n));

    const maxNr = numbers.length > 0 ? Math.max(...numbers) : 0;
    return String(maxNr + 1).padStart(3, "0");
  }

  function timeToNumber(time: string) {
    const [h, m] = time.split(":").map(Number);
    return h + m / 60;
  }

  function calcHours(start: string, end: string, pauseValue: string | number) {
    const total = timeToNumber(end) - timeToNumber(start) - Number(pauseValue || 0);
    if (total < 0) return 0;
    return Number(total.toFixed(2));
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

  const gesamtStunden = workerRows.reduce(
    (sum, row) => sum + toNumberValue(row.stunden),
    0
  );

  const listeGesamtStunden = berichte.reduce(
    (sum, b) => sum + toNumberValue(b.gesamtstunden),
    0
  );

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

  async function resetForm() {
    const nextNr = await generateNextBerichtNr();
    setActiveBerichtId(null);
    setBerichtNr(nextNr);
    setDatum(new Date().toISOString().split("T")[0]);
    setAuftraggeber(firstMeta?.auftraggeber || baustelle?.auftraggeber || "");
    setBauleiter(firstMeta?.bauleiter || "");
    setOrt(baustelle?.lokacija || "");
    setArbeiten("");
    setSelectedRoom("");
    setSelectedRooms([]);
    setWorkerName("");
    setVon("08:00");
    setBis("17:00");
    setPause("0.5");
    setBemerkung("");
    setWorkerRows([]);
    setMaterialId("");
    setMaterialName("");
    setMenge("");
    setEinheit("");
    setMaterialRows([]);
    setPhotos([]);
    setPhotoNote("");
    setShowList(false);
  }

  async function openBericht(berichtId: number) {
    const { data: bericht, error: berichtError } = await supabase
      .from("regieberichte")
      .select("*")
      .eq("id", berichtId)
      .single();

    if (berichtError) {
      alert("OPEN REGIEBERICHT: " + berichtError.message);
      return;
    }

    const roomsRes = await supabase
      .from("regiebericht_rooms")
      .select("*")
      .eq("regiebericht_id", berichtId);

    const workersRes = await supabase
      .from("regiebericht_workers")
      .select("*")
      .eq("regiebericht_id", berichtId);

    const materialsRes = await supabase
      .from("regiebericht_materials")
      .select("*")
      .eq("regiebericht_id", berichtId);

    const photosRes = await supabase
      .from("regiebericht_photos")
      .select("*")
      .eq("regiebericht_id", berichtId);

    if (roomsRes.error) {
      alert("LOAD ROOMS: " + roomsRes.error.message);
      return;
    }

    if (workersRes.error) {
      alert("LOAD WORKERS: " + workersRes.error.message);
      return;
    }

    if (materialsRes.error) {
      alert("LOAD MATERIALS: " + materialsRes.error.message);
      return;
    }

    if (photosRes.error) {
      alert("LOAD PHOTOS: " + photosRes.error.message);
      return;
    }

    setActiveBerichtId(bericht.id);
    setBerichtNr(bericht.bericht_nr || "");
    setDatum(bericht.datum || new Date().toISOString().split("T")[0]);
    setAuftraggeber(bericht.auftraggeber || "");
    setBauleiter(bericht.bauleiter || "");
    setOrt(bericht.ort || "");
    setArbeiten(bericht.ausgefuehrte_arbeiten || "");

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
        bezeichnung: m.bezeichnung,
        menge: m.menge,
        einheit: m.einheit,
      }))
    );

    setPhotos(
      (photosRes.data || []).map((p: any) => {
        const url = p.photo_url || "";
        const isPdf = isPdfUrl(url);

        return {
          file: null,
          preview: url,
          photo_url: url,
          note: p.note || "",
          kind: isPdf ? "pdf" : "image",
          file_name: getFileNameFromUrl(url),
        };
      })
    );

    setShowList(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteBericht(berichtId: number) {
    const ok = confirm(t.deleteConfirm);
    if (!ok) return;

    await supabase
      .from("regiebericht_rooms")
      .delete()
      .eq("regiebericht_id", berichtId);

    await supabase
      .from("regiebericht_workers")
      .delete()
      .eq("regiebericht_id", berichtId);

    await supabase
      .from("regiebericht_materials")
      .delete()
      .eq("regiebericht_id", berichtId);

    await supabase
      .from("regiebericht_photos")
      .delete()
      .eq("regiebericht_id", berichtId);

    const { error } = await supabase
      .from("regieberichte")
      .delete()
      .eq("id", berichtId);

    if (error) {
      alert("DELETE REGIEBERICHT: " + error.message);
      return;
    }

    if (activeBerichtId === berichtId) {
      resetForm();
    }

    await loadBerichte();
    await loadFirstMeta();
    alert(t.deleted);
  }

  function addRoom() {
    if (!selectedRoom) return;

    const room = rooms.find((r) => String(r.id) === String(selectedRoom));
    if (!room) return;

    if (selectedRooms.find((r) => String(r.room_id) === String(room.id))) {
      return;
    }

    setSelectedRooms((prev) => [
      ...prev,
      {
        room_id: room.id,
        room_name: room.naziv,
      },
    ]);

    setSelectedRoom("");
  }

  function removeRoom(index: number) {
    setSelectedRooms((prev) => prev.filter((_, i) => i !== index));
  }

  function addWorker() {
    if (!workerName) {
      alert(t.chooseWorkerAlert);
      return;
    }

    const stunden = calcHours(von, bis, pause);

    setWorkerRows((prev) => [
      ...prev,
      {
        worker_name: workerName,
        von,
        bis,
        pause: Number(pause),
        stunden,
        bemerkung,
      },
    ]);

    setWorkerName("");
    setVon("08:00");
    setBis("17:00");
    setPause("0.5");
    setBemerkung("");
  }

  function removeWorker(index: number) {
    setWorkerRows((prev) => prev.filter((_, i) => i !== index));
  }

  function onMaterialSelect(value: string) {
    setMaterialId(value);

    if (!value) {
      setMaterialName("");
      setEinheit("");
      return;
    }

    const m = materials.find((x) => String(x.id) === String(value));

    if (m) {
      setMaterialName(m.naziv || "");
      setEinheit(m.jedinica || "");
    }
  }

  function addMaterial() {
    if (!materialName.trim()) {
      alert(t.materialAlert);
      return;
    }

    if (!menge || Number(menge) <= 0) {
      alert(t.quantityAlert);
      return;
    }

    setMaterialRows((prev) => [
      ...prev,
      {
        material_id: materialId ? Number(materialId) : null,
        bezeichnung: materialName.trim(),
        menge: Number(menge),
        einheit: einheit.trim(),
      },
    ]);

    setMaterialId("");
    setMaterialName("");
    setMenge("");
    setEinheit("");
  }

  function removeMaterial(index: number) {
    setMaterialRows((prev) => prev.filter((_, i) => i !== index));
  }

  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files)
      .filter((file) =>
        file.type.startsWith("image/") || file.type === "application/pdf"
      )
      .map((file) => {
        const isPdf = file.type === "application/pdf";

        return {
          file,
          preview: URL.createObjectURL(file),
          photo_url: null,
          note: photoNote,
          kind: isPdf ? "pdf" : "image",
          file_name: file.name,
        };
      });

    if (newFiles.length === 0) {
      alert(t.fileAlert);
      return;
    }

    setPhotos((prev) => [...prev, ...newFiles]);
    setPhotoNote("");
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadPhoto(file: File, berichtId: number) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${berichtId}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;

    const filePath = `regieberichte/${berichtId}/${fileName}`;

    const { error } = await supabase.storage
      .from("regiebericht-photos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || undefined,
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from("regiebericht-photos")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function saveChildren(berichtId: number) {
    await supabase
      .from("regiebericht_rooms")
      .delete()
      .eq("regiebericht_id", berichtId);

    await supabase
      .from("regiebericht_workers")
      .delete()
      .eq("regiebericht_id", berichtId);

    await supabase
      .from("regiebericht_materials")
      .delete()
      .eq("regiebericht_id", berichtId);

    await supabase
      .from("regiebericht_photos")
      .delete()
      .eq("regiebericht_id", berichtId);

    if (selectedRooms.length > 0) {
      const { error } = await supabase.from("regiebericht_rooms").insert(
        selectedRooms.map((r) => ({
          regiebericht_id: berichtId,
          room_id: r.room_id,
          room_name: r.room_name,
        }))
      );

      if (error) {
        alert("SAVE ROOMS: " + error.message);
        return false;
      }
    }

    if (workerRows.length > 0) {
      const { error } = await supabase.from("regiebericht_workers").insert(
        workerRows.map((w) => ({
          regiebericht_id: berichtId,
          worker_name: w.worker_name,
          von: w.von,
          bis: w.bis,
          pause: w.pause ?? 0,
          stunden: toNumberValue(w.stunden),
          bemerkung: w.bemerkung,
        }))
      );

      if (error) {
        alert("SAVE WORKERS: " + error.message);
        return false;
      }
    }

    if (materialRows.length > 0) {
      const { error } = await supabase.from("regiebericht_materials").insert(
        materialRows.map((m) => ({
          regiebericht_id: berichtId,
          material_id: m.material_id,
          bezeichnung: m.bezeichnung,
          menge: m.menge,
          einheit: m.einheit,
        }))
      );

      if (error) {
        alert("SAVE MATERIALS: " + error.message);
        return false;
      }
    }

    if (photos.length > 0) {
      for (const p of photos) {
        try {
          const url = p.photo_url
            ? p.photo_url
            : await uploadPhoto(p.file, berichtId);

          const { error } = await supabase.from("regiebericht_photos").insert([
            {
              regiebericht_id: berichtId,
              photo_url: url,
              note: p.note || "",
            },
          ]);

          if (error) {
            alert("SAVE PHOTO: " + error.message);
            return false;
          }
        } catch (err: any) {
          alert(
            "UPLOAD FOTO FEHLER: " +
              err.message +
              "\n\nFalls der Bucket fehlt, in Supabase Storage erstellen: regiebericht-photos"
          );
          return false;
        }
      }
    }

    return true;
  }

  async function saveBericht() {
    if (!baustelle) {
      alert(t.siteMissing);
      return;
    }

    const finalAuftraggeber = firstMeta && !activeBerichtId
      ? String(firstMeta.auftraggeber || "")
      : auftraggeber.trim();

    const finalBauleiter = firstMeta && !activeBerichtId
      ? String(firstMeta.bauleiter || "")
      : bauleiter.trim();

    if (!finalAuftraggeber.trim()) {
      alert(t.clientAlert);
      return;
    }

    if (!finalBauleiter.trim()) {
      alert(t.managerAlert);
      return;
    }

    if (!arbeiten.trim()) {
      alert(t.workAlert);
      return;
    }

    const wasExisting = Boolean(activeBerichtId);
    const finalBerichtNr = berichtNr.trim() || (await generateNextBerichtNr());

    const payload = {
      baustelle_id: Number(baustelleId),
      bericht_nr: finalBerichtNr,
      datum,
      auftragnehmer: FIRMA,
      auftraggeber: finalAuftraggeber.trim(),
      bauleiter: finalBauleiter.trim(),
      bauvorhaben: baustelle.naziv || "",
      ort: ort.trim(),
      ausgefuehrte_arbeiten: arbeiten.trim(),
      unterschrift_auftragnehmer: POTPIS,
      status: "ENTWURF",
    };

    let berichtId = activeBerichtId;

    if (activeBerichtId) {
      const { error } = await supabase
        .from("regieberichte")
        .update(payload)
        .eq("id", activeBerichtId);

      if (error) {
        alert("UPDATE REGIEBERICHT: " + error.message);
        return;
      }
    } else {
      const { data: bericht, error } = await supabase
        .from("regieberichte")
        .insert([payload])
        .select()
        .single();

      if (error) {
        alert("INSERT REGIEBERICHT: " + error.message);
        return;
      }

      berichtId = bericht.id;
      setBerichtNr(finalBerichtNr);
      setActiveBerichtId(bericht.id);
    }

    if (!berichtId) return;

    const childrenOk = await saveChildren(berichtId);
    if (!childrenOk) return;

    playNotificationSound();

    await loadBerichte();
    await loadFirstMeta();

    alert(wasExisting ? t.updated : t.saved);
  }

  function exportPrint() {
    window.print();
  }

  const metaKommtVomErstenBericht = Boolean(firstMeta && !activeBerichtId);

  return (
    <main style={styles.page}>
      <div className="no-print" style={styles.topBar}>
        <Link href={`/baustellen/${baustelleId}`} style={styles.backLink}>
          {t.back}
        </Link>

        <div style={styles.topButtons}>
          <button onClick={() => setShowList(!showList)} style={styles.listButton}>
            {showList ? t.showForm : t.list}
          </button>

          <button onClick={resetForm} style={styles.newButton}>
            {t.newReport}
          </button>

          <button onClick={exportPrint} style={styles.printButtonSmall}>
            {t.previewPrint}
          </button>
        </div>
      </div>

      {showList && (
        <section className="no-print" style={styles.inputPanel}>
          <div style={styles.listTitleRow}>
            <h1 style={styles.inputTitle}>{t.list}</h1>

            <div style={styles.listTotalBadge}>
              {t.total}: {listeGesamtStunden.toFixed(2)} h
            </div>
          </div>

          {berichte.length === 0 ? (
            <div style={styles.emptyListBox}>
              {t.noReports}
            </div>
          ) : (
            <div style={styles.listBox}>
              {berichte.map((b) => (
                <div key={b.id} style={styles.berichtCard}>
                  <div style={styles.berichtListContent}>
                    <div style={styles.berichtTitle}>
                      {t.reportNo} {b.bericht_nr || "-"}
                    </div>

                    <div style={styles.berichtInfo}>
                      {t.date}: {formatDatum(b.datum)} | {t.place}: {b.ort || "-"}
                    </div>

                    <div style={styles.berichtInfo}>
                      {t.client}: {b.auftraggeber || "-"} | {t.manager}:{" "}
                      {b.bauleiter || "-"}
                    </div>

                    <div style={styles.berichtWorkBlock}>
                      <div style={styles.berichtWorkTitle}>
                        {t.workDone}
                      </div>

                      <div style={styles.berichtWorkText}>
                        {b.ausgefuehrte_arbeiten || "-"}
                      </div>

                      <div style={styles.berichtTotalHours}>
                        {t.totalHours}: {toNumberValue(b.gesamtstunden).toFixed(2)} h
                      </div>
                    </div>
                  </div>

                  <div style={styles.berichtActions}>
                    <button
                      onClick={() => openBericht(b.id)}
                      style={styles.blueButton}
                    >
                      {t.openEdit}
                    </button>

                    <button
                      onClick={() => deleteBericht(b.id)}
                      style={styles.deleteButton}
                    >
                      {t.delete}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {!showList && (
        <>
          <section className="no-print" style={styles.inputPanel}>
            <h1 style={styles.inputTitle}>
              {activeBerichtId ? t.editReport : t.createReport}
            </h1>

            {activeBerichtId && (
              <div style={styles.editNotice}>
                {t.editing} {activeBerichtId}
              </div>
            )}

            <div style={styles.formGrid}>
              <div>
                <label style={styles.label}>{t.reportNumber}</label>
                <input
                  value={berichtNr}
                  onChange={(e) => setBerichtNr(e.target.value)}
                  style={styles.input}
                  placeholder="z.B. 1"
                />
              </div>

              <div>
                <label style={styles.label}>{t.date}</label>
                <input
                  type="date"
                  value={datum}
                  onChange={(e) => setDatum(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>{t.client}</label>
                <input
                  value={auftraggeber}
                  onChange={(e) => setAuftraggeber(e.target.value)}
                  style={metaKommtVomErstenBericht ? styles.readonlyInput : styles.input}
                  placeholder={t.client}
                  disabled={metaKommtVomErstenBericht}
                />
                {metaKommtVomErstenBericht && (
                  <div style={styles.smallHint}>{t.inherited}</div>
                )}
              </div>

              <div>
                <label style={styles.label}>{t.manager}</label>
                <input
                  value={bauleiter}
                  onChange={(e) => setBauleiter(e.target.value)}
                  style={metaKommtVomErstenBericht ? styles.readonlyInput : styles.input}
                  placeholder={t.managerName}
                  disabled={metaKommtVomErstenBericht}
                />
                {metaKommtVomErstenBericht && (
                  <div style={styles.smallHint}>{t.inherited}</div>
                )}
              </div>

              <div>
                <label style={styles.label}>{t.site}</label>
                <div style={styles.readonlyBox}>{baustelle?.naziv || "-"}</div>
              </div>

              <div>
                <label style={styles.label}>{t.place}</label>
                <input
                  value={ort}
                  onChange={(e) => setOrt(e.target.value)}
                  style={styles.input}
                  placeholder={t.place}
                />
              </div>
            </div>
          </section>

          <section className="no-print" style={styles.inputPanel}>
            <h2 style={styles.panelTitle}>{t.componentsRooms}</h2>

            <div style={styles.inlineGrid}>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                style={styles.input}
              >
                <option value="">{t.chooseRoom}</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.naziv}
                  </option>
                ))}
              </select>

              <button onClick={addRoom} style={styles.blueButton}>
                {t.addRoom}
              </button>
            </div>

            <div style={styles.chipBox}>
              {selectedRooms.map((r, index) => (
                <div key={index} style={styles.chip}>
                  {r.room_name}
                  <button
                    onClick={() => removeRoom(index)}
                    style={styles.smallDelete}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="no-print" style={styles.inputPanel}>
            <h2 style={styles.panelTitle}>{t.workDone}</h2>

            <textarea
              value={arbeiten}
              onChange={(e) => setArbeiten(e.target.value)}
              style={styles.textarea}
              placeholder={t.workPlaceholder}
            />
          </section>

          <section className="no-print" style={styles.inputPanel}>
            <h2 style={styles.panelTitle}>{t.workers}</h2>

            <div style={styles.workerGrid}>
              <select
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                style={styles.input}
              >
                <option value="">{t.chooseWorker}</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.name}>
                    {w.name}
                  </option>
                ))}
              </select>

              <input
                type="time"
                value={von}
                onChange={(e) => setVon(e.target.value)}
                style={styles.input}
              />

              <input
                type="time"
                value={bis}
                onChange={(e) => setBis(e.target.value)}
                style={styles.input}
              />

              <select
                value={pause}
                onChange={(e) => setPause(e.target.value)}
                style={styles.input}
              >
                <option value="0">{t.pause} 0 h</option>
                <option value="0.5">{t.pause} 0.5 h</option>
                <option value="1">{t.pause} 1 h</option>
                <option value="1.5">{t.pause} 1.5 h</option>
                <option value="2">{t.pause} 2 h</option>
                <option value="2.5">{t.pause} 2.5 h</option>
              </select>

              <input
                value={bemerkung}
                onChange={(e) => setBemerkung(e.target.value)}
                style={styles.input}
                placeholder={t.remark}
              />

              <button onClick={addWorker} style={styles.blueButton}>
                {t.add}
              </button>
            </div>
          </section>

          <section className="no-print" style={styles.inputPanel}>
            <h2 style={styles.panelTitle}>{t.materialOther}</h2>

            <div style={styles.materialGrid}>
              <select
                value={materialId}
                onChange={(e) => onMaterialSelect(e.target.value)}
                style={styles.input}
              >
                <option value="">{t.catalogMaterial}</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.naziv} {m.jedinica ? `(${m.jedinica})` : ""}
                  </option>
                ))}
              </select>

              <input
                value={materialName}
                onChange={(e) => setMaterialName(e.target.value)}
                style={styles.input}
                placeholder={t.freeDescription}
              />

              <input
                type="number"
                value={menge}
                onChange={(e) => setMenge(e.target.value)}
                style={styles.input}
                placeholder={t.quantity}
              />

              <input
                value={einheit}
                onChange={(e) => setEinheit(e.target.value)}
                style={styles.input}
                placeholder={t.unit}
              />

              <button onClick={addMaterial} style={styles.blueButton}>
                {t.add}
              </button>
            </div>
          </section>

          <section className="no-print" style={styles.inputPanel}>
            <h2 style={styles.panelTitle}>{t.photos}</h2>

            <input
              value={photoNote}
              onChange={(e) => setPhotoNote(e.target.value)}
              style={styles.input}
              placeholder={t.photoRemark}
            />

            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={(e) => addPhotos(e.target.files)}
              style={styles.fileInput}
            />

            <p style={styles.hint}>{t.photoHint}</p>

            {photos.length > 0 && (
              <div style={styles.attachmentPreviewGrid}>
                {photos.map((p, index) => (
                  <div key={index} style={styles.attachmentPreviewCard}>
                    <div style={styles.attachmentPreviewTitle}>
                      {p.kind === "pdf" ? "PDF" : `${t.image} ${index + 1}`}
                    </div>

                    {p.kind === "pdf" ? (
                      <div style={styles.pdfPreviewBox}>
                        PDF: {p.file_name || t.attachment}
                      </div>
                    ) : (
                      <img
                        src={p.preview}
                        alt={`Beilage ${index + 1}`}
                        style={styles.attachmentPreviewImage}
                      />
                    )}

                    {p.note && <div style={styles.photoCaption}>{p.note}</div>}

                    <button
                      onClick={() => removePhoto(index)}
                      style={styles.deleteButton}
                    >
                      {t.remove}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

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

              {workerRows.length > 0 && (
                <div className="no-print" style={styles.editList}>
                  {workerRows.map((w, index) => (
                    <button
                      key={index}
                      onClick={() => removeWorker(index)}
                      style={styles.deleteButton}
                    >
                      {w.worker_name} entfernen
                    </button>
                  ))}
                </div>
              )}
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

              {materialRows.length > 0 && (
                <div className="no-print" style={styles.editList}>
                  {materialRows.map((m, index) => (
                    <button
                      key={index}
                      onClick={() => removeMaterial(index)}
                      style={styles.deleteButton}
                    >
                      {m.bezeichnung} entfernen
                    </button>
                  ))}
                </div>
              )}
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

      <div className="no-print" style={styles.actionRow}>
        <button onClick={saveBericht} style={styles.saveButton}>
          {activeBerichtId ? t.saveChanges : t.saveReport}
        </button>

        <button onClick={() => setShowList(true)} style={styles.listButton}>
          {t.list}
        </button>

        <button onClick={exportPrint} style={styles.printButton}>
          {t.exportPrint}
        </button>
      </div>

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

