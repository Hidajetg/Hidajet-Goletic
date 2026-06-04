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

    if (data?.naziv) {
      setRoomName(data.naziv);
    }
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

  async function uploadPhoto(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const storagePath = `${baustelleId}/${roomId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("room-photos")
      .upload(storagePath, file);

    if (uploadError) {
      setUploading(false);
      alert("Greška kod upload slike: " + uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("room-photos")
      .getPublicUrl(storagePath);

    const imageUrl = publicUrlData.publicUrl;

    const { error: insertError } = await supabase.from("room_photos").insert({
      baustelle_id: baustelleId,
      room_id: roomId,
      image_url: imageUrl,
      storage_path: storagePath,
      worker_name: "Radnik",
    });

    if (insertError) {
      setUploading(false);
      alert("Greška kod spremanja slike: " + insertError.message);
      return;
    }

    playNotificationSound();

    event.target.value = "";
    setUploading(false);
    loadPhotos();
  }

  async function deletePhoto(photo: any) {
    const confirmDelete = confirm("Da li sigurno želiš obrisati ovu sliku?");
    if (!confirmDelete) return;

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
    const nextIndex = index + 1 >= photos.length ? 0 : index + 1;

    setSelectedPhoto(photos[nextIndex]);
  }

  function previousPhoto() {
    if (!selectedPhoto) return;

    const index = photos.findIndex((p) => p.id === selectedPhoto.id);
    const previousIndex = index - 1 < 0 ? photos.length - 1 : index - 1;

    setSelectedPhoto(photos[previousIndex]);
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
        href={`/baustellen/${baustelleId}/prostorije/${roomId}`}
        style={{
          color: "#3b82f6",
          textDecoration: "none",
          fontWeight: "bold",
        }}
      >
        ← Nazad na prostoriju
      </Link>

      <h1
        style={{
          fontSize: "48px",
          fontWeight: "bold",
          marginTop: "30px",
          marginBottom: "10px",
        }}
      >
        Fotografije - {roomName}
      </h1>

      <p
        style={{
          color: "#aaa",
          fontSize: "18px",
          marginBottom: "30px",
        }}
      >
        Ukupno slika: {photos.length}
      </p>

      <label style={uploadButtonStyle}>
        {uploading ? "Slika se dodaje..." : "Dodaj sliku"}
        <input
          type="file"
          accept="image/*"
          onChange={uploadPhoto}
          disabled={uploading}
          style={{ display: "none" }}
        />
      </label>

      <h2 style={{ fontSize: "32px", marginTop: "40px", marginBottom: "20px" }}>
        Galerija
      </h2>

      {photos.length === 0 ? (
        <div
          style={{
            background: "#111",
            padding: "25px",
            borderRadius: "20px",
            color: "#aaa",
          }}
        >
          Još nema dodanih slika za ovu prostoriju.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "25px",
          }}
        >
          {photos.map((photo) => (
            <div key={photo.id} style={cardStyle}>
              <img
                src={photo.image_url}
                alt="Fotografija prostorije"
                onClick={() => setSelectedPhoto(photo)}
                style={imageStyle}
              />

              <div style={{ padding: "15px" }}>
                <p style={{ margin: "0 0 8px 0", fontWeight: "bold" }}>
                  {photo.worker_name || "Radnik"}
                </p>

                <p
                  style={{
                    margin: "0 0 15px 0",
                    color: "#aaa",
                    fontSize: "14px",
                  }}
                >
                  {formatDate(photo.created_at)}
                </p>

                <button
                  onClick={() => setSelectedPhoto(photo)}
                  style={openButtonStyle}
                >
                  Otvori
                </button>

                <button
                  onClick={() => downloadPhoto(photo)}
                  style={downloadButtonStyle}
                >
                  Preuzmi
                </button>

                <button
                  onClick={() => deletePhoto(photo)}
                  style={deleteButtonStyle}
                >
                  Obriši
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPhoto && (
        <div style={fullscreenStyle}>
          <button
            onClick={() => setSelectedPhoto(null)}
            style={closeButtonStyle}
          >
            X
          </button>

          <img
            src={selectedPhoto.image_url}
            alt="Velika fotografija"
            style={{
              maxWidth: "95%",
              maxHeight: "75vh",
              objectFit: "contain",
              borderRadius: "12px",
            }}
          />

          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>
              {selectedPhoto.worker_name || "Radnik"}
            </p>

            <p style={{ margin: "0 0 20px 0", color: "#aaa" }}>
              {formatDate(selectedPhoto.created_at)}
            </p>

            <div
              style={{
                display: "flex",
                gap: "15px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button onClick={previousPhoto} style={navButtonStyle}>
                ← Prethodna
              </button>

              <button onClick={nextPhoto} style={navButtonStyle}>
                Sljedeća →
              </button>

              <button
                onClick={() => downloadPhoto(selectedPhoto)}
                style={downloadButtonStyle}
              >
                Preuzmi
              </button>

              <button
                onClick={() => deletePhoto(selectedPhoto)}
                style={deleteButtonStyle}
              >
                Obriši
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const uploadButtonStyle: any = {
  display: "inline-flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "22px 35px",
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "16px",
  fontSize: "20px",
  fontWeight: "bold",
  cursor: "pointer",
};

const cardStyle: any = {
  background: "#111",
  borderRadius: "20px",
  overflow: "hidden",
  border: "1px solid #222",
};

const imageStyle: any = {
  width: "100%",
  height: "230px",
  objectFit: "cover",
  display: "block",
  cursor: "pointer",
};

const openButtonStyle: any = {
  width: "100%",
  padding: "12px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "10px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  marginBottom: "10px",
};

const downloadButtonStyle: any = {
  width: "100%",
  padding: "12px",
  background: "#f59e0b",
  color: "white",
  border: "none",
  borderRadius: "10px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  marginBottom: "10px",
};

const deleteButtonStyle: any = {
  width: "100%",
  padding: "12px",
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: "10px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const fullscreenStyle: any = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.95)",
  zIndex: 9999,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  padding: "20px",
};

const closeButtonStyle: any = {
  position: "fixed",
  top: "25px",
  right: "25px",
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: "50%",
  width: "45px",
  height: "45px",
  fontSize: "22px",
  fontWeight: "bold",
  cursor: "pointer",
};

const navButtonStyle: any = {
  padding: "12px 18px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "10px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};