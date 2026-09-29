"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

const translations: any = {
  de: {
    back: "Zurück zu Räumen",
    room: "Raum",
    site: "Baustelle",
    material: "Material",
    workHours: "Arbeitsstunden",
    photos: "Fotos",
    productivity: "Produktivität",

    notesTitle: "Informationen / Notizen",
    notePlaceholder: "Information oder Notiz für diesen Raum eingeben...",
    addNote: "Notiz hinzufügen",
    saving: "Wird gespeichert...",
    noNotes: "Noch keine Notizen für diesen Raum vorhanden.",
    writtenBy: "Eingetragen von",
    enterNote: "Bitte eine Information oder Notiz eingeben.",
    workerMissing: "Angemeldeter Mitarbeiter wurde nicht gefunden.",

    loading: "Wird geladen...",
    loadSiteError: "Fehler beim Laden der Baustelle: ",
    loadRoomError: "Fehler beim Laden des Raums: ",
    loadNotesError: "Fehler beim Laden der Notizen: ",
    saveNoteError: "Fehler beim Speichern der Notiz: ",
  },

  ba: {
    back: "Nazad na prostorije",
    room: "Prostorija",
    site: "Baustelle",
    material: "Materijal",
    workHours: "Radni sati",
    photos: "Fotografije",
    productivity: "Produktivnost",

    notesTitle: "Informacije / Napomene",
    notePlaceholder: "Upiši informaciju ili napomenu za ovu prostoriju...",
    addNote: "Dodaj napomenu",
    saving: "Spremanje...",
    noNotes: "Još nema napomena za ovu prostoriju.",
    writtenBy: "Upisao",
    enterNote: "Unesi informaciju ili napomenu.",
    workerMissing: "Nije pronađen prijavljeni radnik.",

    loading: "Učitavanje...",
    loadSiteError: "Greška kod učitavanja Baustelle: ",
    loadRoomError: "Greška kod učitavanja prostorije: ",
    loadNotesError: "Greška kod učitavanja napomena: ",
    saveNoteError: "Greška kod spremanja napomene: ",
  },

  uz: {
    back: "Xonalarga qaytish",
    room: "Xona",
    site: "Obyekt",
    material: "Material",
    workHours: "Ish soatlari",
    photos: "Rasmlar",
    productivity: "Mahsuldorlik",

    notesTitle: "Ma’lumotlar / Eslatmalar",
    notePlaceholder: "Ushbu xona uchun ma’lumot yoki eslatma kiriting...",
    addNote: "Eslatma qo‘shish",
    saving: "Saqlanmoqda...",
    noNotes: "Bu xona uchun hali eslatmalar yo‘q.",
    writtenBy: "Kiritgan",
    enterNote: "Ma’lumot yoki eslatma kiriting.",
    workerMissing: "Kirish qilgan ishchi topilmadi.",

    loading: "Yuklanmoqda...",
    loadSiteError: "Obyekt yuklash xatosi: ",
    loadRoomError: "Xona yuklash xatosi: ",
    loadNotesError: "Eslatmalarni yuklash xatosi: ",
    saveNoteError: "Eslatmani saqlash xatosi: ",
  },

  en: {
    back: "Back to Rooms",
    room: "Room",
    site: "Site",
    material: "Material",
    workHours: "Work Hours",
    photos: "Photos",
    productivity: "Productivity",

    notesTitle: "Information / Notes",
    notePlaceholder: "Enter information or a note for this room...",
    addNote: "Add note",
    saving: "Saving...",
    noNotes: "No notes have been added for this room yet.",
    writtenBy: "Added by",
    enterNote: "Enter information or a note.",
    workerMissing: "Logged-in worker was not found.",

    loading: "Loading...",
    loadSiteError: "Error loading site: ",
    loadRoomError: "Error loading room: ",
    loadNotesError: "Error loading notes: ",
    saveNoteError: "Error saving note: ",
  },

  cz: {
    back: "Zpět na místnosti",
    room: "Místnost",
    site: "Stavba",
    material: "Materiál",
    workHours: "Pracovní hodiny",
    photos: "Fotografie",
    productivity: "Produktivita",

    notesTitle: "Informace / Poznámky",
    notePlaceholder: "Zadejte informaci nebo poznámku pro tuto místnost...",
    addNote: "Přidat poznámku",
    saving: "Ukládání...",
    noNotes: "Pro tuto místnost zatím nejsou žádné poznámky.",
    writtenBy: "Zapsal",
    enterNote: "Zadejte informaci nebo poznámku.",
    workerMissing: "Přihlášený pracovník nebyl nalezen.",

    loading: "Načítání...",
    loadSiteError: "Chyba při načítání stavby: ",
    loadRoomError: "Chyba při načítání místnosti: ",
    loadNotesError: "Chyba při načítání poznámek: ",
    saveNoteError: "Chyba při ukládání poznámky: ",
  },
};

