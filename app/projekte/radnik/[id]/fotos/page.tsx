"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Lang = "de" | "ba" | "en" | "uz";
type RelationType = "projekt" | "raum" | "position" | "leistung" | "regie";

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

const WORKERS = ["Arnes", "Ramiz", "Abror", "Shohruh", "Harun"];

const t: Record<Lang, any> = {
  de: {
    back: "Zurück",
    title: "Fotos",
    subtitle:
      "Fotos müssen mit Projekt, Raum, LV Position, Leistung oder Regie verbunden sein.",
    language: "Sprache",
    worker: "Arbeiter",
    selectWorker: "Arbeiter auswählen",
    date: "Datum",
    relation: "Foto gehört zu",
    project: "Projekt",
    room: "Raum",
    position: "LV Position",
    performance: "Leistung",
    regie: "Regie",
    selectRoom: "Raum auswählen",
    selectPosition: "LV Position auswählen",
    selectPerformance: "Leistung auswählen",
    selectRegie: "Regie auswählen",
    photoType: "Foto Typ",
    before: "Vorher",
    during: "Während",
    after: "Nachher",
    problem: "Problem",
    proof: "Nachweis",
    titleInput: "Foto Titel",
    titlePlaceholder: "z.B. Bad Wand vorher",
    description: "Beschreibung",
    descriptionPlaceholder: "Kurze Beschreibung zum Foto",
    addPhotos: "Fotos auswählen",
    save: "Fotos speichern",
    saving: "Speichern...",
    todayPhotos: "Heutige Fotos",
    noPhotos: "Keine Fotos für heute.",
    successSaved: "Fotos wurden gespeichert.",
    errors: {
      selectWorker: "Bitte Arbeiter auswählen.",
      selectRelation: "Bitte auswählen, wozu das Foto gehört.",
      selectRoom: "Bitte Raum auswählen.",
      selectPosition: "Bitte LV Position auswählen.",
      selectPerformance: "Bitte Leistung auswählen.",
      selectRegie: "Bitte Regie auswählen.",
      selectFiles: "Bitte Fotos auswählen.",
      saveFailed: "Fotos konnten nicht gespeichert werden.",
      sqlMissing:
        "Datenbank ist nicht komplett. Bitte SQL 001_kontrola_radnika_lv_regie ausführen.",
    },
  },
  ba: {
    back: "Nazad",
    title: "Slike",
    subtitle:
      "Slike moraju biti povezane sa projektom, prostorijom, LV pozicijom, Leistung ili Regie.",
    language: "Jezik",
    worker: "Radnik",
    selectWorker: "Odaberi radnika",
    date: "Datum",
    relation: "Slika pripada",
    project: "Projekt",
    room: "Prostorija",
    position: "LV pozicija",
    performance: "Urađeni posao",
    regie: "Regie",
    selectRoom: "Odaberi prostoriju",
    selectPosition: "Odaberi LV poziciju",
    selectPerformance: "Odaberi urađeni posao",
    selectRegie: "Odaberi Regie",
    photoType: "Tip slike",
    before: "Prije",
    during: "Tokom",
    after: "Poslije",
    problem: "Problem",
    proof: "Dokaz",
    titleInput: "Naziv slike",
    titlePlaceholder: "npr. Kupatilo zid prije",
    description: "Opis",
    descriptionPlaceholder: "Kratak opis slike",
    addPhotos: "Odaberi slike",
    save: "Spremi slike",
    saving: "Spremanje...",
    todayPhotos: "Današnje slike",
    noPhotos: "Nema slika za danas.",
    successSaved: "Slike su spremljene.",
    errors: {
      selectWorker: "Odaberi radnika.",
      selectRelation: "Odaberi gdje slika pripada.",
      selectRoom: "Odaberi prostoriju.",
      selectPosition: "Odaberi LV poziciju.",
      selectPerformance: "Odaberi urađeni posao.",
      selectRegie: "Odaberi Regie.",
      selectFiles: "Odaberi slike.",
      saveFailed: "Slike nisu spremljene.",
      sqlMissing:
        "Baza nije kompletna. Prvo pokreni SQL 001_kontrola_radnika_lv_regie.",
    },
  },
  en: {
    back: "Back",
    title: "Photos",
    subtitle:
      "Photos must be connected to project, room, LV position, performance or Regie.",
    language: "Language",
    worker: "Worker",
    selectWorker: "Select worker",
    date: "Date",
    relation: "Photo belongs to",
    project: "Project",
    room: "Room",
    position: "LV position",
    performance: "Work performance",
    regie: "Regie",
    selectRoom: "Select room",
    selectPosition: "Select LV position",
    selectPerformance: "Select work performance",
    selectRegie: "Select Regie",
    photoType: "Photo type",
    before: "Before",
    during: "During",
    after: "After",
    problem: "Problem",
    proof: "Proof",
    titleInput: "Photo title",
    titlePlaceholder: "e.g. Bathroom wall before",
    description: "Description",
    descriptionPlaceholder: "Short photo description",
    addPhotos: "Select photos",
    save: "Save photos",
    saving: "Saving...",
    todayPhotos: "Today’s photos",
    noPhotos: "No photos for today.",
    successSaved: "Photos were saved.",
    errors: {
      selectWorker: "Select worker.",
      selectRelation: "Select what the photo belongs to.",
      selectRoom: "Select room.",
      selectPosition: "Select LV position.",
      selectPerformance: "Select work performance.",
      selectRegie: "Select Regie.",
      selectFiles: "Select photos.",
      saveFailed: "Photos could not be saved.",
      sqlMissing:
        "Database is not complete. Run SQL 001_kontrola_radnika_lv_regie first.",
    },
  },
  uz: {
    back: "Orqaga",
    title: "Rasmlar",
    subtitle:
      "Rasmlar loyiha, xona, LV pozitsiya, bajarilgan ish yoki Regie bilan bog‘lanishi kerak.",
    language: "Til",
    worker: "Ishchi",
    selectWorker: "Ishchini tanlang",
    date: "Sana",
    relation: "Rasm nimaga tegishli",
    project: "Loyiha",
    room: "Xona",
    position: "LV pozitsiya",
    performance: "Bajarilgan ish",
    regie: "Regie",
    selectRoom: "Xonani tanlang",
    selectPosition: "LV pozitsiyani tanlang",
    selectPerformance: "Bajarilgan ishni tanlang",
    selectRegie: "Regie tanlang",
    photoType: "Rasm turi",
    before: "Oldin",
    during: "Jarayonda",
    after: "Keyin",
    problem: "Muammo",
    proof: "Dalil",
    titleInput: "Rasm nomi",
    titlePlaceholder: "masalan: Hammom devori oldin",
    description: "Tavsif",
    descriptionPlaceholder: "Rasm uchun qisqa tavsif",
    addPhotos: "Rasmlarni tanlash",
    save: "Rasmlarni saqlash",
    saving: "Saqlanmoqda...",
    todayPhotos: "Bugungi rasmlar",
    noPhotos: "Bugun rasm yo‘q.",
    successSaved: "Rasmlar saqlandi.",
    errors: {
      selectWorker: "Ishchini tanlang.",
      selectRelation: "Rasm nimaga tegishli ekanini tanlang.",
      selectRoom: "Xonani tanlang.",
      selectPosition: "LV pozitsiyani tanlang.",
      selectPerformance: "Bajarilgan ishni tanlang.",
      selectRegie: "Regie tanlang.",
      selectFiles: "Rasmlarni tanlang.",
      saveFailed: "Rasmlarni saqlab bo‘lmadi.",
      sqlMissing:
        "Baza to‘liq emas. Avval SQL 001_kontrola_radnika_lv_regie ni ishga tushiring.",
    },
  },
};

