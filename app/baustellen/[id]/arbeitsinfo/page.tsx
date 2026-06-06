"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const workCategories = [
  {
    title: "Vorbereitung",
    items: [
      "Abdecken",
      "Reinigung",
      "Vorbereitung Beton",
      "Untergrund vorbereiten",
      "Grundierung",
      "Spachteln",
      "Netz + Kleber",
      "Ausgleichsmasse",
      "Estrich",
      "Estrich nur Dusche",
      "Schleifen Boden",
    ],
  },
  {
    title: "Trockenbau",
    items: [
      "Trockenbau Decke abhängen",
      "Trockenbau Wand",
      "Vorwandinstallation",
      "Revisionsklappe",
      "Badewanne einmauern",
      "Träger montieren",
      "Vorbereitungsbeton",
    ],
  },
  {
    title: "Abdichtung",
    items: [
      "Abdichtung Boden",
      "Abdichtung Wand",
      "Abdichtung Dusche",
      "Dichtband",
      "Manschetten",
    ],
  },
  {
    title: "Fliesenarbeiten",
    items: [
      "Wandfliesen verlegen",
      "Bodenfliesen verlegen",
      "Sockelleisten",
      "Gehrung schneiden",
      "Schienen montieren",
      "Stufen verlegen",
      "Treppen sanieren",
    ],
  },
  {
    title: "Terrasse",
    items: [
      "Terrasse verlegen",
      "Stelzlager Terrasse",
      "Kies Terrasse",
      "Drainagematte",
    ],
  },
  {
    title: "Verfugung",
    items: ["Verfugen", "Silikon", "Fuge reparieren", "Silikon reparieren"],
  },
  {
    title: "Putz / Maler",
    items: [
      "Edelputz",
      "Verputzen",
      "Glätten",
      "Malerarbeiten",
      "Ausbesserung Maler",
    ],
  },
  {
    title: "Abschluss",
    items: ["Feinreinigung", "Mängel beseitigen", "Übergabe vorbereiten"],
  },
];

const toolList = [
  "Schleifmaschine",
  "Staubsauger",
  "Multitool",
  "Bohrmaschine",
  "Fliesenschneidmaschine 120 cm",
  "Wasserschneidmaschine",
  "Gehrungsschneider",
  "Akkuschrauber",
  "Hobelmaschine",
];

const materialModules = [
  {
    key: "untergrund",
    titleKey: "undergrund",
    groupName: "Priprema podloge",
    icon: "📦",
  },
  {
    key: "estrich",
    titleKey: "estrich",
    groupName: "Estrich",
    icon: "📦",
  },
  {
    key: "abdichtung",
    titleKey: "abdichtung",
    groupName: "Hidroizolacija",
    icon: "📦",
  },
  {
    key: "kleber",
    titleKey: "glue",
    groupName: "Ljepilo",
    icon: "📦",
  },
  {
    key: "schienen",
    titleKey: "rails",
    groupName: "Schienen",
    icon: "📦",
  },
  {
    key: "fugen",
    titleKey: "fugen",
    groupName: "Fuge",
    icon: "📦",
  },
  {
    key: "silikon",
    titleKey: "silikon",
    groupName: "Silikoni",
    icon: "📦",
  },
];

const taskTranslations: any = {
  ba: {
    Abdecken: "Zakrivanje / zaštita",
    Reinigung: "Čišćenje",
    "Vorbereitung Beton": "Priprema betona",
    "Untergrund vorbereiten": "Priprema podloge",
    Grundierung: "Grundiranje",
    Spachteln: "Gletovanje",
    "Netz + Kleber": "Mrežica i ljepilo",
    Ausgleichsmasse: "Nivelacija",
    Estrich: "Estrih",
    "Estrich nur Dusche": "Estrih samo tuš",
    "Schleifen Boden": "Brušenje poda",
    "Trockenbau Decke abhängen": "Spušteni knauf plafon",
    "Trockenbau Wand": "Pregradni knauf zid",
    Vorwandinstallation: "Predzid instalacije",
    Revisionsklappe: "Reviziona vrata",
    "Badewanne einmauern": "Zidanje kade",
    "Träger montieren": "Montaža nosača",
    Vorbereitungsbeton: "Pripremni beton",
    "Abdichtung Boden": "Hidroizolacija poda",
    "Abdichtung Wand": "Hidroizolacija zida",
    "Abdichtung Dusche": "Hidroizolacija tuša",
    Dichtband: "Diht traka",
    Manschetten: "Manžetne",
    "Wandfliesen verlegen": "Postavljanje zidne keramike",
    "Bodenfliesen verlegen": "Postavljanje podne keramike",
    Sockelleisten: "Sokl",
    "Gehrung schneiden": "Gerung rezanje",
    "Schienen montieren": "Montaža lajsni",
    "Stufen verlegen": "Postavljanje stepenica",
    "Treppen sanieren": "Popravka stepenica",
    "Terrasse verlegen": "Postavljanje terase",
    "Stelzlager Terrasse": "Stelzlager terasa",
    "Kies Terrasse": "Kies terasa",
    Drainagematte: "Drenažna membrana",
    Verfugen: "Fugiranje",
    Silikon: "Silikon",
    "Fuge reparieren": "Popravka fuga",
    "Silikon reparieren": "Popravka silikona",
    Edelputz: "Edelputz",
    Verputzen: "Malterisanje",
    Glätten: "Gletovanje",
    Malerarbeiten: "Moleraj",
    "Ausbesserung Maler": "Popravka moleraja",
    Feinreinigung: "Finalno čišćenje",
    "Mängel beseitigen": "Otklanjanje nedostataka",
    "Übergabe vorbereiten": "Priprema za primopredaju",
  },
  en: {},
  uz: {},
};

