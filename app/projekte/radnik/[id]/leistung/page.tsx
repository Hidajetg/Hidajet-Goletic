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
  [key: string]: any;
};

const t: Record<Lang, any> = {
  de: {
    back: "Zurück",
    title: "Leistung",
    subtitle:
      "Leistung muss mit Raum und LV Position verbunden sein. Nur so kann die Arbeit richtig kontrolliert werden.",
    language: "Sprache",
    worker: "Angemeldeter Arbeiter",
    noWorker:
      "Kein Arbeiter angemeldet. Bitte zuerst über Login mit PIN anmelden.",
    date: "Datum",
    room: "Raum",
    selectRoom: "Raum auswählen",
    position: "LV Position",
    selectPosition: "LV Position auswählen",
    noPositions:
      "Keine LV Positionen vorhanden. Bitte zuerst im Admin LV Positionen hinzufügen oder importieren.",
    work: "Ausgeführte Arbeit",
    workPlaceholder: "Was wurde gemacht?",
    quantity: "Menge",
    unit: "Einheit",
    planned: "Geplant",
    doneBefore: "Bisher erfasst",
    remaining: "Rest",
    note: "Notiz",
    notePlaceholder: "Notiz zur Leistung",
    photos: "Fotos",
    photoTitle: "Foto Titel",
    photoNote: "Foto Notiz",
    addPhotos: "Fotos hinzufügen",
    save: "Leistung speichern",
    saving: "Speichern...",
    todayEntries: "Heutige Leistungen",
    noEntries: "Keine Leistungen für heute.",
    successSaved: "Leistung wurde gespeichert.",
    errors: {
      noWorker:
        "Kein Arbeiter angemeldet. Bitte zuerst über Login mit PIN anmelden.",
      selectRoom: "Bitte Raum auswählen.",
      selectPosition: "Bitte LV Position auswählen.",
      enterWork: "Bitte eintragen, was gemacht wurde.",
      enterQuantity: "Bitte Menge eintragen.",
      invalidQuantity: "Bitte gültige Menge eintragen.",
      duplicate: "Diese Leistung wurde bereits eingetragen.",
      saveFailed: "Leistung konnte nicht gespeichert werden.",
    },
  },
  ba: {
    back: "Nazad",
    title: "Urađeni posao",
    subtitle:
      "Urađeni posao mora biti povezan sa prostorijom i LV pozicijom. Samo tako možemo pravilno kontrolisati rad.",
    language: "Jezik",
    worker: "Prijavljeni radnik",
    noWorker:
      "Radnik nije prijavljen. Prvo se prijavi preko Login stranice sa PIN kodom.",
    date: "Datum",
    room: "Prostorija",
    selectRoom: "Odaberi prostoriju",
    position: "LV pozicija",
    selectPosition: "Odaberi LV poziciju",
    noPositions:
      "Nema LV pozicija. Prvo u adminu dodaj ili importuj LV pozicije.",
    work: "Šta je urađeno",
    workPlaceholder: "Upiši šta je urađeno",
    quantity: "Količina",
    unit: "Jedinica",
    planned: "Planirano",
    doneBefore: "Do sada uneseno",
    remaining: "Ostalo",
    note: "Napomena",
    notePlaceholder: "Napomena za urađeni posao",
    photos: "Slike",
    photoTitle: "Naziv slike",
    photoNote: "Opis slike",
    addPhotos: "Dodaj slike",
    save: "Spremi urađeni posao",
    saving: "Spremanje...",
    todayEntries: "Današnji urađeni poslovi",
    noEntries: "Nema unosa za danas.",
    successSaved: "Urađeni posao je spremljen.",
    errors: {
      noWorker:
        "Radnik nije prijavljen. Prvo se prijavi preko Login stranice sa PIN kodom.",
      selectRoom: "Odaberi prostoriju.",
      selectPosition: "Odaberi LV poziciju.",
      enterWork: "Upiši šta je urađeno.",
      enterQuantity: "Upiši količinu.",
      invalidQuantity: "Upiši ispravnu količinu.",
      duplicate: "Ovaj Leistung unos već postoji.",
      saveFailed: "Urađeni posao nije spremljen.",
    },
  },
  en: {
    back: "Back",
    title: "Work performance",
    subtitle:
      "Work performance must be connected to a room and LV position. This is required for correct control.",
    language: "Language",
    worker: "Logged-in worker",
    noWorker:
      "No worker is logged in. Please log in first with PIN on the Login page.",
    date: "Date",
    room: "Room",
    selectRoom: "Select room",
    position: "LV position",
    selectPosition: "Select LV position",
    noPositions:
      "No LV positions available. Please add or import LV positions in admin first.",
    work: "Work done",
    workPlaceholder: "Enter what was done",
    quantity: "Quantity",
    unit: "Unit",
    planned: "Planned",
    doneBefore: "Already entered",
    remaining: "Remaining",
    note: "Note",
    notePlaceholder: "Note for work performance",
    photos: "Photos",
    photoTitle: "Photo title",
    photoNote: "Photo note",
    addPhotos: "Add photos",
    save: "Save work performance",
    saving: "Saving...",
    todayEntries: "Today’s work performance",
    noEntries: "No entries for today.",
    successSaved: "Work performance was saved.",
    errors: {
      noWorker:
        "No worker is logged in. Please log in first with PIN on the Login page.",
      selectRoom: "Select room.",
      selectPosition: "Select LV position.",
      enterWork: "Enter what was done.",
      enterQuantity: "Enter quantity.",
      invalidQuantity: "Enter a valid quantity.",
      duplicate: "This work performance was already entered.",
      saveFailed: "Work performance could not be saved.",
    },
  },
  uz: {
    back: "Orqaga",
    title: "Bajarilgan ish",
    subtitle:
      "Bajarilgan ish xona va LV pozitsiya bilan bog‘lanishi kerak. Shunda ishni to‘g‘ri nazorat qilish mumkin.",
    language: "Til",
    worker: "Kirilgan ishchi",
    noWorker:
      "Ishchi tizimga kirmagan. Avval Login sahifasida PIN bilan kiring.",
    date: "Sana",
    room: "Xona",
    selectRoom: "Xonani tanlang",
    position: "LV pozitsiya",
    selectPosition: "LV pozitsiyani tanlang",
    noPositions:
      "LV pozitsiyalar yo‘q. Avval admin qismida LV pozitsiyalarni qo‘shing yoki import qiling.",
    work: "Qilingan ish",
    workPlaceholder: "Nima ish qilinganini yozing",
    quantity: "Miqdor",
    unit: "Birlik",
    planned: "Reja",
    doneBefore: "Oldin kiritilgan",
    remaining: "Qolgan",
    note: "Izoh",
    notePlaceholder: "Bajarilgan ish uchun izoh",
    photos: "Rasmlar",
    photoTitle: "Rasm nomi",
    photoNote: "Rasm izohi",
    addPhotos: "Rasm qo‘shish",
    save: "Bajarilgan ishni saqlash",
    saving: "Saqlanmoqda...",
    todayEntries: "Bugungi bajarilgan ishlar",
    noEntries: "Bugun yozuv yo‘q.",
    successSaved: "Bajarilgan ish saqlandi.",
    errors: {
      noWorker:
        "Ishchi tizimga kirmagan. Avval Login sahifasida PIN bilan kiring.",
      selectRoom: "Xonani tanlang.",
      selectPosition: "LV pozitsiyani tanlang.",
      enterWork: "Nima ish qilinganini yozing.",
      enterQuantity: "Miqdorni kiriting.",
      invalidQuantity: "To‘g‘ri miqdorni kiriting.",
      duplicate: "Bu bajarilgan ish allaqachon kiritilgan.",
      saveFailed: "Bajarilgan ishni saqlab bo‘lmadi.",
    },
  },
};

