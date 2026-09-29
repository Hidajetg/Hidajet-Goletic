import { useEffect, useRef, useState, type CSSProperties, type ChangeEvent } from "react";
import { supabase } from "./lib/supabase";

const LOGO_URL =
  "https://axpfymarrqjebpwosidr.supabase.co/storage/v1/object/public/pdf-assets/logo.png";

const BACKGROUND_URL =
  "https://axpfymarrqjebpwosidr.supabase.co/storage/v1/object/public/pdf-assets/pozadina.png";

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || "https://hidajet-goletic-frno.vercel.app"
)
  .trim()
  .replace(/\/+$/, "");

const FALLBACK_WORKERS: Worker[] = [
  { id: "6", name: "Hido", role: "admin", active: true },
  { id: "7", name: "Steffi", role: "admin", active: true },
  { id: "1", name: "Arnes", role: "worker", active: true },
  { id: "2", name: "Ramiz", role: "worker", active: true },
  { id: "4", name: "Shohruh", role: "worker", active: true },
];

type Worker = {
  id: number | string;
  name: string;
  role: string;
  active?: boolean;
  auth_user_id?: string | null;
};

type Baustelle = {
  id: number | string;
  [key: string]: any;
};

type Room = {
  id: number | string;
  baustelle_id?: number | string;
  naziv?: string | null;
  name?: string | null;
  [key: string]: any;
};

type BaustelleInfo = {
  id?: number | string;
  baustelle_id?: number | string;
  type?: string | null;
  title_de?: string | null;
  title_bs?: string | null;
  title_uz?: string | null;
  title_en?: string | null;
  note_de?: string | null;
  note_bs?: string | null;
  note_uz?: string | null;
  note_en?: string | null;
  google_maps_url?: string | null;
  visualization_url?: string | null;
  [key: string]: any;
};

type AppScreen =
  | "dashboard"
  | "baustellen"
  | "baustelle-detail"
  | "room-detail"
  | "room-material"
  | "room-hours"
  | "room-photos"
  | "room-productivity";

type ErrorDetails = {
  message?: string;
  status?: number;
  code?: string;
  name?: string;
};

type MobileLanguage = "DE" | "BA" | "UZ" | "CZ" | "EN";

const mobileTranslations: Record<MobileLanguage, Record<string, string>> = {
  DE: {
    unknownConnection: "Unbekannter Verbindungsfehler.",
    message: "Nachricht", status: "Status", code: "Code", errorName: "Name",
    sitePrefix: "Baustelle", noAddress: "Keine Adresse eingetragen",
    workerLoadError: "Die Anmeldung war erfolgreich, aber der Mitarbeiter konnte nicht aus der Tabelle workers geladen werden.",
    noLinkedWorker: "Die Anmeldung war erfolgreich, aber dieser Supabase-Benutzer ist keinem Mitarbeiter in der Tabelle workers zugeordnet.",
    accountDisabled: "Dieses Benutzerkonto ist deaktiviert.",
    checkLoginError: "Fehler bei der Prüfung der Anmeldung.",
    enterEmail: "E-Mail-Adresse eingeben.", enterPassword: "Passwort eingeben.",
    supabaseLoginFailed: "Supabase-Anmeldung fehlgeschlagen.",
    noUserReturned: "Supabase hat keinen Fehler gemeldet, aber keinen Benutzer zurückgegeben.",
    unexpectedError: "Ein unerwarteter Fehler ist aufgetreten.",
    supabaseError: "Supabase-Fehler", unexpectedAlert: "Unerwarteter Fehler",
    sitesLoadError: "Baustellen konnten nicht geladen werden.",
    nextStep: "wird im nächsten Schritt verbunden.",
    appLoading: "Anwendung wird geladen...", system: "Baustellen Management System",
    secureLogin: "Sichere mobile Anmeldung", workerLabel: "Mitarbeiter", pinLabel: "PIN", pinPlaceholder: "PIN eingeben", chooseWorker: "Bitte Mitarbeiter auswählen.", pinRule: "PIN muss aus 4 bis 8 Zahlen bestehen.", loginFailed: "Name oder PIN ist falsch.", remember: "Login speichern", rememberHint: "Auf diesem Gerät angemeldet bleiben", apiMissing: "Mobile API-Adresse fehlt.", email: "E-Mail-Adresse",
    emailPlaceholder: "E-Mail-Adresse eingeben", password: "Passwort",
    passwordPlaceholder: "Passwort eingeben", loggingIn: "ANMELDUNG...", login: "SICHER ANMELDEN",
    welcome: "Willkommen", back: "Zurück", site: "Baustellen", loading: "Wird geladen...",
    noActiveSites: "Aktuell gibt es keine aktiven Baustellen.", siteDetails: "Baustelle", locationLabel: "Ort", statusLabel: "Status", roomsLabel: "Räume", noRooms: "Keine Räume vorhanden.", siteInfoLabel: "Baustellen-Info", noSiteInfo: "Keine Informationen eingetragen.", loadSiteDetailsError: "Baustelle konnte nicht geladen werden.", roomDetails: "Raum", loadRoomError: "Raum konnte nicht geladen werden.", material: "Material", workHours: "Arbeitsstunden", photos: "Fotos", productivity: "Produktivität", openMaps: "Google Maps öffnen", open3d: "3D Ansicht öffnen", myProjects: "Meine Projekte",
    projects: "Projekte", hours: "Stunden", calendar: "Kalender", cars: "Autos",
    info: "Info", messages: "Nachrichten", privateNote: "Private Notiz",
    orderMaterial: "Material bestellen", logout: "Abmelden", noInfo: "Aktuell gibt es keine Info-Nachrichten.",
    newLabel: "NEU",
  },
  BA: {
    unknownConnection: "Nepoznata greška povezivanja.",
    message: "Poruka", status: "Status", code: "Kod", errorName: "Naziv",
    sitePrefix: "Baustelle", noAddress: "Adresa nije unesena",
    workerLoadError: "Prijava je prošla, ali radnik nije učitan iz tabele workers.",
    noLinkedWorker: "Prijava je prošla, ali ovaj Supabase korisnik nije povezan s radnikom u tabeli workers.",
    accountDisabled: "Ovaj korisnički račun je deaktiviran.",
    checkLoginError: "Greška kod provjere prijave.",
    enterEmail: "Unesi e-mail adresu.", enterPassword: "Unesi lozinku.",
    supabaseLoginFailed: "Supabase prijava nije uspjela.",
    noUserReturned: "Supabase nije prijavio grešku, ali nije vratio korisnika.",
    unexpectedError: "Dogodila se neočekivana greška.",
    supabaseError: "Supabase greška", unexpectedAlert: "Neočekivana greška",
    sitesLoadError: "Baustelle nisu učitane.",
    nextStep: "povezujemo u sljedećem koraku.",
    appLoading: "Učitavanje aplikacije...", system: "Baustellen Management System",
    secureLogin: "Sigurna mobilna prijava", workerLabel: "Radnik", pinLabel: "PIN", pinPlaceholder: "Unesi PIN", chooseWorker: "Odaberi radnika.", pinRule: "PIN mora imati 4 do 8 brojeva.", loginFailed: "Ime ili PIN nisu tačni.", remember: "Sačuvaj prijavu", rememberHint: "Ostani prijavljen na ovom uređaju", apiMissing: "Nedostaje adresa mobilnog API-ja.", email: "E-mail adresa",
    emailPlaceholder: "Unesi e-mail adresu", password: "Lozinka",
    passwordPlaceholder: "Unesi lozinku", loggingIn: "PRIJAVA...", login: "SIGURNA PRIJAVA",
    welcome: "Dobrodošao", back: "Nazad", site: "Baustelle", loading: "Učitavanje...",
    noActiveSites: "Trenutno nema aktivnih Baustelle.", siteDetails: "Baustelle", locationLabel: "Lokacija", statusLabel: "Status", roomsLabel: "Prostorije", noRooms: "Nema dodanih prostorija.", siteInfoLabel: "Informacije o Baustelle", noSiteInfo: "Nema dodanih informacija.", loadSiteDetailsError: "Detalji Baustelle nisu učitani.", roomDetails: "Prostorija", loadRoomError: "Prostorija nije učitana.", material: "Materijal", workHours: "Radni sati", photos: "Fotografije", productivity: "Produktivnost", openMaps: "Otvori Google Maps", open3d: "Otvori 3D prikaz", myProjects: "Moji projekti",
    projects: "Projekti", hours: "Sati", calendar: "Kalendar", cars: "Auta",
    info: "Info", messages: "poruka", privateNote: "Privatna bilješka",
    orderMaterial: "Naruči materijal", logout: "Odjava", noInfo: "Trenutno nema info poruka.",
    newLabel: "NOVO",
  },
  UZ: {
    unknownConnection: "Noma’lum ulanish xatosi.",
    message: "Xabar", status: "Holat", code: "Kod", errorName: "Nomi",
    sitePrefix: "Obyekt", noAddress: "Manzil kiritilmagan",
    workerLoadError: "Kirish muvaffaqiyatli, lekin workers jadvalidan ishchi yuklanmadi.",
    noLinkedWorker: "Kirish muvaffaqiyatli, lekin bu Supabase foydalanuvchisi workers jadvalidagi ishchiga bog‘lanmagan.",
    accountDisabled: "Bu foydalanuvchi hisobi o‘chirilgan.",
    checkLoginError: "Kirishni tekshirishda xato.",
    enterEmail: "E-mail manzilini kiriting.", enterPassword: "Parolni kiriting.",
    supabaseLoginFailed: "Supabase orqali kirish amalga oshmadi.",
    noUserReturned: "Supabase xato bermadi, lekin foydalanuvchini qaytarmadi.",
    unexpectedError: "Kutilmagan xato yuz berdi.",
    supabaseError: "Supabase xatosi", unexpectedAlert: "Kutilmagan xato",
    sitesLoadError: "Obyektlar yuklanmadi.",
    nextStep: "keyingi bosqichda ulanadi.",
    appLoading: "Ilova yuklanmoqda...", system: "Qurilish maydonini boshqarish tizimi",
    secureLogin: "Xavfsiz mobil kirish", workerLabel: "Ishchi", pinLabel: "PIN", pinPlaceholder: "PIN kiriting", chooseWorker: "Ishchini tanlang.", pinRule: "PIN 4 dan 8 tagacha raqamdan iborat bo‘lishi kerak.", loginFailed: "Ism yoki PIN noto‘g‘ri.", remember: "Kirishni saqlash", rememberHint: "Ushbu qurilmada tizimda qolish", apiMissing: "Mobil API manzili yo‘q.", email: "E-mail",
    emailPlaceholder: "E-mailni kiriting", password: "Parol",
    passwordPlaceholder: "Parolni kiriting", loggingIn: "KIRILMOQDA...", login: "XAVFSIZ KIRISH",
    welcome: "Xush kelibsiz", back: "Orqaga", site: "Obyektlar", loading: "Yuklanmoqda...",
    noActiveSites: "Hozir faol obyektlar yo‘q.", siteDetails: "Obyekt", locationLabel: "Manzil", statusLabel: "Holat", roomsLabel: "Xonalar", noRooms: "Xonalar yo‘q.", siteInfoLabel: "Obyekt ma’lumoti", noSiteInfo: "Ma’lumot yo‘q.", loadSiteDetailsError: "Obyekt tafsilotlari yuklanmadi.", roomDetails: "Xona", loadRoomError: "Xona yuklanmadi.", material: "Material", workHours: "Ish soatlari", photos: "Rasmlar", productivity: "Mahsuldorlik", openMaps: "Google Maps ochish", open3d: "3D ko‘rinishni ochish", myProjects: "Mening loyihalarim",
    projects: "Loyihalar", hours: "Soatlar", calendar: "Kalendar", cars: "Mashinalar",
    info: "Info", messages: "xabar", privateNote: "Shaxsiy eslatma",
    orderMaterial: "Material buyurtma", logout: "Chiqish", noInfo: "Hozircha info xabarlar yo‘q.",
    newLabel: "YANGI",
  },
  CZ: {
    unknownConnection: "Neznámá chyba připojení.",
    message: "Zpráva", status: "Stav", code: "Kód", errorName: "Název",
    sitePrefix: "Stavba", noAddress: "Adresa není zadána",
    workerLoadError: "Přihlášení proběhlo, ale pracovníka se nepodařilo načíst z tabulky workers.",
    noLinkedWorker: "Přihlášení proběhlo, ale tento uživatel Supabase není propojen s pracovníkem v tabulce workers.",
    accountDisabled: "Tento uživatelský účet je deaktivován.",
    checkLoginError: "Chyba při kontrole přihlášení.",
    enterEmail: "Zadejte e-mailovou adresu.", enterPassword: "Zadejte heslo.",
    supabaseLoginFailed: "Přihlášení přes Supabase se nezdařilo.",
    noUserReturned: "Supabase nevrátil chybu, ale nevrátil uživatele.",
    unexpectedError: "Došlo k neočekávané chybě.",
    supabaseError: "Chyba Supabase", unexpectedAlert: "Neočekávaná chyba",
    sitesLoadError: "Stavby se nepodařilo načíst.",
    nextStep: "bude propojeno v dalším kroku.",
    appLoading: "Načítání aplikace...", system: "Systém řízení staveb",
    secureLogin: "Bezpečné mobilní přihlášení", workerLabel: "Pracovník", pinLabel: "PIN", pinPlaceholder: "Zadejte PIN", chooseWorker: "Vyberte pracovníka.", pinRule: "PIN musí obsahovat 4 až 8 číslic.", loginFailed: "Jméno nebo PIN není správný.", remember: "Uložit přihlášení", rememberHint: "Zůstat přihlášen na tomto zařízení", apiMissing: "Chybí adresa mobilního API.", email: "E-mailová adresa",
    emailPlaceholder: "Zadejte e-mailovou adresu", password: "Heslo",
    passwordPlaceholder: "Zadejte heslo", loggingIn: "PŘIHLAŠOVÁNÍ...", login: "BEZPEČNĚ PŘIHLÁSIT",
    welcome: "Vítejte", back: "Zpět", site: "Stavby", loading: "Načítání...",
    noActiveSites: "Aktuálně nejsou žádné aktivní stavby.", siteDetails: "Stavba", locationLabel: "Místo", statusLabel: "Stav", roomsLabel: "Místnosti", noRooms: "Nejsou žádné místnosti.", siteInfoLabel: "Informace o stavbě", noSiteInfo: "Nejsou zadány žádné informace.", loadSiteDetailsError: "Detaily stavby se nepodařilo načíst.", roomDetails: "Místnost", loadRoomError: "Místnost se nepodařilo načíst.", material: "Materiál", workHours: "Pracovní hodiny", photos: "Fotografie", productivity: "Produktivita", openMaps: "Otevřít Google Maps", open3d: "Otevřít 3D náhled", myProjects: "Moje projekty",
    projects: "Projekty", hours: "Hodiny", calendar: "Kalendář", cars: "Auta",
    info: "Info", messages: "zpráv", privateNote: "Soukromá poznámka",
    orderMaterial: "Objednat materiál", logout: "Odhlásit se", noInfo: "Aktuálně nejsou žádné informační zprávy.",
    newLabel: "NOVÉ",
  },
  EN: {
    unknownConnection: "Unknown connection error.",
    message: "Message", status: "Status", code: "Code", errorName: "Name",
    sitePrefix: "Site", noAddress: "No address entered",
    workerLoadError: "Login succeeded, but the worker could not be loaded from the workers table.",
    noLinkedWorker: "Login succeeded, but this Supabase user is not linked to a worker in the workers table.",
    accountDisabled: "This user account is disabled.",
    checkLoginError: "Error checking login.",
    enterEmail: "Enter your e-mail address.", enterPassword: "Enter your password.",
    supabaseLoginFailed: "Supabase login failed.",
    noUserReturned: "Supabase reported no error, but did not return a user.",
    unexpectedError: "An unexpected error occurred.",
    supabaseError: "Supabase error", unexpectedAlert: "Unexpected error",
    sitesLoadError: "Sites could not be loaded.",
    nextStep: "will be connected in the next step.",
    appLoading: "Loading application...", system: "Construction Site Management System",
    secureLogin: "Secure mobile login", workerLabel: "Worker", pinLabel: "PIN", pinPlaceholder: "Enter PIN", chooseWorker: "Please select a worker.", pinRule: "PIN must contain 4 to 8 digits.", loginFailed: "Name or PIN is incorrect.", remember: "Save login", rememberHint: "Stay signed in on this device", apiMissing: "Mobile API address is missing.", email: "E-mail address",
    emailPlaceholder: "Enter e-mail address", password: "Password",
    passwordPlaceholder: "Enter password", loggingIn: "LOGGING IN...", login: "SECURE LOGIN",
    welcome: "Welcome", back: "Back", site: "Sites", loading: "Loading...",
    noActiveSites: "There are currently no active sites.", siteDetails: "Site", locationLabel: "Location", statusLabel: "Status", roomsLabel: "Rooms", noRooms: "No rooms available.", siteInfoLabel: "Site information", noSiteInfo: "No information has been added.", loadSiteDetailsError: "Site details could not be loaded.", roomDetails: "Room", loadRoomError: "Room could not be loaded.", material: "Material", workHours: "Work Hours", photos: "Photos", productivity: "Productivity", openMaps: "Open Google Maps", open3d: "Open 3D view", myProjects: "My projects",
    projects: "Projects", hours: "Hours", calendar: "Calendar", cars: "Cars",
    info: "Info", messages: "messages", privateNote: "Private note",
    orderMaterial: "Order material", logout: "Logout", noInfo: "There are currently no info messages.",
    newLabel: "NEW",
  },
};