const translations: any = {
  de: {
    back: "Zurück zur Baustelle",
    title: "Arbeitsinfo",
    task: "Arbeitsauftrag",
    undergrund: "Untergrundvorbereitung",
    estrich: "Estrich",
    abdichtung: "Abdichtung",
    glue: "Fliesenkleber",
    rails: "Schienen",
    fugen: "Fugen",
    silikon: "Silikon / Acryl",
    tiles: "Fliesen",
    tool: "Werkzeug",
    files: "Bilder & Dokumente",
    notes: "Zusätzliche Hinweise",

    addTask: "Arbeitsauftrag hinzufügen",
    saveTask: "Arbeitsauftrag speichern",
    taskDescription: "Arbeitsauftrag / Beschreibung",
    quickSelection: "Schnellauswahl Arbeiten",
    allRooms: "Allgemein / keine Raumzuordnung",
    noTasks: "Keine Arbeitsaufträge vorhanden.",

    addMaterial: "Material hinzufügen",
    saveSelected: "Ausgewählte speichern",
    noMaterial: "Kein Material vorhanden.",
    quantity: "Menge",

    addTiles: "Fliesen hinzufügen",
    saveTiles: "Fliesen speichern",
    tileName: "Fliesenname",
    tileStorage: "Lager / Lagerplatz",
    roomsForTile: "Räume für diese Fliesen",
    noTiles: "Keine Fliesen vorhanden.",
    noRooms: "Keine Räume vorhanden.",
    storage: "Lager",
    rooms: "Räume",
    notConnected: "Mit keinem Raum verbunden.",

    addTools: "Werkzeug hinzufügen",
    saveTools: "Werkzeug speichern",
    noTools: "Kein Werkzeug vorhanden.",

    addFile: "Bild / Dokument hinzufügen",
    saveFile: "Datei speichern",
    fileTitle: "Titel / Beschreibung",
    chooseFile: "Datei auswählen",
    noFiles: "Keine Bilder oder Dokumente vorhanden.",

    addNote: "Hinweis hinzufügen",
    saveNote: "Hinweis speichern",
    noteText: "Hinweis / Beschreibung",
    noNotes: "Keine Hinweise vorhanden.",

    close: "Schließen",
    delete: "Löschen",
  },
  ba: {
    back: "Nazad na Baustelle",
    title: "Radne informacije",
    task: "Radni nalog",
    undergrund: "Priprema podloge",
    estrich: "Estrich",
    abdichtung: "Hidroizolacija",
    glue: "Ljepilo za keramiku",
    rails: "Lajsne / Schienen",
    fugen: "Fuge",
    silikon: "Silikon / Akril",
    tiles: "Keramika",
    tool: "Alat",
    files: "Slike i dokumenti",
    notes: "Dodatne napomene",

    addTask: "Dodaj radni nalog",
    saveTask: "Sačuvaj radni nalog",
    taskDescription: "Radni nalog / opis",
    quickSelection: "Brzi izbor poslova",
    allRooms: "Općenito / bez prostorije",
    noTasks: "Još nema radnih zadataka.",

    addMaterial: "Dodaj materijal",
    saveSelected: "Sačuvaj odabrano",
    noMaterial: "Još nema materijala.",
    quantity: "Količina",

    addTiles: "Dodaj keramiku",
    saveTiles: "Sačuvaj keramiku",
    tileName: "Naziv keramike",
    tileStorage: "Lager / mjesto u lageru",
    roomsForTile: "Prostorije za ovu keramiku",
    noTiles: "Još nema keramike.",
    noRooms: "Nema prostorija.",
    storage: "Lager",
    rooms: "Prostorije",
    notConnected: "Nije povezana sa prostorijom.",

    addTools: "Dodaj alat",
    saveTools: "Sačuvaj alat",
    noTools: "Još nema alata.",

    addFile: "Dodaj sliku / dokument",
    saveFile: "Sačuvaj fajl",
    fileTitle: "Naziv / opis",
    chooseFile: "Izaberi fajl",
    noFiles: "Još nema slika ili dokumenata.",

    addNote: "Dodaj napomenu",
    saveNote: "Sačuvaj napomenu",
    noteText: "Napomena / opis",
    noNotes: "Još nema napomena.",

    close: "Zatvori",
    delete: "Obriši",
  },
  en: {
    back: "Back to site",
    title: "Work Info",
    task: "Work order",
    undergrund: "Substrate preparation",
    estrich: "Screed",
    abdichtung: "Waterproofing",
    glue: "Tile adhesive",
    rails: "Profiles / rails",
    fugen: "Grout",
    silikon: "Silicone / acrylic",
    tiles: "Tiles",
    tool: "Tools",
    files: "Images & documents",
    notes: "Additional notes",

    addTask: "Add work order",
    saveTask: "Save work order",
    taskDescription: "Work order / description",
    quickSelection: "Quick work selection",
    allRooms: "General / no room",
    noTasks: "No work orders yet.",

    addMaterial: "Add material",
    saveSelected: "Save selected",
    noMaterial: "No material yet.",
    quantity: "Quantity",

    addTiles: "Add tiles",
    saveTiles: "Save tiles",
    tileName: "Tile name",
    tileStorage: "Storage / warehouse place",
    roomsForTile: "Rooms for these tiles",
    noTiles: "No tiles yet.",
    noRooms: "No rooms available.",
    storage: "Storage",
    rooms: "Rooms",
    notConnected: "Not connected to any room.",

    addTools: "Add tools",
    saveTools: "Save tools",
    noTools: "No tools yet.",

    addFile: "Add image / document",
    saveFile: "Save file",
    fileTitle: "Title / description",
    chooseFile: "Choose file",
    noFiles: "No images or documents yet.",

    addNote: "Add note",
    saveNote: "Save note",
    noteText: "Note / description",
    noNotes: "No notes yet.",

    close: "Close",
    delete: "Delete",
  },
  uz: {
    back: "Obyektga qaytish",
    title: "Ish ma’lumoti",
    task: "Ish topshirig‘i",
    undergrund: "Asosni tayyorlash",
    estrich: "Estrix",
    abdichtung: "Gidroizolyatsiya",
    glue: "Plitka yelimi",
    rails: "Profil / shina",
    fugen: "Fuga",
    silikon: "Silikon / akril",
    tiles: "Plitka",
    tool: "Asboblar",
    files: "Rasmlar va hujjatlar",
    notes: "Qo‘shimcha eslatmalar",

    addTask: "Ish topshirig‘i qo‘shish",
    saveTask: "Ish topshirig‘ini saqlash",
    taskDescription: "Ish topshirig‘i / tavsif",
    quickSelection: "Tez ish tanlash",
    allRooms: "Umumiy / xona yo‘q",
    noTasks: "Hali ish topshirig‘i yo‘q.",

    addMaterial: "Material qo‘shish",
    saveSelected: "Tanlanganlarni saqlash",
    noMaterial: "Hali material yo‘q.",
    quantity: "Miqdor",

    addTiles: "Plitka qo‘shish",
    saveTiles: "Plitkani saqlash",
    tileName: "Plitka nomi",
    tileStorage: "Ombor / joylashuv",
    roomsForTile: "Bu plitka uchun xonalar",
    noTiles: "Hali plitka yo‘q.",
    noRooms: "Xonalar yo‘q.",
    storage: "Ombor",
    rooms: "Xonalar",
    notConnected: "Hech qaysi xonaga bog‘lanmagan.",

    addTools: "Asbob qo‘shish",
    saveTools: "Asboblarni saqlash",
    noTools: "Hali asbob yo‘q.",

    addFile: "Rasm / hujjat qo‘shish",
    saveFile: "Faylni saqlash",
    fileTitle: "Nomi / tavsif",
    chooseFile: "Fayl tanlash",
    noFiles: "Hali rasm yoki hujjat yo‘q.",

    addNote: "Eslatma qo‘shish",
    saveNote: "Eslatmani saqlash",
    noteText: "Eslatma / tavsif",
    noNotes: "Hali eslatma yo‘q.",

    close: "Yopish",
    delete: "O‘chirish",
  },
};

