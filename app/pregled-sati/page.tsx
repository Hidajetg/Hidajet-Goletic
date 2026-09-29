"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];

type WorkerOption = {
  label: string;
  queryNames: string[];
  active: boolean;
};

function cleanWorkerName(value: any) {
  return String(value ?? "").trim();
}

function workerNameKey(value: any) {
  return cleanWorkerName(value).toLowerCase();
}

function uniqueWorkerNames(names: string[]) {
  const unique = new Map<string, string>();

  for (const rawName of names) {
    const name = cleanWorkerName(rawName);
    const key = workerNameKey(name);

    if (name && !unique.has(key)) {
      unique.set(key, name);
    }
  }

  return Array.from(unique.values());
}

function namesBelongToSameWorker(currentName: string, historicalName: string) {
  const currentKey = workerNameKey(currentName);
  const historicalKey = workerNameKey(historicalName);

  if (!currentKey || !historicalKey) return false;
  if (currentKey === historicalKey) return true;

  const currentTokens = currentKey.split(/\s+/).filter(Boolean);

  return currentTokens.some(
    (token) =>
      token === historicalKey ||
      token.startsWith(historicalKey) ||
      historicalKey.startsWith(token)
  );
}

const GODISNJI_DANI_PO_RADNIKU = 25;
const SATI_PO_DANU = 8.5;
const SATI_GODISNJEG_PO_DANU = 8;

const PDF_BUCKET = "pdf-assets";
const PDF_LOGO_TOP = "gore.png";
const PDF_SIDE_IMAGE = "strana.png";
const PDF_MOUNTAIN_BG = "pozadina.png";

