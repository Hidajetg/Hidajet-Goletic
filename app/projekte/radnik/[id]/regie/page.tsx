"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Lang = "de" | "ba" | "en" | "uz";

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
  address?: string | null;
  auftraggeber?: string | null;
  bauleiter?: string | null;
  [key: string]: any;
};

const WORKERS = ["Arnes", "Ramiz", "Abror", "Shohruh", "Harun"];

const t: Record<Lang, any> = {
  de: {
    back: "Zurück",
    title: "Regie / Zusatzarbeit",
    subtitle:
      "Regie ist ein Nachweis für Zusatzarbeiten. Nach der Unterschrift sind keine Änderungen mehr möglich.",
    language: "Sprache",
    worker: "Angemeldeter Arbeiter",
    noWorker:
      "Kein Arbeiter angemeldet. Bitte zuerst über Login mit PIN anmelden.",
    workers: "Weitere Arbeiter auswählen",
    date: "Datum",
    start: "Von",
    end: "Bis",
    pause: "Pause Minuten",
    room: "Raum",
    selectRoom: "Raum auswählen",
    noRooms: "Keine Räume vorhanden. Bitte zuerst im Admin Räume hinzufügen.",
    position: "LV Position",
    selectPosition: "LV Position auswählen",
    noPositions:
      "Keine LV Positionen vorhanden. Wenn es keine passende LV Position gibt, Zusatzposition eintragen.",
    extraPosition: "Zusätzliche Position / Beschreibung",
    extraPositionPlaceholder:
      "Wenn es keine passende LV Position gibt, hier eintragen",
    work: "Regiearbeit",
    workPlaceholder: "Was wurde als Regiearbeit gemacht?",
    description: "Beschreibung",
    descriptionPlaceholder: "Beschreibung der Zusatzarbeit",
    material: "Material / Geräte / Sonstiges",
    materialPlaceholder: "Material oder Geräte eintragen",
    calculatedHours: "Stunden pro Arbeiter",
    totalWorkerHours: "Gesamtstunden Arbeiter",
    photos: "Fotos",
    photoTitle: "Foto Titel",
    photoNote: "Foto Notiz",
    addPhotos: "Fotos hinzufügen",
    save: "Regie speichern",
    saving: "Speichern...",
    todayEntries: "Heutige Regie",
    noEntries: "Keine Regie für heute.",
    successSaved: "Regie wurde gespeichert.",
    nextStep: "Nächster Schritt",
    signNow: "Bauleiter unterschreiben",
    openPdf: "PDF öffnen",
    showQr: "QR Code für PDF",
    pdfOnlyAfterSign:
      "QR Code wird erst nach der Unterschrift angezeigt und führt nur zum PDF.",
    signed: "Unterschrieben",
    waiting: "Wartet auf Unterschrift",
    locked: "Gesperrt",
    notLocked: "Offen",
    errors: {
      noWorker:
        "Kein Arbeiter angemeldet. Bitte zuerst über Login mit PIN anmelden.",
      selectWorkers: "Bitte mindestens einen Arbeiter auswählen.",
      selectRoom: "Bitte Raum auswählen.",
      enterWork: "Bitte Regiearbeit eintragen.",
      enterDescription: "Bitte Beschreibung eintragen.",
      invalidTime: "Bitte gültige Arbeitszeit eintragen.",
      duplicate: "Diese Regie wurde bereits eingetragen.",
      saveFailed: "Regie konnte nicht gespeichert werden.",
    },
  },
  ba: {
    back: "Nazad",
    title: "Regie / dodatni rad",
    subtitle:
      "Regie je dokaz za dodatni rad. Nakon potpisa više nema izmjena osim admina.",
    language: "Jezik",
    worker: "Prijavljeni radnik",
    noWorker:
      "Radnik nije prijavljen. Prvo se prijavi preko Login stranice sa PIN kodom.",
    workers: "Odaberi dodatne radnike",
    date: "Datum",
    start: "Od",
    end: "Do",
    pause: "Pauza minuta",
    room: "Prostorija",
    selectRoom: "Odaberi prostoriju",
    noRooms: "Nema prostorija. Prvo u adminu dodaj prostorije.",
    position: "LV pozicija",
    selectPosition: "Odaberi LV poziciju",
    noPositions:
      "Nema LV pozicija. Ako nema odgovarajuće LV pozicije, upiši dodatnu poziciju.",
    extraPosition: "Dodatna pozicija / opis",
    extraPositionPlaceholder: "Ako nema odgovarajuće LV pozicije, upiši ovdje",
    work: "Regie dodatni rad",
    workPlaceholder: "Šta je urađeno kao dodatni rad?",
    description: "Opis",
    descriptionPlaceholder: "Opis dodatnog rada",
    material: "Materijal / alati / ostalo",
    materialPlaceholder: "Upiši materijal ili alat",
    calculatedHours: "Sati po radniku",
    totalWorkerHours: "Ukupno sati radnika",
    photos: "Slike",
    photoTitle: "Naziv slike",
    photoNote: "Opis slike",
    addPhotos: "Dodaj slike",
    save: "Spremi Regie",
    saving: "Spremanje...",
    todayEntries: "Današnji Regie",
    noEntries: "Nema Regie unosa za danas.",
    successSaved: "Regie je spremljen.",
    nextStep: "Sljedeći korak",
    signNow: "Potpis Bauleitera",
    openPdf: "Otvori PDF",
    showQr: "QR kod za PDF",
    pdfOnlyAfterSign:
      "QR kod se prikazuje tek nakon potpisa i vodi samo na PDF.",
    signed: "Potpisano",
    waiting: "Čeka potpis",
    locked: "Zaključano",
    notLocked: "Otvoreno",
    errors: {
      noWorker:
        "Radnik nije prijavljen. Prvo se prijavi preko Login stranice sa PIN kodom.",
      selectWorkers: "Odaberi najmanje jednog radnika.",
      selectRoom: "Odaberi prostoriju.",
      enterWork: "Upiši Regie dodatni rad.",
      enterDescription: "Upiši opis dodatnog rada.",
      invalidTime: "Upiši ispravno radno vrijeme.",
      duplicate: "Ovaj Regie unos već postoji.",
      saveFailed: "Regie nije spremljen.",
    },
  },
  en: {
    back: "Back",
    title: "Extra work / Regie",
    subtitle:
      "Regie is proof for extra work. After signing, changes are only possible by admin.",
    language: "Language",
    worker: "Logged-in worker",
    noWorker:
      "No worker is logged in. Please log in first with PIN on the Login page.",
    workers: "Select additional workers",
    date: "Date",
    start: "From",
    end: "To",
    pause: "Break minutes",
    room: "Room",
    selectRoom: "Select room",
    noRooms: "No rooms available. Please add rooms in admin first.",
    position: "LV position",
    selectPosition: "Select LV position",
    noPositions:
      "No LV positions available. If there is no matching LV position, enter an extra position.",
    extraPosition: "Extra position / description",
    extraPositionPlaceholder: "If there is no matching LV position, enter it here",
    work: "Regie work",
    workPlaceholder: "What was done as extra work?",
    description: "Description",
    descriptionPlaceholder: "Description of extra work",
    material: "Material / tools / other",
    materialPlaceholder: "Enter material or tools",
    calculatedHours: "Hours per worker",
    totalWorkerHours: "Total worker hours",
    photos: "Photos",
    photoTitle: "Photo title",
    photoNote: "Photo note",
    addPhotos: "Add photos",
    save: "Save Regie",
    saving: "Saving...",
    todayEntries: "Today’s Regie",
    noEntries: "No Regie entries for today.",
    successSaved: "Regie was saved.",
    nextStep: "Next step",
    signNow: "Supervisor signature",
    openPdf: "Open PDF",
    showQr: "QR code for PDF",
    pdfOnlyAfterSign:
      "QR code is shown only after signing and opens only the PDF.",
    signed: "Signed",
    waiting: "Waiting for signature",
    locked: "Locked",
    notLocked: "Open",
    errors: {
      noWorker:
        "No worker is logged in. Please log in first with PIN on the Login page.",
      selectWorkers: "Select at least one worker.",
      selectRoom: "Select room.",
      enterWork: "Enter Regie work.",
      enterDescription: "Enter description.",
      invalidTime: "Enter valid work time.",
      duplicate: "This Regie entry already exists.",
      saveFailed: "Regie could not be saved.",
    },
  },
  uz: {
    back: "Orqaga",
    title: "Qo‘shimcha ish / Regie",
    subtitle:
      "Regie qo‘shimcha ish uchun dalil. Imzodan keyin faqat admin o‘zgartira oladi.",
    language: "Til",
    worker: "Kirilgan ishchi",
    noWorker:
      "Ishchi tizimga kirmagan. Avval Login sahifasida PIN bilan kiring.",
    workers: "Qo‘shimcha ishchilarni tanlang",
    date: "Sana",
    start: "Boshlash",
    end: "Tugatish",
    pause: "Tanaffus daqiqa",
    room: "Xona",
    selectRoom: "Xonani tanlang",
    noRooms: "Xonalar yo‘q. Avval admin qismida xona qo‘shing.",
    position: "LV pozitsiya",
    selectPosition: "LV pozitsiyani tanlang",
    noPositions:
      "LV pozitsiyalar yo‘q. Mos LV pozitsiya bo‘lmasa, qo‘shimcha pozitsiya yozing.",
    extraPosition: "Qo‘shimcha pozitsiya / izoh",
    extraPositionPlaceholder: "Mos LV pozitsiya bo‘lmasa, shu yerga yozing",
    work: "Regie ishi",
    workPlaceholder: "Qo‘shimcha ish sifatida nima qilindi?",
    description: "Tavsif",
    descriptionPlaceholder: "Qo‘shimcha ish tavsifi",
    material: "Material / asboblar / boshqa",
    materialPlaceholder: "Material yoki asboblarni yozing",
    calculatedHours: "Har ishchi soati",
    totalWorkerHours: "Jami ishchi soatlari",
    photos: "Rasmlar",
    photoTitle: "Rasm nomi",
    photoNote: "Rasm izohi",
    addPhotos: "Rasm qo‘shish",
    save: "Regie saqlash",
    saving: "Saqlanmoqda...",
    todayEntries: "Bugungi Regie",
    noEntries: "Bugun Regie yozuvi yo‘q.",
    successSaved: "Regie saqlandi.",
    nextStep: "Keyingi qadam",
    signNow: "Bauleiter imzosi",
    openPdf: "PDF ochish",
    showQr: "PDF uchun QR kod",
    pdfOnlyAfterSign:
      "QR kod faqat imzodan keyin ko‘rinadi va faqat PDFni ochadi.",
    signed: "Imzolangan",
    waiting: "Imzo kutilmoqda",
    locked: "Qulflangan",
    notLocked: "Ochiq",
    errors: {
      noWorker:
        "Ishchi tizimga kirmagan. Avval Login sahifasida PIN bilan kiring.",
      selectWorkers: "Kamida bitta ishchini tanlang.",
      selectRoom: "Xonani tanlang.",
      enterWork: "Regie ishini yozing.",
      enterDescription: "Tavsifni yozing.",
      invalidTime: "To‘g‘ri ish vaqtini kiriting.",
      duplicate: "Bu Regie yozuvi allaqachon mavjud.",
      saveFailed: "Regie saqlanmadi.",
    },
  },
};

