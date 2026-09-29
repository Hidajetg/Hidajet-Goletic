"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
    workerMissing: "Angemeldeter Mitarbeiter wurde nicht gefunden.",

    addLink: "Link hinzufügen",
    linkPlaceholder: "https://...",
    addImage: "Bild hinzufügen",
    addPdf: "PDF hinzufügen",
    removeFile: "Datei entfernen",
    selectedFile: "Ausgewählte Datei",
    openLink: "Link öffnen",
    openPdf: "PDF öffnen",

    noteRequired: "Bitte Text, Link, Bild oder PDF hinzufügen.",
    invalidFile: "Nur Bilder oder PDF-Dateien sind erlaubt.",
    fileTooLarge: "Die Datei darf maximal 15 MB groß sein.",

    loading: "Wird geladen...",
    loadSiteError: "Fehler beim Laden der Baustelle: ",
    loadRoomError: "Fehler beim Laden des Raums: ",
    loadNotesError: "Fehler beim Laden der Notizen: ",
    saveNoteError: "Fehler beim Speichern der Notiz: ",
    uploadError: "Fehler beim Hochladen der Datei: ",
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
    workerMissing: "Nije pronađen prijavljeni radnik.",

    addLink: "Dodaj link",
    linkPlaceholder: "https://...",
    addImage: "Dodaj sliku",
    addPdf: "Dodaj PDF",
    removeFile: "Ukloni fajl",
    selectedFile: "Odabrani fajl",
    openLink: "Otvori link",
    openPdf: "Otvori PDF",

    noteRequired: "Dodaj tekst, link, sliku ili PDF.",
    invalidFile: "Dozvoljene su samo slike i PDF fajlovi.",
    fileTooLarge: "Fajl može imati najviše 15 MB.",

    loading: "Učitavanje...",
    loadSiteError: "Greška kod učitavanja Baustelle: ",
    loadRoomError: "Greška kod učitavanja prostorije: ",
    loadNotesError: "Greška kod učitavanja napomena: ",
    saveNoteError: "Greška kod spremanja napomene: ",
    uploadError: "Greška kod učitavanja fajla: ",
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
    workerMissing: "Kirish qilgan ishchi topilmadi.",

    addLink: "Havola qo‘shish",
    linkPlaceholder: "https://...",
    addImage: "Rasm qo‘shish",
    addPdf: "PDF qo‘shish",
    removeFile: "Faylni olib tashlash",
    selectedFile: "Tanlangan fayl",
    openLink: "Havolani ochish",
    openPdf: "PDF ochish",

    noteRequired: "Matn, havola, rasm yoki PDF qo‘shing.",
    invalidFile: "Faqat rasm va PDF fayllariga ruxsat beriladi.",
    fileTooLarge: "Fayl hajmi 15 MB dan oshmasligi kerak.",

    loading: "Yuklanmoqda...",
    loadSiteError: "Obyekt yuklash xatosi: ",
    loadRoomError: "Xona yuklash xatosi: ",
    loadNotesError: "Eslatmalarni yuklash xatosi: ",
    saveNoteError: "Eslatmani saqlash xatosi: ",
    uploadError: "Fayl yuklashda xato: ",
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
    workerMissing: "Logged-in worker was not found.",

    addLink: "Add link",
    linkPlaceholder: "https://...",
    addImage: "Add image",
    addPdf: "Add PDF",
    removeFile: "Remove file",
    selectedFile: "Selected file",
    openLink: "Open link",
    openPdf: "Open PDF",

    noteRequired: "Add text, a link, an image or a PDF.",
    invalidFile: "Only images and PDF files are allowed.",
    fileTooLarge: "The file may be up to 15 MB.",

    loading: "Loading...",
    loadSiteError: "Error loading site: ",
    loadRoomError: "Error loading room: ",
    loadNotesError: "Error loading notes: ",
    saveNoteError: "Error saving note: ",
    uploadError: "Error uploading file: ",
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
    workerMissing: "Přihlášený pracovník nebyl nalezen.",

    addLink: "Přidat odkaz",
    linkPlaceholder: "https://...",
    addImage: "Přidat obrázek",
    addPdf: "Přidat PDF",
    removeFile: "Odstranit soubor",
    selectedFile: "Vybraný soubor",
    openLink: "Otevřít odkaz",
    openPdf: "Otevřít PDF",

    noteRequired: "Přidejte text, odkaz, obrázek nebo PDF.",
    invalidFile: "Povoleny jsou pouze obrázky a PDF.",
    fileTooLarge: "Soubor může mít maximálně 15 MB.",

    loading: "Načítání...",
    loadSiteError: "Chyba při načítání stavby: ",
    loadRoomError: "Chyba při načítání místnosti: ",
    loadNotesError: "Chyba při načítání poznámek: ",
    saveNoteError: "Chyba při ukládání poznámky: ",
    uploadError: "Chyba při nahrávání souboru: ",
  },
};

