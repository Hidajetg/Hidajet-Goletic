"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

const translations: any = {
  de: {
    dashboard: "Dashboard",
    back: "Zurück zur Baustelle",
    rooms: "Räume",
    siteId: "Baustelle ID",
    addRoom: "Raum hinzufügen",
    roomName: "Raumname",
    saveRoom: "Raum speichern",
    roomList: "Raumliste",
    noRooms: "Keine Räume vorhanden.",
    enterRoom: "Bitte Raumnamen eingeben",
    renameRoom: "Neuer Raumname:",
    deleteQuestion: "Diesen Raum wirklich löschen?",
    edit: "Bearbeiten",
    delete: "Löschen",
  },

  ba: {
    dashboard: "Dashboard",
    back: "Nazad na Baustelle",
    rooms: "Prostorije",
    siteId: "Baustelle ID",
    addRoom: "Dodaj prostoriju",
    roomName: "Naziv prostorije",
    saveRoom: "Sačuvaj prostoriju",
    roomList: "Lista prostorija",
    noRooms: "Nema unesenih prostorija.",
    enterRoom: "Unesi naziv prostorije",
    renameRoom: "Novi naziv prostorije:",
    deleteQuestion: "Da li sigurno želiš obrisati ovu prostoriju?",
    edit: "Uredi",
    delete: "Obriši",
  },

  uz: {
    dashboard: "Dashboard",
    back: "Obyektga qaytish",
    rooms: "Xonalar",
    siteId: "Obyekt ID",
    addRoom: "Xona qo‘shish",
    roomName: "Xona nomi",
    saveRoom: "Xonani saqlash",
    roomList: "Xonalar ro‘yxati",
    noRooms: "Xonalar mavjud emas.",
    enterRoom: "Xona nomini kiriting",
    renameRoom: "Yangi xona nomi:",
    deleteQuestion: "Bu xonani o‘chirishni xohlaysizmi?",
    edit: "Tahrirlash",
    delete: "O‘chirish",
  },

  en: {
    dashboard: "Dashboard",
    back: "Back to Site",
    rooms: "Rooms",
    siteId: "Site ID",
    addRoom: "Add Room",
    roomName: "Room Name",
    saveRoom: "Save Room",
    roomList: "Room List",
    noRooms: "No rooms entered.",
    enterRoom: "Enter room name",
    renameRoom: "New room name:",
    deleteQuestion: "Do you really want to delete this room?",
    edit: "Edit",
    delete: "Delete",
  },
};

export default function ProstorijePage() {
  const params = useParams();
  const baustelleId = String(params.id);

  const [naziv, setNaziv] = useState("");
  const [prostorije, setProstorije] = useState<any[]>([]);
  const [lang, setLang] = useState("ba");

  const t = translations[lang] || translations.ba;

  async function loadProstorije() {
    const { data, error } = await supabase
      .from("prostorije")
      .select("*")
      .eq("baustelle_id", baustelleId)
      .order("id", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setProstorije(data || []);
  }

  async function saveProstorija() {
    if (!naziv.trim()) {
      alert(t.enterRoom);
      return;
    }

    const { error } = await supabase.from("prostorije").insert([
      {
        baustelle_id: baustelleId,
        naziv: naziv.trim(),
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setNaziv("");
    loadProstorije();
  }

  async function renameProstorija(id: number, oldName: string) {
    const noviNaziv = prompt(t.renameRoom, oldName);

    if (!noviNaziv) return;

    if (!noviNaziv.trim()) {
      alert(t.enterRoom);
      return;
    }

    const { error } = await supabase
      .from("prostorije")
      .update({
        naziv: noviNaziv.trim(),
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadProstorije();
  }

  async function deleteProstorija(id: number) {
    const potvrda = confirm(t.deleteQuestion);

    if (!potvrda) return;

    const { error } = await supabase
      .from("prostorije")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadProstorije();
  }

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") || "ba";
    setLang(savedLang);
    loadProstorije();
  }, []);

  return (
    <main style={pageStyle}>
      <div style={{ display: "flex", gap: "20px", marginBottom: "25px" }}>
        <Link href="/dashboard" style={backLinkStyle}>
          ← {t.dashboard}
        </Link>

        <Link href="/baustellen" style={backLinkStyle}>
          ← {t.back}
        </Link>
      </div>

      <h1 style={titleStyle}>{t.rooms}</h1>

      <div style={boxStyle}>
        <h2>
          {t.siteId}: {baustelleId}
        </h2>
      </div>

      <div style={boxStyle}>
        <h2>+ {t.addRoom}</h2>

        <input
          placeholder={t.roomName}
          value={naziv}
          onChange={(e) => setNaziv(e.target.value)}
          style={inputStyle}
        />

        <button onClick={saveProstorija} style={buttonStyle}>
          {t.saveRoom}
        </button>
      </div>

      <div style={boxStyle}>
        <h2>{t.roomList}</h2>

        {prostorije.length === 0 && (
          <p style={{ color: "#999" }}>{t.noRooms}</p>
        )}

        {prostorije.map((p) => (
          <div key={p.id} style={roomRowStyle}>
            <Link
              href={`/baustellen/${baustelleId}/prostorije/${p.id}`}
              style={roomButtonStyle}
            >
              <strong>{p.naziv}</strong>
            </Link>

            <button
              onClick={() => renameProstorija(p.id, p.naziv)}
              style={editButtonStyle}
              title={t.edit}
            >
              ✏️
            </button>

            <button
              onClick={() => deleteProstorija(p.id)}
              style={deleteButtonStyle}
              title={t.delete}
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}

const pageStyle: any = {
  background: "#000",
  minHeight: "100vh",
  color: "white",
  padding: "30px",
};

const backLinkStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
};

const titleStyle: any = {
  fontSize: "60px",
  fontWeight: "bold",
  marginBottom: "30px",
};

const boxStyle: any = {
  background: "#111",
  padding: "20px",
  borderRadius: "20px",
  marginBottom: "30px",
};

const inputStyle: any = {
  width: "100%",
  padding: "16px",
  marginTop: "15px",
  marginBottom: "15px",
  borderRadius: "10px",
  border: "none",
  background: "#222",
  color: "white",
};

const buttonStyle: any = {
  background: "#2563eb",
  color: "white",
  padding: "15px 25px",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const roomRowStyle: any = {
  display: "grid",
  gridTemplateColumns: "1fr 55px 55px",
  gap: "10px",
  alignItems: "center",
  marginTop: "15px",
};

const roomButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  padding: "20px",
  borderRadius: "12px",
  textDecoration: "none",
  fontWeight: "bold",
  display: "block",
};

const editButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  height: "55px",
  borderRadius: "12px",
  cursor: "pointer",
  fontSize: "32px",
};

const deleteButtonStyle: any = {
  background: "#dc2626",
  color: "white",
  border: "none",
  height: "55px",
  borderRadius: "12px",
  cursor: "pointer",
  fontSize: "22px",
};