"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const translations: any = {
  de: {
    back: "Zurück zu Baustellen",
    loading: "Wird geladen...",
    loadError: "Fehler beim Laden der Baustelle: ",
    archiveError: "Fehler beim Archivieren: ",
    deleteError: "Fehler beim Löschen: ",
    archiveConfirm:
      "Möchten Sie diese Baustelle wirklich abschließen und ins Archiv verschieben?",
    deleteNotAllowed:
      "Diese Baustelle hat Einträge. Nur Admin kann eine Baustelle mit bestehenden Einträgen löschen.",
    deleteConfirmWithEntries:
      "Diese Baustelle hat Einträge. Möchte der Admin diese Baustelle wirklich dauerhaft löschen?",
    deleteConfirmEmpty:
      "Möchten Sie diese leere Baustelle wirklich löschen?",
    location: "Ort",
    description: "Beschreibung",
    status: "Status",
    active: "Aktiv",
    rooms: "Räume",
    overview: "Übersicht",
    regiebericht: "Regietagesbericht",
    close: "Baustelle abschließen",
    delete: "Baustelle löschen",
  },
  ba: {
    back: "Nazad na Baustelle",
    loading: "Učitavanje...",
    loadError: "Greška kod učitavanja Baustelle: ",
    archiveError: "Greška kod arhiviranja: ",
    deleteError: "Greška kod brisanja: ",
    archiveConfirm:
      "Da li zaista želiš zatvoriti ovu Baustelle i prebaciti je u arhivu?",
    deleteNotAllowed:
      "Ova Baustelle ima unose. Samo admin može obrisati Baustelle sa postojećim unosima.",
    deleteConfirmWithEntries:
      "Ova Baustelle ima unose. Da li admin zaista želi trajno obrisati ovu Baustelle?",
    deleteConfirmEmpty: "Da li zaista želiš obrisati ovu praznu Baustelle?",
    location: "Lokacija",
    description: "Opis",
    status: "Status",
    active: "Aktiv",
    rooms: "Prostorije",
    overview: "Pregled",
    regiebericht: "Regietagesbericht",
    close: "Zatvori Baustelle",
    delete: "Obriši Baustelle",
  },
  uz: {
    back: "Obyektlarga qaytish",
    loading: "Yuklanmoqda...",
    loadError: "Obyektni yuklashda xatolik: ",
    archiveError: "Arxivlashda xatolik: ",
    deleteError: "O‘chirishda xatolik: ",
    archiveConfirm:
      "Ushbu obyektni yopib, arxivga ko‘chirishni xohlaysizmi?",
    deleteNotAllowed:
      "Bu obyekt ichida yozuvlar bor. Yozuvlari bor obyektni faqat admin o‘chirishi mumkin.",
    deleteConfirmWithEntries:
      "Bu obyekt ichida yozuvlar bor. Admin ushbu obyektni butunlay o‘chirmoqchimi?",
    deleteConfirmEmpty: "Ushbu bo‘sh obyektni o‘chirishni xohlaysizmi?",
    location: "Manzil",
    description: "Tavsif",
    status: "Holat",
    active: "Faol",
    rooms: "Xonalar",
    overview: "Ko‘rinish",
    regiebericht: "Regie hisoboti",
    close: "Obyektni yopish",
    delete: "Obyektni o‘chirish",
  },
  en: {
    back: "Back to Sites",
    loading: "Loading...",
    loadError: "Error loading site: ",
    archiveError: "Error archiving: ",
    deleteError: "Error deleting: ",
    archiveConfirm:
      "Do you really want to close this site and move it to the archive?",
    deleteNotAllowed:
      "This site has entries. Only admin can delete a site with existing entries.",
    deleteConfirmWithEntries:
      "This site has entries. Does the admin really want to permanently delete this site?",
    deleteConfirmEmpty: "Do you really want to delete this empty site?",
    location: "Location",
    description: "Description",
    status: "Status",
    active: "Active",
    rooms: "Rooms",
    overview: "Overview",
    regiebericht: "Regie daily report",
    close: "Close Site",
    delete: "Delete Site",
  },
};

