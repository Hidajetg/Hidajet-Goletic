"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function ArbeitsinfoPage() {
  const params = useParams();
  const baustelleId = String(params.id);

  const [workerRole, setWorkerRole] = useState("");
  const [rooms, setRooms] = useState<any[]>([]);
  const [tiles, setTiles] = useState<any[]>([]);
  const [tileRooms, setTileRooms] = useState<any[]>([]);

  const [showKeramikForm, setShowKeramikForm] = useState(false);
  const [keramikNaziv, setKeramikNaziv] = useState("");
  const [keramikLager, setKeramikLager] = useState("");
  const [keramikKolicina, setKeramikKolicina] = useState("");
  const [keramikJedinica, setKeramikJedinica] = useState("m²");
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);

  const isAdmin = workerRole === "admin";

  useEffect(() => {
    const role = localStorage.getItem("worker_role") || "worker";
    setWorkerRole(role);

    loadRooms();
    loadKeramik();
  }, []);

  async function loadRooms() {
    const { data, error } = await supabase
      .from("prostorije")
      .select("*")
      .eq("baustelle_id", baustelleId)
      .order("id", { ascending: true });

    if (error) {
      alert("Greška kod učitavanja prostorija: " + error.message);
      return;
    }

    setRooms(data || []);
  }

  async function loadKeramik() {
    const { data: tilesData, error: tilesError } = await supabase
      .from("arbeitsinfo_tiles")
      .select("*")
      .eq("baustelle_id", baustelleId)
      .order("id", { ascending: true });

    if (tilesError) {
      alert("Greška kod učitavanja keramike: " + tilesError.message);
      return;
    }

    setTiles(tilesData || []);

    const { data: roomsData, error: roomsError } = await supabase
      .from("arbeitsinfo_tile_rooms")
      .select("*");

    if (roomsError) {
      alert("Greška kod učitavanja prostorija za keramiku: " + roomsError.message);
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

  async function addKeramik() {
    if (!keramikNaziv.trim()) {
      alert("Unesi naziv keramike.");
      return;
    }

    const { data: tileData, error: tileError } = await supabase
      .from("arbeitsinfo_tiles")
      .insert({
        baustelle_id: Number(baustelleId),
        naziv: keramikNaziv,
        lager: keramikLager,
        kolicina: keramikKolicina,
        jedinica: keramikJedinica,
      })
      .select()
      .single();

    if (tileError) {
      alert("Greška kod dodavanja keramike: " + tileError.message);
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
        alert("Keramika je dodana, ali greška kod prostorija: " + relationError.message);
      }
    }

    setKeramikNaziv("");
    setKeramikLager("");
    setKeramikKolicina("");
    setKeramikJedinica("m²");
    setSelectedRooms([]);
    setShowKeramikForm(false);

    loadKeramik();
  }

  async function deleteKeramik(tileId: number) {
    const confirmDelete = confirm("Da li želiš obrisati ovu keramiku?");
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
      alert("Greška kod brisanja keramike: " + error.message);
      return;
    }

    loadKeramik();
  }

  function getRoomsForTile(tileId: number) {
    const relationRows = tileRooms.filter((item) => item.tile_id === tileId);
    const roomIds = relationRows.map((item) => Number(item.room_id));

    return rooms.filter((room) => roomIds.includes(Number(room.id)));
  }

  return (
    <main style={mainStyle}>
      <Link href={`/baustellen/${baustelleId}`} style={backLinkStyle}>
        ← Nazad na Baustelle
      </Link>

      <h1 style={titleStyle}>Arbeitsinfo</h1>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>📋 Arbeitsauftrag</h2>
        <p style={emptyStyle}>Još nema dodanih radnih zadataka.</p>
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>📦 Material</h2>
        <p style={emptyStyle}>Još nema dodanog materijala.</p>
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>🛠 Werkzeug</h2>
        <p style={emptyStyle}>Još nema dodanog alata.</p>
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>🧱 Keramik</h2>

          {isAdmin && (
            <button
              onClick={() => setShowKeramikForm(!showKeramikForm)}
              style={buttonStyle}
            >
              {showKeramikForm ? "Zatvori" : "Dodaj Keramiku"}
            </button>
          )}
        </div>

        {showKeramikForm && isAdmin && (
          <div style={formStyle}>
            <input
              value={keramikNaziv}
              onChange={(e) => setKeramikNaziv(e.target.value)}
              placeholder="Naziv keramike"
              style={inputStyle}
            />

            <input
              value={keramikLager}
              onChange={(e) => setKeramikLager(e.target.value)}
              placeholder="Mjesto u lageru"
              style={inputStyle}
            />

            <div style={rowStyle}>
              <input
                value={keramikKolicina}
                onChange={(e) => setKeramikKolicina(e.target.value)}
                placeholder="Količina"
                style={inputStyle}
              />

              <select
                value={keramikJedinica}
                onChange={(e) => setKeramikJedinica(e.target.value)}
                style={inputStyle}
              >
                <option value="Palette">Palette</option>
                <option value="Karton">Karton</option>
                <option value="Stück">Stück</option>
                <option value="m²">m²</option>
              </select>
            </div>

            <h3 style={smallTitleStyle}>Prostorije za ovu keramiku</h3>

            {rooms.length === 0 ? (
              <p style={emptyStyle}>Nema dodanih prostorija.</p>
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

            <button onClick={addKeramik} style={saveButtonStyle}>
              Sačuvaj Keramiku
            </button>
          </div>
        )}

        {tiles.length === 0 ? (
          <p style={emptyStyle}>Još nema dodane keramike.</p>
        ) : (
          <div style={listStyle}>
            {tiles.map((tile) => {
              const connectedRooms = getRoomsForTile(tile.id);

              return (
                <div key={tile.id} style={cardStyle}>
                  <h3 style={cardTitleStyle}>{tile.naziv}</h3>

                  {tile.lager && (
                    <p>
                      <strong>Lager:</strong> {tile.lager}
                    </p>
                  )}

                  {(tile.kolicina || tile.jedinica) && (
                    <p>
                      <strong>Količina:</strong> {tile.kolicina} {tile.jedinica}
                    </p>
                  )}

                  <div>
                    <strong>Prostorije:</strong>

                    {connectedRooms.length === 0 ? (
                      <p style={emptyStyle}>Nije povezana sa prostorijom.</p>
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
                      onClick={() => deleteKeramik(tile.id)}
                      style={deleteButtonStyle}
                    >
                      Obriši
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>💡 Zusätzliche Hinweise</h2>
        <p style={emptyStyle}>Još nema dodatnih savjeta.</p>
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