const translations: any = {
  ba: {
    back: "Nazad na Dashboard",
    title: "Pregled sati",
    loggedIn: "Prijavljen",
    worker: "Radnik",
    allWorkers: "Svi radnici",
    year: "Godina",
    month: "Mjesec",
    totalHours: "Ukupno sati",
    targetHours: "Norma sati",
    balance: "Razlika",
    sick: "Bolovanje",
    vacation: "Godišnji odmor",
    holiday: "Praznik",
    entries: "Unosi u mjesecu",
    download: "Preuzmi PDF",
    noEntries: "Nema unesenih sati za ovaj mjesec.",
    workdays: "radnih dana",
    workers: "radnika",
    days: "dana",
    activeStatus: "AKTIVAN",
    passiveStatus: "PASIVAN",
    addEntry: "Dodaj sate / odsustvo",
    work: "Rad",
    entryWorker: "Radnik",
    entryDate: "Datum",
    startTime: "Početak",
    endTime: "Kraj",
    pauseMinutes: "Pauza (min)",
    baustelle: "Baustelle",
    noBaustelle: "Bez Baustelle",
    saveEntry: "Sačuvaj unos",
    entrySaved: "Unos je sačuvan.",
    invalidTime: "Provjeri početak, kraj i pauzu.",
    vacationLimit: "Godišnji odmor je ograničen na 5 sedmica = 25 radnih dana godišnje.",
    vacationInfo: "Godišnji: 5 sedmica = 25 radnih dana",
    workerOwnOnly: "Radnik može pregledati i unositi samo svoje sate.",
    saving: "Spremanje...",
    addAbsence: "Dodaj godišnji / bolovanje / praznik",
    absenceType: "Vrsta",
    fromDate: "Od datuma",
    toDate: "Do datuma",
    saveAbsence: "Sačuvaj odsustvo",
    vacationRight: "Pravo godišnjeg",
    vacationUsedYear: "Iskorišteno u godini",
    vacationRestYear: "Ostatak u godini",
    selectWorker: "Odaberi radnika",
    selectType: "Odaberi vrstu",
    enterDate: "Odaberi datum",
    dateWrong: "Datum do ne može biti prije datuma od.",
    onlyAdmin: "Samo admin može dodati godišnji, bolovanje ili praznik.",
    onlyAdminDownload: "Samo admin može izvesti PDF.",
    absenceSaved: "Odsustvo je sačuvano.",
    date: "Datum", name: "Ime", start: "Početak", pause: "Pauza", end: "Kraj",
    total: "Ukupno", location: "Lokacija", type: "Tip",
  },

  de: {
    back: "Zurück zum Dashboard",
    title: "Arbeitszeitübersicht",
    loggedIn: "Angemeldet",
    worker: "Mitarbeiter",
    allWorkers: "Alle Mitarbeiter",
    year: "Jahr",
    month: "Monat",
    totalHours: "Gesamtstunden",
    targetHours: "Sollstunden",
    balance: "Differenz",
    sick: "Krankenstand",
    vacation: "Urlaub",
    holiday: "Feiertag",
    entries: "Einträge im Monat",
    download: "PDF herunterladen",
    noEntries: "Für diesen Monat sind keine Stunden eingetragen.",
    workdays: "Arbeitstage",
    workers: "Mitarbeiter",
    days: "Tage",
    activeStatus: "AKTIV",
    passiveStatus: "PASSIV",
    addEntry: "Stunden / Abwesenheit hinzufügen",
    work: "Arbeit",
    entryWorker: "Mitarbeiter",
    entryDate: "Datum",
    startTime: "Beginn",
    endTime: "Ende",
    pauseMinutes: "Pause (Min.)",
    baustelle: "Baustelle",
    noBaustelle: "Ohne Baustelle",
    saveEntry: "Eintrag speichern",
    entrySaved: "Eintrag wurde gespeichert.",
    invalidTime: "Bitte Beginn, Ende und Pause prüfen.",
    vacationLimit: "Der Urlaub ist auf 5 Wochen = 25 Arbeitstage pro Jahr begrenzt.",
    vacationInfo: "Urlaub: 5 Wochen = 25 Arbeitstage",
    workerOwnOnly: "Mitarbeiter können nur ihre eigenen Stunden sehen und eintragen.",
    saving: "Speichern...",
    addAbsence: "Urlaub / Krankenstand / Feiertag hinzufügen",
    absenceType: "Art",
    fromDate: "Von Datum",
    toDate: "Bis Datum",
    saveAbsence: "Abwesenheit speichern",
    vacationRight: "Urlaubsanspruch",
    vacationUsedYear: "Im Jahr verwendet",
    vacationRestYear: "Rest im Jahr",
    selectWorker: "Mitarbeiter auswählen",
    selectType: "Art auswählen",
    enterDate: "Datum auswählen",
    dateWrong: "Das Bis-Datum darf nicht vor dem Von-Datum liegen.",
    onlyAdmin: "Nur Admin kann Urlaub, Krankenstand oder Feiertage hinzufügen.",
    onlyAdminDownload: "Nur Admin kann PDF exportieren.",
    absenceSaved: "Abwesenheit wurde gespeichert.",
    date: "Datum", name: "Name", start: "Beginn", pause: "Pause", end: "Ende",
    total: "Gesamt", location: "Ort", type: "Art",
  },
  uz: {
    back: "Dashboardga qaytish",
    title: "Ish vaqti ko‘rinishi",
    loggedIn: "Kirilgan",
    worker: "Ishchi",
    allWorkers: "Barcha ishchilar",
    year: "Yil",
    month: "Oy",
    totalHours: "Jami soatlar",
    targetHours: "Me’yor soatlar",
    balance: "Farq",
    sick: "Kasallik ta’tili",
    vacation: "Ta’til",
    holiday: "Bayram kuni",
    entries: "Oydagi yozuvlar",
    download: "PDF yuklab olish",
    noEntries: "Bu oy uchun soatlar kiritilmagan.",
    workdays: "ish kuni",
    workers: "ishchi",
    days: "kun",
    activeStatus: "FAOL",
    passiveStatus: "NOFAOL",
    addEntry: "Soat / yo‘qlik qo‘shish",
    work: "Ish",
    entryWorker: "Ishchi",
    entryDate: "Sana",
    startTime: "Boshlanish",
    endTime: "Tugash",
    pauseMinutes: "Tanaffus (daq.)",
    baustelle: "Qurilish obyekti",
    noBaustelle: "Obyektsiz",
    saveEntry: "Yozuvni saqlash",
    entrySaved: "Yozuv saqlandi.",
    invalidTime: "Boshlanish, tugash va tanaffus vaqtini tekshiring.",
    vacationLimit: "Ta’til yiliga 5 hafta = 25 ish kuni bilan cheklangan.",
    vacationInfo: "Ta’til: 5 hafta = 25 ish kuni",
    workerOwnOnly: "Ishchi faqat o‘z soatlarini ko‘rishi va kiritishi mumkin.",
    saving: "Saqlanmoqda...",
    addAbsence: "Ta’til / kasallik / bayram qo‘shish",
    absenceType: "Turi",
    fromDate: "Boshlanish sanasi",
    toDate: "Tugash sanasi",
    saveAbsence: "Yo‘qlikni saqlash",
    vacationRight: "Ta’til huquqi",
    vacationUsedYear: "Yilda ishlatilgan",
    vacationRestYear: "Yillik qoldiq",
    selectWorker: "Ishchini tanlang",
    selectType: "Turini tanlang",
    enterDate: "Sanani tanlang",
    dateWrong: "Tugash sanasi boshlanish sanasidan oldin bo‘lishi mumkin emas.",
    onlyAdmin: "Faqat admin ta’til, kasallik yoki bayram kunini qo‘sha oladi.",
    onlyAdminDownload: "Faqat admin PDF eksport qila oladi.",
    absenceSaved: "Yo‘qlik saqlandi.",
    date: "Sana", name: "Ism", start: "Boshlanish", pause: "Tanaffus", end: "Tugash",
    total: "Jami", location: "Joy", type: "Turi",
  },
  cz: {
    back: "Zpět na Dashboard",
    title: "Přehled pracovní doby",
    loggedIn: "Přihlášen",
    worker: "Pracovník",
    allWorkers: "Všichni pracovníci",
    year: "Rok",
    month: "Měsíc",
    totalHours: "Celkem hodin",
    targetHours: "Fond pracovní doby",
    balance: "Rozdíl",
    sick: "Nemocenská",
    vacation: "Dovolená",
    holiday: "Svátek",
    entries: "Záznamy v měsíci",
    download: "Stáhnout PDF",
    noEntries: "Pro tento měsíc nejsou zadány žádné hodiny.",
    workdays: "pracovních dnů",
    workers: "pracovníků",
    days: "dnů",
    activeStatus: "AKTIVNÍ",
    passiveStatus: "NEAKTIVNÍ",
    addEntry: "Přidat hodiny / nepřítomnost",
    work: "Práce",
    entryWorker: "Pracovník",
    entryDate: "Datum",
    startTime: "Začátek",
    endTime: "Konec",
    pauseMinutes: "Přestávka (min)",
    baustelle: "Stavba",
    noBaustelle: "Bez stavby",
    saveEntry: "Uložit záznam",
    entrySaved: "Záznam byl uložen.",
    invalidTime: "Zkontrolujte začátek, konec a přestávku.",
    vacationLimit: "Dovolená je omezena na 5 týdnů = 25 pracovních dnů ročně.",
    vacationInfo: "Dovolená: 5 týdnů = 25 pracovních dnů",
    workerOwnOnly: "Pracovník může zobrazit a zadávat pouze své vlastní hodiny.",
    saving: "Ukládání...",
    addAbsence: "Přidat dovolenou / nemocenskou / svátek",
    absenceType: "Typ",
    fromDate: "Datum od",
    toDate: "Datum do",
    saveAbsence: "Uložit nepřítomnost",
    vacationRight: "Nárok na dovolenou",
    vacationUsedYear: "Vyčerpáno v roce",
    vacationRestYear: "Zbývá v roce",
    selectWorker: "Vyberte pracovníka",
    selectType: "Vyberte typ",
    enterDate: "Vyberte datum",
    dateWrong: "Datum do nesmí být před datem od.",
    onlyAdmin: "Pouze admin může přidat dovolenou, nemocenskou nebo svátek.",
    onlyAdminDownload: "Pouze admin může exportovat PDF.",
    absenceSaved: "Nepřítomnost byla uložena.",
    date: "Datum", name: "Jméno", start: "Začátek", pause: "Přestávka", end: "Konec",
    total: "Celkem", location: "Místo", type: "Typ",
  },
  en: {
    back: "Back to Dashboard",
    title: "Working hours overview",
    loggedIn: "Logged in",
    worker: "Worker",
    allWorkers: "All workers",
    year: "Year",
    month: "Month",
    totalHours: "Total hours",
    targetHours: "Target hours",
    balance: "Difference",
    sick: "Sick leave",
    vacation: "Vacation",
    holiday: "Public holiday",
    entries: "Entries in month",
    download: "Download PDF",
    noEntries: "No hours have been entered for this month.",
    workdays: "workdays",
    workers: "workers",
    days: "days",
    activeStatus: "ACTIVE",
    passiveStatus: "INACTIVE",
    addEntry: "Add hours / absence",
    work: "Work",
    entryWorker: "Worker",
    entryDate: "Date",
    startTime: "Start",
    endTime: "End",
    pauseMinutes: "Break (min)",
    baustelle: "Construction site",
    noBaustelle: "No construction site",
    saveEntry: "Save entry",
    entrySaved: "Entry was saved.",
    invalidTime: "Check start, end and break time.",
    vacationLimit: "Vacation is limited to 5 weeks = 25 working days per year.",
    vacationInfo: "Vacation: 5 weeks = 25 working days",
    workerOwnOnly: "Workers can view and enter only their own hours.",
    saving: "Saving...",
    addAbsence: "Add vacation / sick leave / public holiday",
    absenceType: "Type",
    fromDate: "From date",
    toDate: "To date",
    saveAbsence: "Save absence",
    vacationRight: "Vacation entitlement",
    vacationUsedYear: "Used this year",
    vacationRestYear: "Remaining this year",
    selectWorker: "Select worker",
    selectType: "Select type",
    enterDate: "Select date",
    dateWrong: "The to date cannot be before the from date.",
    onlyAdmin: "Only an admin can add vacation, sick leave or public holidays.",
    onlyAdminDownload: "Only an admin can export PDF.",
    absenceSaved: "Absence was saved.",
    date: "Date", name: "Name", start: "Start", pause: "Break", end: "End",
    total: "Total", location: "Location", type: "Type",
  },
};

