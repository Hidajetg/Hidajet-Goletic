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
    loading: "Wird geladen...",
    loadSiteError: "Fehler beim Laden der Baustelle: ",
    loadRoomError: "Fehler beim Laden des Raums: ",
  },

  ba: {
    back: "Nazad na prostorije",
    room: "Prostorija",
    site: "Baustelle",
    material: "Materijal",
    workHours: "Radni sati",
    photos: "Fotografije",
    productivity: "Produktivnost",
    loading: "Učitavanje...",
    loadSiteError: "Greška kod učitavanja Baustelle: ",
    loadRoomError: "Greška kod učitavanja prostorije: ",
  },

  uz: {
    back: "Xonalarga qaytish",
    room: "Xona",
    site: "Obyekt",
    material: "Material",
    workHours: "Ish soatlari",
    photos: "Rasmlar",
    productivity: "Mahsuldorlik",
    loading: "Yuklanmoqda...",
    loadSiteError: "Obyekt yuklash xatosi: ",
    loadRoomError: "Xona yuklash xatosi: ",
  },

  en: {
    back: "Back to Rooms",
    room: "Room",
    site: "Site",
    material: "Material",
    workHours: "Work Hours",
    photos: "Photos",
    productivity: "Productivity",
    loading: "Loading...",
    loadSiteError: "Error loading site: ",
    loadRoomError: "Error loading room: ",
  },
};

export default function RoomDetailPage() {
  const params = useParams();

  const baustelleId = String(params.id);
  const roomId = String(params.roomId);

  const [baustelle, setBaustelle] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);
  const [lang, setLang] = useState("ba");

  const t = translations[lang] || translations.ba;

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") || "ba";
    setLang(savedLang);

    loadData(savedLang);
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
      .single();

    if (roomRes.error) {
      alert(tr.loadRoomError + roomRes.error.message);
      return;
    }

    setBaustelle(baustelleRes.data);
    setRoom(roomRes.data);
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
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
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
};