export default function RoomDetailPage() {
  const params = useParams();

  const baustelleId = String(params.id);
  const roomId = String(params.roomId);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  const [baustelle, setBaustelle] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);

  const [lang, setLang] = useState("ba");
  const [radnik, setRadnik] = useState("");

  const [notes, setNotes] = useState<any[]>([]);

  const [noteText, setNoteText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileKind, setSelectedFileKind] = useState<
    "image" | "pdf" | ""
  >("");

  const [savingNote, setSavingNote] = useState(false);
  const [notesError, setNotesError] = useState("");

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
      setNotesError(tr.loadNotesError + error.message);
      return;
    }

    setNotesError("");
    setNotes(data || []);
  }

  function normalizeLink(value: string) {
    const clean = value.trim();

    if (!clean) return "";

    if (
      clean.startsWith("http://") ||
      clean.startsWith("https://")
    ) {
      return clean;
    }

    return `https://${clean}`;
  }

  function chooseImage() {
    imageInputRef.current?.click();
  }

  function choosePdf() {
    pdfInputRef.current?.click();
  }

  function handleImageFile(file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNotesError(t.invalidFile);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setNotesError(t.fileTooLarge);
      return;
    }

    setNotesError("");
    setSelectedFile(file);
    setSelectedFileKind("image");
  }

  function handlePdfFile(file?: File) {
    if (!file) return;

    if (file.type !== "application/pdf") {
      setNotesError(t.invalidFile);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setNotesError(t.fileTooLarge);
      return;
    }

    setNotesError("");
    setSelectedFile(file);
    setSelectedFileKind("pdf");
  }

  function removeSelectedFile() {
    setSelectedFile(null);
    setSelectedFileKind("");

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }

    if (pdfInputRef.current) {
      pdfInputRef.current.value = "";
    }
  }

  async function uploadSelectedFile() {
    if (!selectedFile) {
      return {
        fileUrl: "",
        fileName: "",
        fileType: "",
      };
    }

    const safeName = selectedFile.name
      .replace(/[^\w.\-]+/g, "_")
      .replace(/_+/g, "_");

    const uniqueName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}-${safeName}`;

    const storagePath =
      `${baustelleId}/${roomId}/${uniqueName}`;

    const { error: uploadError } = await supabase.storage
      .from("room-note-files")
      .upload(storagePath, selectedFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: selectedFile.type,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from("room-note-files")
      .getPublicUrl(storagePath);

    return {
      fileUrl: data.publicUrl || "",
      fileName: selectedFile.name,
      fileType: selectedFileKind,
    };
  }

  async function addNote() {
    const hasText = noteText.trim().length > 0;
    const hasLink = linkUrl.trim().length > 0;
    const hasFile = !!selectedFile;

    if (!hasText && !hasLink && !hasFile) {
      setNotesError(t.noteRequired);
      return;
    }

    if (!radnik) {
      setNotesError(t.workerMissing);
      return;
    }

    setSavingNote(true);
    setNotesError("");

    try {
      const uploaded = await uploadSelectedFile();

      const { error } = await supabase.from("room_notes").insert([
        {
          baustelle_id: Number(baustelleId),
          room_id: Number(roomId),

          tekst: noteText.trim() || "",

          radnik,

          link_url: normalizeLink(linkUrl),

          file_url: uploaded.fileUrl,
          file_name: uploaded.fileName,
          file_type: uploaded.fileType,
        },
      ]);

      if (error) {
        throw new Error(error.message);
      }

      setNoteText("");
      setLinkUrl("");
      setShowLinkInput(false);

      removeSelectedFile();

      await loadNotes(lang);
    } catch (error: any) {
      setNotesError(
        (selectedFile ? t.uploadError : t.saveNoteError) +
          (error?.message || String(error))
      );
    } finally {
      setSavingNote(false);
    }
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

      <h1 style={styles.title}>
        {room.naziv || t.room}
      </h1>

      <section style={styles.infoBox}>
        <p>
          <strong>{t.site}:</strong>{" "}
          {baustelle?.naziv || ""}
        </p>

        <p>
          <strong>{t.room}:</strong>{" "}
          {room.naziv || ""}
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

      <section style={styles.notesBox}>
        <h2 style={styles.notesTitle}>
          📝 {t.notesTitle}
        </h2>

        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder={t.notePlaceholder}
          style={styles.textarea}
        />

        {showLinkInput && (
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder={t.linkPlaceholder}
            style={styles.linkInput}
          />
        )}

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={(e) =>
            handleImageFile(e.target.files?.[0])
          }
          style={{ display: "none" }}
        />

        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) =>
            handlePdfFile(e.target.files?.[0])
          }
          style={{ display: "none" }}
        />

        <div style={styles.attachmentButtons}>
          <button
            type="button"
            onClick={() =>
              setShowLinkInput((old) => !old)
            }
            style={styles.attachmentButton}
          >
            🔗 {t.addLink}
          </button>

          <button
            type="button"
            onClick={chooseImage}
            style={styles.attachmentButton}
          >
            🖼️ {t.addImage}
          </button>

          <button
            type="button"
            onClick={choosePdf}
            style={styles.attachmentButton}
          >
            📄 {t.addPdf}
          </button>
        </div>

        {selectedFile && (
          <div style={styles.selectedFileBox}>
            <div>
              <strong>{t.selectedFile}:</strong>{" "}
              {selectedFile.name}
            </div>

            <button
              type="button"
              onClick={removeSelectedFile}
              style={styles.removeFileButton}
            >
              ✕ {t.removeFile}
            </button>
          </div>
        )}

        {notesError && (
          <div style={styles.errorBox}>
            {notesError}
          </div>
        )}

        <div style={styles.noteFormBottom}>
          <div style={styles.currentWorker}>
            {radnik
              ? `👤 ${radnik}`
              : `⚠️ ${t.workerMissing}`}
          </div>

          <button
            type="button"
            onClick={addNote}
            disabled={savingNote}
            style={{
              ...styles.addNoteButton,
              opacity: savingNote ? 0.6 : 1,
              cursor: savingNote
                ? "not-allowed"
                : "pointer",
            }}
          >
            {savingNote
              ? t.saving
              : `+ ${t.addNote}`}
          </button>
        </div>

        <div style={styles.notesDivider} />

        {notes.length === 0 ? (
          <p style={styles.emptyNotes}>
            {t.noNotes}
          </p>
        ) : (
          <div style={styles.notesList}>
            {notes.map((note) => (
              <article
                key={note.id}
                style={styles.noteCard}
              >
                <div style={styles.noteHeader}>
                  <div style={styles.noteWorker}>
                    👤 {note.radnik || "-"}
                  </div>

                  <div style={styles.noteDate}>
                    {formatDate(note.created_at)}
                  </div>
                </div>

                {note.tekst && (
                  <div style={styles.noteText}>
                    {note.tekst}
                  </div>
                )}

                {note.link_url && (
                  <a
                    href={note.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.savedLink}
                  >
                    🔗 {t.openLink}: {note.link_url}
                  </a>
                )}

                {note.file_url &&
                  note.file_type === "image" && (
                    <div style={styles.imagePreviewBox}>
                      <a
                        href={note.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={note.file_url}
                          alt={
                            note.file_name || "Room note"
                          }
                          style={styles.noteImage}
                        />
                      </a>

                      {note.file_name && (
                        <div style={styles.fileName}>
                          🖼️ {note.file_name}
                        </div>
                      )}
                    </div>
                  )}

                {note.file_url &&
                  note.file_type === "pdf" && (
                    <div style={styles.pdfBox}>
                      <div style={styles.pdfHeader}>
                        <div style={styles.fileName}>
                          📄{" "}
                          {note.file_name ||
                            "PDF"}
                        </div>

                        <a
                          href={note.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.openPdfButton}
                        >
                          {t.openPdf}
                        </a>
                      </div>

                      <iframe
                        src={note.file_url}
                        title={
                          note.file_name || "PDF"
                        }
                        style={styles.pdfPreview}
                      />
                    </div>
                  )}

                <div style={styles.noteFooter}>
                  {t.writtenBy}:{" "}
                  {note.radnik || "-"}
                </div>
              </article>
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
    gridTemplateColumns:
      "repeat(auto-fit, minmax(280px, 1fr))",
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

  linkInput: {
    width: "100%",
    boxSizing: "border-box",
    marginTop: "12px",
    padding: "14px 16px",
    borderRadius: "12px",
    border: "1px solid #333",
    background: "#1f1f1f",
    color: "white",
    fontSize: "16px",
    outline: "none",
  },

  attachmentButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "14px",
  },

  attachmentButton: {
    background: "#374151",
    color: "white",
    border: "1px solid #4b5563",
    borderRadius: "10px",
    padding: "12px 16px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  selectedFileBox: {
    marginTop: "14px",
    background: "#1f2937",
    border: "1px solid #374151",
    borderRadius: "12px",
    padding: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },

  removeFileButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "9px 12px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  errorBox: {
    marginTop: "14px",
    padding: "12px 14px",
    borderRadius: "10px",
    background: "#3f1515",
    border: "1px solid #7f1d1d",
    color: "#fecaca",
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
    gap: "18px",
  },

  noteCard: {
    background: "#1d1d1d",
    border: "1px solid #333",
    borderRadius: "14px",
    padding: "18px",
    overflow: "hidden",
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

  savedLink: {
    display: "block",
    marginTop: "12px",
    padding: "12px",
    borderRadius: "10px",
    background: "#172554",
    color: "#93c5fd",
    textDecoration: "none",
    wordBreak: "break-all",
  },

  imagePreviewBox: {
    marginTop: "15px",
  },

  noteImage: {
    display: "block",
    width: "100%",
    maxWidth: "700px",
    maxHeight: "600px",
    objectFit: "contain",
    background: "#000",
    borderRadius: "12px",
    border: "1px solid #333",
  },

  fileName: {
    marginTop: "8px",
    color: "#d1d5db",
    fontWeight: "bold",
    wordBreak: "break-word",
  },

  pdfBox: {
    marginTop: "15px",
    background: "#111",
    border: "1px solid #333",
    borderRadius: "12px",
    padding: "12px",
  },

  pdfHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "12px",
  },

  openPdfButton: {
    background: "#2563eb",
    color: "white",
    textDecoration: "none",
    borderRadius: "9px",
    padding: "10px 14px",
    fontWeight: "bold",
  },

  pdfPreview: {
    width: "100%",
    height: "600px",
    border: "none",
    borderRadius: "10px",
    background: "white",
  },

  noteFooter: {
    color: "#9ca3af",
    fontSize: "13px",
    marginTop: "15px",
    paddingTop: "12px",
    borderTop: "1px solid #333",
  },
};