export default function RadnikRegiePage() {
  const params = useParams();

  const projektId = String(params.id);
  const projektIdValue = isNaN(Number(projektId))
    ? projektId
    : Number(projektId);

  const [lang, setLang] = useState<Lang>("ba");
  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [raeume, setRaeume] = useState<any[]>([]);
  const [positionen, setPositionen] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [regieFotos, setRegieFotos] = useState<any[]>([]);

  const [mainWorker, setMainWorker] = useState("");
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [datum, setDatum] = useState(today());

  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [pauseMinuten, setPauseMinuten] = useState("30");

  const [raumId, setRaumId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [extraPosition, setExtraPosition] = useState("");
  const [arbeit, setArbeit] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [material, setMaterial] = useState("");

  const [fotoTitel, setFotoTitel] = useState("");
  const [fotoNotiz, setFotoNotiz] = useState("");
  const [fotoFiles, setFotoFiles] = useState<File[]>([]);

  const [lastSaved, setLastSaved] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    const savedLang = getSavedLanguage();
    const loggedWorker = getLoggedWorker();

    setLang(savedLang);
    setMainWorker(loggedWorker);

    if (loggedWorker) {
      saveWorkerEverywhere(loggedWorker);
      setSelectedWorkers([loggedWorker]);
    }

    loadAll(loggedWorker, datum);
  }, [projektId]);

  function today() {
    const d = new Date();

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function getSavedLanguage(): Lang {
    const value =
      localStorage.getItem("appLanguage") ||
      localStorage.getItem("lang") ||
      localStorage.getItem("language") ||
      "ba";

    if (["de", "ba", "en", "uz"].includes(value)) {
      return value as Lang;
    }

    return "ba";
  }

  function getLoggedWorker() {
    const direct =
      localStorage.getItem("worker_name") ||
      localStorage.getItem("workerName") ||
      localStorage.getItem("radnik") ||
      localStorage.getItem("userName") ||
      localStorage.getItem("name") ||
      localStorage.getItem("worker") ||
      localStorage.getItem("mitarbeiter") ||
      localStorage.getItem("logged_worker") ||
      localStorage.getItem("loggedWorker") ||
      localStorage.getItem("current_worker") ||
      localStorage.getItem("username") ||
      "";

    if (direct) return direct;

    const jsonKeys = ["user", "currentUser", "loggedUser", "sessionUser"];

    for (const key of jsonKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;

        const parsed = JSON.parse(raw);

        const name =
          parsed?.worker_name ||
          parsed?.workerName ||
          parsed?.name ||
          parsed?.userName ||
          parsed?.radnik ||
          parsed?.worker ||
          "";

        if (name) return String(name);
      } catch {}
    }

    return "";
  }

  function saveWorkerEverywhere(name: string) {
    localStorage.setItem("worker_name", name);
    localStorage.setItem("workerName", name);
    localStorage.setItem("radnik", name);
    localStorage.setItem("userName", name);
    localStorage.setItem("name", name);
  }

  function tr(key: string) {
    return t[lang]?.[key] || t.ba[key] || key;
  }

  function err(key: string) {
    return t[lang]?.errors?.[key] || t.ba.errors[key] || key;
  }

  function showError(key: string) {
    setMessageText("");
    setErrorText(err(key));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showSuccess(key: string) {
    setErrorText("");
    setMessageText(t[lang]?.[key] || t.ba[key] || key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function changeLang(next: Lang) {
    setLang(next);
    localStorage.setItem("appLanguage", next);
    localStorage.setItem("lang", next);
    localStorage.setItem("language", next);
  }

  function toggleWorker(name: string) {
    setSelectedWorkers((old) => {
      if (name === mainWorker) {
        if (old.includes(name)) return old;
        return [name, ...old];
      }

      if (old.includes(name)) {
        return old.filter((x) => x !== name);
      }

      return [...old, name];
    });
  }

  function getProjektName() {
    if (!projekt) return `Projekt ${projektId}`;

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

    return (
      projekt.ort ||
      projekt.mjesto ||
      projekt.location ||
      projekt.adresse ||
      projekt.address ||
      ""
    );
  }

  function belongsToProject(row: any) {
    return (
      String(row.projekt_id || "") === String(projektId) ||
      String(row.project_id || "") === String(projektId) ||
      String(row.baustelle_id || "") === String(projektId)
    );
  }

  function getRoomName(row: any) {
    return (
      row.name ||
      row.naziv ||
      row.raum ||
      row.room ||
      row.titel ||
      row.title ||
      `Raum ${row.id}`
    );
  }

  function getRoomEtage(row: any) {
    return row.etage || row.floor || "";
  }

  function getRoomStatus(row: any) {
    return row.status || "";
  }

  function getPositionNr(row: any) {
    return row.position_nr || row.nr || row.pos || row.lv_nr || row.number || "";
  }

  function getPositionTitle(row: any) {
    return (
      row.titel ||
      row.title ||
      row.kurztext ||
      row.name ||
      row.naziv ||
      row.beschreibung ||
      row.description ||
      "LV Position"
    );
  }

  function getPositionDescription(row: any) {
    return row.beschreibung || row.description || row.langtext || row.text || "";
  }

  function getPositionEinheit(row: any) {
    return row.einheit || row.unit || row.jedinica || "";
  }

  function getFotoUrl(row: any) {
    return (
      row.url ||
      row.image_url ||
      row.foto_url ||
      row.photo_url ||
      row.public_url ||
      ""
    );
  }

  function toNumber(value: any) {
    const n = Number(String(value || "0").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function formatHours(value: any) {
    return `${toNumber(value).toFixed(2).replace(".", ",")} h`;
  }

  function parseTimeToMinutes(value: string) {
    if (!value || !value.includes(":")) return 0;

    const [h, m] = value.split(":").map((x) => Number(x));
    return h * 60 + m;
  }

  function calculateHoursPerWorker() {
    const start = parseTimeToMinutes(startTime);
    let end = parseTimeToMinutes(endTime);
    const pause = Number(pauseMinuten || 0);

    if (!start || !end) return 0;

    if (end < start) {
      end += 24 * 60;
    }

    const total = end - start - pause;

    return Math.max(0, total / 60);
  }

  function totalWorkerHours() {
    return calculateHoursPerWorker() * selectedWorkers.length;
  }

  function makeToken() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }

    return `regie-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }

  async function loadAll(workerName = mainWorker, dateValue = datum) {
    setLoading(true);
    setErrorText("");
    setMessageText("");

    await loadProjekt();
    await loadRaeume();
    await loadPositionen();
    await loadEntries(workerName, dateValue);
    await loadFotos();

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
        return;
      }
    }

    setProjekt(null);
  }

  async function loadRaeume() {
    const tables = ["prostorije", "raeume"];
    let finalRows: any[] = [];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("id", { ascending: true });

      if (!error && data) {
        const filtered = data.filter((row: any) => belongsToProject(row));

        if (filtered.length > 0) {
          finalRows = filtered;
          break;
        }
      }
    }

    finalRows.sort((a, b) => {
      const ar = Number(a.reihenfolge || a.sort_order || a.id || 0);
      const br = Number(b.reihenfolge || b.sort_order || b.id || 0);
      return ar - br;
    });

    setRaeume(finalRows);
  }

  async function loadPositionen() {
    const tables = ["positionen", "lv_positionen", "projekt_positionen"];
    let finalRows: any[] = [];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("id", { ascending: true });

      if (!error && data) {
        const filtered = data.filter((row: any) => belongsToProject(row));

        if (filtered.length > 0) {
          finalRows = filtered;
          break;
        }
      }
    }

    finalRows.sort((a, b) => {
      const an = String(getPositionNr(a));
      const bn = String(getPositionNr(b));
      return an.localeCompare(bn, "de", { numeric: true });
    });

    setPositionen(finalRows);
  }

  async function loadEntries(workerName = mainWorker, dateValue = datum) {
    const { data, error } = await supabase
      .from("regie")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setEntries([]);
      return;
    }

    const w = String(workerName || "").toLowerCase();

    setEntries(
      (data || []).filter((row: any) => {
        const sameProject = belongsToProject(row);
        const sameDate =
          String(row.datum || row.date || "") === String(dateValue);

        const sameWorker =
          !w ||
          String(
            row.workers_text ||
              row.worker_names ||
              row.radnik ||
              row.worker ||
              row.worker_name ||
              ""
          )
            .toLowerCase()
            .includes(w);

        return sameProject && sameDate && sameWorker;
      })
    );
  }

  async function loadFotos() {
    const { data, error } = await supabase
      .from("regie_fotos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setRegieFotos([]);
      return;
    }

    setRegieFotos((data || []).filter((row: any) => belongsToProject(row)));
  }

  const filteredPositionen = useMemo(() => {
    if (!raumId) return positionen;

    return positionen.filter((row: any) => {
      const rowRaumId = row.raum_id || row.room_id || "";
      return !rowRaumId || String(rowRaumId) === String(raumId);
    });
  }, [positionen, raumId]);

  const selectedRoom = useMemo(() => {
    return raeume.find((row: any) => String(row.id) === String(raumId));
  }, [raeume, raumId]);

  const selectedPosition = useMemo(() => {
    return positionen.find((row: any) => String(row.id) === String(positionId));
  }, [positionen, positionId]);

  function isDuplicate() {
    return entries.some((row: any) => {
      return (
        String(row.datum || row.date || "") === String(datum) &&
        String(row.raum_id || "") === String(raumId) &&
        String(row.position_id || "") === String(positionId) &&
        String(row.arbeit || row.title || "")
          .trim()
          .toLowerCase() === String(arbeit).trim().toLowerCase()
      );
    });
  }

  async function uploadFotos(savedRegieId: number | string) {
    if (fotoFiles.length === 0) return;

    for (const file of fotoFiles) {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${projektId}/regie-${savedRegieId}-${Date.now()}-${cleanName}`;

      const buckets = ["regie-fotos", "fotos", "photos"];
      let publicUrl = "";
      let usedBucket = "";

      for (const bucket of buckets) {
        const { error } = await supabase.storage.from(bucket).upload(path, file, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        });

        if (!error) {
          const { data } = supabase.storage.from(bucket).getPublicUrl(path);
          publicUrl = data.publicUrl || "";
          usedBucket = bucket;
          break;
        }
      }

      if (!publicUrl) continue;

      const payload = {
        projekt_id: String(projektId),
        project_id: String(projektId),
        baustelle_id: projektIdValue,

        regie_id: String(savedRegieId),
        relation_type: "regie",

        raum_id: String(raumId),
        room_id: String(raumId),
        raum_name: selectedRoom ? getRoomName(selectedRoom) : "",
        room_name: selectedRoom ? getRoomName(selectedRoom) : "",

        position_id: positionId ? String(positionId) : "",
        lv_position_id: positionId ? String(positionId) : "",
        position_nr: selectedPosition ? getPositionNr(selectedPosition) : "",
        position_titel: selectedPosition ? getPositionTitle(selectedPosition) : "",

        titel: fotoTitel.trim() || file.name,
        title: fotoTitel.trim() || file.name,
        beschreibung: fotoNotiz.trim(),
        description: fotoNotiz.trim(),
        notiz: fotoNotiz.trim(),
        note: fotoNotiz.trim(),

        url: publicUrl,
        image_url: publicUrl,
        foto_url: publicUrl,
        photo_url: publicUrl,
        public_url: publicUrl,

        bucket: usedBucket,
        path,
        file_path: path,
        storage_path: path,

        typ: "Regie",
        type: "Regie",
        status: "Wartet",
      };

      await supabase.from("regie_fotos").insert(payload as any);
    }
  }

  async function saveRegie() {
    if (saving) return;

    if (!mainWorker.trim()) {
      showError("noWorker");
      return;
    }

    if (selectedWorkers.length === 0) {
      showError("selectWorkers");
      return;
    }

    if (!raumId) {
      showError("selectRoom");
      return;
    }

    if (!arbeit.trim()) {
      showError("enterWork");
      return;
    }

    if (!beschreibung.trim()) {
      showError("enterDescription");
      return;
    }

    const hoursPerWorker = calculateHoursPerWorker();

    if (hoursPerWorker <= 0) {
      showError("invalidTime");
      return;
    }

    if (isDuplicate()) {
      showError("duplicate");
      return;
    }

    setSaving(true);
    setErrorText("");
    setMessageText("");

    const token = makeToken();
    const workersText = selectedWorkers.join(", ");

    const payload = {
      projekt_id: String(projektId),
      project_id: String(projektId),
      baustelle_id: projektIdValue,

      datum,
      date: datum,

      radnik: mainWorker.trim(),
      arbeiter: mainWorker.trim(),
      worker: mainWorker.trim(),
      worker_name: mainWorker.trim(),
      name: mainWorker.trim(),

      workers_text: workersText,
      worker_names: workersText,

      raum_id: String(raumId),
      room_id: String(raumId),
      raum_name: selectedRoom ? getRoomName(selectedRoom) : "",
      room_name: selectedRoom ? getRoomName(selectedRoom) : "",

      position_id: positionId ? String(positionId) : "",
      lv_position_id: positionId ? String(positionId) : "",
      position_nr: selectedPosition ? getPositionNr(selectedPosition) : "",
      lv_nr: selectedPosition ? getPositionNr(selectedPosition) : "",
      position_titel: selectedPosition ? getPositionTitle(selectedPosition) : "",
      position_title: selectedPosition ? getPositionTitle(selectedPosition) : "",

      extra_position: extraPosition.trim(),
      zusatz_position: extraPosition.trim(),

      arbeit: arbeit.trim(),
      title: arbeit.trim(),
      titel: arbeit.trim(),
      regiearbeit: arbeit.trim(),

      beschreibung: beschreibung.trim(),
      description: beschreibung.trim(),
      arbeiten: beschreibung.trim(),

      material: material.trim(),
      materialien: material.trim(),
      material_text: material.trim(),

      start_time: startTime,
      end_time: endTime,
      start: startTime,
      end: endTime,
      von: startTime,
      bis: endTime,

      pause_minuten: Number(pauseMinuten || 0),
      pause_minutes: Number(pauseMinuten || 0),
      break_minutes: Number(pauseMinuten || 0),
      pause: Number(pauseMinuten || 0),

      stunden: totalWorkerHours(),
      hours: totalWorkerHours(),
      total_hours: totalWorkerHours(),
      gesamt_stunden: totalWorkerHours(),

      stunden_pro_arbeiter: hoursPerWorker,
      hours_per_worker: hoursPerWorker,

      status: "Wartet",
      freigabe_status: "Wartet",
      approval_status: "Wartet",

      locked: false,
      public_token: token,

      bauleiter_bestaetigung: "",
      bauleiter_beschreibung: "",
      bauleiter_positionen: "",
      bauleiter_notiz: "",

      pdf_url: "",
      qr_url: "",
    };

    const { data, error } = await supabase
      .from("regie")
      .insert(payload as any)
      .select("*")
      .maybeSingle();

    if (error || !data?.id) {
      setSaving(false);
      showError("saveFailed");
      return;
    }

    for (const name of selectedWorkers) {
      await supabase.from("regie_arbeiter").insert({
        projekt_id: String(projektId),
        project_id: String(projektId),
        baustelle_id: projektIdValue,
        regie_id: String(data.id),

        radnik: name,
        arbeiter: name,
        worker: name,
        worker_name: name,
        name,

        stunden: hoursPerWorker,
        hours: hoursPerWorker,
      } as any);
    }

    if (fotoFiles.length > 0) {
      await uploadFotos(data.id);
    }

    setLastSaved(data);

    setArbeit("");
    setBeschreibung("");
    setMaterial("");
    setExtraPosition("");
    setFotoTitel("");
    setFotoNotiz("");
    setFotoFiles([]);

    showSuccess("successSaved");
    await loadEntries(mainWorker, datum);
    await loadFotos();
    setSaving(false);
  }

  function getFotosForRegie(regieId: any) {
    return regieFotos.filter((foto: any) => {
      return String(foto.regie_id || "") === String(regieId);
    });
  }

  function getQrUrl(pdfUrl: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
      pdfUrl
    )}`;
  }

  return (
    <main className="page">
      <section className="hero">
        <div>
          <Link className="back" href={`/projekte/radnik/${projektId}`}>
            ← {tr("back")}
          </Link>

          <p className="label">{getProjektName()}</p>
          <h1>{tr("title")}</h1>
          <p className="subtitle">
            {getProjektOrt() ? `${getProjektOrt()} · ` : ""}
            {tr("subtitle")}
          </p>
        </div>
      </section>

      {errorText && <div className="errorBox">{errorText}</div>}
      {messageText && <div className="successBox">{messageText}</div>}

      {lastSaved && (
        <section className="afterSave">
          <h2>{tr("nextStep")}</h2>

          <p>{tr("pdfOnlyAfterSign")}</p>

          <div className="afterButtons">
            {lastSaved.public_token && (
              <Link
                href={`/projekte/${projektId}/regie/sign/${lastSaved.public_token}`}
              >
                ✍️ {tr("signNow")}
              </Link>
            )}

            {lastSaved.pdf_url ? (
              <>
                <a href={lastSaved.pdf_url} target="_blank" rel="noreferrer">
                  📄 {tr("openPdf")}
                </a>

                <div className="qrBox">
                  <img src={getQrUrl(lastSaved.pdf_url)} alt="QR PDF" />
                  <span>{tr("showQr")}</span>
                </div>
              </>
            ) : (
              <div className="pdfWait">{tr("pdfOnlyAfterSign")}</div>
            )}
          </div>
        </section>
      )}

      <section className="panel">
        <label>{tr("language")}</label>

        <div className="langGrid">
          {(["de", "ba", "en", "uz"] as Lang[]).map((x) => (
            <button
              key={x}
              className={lang === x ? "active" : ""}
              onClick={() => changeLang(x)}
              type="button"
            >
              {x.toUpperCase()}
            </button>
          ))}
        </div>

        <label>{tr("worker")}</label>

        {mainWorker ? (
          <div className="workerBox">👷 {mainWorker}</div>
        ) : (
          <div className="warningBox">{tr("noWorker")}</div>
        )}

        <label>{tr("workers")}</label>

        <div className="workerGrid">
          {WORKERS.map((name) => (
            <button
              key={name}
              type="button"
              className={selectedWorkers.includes(name) ? "selected" : ""}
              onClick={() => toggleWorker(name)}
            >
              {selectedWorkers.includes(name) ? "✓ " : ""}
              {name}
            </button>
          ))}
        </div>

        <label>{tr("date")}</label>

        <input
          type="date"
          value={datum}
          onChange={(e) => {
            const nextDate = e.target.value;
            setDatum(nextDate);
            loadEntries(mainWorker, nextDate);
          }}
        />

        <div className="timeGrid">
          <div>
            <label>{tr("start")}</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div>
            <label>{tr("end")}</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <div>
            <label>{tr("pause")}</label>
            <input
              type="number"
              value={pauseMinuten}
              onChange={(e) => setPauseMinuten(e.target.value)}
            />
          </div>
        </div>

        <label>{tr("room")}</label>

        <select
          value={raumId}
          onChange={(e) => {
            setRaumId(e.target.value);
            setPositionId("");
          }}
        >
          <option value="">{tr("selectRoom")}</option>

          {raeume.map((row: any) => (
            <option key={row.id} value={row.id}>
              {getRoomName(row)}
              {getRoomEtage(row) ? ` · ${getRoomEtage(row)}` : ""}
              {getRoomStatus(row) ? ` · ${getRoomStatus(row)}` : ""}
            </option>
          ))}
        </select>

        {raeume.length === 0 && <div className="warningBox">{tr("noRooms")}</div>}

        <label>{tr("position")}</label>

        <select
          value={positionId}
          onChange={(e) => {
            const id = e.target.value;
            const pos = positionen.find(
              (row: any) => String(row.id) === String(id)
            );

            setPositionId(id);

            if (pos && !arbeit) {
              setArbeit(getPositionTitle(pos));
            }
          }}
        >
          <option value="">{tr("selectPosition")}</option>

          {filteredPositionen.map((row: any) => (
            <option key={row.id} value={row.id}>
              {getPositionNr(row) ? `${getPositionNr(row)} · ` : ""}
              {getPositionTitle(row)}
              {getPositionEinheit(row) ? ` · ${getPositionEinheit(row)}` : ""}
            </option>
          ))}
        </select>

        {positionen.length === 0 && (
          <div className="warningBox">{tr("noPositions")}</div>
        )}

        {selectedPosition && (
          <div className="positionInfo">
            <b>
              {getPositionNr(selectedPosition)
                ? `${getPositionNr(selectedPosition)} · `
                : ""}
              {getPositionTitle(selectedPosition)}
            </b>

            {getPositionDescription(selectedPosition) && (
              <p>{getPositionDescription(selectedPosition)}</p>
            )}
          </div>
        )}

        <label>{tr("extraPosition")}</label>

        <textarea
          value={extraPosition}
          onChange={(e) => setExtraPosition(e.target.value)}
          placeholder={tr("extraPositionPlaceholder")}
        />

        <label>{tr("work")}</label>

        <input
          value={arbeit}
          onChange={(e) => setArbeit(e.target.value)}
          placeholder={tr("workPlaceholder")}
        />

        <label>{tr("description")}</label>

        <textarea
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          placeholder={tr("descriptionPlaceholder")}
        />

        <label>{tr("material")}</label>

        <textarea
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          placeholder={tr("materialPlaceholder")}
        />

        <div className="calcGrid">
          <div>
            <span>{tr("calculatedHours")}</span>
            <strong>{formatHours(calculateHoursPerWorker())}</strong>
          </div>

          <div>
            <span>{tr("totalWorkerHours")}</span>
            <strong>{formatHours(totalWorkerHours())}</strong>
          </div>
        </div>

        <section className="fotoBox">
          <h2>{tr("photos")}</h2>

          <label>{tr("photoTitle")}</label>

          <input
            value={fotoTitel}
            onChange={(e) => setFotoTitel(e.target.value)}
            placeholder={tr("photoTitle")}
          />

          <label>{tr("photoNote")}</label>

          <textarea
            value={fotoNotiz}
            onChange={(e) => setFotoNotiz(e.target.value)}
            placeholder={tr("photoNote")}
          />

          <label>{tr("addPhotos")}</label>

          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={(e) => setFotoFiles(Array.from(e.target.files || []))}
          />

          {fotoFiles.length > 0 && (
            <div className="selectedFiles">
              {fotoFiles.map((file) => (
                <span key={`${file.name}-${file.size}`}>{file.name}</span>
              ))}
            </div>
          )}
        </section>

        <button className="saveBtn" onClick={saveRegie} disabled={saving}>
          {saving ? tr("saving") : tr("save")}
        </button>
      </section>

      <section className="todayBox">
        <div className="todayTop">
          <h2>{tr("todayEntries")}</h2>

          <button onClick={() => loadEntries(mainWorker, datum)} type="button">
            {loading ? "..." : "↻"}
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="empty">{tr("noEntries")}</p>
        ) : (
          <div className="entryList">
            {entries.map((row: any) => {
              const fotos = getFotosForRegie(row.id);

              return (
                <div key={row.id}>
                  <b>{row.arbeit || row.title || row.beschreibung || "Regie"}</b>

                  <span>
                    {row.workers_text || row.worker_names || row.radnik || "-"}
                  </span>

                  <small>
                    {tr("room")}: {row.raum_name || row.room_name || "-"}
                  </small>

                  <small>
                    {tr("position")}: {row.position_nr || row.lv_nr || "-"} ·{" "}
                    {row.position_titel ||
                      row.position_title ||
                      row.extra_position ||
                      "-"}
                  </small>

                  <small>
                    {row.locked ? tr("signed") : tr("waiting")} ·{" "}
                    {row.locked ? tr("locked") : tr("notLocked")}
                  </small>

                  <small>{formatHours(row.stunden || row.hours || 0)}</small>

                  {row.beschreibung && <p>{row.beschreibung}</p>}

                  {fotos.length > 0 && (
                    <div className="miniPhotos">
                      {fotos.slice(0, 4).map((foto: any) => (
                        <img
                          key={foto.id}
                          src={getFotoUrl(foto)}
                          alt={foto.titel || foto.title || "Regie Foto"}
                        />
                      ))}
                    </div>
                  )}

                  {row.public_token && (
                    <Link
                      className="signLink"
                      href={`/projekte/${projektId}/regie/sign/${row.public_token}`}
                    >
                      ✍️ {tr("signNow")}
                    </Link>
                  )}

                  {row.pdf_url && (
                    <a
                      className="pdfLink"
                      href={row.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      📄 {tr("openPdf")}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <style>{`
        .page {
          min-height: 100vh;
          background: #050505;
          color: white;
          padding: 16px;
          font-family: Arial, sans-serif;
        }

        .hero,
        .panel,
        .todayBox,
        .afterSave {
          max-width: 980px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero {
          margin-bottom: 16px;
        }

        .back {
          display: inline-block;
          background: #374151;
          color: white;
          text-decoration: none;
          border-radius: 14px;
          padding: 12px 14px;
          font-weight: 900;
          margin-bottom: 16px;
        }

        .label {
          color: #9ca3af;
          margin: 0 0 6px;
          font-weight: 900;
          font-size: 13px;
        }

        h1 {
          margin: 0;
          font-size: 34px;
          line-height: 1.05;
        }

        .subtitle {
          margin: 8px 0 0;
          color: #cbd5e1;
          font-weight: 700;
          line-height: 1.4;
        }

        .panel,
        .todayBox,
        .afterSave {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 20px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .afterSave {
          border-color: #16a34a;
        }

        .afterSave h2 {
          margin: 0 0 8px;
        }

        .afterSave p {
          color: #cbd5e1;
          font-weight: 800;
          line-height: 1.45;
        }

        .afterButtons {
          display: grid;
          gap: 10px;
        }

        .afterButtons a,
        .pdfWait,
        .signLink,
        .pdfLink {
          display: block;
          background: #15803d;
          color: white;
          text-decoration: none;
          border-radius: 14px;
          padding: 14px;
          text-align: center;
          font-weight: 900;
        }

        .afterButtons a:nth-child(2),
        .pdfLink {
          background: #2563eb;
        }

        .pdfWait {
          background: #78350f;
          color: #fed7aa;
          border: 1px solid #f59e0b;
        }

        .qrBox {
          background: #0b1220;
          border: 1px solid #374151;
          border-radius: 16px;
          padding: 14px;
          text-align: center;
        }

        .qrBox img {
          width: 220px;
          max-width: 100%;
          background: white;
          border-radius: 12px;
          padding: 10px;
        }

        .qrBox span {
          display: block;
          margin-top: 8px;
          color: #cbd5e1;
          font-weight: 900;
        }

        label {
          display: block;
          color: #d1d5db;
          font-weight: 900;
          margin: 14px 0 7px;
        }

        input,
        textarea,
        select {
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

        textarea {
          min-height: 95px;
          resize: vertical;
          line-height: 1.45;
        }

        .workerBox {
          width: 100%;
          box-sizing: border-box;
          background: #064e3b;
          color: white;
          border: 1px solid #16a34a;
          border-radius: 16px;
          padding: 17px;
          font-size: 20px;
          font-weight: 900;
        }

        .warningBox {
          background: #78350f;
          border: 1px solid #f59e0b;
          color: #fed7aa;
          padding: 14px;
          border-radius: 14px;
          font-weight: 900;
          margin-top: 12px;
        }

        .langGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .langGrid button,
        .workerGrid button {
          background: #1f2937;
          color: white;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 14px;
          font-weight: 900;
        }

        .langGrid .active,
        .workerGrid .selected {
          background: #2563eb;
          border-color: #60a5fa;
        }

        .workerGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .timeGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
        }

        .positionInfo {
          margin-top: 14px;
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 14px;
        }

        .positionInfo b {
          display: block;
          color: #93c5fd;
          margin-bottom: 8px;
        }

        .positionInfo p {
          margin: 0;
          color: #cbd5e1;
          line-height: 1.45;
          white-space: pre-wrap;
        }

        .calcGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          margin-top: 14px;
        }

        .calcGrid div {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 14px;
        }

        .calcGrid span {
          display: block;
          color: #9ca3af;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .calcGrid strong {
          display: block;
          color: #bbf7d0;
          font-size: 22px;
        }

        .fotoBox {
          margin-top: 16px;
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 14px;
        }

        .fotoBox h2 {
          margin: 0 0 8px;
          font-size: 22px;
        }

        .selectedFiles {
          display: grid;
          gap: 8px;
          margin-top: 12px;
        }

        .selectedFiles span {
          background: #111827;
          border: 1px solid #374151;
          color: #e5e7eb;
          border-radius: 12px;
          padding: 10px;
          font-size: 13px;
          font-weight: 800;
        }

        .saveBtn {
          width: 100%;
          margin-top: 16px;
          background: #ea580c;
          color: white;
          border: 0;
          border-radius: 16px;
          padding: 17px;
          font-size: 17px;
          font-weight: 900;
        }

        .saveBtn:disabled {
          opacity: 0.6;
        }

        .todayTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .todayTop h2 {
          margin: 0 0 10px;
        }

        .todayTop button {
          background: #2563eb;
          color: white;
          border: 0;
          border-radius: 12px;
          padding: 10px 14px;
          font-weight: 900;
        }

        .empty {
          color: #cbd5e1;
          font-weight: 800;
        }

        .entryList {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }

        .entryList > div {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 13px;
        }

        .entryList b {
          display: block;
          color: #93c5fd;
          margin-bottom: 6px;
        }

        .entryList span,
        .entryList small {
          display: block;
          color: white;
          font-weight: 800;
          margin-top: 4px;
        }

        .entryList small {
          color: #cbd5e1;
          font-weight: 700;
        }

        .entryList p {
          color: #d1d5db;
          margin: 8px 0 0;
        }

        .miniPhotos {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-top: 10px;
        }

        .miniPhotos img {
          width: 100%;
          height: 120px;
          object-fit: cover;
          border-radius: 12px;
          border: 1px solid #374151;
          background: #030712;
        }

        .signLink {
          margin-top: 10px;
          background: #15803d;
        }

        .pdfLink {
          margin-top: 10px;
        }

        .errorBox {
          max-width: 980px;
          margin: 0 auto 16px;
          background: #7f1d1d;
          border: 1px solid #ef4444;
          color: white;
          padding: 14px;
          border-radius: 14px;
          font-weight: 900;
        }

        .successBox {
          max-width: 980px;
          margin: 0 auto 16px;
          background: #064e3b;
          border: 1px solid #16a34a;
          color: white;
          padding: 14px;
          border-radius: 14px;
          font-weight: 900;
        }

        @media (min-width: 780px) {
          .page {
            padding: 28px;
          }

          .timeGrid {
            grid-template-columns: 1fr 1fr 150px;
            gap: 12px;
          }

          .workerGrid {
            grid-template-columns: repeat(5, 1fr);
          }

          .calcGrid {
            grid-template-columns: repeat(2, 1fr);
          }

          .miniPhotos {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>
    </main>
  );
}