export default function RoomDetailPage() {
  const params = useParams();

  const baustelleId = String(params.id);
  const roomId = String(params.roomId);

  const [baustelle, setBaustelle] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);

  const [lang, setLang] = useState("ba");

  const [radnik, setRadnik] = useState("");

  const [notes, setNotes] = useState<any[]>([]);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const t = translations[lang] || translations.ba;

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") || "ba";

    setLang(savedLang);

    const prijavljeniRadnik =
      localStorage.getItem("worker_name") ||
      localStorage.getItem("worker_ime") ||
      localStorage.getItem("worker") ||
      localStorage.getItem("radnik") ||
      localStorage.getItem("ime") ||
      localStorage.getItem("username") ||
      localStorage.getItem("logged_worker") ||
      localStorage.getItem("loggedWorker") ||
      localStorage.getItem("current_worker") ||
      "";

    setRadnik(prijavljeniRadnik);

    loadData(savedLang);
    loadNotes(savedLang);
  }, []);

  async function loadData(currentLang = "ba") {
    const tr = translations[currentLang] || translations.ba;

    const baustelleRes = await supabase
      .from("baustellen")
      .select("*")
      .eq("id", Number(baustelleId))
      .single();

    if (baustelleRes.error) {
      alert(tr.loadSiteError + baustelleRes.error.message);
      return;
    }

    const roomRes = await supabase
      .from("prostorije")
      .select("*")
      .eq("id", Number(roomId))
      .eq("baustelle_id", Number(baustelleId))
      .single();

    if (roomRes.error) {
      alert(tr.loadRoomError + roomRes.error.message);
      return;
    }

    setBaustelle(baustelleRes.data);
    setRoom(roomRes.data);
  }

  async function loadNotes(currentLang = lang) {
    const tr = translations[currentLang] || translations.ba;

    const { data, error } = await supabase
      .from("room_notes")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .eq("room_id", Number(roomId))
      .order("created_at", { ascending: false });

    if (error) {
      alert(tr.loadNotesError + error.message);
      return;
    }

    setNotes(data || []);
  }

  async function addNote() {
    if (!noteText.trim()) {
      alert(t.enterNote);
      return;
    }

    if (!radnik) {
      alert(t.workerMissing);
      return;
    }

    setSavingNote(true);

    const { error } = await supabase.from("room_notes").insert([
      {
        baustelle_id: Number(baustelleId),
        room_id: Number(roomId),
        tekst: noteText.trim(),
        radnik,
      },
    ]);

    setSavingNote(false);

    if (error) {
      alert(t.saveNoteError + error.message);
      return;
    }

    setNoteText("");

    await loadNotes(lang);
  }

  function formatDate(value: string) {
    if (!value) return "";

    const localeMap: any = {
      de: "de-AT",
      ba: "bs-BA",
      uz: "uz-UZ",
      en: "en-GB",
      cz: "cs-CZ",
    };

    return new Date(value).toLocaleString(
      localeMap[lang] || "de-AT",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  if (!room) {
    return (
      <main style={styles.page}>
        <p>{t.loading}</p>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <Link
        href={`/baustellen/${baustelleId}/prostorije`}
        style={styles.backLink}
      >
        ← {t.back}
      </Link>

      <h1 style={styles.title}>{room.naziv || t.room}</h1>

      <section style={styles.infoBox}>
        <p>
          <strong>{t.site}:</strong> {baustelle?.naziv || ""}
        </p>

        <p>
          <strong>{t.room}:</strong> {room.naziv || ""}
        </p>
      </section>

      <section style={styles.grid}>
        <Link
          href={`/baustellen/${baustelleId}/prostorije/${roomId}/material`}
          style={styles.blueButton}
        >
          {t.material}
        </Link>

        <Link
          href={`/baustellen/${baustelleId}/sati?roomId=${roomId}`}
          style={styles.blueButton}
        >
          {t.workHours}
        </Link>

        <Link
          href={`/baustellen/${baustelleId}/prostorije/${roomId}/fotografije`}
          style={styles.greenButton}
        >
          {t.photos}
        </Link>

        <Link
          href={`/baustellen/${baustelleId}/prostorije/${roomId}/produktivnost`}
          style={styles.blueButton}
        >
          {t.productivity}
        </Link>
      </section>

      {/* INFORMACIJE / NAPOMENE */}

      <section style={styles.notesBox}>
        <h2 style={styles.notesTitle}>📝 {t.notesTitle}</h2>

        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder={t.notePlaceholder}
          style={styles.textarea}
        />

        <div style={styles.noteFormBottom}>
          <div style={styles.currentWorker}>
            {radnik ? `👤 ${radnik}` : `⚠️ ${t.workerMissing}`}
          </div>

          <button
            type="button"
            onClick={addNote}
            disabled={savingNote}
            style={{
              ...styles.addNoteButton,
              opacity: savingNote ? 0.6 : 1,
              cursor: savingNote ? "not-allowed" : "pointer",
            }}
          >
            {savingNote ? t.saving : `+ ${t.addNote}`}
          </button>
        </div>

        <div style={styles.notesDivider} />

        {notes.length === 0 ? (
          <p style={styles.emptyNotes}>{t.noNotes}</p>
        ) : (
          <div style={styles.notesList}>
            {notes.map((note) => (
              <div key={note.id} style={styles.noteCard}>
                <div style={styles.noteHeader}>
                  <div style={styles.noteWorker}>
                    👤 {note.radnik || "-"}
                  </div>

                  <div style={styles.noteDate}>
                    {formatDate(note.created_at)}
                  </div>
                </div>

                <div style={styles.noteText}>{note.tekst}</div>

                <div style={styles.noteFooter}>
                  {t.writtenBy}: {note.radnik || "-"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const styles: any = {
  page: {
    background: "#000",
    minHeight: "100vh",
    color: "white",
    padding: "30px",
  },

  backLink: {
    color: "#3b82f6",
    textDecoration: "none",
    fontWeight: "bold",
  },

  title: {
    fontSize: "56px",
    fontWeight: "bold",
    marginTop: "35px",
    marginBottom: "35px",
  },

  infoBox: {
    background: "#111",
    padding: "22px",
    borderRadius: "18px",
    marginBottom: "30px",
    lineHeight: "1.6",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
    marginBottom: "30px",
  },

  blueButton: {
    background: "#2563eb",
    color: "white",
    textDecoration: "none",
    padding: "28px",
    borderRadius: "14px",
    fontSize: "20px",
    fontWeight: "bold",
    textAlign: "center",
  },

  greenButton: {
    background: "#16a34a",
    color: "white",
    textDecoration: "none",
    padding: "28px",
    borderRadius: "14px",
    fontSize: "20px",
    fontWeight: "bold",
    textAlign: "center",
  },

  notesBox: {
    background: "#111",
    border: "1px solid #222",
    borderRadius: "18px",
    padding: "24px",
    marginTop: "10px",
  },

  notesTitle: {
    fontSize: "26px",
    marginTop: 0,
    marginBottom: "20px",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "120px",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #333",
    background: "#1f1f1f",
    color: "white",
    fontSize: "16px",
    resize: "vertical",
    outline: "none",
  },

  noteFormBottom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    marginTop: "15px",
  },

  currentWorker: {
    color: "#9ca3af",
    fontWeight: "bold",
  },

  addNoteButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "12px",
    padding: "15px 22px",
    fontSize: "16px",
    fontWeight: "bold",
  },

  notesDivider: {
    height: "1px",
    background: "#2d2d2d",
    marginTop: "25px",
    marginBottom: "20px",
  },

  emptyNotes: {
    color: "#9ca3af",
  },

  notesList: {
    display: "grid",
    gap: "15px",
  },

  noteCard: {
    background: "#1d1d1d",
    border: "1px solid #333",
    borderRadius: "14px",
    padding: "18px",
  },

  noteHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    paddingBottom: "12px",
    borderBottom: "1px solid #333",
  },

  noteWorker: {
    fontWeight: "bold",
    color: "#60a5fa",
  },

  noteDate: {
    color: "#9ca3af",
    fontSize: "14px",
  },

  noteText: {
    whiteSpace: "pre-wrap",
    lineHeight: "1.6",
    fontSize: "17px",
    paddingTop: "15px",
    paddingBottom: "12px",
  },

  noteFooter: {
    color: "#9ca3af",
    fontSize: "13px",
  },
};