"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const BUCKET = "projekt-fotos";

const translations: any = {
  de: {
    back: "← Zurück zu Projekte",
    project: "Projekt",
    worker: "Mitarbeiter",
    date: "Datum",
    load: "Laden",
    loading: "Wird geladen...",

    normalHours: "Normal h",
    regieHours: "Regie h",
    waiting: "Wartet",
    approved: "Genehmigt",
    rejected: "Abgelehnt",

    workTime: "Arbeitszeit",
    performance: "Leistung",
    regie: "Regie",
    task: "Aufgabe",
    photo: "Foto",

    saveWorkTime: "Arbeitszeit speichern",
    savePerformance: "Leistung speichern",
    saveRegie: "Regie speichern",
    saveTask: "Aufgabe speichern",
    savePhoto: "Foto speichern",

    workTimeTitle: "Arbeitszeit eintragen",
    performanceTitle: "Leistung eintragen",
    regieTitle: "Regie melden",
    taskTitle: "Aufgabe / Mangel melden",
    photoTitle: "Foto hochladen",

    start: "Start",
    end: "Ende",
    pause: "Pause Minuten",
    room: "Raum",
    chooseRoom: "Raum wählen",
    lvPosition: "LV Position",
    withoutLv: "Ohne LV Position",
    chooseLv: "LV Position wählen",
    workType: "Arbeitsart",
    note: "Notiz",
    amount: "Menge",
    description: "Beschreibung",
    type: "Typ",
    priority: "Priorität",
    dueUntil: "Fällig bis",
    title: "Titel",
    file: "Foto",
    withoutRoom: "Ohne Raum",

    performanceHint:
      "Wichtig: Leistung nur einmal pro Raum / LV Position eintragen, nicht jeder Mitarbeiter separat.",

    myEntries: "Meine Einträge am",
    noWorkTime: "Keine Arbeitszeit vorhanden.",
    noPerformance: "Keine Leistung vorhanden.",
    noRegie: "Keine Regie vorhanden.",
    noPhotos: "Keine Fotos vorhanden.",
    noTasks: "Keine Aufgaben vorhanden.",
    adminNote: "Admin Notiz",
    deletePhoto: "Foto löschen",

    fortschritt: "Fortschritt",
    mangel: "Mangel",
    vorher: "Vorher",
    nachher: "Nachher",
    sonstiges: "Sonstiges",
    aufgabe: "Aufgabe",
    info: "Info",

    niedrig: "Niedrig",
    normal: "Normal",
    hoch: "Hoch",
    dringend: "Dringend",

    leistung: "Leistung",
    vorbereitung: "Vorbereitung",
    material: "Material",
    reinigung: "Reinigung",

    alertDateTime: "Datum, Start und Ende eingeben.",
    alertRoom: "Raum auswählen.",
    alertHours: "Stunden müssen größer als 0 sein.",
    alertLv: "Datum, Raum und LV Position auswählen.",
    alertAmount: "Menge muss größer als 0 sein.",
    alertRegieDescription: "Beschreibung für Regie eingeben.",
    alertTitle: "Titel eingeben.",
    alertDate: "Datum auswählen.",
    alertPhotoTitle: "Titel für Foto eingeben.",
    alertPhotoFile: "Foto auswählen.",
    confirmDeletePhoto: "Foto wirklich löschen?",
  },
  ba: {
    back: "← Nazad na projekte",
    project: "Projekt",
    worker: "Radnik",
    date: "Datum",
    load: "Učitaj",
    loading: "Učitava se...",

    normalHours: "Normal h",
    regieHours: "Regie h",
    waiting: "Čeka",
    approved: "Potvrđeno",
    rejected: "Odbijeno",

    workTime: "Radno vrijeme",
    performance: "Učinak",
    regie: "Regie",
    task: "Zadatak",
    photo: "Slika",

    saveWorkTime: "Sačuvaj radno vrijeme",
    savePerformance: "Sačuvaj učinak",
    saveRegie: "Sačuvaj Regie",
    saveTask: "Sačuvaj zadatak",
    savePhoto: "Sačuvaj sliku",

    workTimeTitle: "Unesi radno vrijeme",
    performanceTitle: "Unesi učinak",
    regieTitle: "Prijavi Regie",
    taskTitle: "Prijavi zadatak / Mangel",
    photoTitle: "Dodaj sliku",

    start: "Početak",
    end: "Kraj",
    pause: "Pauza minute",
    room: "Prostorija",
    chooseRoom: "Odaberi prostoriju",
    lvPosition: "LV pozicija",
    withoutLv: "Bez LV pozicije",
    chooseLv: "Odaberi LV poziciju",
    workType: "Vrsta rada",
    note: "Napomena",
    amount: "Količina",
    description: "Opis",
    type: "Tip",
    priority: "Prioritet",
    dueUntil: "Rok do",
    title: "Naslov",
    file: "Slika",
    withoutRoom: "Bez prostorije",

    performanceHint:
      "Važno: učinak se unosi samo jednom po prostoriji / LV poziciji, ne svaki radnik posebno.",

    myEntries: "Moji unosi za",
    noWorkTime: "Nema radnog vremena.",
    noPerformance: "Nema učinka.",
    noRegie: "Nema Regie unosa.",
    noPhotos: "Nema slika.",
    noTasks: "Nema zadataka.",
    adminNote: "Admin napomena",
    deletePhoto: "Obriši sliku",

    fortschritt: "Napredak",
    mangel: "Mangel",
    vorher: "Prije",
    nachher: "Poslije",
    sonstiges: "Ostalo",
    aufgabe: "Zadatak",
    info: "Info",

    niedrig: "Nisko",
    normal: "Normalno",
    hoch: "Visoko",
    dringend: "Hitno",

    leistung: "Učinak",
    vorbereitung: "Priprema",
    material: "Materijal",
    reinigung: "Čišćenje",

    alertDateTime: "Unesi datum, početak i kraj.",
    alertRoom: "Odaberi prostoriju.",
    alertHours: "Sati moraju biti veći od 0.",
    alertLv: "Odaberi datum, prostoriju i LV poziciju.",
    alertAmount: "Količina mora biti veća od 0.",
    alertRegieDescription: "Unesi opis Regie rada.",
    alertTitle: "Unesi naslov.",
    alertDate: "Odaberi datum.",
    alertPhotoTitle: "Unesi naslov slike.",
    alertPhotoFile: "Odaberi sliku.",
    confirmDeletePhoto: "Da li sigurno želiš obrisati sliku?",
  },
  uz: {
    back: "← Loyihalarga qaytish",
    project: "Loyiha",
    worker: "Ishchi",
    date: "Sana",
    load: "Yuklash",
    loading: "Yuklanmoqda...",

    normalHours: "Oddiy soat",
    regieHours: "Regie soat",
    waiting: "Kutilmoqda",
    approved: "Tasdiqlandi",
    rejected: "Rad etildi",

    workTime: "Ish vaqti",
    performance: "Ish hajmi",
    regie: "Regie",
    task: "Vazifa",
    photo: "Rasm",

    saveWorkTime: "Ish vaqtini saqlash",
    savePerformance: "Ish hajmini saqlash",
    saveRegie: "Regie saqlash",
    saveTask: "Vazifani saqlash",
    savePhoto: "Rasmni saqlash",

    workTimeTitle: "Ish vaqtini kiritish",
    performanceTitle: "Ish hajmini kiritish",
    regieTitle: "Regie yuborish",
    taskTitle: "Vazifa / Mangel yuborish",
    photoTitle: "Rasm yuklash",

    start: "Boshlanish",
    end: "Tugash",
    pause: "Tanaffus minut",
    room: "Xona",
    chooseRoom: "Xonani tanlang",
    lvPosition: "LV pozitsiya",
    withoutLv: "LV pozitsiyasiz",
    chooseLv: "LV pozitsiyani tanlang",
    workType: "Ish turi",
    note: "Eslatma",
    amount: "Miqdor",
    description: "Tavsif",
    type: "Tur",
    priority: "Muhimlik",
    dueUntil: "Muddat",
    title: "Sarlavha",
    file: "Rasm",
    withoutRoom: "Xonasiz",

    performanceHint:
      "Muhim: ish hajmi xona / LV pozitsiya bo‘yicha faqat bir marta kiritiladi, har bir ishchi alohida emas.",

    myEntries: "Mening yozuvlarim",
    noWorkTime: "Ish vaqti yo‘q.",
    noPerformance: "Ish hajmi yo‘q.",
    noRegie: "Regie yo‘q.",
    noPhotos: "Rasm yo‘q.",
    noTasks: "Vazifa yo‘q.",
    adminNote: "Admin eslatmasi",
    deletePhoto: "Rasmni o‘chirish",

    fortschritt: "Jarayon",
    mangel: "Kamchilik",
    vorher: "Oldin",
    nachher: "Keyin",
    sonstiges: "Boshqa",
    aufgabe: "Vazifa",
    info: "Info",

    niedrig: "Past",
    normal: "Normal",
    hoch: "Yuqori",
    dringend: "Shoshilinch",

    leistung: "Ish hajmi",
    vorbereitung: "Tayyorlash",
    material: "Material",
    reinigung: "Tozalash",

    alertDateTime: "Sana, boshlanish va tugashni kiriting.",
    alertRoom: "Xonani tanlang.",
    alertHours: "Soat 0 dan katta bo‘lishi kerak.",
    alertLv: "Sana, xona va LV pozitsiyani tanlang.",
    alertAmount: "Miqdor 0 dan katta bo‘lishi kerak.",
    alertRegieDescription: "Regie ishining tavsifini kiriting.",
    alertTitle: "Sarlavha kiriting.",
    alertDate: "Sana tanlang.",
    alertPhotoTitle: "Rasm sarlavhasini kiriting.",
    alertPhotoFile: "Rasm tanlang.",
    confirmDeletePhoto: "Rasmni o‘chirishni xohlaysizmi?",
  },
  en: {
    back: "← Back to projects",
    project: "Project",
    worker: "Worker",
    date: "Date",
    load: "Load",
    loading: "Loading...",

    normalHours: "Normal h",
    regieHours: "Regie h",
    waiting: "Waiting",
    approved: "Approved",
    rejected: "Rejected",

    workTime: "Work time",
    performance: "Performance",
    regie: "Regie",
    task: "Task",
    photo: "Photo",

    saveWorkTime: "Save work time",
    savePerformance: "Save performance",
    saveRegie: "Save Regie",
    saveTask: "Save task",
    savePhoto: "Save photo",

    workTimeTitle: "Enter work time",
    performanceTitle: "Enter performance",
    regieTitle: "Report Regie",
    taskTitle: "Report task / defect",
    photoTitle: "Upload photo",

    start: "Start",
    end: "End",
    pause: "Break minutes",
    room: "Room",
    chooseRoom: "Choose room",
    lvPosition: "LV position",
    withoutLv: "Without LV position",
    chooseLv: "Choose LV position",
    workType: "Work type",
    note: "Note",
    amount: "Amount",
    description: "Description",
    type: "Type",
    priority: "Priority",
    dueUntil: "Due until",
    title: "Title",
    file: "Photo",
    withoutRoom: "Without room",

    performanceHint:
      "Important: performance is entered only once per room / LV position, not separately by every worker.",

    myEntries: "My entries on",
    noWorkTime: "No work time available.",
    noPerformance: "No performance available.",
    noRegie: "No Regie available.",
    noPhotos: "No photos available.",
    noTasks: "No tasks available.",
    adminNote: "Admin note",
    deletePhoto: "Delete photo",

    fortschritt: "Progress",
    mangel: "Defect",
    vorher: "Before",
    nachher: "After",
    sonstiges: "Other",
    aufgabe: "Task",
    info: "Info",

    niedrig: "Low",
    normal: "Normal",
    hoch: "High",
    dringend: "Urgent",

    leistung: "Performance",
    vorbereitung: "Preparation",
    material: "Material",
    reinigung: "Cleaning",

    alertDateTime: "Enter date, start and end.",
    alertRoom: "Choose room.",
    alertHours: "Hours must be greater than 0.",
    alertLv: "Choose date, room and LV position.",
    alertAmount: "Amount must be greater than 0.",
    alertRegieDescription: "Enter Regie work description.",
    alertTitle: "Enter title.",
    alertDate: "Choose date.",
    alertPhotoTitle: "Enter photo title.",
    alertPhotoFile: "Choose photo.",
    confirmDeletePhoto: "Delete this photo?",
  },
};

function getTodayLocalDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function RadnikProjektDetailPage() {
  const params = useParams();
  const router = useRouter();

  const projektId = String(params.id);

  const [workerName, setWorkerName] = useState("");
  const [lang, setLang] = useState("ba");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const t = translations[lang] || translations.ba;

  const [projekt, setProjekt] = useState<any>(null);
  const [raeume, setRaeume] = useState<any[]>([]);
  const [positionen, setPositionen] = useState<any[]>([]);

  const [datum, setDatum] = useState(getTodayLocalDate());
  const [activeForm, setActiveForm] = useState("");

  const [myArbeitszeiten, setMyArbeitszeiten] = useState<any[]>([]);
  const [myLeistungen, setMyLeistungen] = useState<any[]>([]);
  const [myRegie, setMyRegie] = useState<any[]>([]);
  const [myRegieWorkers, setMyRegieWorkers] = useState<any[]>([]);
  const [myAufgaben, setMyAufgaben] = useState<any[]>([]);
  const [myFotos, setMyFotos] = useState<any[]>([]);

  const [zeitStart, setZeitStart] = useState("");
  const [zeitEnde, setZeitEnde] = useState("");
  const [zeitPause, setZeitPause] = useState("0");
  const [zeitRaumId, setZeitRaumId] = useState("");
  const [zeitPositionId, setZeitPositionId] = useState("");
  const [arbeitsart, setArbeitsart] = useState("Leistung");
  const [zeitNotiz, setZeitNotiz] = useState("");

  const [leistungRaumId, setLeistungRaumId] = useState("");
  const [leistungPositionId, setLeistungPositionId] = useState("");
  const [leistungMenge, setLeistungMenge] = useState("");
  const [leistungNotiz, setLeistungNotiz] = useState("");

  const [regieStart, setRegieStart] = useState("");
  const [regieEnde, setRegieEnde] = useState("");
  const [regiePause, setRegiePause] = useState("0");
  const [regieRaumId, setRegieRaumId] = useState("");
  const [regieBeschreibung, setRegieBeschreibung] = useState("");

  const [aufgabeTyp, setAufgabeTyp] = useState("Aufgabe");
  const [aufgabeTitel, setAufgabeTitel] = useState("");
  const [aufgabeBeschreibung, setAufgabeBeschreibung] = useState("");
  const [aufgabePrioritaet, setAufgabePrioritaet] = useState("Normal");
  const [aufgabeRaumId, setAufgabeRaumId] = useState("");
  const [aufgabePositionId, setAufgabePositionId] = useState("");
  const [aufgabeFaellig, setAufgabeFaellig] = useState("");

  const [fotoTyp, setFotoTyp] = useState("Fortschritt");
  const [fotoTitel, setFotoTitel] = useState("");
  const [fotoBeschreibung, setFotoBeschreibung] = useState("");
  const [fotoRaumId, setFotoRaumId] = useState("");
  const [fotoPositionId, setFotoPositionId] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  const summary = useMemo(() => {
    const normalHours = myArbeitszeiten.reduce(
      (sum, z) => sum + Number(z.stunden || 0),
      0
    );

    const regieHours = myRegieWorkers.reduce(
      (sum, r) => sum + Number(r.stunden || 0),
      0
    );

    const alleStatus = [
      ...myArbeitszeiten.map((z) => normalizeStatus(z.freigabe_status)),
      ...myLeistungen.map((l) => normalizeStatus(l.status)),
      ...myRegie.map((r) => normalizeStatus(r.status)),
      ...myFotos.map((f) => normalizeStatus(f.freigabe_status)),
    ];

    const wartet = alleStatus.filter((s) => s === "Wartet").length;
    const genehmigt = alleStatus.filter((s) => s === "Genehmigt").length;
    const abgelehnt = alleStatus.filter((s) => s === "Abgelehnt").length;

    return {
      normalHours,
      regieHours,
      totalHours: normalHours + regieHours,
      leistungen: myLeistungen.length,
      aufgaben: myAufgaben.length,
      fotos: myFotos.length,
      wartet,
      genehmigt,
      abgelehnt,
    };
  }, [
    myArbeitszeiten,
    myRegieWorkers,
    myLeistungen,
    myRegie,
    myAufgaben,
    myFotos,
  ]);

  useEffect(() => {
    const name = localStorage.getItem("worker_name");
    const savedLang = localStorage.getItem("lang") || "ba";

    if (!name) {
      router.push("/login");
      return;
    }

    setWorkerName(name);
    setLang(savedLang);
    loadBaseData(name, datum);
  }, [router, projektId]);

  async function loadBaseData(currentWorker: string, currentDate: string) {
    setLoading(true);

    const projektRes = await supabase
      .from("projekte")
      .select("*")
      .eq("id", Number(projektId))
      .single();

    if (projektRes.error) {
      alert("Greška kod učitavanja projekta: " + projektRes.error.message);
      setLoading(false);
      return;
    }

    setProjekt(projektRes.data);

    const raeumeRes = await supabase
      .from("projekt_raeume")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("created_at", { ascending: true });

    setRaeume(raeumeRes.data || []);

    const positionenRes = await supabase
      .from("projekt_lv_positionen")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .eq("aktiv", true)
      .order("position_nr", { ascending: true });

    setPositionen(positionenRes.data || []);

    await loadDayData(currentWorker, currentDate);

    setLoading(false);
  }

  async function loadDayData(
    currentWorker: string = workerName,
    currentDate: string = datum
  ) {
    const arbeitszeitRes = await supabase
      .from("projekt_arbeitszeiten")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .eq("worker_name", currentWorker)
      .eq("datum", currentDate)
      .order("start_time", { ascending: true });

    setMyArbeitszeiten(arbeitszeitRes.data || []);

    const leistungRes = await supabase
      .from("projekt_leistungen")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .eq("created_by", currentWorker)
      .eq("datum", currentDate)
      .order("created_at", { ascending: false });

    setMyLeistungen(leistungRes.data || []);

    const regieRes = await supabase
      .from("projekt_regie")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .eq("datum", currentDate)
      .order("start_time", { ascending: true });

    const allRegie = regieRes.data || [];
    const regieIds = allRegie.map((r) => r.id);

    if (regieIds.length > 0) {
      const workersRes = await supabase
        .from("projekt_regie_workers")
        .select("*")
        .in("regie_id", regieIds)
        .eq("worker_name", currentWorker);

      const workerRows = workersRes.data || [];
      const myIds = workerRows.map((w) => Number(w.regie_id));

      setMyRegie(allRegie.filter((r) => myIds.includes(Number(r.id))));
      setMyRegieWorkers(workerRows);
    } else {
      setMyRegie([]);
      setMyRegieWorkers([]);
    }

    const aufgabenRes = await supabase
      .from("projekt_aufgaben")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("created_at", { ascending: false });

    const allAufgaben = aufgabenRes.data || [];

    setMyAufgaben(
      allAufgaben.filter((a) => {
        return (
          a.assigned_to === currentWorker ||
          a.created_by === currentWorker ||
          !a.assigned_to
        );
      })
    );

    const fotosRes = await supabase
      .from("projekt_fotos")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .eq("created_by", currentWorker)
      .eq("datum", currentDate)
      .order("created_at", { ascending: false });

    setMyFotos(fotosRes.data || []);
  }

  function changeLanguage(newLang: string) {
    localStorage.setItem("lang", newLang);
    setLang(newLang);
  }

  function normalizeStatus(value: string | null | undefined) {
    if (!value) return "Wartet";
    if (value === "Offen") return "Wartet";
    if (value === "Erledigt") return "Genehmigt";
    if (value === "Genehmigt") return "Genehmigt";
    if (value === "Abgelehnt") return "Abgelehnt";

    return "Wartet";
  }

  function statusText(value: string | null | undefined) {
    const s = normalizeStatus(value);

    if (s === "Genehmigt") return t.approved;
    if (s === "Abgelehnt") return t.rejected;

    return t.waiting;
  }

  function parseNumber(value: string) {
    const num = parseFloat(String(value || "0").replace(",", "."));
    return Number.isNaN(num) ? 0 : num;
  }

  function calculateHours(start: string, end: string, pauseMinutes: string) {
    if (!start || !end) return 0;

    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);

    let startTotal = sh * 60 + sm;
    let endTotal = eh * 60 + em;

    if (endTotal <= startTotal) {
      endTotal += 24 * 60;
    }

    const pause = parseNumber(pauseMinutes);
    const minutes = Math.max(0, endTotal - startTotal - pause);

    return Math.round((minutes / 60) * 100) / 100;
  }

  function formatNumber(value: any, digits = 2) {
    const num = Number(value || 0);

    return num.toLocaleString("de-AT", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    const parts = String(value).split("-");
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }

    return value;
  }

  function getRaum(id: number | string | null) {
    if (!id) return null;
    return raeume.find((r) => String(r.id) === String(id)) || null;
  }

  function getPosition(id: number | string | null) {
    if (!id) return null;
    return positionen.find((p) => String(p.id) === String(id)) || null;
  }

  function getRaumName(id: number | string | null) {
    const raum = getRaum(id);
    if (!raum) return "-";

    return `${raum.ebene ? raum.ebene + " - " : ""}${raum.raum_name}`;
  }

  function getPositionText(id: number | string | null) {
    const pos = getPosition(id);
    if (!pos) return "-";

    return `${pos.position_nr} - ${pos.kurztext}`;
  }

  function getRaumFaktor(id: number | string | null) {
    const raum = getRaum(id);

    return Number(raum?.faktor || 1);
  }

  function getPositionEinheit(id: number | string | null) {
    const pos = getPosition(id);

    return pos?.einheit || "";
  }

  function getSafeFileName(originalName: string) {
    const ext = originalName.split(".").pop() || "jpg";
    const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "jpg";
    const random = Math.random().toString(36).slice(2);

    return `${Date.now()}-${random}.${cleanExt}`;
  }

  function clearZeitForm() {
    setZeitStart("");
    setZeitEnde("");
    setZeitPause("0");
    setZeitRaumId("");
    setZeitPositionId("");
    setArbeitsart("Leistung");
    setZeitNotiz("");
  }

  function clearLeistungForm() {
    setLeistungRaumId("");
    setLeistungPositionId("");
    setLeistungMenge("");
    setLeistungNotiz("");
  }

  function clearRegieForm() {
    setRegieStart("");
    setRegieEnde("");
    setRegiePause("0");
    setRegieRaumId("");
    setRegieBeschreibung("");
  }

  function clearAufgabeForm() {
    setAufgabeTyp("Aufgabe");
    setAufgabeTitel("");
    setAufgabeBeschreibung("");
    setAufgabePrioritaet("Normal");
    setAufgabeRaumId("");
    setAufgabePositionId("");
    setAufgabeFaellig("");
  }

  function clearFotoForm() {
    setFotoTyp("Fortschritt");
    setFotoTitel("");
    setFotoBeschreibung("");
    setFotoRaumId("");
    setFotoPositionId("");
    setFotoFile(null);
  }

  async function saveArbeitszeit() {
    if (!datum || !zeitStart || !zeitEnde) {
      alert(t.alertDateTime);
      return;
    }

    if (!zeitRaumId) {
      alert(t.alertRoom);
      return;
    }

    const stunden = calculateHours(zeitStart, zeitEnde, zeitPause);

    if (stunden <= 0) {
      alert(t.alertHours);
      return;
    }

    setSaving(true);

    const payload = {
      projekt_id: Number(projektId),
      worker_name: workerName,
      datum,
      start_time: zeitStart,
      end_time: zeitEnde,
      pause_minutes: parseNumber(zeitPause),
      stunden,
      raum_id: Number(zeitRaumId),
      lv_position_id: zeitPositionId ? Number(zeitPositionId) : null,
      arbeitsart,
      notiz: zeitNotiz.trim() || null,
      freigabe_status: "Wartet",
      admin_notiz: null,
      created_by: workerName,
    };

    const { error } = await supabase.from("projekt_arbeitszeiten").insert(payload);

    if (error) {
      alert("Greška kod spremanja Arbeitszeit: " + error.message);
      setSaving(false);
      return;
    }

    clearZeitForm();
    setActiveForm("");
    await loadDayData(workerName, datum);
    setSaving(false);
  }

  async function saveLeistung() {
    if (!datum || !leistungRaumId || !leistungPositionId) {
      alert(t.alertLv);
      return;
    }

    const menge = parseNumber(leistungMenge);

    if (menge <= 0) {
      alert(t.alertAmount);
      return;
    }

    const faktor = getRaumFaktor(leistungRaumId);
    const einheit = getPositionEinheit(leistungPositionId);

    setSaving(true);

    const payload = {
      projekt_id: Number(projektId),
      datum,
      raum_id: Number(leistungRaumId),
      lv_position_id: Number(leistungPositionId),
      menge_ist: menge,
      einheit,
      faktor,
      wirksame_menge: menge * faktor,
      status: "Offen",
      admin_notiz: null,
      notiz: leistungNotiz.trim() || null,
      created_by: workerName,
    };

    const { error } = await supabase.from("projekt_leistungen").insert(payload);

    if (error) {
      alert("Greška kod spremanja Leistung: " + error.message);
      setSaving(false);
      return;
    }

    clearLeistungForm();
    setActiveForm("");
    await loadDayData(workerName, datum);
    setSaving(false);
  }

  async function saveRegie() {
    if (!datum || !regieStart || !regieEnde || !regieRaumId) {
      alert(t.alertDateTime);
      return;
    }

    if (!regieBeschreibung.trim()) {
      alert(t.alertRegieDescription);
      return;
    }

    const stunden = calculateHours(regieStart, regieEnde, regiePause);

    if (stunden <= 0) {
      alert(t.alertHours);
      return;
    }

    setSaving(true);

    const payload = {
      projekt_id: Number(projektId),
      raum_id: Number(regieRaumId),
      datum,
      start_time: regieStart,
      end_time: regieEnde,
      pause_minutes: parseNumber(regiePause),
      stunden_pro_worker: stunden,
      beschreibung: regieBeschreibung.trim(),
      status: "Wartet",
      admin_notiz: null,
      auftraggeber: projekt?.auftraggeber || null,
      bauleiter: projekt?.bauleiter || null,
      created_by: workerName,
    };

    const regieRes = await supabase
      .from("projekt_regie")
      .insert(payload)
      .select()
      .single();

    if (regieRes.error) {
      alert("Greška kod spremanja Regie: " + regieRes.error.message);
      setSaving(false);
      return;
    }

    const { error: workerError } = await supabase
      .from("projekt_regie_workers")
      .insert({
        regie_id: regieRes.data.id,
        worker_name: workerName,
        stunden,
      });

    if (workerError) {
      alert("Regie je spremljen, ali radnik nije povezan: " + workerError.message);
      setSaving(false);
      return;
    }

    clearRegieForm();
    setActiveForm("");
    await loadDayData(workerName, datum);
    setSaving(false);
  }

  async function saveAufgabe() {
    if (!aufgabeTitel.trim()) {
      alert(t.alertTitle);
      return;
    }

    setSaving(true);

    const payload = {
      projekt_id: Number(projektId),
      datum,
      typ: aufgabeTyp,
      titel: aufgabeTitel.trim(),
      beschreibung: aufgabeBeschreibung.trim() || null,
      prioritaet: aufgabePrioritaet,
      status: "Offen",
      admin_notiz: null,
      assigned_to: workerName,
      faellig_bis: aufgabeFaellig || null,
      erledigt_am: null,
      raum_id: aufgabeRaumId ? Number(aufgabeRaumId) : null,
      lv_position_id: aufgabePositionId ? Number(aufgabePositionId) : null,
      created_by: workerName,
    };

    const { error } = await supabase.from("projekt_aufgaben").insert(payload);

    if (error) {
      alert("Greška kod spremanja Aufgabe: " + error.message);
      setSaving(false);
      return;
    }

    clearAufgabeForm();
    setActiveForm("");
    await loadDayData(workerName, datum);
    setSaving(false);
  }

  async function saveFoto() {
    if (!datum) {
      alert(t.alertDate);
      return;
    }

    if (!fotoTitel.trim()) {
      alert(t.alertPhotoTitle);
      return;
    }

    if (!fotoFile) {
      alert(t.alertPhotoFile);
      return;
    }

    setUploading(true);

    const safeName = getSafeFileName(fotoFile.name);
    const storagePath = `${projektId}/${workerName}/${safeName}`;

    const uploadRes = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fotoFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadRes.error) {
      alert("Greška kod upload slike: " + uploadRes.error.message);
      setUploading(false);
      return;
    }

    const publicUrlRes = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    const payload = {
      projekt_id: Number(projektId),
      datum,
      raum_id: fotoRaumId ? Number(fotoRaumId) : null,
      lv_position_id: fotoPositionId ? Number(fotoPositionId) : null,
      titel: fotoTitel.trim(),
      beschreibung: fotoBeschreibung.trim() || null,
      typ: fotoTyp,
      foto_url: publicUrlRes.data.publicUrl,
      storage_path: storagePath,
      freigabe_status: "Wartet",
      admin_notiz: null,
      created_by: workerName,
    };

    const { error } = await supabase.from("projekt_fotos").insert(payload);

    if (error) {
      alert("Greška kod spremanja slike: " + error.message);
      setUploading(false);
      return;
    }

    clearFotoForm();
    setActiveForm("");
    await loadDayData(workerName, datum);
    setUploading(false);
  }

  async function deleteFoto(item: any) {
    const ok = confirm(t.confirmDeletePhoto);

    if (!ok) return;

    if (item.storage_path) {
      await supabase.storage.from(BUCKET).remove([item.storage_path]);
    }

    const { error } = await supabase
      .from("projekt_fotos")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert("Greška kod brisanja slike: " + error.message);
      return;
    }

    await loadDayData(workerName, datum);
  }

  function StatusBadge({ status }: { status: string }) {
    const s = normalizeStatus(status);

    return (
      <span
        style={
          s === "Genehmigt"
            ? okBadgeStyle
            : s === "Abgelehnt"
            ? dangerBadgeStyle
            : warningBadgeStyle
        }
      >
        {statusText(status)}
      </span>
    );
  }

  function AdminNotiz({ value }: { value: string | null }) {
    if (!value) return null;

    return (
      <p style={adminNotizStyle}>
        {t.adminNote}: <strong>{value}</strong>
      </p>
    );
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <Link href="/projekte/radnik" style={backStyle}>
          {t.back}
        </Link>

        <h1 style={titleStyle}>👷 {t.project}</h1>
        <p style={loadingStyle}>{t.loading}</p>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <Link href="/projekte/radnik" style={backStyle}>
        {t.back}
      </Link>

      <h1 style={titleStyle}>👷 {projekt?.project_name || t.project}</h1>

      <p style={descriptionStyle}>
        {t.worker}: <strong>{workerName}</strong>
      </p>

      <div style={languageBoxStyle}>
        {["de", "ba", "uz", "en"].map((code) => (
          <button
            key={code}
            onClick={() => changeLanguage(code)}
            style={lang === code ? activeLangButtonStyle : langButtonStyle}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>

      <section style={dateBoxStyle}>
        <label style={labelStyle}>{t.date}</label>
        <div style={dateRowStyle}>
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            style={inputStyle}
          />

          <button
            onClick={() => loadDayData(workerName, datum)}
            style={blueButtonStyle}
          >
            {t.load}
          </button>
        </div>
      </section>

      <section style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>{t.normalHours}</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.normalHours)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>{t.regieHours}</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.regieHours)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>{t.waiting}</span>
          <strong style={{ ...summaryValueStyle, color: "#facc15" }}>
            {summary.wartet}
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>{t.rejected}</span>
          <strong style={{ ...summaryValueStyle, color: "#ef4444" }}>
            {summary.abgelehnt}
          </strong>
        </div>
      </section>

      <section style={buttonGridStyle}>
        <button
          onClick={() => setActiveForm(activeForm === "zeit" ? "" : "zeit")}
          style={greenButtonStyle}
        >
          ⏱️ {t.workTime}
        </button>

        <button
          onClick={() =>
            setActiveForm(activeForm === "leistung" ? "" : "leistung")
          }
          style={blueButtonFullStyle}
        >
          ✅ {t.performance}
        </button>

        <button
          onClick={() => setActiveForm(activeForm === "regie" ? "" : "regie")}
          style={orangeButtonStyle}
        >
          🧾 {t.regie}
        </button>

        <button
          onClick={() =>
            setActiveForm(activeForm === "aufgabe" ? "" : "aufgabe")
          }
          style={purpleButtonStyle}
        >
          ⚠️ {t.task}
        </button>

        <button
          onClick={() => setActiveForm(activeForm === "foto" ? "" : "foto")}
          style={photoButtonStyle}
        >
          📸 {t.photo}
        </button>
      </section>

      {activeForm === "zeit" && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>{t.workTimeTitle}</h2>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>{t.start}</label>
              <input
                type="time"
                value={zeitStart}
                onChange={(e) => setZeitStart(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>{t.end}</label>
              <input
                type="time"
                value={zeitEnde}
                onChange={(e) => setZeitEnde(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>{t.pause}</label>
              <input
                value={zeitPause}
                onChange={(e) => setZeitPause(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <label style={labelStyle}>{t.room} *</label>
          <select
            value={zeitRaumId}
            onChange={(e) => setZeitRaumId(e.target.value)}
            style={inputStyle}
          >
            <option value="">{t.chooseRoom}</option>
            {raeume.map((raum) => (
              <option key={raum.id} value={raum.id}>
                {raum.ebene ? `${raum.ebene} - ` : ""}
                {raum.raum_name}
              </option>
            ))}
          </select>

          <label style={labelStyle}>{t.lvPosition}</label>
          <select
            value={zeitPositionId}
            onChange={(e) => setZeitPositionId(e.target.value)}
            style={inputStyle}
          >
            <option value="">{t.withoutLv}</option>
            {positionen.map((pos) => (
              <option key={pos.id} value={pos.id}>
                {pos.position_nr} - {pos.kurztext}
              </option>
            ))}
          </select>

          <label style={labelStyle}>{t.workType}</label>
          <select
            value={arbeitsart}
            onChange={(e) => setArbeitsart(e.target.value)}
            style={inputStyle}
          >
            <option value="Leistung">{t.leistung}</option>
            <option value="Vorbereitung">{t.vorbereitung}</option>
            <option value="Material">{t.material}</option>
            <option value="Reinigung">{t.reinigung}</option>
            <option value="Sonstiges">{t.sonstiges}</option>
          </select>

          <label style={labelStyle}>{t.note}</label>
          <textarea
            value={zeitNotiz}
            onChange={(e) => setZeitNotiz(e.target.value)}
            style={textareaStyle}
          />

          <button
            onClick={saveArbeitszeit}
            disabled={saving}
            style={saveButtonStyle}
          >
            {saving ? "..." : t.saveWorkTime}
          </button>
        </section>
      )}

      {activeForm === "leistung" && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>{t.performanceTitle}</h2>

          <p style={hintStyle}>{t.performanceHint}</p>

          <label style={labelStyle}>{t.room} *</label>
          <select
            value={leistungRaumId}
            onChange={(e) => setLeistungRaumId(e.target.value)}
            style={inputStyle}
          >
            <option value="">{t.chooseRoom}</option>
            {raeume.map((raum) => (
              <option key={raum.id} value={raum.id}>
                {raum.ebene ? `${raum.ebene} - ` : ""}
                {raum.raum_name}
              </option>
            ))}
          </select>

          <label style={labelStyle}>{t.lvPosition} *</label>
          <select
            value={leistungPositionId}
            onChange={(e) => setLeistungPositionId(e.target.value)}
            style={inputStyle}
          >
            <option value="">{t.chooseLv}</option>
            {positionen.map((pos) => (
              <option key={pos.id} value={pos.id}>
                {pos.position_nr} - {pos.kurztext} | {pos.einheit}
              </option>
            ))}
          </select>

          <label style={labelStyle}>
            {t.amount}{" "}
            {leistungPositionId ? `(${getPositionEinheit(leistungPositionId)})` : ""}
          </label>
          <input
            value={leistungMenge}
            onChange={(e) => setLeistungMenge(e.target.value)}
            placeholder="z.B. 12,5"
            style={inputStyle}
          />

          <label style={labelStyle}>{t.note}</label>
          <textarea
            value={leistungNotiz}
            onChange={(e) => setLeistungNotiz(e.target.value)}
            style={textareaStyle}
          />

          <button
            onClick={saveLeistung}
            disabled={saving}
            style={saveButtonStyle}
          >
            {saving ? "..." : t.savePerformance}
          </button>
        </section>
      )}

      {activeForm === "regie" && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>{t.regieTitle}</h2>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>{t.start}</label>
              <input
                type="time"
                value={regieStart}
                onChange={(e) => setRegieStart(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>{t.end}</label>
              <input
                type="time"
                value={regieEnde}
                onChange={(e) => setRegieEnde(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>{t.pause}</label>
              <input
                value={regiePause}
                onChange={(e) => setRegiePause(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <label style={labelStyle}>{t.room} *</label>
          <select
            value={regieRaumId}
            onChange={(e) => setRegieRaumId(e.target.value)}
            style={inputStyle}
          >
            <option value="">{t.chooseRoom}</option>
            {raeume.map((raum) => (
              <option key={raum.id} value={raum.id}>
                {raum.ebene ? `${raum.ebene} - ` : ""}
                {raum.raum_name}
              </option>
            ))}
          </select>

          <label style={labelStyle}>{t.description} *</label>
          <textarea
            value={regieBeschreibung}
            onChange={(e) => setRegieBeschreibung(e.target.value)}
            style={textareaStyle}
          />

          <button onClick={saveRegie} disabled={saving} style={saveButtonStyle}>
            {saving ? "..." : t.saveRegie}
          </button>
        </section>
      )}

      {activeForm === "aufgabe" && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>{t.taskTitle}</h2>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>{t.type}</label>
              <select
                value={aufgabeTyp}
                onChange={(e) => setAufgabeTyp(e.target.value)}
                style={inputStyle}
              >
                <option value="Aufgabe">{t.aufgabe}</option>
                <option value="Mangel">{t.mangel}</option>
                <option value="Info">{t.info}</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>{t.priority}</label>
              <select
                value={aufgabePrioritaet}
                onChange={(e) => setAufgabePrioritaet(e.target.value)}
                style={inputStyle}
              >
                <option value="Niedrig">{t.niedrig}</option>
                <option value="Normal">{t.normal}</option>
                <option value="Hoch">{t.hoch}</option>
                <option value="Dringend">{t.dringend}</option>
              </select>
            </div>
          </div>

          <label style={labelStyle}>{t.title} *</label>
          <input
            value={aufgabeTitel}
            onChange={(e) => setAufgabeTitel(e.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>{t.description}</label>
          <textarea
            value={aufgabeBeschreibung}
            onChange={(e) => setAufgabeBeschreibung(e.target.value)}
            style={textareaStyle}
          />

          <label style={labelStyle}>{t.room}</label>
          <select
            value={aufgabeRaumId}
            onChange={(e) => setAufgabeRaumId(e.target.value)}
            style={inputStyle}
          >
            <option value="">{t.withoutRoom}</option>
            {raeume.map((raum) => (
              <option key={raum.id} value={raum.id}>
                {raum.ebene ? `${raum.ebene} - ` : ""}
                {raum.raum_name}
              </option>
            ))}
          </select>

          <label style={labelStyle}>{t.lvPosition}</label>
          <select
            value={aufgabePositionId}
            onChange={(e) => setAufgabePositionId(e.target.value)}
            style={inputStyle}
          >
            <option value="">{t.withoutLv}</option>
            {positionen.map((pos) => (
              <option key={pos.id} value={pos.id}>
                {pos.position_nr} - {pos.kurztext}
              </option>
            ))}
          </select>

          <label style={labelStyle}>{t.dueUntil}</label>
          <input
            type="date"
            value={aufgabeFaellig}
            onChange={(e) => setAufgabeFaellig(e.target.value)}
            style={inputStyle}
          />

          <button
            onClick={saveAufgabe}
            disabled={saving}
            style={saveButtonStyle}
          >
            {saving ? "..." : t.saveTask}
          </button>
        </section>
      )}

      {activeForm === "foto" && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>{t.photoTitle}</h2>

          <label style={labelStyle}>{t.type}</label>
          <select
            value={fotoTyp}
            onChange={(e) => setFotoTyp(e.target.value)}
            style={inputStyle}
          >
            <option value="Fortschritt">{t.fortschritt}</option>
            <option value="Mangel">{t.mangel}</option>
            <option value="Vorher">{t.vorher}</option>
            <option value="Nachher">{t.nachher}</option>
            <option value="Sonstiges">{t.sonstiges}</option>
          </select>

          <label style={labelStyle}>{t.title} *</label>
          <input
            value={fotoTitel}
            onChange={(e) => setFotoTitel(e.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>{t.description}</label>
          <textarea
            value={fotoBeschreibung}
            onChange={(e) => setFotoBeschreibung(e.target.value)}
            style={textareaStyle}
          />

          <label style={labelStyle}>{t.room}</label>
          <select
            value={fotoRaumId}
            onChange={(e) => setFotoRaumId(e.target.value)}
            style={inputStyle}
          >
            <option value="">{t.withoutRoom}</option>
            {raeume.map((raum) => (
              <option key={raum.id} value={raum.id}>
                {raum.ebene ? `${raum.ebene} - ` : ""}
                {raum.raum_name}
              </option>
            ))}
          </select>

          <label style={labelStyle}>{t.lvPosition}</label>
          <select
            value={fotoPositionId}
            onChange={(e) => setFotoPositionId(e.target.value)}
            style={inputStyle}
          >
            <option value="">{t.withoutLv}</option>
            {positionen.map((pos) => (
              <option key={pos.id} value={pos.id}>
                {pos.position_nr} - {pos.kurztext}
              </option>
            ))}
          </select>

          <label style={labelStyle}>{t.file} *</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
            style={inputStyle}
          />

          <button
            onClick={saveFoto}
            disabled={uploading}
            style={{
              ...saveButtonStyle,
              opacity: uploading ? 0.5 : 1,
            }}
          >
            {uploading ? "..." : t.savePhoto}
          </button>
        </section>
      )}

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>
          {t.myEntries} {formatDate(datum)}
        </h2>

        <h3 style={subTitleStyle}>{t.workTime}</h3>

        {myArbeitszeiten.length === 0 ? (
          <p style={emptyStyle}>{t.noWorkTime}</p>
        ) : (
          myArbeitszeiten.map((z) => (
            <div key={z.id} style={miniCardStyle}>
              <div style={miniTopStyle}>
                <strong>
                  {String(z.start_time || "").slice(0, 5)} -{" "}
                  {String(z.end_time || "").slice(0, 5)} |{" "}
                  {formatNumber(z.stunden)} h
                </strong>
                <StatusBadge status={z.freigabe_status} />
              </div>

              <p style={miniTextStyle}>{t.room}: {getRaumName(z.raum_id)}</p>
              <p style={miniTextStyle}>{t.lvPosition}: {getPositionText(z.lv_position_id)}</p>
              <p style={miniTextStyle}>{t.workType}: {z.arbeitsart || "-"}</p>
              <AdminNotiz value={z.admin_notiz} />
            </div>
          ))
        )}

        <h3 style={subTitleStyle}>{t.performance}</h3>

        {myLeistungen.length === 0 ? (
          <p style={emptyStyle}>{t.noPerformance}</p>
        ) : (
          myLeistungen.map((l) => (
            <div key={l.id} style={miniCardStyle}>
              <div style={miniTopStyle}>
                <strong>
                  {formatNumber(l.menge_ist)} {l.einheit || ""}
                </strong>
                <StatusBadge status={l.status} />
              </div>

              <p style={miniTextStyle}>{t.room}: {getRaumName(l.raum_id)}</p>
              <p style={miniTextStyle}>{t.lvPosition}: {getPositionText(l.lv_position_id)}</p>
              <AdminNotiz value={l.admin_notiz} />
            </div>
          ))
        )}

        <h3 style={subTitleStyle}>{t.regie}</h3>

        {myRegie.length === 0 ? (
          <p style={emptyStyle}>{t.noRegie}</p>
        ) : (
          myRegie.map((r) => (
            <div key={r.id} style={miniCardStyle}>
              <div style={miniTopStyle}>
                <strong>
                  {String(r.start_time || "").slice(0, 5)} -{" "}
                  {String(r.end_time || "").slice(0, 5)} |{" "}
                  {formatNumber(r.stunden_pro_worker)} h
                </strong>
                <StatusBadge status={r.status} />
              </div>

              <p style={miniTextStyle}>{t.room}: {getRaumName(r.raum_id)}</p>
              <p style={miniTextStyle}>{r.beschreibung}</p>
              <AdminNotiz value={r.admin_notiz} />
            </div>
          ))
        )}

        <h3 style={subTitleStyle}>{t.photo}</h3>

        {myFotos.length === 0 ? (
          <p style={emptyStyle}>{t.noPhotos}</p>
        ) : (
          <div style={photoGridStyle}>
            {myFotos.map((foto) => (
              <div key={foto.id} style={photoCardStyle}>
                <a href={foto.foto_url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={foto.foto_url}
                    alt={foto.titel || "Foto"}
                    style={photoStyle}
                  />
                </a>

                <div style={photoBodyStyle}>
                  <div style={miniTopStyle}>
                    <strong>{foto.titel || "-"}</strong>
                    <StatusBadge status={foto.freigabe_status} />
                  </div>

                  <p style={miniTextStyle}>{t.type}: {foto.typ || "-"}</p>
                  <p style={miniTextStyle}>{t.room}: {getRaumName(foto.raum_id)}</p>
                  <AdminNotiz value={foto.admin_notiz} />

                  <button
                    onClick={() => deleteFoto(foto)}
                    style={deleteFotoButtonStyle}
                  >
                    {t.deletePhoto}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h3 style={subTitleStyle}>{t.task}</h3>

        {myAufgaben.length === 0 ? (
          <p style={emptyStyle}>{t.noTasks}</p>
        ) : (
          myAufgaben.slice(0, 10).map((a) => (
            <div key={a.id} style={miniCardStyle}>
              <div style={miniTopStyle}>
                <strong>
                  {a.typ}: {a.titel}
                </strong>
                <StatusBadge status={a.status} />
              </div>

              <p style={miniTextStyle}>{t.priority}: {a.prioritaet}</p>
              <p style={miniTextStyle}>{t.room}: {getRaumName(a.raum_id)}</p>
              <AdminNotiz value={a.admin_notiz} />
            </div>
          ))
        )}
      </section>
    </main>
  );
}

const mainStyle: any = {
  background: "#000",
  minHeight: "100vh",
  color: "white",
  padding: "18px",
};

const backStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "16px",
};

const titleStyle: any = {
  fontSize: "32px",
  color: "#f97316",
  margin: "18px 0 8px 0",
};

const descriptionStyle: any = {
  color: "#bbb",
  marginBottom: "12px",
};

const loadingStyle: any = {
  color: "#aaa",
};

const languageBoxStyle: any = {
  display: "flex",
  gap: "8px",
  marginBottom: "16px",
  flexWrap: "wrap",
};

const langButtonStyle: any = {
  background: "#111",
  color: "white",
  border: "1px solid #333",
  borderRadius: "9px",
  padding: "7px 13px",
  fontSize: "13px",
  fontWeight: "bold",
  cursor: "pointer",
};

const activeLangButtonStyle: any = {
  ...langButtonStyle,
  background: "#f97316",
  border: "1px solid #f97316",
};

const dateBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "16px",
  marginBottom: "16px",
};

const dateRowStyle: any = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "10px",
};

const labelStyle: any = {
  display: "block",
  color: "#ddd",
  fontWeight: "bold",
  marginBottom: "7px",
  marginTop: "12px",
};

const inputStyle: any = {
  width: "100%",
  padding: "13px",
  borderRadius: "10px",
  border: "1px solid #333",
  background: "#000",
  color: "white",
  fontSize: "16px",
  boxSizing: "border-box",
};

const textareaStyle: any = {
  ...inputStyle,
  minHeight: "95px",
  resize: "vertical",
};

const summaryGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "10px",
  marginBottom: "16px",
};

const summaryCardStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "14px",
  padding: "13px",
};

const summaryLabelStyle: any = {
  display: "block",
  color: "#aaa",
  fontSize: "12px",
  marginBottom: "5px",
};

const summaryValueStyle: any = {
  color: "#f97316",
  fontSize: "20px",
};

const buttonGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginBottom: "18px",
};

const greenButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "14px",
  padding: "15px 10px",
  fontSize: "15px",
  fontWeight: "bold",
  cursor: "pointer",
};

const blueButtonFullStyle: any = {
  ...greenButtonStyle,
  background: "#2563eb",
};

const orangeButtonStyle: any = {
  ...greenButtonStyle,
  background: "#ca8a04",
};

const purpleButtonStyle: any = {
  ...greenButtonStyle,
  background: "#9333ea",
};

const photoButtonStyle: any = {
  ...greenButtonStyle,
  background: "#be123c",
  gridColumn: "1 / -1",
};

const blueButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "0 16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const formBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "16px",
  marginBottom: "18px",
};

const formTitleStyle: any = {
  color: "#f97316",
  marginTop: 0,
};

const formGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: "10px",
};

const hintStyle: any = {
  color: "#facc15",
  background: "#1f1600",
  border: "1px solid #ca8a04",
  borderRadius: "10px",
  padding: "10px",
  fontSize: "13px",
};

const saveButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "14px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  width: "100%",
  marginTop: "16px",
};

const listBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "16px",
  marginBottom: "20px",
};

const sectionTitleStyle: any = {
  color: "#f97316",
  marginTop: 0,
};

const subTitleStyle: any = {
  color: "#f97316",
  fontSize: "17px",
  marginTop: "18px",
};

const emptyStyle: any = {
  color: "#aaa",
  fontSize: "14px",
};

const miniCardStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "12px",
  padding: "12px",
  marginBottom: "10px",
};

const miniTopStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
};

const miniTextStyle: any = {
  color: "#ccc",
  fontSize: "13px",
  margin: "5px 0",
};

const adminNotizStyle: any = {
  color: "#facc15",
  background: "#1f1600",
  border: "1px solid #ca8a04",
  borderRadius: "10px",
  padding: "9px",
  fontSize: "13px",
  marginTop: "8px",
};

const photoGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "12px",
};

const photoCardStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "12px",
  overflow: "hidden",
};

const photoStyle: any = {
  width: "100%",
  height: "220px",
  objectFit: "cover",
  display: "block",
};

const photoBodyStyle: any = {
  padding: "12px",
};

const deleteFotoButtonStyle: any = {
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "10px",
  fontWeight: "bold",
  cursor: "pointer",
  width: "100%",
  marginTop: "10px",
};

const okBadgeStyle: any = {
  background: "#16a34a",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const warningBadgeStyle: any = {
  background: "#ca8a04",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const dangerBadgeStyle: any = {
  background: "#dc2626",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};