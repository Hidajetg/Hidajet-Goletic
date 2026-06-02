"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];

const translations: any = {
  de: {
    back: "← Zurück zum Dashboard",
    title: "Private Notiz",
    newNote: "Neue Notiz",
    baustelle: "Baustelle",
    chooseBaustelle: "Baustelle auswählen",
    titleInput: "Titel",
    noteInput: "Notiz",
    save: "Speichern",
    update: "Aktualisieren",
    cancel: "Abbrechen",
    myNotes: "Meine Notizen",
    allNotes: "Alle Notizen",
    worker: "Mitarbeiter",
    date: "Datum",
    edit: "Bearbeiten",
    delete: "Löschen",
    empty: "Noch keine Notizen vorhanden.",
    search: "Suchen...",
  },
  ba: {
    back: "← Nazad na Dashboard",
    title: "Privatna bilješka",
    newNote: "Nova bilješka",
    baustelle: "Baustelle",
    chooseBaustelle: "Odaberi Baustelle",
    titleInput: "Naslov",
    noteInput: "Bilješka",
    save: "Sačuvaj",
    update: "Ažuriraj",
    cancel: "Prekini",
    myNotes: "Moje bilješke",
    allNotes: "Sve bilješke",
    worker: "Radnik",
    date: "Datum",
    edit: "Uredi",
    delete: "Obriši",
    empty: "Još nema bilješki.",
    search: "Pretraga...",
  },
  uz: {
    back: "← Dashboardga qaytish",
    title: "Shaxsiy eslatma",
    newNote: "Yangi eslatma",
    baustelle: "Obyekt",
    chooseBaustelle: "Obyektni tanlang",
    titleInput: "Sarlavha",
    noteInput: "Eslatma",
    save: "Saqlash",
    update: "Yangilash",
    cancel: "Bekor qilish",
    myNotes: "Mening eslatmalarim",
    allNotes: "Barcha eslatmalar",
    worker: "Ishchi",
    date: "Sana",
    edit: "Tahrirlash",
    delete: "O‘chirish",
    empty: "Hozircha eslatmalar yo‘q.",
    search: "Qidirish...",
  },
  en: {
    back: "← Back to Dashboard",
    title: "Private note",
    newNote: "New note",
    baustelle: "Site",
    chooseBaustelle: "Choose site",
    titleInput: "Title",
    noteInput: "Note",
    save: "Save",
    update: "Update",
    cancel: "Cancel",
    myNotes: "My notes",
    allNotes: "All notes",
    worker: "Worker",
    date: "Date",
    edit: "Edit",
    delete: "Delete",
    empty: "No notes yet.",
    search: "Search...",
  },
};