const monthNames: any = {
  de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
  ba: ["Januar", "Februar", "Mart", "April", "Maj", "Juni", "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar"],
  uz: ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"],
  cz: ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

const germanMonthNames = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

const germanWeekdays = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

export default function PregledSatiPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const today = new Date().toISOString().split("T")[0];

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [workerName, setWorkerName] = useState("");
  const [selectedWorker, setSelectedWorker] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [unosi, setUnosi] = useState<any[]>([]);
  const [lang, setLang] = useState("ba");
  const [workerOptions, setWorkerOptions] = useState<WorkerOption[]>([]);
  const [activeWorkerNames, setActiveWorkerNames] = useState<string[]>([]);

  const [absenceWorker, setAbsenceWorker] = useState("");
  const [absenceType, setAbsenceType] = useState("RAD");
  const [absenceFrom, setAbsenceFrom] = useState(today);
  const [absenceTo, setAbsenceTo] = useState(today);
  const [entryStart, setEntryStart] = useState("08:00");
  const [entryEnd, setEntryEnd] = useState("17:00");
  const [entryPause, setEntryPause] = useState("30");
  const [entryBaustelleId, setEntryBaustelleId] = useState("");
  const [baustellen, setBaustellen] = useState<any[]>([]);
  const [savingEntry, setSavingEntry] = useState(false);
  const [godisnjiGodinaUnosi, setGodisnjiGodinaUnosi] = useState<any[]>([]);

  const t = translations[lang] || translations.ba;
  const months = monthNames[lang] || monthNames.ba;

  useEffect(() => {
    const name = localStorage.getItem("worker_name") || "";
    const savedLang = localStorage.getItem("lang") || "ba";
    const savedRole = (
      localStorage.getItem("worker_role") ||
      localStorage.getItem("role") ||
      ""
    ).toLowerCase();

    const adminStatus = savedRole === "admin" || ADMINI.includes(name);

    setLang(savedLang);
    setWorkerName(name);
    setIsAdmin(adminStatus);

    if (adminStatus) {
      setSelectedWorker("ALL");
    } else {
      setSelectedWorker(name);
      setAbsenceWorker(name);
    }

    loadWorkerLists(adminStatus);
    loadBaustellen();
  }, []);

  useEffect(() => {
    if (selectedWorker) {
      loadData();
      loadGodisnjiGodina();
    }
  }, [selectedWorker, year, month, workerOptions]);

  async function loadBaustellen() {
    try {
      const { data, error } = await supabase
        .from("baustellen")
        .select("id, naziv, lokacija")
        .order("naziv", { ascending: true });

      if (error) {
        console.error("Pregled sati - baustellen:", error.message);
        setBaustellen([]);
        return;
      }

      setBaustellen(data || []);
    } catch (error) {
      console.error("Pregled sati - baustellen:", error);
      setBaustellen([]);
    }
  }

  function getQueryNamesForWorker(name: string) {
    if (!name || name === "ALL") return [];

    const key = workerNameKey(name);

    const option = workerOptions.find(
      (item) =>
        workerNameKey(item.label) === key ||
        item.queryNames.some((queryName) => workerNameKey(queryName) === key)
    );

    return option?.queryNames?.length
      ? uniqueWorkerNames([option.label, ...option.queryNames])
      : [name];
  }

  async function loadWorkerLists(adminStatus: boolean) {
    let currentRows: any[] = [];

    // 1. Prvo probaj isti Admin API koji koristi Mitarbeiter stranica.
    try {
      const response = await fetch("/api/admin/workers", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && Array.isArray(result?.workers)) {
        currentRows = result.workers;
      }
    } catch (error) {
      console.error("Pregled sati - workers API:", error);
    }

    // 2. Fallback direktno na workers tabelu, isto kao Mitarbeiter stranica.
    if (currentRows.length === 0) {
      try {
        const { data, error } = await supabase
          .from("workers")
          .select("id, name, role, active")
          .order("name", { ascending: true });

        if (!error) {
          currentRows = data || [];
        } else {
          console.error("Pregled sati - workers tabela:", error.message);
        }
      } catch (error) {
        console.error("Pregled sati - workers tabela:", error);
      }
    }

    const currentWorkers = currentRows
      .map((row: any) => {
        const name = cleanWorkerName(row?.name);
        const role = String(row?.role || "worker").toLowerCase();

        return {
          name,
          role,
          active: row?.active !== false,
        };
      })
      .filter(
        (worker: any) =>
          worker.name &&
          worker.role !== "admin" &&
          !ADMINI.some(
            (adminName) =>
              workerNameKey(adminName) === workerNameKey(worker.name)
          )
      );

    // Aktivna imena koristimo samo za NOVO odsustvo i trenutnu normu.
    // Ne koristimo ih za filtriranje Pregleda sati.
    const activeNames = uniqueWorkerNames(
      currentWorkers
        .filter((worker: any) => worker.active)
        .map((worker: any) => worker.name)
    );

    // 3. Učitaj SVA historijska imena iz baustelle_hours.
    //    Radimo po 1000 redova da stari radnik ne nestane zbog API limita.
    const historicalNames: string[] = [];
    const pageSize = 1000;

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("baustelle_hours")
        .select("id, radnik")
        .not("radnik", "is", null)
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("Pregled sati - historijski radnici:", error.message);
        break;
      }

      const page = data || [];

      for (const row of page) {
        const name = cleanWorkerName((row as any)?.radnik);
        if (name) historicalNames.push(name);
      }

      if (page.length < pageSize) break;
    }

    // 4. U dropdown stavljamo SVE radnike:
    //    - trenutno aktivne
    //    - trenutno pasivne/deaktivirane
    //    - historijske radnike koji više ne postoje u workers tabeli,
    //      ali imaju stare zapise u baustelle_hours.
    const options: WorkerOption[] = currentWorkers.map((worker: any) => ({
      label: worker.name,
      queryNames: [worker.name],
      active: worker.active,
    }));

    // 5. Spoji stara kratka imena sa novim punim imenom kada pripadaju
    //    istoj osobi (npr. Arnes -> Arnes Abazi, Ramiz -> Ramiz Suvankulov).
    //    Ako historijsko ime više nema zapis u workers tabeli, ono ipak
    //    ostaje u Pregledu sati kao PASIVAN radnik.
    for (const historicalName of uniqueWorkerNames(historicalNames)) {
      const existing = options.find((option) =>
        namesBelongToSameWorker(option.label, historicalName)
      );

      if (existing) {
        existing.queryNames = uniqueWorkerNames([
          ...existing.queryNames,
          historicalName,
        ]);
      } else {
        options.push({
          label: historicalName,
          queryNames: [historicalName],
          active: false,
        });
      }
    }

    // Aktivni su prvi, zatim pasivni; unutar grupe abecedno.
    options.sort((a, b) => {
      if (a.active !== b.active) {
        return a.active ? -1 : 1;
      }

      return a.label.localeCompare(b.label, "de");
    });

    setWorkerOptions(options);
    setActiveWorkerNames(activeNames);

    if (adminStatus && options.length > 0) {
      setAbsenceWorker((current) => {
        const stillExists = options.some(
          (option) => workerNameKey(option.label) === workerNameKey(current)
        );

        return current && stillExists ? current : options[0].label;
      });
    }
  }

  async function loadData() {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = getNextMonthDate(year, month);

    let query = supabase
      .from("baustelle_hours")
      .select("*")
      .gte("datum", startDate)
      .lt("datum", endDate)
      .order("datum", { ascending: true });

    const effectiveWorker = isAdmin ? selectedWorker : workerName;

    if (effectiveWorker === "ALL" && isAdmin) {
      const allNames = uniqueWorkerNames(
        workerOptions.flatMap((worker) => [worker.label, ...worker.queryNames])
      );

      if (allNames.length > 0) {
        query = query.in("radnik", allNames);
      }
    } else {
      const queryNames = getQueryNamesForWorker(effectiveWorker);

      if (queryNames.length === 1) {
        query = query.eq("radnik", queryNames[0]);
      } else if (queryNames.length > 1) {
        query = query.in("radnik", queryNames);
      }
    }

    const { data: hoursData, error } = await query;

    if (error) {
      alert(error.message);
      return;
    }

    const baustelleIds = [
      ...new Set((hoursData || []).map((h: any) => h.baustelle_id)),
    ].filter(Boolean);

    let baustellenData: any[] = [];

    if (baustelleIds.length > 0) {
      const { data } = await supabase
        .from("baustellen")
        .select("id, naziv, lokacija")
        .in("id", baustelleIds);

      baustellenData = data || [];
    }

    const merged = (hoursData || []).map((h: any) => {
      const b = baustellenData.find(
        (x: any) => String(x.id) === String(h.baustelle_id)
      );

      return {
        ...h,
        baustelle_naziv: b?.naziv || "-",
        baustelle_lokacija: b?.lokacija || "-",
      };
    });

    setUnosi(merged);
  }

  async function loadGodisnjiGodina() {
    const startDate = `${year}-01-01`;
    const endDate = `${year + 1}-01-01`;

    let query = supabase
      .from("baustelle_hours")
      .select("*")
      .gte("datum", startDate)
      .lt("datum", endDate)
      .or("tip_unosa.eq.GODISNJI,tip_unosa.eq.GODIŠNJI");

    const effectiveWorker = isAdmin ? selectedWorker : workerName;

    if (effectiveWorker === "ALL" && isAdmin) {
      const allNames = uniqueWorkerNames(
        workerOptions.flatMap((worker) => [worker.label, ...worker.queryNames])
      );

      if (allNames.length > 0) {
        query = query.in("radnik", allNames);
      }
    } else {
      const queryNames = getQueryNamesForWorker(effectiveWorker);

      if (queryNames.length === 1) {
        query = query.eq("radnik", queryNames[0]);
      } else if (queryNames.length > 1) {
        query = query.in("radnik", queryNames);
      }
    }

    const { data, error } = await query;

    if (error) {
      setGodisnjiGodinaUnosi([]);
      return;
    }

    setGodisnjiGodinaUnosi(data || []);
  }

  function getNextMonthDate(y: number, m: number) {
    if (m === 12) return `${y + 1}-01-01`;
    return `${y}-${String(m + 1).padStart(2, "0")}-01`;
  }

  function getWorkdaysInMonth(y: number, m: number) {
    const daysInMonth = new Date(y, m, 0).getDate();
    let workdays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(y, m - 1, day);
      const weekDay = date.getDay();

      if (weekDay !== 0 && weekDay !== 6) {
        workdays++;
      }
    }

    return workdays;
  }

  function getDatesBetween(from: string, to: string) {
    const dates: string[] = [];
    const start = new Date(from);
    const end = new Date(to);
    const current = new Date(start);

    while (current <= end) {
      const day = current.getDay();

      if (day !== 0 && day !== 6) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, "0");
        const d = String(current.getDate()).padStart(2, "0");
        dates.push(`${y}-${m}-${d}`);
      }

      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  function isGodisnjiTip(tip: any) {
    const value = String(tip || "").toUpperCase();
    return value === "GODISNJI" || value === "GODIŠNJI";
  }

  function nazivTipa(tip: string) {
    if (isGodisnjiTip(tip)) return t.vacation;
    if (tip === "BOLOVANJE") return t.sick;
    if (tip === "PRAZNIK") return t.holiday;
    return "RAD";
  }

  async function saveEntry() {
    if (savingEntry) return;

    const targetWorker = isAdmin ? absenceWorker : workerName;

    if (!targetWorker) {
      alert(t.selectWorker);
      return;
    }

    if (!absenceType) {
      alert(t.selectType);
      return;
    }

    if (!absenceFrom) {
      alert(t.enterDate);
      return;
    }

    setSavingEntry(true);

    try {
      // RAD: jedan datum, početak/kraj/pauza i opcionalna Baustelle.
      if (absenceType === "RAD") {
        const startMinutes = parseTimeToMinutes(entryStart);
        const endMinutes = parseTimeToMinutes(entryEnd);
        const pauseMinutes = Number(entryPause || 0);

        if (
          startMinutes === null ||
          endMinutes === null ||
          endMinutes <= startMinutes ||
          Number.isNaN(pauseMinutes) ||
          pauseMinutes < 0
        ) {
          alert(t.invalidTime);
          return;
        }

        const netMinutes = endMinutes - startMinutes - pauseMinutes;

        if (netMinutes <= 0) {
          alert(t.invalidTime);
          return;
        }

        const totalHours = Math.round((netMinutes / 60) * 100) / 100;

        const { error } = await supabase.from("baustelle_hours").insert({
          baustelle_id: entryBaustelleId || null,
          room_id: null,
          radnik: targetWorker,
          datum: absenceFrom,
          tip_unosa: "RAD",
          pocetak: entryStart,
          kraj: entryEnd,
          pauza: pauseMinutes,
          ukupno_sati: totalHours,
          sati: totalHours,
          prekovremeni: Math.max(0, totalHours - SATI_PO_DANU),
          opis_posla: "RAD",
        });

        if (error) {
          alert(error.message);
          return;
        }

        alert(t.entrySaved);
        await loadData();
        await loadGodisnjiGodina();
        return;
      }

      // GODIŠNJI / BOLOVANJE / PRAZNIK: raspon radnih dana.
      if (!absenceTo) {
        alert(t.enterDate);
        return;
      }

      if (new Date(absenceTo) < new Date(absenceFrom)) {
        alert(t.dateWrong);
        return;
      }

      const dates = getDatesBetween(absenceFrom, absenceTo);

      if (dates.length === 0) {
        alert(t.enterDate);
        return;
      }

      let datesToInsert = dates;

      if (isGodisnjiTip(absenceType)) {
        const years = dates.map((date) => Number(date.slice(0, 4)));
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        const workerNames = getQueryNamesForWorker(targetWorker);

        let vacationQuery = supabase
          .from("baustelle_hours")
          .select("datum, radnik")
          .gte("datum", `${minYear}-01-01`)
          .lt("datum", `${maxYear + 1}-01-01`)
          .or("tip_unosa.eq.GODISNJI,tip_unosa.eq.GODIŠNJI");

        if (workerNames.length === 1) {
          vacationQuery = vacationQuery.eq("radnik", workerNames[0]);
        } else {
          vacationQuery = vacationQuery.in("radnik", workerNames);
        }

        const { data: existingVacation, error: existingVacationError } =
          await vacationQuery;

        if (existingVacationError) {
          alert(existingVacationError.message);
          return;
        }

        const existingDates = new Set(
          (existingVacation || []).map((item: any) => String(item.datum))
        );

        datesToInsert = dates.filter((datum) => !existingDates.has(datum));

        // 5 sedmica = 25 radnih dana godišnje po radniku.
        for (let y = minYear; y <= maxYear; y++) {
          const existingInYear = new Set(
            Array.from(existingDates).filter((datum) =>
              String(datum).startsWith(`${y}-`)
            )
          ).size;

          const newInYear = datesToInsert.filter((datum) =>
            datum.startsWith(`${y}-`)
          ).length;

          if (existingInYear + newInYear > GODISNJI_DANI_PO_RADNIKU) {
            alert(t.vacationLimit);
            return;
          }
        }
      }

      if (datesToInsert.length === 0) {
        alert(t.entrySaved);
        await loadData();
        await loadGodisnjiGodina();
        return;
      }

      const satiZaDan = isGodisnjiTip(absenceType)
        ? SATI_GODISNJEG_PO_DANU
        : SATI_PO_DANU;

      const inserts = datesToInsert.map((datum) => ({
        baustelle_id: null,
        room_id: null,
        radnik: targetWorker,
        datum,
        tip_unosa: absenceType,
        pocetak: null,
        kraj: null,
        pauza: 0,
        ukupno_sati: satiZaDan,
        sati: satiZaDan,
        prekovremeni: 0,
        opis_posla: nazivTipa(absenceType),
      }));

      const { error } = await supabase.from("baustelle_hours").insert(inserts);

      if (error) {
        alert(error.message);
        return;
      }

      alert(t.entrySaved);
      await loadData();
      await loadGodisnjiGodina();
    } finally {
      setSavingEntry(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function getGermanWeekday(dateString: string) {
    const date = new Date(dateString);
    return germanWeekdays[date.getDay()] || "-";
  }

  function safeText(value: any) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getLocationText(u: any) {
    if (u.baustelle_lokacija && u.baustelle_lokacija !== "-") {
      return u.baustelle_lokacija;
    }

    if (u.baustelle_naziv && u.baustelle_naziv !== "-") {
      return u.baustelle_naziv;
    }

    return "-";
  }

  function getStoragePublicUrl(fileName: string) {
    const url = supabase.storage.from(PDF_BUCKET).getPublicUrl(fileName).data
      .publicUrl;

    return `${url}?v=${Date.now()}`;
  }

  function parseTimeToMinutes(value: any) {
    if (!value || value === "-") return null;

    const parts = String(value).split(":");
    if (parts.length < 2) return null;

    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    return hours * 60 + minutes;
  }

  function minutesToTime(minutes: number | null) {
    if (minutes === null) return "-";

    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function buildPdfRows() {
    const grouped: { [key: string]: any } = {};

    for (const u of unosi) {
      const key = `${u.datum}__${u.radnik || ""}`;
      const isVacation = isGodisnjiTip(u.tip_unosa);
      const startMinutes = isVacation ? null : parseTimeToMinutes(u.pocetak);
      const endMinutes = isVacation ? null : parseTimeToMinutes(u.kraj);
      const pause = isVacation ? 0 : Number(u.pauza || 0);
      const hours = isVacation
        ? SATI_GODISNJEG_PO_DANU
        : Number(u.ukupno_sati || u.sati || 0);
      const location = isVacation ? "-" : getLocationText(u);

      if (!grouped[key]) {
        grouped[key] = {
          datum: u.datum,
          radnik: u.radnik || "",
          startMinutes,
          endMinutes,
          pause,
          hours,
          locations: location && location !== "-" ? [location] : [],
          hasVacation: isVacation,
        };
        continue;
      }

      // Ako za isti dan postoji godišnji, on vrijedi tačno 8 h.
      // Dupli GODISNJI/GODIŠNJI zapisi se ne zbrajaju.
      if (isVacation) {
        grouped[key].startMinutes = null;
        grouped[key].endMinutes = null;
        grouped[key].pause = 0;
        grouped[key].hours = SATI_GODISNJEG_PO_DANU;
        grouped[key].locations = [];
        grouped[key].hasVacation = true;
        continue;
      }

      // Ako je godišnji već pronađen za taj dan, ne dodaj druge zapise na njega.
      if (grouped[key].hasVacation) {
        continue;
      }

      if (
        startMinutes !== null &&
        (grouped[key].startMinutes === null ||
          startMinutes < grouped[key].startMinutes)
      ) {
        grouped[key].startMinutes = startMinutes;
      }

      if (
        endMinutes !== null &&
        (grouped[key].endMinutes === null ||
          endMinutes > grouped[key].endMinutes)
      ) {
        grouped[key].endMinutes = endMinutes;
      }

      grouped[key].pause = Math.max(Number(grouped[key].pause || 0), pause);
      grouped[key].hours += hours;

      if (
        location &&
        location !== "-" &&
        !grouped[key].locations.includes(location)
      ) {
        grouped[key].locations.push(location);
      }
    }

    return Object.values(grouped).sort((a: any, b: any) => {
      if (a.datum !== b.datum) {
        return String(a.datum).localeCompare(String(b.datum));
      }

      return String(a.radnik).localeCompare(String(b.radnik));
    });
  }

  function downloadPDF() {
    if (!isAdmin && selectedWorker !== workerName) {
      alert(t.workerOwnOnly);
      return;
    }

    const logoTopUrl = getStoragePublicUrl(PDF_LOGO_TOP);
    const sideImageUrl = getStoragePublicUrl(PDF_SIDE_IMAGE);
    const mountainBgUrl = getStoragePublicUrl(PDF_MOUNTAIN_BG);

    const workerLabel =
      selectedWorker === "ALL" ? "Alle Mitarbeiter" : selectedWorker || workerName;

    const monthLabel = germanMonthNames[month - 1];
    const pdfRows = buildPdfRows();

    const rowsHtml = pdfRows
      .map((u: any) => {
        const locationText =
          u.locations && u.locations.length > 0 ? u.locations.join(" / ") : "-";

        return `
          <tr>
            <td>${safeText(formatDate(u.datum))}</td>
            <td>${safeText(getGermanWeekday(u.datum))}</td>
            <td>${safeText(u.radnik || "")}</td>
            <td>${safeText(minutesToTime(u.startMinutes))}</td>
            <td>${safeText(String(u.pause ?? "0"))}</td>
            <td>${safeText(minutesToTime(u.endMinutes))}</td>
            <td class="hours-cell">${Number(u.hours || 0).toFixed(1)} h</td>
            <td>${safeText(locationText)}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Arbeitszeitübersicht - ${safeText(workerLabel)} - ${safeText(
      monthLabel
    )} ${year}</title>

          <style>
            @page {
              size: A4 portrait;
              margin: 8mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              background: #ffffff;
              color: #111111;
              font-family: Arial, Helvetica, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .page {
              width: 100%;
              min-height: 100vh;
              position: relative;
              overflow: hidden;
              background: #ffffff;
            }

            .side-strip {
              position: absolute;
              left: 0;
              top: 0;
              bottom: 0;
              width: 38px;
              overflow: hidden;
              background: #111111;
            }

            .side-strip img {
              width: 38px;
              height: 100%;
              object-fit: cover;
              object-position: center;
              display: block;
            }

            .side-fallback {
              display: none;
              position: absolute;
              left: 50%;
              top: 50%;
              transform: translate(-50%, -50%) rotate(-90deg);
              transform-origin: center;
              white-space: nowrap;
              color: #ffffff;
              font-family: Georgia, "Times New Roman", serif;
              font-size: 20px;
              letter-spacing: 1px;
            }

            .side-fallback .b {
              color: #e95b16;
              font-weight: bold;
              font-size: 29px;
            }

            .content {
              margin-left: 46px;
              position: relative;
              z-index: 2;
            }

            .header {
              height: 108px;
              position: relative;
              overflow: hidden;
              border-bottom: 2px solid #e95b16;
              margin-bottom: 7px;
              background: #ffffff;
            }

            .mountain-bg {
              position: absolute;
              left: 185px;
              right: 0;
              top: 0;
              height: 108px;
              z-index: 1;
              opacity: 1;
            }

            .mountain-bg img {
              width: 100%;
              height: 108px;
              object-fit: cover;
              object-position: center top;
              display: block;
            }

            .mountain-bg::after {
              content: "";
              position: absolute;
              left: 0;
              right: 0;
              top: 0;
              bottom: 0;
              background: linear-gradient(90deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.55) 40%, rgba(255,255,255,0.18) 100%);
            }

            .logo-box {
              position: absolute;
              left: 0;
              top: 15px;
              width: 285px;
              height: 58px;
              z-index: 3;
            }

            .logo-box img {
              width: 100%;
              height: 58px;
              object-fit: contain;
              object-position: left center;
              display: block;
            }

            .logo-fallback {
              display: none;
              width: 285px;
              height: 58px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.12);
            }

            .brand-top {
              height: 33px;
              background: #e95b16;
              color: #ffffff;
              padding: 7px 10px 0 10px;
              font-size: 17px;
              line-height: 1;
              font-weight: 900;
              letter-spacing: 0.3px;
              text-transform: uppercase;
              position: relative;
            }

            .brand-top small {
              position: absolute;
              right: 10px;
              bottom: 5px;
              font-size: 7px;
              font-weight: 900;
            }

            .brand-bottom {
              height: 25px;
              background: #111111;
              color: #ffffff;
              padding: 6px 10px 0 10px;
              font-size: 10px;
              line-height: 1;
              font-weight: 900;
              letter-spacing: 0.35px;
              text-transform: uppercase;
            }

            .title-box {
              position: absolute;
              right: 0;
              top: 23px;
              text-align: right;
              z-index: 3;
            }

            .title-box h1 {
              margin: 0;
              color: #111111;
              font-size: 22px;
              line-height: 1;
              font-weight: 900;
              letter-spacing: 0.45px;
              text-transform: uppercase;
            }

            .title-box p {
              margin: 8px 0 0 0;
              color: #111111;
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.45px;
              border-bottom: 2px solid #e95b16;
              padding-bottom: 5px;
              display: inline-block;
            }

            .summary-grid {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 5px;
              margin-bottom: 7px;
            }

            .summary-box {
              border: 1px solid #d8d8d8;
              border-radius: 4px;
              background: rgba(255,255,255,0.98);
              padding: 5px 6px;
              min-height: 34px;
              border-bottom: 2px solid #e95b16;
            }

            .summary-label {
              color: #333333;
              font-size: 7px;
              line-height: 1;
              text-transform: uppercase;
              font-weight: 900;
              letter-spacing: 0.3px;
              margin-bottom: 5px;
            }

            .summary-value {
              color: #111111;
              font-size: 12.5px;
              line-height: 1;
              font-weight: 900;
            }

            .negative {
              color: #e95b16;
            }

            .positive {
              color: #047857;
            }

            .table-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin: 5px 0 4px 0;
            }

            .table-header h2 {
              margin: 0;
              color: #111111;
              font-size: 10.5px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.35px;
            }

            .period {
              color: #555555;
              font-size: 7.8px;
              font-weight: 700;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              border: 1px solid #d9d9d9;
            }

            th {
              background: #111111;
              color: #ffffff;
              padding: 5px 4px;
              font-size: 7.8px;
              line-height: 1.1;
              text-align: left;
              border-right: 1px solid #333333;
              border-bottom: 3px solid #e95b16;
              text-transform: uppercase;
              letter-spacing: 0.15px;
              font-weight: 900;
            }

            td {
              padding: 4.5px 4px;
              font-size: 8.5px;
              line-height: 1.18;
              border-right: 1px solid #e2e2e2;
              border-bottom: 1px solid #e4e4e4;
              vertical-align: middle;
              word-wrap: break-word;
            }

            tbody tr:nth-child(even) td {
              background: #f7f7f7;
            }

            tbody tr:nth-child(odd) td {
              background: #ffffff;
            }

            .hours-cell {
              font-weight: 900;
              color: #111111;
            }

            .footer {
              margin-top: 8px;
              border-top: 2px solid #111111;
              padding-top: 5px;
              display: flex;
              justify-content: space-between;
              color: #111111;
              font-size: 7.8px;
              line-height: 1.3;
              font-weight: 700;
            }

            .footer strong {
              color: #e95b16;
              font-weight: 900;
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>

        <body>
          <div class="page">
            <div class="side-strip">
              <img
                src="${safeText(sideImageUrl)}"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
              />
              <div class="side-fallback">Stone<span class="b">B</span>outique</div>
            </div>

            <div class="content">
              <div class="header">
                <div class="mountain-bg">
                  <img src="${safeText(mountainBgUrl)}" />
                </div>

                <div class="logo-box">
                  <img
                    src="${safeText(logoTopUrl)}"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                  />
                  <div class="logo-fallback">
                    <div class="brand-top">
                      NOCKER & BERNARDI
                      <small>GmbH</small>
                    </div>
                    <div class="brand-bottom">FLIESEN & NATURSTEIN VERKAUF</div>
                  </div>
                </div>

                <div class="title-box">
                  <h1>Arbeitszeitübersicht</h1>
                  <p>Monatlicher Auszug der Arbeitszeiten</p>
                </div>
              </div>

              <div class="summary-grid">
                <div class="summary-box">
                  <div class="summary-label">Mitarbeiter</div>
                  <div class="summary-value">${safeText(workerLabel)}</div>
                </div>

                <div class="summary-box">
                  <div class="summary-label">Monat / Jahr</div>
                  <div class="summary-value">${safeText(monthLabel)} ${year}</div>
                </div>

                <div class="summary-box">
                  <div class="summary-label">Fond Arbeitszeiten</div>
                  <div class="summary-value">${normaSati.toFixed(1)} h</div>
                </div>

                <div class="summary-box">
                  <div class="summary-label">Geleistete Stunden</div>
                  <div class="summary-value">${ukupnoSati.toFixed(1)} h</div>
                </div>

                <div class="summary-box">
                  <div class="summary-label">Differenz</div>
                  <div class="summary-value ${
                    saldo >= 0 ? "positive" : "negative"
                  }">${saldo >= 0 ? "+" : ""}${saldo.toFixed(1)} h</div>
                </div>
              </div>

              <div class="table-header">
                <h2>Detailübersicht Arbeitszeiten</h2>
                <div class="period">${safeText(workerLabel)} · ${safeText(
      monthLabel
    )} ${year}</div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th style="width: 12%;">Datum</th>
                    <th style="width: 13%;">Wochentag</th>
                    <th style="width: 14%;">Mitarbeiter</th>
                    <th style="width: 12%;">Arbeitsbeginn</th>
                    <th style="width: 10%;">Pausenzeit</th>
                    <th style="width: 12%;">Arbeitsende</th>
                    <th style="width: 12%;">Arbeitsdauer</th>
                    <th style="width: 15%;">Lokacija</th>
                  </tr>
                </thead>

                <tbody>
                  ${
                    rowsHtml ||
                    `<tr><td colspan="8" style="text-align:center; padding:20px;">Für diesen Monat sind keine Arbeitszeiten eingetragen.</td></tr>`
                  }
                </tbody>
              </table>

              <div class="footer">
                <div>
                  <strong>NOCKER & BERNARDI GmbH</strong><br />
                  Fliesen & Naturstein Verkauf
                </div>

                <div style="text-align:right;">
                  Inweg 3<br />
                  A-6170 Zirl
                </div>
              </div>
            </div>
          </div>

          <script>
            function printWhenReady() {
              const images = Array.from(document.images);
              if (images.length === 0) {
                window.print();
                return;
              }

              let done = 0;
              const finish = function() {
                done++;
                if (done >= images.length) {
                  setTimeout(function() {
                    window.print();
                  }, 300);
                }
              };

              images.forEach(function(img) {
                if (img.complete) {
                  finish();
                } else {
                  img.onload = finish;
                  img.onerror = finish;
                }
              });

              setTimeout(function() {
                window.print();
              }, 2500);
            }

            window.onload = printWhenReady;
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Browser je blokirao otvaranje PDF prozora.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  const godisnjiKljuceviUMjesecu = new Set(
    unosi
      .filter((item) => isGodisnjiTip(item.tip_unosa))
      .map((item) => `${item.radnik || ""}__${item.datum}`)
  );

  const regularniSati = unosi
    .filter((item) => !isGodisnjiTip(item.tip_unosa))
    .reduce(
      (sum, item) => sum + Number(item.ukupno_sati || item.sati || 0),
      0
    );

  // Svaki jedinstveni dan godišnjeg vrijedi tačno 8 h,
  // bez obzira na stare vrijednosti ili duple zapise u bazi.
  const ukupnoSati =
    regularniSati + godisnjiKljuceviUMjesecu.size * SATI_GODISNJEG_PO_DANU;

  const bolovanjeDani = unosi.filter(
    (item) => item.tip_unosa === "BOLOVANJE"
  ).length;

  const godisnjiDani = godisnjiKljuceviUMjesecu.size;

  const praznikDani = unosi.filter(
    (item) => item.tip_unosa === "PRAZNIK"
  ).length;

  const radniDani = getWorkdaysInMonth(year, month);
  const brojAktivnihRadnika = activeWorkerNames.length;
  const brojRadnikaZaNormu =
    selectedWorker === "ALL" ? brojAktivnihRadnika : 1;
  const normaSati = radniDani * SATI_PO_DANU * brojRadnikaZaNormu;
  const saldo = ukupnoSati - normaSati;

  const brojSvihRadnika = workerOptions.length;

  const godisnjiPravoDani =
    selectedWorker === "ALL"
      ? GODISNJI_DANI_PO_RADNIKU * brojSvihRadnika
      : GODISNJI_DANI_PO_RADNIKU;

  const godisnjiIskoristenoGodina = new Set(
    godisnjiGodinaUnosi.map(
      (item: any) => `${item.radnik || ""}__${item.datum}`
    )
  ).size;
  const godisnjiOstatakGodina = godisnjiPravoDani - godisnjiIskoristenoGodina;

  return (
    <main style={mainStyle}>
      <Link href="/dashboard" style={backLinkStyle}>
        ← {t.back}
      </Link>

      <h1 style={titleStyle}>{t.title}</h1>

      <p style={{ color: "#aaa", marginBottom: "30px" }}>
        {t.loggedIn}: {workerName}
      </p>

      <div style={filterBoxStyle}>
        <div>
          <label>{t.worker}</label>
          <select
            value={selectedWorker}
            onChange={(e) => setSelectedWorker(e.target.value)}
            style={selectStyle}
            disabled={!isAdmin}
          >
            {isAdmin && <option value="ALL">{t.allWorkers}</option>}
            {isAdmin ? (
              workerOptions.map((worker) => (
                <option key={worker.label} value={worker.label}>
                  {worker.label} — {worker.active ? t.activeStatus : t.passiveStatus}
                </option>
              ))
            ) : (
              <option value={workerName}>{workerName}</option>
            )}
          </select>
        </div>

        <div>
          <label>{t.year}</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={selectStyle}
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
            <option value={2028}>2028</option>
          </select>
        </div>

        <div>
          <label>{t.month}</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            style={selectStyle}
          >
            {months.map((m: string, index: number) => (
              <option key={m} value={index + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={absenceBoxStyle}>
        <h2 style={{ marginTop: 0 }}>+ {t.addEntry}</h2>

        <p style={{ color: "#aaa", marginTop: "-5px", marginBottom: "18px" }}>
          {t.vacationInfo}
          {!isAdmin ? ` · ${t.workerOwnOnly}` : ""}
        </p>

        <div style={absenceGridStyle}>
          <div>
            <label>{t.entryWorker}</label>

            {isAdmin ? (
              <select
                value={absenceWorker}
                onChange={(e) => setAbsenceWorker(e.target.value)}
                style={selectStyle}
              >
                <option value="">{t.selectWorker}</option>

                {workerOptions.map((worker) => (
                  <option key={worker.label} value={worker.label}>
                    {worker.label} —{" "}
                    {worker.active ? t.activeStatus : t.passiveStatus}
                  </option>
                ))}
              </select>
            ) : (
              <select value={workerName} style={selectStyle} disabled>
                <option value={workerName}>{workerName}</option>
              </select>
            )}
          </div>

          <div>
            <label>{t.absenceType}</label>
            <select
              value={absenceType}
              onChange={(e) => setAbsenceType(e.target.value)}
              style={selectStyle}
            >
              <option value="RAD">{t.work}</option>
              <option value="PRAZNIK">{t.holiday}</option>
              <option value="BOLOVANJE">{t.sick}</option>
              <option value="GODISNJI">{t.vacation}</option>
            </select>
          </div>

          <div>
            <label>
              {absenceType === "RAD" ? t.entryDate : t.fromDate}
            </label>
            <input
              type="date"
              value={absenceFrom}
              onChange={(e) => {
                setAbsenceFrom(e.target.value);
                if (absenceType === "RAD") {
                  setAbsenceTo(e.target.value);
                }
              }}
              style={selectStyle}
            />
          </div>

          {absenceType !== "RAD" && (
            <div>
              <label>{t.toDate}</label>
              <input
                type="date"
                value={absenceTo}
                onChange={(e) => setAbsenceTo(e.target.value)}
                style={selectStyle}
              />
            </div>
          )}

          {absenceType === "RAD" && (
            <>
              <div>
                <label>{t.startTime}</label>
                <input
                  type="time"
                  value={entryStart}
                  onChange={(e) => setEntryStart(e.target.value)}
                  style={selectStyle}
                />
              </div>

              <div>
                <label>{t.pauseMinutes}</label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={entryPause}
                  onChange={(e) => setEntryPause(e.target.value)}
                  style={selectStyle}
                />
              </div>

              <div>
                <label>{t.endTime}</label>
                <input
                  type="time"
                  value={entryEnd}
                  onChange={(e) => setEntryEnd(e.target.value)}
                  style={selectStyle}
                />
              </div>

              <div>
                <label>{t.baustelle}</label>
                <select
                  value={entryBaustelleId}
                  onChange={(e) => setEntryBaustelleId(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">{t.noBaustelle}</option>

                  {baustellen.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.naziv || b.lokacija || b.id}
                      {b.lokacija && b.naziv ? ` — ${b.lokacija}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        <button
          onClick={saveEntry}
          style={{
            ...absenceButtonStyle,
            opacity: savingEntry ? 0.6 : 1,
            cursor: savingEntry ? "default" : "pointer",
          }}
          disabled={savingEntry}
        >
          {savingEntry ? t.saving : t.saveEntry}
        </button>
      </div>

      <div style={summaryGridStyle}>
        <div style={summaryBoxStyle}>
          <p>{t.totalHours}</p>
          <h2>{ukupnoSati.toFixed(1)} h</h2>
        </div>

        <div style={summaryBoxStyle}>
          <p>{t.targetHours}</p>
          <h2>{normaSati.toFixed(1)} h</h2>
          <small>
            {radniDani} {t.workdays} × 8.5 h
            {selectedWorker === "ALL"
              ? ` × ${brojAktivnihRadnika} ${t.workers}`
              : ""}
          </small>
        </div>

        <div style={summaryBoxStyle}>
          <p>{t.balance}</p>
          <h2 style={{ color: saldo >= 0 ? "#22c55e" : "#ef4444" }}>
            {saldo >= 0 ? "+" : ""}
            {saldo.toFixed(1)} h
          </h2>
        </div>

        <div style={summaryBoxStyle}>
          <p>{t.sick}</p>
          <h2>
            {bolovanjeDani} {t.days}
          </h2>
        </div>

        <div style={summaryBoxStyle}>
          <p>{t.vacation}</p>
          <h2>
            {godisnjiDani} {t.days}
          </h2>
        </div>

        <div style={summaryBoxStyle}>
          <p>{t.holiday}</p>
          <h2>
            {praznikDani} {t.days}
          </h2>
        </div>

        <div style={summaryBoxStyle}>
          <p>{t.vacationRight}</p>
          <h2>
            {godisnjiPravoDani} {t.days}
          </h2>
        </div>

        <div style={summaryBoxStyle}>
          <p>{t.vacationUsedYear}</p>
          <h2>
            {godisnjiIskoristenoGodina} {t.days}
          </h2>
        </div>

        <div style={summaryBoxStyle}>
          <p>{t.vacationRestYear}</p>
          <h2
            style={{
              color: godisnjiOstatakGodina >= 0 ? "#22c55e" : "#ef4444",
            }}
          >
            {godisnjiOstatakGodina} {t.days}
          </h2>
        </div>
      </div>

      <div style={listBoxStyle}>
        <div style={listHeaderStyle}>
          <h2>{t.entries}</h2>

          <button onClick={downloadPDF} style={downloadButtonStyle}>
            {t.download}
          </button>
        </div>

        {unosi.length === 0 && <p style={{ color: "#999" }}>{t.noEntries}</p>}

        {unosi.length > 0 && (
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{t.date}</th>
                  <th style={thStyle}>{t.name}</th>
                  <th style={thStyle}>{t.start}</th>
                  <th style={thStyle}>{t.pause}</th>
                  <th style={thStyle}>{t.end}</th>
                  <th style={thStyle}>{t.total}</th>
                  <th style={thStyle}>{t.location}</th>
                  <th style={thStyle}>{t.type}</th>
                </tr>
              </thead>

              <tbody>
                {unosi.map((u) => (
                  <tr key={u.id} style={trStyle}>
                    <td style={tdStyle}>{formatDate(u.datum)}</td>
                    <td style={tdStyle}>
                      <strong>{u.radnik}</strong>
                    </td>
                    <td style={tdStyle}>{u.pocetak || "-"}</td>
                    <td style={tdStyle}>{u.pauza ?? "0"}</td>
                    <td style={tdStyle}>{u.kraj || "-"}</td>
                    <td style={tdStrongStyle}>
                      {Number(u.ukupno_sati || u.sati || 0).toFixed(1)} h
                    </td>
                    <td style={tdStyle}>{getLocationText(u)}</td>
                    <td style={tdStyle}>{u.tip_unosa || "RAD"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

const mainStyle: any = {
  background: "#000",
  minHeight: "100vh",
  color: "white",
  padding: "40px",
};

const backLinkStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
};

const titleStyle: any = {
  fontSize: "56px",
  fontWeight: "bold",
  marginTop: "25px",
  marginBottom: "10px",
};

const filterBoxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "20px",
  marginBottom: "30px",
};

const absenceBoxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  marginBottom: "30px",
  border: "1px solid #333",
};

const absenceGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "20px",
  marginBottom: "20px",
};

const selectStyle: any = {
  width: "100%",
  padding: "15px",
  marginTop: "8px",
  borderRadius: "12px",
  border: "none",
  background: "#222",
  color: "white",
  fontSize: "18px",
};

const absenceButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "14px 24px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const summaryGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "20px",
  marginBottom: "30px",
};

const summaryBoxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
};

const listBoxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
};

const listHeaderStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  marginBottom: "20px",
};

const downloadButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px 20px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const tableWrapperStyle: any = {
  width: "100%",
  overflowX: "auto",
};

const tableStyle: any = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "900px",
};

const thStyle: any = {
  background: "#000",
  color: "#fff",
  padding: "14px",
  textAlign: "left",
  borderBottom: "1px solid #333",
  fontSize: "15px",
};

const trStyle: any = {
  borderBottom: "1px solid #333",
};

const tdStyle: any = {
  padding: "14px",
  color: "#ddd",
  fontSize: "15px",
};

const tdStrongStyle: any = {
  padding: "14px",
  color: "#fff",
  fontSize: "15px",
  fontWeight: "bold",
};