export default function RadnikFotosPage() {
  const params = useParams();

  const projektId = String(params.id);
  const projektIdValue = isNaN(Number(projektId))
    ? projektId
    : Number(projektId);

  const [lang, setLang] = useState<Lang>("de");
  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [raeume, setRaeume] = useState<any[]>([]);
  const [positionen, setPositionen] = useState<any[]>([]);
  const [leistungen, setLeistungen] = useState<any[]>([]);
  const [regieRows, setRegieRows] = useState<any[]>([]);
  const [fotos, setFotos] = useState<any[]>([]);

  const [worker, setWorker] = useState("");
  const [datum, setDatum] = useState(today());
  const [relationType, setRelationType] = useState<RelationType>("projekt");
  const [raumId, setRaumId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [leistungId, setLeistungId] = useState("");
  const [regieId, setRegieId] = useState("");
  const [fotoTyp, setFotoTyp] = useState("proof");
  const [titel, setTitel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [fotoFiles, setFotoFiles] = useState<File[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    const savedLang = (localStorage.getItem("appLanguage") || "de") as Lang;
    const savedWorker =
      localStorage.getItem("workerName") ||
      localStorage.getItem("radnik") ||
      "";

    if (["de", "ba", "en", "uz"].includes(savedLang)) {
      setLang(savedLang);
    }

    if (savedWorker) {
      setWorker(savedWorker);
    }

    loadAll(savedWorker);
  }, [projektId]);

  function today() {
    const d = new Date();

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function tr(key: string) {
    return t[lang]?.[key] || t.de[key] || key;
  }

  function err(key: string) {
    return t[lang]?.errors?.[key] || t.de.errors[key] || key;
  }

  function showError(key: string) {
    setMessageText("");
    setErrorText(err(key));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showSuccess(key: string) {
    setErrorText("");
    setMessageText(t[lang]?.[key] || t.de[key] || key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function changeLang(next: Lang) {
    setLang(next);
    localStorage.setItem("appLanguage", next);
  }

  function changeWorker(next: string) {
    setWorker(next);
    localStorage.setItem("workerName", next);
    localStorage.setItem("radnik", next);
  }

  function getProjektName() {
    if (!projekt) return "Projekt";

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

  function getPositionNr(row: any) {
    return row.position_nr || row.nr || row.pos || row.lv_nr || row.number || "";
  }

  function getPositionTitle(row: any) {
    return (
      row.titel ||
      row.title ||
      row.kurztext ||
      row.name ||
      row.beschreibung ||
      row.description ||
      "LV Position"
    );
  }

  function getLeistungTitle(row: any) {
    return (
      row.arbeit ||
      row.titel ||
      row.title ||
      row.leistung ||
      row.position_titel ||
      "Leistung"
    );
  }

  function getRegieTitle(row: any) {
    return row.arbeit || row.title || row.regiearbeit || row.beschreibung || "Regie";
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

  function getFotoTitle(row: any) {
    return row.titel || row.title || row.name || "Foto";
  }

  function getFotoText(row: any) {
    return row.beschreibung || row.description || row.notiz || row.note || "";
  }

  async function loadAll(workerName = worker) {
    setLoading(true);
    setErrorText("");
    setMessageText("");

    await loadProjekt();
    await loadRaeume();
    await loadPositionen();
    await loadLeistungen(workerName);
    await loadRegie(workerName);
    await loadFotos(workerName);

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
    const { data, error } = await supabase
      .from("raeume")
      .select("*")
      .eq("projekt_id", String(projektId))
      .order("id", { ascending: true });

    if (!error) {
      setRaeume(data || []);
      return;
    }

    setRaeume([]);
  }

  async function loadPositionen() {
    const { data, error } = await supabase
      .from("positionen")
      .select("*")
      .eq("projekt_id", String(projektId))
      .order("position_nr", { ascending: true });

    if (!error) {
      setPositionen(data || []);
      return;
    }

    setPositionen([]);
  }

  async function loadLeistungen(workerName = worker) {
    const { data, error } = await supabase
      .from("leistungen")
      .select("*")
      .eq("projekt_id", String(projektId))
      .order("created_at", { ascending: false });

    if (error) {
      setLeistungen([]);
      return;
    }

    const w = String(workerName || "").toLowerCase();

    setLeistungen(
      (data || []).filter((row) => {
        const rowWorker = row.radnik || row.worker || row.arbeiter || row.name || "";
        return !w || String(rowWorker).toLowerCase() === w;
      })
    );
  }

  async function loadRegie(workerName = worker) {
    const { data, error } = await supabase
      .from("regie")
      .select("*")
      .eq("projekt_id", String(projektId))
      .order("created_at", { ascending: false });

    if (error) {
      setRegieRows([]);
      return;
    }

    const w = String(workerName || "").toLowerCase();

    setRegieRows(
      (data || []).filter((row) => {
        return (
          !w ||
          String(row.workers_text || row.worker_names || row.radnik || "")
            .toLowerCase()
            .includes(w)
        );
      })
    );
  }

  async function loadFotos(workerName = worker) {
    const { data, error } = await supabase
      .from("fotos")
      .select("*")
      .eq("projekt_id", String(projektId))
      .eq("datum", datum)
      .order("created_at", { ascending: false });

    if (error) {
      setFotos([]);
      return;
    }

    const w = String(workerName || "").toLowerCase();

    setFotos(
      (data || []).filter((row) => {
        const rowWorker = row.radnik || row.worker || row.arbeiter || row.name || "";
        return !w || String(rowWorker).toLowerCase() === w;
      })
    );
  }

  const selectedRoom = useMemo(() => {
    return raeume.find((row) => String(row.id) === String(raumId));
  }, [raeume, raumId]);

  const selectedPosition = useMemo(() => {
    return positionen.find((row) => String(row.id) === String(positionId));
  }, [positionen, positionId]);

  const selectedLeistung = useMemo(() => {
    return leistungen.find((row) => String(row.id) === String(leistungId));
  }, [leistungen, leistungId]);

  const selectedRegie = useMemo(() => {
    return regieRows.find((row) => String(row.id) === String(regieId));
  }, [regieRows, regieId]);

  const filteredPositionen = useMemo(() => {
    if (!raumId) return positionen;

    return positionen.filter((row) => {
      const rowRaumId = row.raum_id || row.room_id || "";
      return !rowRaumId || String(rowRaumId) === String(raumId);
    });
  }, [positionen, raumId]);

  function resetRelationFields(nextType: RelationType) {
    setRelationType(nextType);

    if (nextType === "projekt") {
      setRaumId("");
      setPositionId("");
      setLeistungId("");
      setRegieId("");
    }

    if (nextType === "raum") {
      setPositionId("");
      setLeistungId("");
      setRegieId("");
    }

    if (nextType === "position") {
      setLeistungId("");
      setRegieId("");
    }

    if (nextType === "leistung") {
      setRegieId("");
    }

    if (nextType === "regie") {
      setLeistungId("");
    }
  }

  async function uploadOneFile(file: File) {
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${projektId}/foto-${Date.now()}-${cleanName}`;

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

    return { publicUrl, usedBucket, path };
  }

  async function saveFotos() {
    if (saving) return;

    if (!worker.trim()) {
      showError("selectWorker");
      return;
    }

    if (!relationType) {
      showError("selectRelation");
      return;
    }

    if (
      relationType === "raum" ||
      relationType === "position" ||
      relationType === "leistung" ||
      relationType === "regie"
    ) {
      if (!raumId && relationType !== "leistung" && relationType !== "regie") {
        showError("selectRoom");
        return;
      }
    }

    if (relationType === "position" && !positionId) {
      showError("selectPosition");
      return;
    }

    if (relationType === "leistung" && !leistungId) {
      showError("selectPerformance");
      return;
    }

    if (relationType === "regie" && !regieId) {
      showError("selectRegie");
      return;
    }

    if (fotoFiles.length === 0) {
      showError("selectFiles");
      return;
    }

    setSaving(true);
    setErrorText("");
    setMessageText("");

    for (const file of fotoFiles) {
      const uploaded = await uploadOneFile(file);

      if (!uploaded.publicUrl) {
        continue;
      }

      const finalRaumId =
        relationType === "leistung"
          ? selectedLeistung?.raum_id || selectedLeistung?.room_id || ""
          : relationType === "regie"
          ? selectedRegie?.raum_id || selectedRegie?.room_id || ""
          : raumId;

      const finalRaumName =
        relationType === "leistung"
          ? selectedLeistung?.raum_name || selectedLeistung?.room_name || ""
          : relationType === "regie"
          ? selectedRegie?.raum_name || selectedRegie?.room_name || ""
          : selectedRoom
          ? getRoomName(selectedRoom)
          : "";

      const finalPositionId =
        relationType === "leistung"
          ? selectedLeistung?.position_id || selectedLeistung?.lv_position_id || ""
          : relationType === "regie"
          ? selectedRegie?.position_id || selectedRegie?.lv_position_id || ""
          : positionId;

      const finalPositionNr =
        relationType === "leistung"
          ? selectedLeistung?.position_nr || selectedLeistung?.lv_nr || ""
          : relationType === "regie"
          ? selectedRegie?.position_nr || selectedRegie?.lv_nr || ""
          : selectedPosition
          ? getPositionNr(selectedPosition)
          : "";

      const finalPositionTitle =
        relationType === "leistung"
          ? selectedLeistung?.position_titel || selectedLeistung?.position_title || ""
          : relationType === "regie"
          ? selectedRegie?.position_titel || selectedRegie?.position_title || ""
          : selectedPosition
          ? getPositionTitle(selectedPosition)
          : "";

      const payload = {
        projekt_id: String(projektId),
        project_id: String(projektId),
        baustelle_id: String(projektId),

        datum,
        date: datum,

        radnik: worker.trim(),
        arbeiter: worker.trim(),
        worker: worker.trim(),
        name: worker.trim(),

        relation_type: relationType,
        bezug: relationType,

        raum_id: finalRaumId ? String(finalRaumId) : "",
        room_id: finalRaumId ? String(finalRaumId) : "",
        raum_name: finalRaumName,
        room_name: finalRaumName,

        position_id: finalPositionId ? String(finalPositionId) : "",
        lv_position_id: finalPositionId ? String(finalPositionId) : "",
        position_nr: finalPositionNr,
        lv_nr: finalPositionNr,
        position_titel: finalPositionTitle,
        position_title: finalPositionTitle,

        leistung_id: relationType === "leistung" ? String(leistungId) : "",
        regie_id: relationType === "regie" ? String(regieId) : "",

        typ: fotoTyp,
        type: fotoTyp,
        foto_typ: fotoTyp,
        photo_type: fotoTyp,

        titel: titel.trim() || file.name,
        title: titel.trim() || file.name,
        beschreibung: beschreibung.trim(),
        description: beschreibung.trim(),
        notiz: beschreibung.trim(),
        note: beschreibung.trim(),

        url: uploaded.publicUrl,
        image_url: uploaded.publicUrl,
        foto_url: uploaded.publicUrl,
        photo_url: uploaded.publicUrl,
        public_url: uploaded.publicUrl,

        bucket: uploaded.usedBucket,
        path: uploaded.path,
        file_path: uploaded.path,
        storage_path: uploaded.path,

        status: "Wartet",
        freigabe_status: "Wartet",
        approval_status: "Wartet",
      };

      const { error } = await supabase.from("fotos").insert(payload as any);

      if (error) {
        setSaving(false);
        showError("saveFailed");
        return;
      }
    }

    setTitel("");
    setBeschreibung("");
    setFotoFiles([]);

    showSuccess("successSaved");
    await loadFotos(worker);
    setSaving(false);
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
            >
              {x.toUpperCase()}
            </button>
          ))}
        </div>

        <label>{tr("worker")}</label>
        <select value={worker} onChange={(e) => changeWorker(e.target.value)}>
          <option value="">{tr("selectWorker")}</option>

          {WORKERS.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>

        <label>{tr("date")}</label>
        <input
          type="date"
          value={datum}
          onChange={(e) => {
            setDatum(e.target.value);
            setTimeout(() => loadFotos(worker), 50);
          }}
        />

        <label>{tr("relation")}</label>
        <div className="relationGrid">
          {[
            { key: "projekt", label: tr("project") },
            { key: "raum", label: tr("room") },
            { key: "position", label: tr("position") },
            { key: "leistung", label: tr("performance") },
            { key: "regie", label: tr("regie") },
          ].map((item) => (
            <button
              key={item.key}
              className={relationType === item.key ? "active" : ""}
              onClick={() => resetRelationFields(item.key as RelationType)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        {(relationType === "raum" || relationType === "position") && (
          <>
            <label>{tr("room")}</label>
            <select
              value={raumId}
              onChange={(e) => {
                setRaumId(e.target.value);
                setPositionId("");
              }}
            >
              <option value="">{tr("selectRoom")}</option>

              {raeume.map((row) => (
                <option key={row.id} value={row.id}>
                  {getRoomName(row)}
                </option>
              ))}
            </select>
          </>
        )}

        {relationType === "position" && (
          <>
            <label>{tr("position")}</label>
            <select
              value={positionId}
              onChange={(e) => setPositionId(e.target.value)}
            >
              <option value="">{tr("selectPosition")}</option>

              {filteredPositionen.map((row) => (
                <option key={row.id} value={row.id}>
                  {getPositionNr(row) ? `${getPositionNr(row)} · ` : ""}
                  {getPositionTitle(row)}
                </option>
              ))}
            </select>
          </>
        )}

        {relationType === "leistung" && (
          <>
            <label>{tr("performance")}</label>
            <select
              value={leistungId}
              onChange={(e) => setLeistungId(e.target.value)}
            >
              <option value="">{tr("selectPerformance")}</option>

              {leistungen.map((row) => (
                <option key={row.id} value={row.id}>
                  {getLeistungTitle(row)} · {row.raum_name || row.room_name || "-"} ·{" "}
                  {row.position_nr || row.lv_nr || "-"}
                </option>
              ))}
            </select>
          </>
        )}

        {relationType === "regie" && (
          <>
            <label>{tr("regie")}</label>
            <select value={regieId} onChange={(e) => setRegieId(e.target.value)}>
              <option value="">{tr("selectRegie")}</option>

              {regieRows.map((row) => (
                <option key={row.id} value={row.id}>
                  {getRegieTitle(row)} · {row.raum_name || row.room_name || "-"} ·{" "}
                  {row.workers_text || row.worker_names || row.radnik || "-"}
                </option>
              ))}
            </select>
          </>
        )}

        <label>{tr("photoType")}</label>
        <select value={fotoTyp} onChange={(e) => setFotoTyp(e.target.value)}>
          <option value="before">{tr("before")}</option>
          <option value="during">{tr("during")}</option>
          <option value="after">{tr("after")}</option>
          <option value="problem">{tr("problem")}</option>
          <option value="proof">{tr("proof")}</option>
        </select>

        <label>{tr("titleInput")}</label>
        <input
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder={tr("titlePlaceholder")}
        />

        <label>{tr("description")}</label>
        <textarea
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          placeholder={tr("descriptionPlaceholder")}
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

        <button className="saveBtn" onClick={saveFotos} disabled={saving}>
          {saving ? tr("saving") : tr("save")}
        </button>
      </section>

      <section className="todayBox">
        <div className="todayTop">
          <h2>{tr("todayPhotos")}</h2>
          <button onClick={() => loadFotos(worker)}>
            {loading ? "..." : "↻"}
          </button>
        </div>

        {fotos.length === 0 ? (
          <p className="empty">{tr("noPhotos")}</p>
        ) : (
          <div className="photoGrid">
            {fotos.map((foto) => (
              <article key={foto.id} className="photoCard">
                <img src={getFotoUrl(foto)} alt={getFotoTitle(foto)} />

                <div>
                  <b>{getFotoTitle(foto)}</b>

                  <span>
                    {foto.relation_type || foto.bezug || "-"} ·{" "}
                    {foto.foto_typ || foto.photo_type || foto.typ || "-"}
                  </span>

                  <small>
                    {foto.raum_name || foto.room_name || ""}
                    {foto.position_nr || foto.lv_nr
                      ? ` · ${foto.position_nr || foto.lv_nr}`
                      : ""}
                  </small>

                  {getFotoText(foto) && <p>{getFotoText(foto)}</p>}
                </div>
              </article>
            ))}
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

        .langGrid,
        .relationGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .langGrid button,
        .relationGrid button {
          background: #1f2937;
          color: white;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 14px;
          font-weight: 900;
        }

        .langGrid .active,
        .relationGrid .active {
          background: #2563eb;
          border-color: #60a5fa;
        }

        .selectedFiles {
          display: grid;
          gap: 8px;
          margin-top: 12px;
        }

        .selectedFiles span {
          background: #0b1220;
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

        .photoGrid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-top: 14px;
        }

        .photoCard {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 16px;
          overflow: hidden;
        }

        .photoCard img {
          width: 100%;
          height: 240px;
          object-fit: cover;
          display: block;
          background: #030712;
        }

        .photoCard div {
          padding: 13px;
        }

        .photoCard b {
          display: block;
          color: #93c5fd;
          margin-bottom: 6px;
        }

        .photoCard span,
        .photoCard small {
          display: block;
          color: white;
          font-weight: 800;
          margin-top: 4px;
        }

        .photoCard small {
          color: #cbd5e1;
          font-weight: 700;
        }

        .photoCard p {
          color: #d1d5db;
          margin: 8px 0 0;
          line-height: 1.45;
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

          .langGrid {
            grid-template-columns: repeat(4, 1fr);
          }

          .relationGrid {
            grid-template-columns: repeat(5, 1fr);
          }

          .photoGrid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </main>
  );
}