export default function RadnikLeistungPage() {
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
  const [fotos, setFotos] = useState<any[]>([]);

  const [worker, setWorker] = useState("");
  const [datum, setDatum] = useState(today());
  const [raumId, setRaumId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [arbeit, setArbeit] = useState("");
  const [menge, setMenge] = useState("");
  const [einheit, setEinheit] = useState("");
  const [notiz, setNotiz] = useState("");

  const [fotoTitel, setFotoTitel] = useState("");
  const [fotoNotiz, setFotoNotiz] = useState("");
  const [fotoFiles, setFotoFiles] = useState<File[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    const savedLang = getSavedLanguage();
    const loggedWorker = getLoggedWorker();

    setLang(savedLang);
    setWorker(loggedWorker);

    if (loggedWorker) {
      saveWorkerEverywhere(loggedWorker);
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

  function getRoomStatus(row: any) {
    return row.status || "";
  }

  function getRoomEtage(row: any) {
    return row.etage || row.floor || "";
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

  function getPositionPlanned(row: any) {
    return (
      row.menge_geplant ||
      row.planned_quantity ||
      row.quantity_planned ||
      row.menge ||
      row.quantity ||
      0
    );
  }

  function getEntryWorker(row: any) {
    return (
      row.radnik ||
      row.worker ||
      row.worker_name ||
      row.arbeiter ||
      row.mitarbeiter ||
      row.name ||
      ""
    );
  }

  function getEntryTitle(row: any) {
    return (
      row.arbeit ||
      row.titel ||
      row.title ||
      row.leistung ||
      row.position_titel ||
      ""
    );
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

  function formatNumber(value: any) {
    const n = toNumber(value);
    return n.toFixed(2).replace(".", ",").replace(",00", "");
  }

  async function loadAll(workerName = worker, dateValue = datum) {
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
        .or(
          `projekt_id.eq.${String(projektId)},project_id.eq.${String(
            projektId
          )},baustelle_id.eq.${String(projektId)}`
        )
        .order("id", { ascending: true });

      if (!error && data && data.length > 0) {
        finalRows = data;
        break;
      }
    }

    setRaeume(finalRows || []);
  }

  async function loadPositionen() {
    const { data, error } = await supabase
      .from("positionen")
      .select("*")
      .or(
        `projekt_id.eq.${String(projektId)},project_id.eq.${String(
          projektId
        )},baustelle_id.eq.${String(projektId)}`
      )
      .order("position_nr", { ascending: true });

    if (!error) {
      setPositionen(data || []);
      return;
    }

    setPositionen([]);
  }

  async function loadEntries(workerName = worker, dateValue = datum) {
    const { data, error } = await supabase
      .from("leistungen")
      .select("*")
      .eq("projekt_id", String(projektId))
      .eq("datum", dateValue)
      .order("created_at", { ascending: false });

    if (error) {
      setEntries([]);
      return;
    }

    const w = String(workerName || "").toLowerCase();

    setEntries(
      (data || []).filter((row: any) => {
        return !w || String(getEntryWorker(row)).toLowerCase() === w;
      })
    );
  }

  async function loadFotos() {
    const { data, error } = await supabase
      .from("fotos")
      .select("*")
      .eq("projekt_id", String(projektId))
      .order("created_at", { ascending: false });

    if (!error) {
      setFotos(data || []);
      return;
    }

    setFotos([]);
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

  const alreadyDoneForPosition = useMemo(() => {
    if (!positionId) return 0;

    return entries
      .filter((row: any) => {
        return (
          String(row.position_id || row.lv_position_id || "") ===
          String(positionId)
        );
      })
      .reduce((sum, row) => sum + toNumber(row.menge || row.quantity || 0), 0);
  }, [entries, positionId]);

  const plannedQty = useMemo(() => {
    if (!selectedPosition) return 0;
    return toNumber(getPositionPlanned(selectedPosition));
  }, [selectedPosition]);

  const remainingQty = useMemo(() => {
    return plannedQty - alreadyDoneForPosition - toNumber(menge);
  }, [plannedQty, alreadyDoneForPosition, menge]);

  const unitFromPosition = useMemo(() => {
    if (!selectedPosition) return "";
    return getPositionEinheit(selectedPosition);
  }, [selectedPosition]);

  function isDuplicate() {
    return entries.some((row: any) => {
      return (
        String(row.datum) === String(datum) &&
        String(getEntryWorker(row)).toLowerCase() === worker.toLowerCase() &&
        String(row.raum_id || "") === String(raumId) &&
        String(row.position_id || "") === String(positionId) &&
        toNumber(row.menge || row.quantity || 0) === toNumber(menge)
      );
    });
  }

  async function uploadFotos(savedLeistungId: number | string) {
    if (fotoFiles.length === 0) return;

    for (const file of fotoFiles) {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${projektId}/leistung-${savedLeistungId}-${Date.now()}-${cleanName}`;

      const buckets = ["fotos", "photos", "bilder"];
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
        baustelle_id: String(projektId),

        datum,
        date: datum,

        radnik: worker.trim(),
        arbeiter: worker.trim(),
        worker: worker.trim(),
        worker_name: worker.trim(),
        name: worker.trim(),

        leistung_id: String(savedLeistungId),
        relation_type: "leistung",

        raum_id: String(raumId),
        room_id: String(raumId),
        raum_name: selectedRoom ? getRoomName(selectedRoom) : "",
        room_name: selectedRoom ? getRoomName(selectedRoom) : "",

        position_id: String(positionId),
        lv_position_id: String(positionId),
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

        typ: "Leistung",
        type: "Leistung",
        status: "Wartet",
      };

      await supabase.from("fotos").insert(payload as any);
    }
  }

  async function saveLeistung() {
    if (saving) return;

    if (!worker.trim()) {
      showError("noWorker");
      return;
    }

    if (!raumId) {
      showError("selectRoom");
      return;
    }

    if (!positionId) {
      showError("selectPosition");
      return;
    }

    if (!arbeit.trim()) {
      showError("enterWork");
      return;
    }

    if (!menge.trim()) {
      showError("enterQuantity");
      return;
    }

    const quantity = toNumber(menge);

    if (quantity <= 0) {
      showError("invalidQuantity");
      return;
    }

    if (isDuplicate()) {
      showError("duplicate");
      return;
    }

    setSaving(true);
    setErrorText("");
    setMessageText("");

    const unit = einheit.trim() || unitFromPosition || "";

    const payload = {
      projekt_id: String(projektId),
      project_id: String(projektId),
      baustelle_id: String(projektId),

      datum,
      date: datum,

      radnik: worker.trim(),
      arbeiter: worker.trim(),
      worker: worker.trim(),
      worker_name: worker.trim(),
      name: worker.trim(),

      raum_id: String(raumId),
      room_id: String(raumId),
      raum_name: selectedRoom ? getRoomName(selectedRoom) : "",
      room_name: selectedRoom ? getRoomName(selectedRoom) : "",

      position_id: String(positionId),
      lv_position_id: String(positionId),
      position_nr: selectedPosition ? getPositionNr(selectedPosition) : "",
      lv_nr: selectedPosition ? getPositionNr(selectedPosition) : "",
      position_titel: selectedPosition ? getPositionTitle(selectedPosition) : "",
      position_title: selectedPosition ? getPositionTitle(selectedPosition) : "",

      arbeit: arbeit.trim(),
      titel: arbeit.trim(),
      title: arbeit.trim(),
      leistung: arbeit.trim(),

      beschreibung: selectedPosition ? getPositionDescription(selectedPosition) : "",
      description: selectedPosition ? getPositionDescription(selectedPosition) : "",

      menge: quantity,
      quantity,
      kolicina: quantity,

      einheit: unit,
      unit,
      jedinica: unit,

      notiz: notiz.trim(),
      note: notiz.trim(),
      bemerkung: notiz.trim(),

      status: "Wartet",
      freigabe_status: "Wartet",
      approval_status: "Wartet",
    };

    const { data, error } = await supabase
      .from("leistungen")
      .insert(payload as any)
      .select("*")
      .maybeSingle();

    if (error) {
      setSaving(false);
      showError("saveFailed");
      return;
    }

    if (data?.id && fotoFiles.length > 0) {
      await uploadFotos(data.id);
    }

    setArbeit("");
    setMenge("");
    setEinheit("");
    setNotiz("");
    setFotoTitel("");
    setFotoNotiz("");
    setFotoFiles([]);

    showSuccess("successSaved");
    await loadEntries(worker, datum);
    await loadFotos();
    setSaving(false);
  }

  function getFotosForLeistung(leistungId: any) {
    return fotos.filter((foto: any) => {
      return String(foto.leistung_id || "") === String(leistungId);
    });
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

        {worker ? (
          <div className="workerBox">👷 {worker}</div>
        ) : (
          <div className="warningBox">{tr("noWorker")}</div>
        )}

        <label>{tr("date")}</label>
        <input
          type="date"
          value={datum}
          onChange={(e) => {
            const nextDate = e.target.value;
            setDatum(nextDate);
            loadEntries(worker, nextDate);
          }}
        />

        <label>{tr("room")}</label>
        <select
          value={raumId}
          onChange={(e) => {
            setRaumId(e.target.value);
            setPositionId("");
            setArbeit("");
            setEinheit("");
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

        <label>{tr("position")}</label>
        <select
          value={positionId}
          onChange={(e) => {
            const id = e.target.value;
            const pos = positionen.find((row: any) => String(row.id) === String(id));

            setPositionId(id);

            if (pos) {
              setArbeit(getPositionTitle(pos));
              setEinheit(getPositionEinheit(pos));
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

        <label>{tr("work")}</label>
        <input
          value={arbeit}
          onChange={(e) => setArbeit(e.target.value)}
          placeholder={tr("workPlaceholder")}
        />

        <div className="qtyGrid">
          <div>
            <label>{tr("quantity")}</label>
            <input
              value={menge}
              onChange={(e) => setMenge(e.target.value)}
              inputMode="decimal"
              placeholder="0"
            />
          </div>

          <div>
            <label>{tr("unit")}</label>
            <input
              value={einheit || unitFromPosition}
              onChange={(e) => setEinheit(e.target.value)}
              placeholder="m²"
            />
          </div>
        </div>

        <div className="calcGrid">
          <div>
            <span>{tr("planned")}</span>
            <strong>
              {formatNumber(plannedQty)} {unitFromPosition}
            </strong>
          </div>

          <div>
            <span>{tr("doneBefore")}</span>
            <strong>
              {formatNumber(alreadyDoneForPosition)} {unitFromPosition}
            </strong>
          </div>

          <div>
            <span>{tr("remaining")}</span>
            <strong>
              {formatNumber(remainingQty)} {unitFromPosition}
            </strong>
          </div>
        </div>

        <label>{tr("note")}</label>
        <textarea
          value={notiz}
          onChange={(e) => setNotiz(e.target.value)}
          placeholder={tr("notePlaceholder")}
        />

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

        <button className="saveBtn" onClick={saveLeistung} disabled={saving}>
          {saving ? tr("saving") : tr("save")}
        </button>
      </section>

      <section className="todayBox">
        <div className="todayTop">
          <h2>{tr("todayEntries")}</h2>
          <button onClick={() => loadEntries(worker, datum)} type="button">
            {loading ? "..." : "↻"}
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="empty">{tr("noEntries")}</p>
        ) : (
          <div className="entryList">
            {entries.map((row: any) => {
              const entryFotos = getFotosForLeistung(row.id);

              return (
                <div key={row.id}>
                  <b>{getEntryTitle(row) || "-"}</b>

                  <span>
                    {formatNumber(row.menge || row.quantity || 0)}{" "}
                    {row.einheit || row.unit || ""}
                  </span>

                  <small>
                    {tr("room")}: {row.raum_name || row.room_name || "-"}
                  </small>

                  <small>
                    {tr("position")}: {row.position_nr || row.lv_nr || "-"} ·{" "}
                    {row.position_titel || row.position_title || "-"}
                  </small>

                  {row.notiz && <p>{row.notiz}</p>}

                  {entryFotos.length > 0 && (
                    <div className="miniPhotos">
                      {entryFotos.slice(0, 4).map((foto: any) => (
                        <img
                          key={foto.id}
                          src={getFotoUrl(foto)}
                          alt={foto.titel || foto.title || "Foto"}
                        />
                      ))}
                    </div>
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
        .todayBox {
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
        .todayBox {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 20px;
          padding: 16px;
          margin-bottom: 16px;
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

        .langGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .langGrid button {
          background: #1f2937;
          color: white;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 14px;
          font-weight: 900;
        }

        .langGrid .active {
          background: #2563eb;
          border-color: #60a5fa;
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

        .qtyGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
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
          background: #2563eb;
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

          .qtyGrid {
            grid-template-columns: 1fr 150px;
            gap: 12px;
          }

          .calcGrid {
            grid-template-columns: repeat(3, 1fr);
          }

          .miniPhotos {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>
    </main>
  );
}