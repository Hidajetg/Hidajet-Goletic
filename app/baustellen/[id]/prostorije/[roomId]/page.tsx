"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function RoomDetailPage() {
  const params = useParams();

  const baustelleId = String(params.id);
  const roomId = String(params.roomId);

  const [baustelle, setBaustelle] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const baustelleRes = await supabase
      .from("baustellen")
      .select("*")
      .eq("id", Number(baustelleId))
      .single();

    if (baustelleRes.error) {
      alert("Greška kod učitavanja Baustelle: " + baustelleRes.error.message);
      return;
    }

    const roomRes = await supabase
      .from("prostorije")
      .select("*")
      .eq("id", Number(roomId))
      .single();

    if (roomRes.error) {
      alert("Greška kod učitavanja prostorije: " + roomRes.error.message);
      return;
    }

    setBaustelle(baustelleRes.data);
    setRoom(roomRes.data);
  }

  if (!room) {
    return (
      <main style={styles.page}>
        <p>Učitavanje...</p>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <Link
        href={`/baustellen/${baustelleId}/prostorije`}
        style={styles.backLink}
      >
        ← Nazad na prostorije
      </Link>

      <h1 style={styles.title}>{room.naziv || "Prostorija"}</h1>

      <section style={styles.infoBox}>
        <p>
          <strong>Baustelle:</strong> {baustelle?.naziv || ""}
        </p>
        <p>
          <strong>Prostorija:</strong> {room.naziv || ""}
        </p>
      </section>

      <section style={styles.grid}>
        <Link
          href={`/baustellen/${baustelleId}/prostorije/${roomId}/material`}
          style={styles.blueButton}
        >
          Materijal
        </Link>

        <Link
          href={`/baustellen/${baustelleId}/sati`}
          style={styles.blueButton}
        >
          Radni sati
        </Link>

        <Link
          href={`/baustellen/${baustelleId}/prostorije/${roomId}/fotografije`}
          style={styles.greenButton}
        >
          Fotografije
        </Link>

        <Link
          href={`/baustellen/${baustelleId}/prostorije/${roomId}/produktivnost`}
          style={styles.blueButton}
        >
          Produktivnost
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