export default function BaustelleDetailPage() {
  const params = useParams();
  const router = useRouter();

  const baustelleId = String(params.id);

  const [baustelle, setBaustelle] = useState<any>(null);
  const [workerRole, setWorkerRole] = useState("");
  const [lang, setLang] = useState("ba");

  const t = translations[lang] || translations.ba;

  useEffect(() => {
    const role = localStorage.getItem("worker_role") || "worker";
    const savedLang = localStorage.getItem("lang") || "ba";

    setWorkerRole(role);
    setLang(savedLang);
    loadBaustelle();
  }, []);

  async function loadBaustelle() {
    const { data, error } = await supabase
      .from("baustellen")
      .select("*")
      .eq("id", baustelleId)
      .single();

    if (error) {
      alert(t.loadError + error.message);
      return;
    }

    setBaustelle(data);
  }

  async function countRows(tableName: string) {
    const { count } = await supabase
      .from(tableName)
      .select("*", { count: "exact", head: true })
      .eq("baustelle_id", baustelleId);

    return count || 0;
  }

  async function checkIfBaustelleHasEntries() {
    const prostorijeCount = await countRows("prostorije");
    const satiCount = await countRows("baustelle_hours");
    const materijalCount = await countRows("material_entries");
    const roomMaterialCount = await countRows("room_material");
    const photosCount = await countRows("room_photos");
    const produktivnostCount = await countRows("produktivnost");

    return (
      prostorijeCount +
        satiCount +
        materijalCount +
        roomMaterialCount +
        photosCount +
        produktivnostCount >
      0
    );
  }

  async function archiveBaustelle() {
    const confirmArchive = confirm(t.archiveConfirm);

    if (!confirmArchive) return;

    const { error } = await supabase
      .from("baustellen")
      .update({ status: "Archiv" })
      .eq("id", baustelleId);

    if (error) {
      alert(t.archiveError + error.message);
      return;
    }

    router.push("/baustellen");
  }

  async function deleteBaustelle() {
    const hasEntries = await checkIfBaustelleHasEntries();

    if (hasEntries && workerRole !== "admin") {
      alert(t.deleteNotAllowed);
      return;
    }

    const confirmDelete = confirm(
      hasEntries ? t.deleteConfirmWithEntries : t.deleteConfirmEmpty
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("baustellen")
      .delete()
      .eq("id", baustelleId);

    if (error) {
      alert(t.deleteError + error.message);
      return;
    }

    router.push("/baustellen");
  }

  if (!baustelle) {
    return (
      <main style={mainStyle}>
        <p>{t.loading}</p>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <Link href="/baustellen" style={backLinkStyle}>
        ← {t.back}
      </Link>

      <h1 style={titleStyle}>{baustelle.naziv || "Baustelle"}</h1>

      <div style={infoBoxStyle}>
        {baustelle.lokacija && (
          <p>
            <strong>{t.location}:</strong> {baustelle.lokacija}
          </p>
        )}

        {baustelle.opis && (
          <p>
            <strong>{t.description}:</strong> {baustelle.opis}
          </p>
        )}

        <p>
          <strong>{t.status}:</strong>{" "}
          {baustelle.status === "Aktiv" ? t.active : baustelle.status}
        </p>
      </div>

      <div style={gridStyle}>
        <Link href={`/baustellen/${baustelleId}/prostorije`} style={buttonStyle}>
          {t.rooms}
        </Link>

        <Link href={`/baustellen/${baustelleId}/pregled`} style={buttonStyle}>
          {t.overview}
        </Link>

        <Link
          href={`/baustellen/${baustelleId}/regiebericht`}
          style={buttonStyle}
        >
          {t.regiebericht}
        </Link>
      </div>

      <div style={actionBoxStyle}>
        <button onClick={archiveBaustelle} style={archiveButtonStyle}>
          {t.close}
        </button>

        <button onClick={deleteBaustelle} style={deleteButtonStyle}>
          {t.delete}
        </button>
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

const infoBoxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  marginBottom: "30px",
  lineHeight: "1.6",
};

const gridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "20px",
  marginBottom: "35px",
};

const buttonStyle: any = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "25px",
  background: "#2563eb",
  color: "white",
  borderRadius: "16px",
  fontSize: "20px",
  fontWeight: "bold",
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
};

const actionBoxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  display: "flex",
  gap: "20px",
  flexWrap: "wrap",
};

const archiveButtonStyle: any = {
  background: "#f97316",
  color: "white",
  padding: "16px 24px",
  border: "none",
  borderRadius: "12px",
  fontSize: "18px",
  fontWeight: "bold",
  cursor: "pointer",
};

const deleteButtonStyle: any = {
  background: "#dc2626",
  color: "white",
  padding: "16px 24px",
  border: "none",
  borderRadius: "12px",
  fontSize: "18px",
  fontWeight: "bold",
  cursor: "pointer",
};