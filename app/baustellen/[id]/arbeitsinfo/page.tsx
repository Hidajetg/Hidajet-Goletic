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

const translations: any = {
  de: {
    back: "Zurück zur Baustelle",
    title: "Arbeitsinfo",
    task: "Arbeitsauftrag",
    material: "Material",
    tool: "Werkzeug",
    tiles: "Fliesen",
    notes: "Zusätzliche Hinweise",

    noTasks: "Keine Arbeitsaufträge vorhanden.",
    noMaterial: "Kein Material vorhanden.",
    noTools: "Kein Werkzeug vorhanden.",
    noTiles: "Keine Fliesen vorhanden.",
    noNotes: "Keine Hinweise vorhanden.",

    quickSelection: "Schnellauswahl Arbeiten",
    addTask: "Arbeitsauftrag hinzufügen",
    saveTask: "Arbeitsauftrag speichern",
    taskDescription: "Arbeitsauftrag / Beschreibung",
    allRooms: "Allgemein / keine Raumzuordnung",
    enterTaskDescription: "Bitte Arbeitsauftrag eingeben.",
    deleteTaskConfirm: "Möchten Sie diesen Arbeitsauftrag wirklich löschen?",
    loadTasksError: "Fehler beim Laden der Arbeitsaufträge: ",
    addTaskError: "Fehler beim Hinzufügen des Arbeitsauftrags: ",
    deleteTaskError: "Fehler beim Löschen des Arbeitsauftrags: ",

    addTiles: "Fliesen hinzufügen",
    close: "Schließen",
    tileName: "Fliesenname",
    tileStorage: "Lager / Lagerplatz",
    quantity: "Menge",
    roomsForTile: "Räume für diese Fliesen",
    noRooms: "Keine Räume vorhanden.",
    saveTiles: "Fliesen speichern",
    storage: "Lager",
    rooms: "Räume",
    notConnected: "Mit keinem Raum verbunden.",
    delete: "Löschen",
    enterTileName: "Bitte Fliesenname eingeben.",
    deleteConfirm: "Möchten Sie diese Fliesen wirklich löschen?",
    loadRoomsError: "Fehler beim Laden der Räume: ",
    loadTilesError: "Fehler beim Laden der Fliesen: ",
    loadTileRoomsError: "Fehler beim Laden der Fliesen-Räume: ",
    addTilesError: "Fehler beim Hinzufügen der Fliesen: ",
    relationError: "Fliesen wurden gespeichert, aber Fehler bei den Räumen: ",
    deleteTilesError: "Fehler beim Löschen der Fliesen: ",
  },
  ba: {
    back: "Nazad na Baustelle",
    title: "Radne informacije",
    task: "Radni nalog",
    material: "Materijal",
    tool: "Alat",
    tiles: "Keramika",
    notes: "Dodatne napomene",

    noTasks: "Još nema radnih zadataka.",
    noMaterial: "Još nema materijala.",
    noTools: "Još nema alata.",
    noTiles: "Još nema keramike.",
    noNotes: "Još nema napomena.",

    quickSelection: "Brzi izbor poslova",
    addTask: "Dodaj radni nalog",
    saveTask: "Sačuvaj radni nalog",
    taskDescription: "Radni nalog / opis",
    allRooms: "Općenito / bez prostorije",
    enterTaskDescription: "Unesi radni nalog.",
    deleteTaskConfirm: "Da li želiš obrisati ovaj radni nalog?",
    loadTasksError: "Greška kod učitavanja radnih naloga: ",
    addTaskError: "Greška kod dodavanja radnog naloga: ",
    deleteTaskError: "Greška kod brisanja radnog naloga: ",

    addTiles: "Dodaj keramiku",
    close: "Zatvori",
    tileName: "Naziv keramike",
    tileStorage: "Lager / mjesto u lageru",
    quantity: "Količina",
    roomsForTile: "Prostorije za ovu keramiku",
    noRooms: "Nema prostorija.",
    saveTiles: "Sačuvaj keramiku",
    storage: "Lager",
    rooms: "Prostorije",
    notConnected: "Nije povezana sa prostorijom.",
    delete: "Obriši",
    enterTileName: "Unesi naziv keramike.",
    deleteConfirm: "Da li želiš obrisati ovu keramiku?",
    loadRoomsError: "Greška kod učitavanja prostorija: ",
    loadTilesError: "Greška kod učitavanja keramike: ",
    loadTileRoomsError: "Greška kod učitavanja prostorija za keramiku: ",
    addTilesError: "Greška kod dodavanja keramike: ",
    relationError: "Keramika je dodana, ali greška kod prostorija: ",
    deleteTilesError: "Greška kod brisanja keramike: ",
  },
  en: {
    back: "Back to site",
    title: "Work Info",
    task: "Work order",
    material: "Material",
    tool: "Tools",
    tiles: "Tiles",
    notes: "Additional notes",

    noTasks: "No work orders yet.",
    noMaterial: "No material yet.",
    noTools: "No tools yet.",
    noTiles: "No tiles yet.",
    noNotes: "No notes yet.",

    quickSelection: "Quick work selection",
    addTask: "Add work order",
    saveTask: "Save work order",
    taskDescription: "Work order / description",
    allRooms: "General / no room",
    enterTaskDescription: "Enter work order.",
    deleteTaskConfirm: "Do you want to delete this work order?",
    loadTasksError: "Error loading work orders: ",
    addTaskError: "Error adding work order: ",
    deleteTaskError: "Error deleting work order: ",

    addTiles: "Add tiles",
    close: "Close",
    tileName: "Tile name",
    tileStorage: "Storage / warehouse place",
    quantity: "Quantity",
    roomsForTile: "Rooms for these tiles",
    noRooms: "No rooms available.",
    saveTiles: "Save tiles",
    storage: "Storage",
    rooms: "Rooms",
    notConnected: "Not connected to any room.",
    delete: "Delete",
    enterTileName: "Enter tile name.",
    deleteConfirm: "Do you want to delete these tiles?",
    loadRoomsError: "Error loading rooms: ",
    loadTilesError: "Error loading tiles: ",
    loadTileRoomsError: "Error loading tile rooms: ",
    addTilesError: "Error adding tiles: ",
    relationError: "Tiles were saved, but room connection failed: ",
    deleteTilesError: "Error deleting tiles: ",
  },
  uz: {
    back: "Obyektga qaytish",
    title: "Ish ma’lumoti",
    task: "Ish topshirig‘i",
    material: "Material",
    tool: "Asboblar",
    tiles: "Plitka",
    notes: "Qo‘shimcha eslatmalar",

    noTasks: "Hali ish topshirig‘i yo‘q.",
    noMaterial: "Hali material yo‘q.",
    noTools: "Hali asboblar yo‘q.",
    noTiles: "Hali plitka yo‘q.",
    noNotes: "Hali eslatma yo‘q.",

    quickSelection: "Tez ish tanlash",
    addTask: "Ish topshirig‘i qo‘shish",
    saveTask: "Ish topshirig‘ini saqlash",
    taskDescription: "Ish topshirig‘i / tavsif",
    allRooms: "Umumiy / xona yo‘q",
    enterTaskDescription: "Ish topshirig‘ini kiriting.",
    deleteTaskConfirm: "Bu ish topshirig‘ini o‘chirmoqchimisiz?",
    loadTasksError: "Ish topshiriqlarini yuklashda xatolik: ",
    addTaskError: "Ish topshirig‘ini qo‘shishda xatolik: ",
    deleteTaskError: "Ish topshirig‘ini o‘chirishda xatolik: ",

    addTiles: "Plitka qo‘shish",
    close: "Yopish",
    tileName: "Plitka nomi",
    tileStorage: "Ombor / joylashuv",
    quantity: "Miqdor",
    roomsForTile: "Bu plitka uchun xonalar",
    noRooms: "Xonalar yo‘q.",
    saveTiles: "Plitkani saqlash",
    storage: "Ombor",
    rooms: "Xonalar",
    notConnected: "Hech qaysi xonaga bog‘lanmagan.",
    delete: "O‘chirish",
    enterTileName: "Plitka nomini kiriting.",
    deleteConfirm: "Bu plitkani o‘chirmoqchimisiz?",
    loadRoomsError: "Xonalarni yuklashda xatolik: ",
    loadTilesError: "Plitkani yuklashda xatolik: ",
    loadTileRoomsError: "Plitka xonalarini yuklashda xatolik: ",
    addTilesError: "Plitka qo‘shishda xatolik: ",
    relationError: "Plitka saqlandi, lekin xonalarda xatolik: ",
    deleteTilesError: "Plitkani o‘chirishda xatolik: ",
  },
};

