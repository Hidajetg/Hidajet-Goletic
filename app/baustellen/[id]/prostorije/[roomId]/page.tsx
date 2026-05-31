"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function RoomDetailPage() {
  const params = useParams();

  const baustelleId = String(params.id);
  const roomId = String(params.roomId);

  const [baustelleName, setBaustelleName] = useState("Baustelle");
  const [roomName, setRoomName] = useState("Prostorija");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: baustelleData } = await supabase
      .from("baustellen")
      .select("naziv")
      .eq("id", baustelleId)
      .single();

    if (baustelleData?.naziv) {
      setBaustelleName(baustelleData.naziv);
    }

    const { data: roomData } = await supabase
      .from("prostorije")
      .select("naziv")
      .eq("id", roomId)
      .single();

    if (roomData?.naziv) {
      setRoomName(roomData.naziv);
    }
  }

  return (
    <main
      style={{
        background: "#000",
        minHeight: "100vh",
        color: "white",
        padding: "40px",
      }}
    >
      <Link
        href={`/baustellen/${baustelleId}/prostorije`}
        style={{
          color: "#3b82f6",
          textDecoration: "none",
          fontWeight: "bold",
        }}
      >
        ← Nazad na prostorije
      </Link>

      <h1
        style={{
          fontSize: "56px",
          fontWeight: "bold",
          marginTop: "30px",
          marginBottom: "30px",
        }}
      >
        {roomName}
      </h1>

      <div
        style={{
          background: "#111",
          padding: "25px",
          borderRadius: "20px",
          marginBottom: "30px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Baustelle: {baustelleName}</h2>
        <h2 style={{ marginBottom: 0 }}>Prostorija: {roomName}</h2>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
        }}
      >
        <Link href={`/baustellen/${baustelleId}/material`} style={buttonStyle}>
          Materijal
        </Link>

        <Link href={`/baustellen/${baustelleId}/sati`} style={buttonStyle}>
          Radni sati
        </Link>

        <Link
          href={`/baustellen/${baustelleId}/prostorije/${roomId}/fotografije`}
          style={photoButtonStyle}
        >
          Fotografije
        </Link>

        <Link
          href={`/baustellen/${baustelleId}/prostorije/${roomId}/produktivnost`}
          style={buttonStyle}
        >
          Produktivnost
        </Link>
      </div>
    </main>
  );
}

const buttonStyle: any = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "25px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "16px",
  fontSize: "20px",
  fontWeight: "bold",
  cursor: "pointer",
  textDecoration: "none",
};

const photoButtonStyle: any = {
  ...buttonStyle,
  background: "#16a34a",
};