export default function PrivateNotesPage() {
  const [lang, setLang] = useState("ba");
  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [baustellen, setBaustellen] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);

  const [baustelleId, setBaustelleId] = useState("");
  const [naslov, setNaslov] = useState("");
  const [biljeska, setBiljeska] = useState("");
  const [search, setSearch] = useState("");

  const [editId, setEditId] = useState<number | null>(null);

  const t = translations[lang] || translations.ba;

  useEffect(() => {
    const name = localStorage.getItem("worker_name") || "";
    const savedLang = localStorage.getItem("lang") || "ba";

    setWorkerName(name);
    setIsAdmin(ADMINI.includes(name));
    setLang(savedLang);

    loadData(name, ADMINI.includes(name));
  }, []);

  async function loadData(name = workerName, adminStatus = isAdmin) {
    const baustellenRes = await supabase
      .from("baustellen")
      .select("id, naziv, lokacija, status")
      .order("naziv", { ascending: true });

    setBaustellen(baustellenRes.data || []);

    let query = supabase
      .from("private_notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!adminStatus && name) {
      query = query.eq("worker_name", name);
    }

    const { data, error } = await query;

    if (error) {
      alert("LOAD PRIVATE NOTES: " + error.message);
      return;
    }

    setNotes(data || []);
  }

  function getBaustelleName(id: number) {
    const b = baustellen.find((x) => Number(x.id) === Number(id));

    if (!b) return "-";

    return `${b.naziv}${b.lokacija ? " - " + b.lokacija : ""}`;
  }

  function formatDateTime(value: string) {
    return new Date(value).toLocaleString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function resetForm() {
    setBaustelleId("");
    setNaslov("");
    setBiljeska("");
    setEditId(null);
  }

  async function saveNote() {
    if (!naslov.trim()) {
      alert(t.titleInput);
      return;
    }

    if (!biljeska.trim()) {
      alert(t.noteInput);
      return;
    }

    if (editId) {
      const { error } = await supabase
        .from("private_notes")
        .update({
          baustelle_id: baustelleId ? Number(baustelleId) : null,
          naslov: naslov.trim(),
          biljeska: biljeska.trim(),
        })
        .eq("id", editId);

      if (error) {
        alert("UPDATE NOTE: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("private_notes").insert([
        {
          worker_name: workerName || "Unbekannt",
          baustelle_id: baustelleId ? Number(baustelleId) : null,
          naslov: naslov.trim(),
          biljeska: biljeska.trim(),
        },
      ]);

      if (error) {
        alert("INSERT NOTE: " + error.message);
        return;
      }
    }

    resetForm();
    await loadData(workerName, isAdmin);
  }

  function startEdit(note: any) {
    setEditId(note.id);
    setBaustelleId(note.baustelle_id ? String(note.baustelle_id) : "");
    setNaslov(note.naslov || "");
    setBiljeska(note.biljeska || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteNote(id: number) {
    const potvrda = confirm("Notiz wirklich löschen?");

    if (!potvrda) return;

    const { error } = await supabase.from("private_notes").delete().eq("id", id);

    if (error) {
      alert("DELETE NOTE: " + error.message);
      return;
    }

    await loadData(workerName, isAdmin);
  }

  const filteredNotes = notes.filter((n) => {
    const text = `${n.naslov || ""} ${n.biljeska || ""} ${n.worker_name || ""}`
      .toLowerCase()
      .trim();

    return text.includes(search.toLowerCase().trim());
  });

  return (
    <main style={styles.page}>
      <Link href="/dashboard" style={styles.backLink}>
        {t.back}
      </Link>

      <h1 style={styles.title}>📝 {t.title}</h1>

      <section style={styles.box}>
        <h2 style={styles.subtitle}>{editId ? t.edit : t.newNote}</h2>

        <label style={styles.label}>{t.baustelle}</label>
        <select
          value={baustelleId}
          onChange={(e) => setBaustelleId(e.target.value)}
          style={styles.input}
        >
          <option value="">{t.chooseBaustelle}</option>

          {baustellen.map((b) => (
            <option key={b.id} value={b.id}>
              {b.naziv} {b.lokacija ? `- ${b.lokacija}` : ""}
            </option>
          ))}
        </select>

        <input
          value={naslov}
          onChange={(e) => setNaslov(e.target.value)}
          placeholder={t.titleInput}
          style={styles.input}
        />

        <textarea
          value={biljeska}
          onChange={(e) => setBiljeska(e.target.value)}
          placeholder={t.noteInput}
          style={styles.textarea}
        />

        <div style={styles.buttonRow}>
          <button onClick={saveNote} style={styles.saveButton}>
            {editId ? t.update : t.save}
          </button>

          {editId && (
            <button onClick={resetForm} style={styles.cancelButton}>
              {t.cancel}
            </button>
          )}
        </div>
      </section>

      <section style={styles.box}>
        <h2 style={styles.subtitle}>
          {isAdmin ? t.allNotes : t.myNotes} ({filteredNotes.length})
        </h2>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.search}
          style={styles.input}
        />

        {filteredNotes.length === 0 && (
          <p style={styles.emptyText}>{t.empty}</p>
        )}

        {filteredNotes.map((note) => (
          <div key={note.id} style={styles.noteCard}>
            <div style={styles.noteTop}>
              <strong>{note.naslov}</strong>
              <span>{formatDateTime(note.created_at)}</span>
            </div>

            {note.baustelle_id && (
              <p style={styles.line}>
                <strong>{t.baustelle}:</strong>{" "}
                {getBaustelleName(note.baustelle_id)}
              </p>
            )}

            {isAdmin && (
              <p style={styles.line}>
                <strong>{t.worker}:</strong> {note.worker_name}
              </p>
            )}

            <p style={styles.noteText}>{note.biljeska}</p>

            <div style={styles.buttonRow}>
              <button onClick={() => startEdit(note)} style={styles.editButton}>
                {t.edit}
              </button>

              <button
                onClick={() => deleteNote(note.id)}
                style={styles.deleteButton}
              >
                {t.delete}
              </button>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

const styles: any = {
  page: {
    background: "#000",
    minHeight: "100vh",
    color: "white",
    padding: "24px",
  },
  backLink: {
    color: "#3b82f6",
    textDecoration: "none",
    fontWeight: "bold",
  },
  title: {
    fontSize: "42px",
    color: "#f97316",
    marginTop: "24px",
    marginBottom: "28px",
  },
  box: {
    background: "#111",
    border: "1px solid #333",
    padding: "20px",
    borderRadius: "18px",
    marginBottom: "24px",
  },
  subtitle: {
    color: "#f97316",
    marginBottom: "14px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    color: "#ccc",
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    background: "#222",
    color: "white",
    border: "1px solid #333",
    padding: "14px",
    borderRadius: "10px",
    marginBottom: "14px",
    fontSize: "16px",
  },
  textarea: {
    width: "100%",
    minHeight: "150px",
    background: "#222",
    color: "white",
    border: "1px solid #333",
    padding: "14px",
    borderRadius: "10px",
    marginBottom: "14px",
    fontSize: "16px",
    resize: "vertical",
  },
  buttonRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  saveButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    padding: "14px 22px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  cancelButton: {
    background: "#444",
    color: "white",
    border: "none",
    padding: "14px 22px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  emptyText: {
    color: "#aaa",
  },
  noteCard: {
    background: "#000",
    border: "1px solid #333",
    padding: "16px",
    borderRadius: "14px",
    marginBottom: "14px",
  },
  noteTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    color: "#f97316",
    marginBottom: "10px",
  },
  line: {
    margin: "6px 0",
  },
  noteText: {
    whiteSpace: "pre-wrap",
    color: "#ddd",
    marginTop: "12px",
    marginBottom: "14px",
    lineHeight: "1.5",
  },
  editButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  deleteButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
};