export default function ArbeitsinfoPage() {
  const params = useParams();
  const baustelleId = String(params.id);

  const [workerRole, setWorkerRole] = useState("");
  const [lang, setLang] = useState("de");

  const [rooms, setRooms] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tiles, setTiles] = useState<any[]>([]);
  const [tileRooms, setTileRooms] = useState<any[]>([]);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskRoomId, setTaskRoomId] = useState("");
  const [taskDescription, setTaskDescription] = useState("");

  const [showTilesForm, setShowTilesForm] = useState(false);
  const [tileName, setTileName] = useState("");
  const [tileStorage, setTileStorage] = useState("");
  const [tileQuantity, setTileQuantity] = useState("");
  const [tileUnit, setTileUnit] = useState("m²");
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);

  const t = translations[lang] || translations.de;
  const isAdmin = workerRole === "admin";

  useEffect(() => {
    const role = localStorage.getItem("worker_role") || "worker";
    const savedLang = localStorage.getItem("lang") || "de";

    setWorkerRole(role);
    setLang(savedLang);

    loadRooms();
    loadTasks();
    loadTiles();
  }, []);

  async function loadRooms() {
    const { data, error } = await supabase
      .from("prostorije")
      .select("*")
      .eq("baustelle_id", baustelleId)
      .order("id", { ascending: true });

    if (error) {
      alert(t.loadRoomsError + error.message);
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
      alert(t.loadTasksError + error.message);
      return;
    }

    setTasks(data || []);
  }

  function addQuickWork(workName: string) {
    const line = `- ${workName}`;
    const currentText = taskDescription.trim();

    if (currentText.includes(line)) return;

    if (!currentText) {
      setTaskDescription(line);
    } else {
      setTaskDescription(`${currentText}\n${line}`);
    }
  }

  async function addTask() {
    if (!taskDescription.trim()) {
      alert(t.enterTaskDescription);
      return;
    }

    const { error } = await supabase.from("arbeitsinfo_tasks").insert({
      baustelle_id: Number(baustelleId),
      room_id: taskRoomId ? Number(taskRoomId) : null,
      opis: taskDescription,
    });

    if (error) {
      alert(t.addTaskError + error.message);
      return;
    }

    setTaskRoomId("");
    setTaskDescription("");
    setShowTaskForm(false);
    loadTasks();
  }

  async function deleteTask(taskId: number) {
    const confirmDelete = confirm(t.deleteTaskConfirm);
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("arbeitsinfo_tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      alert(t.deleteTaskError + error.message);
      return;
    }

    loadTasks();
  }

  function getRoomName(roomId: any) {
    if (!roomId) return t.allRooms;

    const room = rooms.find((item) => Number(item.id) === Number(roomId));

    return room?.naziv || room?.name || "Raum";
  }

  async function loadTiles() {
    const { data: tilesData, error: tilesError } = await supabase
      .from("arbeitsinfo_tiles")
      .select("*")
      .eq("baustelle_id", baustelleId)
      .order("id", { ascending: true });

    if (tilesError) {
      alert(t.loadTilesError + tilesError.message);
      return;
    }

    setTiles(tilesData || []);

    const { data: roomsData, error: roomsError } = await supabase
      .from("arbeitsinfo_tile_rooms")
      .select("*");

    if (roomsError) {
      alert(t.loadTileRoomsError + roomsError.message);
      return;
    }

    setTileRooms(roomsData || []);
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
      alert(t.enterTileName);
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
      alert(t.addTilesError + tileError.message);
      return;
    }

    if (selectedRooms.length > 0) {
      const rows = selectedRooms.map((roomId) => ({
        tile_id: tileData.id,
        room_id: Number(roomId),
      }));

      const { error: relationError } = await supabase
        .from("arbeitsinfo_tile_rooms")
        .insert(rows);

      if (relationError) {
        alert(t.relationError + relationError.message);
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
    const confirmDelete = confirm(t.deleteConfirm);
    if (!confirmDelete) return;

    await supabase
      .from("arbeitsinfo_tile_rooms")
      .delete()
      .eq("tile_id", tileId);

    const { error } = await supabase
      .from("arbeitsinfo_tiles")
      .delete()
      .eq("id", tileId);

    if (error) {
      alert(t.deleteTilesError + error.message);
      return;
    }

    loadTiles();
  }

  function getRoomsForTile(tileId: number) {
    const relationRows = tileRooms.filter((item) => item.tile_id === tileId);
    const roomIds = relationRows.map((item) => Number(item.room_id));

    return rooms.filter((room) => roomIds.includes(Number(room.id)));
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

                <p style={textBlockStyle}>{taskItem.opis}</p>

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

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>📦 {t.material}</h2>
        <p style={emptyStyle}>{t.noMaterial}</p>
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>🛠 {t.tool}</h2>
        <p style={emptyStyle}>{t.noTools}</p>
      </div>

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
        <h2 style={sectionTitleStyle}>💡 {t.notes}</h2>
        <p style={emptyStyle}>{t.noNotes}</p>
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