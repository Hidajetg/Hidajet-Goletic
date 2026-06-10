"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";

export default function RoomPhotosPage() {
  const params = useParams();

  const baustelleId = String(params.id);
  const roomId = String(params.roomId);

  const [photos, setPhotos] = useState<any[]>([]);
  const [roomName, setRoomName] = useState("Prostorija");
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

  useEffect(() => {
    loadRoom();
    loadPhotos();
  }, []);

  function getWorkerName() {
    return (
      localStorage.getItem("userName") ||
      localStorage.getItem("name") ||
      localStorage.getItem("workerName") ||
      "Radnik"
    );
  }

  function playNotificationSound() {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 1;
    audio.play().catch(() => {});
  }

  async function loadRoom() {
    const { data } = await supabase
      .from("prostorije")
      .select("naziv")
      .eq("id", roomId)
      .single();

    if (data?.naziv) setRoomName(data.naziv);
  }

  async function loadPhotos() {
    const { data, error } = await supabase
      .from("room_photos")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });

    if (error) {
      alert("Greška kod učitavanja slika: " + error.message);
      return;
    }

    setPhotos(data || []);
  }

  async function uploadPhotos(event: any) {
    const files = Array.from(event.target.files || []) as File[];
    if (files.length === 0) return;

    setUploading(true);

    for (const file of files) {
      const fileExt = file.name.split(".").pop();
      const storagePath = `${baustelleId}/${roomId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("room-photos")
        .upload(storagePath, file);

      if (uploadError) {
        alert("Greška kod upload slike: " + uploadError.message);
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from("room-photos")
        .getPublicUrl(storagePath);

      const { error: insertError } = await supabase.from("room_photos").insert({
        baustelle_id: baustelleId,
        room_id: roomId,
        image_url: publicUrlData.publicUrl,
        storage_path: storagePath,
        worker_name: getWorkerName(),
      });

      if (insertError) {
        alert("Greška kod spremanja slike: " + insertError.message);
      }
    }

    playNotificationSound();
    event.target.value = "";
    setUploading(false);
    loadPhotos();
  }

  async function deletePhoto(photo: any) {
    if (!confirm("Da li sigurno želiš obrisati ovu sliku?")) return;

    if (photo.storage_path) {
      await supabase.storage.from("room-photos").remove([photo.storage_path]);
    }

    const { error } = await supabase
      .from("room_photos")
      .delete()
      .eq("id", photo.id);

    if (error) {
      alert("Greška kod brisanja slike: " + error.message);
      return;
    }

    setSelectedPhoto(null);
    loadPhotos();
  }

  async function downloadPhoto(photo: any) {
    try {
      const response = await fetch(photo.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = `fotografija-${roomName}-${photo.id}.jpg`;
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Greška kod preuzimanja slike.");
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function nextPhoto() {
    if (!selectedPhoto) return;
    const index = photos.findIndex((p) => p.id === selectedPhoto.id);
    setSelectedPhoto(photos[index + 1 >= photos.length ? 0 : index + 1]);
  }

  function previousPhoto() {
    if (!selectedPhoto) return;
    const index = photos.findIndex((p) => p.id === selectedPhoto.id);
    setSelectedPhoto(photos[index - 1 < 0 ? photos.length - 1 : index - 1]);
  }

  return (
    <main style={mainStyle}>
      <Link href={`/baustellen/${baustelleId}/prostorije/${roomId}`} style={backStyle}>
        ← Nazad na prostoriju
      </Link>

      <h1 style={titleStyle}>Fotografije - {roomName}</h1>

      <p style={countStyle}>Ukupno slika: {photos.length}</p>

      <label style={uploadButtonStyle}>
        {uploading ? "Slike se dodaju..." : "Dodaj slike"}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={uploadPhotos}
          disabled={uploading}
          style={{ display: "none" }}
        />
      </label>

      <h2 style={galleryTitleStyle}>Galerija</h2>

      {photos.length === 0 ? (
        <div style={emptyStyle}>Još nema dodanih slika za ovu prostoriju.</div>
      ) : (
        <div style={gridStyle}>
          {photos.map((photo) => (
            <div key={photo.id} style={cardStyle}>
              <img
                src={photo.image_url}
                alt="Fotografija prostorije"
                onClick={() => setSelectedPhoto(photo)}
                style={imageStyle}
              />

              <div style={{ padding: "10px" }}>
                <p style={{ margin: "0 0 5px 0", fontWeight: "bold", fontSize: "13px" }}>
                  {photo.worker_name || "Radnik"}
                </p>

                <p style={{ margin: "0 0 10px 0", color: "#aaa", fontSize: "11px" }}>
                  {formatDate(photo.created_at)}
                </p>

                <button onClick={() => setSelectedPhoto(photo)} style={openButtonStyle}>
                  Otvori preko cijelog ekrana
                </button>

                <button onClick={() => downloadPhoto(photo)} style={downloadButtonStyle}>
                  Preuzmi
                </button>

                <button onClick={() => deletePhoto(photo)} style={deleteButtonStyle}>
                  Obriši
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPhoto && (
        <div style={fullscreenStyle}>
          <button onClick={() => setSelectedPhoto(null)} style={closeButtonStyle}>
            X
          </button>

          <img src={selectedPhoto.image_url} alt="Velika fotografija" style={fullscreenImageStyle} />

          <div style={fullscreenInfoStyle}>
            <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>
              {selectedPhoto.worker_name || "Radnik"}
            </p>

            <p style={{ margin: "0 0 15px 0", color: "#aaa" }}>
              {formatDate(selectedPhoto.created_at)}
            </p>

            <div style={fullscreenButtonsStyle}>
              <button onClick={previousPhoto} style={navButtonStyle}>
                ← Prethodna
              </button>

              <button onClick={nextPhoto} style={navButtonStyle}>
                Sljedeća →
              </button>

              <button onClick={() => downloadPhoto(selectedPhoto)} style={downloadButtonStyle}>
                Preuzmi
              </button>

              <button onClick={() => deletePhoto(selectedPhoto)} style={deleteButtonStyle}>
                Obriši
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const mainStyle: any = {
  background: "#000",
  minHeight: "100vh",
  color: "white",
  padding: "25px",
};

const backStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
};

const titleStyle: any = {
  fontSize: "42px",
  fontWeight: "bold",
  marginTop: "25px",
  marginBottom: "10px",
};

const countStyle: any = {
  color: "#aaa",
  fontSize: "16px",
  marginBottom: "25px",
};

const uploadButtonStyle: any = {
  display: "inline-flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "18px 30px",
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "16px",
  fontSize: "18px",
  fontWeight: "bold",
  cursor: "pointer",
};

const galleryTitleStyle: any = {
  fontSize: "30px",
  marginTop: "35px",
  marginBottom: "20px",
};

const emptyStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  color: "#aaa",
};

const gridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
  gap: "18px",
};

const cardStyle: any = {
  background: "#111",
  borderRadius: "16px",
  overflow: "hidden",
  border: "1px solid #222",
};

const imageStyle: any = {
  width: "100%",
  height: "120px",
  objectFit: "cover",
  display: "block",
  cursor: "pointer",
};

const openButtonStyle: any = {
  width: "100%",
  padding: "9px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "9px",
  fontSize: "13px",
  fontWeight: "bold",
  cursor: "pointer",
  marginBottom: "8px",
};

const downloadButtonStyle: any = {
  width: "100%",
  padding: "9px",
  background: "#f59e0b",
  color: "white",
  border: "none",
  borderRadius: "9px",
  fontSize: "13px",
  fontWeight: "bold",
  cursor: "pointer",
  marginBottom: "8px",
};

const deleteButtonStyle: any = {
  width: "100%",
  padding: "9px",
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: "9px",
  fontSize: "13px",
  fontWeight: "bold",
  cursor: "pointer",
};

const fullscreenStyle: any = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.98)",
  zIndex: 9999,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  padding: "10px",
};

const fullscreenImageStyle: any = {
  width: "100vw",
  height: "78vh",
  objectFit: "contain",
};

const fullscreenInfoStyle: any = {
  width: "100%",
  textAlign: "center",
  padding: "10px",
};

const fullscreenButtonsStyle: any = {
  display: "flex",
  gap: "10px",
  justifyContent: "center",
  flexWrap: "wrap",
};

const closeButtonStyle: any = {
  position: "fixed",
  top: "20px",
  right: "20px",
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: "50%",
  width: "48px",
  height: "48px",
  fontSize: "22px",
  fontWeight: "bold",
  cursor: "pointer",
  zIndex: 10000,
};

const navButtonStyle: any = {
  padding: "10px 15px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "9px",
  fontSize: "14px",
  fontWeight: "bold",
  cursor: "pointer",
};