function normalizeMobileLanguage(value: string | null): MobileLanguage {
  const v = String(value || "").trim().toUpperCase();
  if (v === "DE" || v === "BA" || v === "UZ" || v === "CZ" || v === "EN") return v;
  if (v === "BS") return "BA";
  if (v === "CS") return "CZ";
  return "BA";
}

function App() {
  const [workers, setWorkers] = useState<Worker[]>(FALLBACK_WORKERS);
  const [name, setName] = useState("Hido");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(true);

  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [language, setLanguage] = useState<MobileLanguage>("BA");
  const t = mobileTranslations[language];
  const [screen, setScreen] = useState<AppScreen>("dashboard");

  const [baustellen, setBaustellen] = useState<Baustelle[]>([]);
  const [baustellenLoading, setBaustellenLoading] = useState(false);
  const [selectedBaustelle, setSelectedBaustelle] = useState<Baustelle | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [siteRooms, setSiteRooms] = useState<Room[]>([]);
  const [siteInfo, setSiteInfo] = useState<BaustelleInfo[]>([]);
  const [siteDetailsLoading, setSiteDetailsLoading] = useState(false);

  const [roomFeatureLoading, setRoomFeatureLoading] = useState(false);
  const [roomMaterial, setRoomMaterial] = useState<any[]>([]);
  const [catalogMaterials, setCatalogMaterials] = useState<any[]>([]);
  const [materialCatalogId, setMaterialCatalogId] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [materialUnit, setMaterialUnit] = useState("Stk");
  const [materialQty, setMaterialQty] = useState("1");

  const [roomHours, setRoomHours] = useState<any[]>([]);
  const [hoursDate, setHoursDate] = useState(new Date().toISOString().split("T")[0]);
  const [hoursStart, setHoursStart] = useState("08:00");
  const [hoursEnd, setHoursEnd] = useState("17:00");
  const [hoursBreak, setHoursBreak] = useState("0.5");
  const [hoursDescription, setHoursDescription] = useState("");

  const [roomPhotos, setRoomPhotos] = useState<any[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [roomProductivity, setRoomProductivity] = useState<any[]>([]);
  const [productivityPosition, setProductivityPosition] = useState("Pod");
  const [productivityQty, setProductivityQty] = useState("1");
  const [productivityUnit, setProductivityUnit] = useState("m²");
  const [productivityNote, setProductivityNote] = useState("");

  // Informacije / napomene za prostoriju. Koristi istu tabelu i storage kao web aplikacija.
  const noteImageInputRef = useRef<HTMLInputElement | null>(null);
  const notePdfInputRef = useRef<HTMLInputElement | null>(null);
  const [roomNotes, setRoomNotes] = useState<any[]>([]);
  const [noteText, setNoteText] = useState("");
  const [noteLinkUrl, setNoteLinkUrl] = useState("");
  const [showNoteLinkInput, setShowNoteLinkInput] = useState(false);
  const [noteSelectedFile, setNoteSelectedFile] = useState<File | null>(null);
  const [noteSelectedFileKind, setNoteSelectedFileKind] = useState<"image" | "pdf" | "">("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteError, setNoteError] = useState("");

  useEffect(() => {
    const savedLanguage = normalizeMobileLanguage(
      localStorage.getItem("appLanguage") || localStorage.getItem("lang")
    );
    const savedName = localStorage.getItem("solstone_saved_worker");
    const savedRemember = localStorage.getItem("solstone_remember_login") !== "false";

    setLanguage(savedLanguage);
    setRememberLogin(savedRemember);
    if (savedName) setName(savedName);

    void loadWorkers(savedName);
    void checkExistingSession();
  }, []);

  function formatError(error: unknown) {
    const details = error as ErrorDetails;

    const message = details?.message || t.unknownConnection;
    const status = details?.status !== undefined ? String(details.status) : "-";
    const code = details?.code || "-";
    const name = details?.name || "-";

    return [
      `${t.message}: ${message}`,
      `${t.status}: ${status}`,
      `${t.code}: ${code}`,
      `${t.errorName}: ${name}`,
    ].join("\n");
  }

  function changeLanguage(next: MobileLanguage) {
    setLanguage(next);
    localStorage.setItem("appLanguage", next.toLowerCase());
    localStorage.setItem("lang", next.toLowerCase());
    localStorage.setItem("language", next.toLowerCase());
  }

  function readText(item: any, keys: string[], fallback: string) {
    for (const key of keys) {
      const value = item?.[key];

      if (value !== null && value !== undefined && String(value).trim() !== "") {
        return String(value);
      }
    }

    return fallback;
  }

  function isArchivedBaustelle(item: any) {
    const status = readText(item, ["status", "Status", "zustand", "state"], "").toLowerCase();

    const archived =
      item?.archived ??
      item?.is_archived ??
      item?.archiviert ??
      item?.archive ??
      false;

    if (archived === true) return true;

    return (
      status.includes("archiv") ||
      status.includes("geschlossen") ||
      status.includes("closed") ||
      status.includes("abgeschlossen")
    );
  }

  function getBaustelleTitle(site: Baustelle) {
    return readText(
      site,
      ["name", "naziv", "title", "baustelle", "baustelle_name", "projekt", "projekt_name"],
      `${t.sitePrefix} #${site.id}`
    );
  }

  function getBaustelleLocation(site: Baustelle) {
    return readText(
      site,
      ["ort", "place", "location", "lokacija", "mjesto", "adresse", "address"],
      t.noAddress
    );
  }

  function getBaustelleStatus(site: Baustelle) {
    return readText(site, ["status", "Status", "zustand", "state"], "Aktiv");
  }

  function getRoomTitle(room: Room) {
    return readText(room, ["naziv", "name", "title"], `${t.roomsLabel} #${room.id}`);
  }

  function roomText(values: Partial<Record<MobileLanguage, string>>, fallback: string) {
    return values[language] || values.BA || fallback;
  }

  function timeToNumber(value: string) {
    const [h, m] = value.split(":").map(Number);
    return (h || 0) + (m || 0) / 60;
  }

  function calculatedHours() {
    return Math.max(0, Number((timeToNumber(hoursEnd) - timeToNumber(hoursStart) - Number(hoursBreak || 0)).toFixed(2)));
  }

  function materialDisplayName(row: any) {
    const custom = String(row?.custom_naziv || "").trim();
    if (custom) return custom;
    const item = catalogMaterials.find((m) => Number(m.id) === Number(row?.material_id));
    return String(item?.naziv || item?.name || item?.title || t.material);
  }

  function materialDisplayUnit(row: any) {
    const custom = String(row?.custom_jedinica || "").trim();
    if (custom) return custom;
    const item = catalogMaterials.find((m) => Number(m.id) === Number(row?.material_id));
    return String(item?.jedinica || item?.unit || item?.einheit || "");
  }

  function photoUrl(photo: any) {
    return String(photo?.image_url || photo?.foto_url || photo?.url || photo?.public_url || "");
  }

  function getInfoValue(row: BaustelleInfo) {
    if (row.type === "google_maps") return String(row.google_maps_url || row.note_bs || row.note_de || "").trim();
    if (row.type === "visualization_3d") return String(row.visualization_url || row.google_maps_url || row.note_bs || row.note_de || "").trim();

    const byLanguage: Record<MobileLanguage, unknown> = {
      DE: row.note_de,
      BA: row.note_bs,
      UZ: row.note_uz,
      CZ: row.note_bs || row.note_de,
      EN: row.note_en,
    };

    return String(byLanguage[language] || row.note_bs || row.note_de || row.note_en || row.note_uz || "").trim();
  }

  function getInfoTitle(row: BaustelleInfo) {
    if (row.type === "google_maps") return t.openMaps;
    if (row.type === "visualization_3d") return t.open3d;

    const byLanguage: Record<MobileLanguage, unknown> = {
      DE: row.title_de,
      BA: row.title_bs,
      UZ: row.title_uz,
      CZ: row.title_bs || row.title_de,
      EN: row.title_en,
    };

    return String(byLanguage[language] || row.title_bs || row.title_de || row.title_en || row.type || t.siteInfoLabel);
  }

  function getSpecialInfo(type: "google_maps" | "visualization_3d") {
    const row = siteInfo.find((item) => item.type === type);
    return row ? getInfoValue(row) : "";
  }

  function saveWorkerLocally(currentWorker: Worker) {
    localStorage.setItem("worker_id", String(currentWorker.id));
    localStorage.setItem("worker_name", currentWorker.name);
    localStorage.setItem("worker_role", currentWorker.role);
    localStorage.setItem("userName", currentWorker.name);
  }

  function clearLocalWorker() {
    localStorage.removeItem("worker_id");
    localStorage.removeItem("worker_name");
    localStorage.removeItem("worker_role");
    localStorage.removeItem("userName");
  }

  function apiUrl(path: string) {
    if (!API_BASE_URL) return "";
    return `${API_BASE_URL}${path}`;
  }

  async function loadWorkers(savedName?: string | null) {
    try {
      const { data, error } = await supabase
        .from("workers")
        .select("id, name, role, active")
        .order("name", { ascending: true });

      if (error) throw error;

      const activeWorkers: Worker[] = (data || [])
        .filter((item: any) => item?.active !== false)
        .map((item: any) => ({
          id: String(item.id),
          name: String(item.name || "").trim(),
          role: String(item.role || "worker"),
          active: item.active !== false,
        }))
        .filter((item: Worker) => item.name);

      if (activeWorkers.length > 0) {
        setWorkers(activeWorkers);

        const preferred = savedName || localStorage.getItem("solstone_saved_worker");
        if (preferred && activeWorkers.some((item) => item.name.toLowerCase() === preferred.toLowerCase())) {
          setName(preferred);
        } else if (!activeWorkers.some((item) => item.name === name)) {
          setName(activeWorkers[0].name);
        }
      }
    } catch (error) {
      console.error("Load mobile workers:", error);
      setWorkers(FALLBACK_WORKERS);
    }
  }

  async function checkExistingSession() {
    setLoading(true);
    setErrorMessage("");

    const token = localStorage.getItem("solstone_mobile_token");

    if (!token) {
      clearLocalWorker();
      setWorker(null);
      setLoading(false);
      return;
    }

    const url = apiUrl("/api/auth/login");

    if (!url) {
      clearLocalWorker();
      setWorker(null);
      setErrorMessage(t.apiMissing);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.user) {
        localStorage.removeItem("solstone_mobile_token");
        clearLocalWorker();
        setWorker(null);
        return;
      }

      const currentWorker: Worker = {
        id: String(data.user.id),
        name: String(data.user.name),
        role: String(data.user.role || "worker"),
        active: true,
      };

      saveWorkerLocally(currentWorker);
      setWorker(currentWorker);
      setScreen("dashboard");
    } catch (error) {
      clearLocalWorker();
      setWorker(null);
      setErrorMessage(t.checkLoginError + "\n\n" + formatError(error));
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    setErrorMessage("");

    const cleanName = name.trim();

    if (!cleanName) {
      setErrorMessage(t.chooseWorker);
      return;
    }

    if (!/^\d{4,8}$/.test(pin)) {
      setErrorMessage(t.pinRule);
      return;
    }

    const url = apiUrl("/api/auth/login");

    if (!url) {
      setErrorMessage(t.apiMissing);
      return;
    }

    setLoginLoading(true);

    try {
      const response = await fetch(url, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          pin,
          remember: rememberLogin,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.user || !data?.sessionToken) {
        throw new Error(String(data?.error || t.loginFailed));
      }

      const currentWorker: Worker = {
        id: String(data.user.id),
        name: String(data.user.name),
        role: String(data.user.role || "worker"),
        active: true,
      };

      localStorage.setItem("solstone_mobile_token", String(data.sessionToken));
      localStorage.setItem("solstone_saved_worker", currentWorker.name);
      localStorage.setItem("solstone_remember_login", rememberLogin ? "true" : "false");

      saveWorkerLocally(currentWorker);
      setWorker(currentWorker);
      setScreen("dashboard");
      setPin("");
      setShowPin(false);
      setErrorMessage("");
    } catch (error) {
      const message = error instanceof Error ? error.message : t.loginFailed;
      setErrorMessage(message);
    } finally {
      setLoginLoading(false);
    }
  }

  async function logout() {
    localStorage.removeItem("solstone_mobile_token");
    clearLocalWorker();
    setWorker(null);
    setPin("");
    setScreen("dashboard");
    setBaustellen([]);
    setSelectedBaustelle(null);
    setSelectedRoom(null);
    setSiteRooms([]);
    setSiteInfo([]);
    setErrorMessage("");
  }

  async function openBaustellen() {
    setScreen("baustellen");
    setBaustellenLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("baustellen")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      setErrorMessage(t.sitesLoadError + "\n\n" + formatError(error));
      setBaustellen([]);
      setBaustellenLoading(false);
      return;
    }

    setBaustellen((data || []).filter((site) => !isArchivedBaustelle(site)) as Baustelle[]);
    setBaustellenLoading(false);
  }

  async function openBaustelle(site: Baustelle) {
    setSelectedBaustelle(site);
    setSelectedRoom(null);
    setScreen("baustelle-detail");
    setSiteDetailsLoading(true);
    setSiteRooms([]);
    setSiteInfo([]);
    setErrorMessage("");

    const siteId = Number(site.id);

    try {
      const [siteResult, roomsResult, infoResult] = await Promise.all([
        supabase.from("baustellen").select("*").eq("id", siteId).single(),
        supabase.from("prostorije").select("*").eq("baustelle_id", siteId).order("id", { ascending: true }),
        supabase.from("baustelle_info").select("*").eq("baustelle_id", siteId),
      ]);

      if (siteResult.error) throw siteResult.error;
      if (roomsResult.error) throw roomsResult.error;
      if (infoResult.error) throw infoResult.error;

      if (siteResult.data) setSelectedBaustelle(siteResult.data as Baustelle);
      setSiteRooms((roomsResult.data || []) as Room[]);
      setSiteInfo((infoResult.data || []) as BaustelleInfo[]);
    } catch (error) {
      setErrorMessage(t.loadSiteDetailsError + "\n\n" + formatError(error));
    } finally {
      setSiteDetailsLoading(false);
    }
  }

  function openRoom(room: Room) {
    // Otvaranje sobe mora biti trenutno i ne smije zavisiti od dodatnog Supabase upita.
    // Podaci o sobi su već učitani zajedno sa Baustelle.
    setErrorMessage("");
    setNoteError("");
    setSelectedRoom({ ...room });
    setScreen("room-detail");
    void loadRoomNotes(room, selectedBaustelle);
  }

  async function loadRoomNotes(roomArg: Room | null = selectedRoom, siteArg: Baustelle | null = selectedBaustelle) {
    if (!roomArg || !siteArg) return;

    setNoteLoading(true);
    setNoteError("");

    const { data, error } = await supabase
      .from("room_notes")
      .select("*")
      .eq("baustelle_id", Number(siteArg.id))
      .eq("room_id", Number(roomArg.id))
      .order("created_at", { ascending: false });

    if (error) {
      setRoomNotes([]);
      setNoteError(
        roomText(
          {
            BA: "Greška kod učitavanja napomena: ",
            DE: "Fehler beim Laden der Notizen: ",
            EN: "Error loading notes: ",
            UZ: "Eslatmalarni yuklash xatosi: ",
            CZ: "Chyba při načítání poznámek: ",
          },
          "Error loading notes: "
        ) + error.message
      );
    } else {
      setRoomNotes(data || []);
    }

    setNoteLoading(false);
  }

  function normalizeRoomNoteLink(value: string) {
    const clean = value.trim();
    if (!clean) return "";
    if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
    return `https://${clean}`;
  }

  function chooseRoomNoteImage() {
    noteImageInputRef.current?.click();
  }

  function chooseRoomNotePdf() {
    notePdfInputRef.current?.click();
  }

  function handleRoomNoteImageFile(file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNoteError(roomText({ BA: "Dozvoljene su samo slike i PDF fajlovi.", DE: "Nur Bilder oder PDF-Dateien sind erlaubt.", EN: "Only images and PDF files are allowed.", UZ: "Faqat rasm va PDF fayllariga ruxsat beriladi.", CZ: "Povoleny jsou pouze obrázky a PDF." }, "Invalid file."));
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setNoteError(roomText({ BA: "Fajl može imati najviše 15 MB.", DE: "Die Datei darf maximal 15 MB groß sein.", EN: "The file may be up to 15 MB.", UZ: "Fayl hajmi 15 MB dan oshmasligi kerak.", CZ: "Soubor může mít maximálně 15 MB." }, "File too large."));
      return;
    }

    setNoteError("");
    setNoteSelectedFile(file);
    setNoteSelectedFileKind("image");
  }

  function handleRoomNotePdfFile(file?: File) {
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setNoteError(roomText({ BA: "Dozvoljene su samo slike i PDF fajlovi.", DE: "Nur Bilder oder PDF-Dateien sind erlaubt.", EN: "Only images and PDF files are allowed.", UZ: "Faqat rasm va PDF fayllariga ruxsat beriladi.", CZ: "Povoleny jsou pouze obrázky a PDF." }, "Invalid file."));
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setNoteError(roomText({ BA: "Fajl može imati najviše 15 MB.", DE: "Die Datei darf maximal 15 MB groß sein.", EN: "The file may be up to 15 MB.", UZ: "Fayl hajmi 15 MB dan oshmasligi kerak.", CZ: "Soubor může mít maximálně 15 MB." }, "File too large."));
      return;
    }

    setNoteError("");
    setNoteSelectedFile(file);
    setNoteSelectedFileKind("pdf");
  }

  function clearRoomNoteFile() {
    setNoteSelectedFile(null);
    setNoteSelectedFileKind("");
    if (noteImageInputRef.current) noteImageInputRef.current.value = "";
    if (notePdfInputRef.current) notePdfInputRef.current.value = "";
  }

  async function uploadRoomNoteFile(site: Baustelle, room: Room) {
    if (!noteSelectedFile) return { fileUrl: "", fileName: "", fileType: "" };

    const safeName = noteSelectedFile.name
      .replace(/[^\w.\-]+/g, "_")
      .replace(/_+/g, "_");
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`;
    const storagePath = `${site.id}/${room.id}/${uniqueName}`;

    const { error: uploadError } = await supabase.storage
      .from("room-note-files")
      .upload(storagePath, noteSelectedFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: noteSelectedFile.type || (noteSelectedFileKind === "pdf" ? "application/pdf" : undefined),
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("room-note-files").getPublicUrl(storagePath);

    return {
      fileUrl: data.publicUrl || "",
      fileName: noteSelectedFile.name,
      fileType: noteSelectedFileKind,
    };
  }

  async function addRoomNote() {
    if (!selectedRoom || !selectedBaustelle || !worker) return;

    const hasText = noteText.trim().length > 0;
    const hasLink = noteLinkUrl.trim().length > 0;
    const hasFile = Boolean(noteSelectedFile);

    if (!hasText && !hasLink && !hasFile) {
      setNoteError(roomText({ BA: "Dodaj tekst, link, sliku ili PDF.", DE: "Bitte Text, Link, Bild oder PDF hinzufügen.", EN: "Add text, a link, an image or a PDF.", UZ: "Matn, havola, rasm yoki PDF qo‘shing.", CZ: "Přidejte text, odkaz, obrázek nebo PDF." }, "Add a note."));
      return;
    }

    setNoteSaving(true);
    setNoteError("");

    try {
      const uploaded = await uploadRoomNoteFile(selectedBaustelle, selectedRoom);

      const { error } = await supabase.from("room_notes").insert([
        {
          baustelle_id: Number(selectedBaustelle.id),
          room_id: Number(selectedRoom.id),
          tekst: noteText.trim() || "",
          radnik: worker.name,
          link_url: normalizeRoomNoteLink(noteLinkUrl),
          file_url: uploaded.fileUrl,
          file_name: uploaded.fileName,
          file_type: uploaded.fileType,
        },
      ]);

      if (error) throw error;

      setNoteText("");
      setNoteLinkUrl("");
      setShowNoteLinkInput(false);
      clearRoomNoteFile();
      await loadRoomNotes(selectedRoom, selectedBaustelle);
    } catch (error) {
      setNoteError(
        roomText({ BA: "Greška kod spremanja napomene: ", DE: "Fehler beim Speichern der Notiz: ", EN: "Error saving note: ", UZ: "Eslatmani saqlash xatosi: ", CZ: "Chyba při ukládání poznámky: " }, "Error saving note: ") +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setNoteSaving(false);
    }
  }

  function formatRoomNoteDate(value: string) {
    if (!value) return "";

    const localeMap: Record<MobileLanguage, string> = {
      DE: "de-AT",
      BA: "bs-BA",
      UZ: "uz-UZ",
      CZ: "cs-CZ",
      EN: "en-GB",
    };

    return new Date(value).toLocaleString(localeMap[language], {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function openExternalUrl(url: string) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function notReady(label: string) {
    alert(`${label} ${t.nextStep}`);
  }

  async function openRoomMaterial() {
    if (!selectedRoom) return;
    setScreen("room-material");
    setRoomFeatureLoading(true);
    setErrorMessage("");
    try {
      const [entries, materials] = await Promise.all([
        supabase.from("room_material").select("*").eq("room_id", Number(selectedRoom.id)).order("id", { ascending: false }),
        supabase.from("materials").select("*").order("naziv", { ascending: true }),
      ]);
      if (entries.error) throw entries.error;
      if (materials.error) throw materials.error;
      setRoomMaterial(entries.data || []);
      setCatalogMaterials(materials.data || []);
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setRoomFeatureLoading(false);
    }
  }

  async function saveRoomMaterial() {
    if (!selectedRoom) return;
    const qty = Number(materialQty);
    if (!qty || qty <= 0) { alert(roomText({ BA: "Unesi količinu.", DE: "Menge eingeben.", EN: "Enter quantity.", UZ: "Miqdorni kiriting.", CZ: "Zadejte množství." }, "Enter quantity.")); return; }
    const selectedCatalog = catalogMaterials.find((m) => String(m.id) === materialCatalogId);
    if (!selectedCatalog && !materialName.trim()) { alert(roomText({ BA: "Odaberi materijal ili upiši naziv.", DE: "Material auswählen oder Namen eingeben.", EN: "Choose a material or enter a name.", UZ: "Material tanlang yoki nom kiriting.", CZ: "Vyberte materiál nebo zadejte název." }, "Choose material.")); return; }
    setRoomFeatureLoading(true);
    try {
      if (selectedCatalog) {
        const { data: existing, error: checkError } = await supabase.from("room_material").select("*").eq("room_id", Number(selectedRoom.id)).eq("material_id", Number(selectedCatalog.id)).maybeSingle();
        if (checkError) throw checkError;
        if (existing) {
          const { error } = await supabase.from("room_material").update({ kolicina: Number(existing.kolicina || 0) + qty }).eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("room_material").insert({ room_id: Number(selectedRoom.id), material_id: Number(selectedCatalog.id), kolicina: qty, custom_naziv: null, custom_jedinica: null });
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from("room_material").insert({ room_id: Number(selectedRoom.id), material_id: null, kolicina: qty, custom_naziv: materialName.trim(), custom_jedinica: materialUnit.trim() || "Stk" });
        if (error) throw error;
      }
      setMaterialCatalogId(""); setMaterialName(""); setMaterialQty("1");
      await openRoomMaterial();
    } catch (error) {
      setErrorMessage(formatError(error));
      setRoomFeatureLoading(false);
    }
  }

  async function deleteRoomMaterial(id: number | string) {
    if (!confirm(roomText({ BA: "Obrisati materijal?", DE: "Material löschen?", EN: "Delete material?", UZ: "Material o‘chirilsinmi?", CZ: "Smazat materiál?" }, "Delete?"))) return;
    const { error } = await supabase.from("room_material").delete().eq("id", id);
    if (error) setErrorMessage(formatError(error)); else await openRoomMaterial();
  }

  async function openRoomHours() {
    if (!selectedRoom || !selectedBaustelle) return;
    setScreen("room-hours"); setRoomFeatureLoading(true); setErrorMessage("");
    const { data, error } = await supabase.from("baustelle_hours").select("*").eq("baustelle_id", Number(selectedBaustelle.id)).eq("room_id", Number(selectedRoom.id)).order("datum", { ascending: false });
    if (error) setErrorMessage(formatError(error)); else setRoomHours(data || []);
    setRoomFeatureLoading(false);
  }

  async function saveRoomHours() {
    if (!selectedRoom || !selectedBaustelle || !worker) return;
    const total = calculatedHours();
    if (total <= 0) { alert(roomText({ BA: "Provjeri početak, kraj i pauzu.", DE: "Start, Ende und Pause prüfen.", EN: "Check start, end and break.", UZ: "Boshlanish, tugash va tanaffusni tekshiring.", CZ: "Zkontrolujte začátek, konec a pauzu." }, "Check times.")); return; }
    setRoomFeatureLoading(true);
    const { error } = await supabase.from("baustelle_hours").insert({ baustelle_id: Number(selectedBaustelle.id), room_id: Number(selectedRoom.id), radnik: worker.name, datum: hoursDate, tip_unosa: "RAD", pocetak: hoursStart, kraj: hoursEnd, pauza: Number(hoursBreak || 0), ukupno_sati: total, sati: total, opis_posla: hoursDescription.trim() });
    if (error) { setErrorMessage(formatError(error)); setRoomFeatureLoading(false); return; }
    setHoursDescription(""); await openRoomHours();
  }

  async function deleteRoomHour(id: number | string) {
    if (!confirm(roomText({ BA: "Izbrisati ovaj unos sati?", DE: "Diesen Stundeneintrag löschen?", EN: "Delete this hours entry?", UZ: "Bu soat yozuvi o‘chirilsinmi?", CZ: "Smazat tento záznam hodin?" }, "Delete?"))) return;
    const { error } = await supabase.from("baustelle_hours").delete().eq("id", id);
    if (error) setErrorMessage(formatError(error)); else await openRoomHours();
  }

  async function openRoomPhotos() {
    if (!selectedRoom) return;
    setScreen("room-photos"); setRoomFeatureLoading(true); setErrorMessage("");
    const { data, error } = await supabase.from("room_photos").select("*").eq("room_id", Number(selectedRoom.id)).order("id", { ascending: false });
    if (error) setErrorMessage(formatError(error)); else setRoomPhotos(data || []);
    setRoomFeatureLoading(false);
  }

  async function uploadRoomPhotos(event: ChangeEvent<HTMLInputElement>) {
    if (!selectedRoom || !selectedBaustelle || !worker) return;
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setPhotoUploading(true); setErrorMessage("");
    try {
      for (const file of files) {
        const ext = file.name.split(".").pop() || "jpg";
        const storagePath = `${selectedBaustelle.id}/${selectedRoom.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("room-photos").upload(storagePath, file);
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from("room-photos").getPublicUrl(storagePath);
        const { error: insertError } = await supabase.from("room_photos").insert({ baustelle_id: Number(selectedBaustelle.id), room_id: Number(selectedRoom.id), image_url: publicUrl.publicUrl, storage_path: storagePath, worker_name: worker.name, radnik: worker.name, room_name: getRoomTitle(selectedRoom) });
        if (insertError) throw insertError;
      }
      event.target.value = "";
      await openRoomPhotos();
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setPhotoUploading(false);
    }
  }

  async function deleteRoomPhoto(photo: any) {
    if (!confirm(roomText({ BA: "Obrisati fotografiju?", DE: "Foto löschen?", EN: "Delete photo?", UZ: "Rasm o‘chirilsinmi?", CZ: "Smazat fotografii?" }, "Delete photo?"))) return;
    if (photo.storage_path) await supabase.storage.from("room-photos").remove([photo.storage_path]);
    const { error } = await supabase.from("room_photos").delete().eq("id", photo.id);
    if (error) setErrorMessage(formatError(error)); else await openRoomPhotos();
  }

  async function openRoomProductivity() {
    if (!selectedRoom || !selectedBaustelle) return;
    setScreen("room-productivity"); setRoomFeatureLoading(true); setErrorMessage("");
    const { data, error } = await supabase.from("produktivnost").select("*").eq("baustelle_id", Number(selectedBaustelle.id)).eq("room_id", Number(selectedRoom.id)).order("id", { ascending: false });
    if (error) setErrorMessage(formatError(error)); else setRoomProductivity(data || []);
    setRoomFeatureLoading(false);
  }

  async function saveRoomProductivity() {
    if (!selectedRoom || !selectedBaustelle || !worker) return;
    const qty = Number(productivityQty);
    if (!qty || qty <= 0) { alert(roomText({ BA: "Unesi količinu.", DE: "Menge eingeben.", EN: "Enter quantity.", UZ: "Miqdorni kiriting.", CZ: "Zadejte množství." }, "Enter quantity.")); return; }
    setRoomFeatureLoading(true);
    const { error } = await supabase.from("produktivnost").insert({ baustelle_id: Number(selectedBaustelle.id), room_id: Number(selectedRoom.id), datum: new Date().toISOString().split("T")[0], radnik: worker.name, pozicija: productivityPosition.trim() || "Rad", kolicina: qty, jedinica: productivityUnit.trim() || "m²", napomena: productivityNote.trim() });
    if (error) { setErrorMessage(formatError(error)); setRoomFeatureLoading(false); return; }
    setProductivityQty("1"); setProductivityNote(""); await openRoomProductivity();
  }

  async function deleteRoomProductivity(id: number | string) {
    if (!confirm(roomText({ BA: "Obrisati unos produktivnosti?", DE: "Leistungseintrag löschen?", EN: "Delete productivity entry?", UZ: "Unumdorlik yozuvi o‘chirilsinmi?", CZ: "Smazat záznam produktivity?" }, "Delete?"))) return;
    const { error } = await supabase.from("produktivnost").delete().eq("id", id);
    if (error) setErrorMessage(formatError(error)); else await openRoomProductivity();
  }

  if (loading) {
    return (
      <main style={loadingPageStyle}>
        <div style={loadingBoxStyle}>{t.appLoading}</div>
      </main>
    );
  }

  if (!worker) {
    return (
      <main style={loginPageStyle}>
        <div style={loginCardStyle}>
          <img src={LOGO_URL} alt="Solstone" style={loginLogoStyle} />

          <div style={{ ...languageRowStyle, marginBottom: "18px" }}>
            {(["DE", "BA", "UZ", "CZ", "EN"] as MobileLanguage[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => changeLanguage(item)}
                style={{
                  ...languageButtonStyle,
                  background: language === item ? "#f97316" : "#111827",
                }}
              >
                {item}
              </button>
            ))}
          </div>

          <p style={loginSubtitleStyle}>{t.system}</p>
          <p style={loginSecureStyle}>{t.secureLogin}</p>

          <label style={loginLabelStyle}>{t.workerLabel}</label>
          <select
            value={name}
            onChange={(event) => setName(event.target.value)}
            style={loginInputStyle}
            disabled={loginLoading}
          >
            {workers.map((item) => (
              <option key={String(item.id)} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>

          <label style={loginLabelStyle}>{t.pinLabel}</label>
          <div style={passwordBoxStyle}>
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              autoComplete="off"
              placeholder={t.pinPlaceholder}
              style={passwordInputStyle}
              disabled={loginLoading}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !loginLoading) void login();
              }}
            />
            <button
              type="button"
              onClick={() => setShowPin((current) => !current)}
              style={eyeButtonStyle}
              disabled={loginLoading}
            >
              {showPin ? "🙈" : "👁"}
            </button>
          </div>

          <label
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
              margin: "2px 0 14px",
              cursor: "pointer",
              color: "#f3f4f6",
              fontSize: "13px",
            }}
          >
            <input
              type="checkbox"
              checked={rememberLogin}
              onChange={(event) => setRememberLogin(event.target.checked)}
              disabled={loginLoading}
              style={{ marginTop: "2px" }}
            />
            <span>
              <strong style={{ display: "block" }}>{t.remember}</strong>
              <span style={{ color: "#9ca3af", fontSize: "12px" }}>{t.rememberHint}</span>
            </span>
          </label>

          {errorMessage && (
            <div style={errorBoxStyle}>
              <pre style={errorTextStyle}>{errorMessage}</pre>
            </div>
          )}

          <button
            type="button"
            onClick={login}
            disabled={loginLoading}
            style={loginButtonStyle}
          >
            {loginLoading ? t.loggingIn : t.login}
          </button>
        </div>
      </main>
    );
  }

  if (screen === "room-material" && selectedBaustelle && selectedRoom) {
    return (
      <main style={dashboardPageStyle}>
        <header style={mobileHeaderStyle}><div><h1 style={siteDetailTitleStyle}>🧱 {t.material}</h1><p style={welcomeStyle}>{getRoomTitle(selectedRoom)}</p></div><button type="button" onClick={() => setScreen("room-detail")} style={backButtonStyle}>{t.back}</button></header>
        {errorMessage && <div style={errorBoxStyle}><pre style={errorTextStyle}>{errorMessage}</pre></div>}
        <section style={infoPanelStyle}>
          <h2 style={sectionTitleStyle}>{roomText({BA:"Dodaj materijal",DE:"Material hinzufügen",EN:"Add material",UZ:"Material qo‘shish",CZ:"Přidat materiál"},"Add material")}</h2>
          <select value={materialCatalogId} onChange={(e)=>setMaterialCatalogId(e.target.value)} style={featureInputStyle}>
            <option value="">{roomText({BA:"Slobodni unos / odaberi katalog",DE:"Freie Eingabe / Katalog wählen",EN:"Free entry / choose catalog",UZ:"Erkin kiritish / katalog",CZ:"Volný zápis / katalog"},"Choose")}</option>
            {catalogMaterials.map((m)=><option key={String(m.id)} value={String(m.id)}>{String(m.naziv || m.name || m.title || `#${m.id}`)}</option>)}
          </select>
          {!materialCatalogId && <><input value={materialName} onChange={(e)=>setMaterialName(e.target.value)} placeholder={roomText({BA:"Naziv materijala",DE:"Materialname",EN:"Material name",UZ:"Material nomi",CZ:"Název materiálu"},"Material name")} style={featureInputStyle}/><input value={materialUnit} onChange={(e)=>setMaterialUnit(e.target.value)} placeholder={roomText({BA:"Jedinica",DE:"Einheit",EN:"Unit",UZ:"Birlik",CZ:"Jednotka"},"Unit")} style={featureInputStyle}/></>}
          <input value={materialQty} onChange={(e)=>setMaterialQty(e.target.value)} inputMode="decimal" placeholder={roomText({BA:"Količina",DE:"Menge",EN:"Quantity",UZ:"Miqdor",CZ:"Množství"},"Quantity")} style={featureInputStyle}/>
          <button type="button" disabled={roomFeatureLoading} onClick={() => void saveRoomMaterial()} style={featurePrimaryButtonStyle}>{roomText({BA:"Dodaj",DE:"Hinzufügen",EN:"Add",UZ:"Qo‘shish",CZ:"Přidat"},"Add")}</button>
        </section>
        <section style={infoPanelStyle}><h2 style={sectionTitleStyle}>{roomText({BA:"Materijal u prostoriji",DE:"Material im Raum",EN:"Material in room",UZ:"Xonadagi material",CZ:"Materiál v místnosti"},"Material")}</h2>{roomFeatureLoading && <p style={mutedTextStyle}>{t.loading}</p>}{!roomFeatureLoading && roomMaterial.length===0 && <p style={mutedTextStyle}>{roomText({BA:"Još nema materijala.",DE:"Noch kein Material.",EN:"No material yet.",UZ:"Hali material yo‘q.",CZ:"Zatím žádný materiál."},"No material")}</p>}<div style={detailListStyle}>{roomMaterial.map((row)=><div key={String(row.id)} style={featureListCardStyle}><div><strong>{materialDisplayName(row)}</strong><span style={siteLocationStyle}>{Number(row.kolicina || 0)} {materialDisplayUnit(row)}</span></div><button type="button" onClick={()=>void deleteRoomMaterial(row.id)} style={featureDeleteButtonStyle}>🗑</button></div>)}</div></section>
      </main>
    );
  }

  if (screen === "room-hours" && selectedBaustelle && selectedRoom) {
    const total = roomHours.reduce((sum,row)=>sum+Number(row.sati ?? row.ukupno_sati ?? 0),0);
    return (
      <main style={dashboardPageStyle}>
        <header style={mobileHeaderStyle}><div><h1 style={siteDetailTitleStyle}>⏱️ {t.workHours}</h1><p style={welcomeStyle}>{getRoomTitle(selectedRoom)}</p></div><button type="button" onClick={() => setScreen("room-detail")} style={backButtonStyle}>{t.back}</button></header>
        {errorMessage && <div style={errorBoxStyle}><pre style={errorTextStyle}>{errorMessage}</pre></div>}
        <section style={siteSummaryStyle}><div><span style={detailLabelStyle}>{roomText({BA:"Ukupno sati",DE:"Gesamtstunden",EN:"Total hours",UZ:"Jami soat",CZ:"Celkem hodin"},"Total")}</span><strong style={detailValueStyle}>{total.toFixed(2)} h</strong></div><div><span style={detailLabelStyle}>{roomText({BA:"Novi unos",DE:"Neuer Eintrag",EN:"New entry",UZ:"Yangi yozuv",CZ:"Nový záznam"},"New")}</span><strong style={detailValueStyle}>{calculatedHours().toFixed(2)} h</strong></div></section>
        <section style={infoPanelStyle}><input type="date" value={hoursDate} onChange={(e)=>setHoursDate(e.target.value)} style={featureInputStyle}/><div style={featureTwoColStyle}><input type="time" value={hoursStart} onChange={(e)=>setHoursStart(e.target.value)} style={featureInputStyle}/><input type="time" value={hoursEnd} onChange={(e)=>setHoursEnd(e.target.value)} style={featureInputStyle}/></div><input value={hoursBreak} onChange={(e)=>setHoursBreak(e.target.value)} inputMode="decimal" placeholder={roomText({BA:"Pauza (h)",DE:"Pause (h)",EN:"Break (h)",UZ:"Tanaffus (h)",CZ:"Pauza (h)"},"Break")} style={featureInputStyle}/><textarea value={hoursDescription} onChange={(e)=>setHoursDescription(e.target.value)} placeholder={roomText({BA:"Opis posla",DE:"Arbeitsbeschreibung",EN:"Work description",UZ:"Ish tavsifi",CZ:"Popis práce"},"Description")} style={featureTextAreaStyle}/><button type="button" disabled={roomFeatureLoading} onClick={()=>void saveRoomHours()} style={featurePrimaryButtonStyle}>{roomText({BA:"Sačuvaj sate",DE:"Stunden speichern",EN:"Save hours",UZ:"Soatlarni saqlash",CZ:"Uložit hodiny"},"Save")}</button></section>
        <section style={infoPanelStyle}><h2 style={sectionTitleStyle}>{roomText({BA:"Upisani sati",DE:"Erfasste Stunden",EN:"Recorded hours",UZ:"Kiritilgan soatlar",CZ:"Zapsané hodiny"},"Hours")}</h2><div style={detailListStyle}>{roomHours.map((row)=><div key={String(row.id)} style={featureListCardStyle}><div><strong>{String(row.datum || "-")} · {Number(row.sati ?? row.ukupno_sati ?? 0).toFixed(2)} h</strong><span style={siteLocationStyle}>{String(row.radnik || "")} {row.opis_posla ? `· ${row.opis_posla}` : ""}</span></div><button type="button" onClick={()=>void deleteRoomHour(row.id)} style={featureDeleteButtonStyle}>🗑</button></div>)}</div></section>
      </main>
    );
  }

  if (screen === "room-photos" && selectedBaustelle && selectedRoom) {
    return (
      <main style={dashboardPageStyle}>
        <header style={mobileHeaderStyle}><div><h1 style={siteDetailTitleStyle}>📷 {t.photos}</h1><p style={welcomeStyle}>{getRoomTitle(selectedRoom)}</p></div><button type="button" onClick={() => setScreen("room-detail")} style={backButtonStyle}>{t.back}</button></header>
        {errorMessage && <div style={errorBoxStyle}><pre style={errorTextStyle}>{errorMessage}</pre></div>}
        <section style={infoPanelStyle}><label style={featureUploadButtonStyle}>{photoUploading ? t.loading : roomText({BA:"📷 Dodaj fotografije",DE:"📷 Fotos hinzufügen",EN:"📷 Add photos",UZ:"📷 Rasmlar qo‘shish",CZ:"📷 Přidat fotografie"},"Add photos")}<input type="file" accept="image/*" capture="environment" multiple onChange={uploadRoomPhotos} style={{display:"none"}} disabled={photoUploading}/></label></section>
        <section style={photoGridStyle}>{roomPhotos.map((photo)=><div key={String(photo.id)} style={photoCardStyle}>{photoUrl(photo) ? <img src={photoUrl(photo)} alt={t.photos} style={photoImageStyle}/> : <div style={mutedTextStyle}>No image</div>}<div style={photoMetaStyle}><span>{String(photo.worker_name || photo.radnik || "")}</span><button type="button" onClick={()=>void deleteRoomPhoto(photo)} style={featureDeleteButtonStyle}>🗑</button></div></div>)}</section>
        {!roomFeatureLoading && roomPhotos.length===0 && <p style={mutedTextStyle}>{roomText({BA:"Još nema fotografija.",DE:"Noch keine Fotos.",EN:"No photos yet.",UZ:"Hali rasmlar yo‘q.",CZ:"Zatím žádné fotografie."},"No photos")}</p>}
      </main>
    );
  }

  if (screen === "room-productivity" && selectedBaustelle && selectedRoom) {
    return (
      <main style={dashboardPageStyle}>
        <header style={mobileHeaderStyle}><div><h1 style={siteDetailTitleStyle}>📈 {t.productivity}</h1><p style={welcomeStyle}>{getRoomTitle(selectedRoom)}</p></div><button type="button" onClick={() => setScreen("room-detail")} style={backButtonStyle}>{t.back}</button></header>
        {errorMessage && <div style={errorBoxStyle}><pre style={errorTextStyle}>{errorMessage}</pre></div>}
        <section style={infoPanelStyle}><select value={productivityPosition} onChange={(e)=>{setProductivityPosition(e.target.value); if(e.target.value==="Pod"||e.target.value==="Zid") setProductivityUnit("m²"); else if(e.target.value==="Sockel / lajsna") setProductivityUnit("lfm");}} style={featureInputStyle}><option>Pod</option><option>Zid</option><option>Sockel / lajsna</option><option>Silikon</option><option>Slobodno dodavanje</option></select><div style={featureTwoColStyle}><input value={productivityQty} onChange={(e)=>setProductivityQty(e.target.value)} inputMode="decimal" placeholder={roomText({BA:"Količina",DE:"Menge",EN:"Quantity",UZ:"Miqdor",CZ:"Množství"},"Quantity")} style={featureInputStyle}/><input value={productivityUnit} onChange={(e)=>setProductivityUnit(e.target.value)} placeholder={roomText({BA:"Jedinica",DE:"Einheit",EN:"Unit",UZ:"Birlik",CZ:"Jednotka"},"Unit")} style={featureInputStyle}/></div><input value={productivityNote} onChange={(e)=>setProductivityNote(e.target.value)} placeholder={roomText({BA:"Napomena / format",DE:"Notiz / Format",EN:"Note / format",UZ:"Izoh / format",CZ:"Poznámka / formát"},"Note")} style={featureInputStyle}/><button type="button" disabled={roomFeatureLoading} onClick={()=>void saveRoomProductivity()} style={featurePrimaryButtonStyle}>{roomText({BA:"Dodaj produktivnost",DE:"Leistung hinzufügen",EN:"Add productivity",UZ:"Unumdorlik qo‘shish",CZ:"Přidat produktivitu"},"Add")}</button></section>
        <section style={infoPanelStyle}><h2 style={sectionTitleStyle}>{roomText({BA:"Lista produktivnosti",DE:"Leistungsliste",EN:"Productivity list",UZ:"Unumdorlik ro‘yxati",CZ:"Seznam produktivity"},"List")}</h2><div style={detailListStyle}>{roomProductivity.map((row)=><div key={String(row.id)} style={featureListCardStyle}><div><strong>{String(row.pozicija || "-")} · {Number(row.kolicina || 0)} {String(row.jedinica || "")}</strong><span style={siteLocationStyle}>{String(row.radnik || "")} {row.napomena ? `· ${row.napomena}` : ""}</span></div><button type="button" onClick={()=>void deleteRoomProductivity(row.id)} style={featureDeleteButtonStyle}>🗑</button></div>)}</div></section>
      </main>
    );
  }

  if (screen === "room-detail" && selectedBaustelle && selectedRoom) {
    return (
      <main style={dashboardPageStyle}>
        <header style={mobileHeaderStyle}>
          <div>
            <h1 style={siteDetailTitleStyle}>{getRoomTitle(selectedRoom)}</h1>
            <p style={welcomeStyle}>{getBaustelleTitle(selectedBaustelle)}</p>
          </div>
          <button type="button" onClick={() => setScreen("baustelle-detail")} style={backButtonStyle}>
            {t.back}
          </button>
        </header>

        {errorMessage && (
          <div style={errorBoxStyle}>
            <pre style={errorTextStyle}>{errorMessage}</pre>
          </div>
        )}

        <section style={siteSummaryStyle}>
          <div>
            <span style={detailLabelStyle}>{t.siteDetails}</span>
            <strong style={detailValueStyle}>{getBaustelleTitle(selectedBaustelle)}</strong>
          </div>
          <div>
            <span style={detailLabelStyle}>{t.roomDetails}</span>
            <strong style={detailValueStyle}>{getRoomTitle(selectedRoom)}</strong>
          </div>
        </section>

        <section style={roomActionGridStyle}>
          <button type="button" onClick={() => void openRoomMaterial()} style={{ ...roomActionButtonStyle, background: "#2563eb" }}>
            🧱 {t.material}
          </button>
          <button type="button" onClick={() => void openRoomHours()} style={{ ...roomActionButtonStyle, background: "#2563eb" }}>
            ⏱️ {t.workHours}
          </button>
          <button type="button" onClick={() => void openRoomPhotos()} style={{ ...roomActionButtonStyle, background: "#16a34a" }}>
            📷 {t.photos}
          </button>
          <button type="button" onClick={() => void openRoomProductivity()} style={{ ...roomActionButtonStyle, background: "#2563eb" }}>
            📈 {t.productivity}
          </button>
        </section>

        <section style={roomNotesBoxStyle}>
          <h2 style={roomNotesTitleStyle}>
            📝 {roomText({ BA: "Informacije / Napomene", DE: "Informationen / Notizen", EN: "Information / Notes", UZ: "Ma’lumotlar / Eslatmalar", CZ: "Informace / Poznámky" }, "Notes")}
          </h2>

          <textarea
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            placeholder={roomText({ BA: "Upiši informaciju ili napomenu za ovu prostoriju...", DE: "Information oder Notiz für diesen Raum eingeben...", EN: "Enter information or a note for this room...", UZ: "Ushbu xona uchun ma’lumot yoki eslatma kiriting...", CZ: "Zadejte informaci nebo poznámku pro tuto místnost..." }, "Enter note...")}
            style={roomNoteTextAreaStyle}
          />

          {showNoteLinkInput && (
            <input
              value={noteLinkUrl}
              onChange={(event) => setNoteLinkUrl(event.target.value)}
              placeholder="https://..."
              autoCapitalize="none"
              autoCorrect="off"
              style={roomNoteLinkInputStyle}
            />
          )}

          <input
            ref={noteImageInputRef}
            type="file"
            accept="image/*"
            onChange={(event) => handleRoomNoteImageFile(event.target.files?.[0])}
            style={{ display: "none" }}
          />
          <input
            ref={notePdfInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => handleRoomNotePdfFile(event.target.files?.[0])}
            style={{ display: "none" }}
          />

          <div style={roomNoteAttachmentGridStyle}>
            <button type="button" onClick={() => setShowNoteLinkInput((old) => !old)} style={roomNoteAttachmentButtonStyle}>
              🔗 {roomText({ BA: "Dodaj link", DE: "Link hinzufügen", EN: "Add link", UZ: "Havola qo‘shish", CZ: "Přidat odkaz" }, "Add link")}
            </button>
            <button type="button" onClick={chooseRoomNoteImage} style={roomNoteAttachmentButtonStyle}>
              🖼️ {roomText({ BA: "Dodaj sliku", DE: "Bild hinzufügen", EN: "Add image", UZ: "Rasm qo‘shish", CZ: "Přidat obrázek" }, "Add image")}
            </button>
            <button type="button" onClick={chooseRoomNotePdf} style={roomNoteAttachmentButtonStyle}>
              📄 {roomText({ BA: "Dodaj PDF", DE: "PDF hinzufügen", EN: "Add PDF", UZ: "PDF qo‘shish", CZ: "Přidat PDF" }, "Add PDF")}
            </button>
          </div>

          {noteSelectedFile && (
            <div style={roomNoteSelectedFileStyle}>
              <span style={{ overflowWrap: "anywhere" }}>
                <strong>{roomText({ BA: "Odabrani fajl", DE: "Ausgewählte Datei", EN: "Selected file", UZ: "Tanlangan fayl", CZ: "Vybraný soubor" }, "Selected file")}:</strong> {noteSelectedFile.name}
              </span>
              <button type="button" onClick={clearRoomNoteFile} style={roomNoteRemoveFileButtonStyle}>✕</button>
            </div>
          )}

          {noteError && <div style={roomNoteErrorStyle}>{noteError}</div>}

          <div style={roomNoteFormBottomStyle}>
            <span style={roomNoteWorkerStyle}>👤 {worker.name}</span>
            <button type="button" disabled={noteSaving} onClick={() => void addRoomNote()} style={{ ...roomNoteAddButtonStyle, opacity: noteSaving ? 0.6 : 1 }}>
              {noteSaving
                ? roomText({ BA: "Spremanje...", DE: "Wird gespeichert...", EN: "Saving...", UZ: "Saqlanmoqda...", CZ: "Ukládání..." }, "Saving...")
                : `+ ${roomText({ BA: "Dodaj napomenu", DE: "Notiz hinzufügen", EN: "Add note", UZ: "Eslatma qo‘shish", CZ: "Přidat poznámku" }, "Add note")}`}
            </button>
          </div>

          <div style={roomNoteDividerStyle} />

          {noteLoading ? (
            <p style={mutedTextStyle}>{t.loading}</p>
          ) : roomNotes.length === 0 ? (
            <p style={mutedTextStyle}>
              {roomText({ BA: "Još nema napomena za ovu prostoriju.", DE: "Noch keine Notizen für diesen Raum vorhanden.", EN: "No notes have been added for this room yet.", UZ: "Bu xona uchun hali eslatmalar yo‘q.", CZ: "Pro tuto místnost zatím nejsou žádné poznámky." }, "No notes yet.")}
            </p>
          ) : (
            <div style={roomNotesListStyle}>
              {roomNotes.map((note) => (
                <article key={String(note.id)} style={roomNoteCardStyle}>
                  <div style={roomNoteHeaderStyle}>
                    <strong style={roomNoteAuthorStyle}>👤 {String(note.radnik || "-")}</strong>
                    <span style={roomNoteDateStyle}>{formatRoomNoteDate(String(note.created_at || ""))}</span>
                  </div>

                  {note.tekst && <div style={roomNoteSavedTextStyle}>{String(note.tekst)}</div>}

                  {note.link_url && (
                    <button type="button" onClick={() => openExternalUrl(String(note.link_url))} style={roomNoteSavedLinkStyle}>
                      🔗 {roomText({ BA: "Otvori link", DE: "Link öffnen", EN: "Open link", UZ: "Havolani ochish", CZ: "Otevřít odkaz" }, "Open link")}
                    </button>
                  )}

                  {note.file_url && note.file_type === "image" && (
                    <button type="button" onClick={() => openExternalUrl(String(note.file_url))} style={roomNoteImageButtonStyle}>
                      <img src={String(note.file_url)} alt={String(note.file_name || "Room note")} style={roomNoteImageStyle} />
                      {note.file_name && <span style={roomNoteFileNameStyle}>🖼️ {String(note.file_name)}</span>}
                    </button>
                  )}

                  {note.file_url && note.file_type === "pdf" && (
                    <button type="button" onClick={() => openExternalUrl(String(note.file_url))} style={roomNotePdfButtonStyle}>
                      📄 {String(note.file_name || "PDF")}
                      <span>{roomText({ BA: "Otvori PDF", DE: "PDF öffnen", EN: "Open PDF", UZ: "PDF ochish", CZ: "Otevřít PDF" }, "Open PDF")}</span>
                    </button>
                  )}

                  <div style={roomNoteFooterStyle}>
                    {roomText({ BA: "Upisao", DE: "Eingetragen von", EN: "Added by", UZ: "Kiritgan", CZ: "Zapsal" }, "Added by")}: {String(note.radnik || "-")}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    );
  }

  if (screen === "baustelle-detail" && selectedBaustelle) {
    const googleMapsUrl = getSpecialInfo("google_maps");
    const visualizationUrl = getSpecialInfo("visualization_3d");
    const visibleInfo = siteInfo.filter((row) => {
      if (row.type === "google_maps" || row.type === "visualization_3d") return false;
      return Boolean(getInfoValue(row));
    });

    return (
      <main style={dashboardPageStyle}>
        <header style={mobileHeaderStyle}>
          <div>
            <h1 style={siteDetailTitleStyle}>{getBaustelleTitle(selectedBaustelle)}</h1>
            <p style={welcomeStyle}>{getBaustelleLocation(selectedBaustelle)}</p>
          </div>
          <button type="button" onClick={() => setScreen("baustellen")} style={backButtonStyle}>
            {t.back}
          </button>
        </header>

        {siteDetailsLoading && <p style={mutedTextStyle}>{t.loading}</p>}

        {errorMessage && (
          <div style={errorBoxStyle}>
            <pre style={errorTextStyle}>{errorMessage}</pre>
          </div>
        )}

        <section style={siteSummaryStyle}>
          <div>
            <span style={detailLabelStyle}>{t.locationLabel}</span>
            <strong style={detailValueStyle}>{getBaustelleLocation(selectedBaustelle)}</strong>
          </div>
          <div>
            <span style={detailLabelStyle}>{t.statusLabel}</span>
            <strong style={detailValueStyle}>{getBaustelleStatus(selectedBaustelle)}</strong>
          </div>
        </section>

        {(googleMapsUrl || visualizationUrl) && (
          <section style={siteActionGridStyle}>
            {googleMapsUrl && (
              <button
                type="button"
                onClick={() => window.open(googleMapsUrl, "_blank")}
                style={{ ...siteActionButtonStyle, background: "#2563eb" }}
              >
                📍 {t.openMaps}
              </button>
            )}
            {visualizationUrl && (
              <button
                type="button"
                onClick={() => window.open(visualizationUrl, "_blank")}
                style={{ ...siteActionButtonStyle, background: "#7c3aed" }}
              >
                🏗️ {t.open3d}
              </button>
            )}
          </section>
        )}

        <section style={infoPanelStyle}>
          <h2 style={sectionTitleStyle}>ℹ️ {t.siteInfoLabel}</h2>
          {visibleInfo.length === 0 ? (
            <p style={mutedTextStyle}>{t.noSiteInfo}</p>
          ) : (
            <div style={detailListStyle}>
              {visibleInfo.map((row, index) => (
                <div key={String(row.id ?? `${row.type}-${index}`)} style={detailInfoCardStyle}>
                  <strong>{getInfoTitle(row)}</strong>
                  <span style={siteLocationStyle}>{getInfoValue(row)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={infoPanelStyle}>
          <h2 style={sectionTitleStyle}>🚪 {t.roomsLabel}</h2>
          {siteRooms.length === 0 ? (
            <p style={mutedTextStyle}>{t.noRooms}</p>
          ) : (
            <div style={roomGridStyle}>
              {siteRooms.map((room) => (
                <button
                  key={String(room.id)}
                  type="button"
                  onClick={() => openRoom(room)}
                  onTouchEnd={(event) => {
                    event.preventDefault();
                    openRoom(room);
                  }}
                  style={roomCardStyle}
                >
                  <strong>{getRoomTitle(room)}</strong>
                  <span style={roomOpenHintStyle}>›</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    );
  }

  if (screen === "baustellen") {
    return (
      <main style={dashboardPageStyle}>
        <header style={mobileHeaderStyle}>
          <div>
            <h1 style={titleStyle}>STONE BOUTIQUE</h1>
            <p style={welcomeStyle}>{t.welcome} {worker.name}</p>
          </div>
          <button type="button" onClick={() => setScreen("dashboard")} style={backButtonStyle}>
            {t.back}
          </button>
        </header>

        <section style={infoPanelStyle}>
          <h2 style={sectionTitleStyle}>🏗️ {t.site}</h2>

          {baustellenLoading && <p style={mutedTextStyle}>{t.loading}</p>}

          {!baustellenLoading && baustellen.length === 0 && (
            <p style={mutedTextStyle}>{t.noActiveSites}</p>
          )}

          <div style={siteListStyle}>
            {baustellen.map((site) => (
              <button
                key={String(site.id)}
                type="button"
                onClick={() => void openBaustelle(site)}
                style={siteCardStyle}
              >
                <strong>{getBaustelleTitle(site)}</strong>
                <span style={siteLocationStyle}>{getBaustelleLocation(site)}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={dashboardPageStyle}>
      <header style={mobileHeaderStyle}>
        <div>
          <h1 style={titleStyle}>STONE BOUTIQUE</h1>
          <p style={welcomeStyle}>{t.welcome} {worker.name}</p>
        </div>
      </header>

      <div style={languageRowStyle}>
        {(['DE', 'BA', 'UZ', 'CZ', 'EN'] as MobileLanguage[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => changeLanguage(item)}
            style={{
              ...languageButtonStyle,
              background: language === item ? '#f97316' : '#111827',
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <section style={menuGridStyle}>
        <button type="button" onClick={openBaustellen} style={{ ...menuButtonStyle, background: '#2563eb' }}>
          🏗️ {t.site}
        </button>

        <button type="button" onClick={() => notReady(t.myProjects)} style={{ ...menuButtonStyle, background: '#16a34a' }}>
          👷 {t.myProjects}
        </button>

        <button type="button" onClick={() => notReady(t.projects)} style={{ ...menuButtonStyle, background: '#f97316' }}>
          📁 {t.projects}
        </button>

        <button type="button" onClick={() => notReady(t.hours)} style={{ ...menuButtonStyle, background: '#2563eb' }}>
          ⏱️ {t.hours}
        </button>

        <button type="button" onClick={() => notReady(t.calendar)} style={{ ...menuButtonStyle, background: '#dc2626' }}>
          🗓️ {t.calendar}
        </button>

        <button type="button" onClick={() => notReady(t.cars)} style={{ ...menuButtonStyle, background: '#2563eb' }}>
          🚗 {t.cars}
        </button>

        <button type="button" onClick={() => notReady(t.info)} style={{ ...menuButtonStyle, background: '#2563eb' }}>
          📢 {t.info}
          <span style={smallButtonTextStyle}>0 {t.messages}</span>
        </button>

        <button type="button" onClick={() => notReady(t.privateNote)} style={{ ...menuButtonStyle, background: '#2563eb' }}>
          📝 {t.privateNote}
        </button>

        <button type="button" onClick={() => notReady(t.orderMaterial)} style={{ ...menuButtonStyle, background: '#2563eb' }}>
          🧱 {t.orderMaterial}
          <span style={smallButtonTextStyle}>0 {t.newLabel}</span>
        </button>

        <button type="button" onClick={logout} style={{ ...menuButtonStyle, background: '#dc2626' }}>
          🚪 {t.logout}
        </button>
      </section>

      <section style={infoPanelStyle}>
        <h2 style={sectionTitleStyle}>📢 {t.info}</h2>
        <p style={mutedTextStyle}>{t.noInfo}</p>
      </section>
    </main>
  );
}

const loadingPageStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#000000',
  color: '#ffffff',
};

const loadingBoxStyle: CSSProperties = {
  padding: '20px',
  borderRadius: '16px',
  background: '#111111',
  border: '1px solid #333333',
  fontWeight: 800,
};

const loginPageStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '22px',
  backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${BACKGROUND_URL})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  color: '#ffffff',
  boxSizing: 'border-box',
};

const loginCardStyle: CSSProperties = {
  width: '100%',
  maxWidth: '430px',
  padding: '24px',
  borderRadius: '22px',
  background: 'rgba(0,0,0,0.67)',
  border: '1px solid #f97316',
  boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
  boxSizing: 'border-box',
};

const loginLogoStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  maxWidth: '280px',
  height: 'auto',
  margin: '0 auto 12px',
};

const loginSubtitleStyle: CSSProperties = {
  margin: '0 0 6px',
  textAlign: 'center',
  fontWeight: 800,
};

const loginSecureStyle: CSSProperties = {
  margin: '0 0 24px',
  textAlign: 'center',
  color: '#22c55e',
  fontWeight: 800,
};

const loginLabelStyle: CSSProperties = {
  display: 'block',
  marginBottom: '8px',
  fontWeight: 800,
};

const loginInputStyle: CSSProperties = {
  width: '100%',
  height: '52px',
  padding: '0 14px',
  marginBottom: '18px',
  border: 'none',
  borderRadius: '13px',
  background: '#ffffff',
  color: '#111111',
  fontSize: '16px',
  boxSizing: 'border-box',
};

const passwordBoxStyle: CSSProperties = {
  position: 'relative',
  marginBottom: '18px',
};

const passwordInputStyle: CSSProperties = {
  ...loginInputStyle,
  marginBottom: 0,
  paddingRight: '54px',
};

const eyeButtonStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  right: '8px',
  transform: 'translateY(-50%)',
  width: '40px',
  height: '40px',
  border: 'none',
  background: 'transparent',
  fontSize: '20px',
};

const loginButtonStyle: CSSProperties = {
  width: '100%',
  minHeight: '54px',
  border: 'none',
  borderRadius: '14px',
  background: '#f97316',
  color: '#ffffff',
  fontSize: '17px',
  fontWeight: 900,
};

const dashboardPageStyle: CSSProperties = {
  minHeight: '100vh',
  padding: '18px 14px 28px',
  background: '#000000',
  color: '#ffffff',
  boxSizing: 'border-box',
};

const mobileHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  marginBottom: '12px',
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#f97316',
  fontSize: '28px',
  letterSpacing: '1px',
  fontWeight: 900,
};

const welcomeStyle: CSSProperties = {
  margin: '8px 0 0',
  color: '#ffffff',
  fontSize: '14px',
};

const languageRowStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginBottom: '18px',
};

const languageButtonStyle: CSSProperties = {
  minWidth: '38px',
  minHeight: '34px',
  padding: '6px 10px',
  border: '1px solid #374151',
  borderRadius: '8px',
  color: '#ffffff',
  fontWeight: 900,
};

const menuGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '9px',
  marginBottom: '20px',
};

const menuButtonStyle: CSSProperties = {
  minHeight: '58px',
  padding: '10px 8px',
  border: 'none',
  borderRadius: '10px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 900,
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2px',
  textAlign: 'center',
};

const smallButtonTextStyle: CSSProperties = {
  fontSize: '10px',
  fontWeight: 900,
  color: '#ffffff',
};

const infoPanelStyle: CSSProperties = {
  padding: '16px',
  borderRadius: '12px',
  background: '#0b0b0b',
  border: '1px solid #2b2b2b',
};

const sectionTitleStyle: CSSProperties = {
  margin: '0 0 14px',
  color: '#f97316',
  fontSize: '18px',
};

const mutedTextStyle: CSSProperties = {
  margin: 0,
  color: '#d1d5db',
  fontSize: '14px',
};

const errorBoxStyle: CSSProperties = {
  padding: '12px',
  marginBottom: '16px',
  borderRadius: '12px',
  border: '1px solid #ef4444',
  background: '#7f1d1d',
  color: '#ffffff',
};

const errorTextStyle: CSSProperties = {
  margin: 0,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  fontFamily: 'Arial, sans-serif',
  fontSize: '13px',
};

const backButtonStyle: CSSProperties = {
  minHeight: '40px',
  padding: '9px 13px',
  border: 'none',
  borderRadius: '10px',
  background: '#2563eb',
  color: '#ffffff',
  fontWeight: 900,
};

const siteListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const siteCardStyle: CSSProperties = {
  width: '100%',
  padding: '14px',
  border: '1px solid #2b2b2b',
  borderRadius: '12px',
  background: '#111111',
  color: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '6px',
  textAlign: 'left',
};

const siteLocationStyle: CSSProperties = {
  color: '#d1d5db',
  fontSize: '13px',
};

const siteDetailTitleStyle: CSSProperties = {
  margin: 0,
  color: "#f97316",
  fontSize: "24px",
  lineHeight: 1.15,
};

const siteSummaryStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
  marginBottom: "14px",
  padding: "14px",
  borderRadius: "16px",
  background: "#111111",
  border: "1px solid #27272a",
};

const detailLabelStyle: CSSProperties = {
  display: "block",
  marginBottom: "4px",
  color: "#9ca3af",
  fontSize: "11px",
  fontWeight: 700,
};

const detailValueStyle: CSSProperties = {
  display: "block",
  color: "#ffffff",
  fontSize: "13px",
  overflowWrap: "anywhere",
};

const siteActionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
  marginBottom: "14px",
};

const siteActionButtonStyle: CSSProperties = {
  border: "none",
  borderRadius: "13px",
  padding: "13px 10px",
  color: "#ffffff",
  fontWeight: 800,
  fontSize: "12px",
};

const detailListStyle: CSSProperties = {
  display: "grid",
  gap: "9px",
};

const detailInfoCardStyle: CSSProperties = {
  display: "grid",
  gap: "4px",
  padding: "11px",
  borderRadius: "12px",
  background: "#18181b",
  border: "1px solid #2f2f35",
  fontSize: "12px",
};

const roomActionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginTop: "18px",
};

const roomActionButtonStyle: CSSProperties = {
  border: "none",
  color: "#ffffff",
  borderRadius: "14px",
  padding: "22px 12px",
  fontSize: "16px",
  fontWeight: 800,
  minHeight: "78px",
  cursor: "pointer",
};

const roomOpenHintStyle: CSSProperties = {
  marginLeft: "auto",
  fontSize: "26px",
  lineHeight: 1,
  color: "#60a5fa",
};

const roomGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "9px",
};

const roomCardStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  textAlign: "left",
  padding: "12px",
  borderRadius: "12px",
  background: "#18181b",
  border: "1px solid #2f2f35",
  color: "#ffffff",
  fontSize: "12px",
  overflowWrap: "anywhere",
  cursor: "pointer",
  minHeight: "48px",
  touchAction: "manipulation",
  WebkitTapHighlightColor: "rgba(96,165,250,0.18)",
};

const roomNotesBoxStyle: CSSProperties = {
  marginTop: "18px",
  padding: "16px",
  borderRadius: "14px",
  background: "#111111",
  border: "1px solid #2b2b2b",
};

const roomNotesTitleStyle: CSSProperties = {
  margin: "0 0 14px",
  color: "#f97316",
  fontSize: "18px",
};

const roomNoteTextAreaStyle: CSSProperties = {
  width: "100%",
  minHeight: "100px",
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid #374151",
  background: "#1f1f1f",
  color: "#ffffff",
  fontSize: "14px",
  boxSizing: "border-box",
  resize: "vertical",
};

const roomNoteLinkInputStyle: CSSProperties = {
  width: "100%",
  minHeight: "46px",
  marginTop: "10px",
  padding: "10px 12px",
  borderRadius: "12px",
  border: "1px solid #374151",
  background: "#1f1f1f",
  color: "#ffffff",
  fontSize: "14px",
  boxSizing: "border-box",
};

const roomNoteAttachmentGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "8px",
  marginTop: "10px",
};

const roomNoteAttachmentButtonStyle: CSSProperties = {
  minHeight: "46px",
  padding: "8px",
  borderRadius: "10px",
  border: "1px solid #4b5563",
  background: "#374151",
  color: "#ffffff",
  fontWeight: 800,
  fontSize: "11px",
};

const roomNoteSelectedFileStyle: CSSProperties = {
  marginTop: "10px",
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #374151",
  background: "#1f2937",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  fontSize: "12px",
};

const roomNoteRemoveFileButtonStyle: CSSProperties = {
  width: "38px",
  minWidth: "38px",
  height: "38px",
  border: "none",
  borderRadius: "9px",
  background: "#b91c1c",
  color: "#ffffff",
  fontWeight: 900,
};

const roomNoteErrorStyle: CSSProperties = {
  marginTop: "10px",
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #7f1d1d",
  background: "#3f1515",
  color: "#fecaca",
  fontSize: "12px",
};

const roomNoteFormBottomStyle: CSSProperties = {
  marginTop: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
};

const roomNoteWorkerStyle: CSSProperties = {
  color: "#9ca3af",
  fontSize: "12px",
  fontWeight: 800,
};

const roomNoteAddButtonStyle: CSSProperties = {
  minHeight: "44px",
  padding: "9px 12px",
  border: "none",
  borderRadius: "10px",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 900,
  fontSize: "12px",
};

const roomNoteDividerStyle: CSSProperties = {
  height: "1px",
  background: "#2d2d2d",
  margin: "16px 0",
};

const roomNotesListStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const roomNoteCardStyle: CSSProperties = {
  padding: "12px",
  borderRadius: "12px",
  background: "#1d1d1d",
  border: "1px solid #333333",
  overflow: "hidden",
};

const roomNoteHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
  paddingBottom: "8px",
  borderBottom: "1px solid #333333",
};

const roomNoteAuthorStyle: CSSProperties = {
  color: "#60a5fa",
  fontSize: "12px",
};

const roomNoteDateStyle: CSSProperties = {
  color: "#9ca3af",
  fontSize: "10px",
};

const roomNoteSavedTextStyle: CSSProperties = {
  padding: "10px 0",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  lineHeight: 1.5,
  fontSize: "13px",
};

const roomNoteSavedLinkStyle: CSSProperties = {
  width: "100%",
  marginTop: "8px",
  padding: "10px",
  border: "none",
  borderRadius: "10px",
  background: "#172554",
  color: "#93c5fd",
  textAlign: "left",
  fontWeight: 800,
};

const roomNoteImageButtonStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: 0,
  marginTop: "10px",
  border: "none",
  background: "transparent",
  color: "#ffffff",
  textAlign: "left",
};

const roomNoteImageStyle: CSSProperties = {
  display: "block",
  width: "100%",
  maxHeight: "320px",
  objectFit: "contain",
  background: "#000000",
  borderRadius: "10px",
  border: "1px solid #333333",
};

const roomNoteFileNameStyle: CSSProperties = {
  display: "block",
  marginTop: "6px",
  color: "#d1d5db",
  fontSize: "11px",
  overflowWrap: "anywhere",
};

const roomNotePdfButtonStyle: CSSProperties = {
  width: "100%",
  marginTop: "10px",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #374151",
  background: "#111827",
  color: "#ffffff",
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  textAlign: "left",
  fontSize: "12px",
  fontWeight: 800,
};

const roomNoteFooterStyle: CSSProperties = {
  marginTop: "10px",
  paddingTop: "8px",
  borderTop: "1px solid #333333",
  color: "#9ca3af",
  fontSize: "10px",
};

export default App;


const featureInputStyle: CSSProperties = {
  width: "100%",
  minHeight: "48px",
  marginBottom: "10px",
  padding: "10px 12px",
  borderRadius: "12px",
  border: "1px solid #374151",
  background: "#ffffff",
  color: "#111827",
  fontSize: "15px",
  boxSizing: "border-box",
};

const featureTextAreaStyle: CSSProperties = {
  ...featureInputStyle,
  minHeight: "86px",
  resize: "vertical",
};

const featurePrimaryButtonStyle: CSSProperties = {
  width: "100%",
  minHeight: "48px",
  border: "none",
  borderRadius: "12px",
  background: "#f97316",
  color: "#ffffff",
  fontWeight: 900,
  fontSize: "15px",
};

const featureUploadButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  minHeight: "52px",
  borderRadius: "12px",
  background: "#16a34a",
  color: "#ffffff",
  fontWeight: 900,
  cursor: "pointer",
  boxSizing: "border-box",
};

const featureTwoColStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const featureListCardStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "12px",
  borderRadius: "12px",
  background: "#161616",
  border: "1px solid #2b2b2b",
};

const featureDeleteButtonStyle: CSSProperties = {
  width: "42px",
  minWidth: "42px",
  height: "42px",
  border: "none",
  borderRadius: "10px",
  background: "#b91c1c",
  color: "#ffffff",
  fontSize: "18px",
};

const photoGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
};

const photoCardStyle: CSSProperties = {
  overflow: "hidden",
  borderRadius: "12px",
  background: "#141414",
  border: "1px solid #2b2b2b",
};

const photoImageStyle: CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1",
  objectFit: "cover",
  display: "block",
};

const photoMetaStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  padding: "8px",
  fontSize: "12px",
};