export default function ArbeitsinfoPage() {
  const params = useParams();
  const baustelleId = String(params.id);

  const [workerRole, setWorkerRole] = useState("");
  const [lang, setLang] = useState("de");

  const [rooms, setRooms] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [catalogMaterials, setCatalogMaterials] = useState<any[]>([]);
  const [arbeitsMaterials, setArbeitsMaterials] = useState<any[]>([]);

  const [tiles, setTiles] = useState<any[]>([]);
  const [tileRooms, setTileRooms] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskRoomId, setTaskRoomId] = useState("");
  const [taskDescription, setTaskDescription] = useState("");

  const [openMaterialForms, setOpenMaterialForms] = useState<any>({});
  const [selectedMaterials, setSelectedMaterials] = useState<any>({});
  const [materialQuantities, setMaterialQuantities] = useState<any>({});

  const [showTilesForm, setShowTilesForm] = useState(false);
  const [tileName, setTileName] = useState("");
  const [tileStorage, setTileStorage] = useState("");
  const [tileQuantity, setTileQuantity] = useState("");
  const [tileUnit, setTileUnit] = useState("m²");
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);

  const [showToolsForm, setShowToolsForm] = useState(false);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [toolQuantities, setToolQuantities] = useState<any>({});

  const [showFileForm, setShowFileForm] = useState(false);
  const [fileTitle, setFileTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState("");

  const t = translations[lang] || translations.de;
  const isAdmin = workerRole === "admin";
    useEffect(() => {
    const role = localStorage.getItem("worker_role") || "worker";
    const savedLang = localStorage.getItem("lang") || "de";

    setWorkerRole(role);
    setLang(savedLang);

    loadAll();
  }, []);

  async function loadAll() {
    await loadRooms();
    await loadTasks();
    await loadCatalog();
    await loadArbeitsMaterials();
    await loadTiles();
    await loadTools();
    await loadFiles();
    await loadNotes();
  }

  function getMaterialName(material: any) {
    if (!material) return "";

    if (lang === "de") return material.naziv_de || material.naziv;
    if (lang === "ba") return material.naziv_ba || material.naziv_de || material.naziv;
    if (lang === "en") return material.naziv_en || material.naziv_de || material.naziv;
    if (lang === "uz") return material.naziv_uz || material.naziv_de || material.naziv;

    return material.naziv_de || material.naziv;
  }

  function translateTaskText(text: string) {
    if (lang === "de") return text;

    const dict = taskTranslations[lang];
    if (!dict) return text;

    let result = text;

    Object.entries(dict)
      .sort(([a], [b]) => b.length - a.length)
      .forEach(([deText, translatedText]) => {
        result = result.replaceAll(deText, String(translatedText));
      });

    return result;
  }

  async function loadRooms() {
    const { data, error } = await supabase
      .from("prostorije")
      .select("*")
      .eq("baustelle_id", baustelleId)
      .order("id", { ascending: true });

    if (error) {
      alert("Fehler beim Laden der Räume: " + error.message);
      return;
    }

    setRooms(data || []);
  }

  async function loadTasks() {
    const { data, error } = await supabase
      .from("arbeitsinfo_tasks")
      .select("*")
      .eq("baustelle_id", baustelleId)
      .order("id", { ascending: true });

    if (error) {
      alert("Fehler beim Laden der Arbeitsaufträge: " + error.message);
      return;
    }

    setTasks(data || []);
  }

  async function loadCatalog() {
    const { data: groupsData, error: groupsError } = await supabase
      .from("material_groups")
      .select("*")
      .order("id", { ascending: true });

    if (groupsError) {
      alert("Fehler beim Laden der Materialgruppen: " + groupsError.message);
      return;
    }

    const { data: materialsData, error: materialsError } = await supabase
      .from("materials")
      .select("*")
      .order("id", { ascending: true });

    if (materialsError) {
      alert("Fehler beim Laden der Materialien: " + materialsError.message);
      return;
    }

    setGroups(groupsData || []);
    setCatalogMaterials(materialsData || []);
  }

  async function loadArbeitsMaterials() {
    const { data, error } = await supabase
      .from("arbeitsinfo_materials")
      .select("*")
      .eq("baustelle_id", baustelleId)
      .order("id", { ascending: true });

    if (error) {
      alert("Fehler beim Laden der Arbeitsinfo Materialien: " + error.message);
      return;
    }

    setArbeitsMaterials(data || []);
  }

  async function loadTiles() {
    const { data: tilesData, error: tilesError } = await supabase
      .from("arbeitsinfo_tiles")
      .select("*")
      .eq("baustelle_id", baustelleId)
      .order("id", { ascending: true });

    if (tilesError) {
      alert("Fehler beim Laden der Fliesen: " + tilesError.message);
      return;
    }

    setTiles(tilesData || []);

    const { data: roomsData, error: roomsError } = await supabase
      .from("arbeitsinfo_tile_rooms")
      .select("*");

    if (roomsError) {
      alert("Fehler beim Laden der Fliesen-Räume: " + roomsError.message);
      return;
    }

    setTileRooms(roomsData || []);
  }

  async function loadTools() {
    const { data, error } = await supabase
      .from("arbeitsinfo_tools")
      .select("*")
      .eq("baustelle_id", baustelleId)
      .order("id", { ascending: true });

    if (error) {
      alert("Fehler beim Laden der Werkzeuge: " + error.message);
      return;
    }

    setTools(data || []);
  }

  async function loadFiles() {
    const { data, error } = await supabase
      .from("arbeitsinfo_files")
      .select("*")
      .eq("baustelle_id", baustelleId)
      .order("id", { ascending: true });

    if (error) {
      alert("Fehler beim Laden der Dateien: " + error.message);
      return;
    }

    setFiles(data || []);
  }

  async function loadNotes() {
    const { data, error } = await supabase
      .from("arbeitsinfo_notes")
      .select("*")
      .eq("baustelle_id", baustelleId)
      .order("id", { ascending: true });

    if (error) {
      alert("Fehler beim Laden der Hinweise: " + error.message);
      return;
    }

    setNotes(data || []);
  }

  function getGroupByName(groupName: string) {
    return groups.find((group) => group.naziv === groupName);
  }

  function getCatalogMaterialsForGroup(groupName: string) {
    const group = getGroupByName(groupName);
    if (!group) return [];

    return catalogMaterials.filter(
      (material) => Number(material.group_id) === Number(group.id)
    );
  }

  function getArbeitsMaterialsForGroup(groupName: string) {
    const group = getGroupByName(groupName);
    if (!group) return [];

    return arbeitsMaterials.filter(
      (item) => Number(item.group_id) === Number(group.id)
    );
  }

  function getCatalogMaterialById(materialId: any) {
    return catalogMaterials.find(
      (material) => Number(material.id) === Number(materialId)
    );
  }

  function addQuickWork(workName: string) {
    const line = `- ${workName}`;
    const currentText = taskDescription.trim();

    if (currentText.includes(line)) return;

    setTaskDescription(currentText ? `${currentText}\n${line}` : line);
  }

  async function addTask() {
    if (!taskDescription.trim()) {
      alert("Bitte Arbeitsauftrag eingeben.");
      return;
    }

    const { error } = await supabase.from("arbeitsinfo_tasks").insert({
      baustelle_id: Number(baustelleId),
      room_id: taskRoomId ? Number(taskRoomId) : null,
      opis: taskDescription,
    });

    if (error) {
      alert("Fehler beim Speichern: " + error.message);
      return;
    }

    setTaskRoomId("");
    setTaskDescription("");
    setShowTaskForm(false);
    loadTasks();
  }

  async function deleteTask(taskId: number) {
    const ok = confirm("Möchten Sie diesen Arbeitsauftrag wirklich löschen?");
    if (!ok) return;

    const { error } = await supabase
      .from("arbeitsinfo_tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      alert("Fehler beim Löschen: " + error.message);
      return;
    }

    loadTasks();
  }

  function getRoomName(roomId: any) {
    if (!roomId) return t.allRooms;

    const room = rooms.find((item) => Number(item.id) === Number(roomId));
    return room?.naziv || room?.name || "Raum";
  }

  function toggleMaterial(moduleKey: string, materialId: string) {
    const current = selectedMaterials[moduleKey] || [];

    if (current.includes(materialId)) {
      setSelectedMaterials({
        ...selectedMaterials,
        [moduleKey]: current.filter((id: string) => id !== materialId),
      });
    } else {
      setSelectedMaterials({
        ...selectedMaterials,
        [moduleKey]: [...current, materialId],
      });
    }
  }

  function setMaterialQuantity(moduleKey: string, materialId: string, value: string) {
    setMaterialQuantities({
      ...materialQuantities,
      [`${moduleKey}_${materialId}`]: value,
    });
  }

  async function saveSelectedMaterials(moduleKey: string, groupName: string) {
    const selected = selectedMaterials[moduleKey] || [];

    if (selected.length === 0) {
      alert("Bitte Material auswählen.");
      return;
    }

    const rows = selected.map((materialId: string) => {
      const material = getCatalogMaterialById(materialId);

      return {
        baustelle_id: Number(baustelleId),
        material_id: Number(materialId),
        group_id: Number(material?.group_id),
        quantity: materialQuantities[`${moduleKey}_${materialId}`] || "",
      };
    });

    const { error } = await supabase.from("arbeitsinfo_materials").insert(rows);

    if (error) {
      alert("Fehler beim Speichern der Materialien: " + error.message);
      return;
    }

    setSelectedMaterials({
      ...selectedMaterials,
      [moduleKey]: [],
    });

    const newQuantities = { ...materialQuantities };
    selected.forEach((materialId: string) => {
      delete newQuantities[`${moduleKey}_${materialId}`];
    });

    setMaterialQuantities(newQuantities);
    setOpenMaterialForms({ ...openMaterialForms, [moduleKey]: false });
    loadArbeitsMaterials();
  }

  async function deleteArbeitsMaterial(id: number) {
    const ok = confirm("Möchten Sie dieses Material wirklich löschen?");
    if (!ok) return;

    const { error } = await supabase
      .from("arbeitsinfo_materials")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Fehler beim Löschen: " + error.message);
      return;
    }

    loadArbeitsMaterials();
  }

  function toggleRoom(roomId: string) {
    if (selectedRooms.includes(roomId)) {
      setSelectedRooms(selectedRooms.filter((id) => id !== roomId));
    } else {
      setSelectedRooms([...selectedRooms, roomId]);
    }
  }

  async function addTiles() {
    if (!tileName.trim()) {
      alert("Bitte Fliesenname eingeben.");
      return;
    }

    const { data: tileData, error: tileError } = await supabase
      .from("arbeitsinfo_tiles")
      .insert({
        baustelle_id: Number(baustelleId),
        naziv: tileName,
        lager: tileStorage,
        kolicina: tileQuantity,
        jedinica: tileUnit,
      })
      .select()
      .single();

    if (tileError) {
      alert("Fehler beim Speichern der Fliesen: " + tileError.message);
      return;
    }

    if (selectedRooms.length > 0) {
      const rows = selectedRooms.map((roomId) => ({
        tile_id: tileData.id,
        room_id: Number(roomId),
      }));

      const { error } = await supabase
        .from("arbeitsinfo_tile_rooms")
        .insert(rows);

      if (error) {
        alert("Fliesen gespeichert, aber Räume nicht: " + error.message);
      }
    }

    setTileName("");
    setTileStorage("");
    setTileQuantity("");
    setTileUnit("m²");
    setSelectedRooms([]);
    setShowTilesForm(false);
    loadTiles();
  }

  async function deleteTiles(tileId: number) {
    const ok = confirm("Möchten Sie diese Fliesen wirklich löschen?");
    if (!ok) return;

    await supabase.from("arbeitsinfo_tile_rooms").delete().eq("tile_id", tileId);

    const { error } = await supabase
      .from("arbeitsinfo_tiles")
      .delete()
      .eq("id", tileId);

    if (error) {
      alert("Fehler beim Löschen: " + error.message);
      return;
    }

    loadTiles();
  }

  function getRoomsForTile(tileId: number) {
    const relationRows = tileRooms.filter((item) => item.tile_id === tileId);
    const roomIds = relationRows.map((item) => Number(item.room_id));

    return rooms.filter((room) => roomIds.includes(Number(room.id)));
  }
    function toggleTool(toolName: string) {
    if (selectedTools.includes(toolName)) {
      setSelectedTools(selectedTools.filter((item) => item !== toolName));
    } else {
      setSelectedTools([...selectedTools, toolName]);
    }
  }

  async function saveTools() {
    if (selectedTools.length === 0) {
      alert("Bitte Werkzeug auswählen.");
      return;
    }

    const rows = selectedTools.map((toolName) => ({
      baustelle_id: Number(baustelleId),
      naziv: toolName,
      kolicina: toolQuantities[toolName] || "",
    }));

    const { error } = await supabase.from("arbeitsinfo_tools").insert(rows);

    if (error) {
      alert("Fehler beim Speichern der Werkzeuge: " + error.message);
      return;
    }

    setSelectedTools([]);
    setToolQuantities({});
    setShowToolsForm(false);
    loadTools();
  }

  async function deleteTool(id: number) {
    const ok = confirm("Möchten Sie dieses Werkzeug wirklich löschen?");
    if (!ok) return;

    const { error } = await supabase.from("arbeitsinfo_tools").delete().eq("id", id);

    if (error) {
      alert("Fehler beim Löschen: " + error.message);
      return;
    }

    loadTools();
  }

  async function saveFile() {
    if (!selectedFile) {
      alert("Bitte Datei auswählen.");
      return;
    }

    const fileName = `${Date.now()}-${selectedFile.name}`;
    const filePath = `${baustelleId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("arbeitsinfo-files")
      .upload(filePath, selectedFile);

    if (uploadError) {
      alert("Fehler beim Hochladen: " + uploadError.message);
      return;
    }

    const { data } = supabase.storage
      .from("arbeitsinfo-files")
      .getPublicUrl(filePath);

    const { error } = await supabase.from("arbeitsinfo_files").insert({
      baustelle_id: Number(baustelleId),
      title: fileTitle || selectedFile.name,
      file_url: data.publicUrl,
      file_type: selectedFile.type,
    });

    if (error) {
      alert("Fehler beim Speichern der Datei: " + error.message);
      return;
    }

    setFileTitle("");
    setSelectedFile(null);
    setShowFileForm(false);
    loadFiles();
  }

  async function deleteFile(id: number) {
    const ok = confirm("Möchten Sie diese Datei wirklich löschen?");
    if (!ok) return;

    const { error } = await supabase.from("arbeitsinfo_files").delete().eq("id", id);

    if (error) {
      alert("Fehler beim Löschen: " + error.message);
      return;
    }

    loadFiles();
  }

  async function saveNote() {
    if (!noteText.trim()) {
      alert("Bitte Hinweis eingeben.");
      return;
    }

    const { error } = await supabase.from("arbeitsinfo_notes").insert({
      baustelle_id: Number(baustelleId),
      opis: noteText,
    });

    if (error) {
      alert("Fehler beim Speichern des Hinweises: " + error.message);
      return;
    }

    setNoteText("");
    setShowNoteForm(false);
    loadNotes();
  }

  async function deleteNote(id: number) {
    const ok = confirm("Möchten Sie diesen Hinweis wirklich löschen?");
    if (!ok) return;

    const { error } = await supabase.from("arbeitsinfo_notes").delete().eq("id", id);

    if (error) {
      alert("Fehler beim Löschen: " + error.message);
      return;
    }

    loadNotes();
  }

  function renderMaterialModule(moduleItem: any) {
    const title = t[moduleItem.titleKey];
    const catalog = getCatalogMaterialsForGroup(moduleItem.groupName);
    const saved = getArbeitsMaterialsForGroup(moduleItem.groupName);
    const isOpen = openMaterialForms[moduleItem.key] || false;
    const selected = selectedMaterials[moduleItem.key] || [];

    return (
      <div style={sectionStyle} key={moduleItem.key}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>
            {moduleItem.icon} {title}
          </h2>

          {isAdmin && (
            <button
              onClick={() =>
                setOpenMaterialForms({
                  ...openMaterialForms,
                  [moduleItem.key]: !isOpen,
                })
              }
              style={buttonStyle}
            >
              {isOpen ? t.close : t.addMaterial}
            </button>
          )}
        </div>

        {isOpen && isAdmin && (
          <div style={formStyle}>
            {catalog.length === 0 ? (
              <p style={emptyStyle}>Keine Materialien in dieser Gruppe.</p>
            ) : (
              <div style={multiSelectStyle}>
                {catalog.map((material) => {
                  const checked = selected.includes(String(material.id));

                  return (
                    <div key={material.id} style={multiRowStyle}>
                      <label style={checkBoxLabelStyle}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleMaterial(moduleItem.key, String(material.id))
                          }
                        />
                        {getMaterialName(material)} ({material.jedinica})
                      </label>

                      {checked && (
                        <input
                          value={
                            materialQuantities[
                              `${moduleItem.key}_${material.id}`
                            ] || ""
                          }
                          onChange={(e) =>
                            setMaterialQuantity(
                              moduleItem.key,
                              String(material.id),
                              e.target.value
                            )
                          }
                          placeholder={t.quantity}
                          style={smallInputStyle}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() =>
                saveSelectedMaterials(moduleItem.key, moduleItem.groupName)
              }
              style={saveButtonStyle}
            >
              {t.saveSelected}
            </button>
          </div>
        )}

        {saved.length === 0 ? (
          <p style={emptyStyle}>{t.noMaterial}</p>
        ) : (
          <div style={listStyle}>
            {saved.map((item) => {
              const material = getCatalogMaterialById(item.material_id);

              return (
                <div key={item.id} style={cardStyle}>
                  <h3 style={cardTitleStyle}>{getMaterialName(material)}</h3>

                  <p>
                    <strong>{t.quantity}:</strong>{" "}
                    {item.quantity || item.kolicina || ""}{" "}
                    {material?.jedinica || ""}
                  </p>

                  {isAdmin && (
                    <button
                      onClick={() => deleteArbeitsMaterial(item.id)}
                      style={deleteButtonStyle}
                    >
                      {t.delete}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <main style={mainStyle}>
      <Link href={`/baustellen/${baustelleId}`} style={backLinkStyle}>
        ← {t.back}
      </Link>

      <h1 style={titleStyle}>{t.title}</h1>

      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>📋 {t.task}</h2>

          {isAdmin && (
            <button
              onClick={() => setShowTaskForm(!showTaskForm)}
              style={buttonStyle}
            >
              {showTaskForm ? t.close : t.addTask}
            </button>
          )}
        </div>

        {showTaskForm && isAdmin && (
          <div style={formStyle}>
            <select
              value={taskRoomId}
              onChange={(e) => setTaskRoomId(e.target.value)}
              style={inputStyle}
            >
              <option value="">{t.allRooms}</option>

              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.naziv || room.name || "Raum"}
                </option>
              ))}
            </select>

            <h3 style={smallTitleStyle}>{t.quickSelection}</h3>

            <div style={quickCategoryWrapStyle}>
              {workCategories.map((category) => (
                <div key={category.title} style={quickCategoryStyle}>
                  <h4 style={quickCategoryTitleStyle}>{category.title}</h4>

                  <div style={quickButtonWrapStyle}>
                    {category.items.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => addQuickWork(item)}
                        style={quickButtonStyle}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder={t.taskDescription}
              style={textareaStyle}
            />

            <button onClick={addTask} style={saveButtonStyle}>
              {t.saveTask}
            </button>
          </div>
        )}

        {tasks.length === 0 ? (
          <p style={emptyStyle}>{t.noTasks}</p>
        ) : (
          <div style={listStyle}>
            {tasks.map((taskItem) => (
              <div key={taskItem.id} style={cardStyle}>
                <h3 style={cardTitleStyle}>{getRoomName(taskItem.room_id)}</h3>

                <p style={textBlockStyle}>
                  {translateTaskText(taskItem.opis || "")}
                </p>

                {isAdmin && (
                  <button
                    onClick={() => deleteTask(taskItem.id)}
                    style={deleteButtonStyle}
                  >
                    {t.delete}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {materialModules.map((moduleItem) => renderMaterialModule(moduleItem))}

      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>🧱 {t.tiles}</h2>

          {isAdmin && (
            <button
              onClick={() => setShowTilesForm(!showTilesForm)}
              style={buttonStyle}
            >
              {showTilesForm ? t.close : t.addTiles}
            </button>
          )}
        </div>

        {showTilesForm && isAdmin && (
          <div style={formStyle}>
            <input
              value={tileName}
              onChange={(e) => setTileName(e.target.value)}
              placeholder={t.tileName}
              style={inputStyle}
            />

            <input
              value={tileStorage}
              onChange={(e) => setTileStorage(e.target.value)}
              placeholder={t.tileStorage}
              style={inputStyle}
            />

            <div style={rowStyle}>
              <input
                value={tileQuantity}
                onChange={(e) => setTileQuantity(e.target.value)}
                placeholder={t.quantity}
                style={inputStyle}
              />

              <select
                value={tileUnit}
                onChange={(e) => setTileUnit(e.target.value)}
                style={inputStyle}
              >
                <option value="Palette">Palette</option>
                <option value="Karton">Karton</option>
                <option value="Stück">Stück</option>
                <option value="m²">m²</option>
              </select>
            </div>

            <h3 style={smallTitleStyle}>{t.roomsForTile}</h3>

            {rooms.length === 0 ? (
              <p style={emptyStyle}>{t.noRooms}</p>
            ) : (
              <div style={checkBoxGridStyle}>
                {rooms.map((room) => (
                  <label key={room.id} style={checkBoxLabelStyle}>
                    <input
                      type="checkbox"
                      checked={selectedRooms.includes(String(room.id))}
                      onChange={() => toggleRoom(String(room.id))}
                    />
                    {room.naziv || room.name || "Raum"}
                  </label>
                ))}
              </div>
            )}

            <button onClick={addTiles} style={saveButtonStyle}>
              {t.saveTiles}
            </button>
          </div>
        )}

        {tiles.length === 0 ? (
          <p style={emptyStyle}>{t.noTiles}</p>
        ) : (
          <div style={listStyle}>
            {tiles.map((tile) => {
              const connectedRooms = getRoomsForTile(tile.id);

              return (
                <div key={tile.id} style={cardStyle}>
                  <h3 style={cardTitleStyle}>{tile.naziv}</h3>

                  {tile.lager && (
                    <p>
                      <strong>{t.storage}:</strong> {tile.lager}
                    </p>
                  )}

                  {(tile.kolicina || tile.jedinica) && (
                    <p>
                      <strong>{t.quantity}:</strong> {tile.kolicina}{" "}
                      {tile.jedinica}
                    </p>
                  )}

                  <div>
                    <strong>{t.rooms}:</strong>

                    {connectedRooms.length === 0 ? (
                      <p style={emptyStyle}>{t.notConnected}</p>
                    ) : (
                      <div style={roomListStyle}>
                        {connectedRooms.map((room) => (
                          <span key={room.id} style={roomBadgeStyle}>
                            {room.naziv || room.name || "Raum"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => deleteTiles(tile.id)}
                      style={deleteButtonStyle}
                    >
                      {t.delete}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>🛠 {t.tool}</h2>

          <div style={standardToolStyle}>
            ✓ Grundausstattung (immer vorhanden)
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowToolsForm(!showToolsForm)}
              style={buttonStyle}
            >
              {showToolsForm ? t.close : t.addTools}
            </button>
          )}
        </div>

        {showToolsForm && isAdmin && (
          <div style={formStyle}>
            <div style={multiSelectStyle}>
              {toolList.map((tool) => {
                const checked = selectedTools.includes(tool);

                return (
                  <div key={tool} style={multiRowStyle}>
                    <label style={checkBoxLabelStyle}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTool(tool)}
                      />
                      {tool}
                    </label>

                    {checked && (
                      <input
                        value={toolQuantities[tool] || ""}
                        onChange={(e) =>
                          setToolQuantities({
                            ...toolQuantities,
                            [tool]: e.target.value,
                          })
                        }
                        placeholder={t.quantity}
                        style={smallInputStyle}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={saveTools} style={saveButtonStyle}>
              {t.saveTools}
            </button>
          </div>
        )}

        {tools.length === 0 ? (
          <p style={emptyStyle}>{t.noTools}</p>
        ) : (
          <div style={listStyle}>
            {tools.map((tool) => (
              <div key={tool.id} style={cardStyle}>
                <h3 style={cardTitleStyle}>{tool.naziv}</h3>
                {tool.kolicina && (
                  <p>
                    <strong>{t.quantity}:</strong> {tool.kolicina}
                  </p>
                )}

                {isAdmin && (
                  <button
                    onClick={() => deleteTool(tool.id)}
                    style={deleteButtonStyle}
                  >
                    {t.delete}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>📎 {t.files}</h2>

          {isAdmin && (
            <button
              onClick={() => setShowFileForm(!showFileForm)}
              style={buttonStyle}
            >
              {showFileForm ? t.close : t.addFile}
            </button>
          )}
        </div>

        {showFileForm && isAdmin && (
          <div style={formStyle}>
            <input
              value={fileTitle}
              onChange={(e) => setFileTitle(e.target.value)}
              placeholder={t.fileTitle}
              style={inputStyle}
            />

            <input
              type="file"
              onChange={(e) =>
                setSelectedFile(e.target.files ? e.target.files[0] : null)
              }
              style={inputStyle}
            />

            <button onClick={saveFile} style={saveButtonStyle}>
              {t.saveFile}
            </button>
          </div>
        )}

        {files.length === 0 ? (
          <p style={emptyStyle}>{t.noFiles}</p>
        ) : (
          <div style={listStyle}>
            {files.map((file) => (
              <div key={file.id} style={cardStyle}>
                <h3 style={cardTitleStyle}>{file.title || "Datei"}</h3>

                {file.file_type?.startsWith("image/") ? (
                  <img src={file.file_url} style={imageStyle} />
                ) : (
                  <a
                    href={file.file_url}
                    target="_blank"
                    style={fileLinkStyle}
                  >
                    Datei öffnen
                  </a>
                )}

                {isAdmin && (
                  <button
                    onClick={() => deleteFile(file.id)}
                    style={deleteButtonStyle}
                  >
                    {t.delete}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>💡 {t.notes}</h2>

          {isAdmin && (
            <button
              onClick={() => setShowNoteForm(!showNoteForm)}
              style={buttonStyle}
            >
              {showNoteForm ? t.close : t.addNote}
            </button>
          )}
        </div>

        {showNoteForm && isAdmin && (
          <div style={formStyle}>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={t.noteText}
              style={textareaStyle}
            />

            <button onClick={saveNote} style={saveButtonStyle}>
              {t.saveNote}
            </button>
          </div>
        )}

        {notes.length === 0 ? (
          <p style={emptyStyle}>{t.noNotes}</p>
        ) : (
          <div style={listStyle}>
            {notes.map((note) => (
              <div key={note.id} style={cardStyle}>
                <p style={textBlockStyle}>{note.opis}</p>

                {isAdmin && (
                  <button
                    onClick={() => deleteNote(note.id)}
                    style={deleteButtonStyle}
                  >
                    {t.delete}
                  </button>
                )}
              </div>
            ))}
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
  fontSize: "18px",
};

const titleStyle: any = {
  fontSize: "56px",
  fontWeight: "bold",
  marginTop: "25px",
  marginBottom: "30px",
};

const sectionStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  marginBottom: "25px",
};

const sectionHeaderStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "15px",
  flexWrap: "wrap",
  marginBottom: "15px",
};

const sectionTitleStyle: any = {
  fontSize: "28px",
  fontWeight: "bold",
  marginBottom: "15px",
};

const emptyStyle: any = {
  color: "#9ca3af",
  marginTop: "10px",
};

const buttonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "14px 20px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const saveButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "14px 20px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "20px",
};

const deleteButtonStyle: any = {
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px 18px",
  fontSize: "15px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "18px",
};

const formStyle: any = {
  background: "#000",
  border: "1px solid #333",
  padding: "20px",
  borderRadius: "16px",
  marginBottom: "25px",
};

const inputStyle: any = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid #333",
  background: "#1f2937",
  color: "white",
  fontSize: "16px",
  marginBottom: "14px",
};

const smallInputStyle: any = {
  width: "180px",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #333",
  background: "#1f2937",
  color: "white",
  fontSize: "15px",
};

const textareaStyle: any = {
  width: "100%",
  minHeight: "130px",
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid #333",
  background: "#1f2937",
  color: "white",
  fontSize: "16px",
  marginBottom: "14px",
  resize: "vertical",
};

const rowStyle: any = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "15px",
};

const smallTitleStyle: any = {
  fontSize: "18px",
  fontWeight: "bold",
  marginTop: "10px",
  marginBottom: "12px",
};

const quickCategoryWrapStyle: any = {
  display: "grid",
  gap: "16px",
  marginBottom: "18px",
};

const quickCategoryStyle: any = {
  background: "#111827",
  border: "1px solid #374151",
  borderRadius: "14px",
  padding: "14px",
};

const quickCategoryTitleStyle: any = {
  fontSize: "16px",
  fontWeight: "bold",
  marginBottom: "10px",
  color: "#93c5fd",
};

const quickButtonWrapStyle: any = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
};

const quickButtonStyle: any = {
  background: "#1f2937",
  color: "white",
  border: "1px solid #4b5563",
  borderRadius: "10px",
  padding: "10px 12px",
  fontSize: "14px",
  fontWeight: "bold",
  cursor: "pointer",
};

const multiSelectStyle: any = {
  display: "grid",
  gap: "12px",
};

const multiRowStyle: any = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  flexWrap: "wrap",
};

const checkBoxGridStyle: any = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
};

const checkBoxLabelStyle: any = {
  background: "#1f2937",
  padding: "12px 16px",
  borderRadius: "12px",
  display: "flex",
  gap: "8px",
  alignItems: "center",
  cursor: "pointer",
};

const listStyle: any = {
  display: "grid",
  gap: "18px",
};

const cardStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "20px",
};

const cardTitleStyle: any = {
  fontSize: "24px",
  fontWeight: "bold",
  marginBottom: "12px",
};

const textBlockStyle: any = {
  whiteSpace: "pre-wrap",
  lineHeight: "1.6",
  color: "#e5e7eb",
};

const roomListStyle: any = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginTop: "10px",
};

const roomBadgeStyle: any = {
  background: "#1f2937",
  color: "white",
  padding: "8px 12px",
  borderRadius: "10px",
  fontSize: "14px",
  fontWeight: "bold",
};

const imageStyle: any = {
  width: "100%",
  maxWidth: "420px",
  borderRadius: "14px",
  marginTop: "10px",
};

const fileLinkStyle: any = {
  color: "#60a5fa",
  fontWeight: "bold",
  fontSize: "17px",
};

const standardToolStyle: any = {
  background: "#1f2937",
  padding: "14px",
  borderRadius: "12px",
  marginBottom: "20px",
  fontWeight: "bold",
  color: "#93c5fd",
};
