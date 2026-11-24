"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";

const photoUi: Record<string, { selected: string; send: string; clear: string; converting: string; unavailable: string; success: string }> = {
  de: { selected:"Ausgewählt", send:"Bilder hochladen", clear:"Auswahl leeren", converting:"Bild wird vorbereitet…", unavailable:"Vorschau nicht verfügbar – Original herunterladen", success:"Bilder gespeichert" },
  ba: { selected:"Odabrano", send:"Spremi slike", clear:"Poništi odabir", converting:"Slika se priprema…", unavailable:"Prikaz nije dostupan – preuzmi original", success:"Slike spremljene" },
  en: { selected:"Selected", send:"Upload photos", clear:"Clear selection", converting:"Preparing image…", unavailable:"Preview unavailable – download original", success:"Photos saved" },
  uz: { selected:"Tanlangan", send:"Rasmlarni yuklash", clear:"Tanlovni tozalash", converting:"Rasm tayyorlanmoqda…", unavailable:"Ko‘rib bo‘lmaydi – asl faylni yuklab oling", success:"Rasmlar saqlandi" },
  cz: { selected:"Vybráno", send:"Nahrát fotografie", clear:"Zrušit výběr", converting:"Příprava obrázku…", unavailable:"Náhled není dostupný – stáhněte originál", success:"Fotografie uloženy" },
};
const isHeicName = (name: string) => /\.(heic|heif)(?:$|[?#])/i.test(name);
async function jpegFromHeic(blob: Blob): Promise<Blob> {
  const { heicTo } = await import("heic-to");
  const converted = await heicTo({blob, type:"image/jpeg", quality:0.95});
  if (!(converted instanceof Blob) || !converted.size) throw new Error("HEIC → JPEG");
  return converted;
}
async function preparePhoto(file: File): Promise<File> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const mime = file.type.toLowerCase();
  if (isHeicName(file.name) || /^image\/hei[cf]/.test(mime)) {
    const jpeg = await jpegFromHeic(file);
    return new File([jpeg], file.name.replace(/\.[^.]+$/, "") + ".jpg", {type:"image/jpeg"});
  }
  const types: Record<string,string> = {jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif",avif:"image/avif"};
  if (types[ext] && (!mime || mime === "application/octet-stream" || mime === types[ext])) {
    return mime === types[ext] ? file : new File([file], file.name, {type:types[ext]});
  }
  // Other formats must decode successfully before a gallery entry is created.
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx || !canvas.width || !canvas.height) throw new Error("Invalid image");
    ctx.drawImage(img,0,0);
    const jpeg = await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b ? resolve(b) : reject(new Error("JPEG conversion failed")),"image/jpeg",0.95));
    return new File([jpeg], file.name.replace(/\.[^.]+$/, "") + ".jpg", {type:"image/jpeg"});
  } finally { URL.revokeObjectURL(url); }
}

const translations: any = {
  de: {
    back: "← Zurück zum Raum",
    photos: "Fotografien",
    totalPhotos: "Bilder insgesamt",
    addPhotos: "Bilder hinzufügen",
    uploading: "Bilder werden hochgeladen...",
    gallery: "Galerie",
    noPhotos: "Noch keine Bilder für diesen Raum vorhanden.",
    worker: "Mitarbeiter",
    openFullscreen: "Im Vollbild öffnen",
    download: "Herunterladen",
    delete: "Löschen",
    previous: "← Vorheriges",
    next: "Nächstes →",
    confirmDelete: "Möchten Sie dieses Bild wirklich löschen?",
    uploadError: "Fehler beim Hochladen des Bildes",
    saveError: "Fehler beim Speichern des Bildes",
    loadError: "Fehler beim Laden der Bilder",
    deleteError: "Fehler beim Löschen des Bildes",
    downloadError: "Fehler beim Herunterladen des Bildes.",
    defaultRoom: "Raum",
    photoAlt: "Raumfoto",
    bigPhotoAlt: "Großes Foto",
    addedBy: "Hinzugefügt von",
    date: "Datum",
  },
  ba: {
    back: "← Nazad na prostoriju",
    photos: "Fotografije",
    totalPhotos: "Ukupno slika",
    addPhotos: "Dodaj slike",
    uploading: "Slike se dodaju...",
    gallery: "Galerija",
    noPhotos: "Još nema dodanih slika za ovu prostoriju.",
    worker: "Radnik",
    openFullscreen: "Otvori preko cijelog ekrana",
    download: "Preuzmi",
    delete: "Obriši",
    previous: "← Prethodna",
    next: "Sljedeća →",
    confirmDelete: "Da li sigurno želiš obrisati ovu sliku?",
    uploadError: "Greška kod upload slike",
    saveError: "Greška kod spremanja slike",
    loadError: "Greška kod učitavanja slika",
    deleteError: "Greška kod brisanja slike",
    downloadError: "Greška kod preuzimanja slike.",
    defaultRoom: "Prostorija",
    photoAlt: "Fotografija prostorije",
    bigPhotoAlt: "Velika fotografija",
    addedBy: "Dodao",
    date: "Datum",
  },

  uz: {
    back: "← Xonaga qaytish",
    photos: "Rasmlar",
    totalPhotos: "Jami rasmlar",
    addPhotos: "Rasm qo‘shish",
    uploading: "Rasmlar yuklanmoqda...",
    gallery: "Galereya",
    noPhotos: "Bu xona uchun hali rasm yo‘q.",
    worker: "Ishchi",
    openFullscreen: "To‘liq ekranda ochish",
    download: "Yuklab olish",
    delete: "O‘chirish",
    previous: "← Oldingi",
    next: "Keyingi →",
    confirmDelete: "Bu rasmni o‘chirmoqchimisiz?",
    uploadError: "Rasmni yuklashda xato",
    saveError: "Rasmni saqlashda xato",
    loadError: "Rasmlarni yuklashda xato",
    deleteError: "Rasmni o‘chirishda xato",
    downloadError: "Rasmni yuklab olishda xato.",
    defaultRoom: "Xona",
    photoAlt: "Xona rasmi",
    bigPhotoAlt: "Katta rasm",
    addedBy: "Qo‘shgan",
    date: "Sana",
  },
  en: {
    back: "← Back to room",
    photos: "Photos",
    totalPhotos: "Total photos",
    addPhotos: "Add photos",
    uploading: "Uploading photos...",
    gallery: "Gallery",
    noPhotos: "No photos for this room yet.",
    worker: "Worker",
    openFullscreen: "Open full screen",
    download: "Download",
    delete: "Delete",
    previous: "← Previous",
    next: "Next →",
    confirmDelete: "Do you really want to delete this photo?",
    uploadError: "Error uploading photo",
    saveError: "Error saving photo",
    loadError: "Error loading photos",
    deleteError: "Error deleting photo",
    downloadError: "Error downloading photo.",
    defaultRoom: "Room",
    photoAlt: "Room photo",
    bigPhotoAlt: "Large photo",
    addedBy: "Added by",
    date: "Date",
  },
  cz: {
    back: "← Zpět do místnosti",
    photos: "Fotografie",
    totalPhotos: "Celkem fotografií",
    addPhotos: "Přidat fotografie",
    uploading: "Nahrávání fotografií...",
    gallery: "Galerie",
    noPhotos: "Pro tuto místnost zatím nejsou žádné fotografie.",
    worker: "Pracovník",
    openFullscreen: "Otevřít na celou obrazovku",
    download: "Stáhnout",
    delete: "Smazat",
    previous: "← Předchozí",
    next: "Další →",
    confirmDelete: "Opravdu chcete tuto fotografii smazat?",
    uploadError: "Chyba při nahrávání fotografie",
    saveError: "Chyba při ukládání fotografie",
    loadError: "Chyba při načítání fotografií",
    deleteError: "Chyba při mazání fotografie",
    downloadError: "Chyba při stahování fotografie.",
    defaultRoom: "Místnost",
    photoAlt: "Fotografie místnosti",
    bigPhotoAlt: "Velká fotografie",
    addedBy: "Přidal",
    date: "Datum",
  },
};

export default function RoomPhotosPage() {
  const params = useParams();

  const baustelleId = String(params.id);
  const roomId = String(params.roomId);

  const [photos, setPhotos] = useState<any[]>([]);
  const [roomName, setRoomName] = useState("Raum");
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [lang, setLang] = useState("de");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [previews, setPreviews] = useState<Record<string,string | null>>({});
  const uploadLock = useRef(false);

  const t = translations[lang] || translations.de;
  const ui = photoUi[lang] || photoUi.de;

  useEffect(() => {
    const savedLang =
      localStorage.getItem("lang") ||
      localStorage.getItem("language") ||
      "de";

    setLang(savedLang);
    loadRoom();
    loadPhotos();
  }, []);

  function getWorkerName() {
    return (
      localStorage.getItem("userName") ||
      localStorage.getItem("name") ||
      localStorage.getItem("workerName") ||
      localStorage.getItem("radnik") ||
      localStorage.getItem("mitarbeiter") ||
      t.worker
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
      .eq("id", Number(roomId))
      .single();

    if (data?.naziv) setRoomName(data.naziv);
  }

  async function loadPhotos() {
    const { data, error } = await supabase
      .from("room_photos")
      .select("*")
      .eq("room_id", Number(roomId))
      .order("created_at", { ascending: false });

    if (error) {
      alert(t.loadError + ": " + error.message);
      return;
    }

    setPhotos(data || []);
  }

  function getOriginalPhotoUrl(photo: any) {
    return (
      photo?.image_url ||
      photo?.photo_url ||
      photo?.url ||
      photo?.public_url ||
      photo?.bild_url ||
      photo?.foto_url ||
      ""
    );
  }

  function isLegacyHeic(photo: any) {
    return isHeicName(String(photo?.storage_path || "")) || isHeicName(getOriginalPhotoUrl(photo));
  }

  function getPhotoUrl(photo: any) {
    return previews[String(photo.id)] || getOriginalPhotoUrl(photo);
  }

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    setPreviews({});
    async function convertExisting() {
      for (const photo of photos) {
        if (cancelled) break;
        if (!isLegacyHeic(photo)) continue;
        const id = String(photo.id);
        try {
          const path = String(photo.storage_path || "");
          const original = getOriginalPhotoUrl(photo);
          const storageUrl = path ? supabase.storage.from("room-photos").getPublicUrl(path).data.publicUrl : original;
          const response = await fetch(storageUrl);
          if (!response.ok) throw new Error("HTTP " + response.status);
          const jpeg = await jpegFromHeic(await response.blob());
          if (cancelled) break;
          const url = URL.createObjectURL(jpeg);
          urls.push(url);
          setPreviews(previous => ({...previous,[id]:url}));
        } catch {
          if (!cancelled) setPreviews(previous => ({...previous,[id]:null}));
        }
      }
    }
    void convertExisting();
    return () => { cancelled = true; urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [photos]);

  function photoPreview(photo:any, full = false) {
    const id = String(photo.id);
    const legacy = isLegacyHeic(photo);
    const src = legacy ? previews[id] : getOriginalPhotoUrl(photo);
    if (!src) {
      return <div style={{...(full ? fullscreenImageStyle : imageStyle),display:"grid",placeItems:"center",height:full?"55vh":"120px",textAlign:"center",padding:10}}>
        {legacy && previews[id] === undefined ? ui.converting : ui.unavailable}
      </div>;
    }
    return <img src={src} alt={full ? t.bigPhotoAlt : t.photoAlt}
      onClick={full ? undefined : () => setSelectedPhoto(photo)}
      style={full ? fullscreenImageStyle : imageStyle}
      loading={full ? "eager" : "lazy"}
      onError={event => {event.currentTarget.style.objectFit="contain";event.currentTarget.alt=ui.unavailable;}} />;
  }

  function getPhotoWorker(photo: any) {
    return (
      photo?.worker_name ||
      photo?.radnik ||
      photo?.worker ||
      photo?.uploaded_by ||
      photo?.created_by ||
      t.worker
    );
  }

  function choosePhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = "";
    if (!files.length || uploadLock.current) return;
    setUploadMessage("");
    setPendingFiles(previous => {
      const seen = new Set(previous.map(f => [f.name,f.size,f.lastModified].join(":")));
      return [...previous, ...files.filter(f => {
        const key = [f.name,f.size,f.lastModified].join(":");
        if (seen.has(key)) return false;
        seen.add(key); return true;
      })];
    });
  }

  async function uploadPhotos() {
    if (!pendingFiles.length || uploadLock.current) return;
    uploadLock.current = true;
    setUploading(true);
    setUploadMessage("");
    const files = [...pendingFiles];
    const failures: {index:number; file:File; error:string}[] = [];
    const workerName = getWorkerName();
    let saved = 0;
    let completed = 0;
    let nextIndex = 0;
    // Keep decoding/conversion serial on mobile, but overlap it with uploads.
    let preparation: Promise<void> = Promise.resolve();
    const uploadOne = async (index:number) => {
      const original = files[index];
      let storagePath = "";
      let uploaded = false;
      try {
        const prepared = preparation.then(() => preparePhoto(original));
        preparation = prepared.then(() => undefined, () => undefined);
        const file = await prepared;
        const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g,"") || "jpg";
        storagePath = `${baustelleId}/${roomId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const {error: uploadError} = await supabase.storage.from("room-photos")
          .upload(storagePath,file,{contentType:file.type,upsert:false});
        if (uploadError) throw uploadError;
        uploaded = true;
        const {data: publicUrlData} = supabase.storage.from("room-photos").getPublicUrl(storagePath);
        const {error: insertError} = await supabase.from("room_photos").insert({
          baustelle_id:Number(baustelleId),room_id:Number(roomId),
          image_url:publicUrlData.publicUrl,storage_path:storagePath,
          worker_name:workerName,radnik:workerName,room_name:roomName,
        });
        if (insertError) throw insertError;
        saved++;
      } catch (error) {
        // A lost insert response might still mean the record was saved.
        if (uploaded && storagePath) {
          try {
            const {data: existing,error: lookupError} = await supabase.from("room_photos").select("id").eq("storage_path",storagePath).limit(1);
            if (!lookupError && existing?.length) { saved++; return; }
            if (!lookupError) await supabase.storage.from("room-photos").remove([storagePath]);
          } catch { /* Keep the original object when the lookup is uncertain. */ }
        }
        failures.push({index,file:original,error:original.name + ": " + (error instanceof Error ? error.message : String((error as {message?:string})?.message || error))});
      } finally {
        completed++;
        setProgress(`${completed}/${files.length}`);
      }
    };
    try {
      setProgress(`0/${files.length}`);
      const runWorker = async () => {
        while (nextIndex < files.length) {
          const index = nextIndex++;
          await uploadOne(index);
        }
      };
      await Promise.all(Array.from({length:Math.min(3,files.length)}, () => runWorker()));
      failures.sort((a,b) => a.index-b.index);
      if (saved) playNotificationSound();
      setUploadMessage(`${saved}/${files.length} · ${ui.success}` + (failures.length ? "\n" + failures.map(f => f.error).join("\n") : ""));
      await loadPhotos();
    } finally {
      setPendingFiles(failures.map(f => f.file));
      setProgress("");
      setUploading(false);
      uploadLock.current = false;
    }
  }

  async function deletePhoto(photo: any) {
    if (!confirm(t.confirmDelete)) return;

    if (photo.storage_path) {
      await supabase.storage.from("room-photos").remove([photo.storage_path]);
    }

    const { error } = await supabase
      .from("room_photos")
      .delete()
      .eq("id", photo.id);

    if (error) {
      alert(t.deleteError + ": " + error.message);
      return;
    }

    setSelectedPhoto(null);
    loadPhotos();
  }

  async function downloadPhoto(photo: any) {
    try {
      const url = getPhotoUrl(photo);
      const response = await fetch(url);
      if (!response.ok) throw new Error("HTTP " + response.status);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = downloadUrl;
      const ext = previews[String(photo.id)] ? "jpg" : (String(photo.storage_path || getOriginalPhotoUrl(photo)).split(/[?#]/)[0].split(".").pop() || "jpg");
      a.download = `foto-${roomName}-${photo.id}.${ext}`;
      document.body.appendChild(a);
      a.click();

      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch {
      alert(t.downloadError);
    }
  }

  function formatDate(dateString: string) {
    if (!dateString) return "-";

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
      <Link
        href={`/baustellen/${baustelleId}/prostorije/${roomId}`}
        style={backStyle}
      >
        {t.back}
      </Link>

      <h1 style={titleStyle}>
        {t.photos} - {roomName}
      </h1>

      <p style={countStyle}>
        {t.totalPhotos}: {photos.length}
      </p>

      <label style={uploadButtonStyle}>
        {uploading ? t.uploading : t.addPhotos}
        <input
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          onChange={choosePhotos}
          disabled={uploading}
          style={{ display: "none" }}
        />
      </label>
      {pendingFiles.length > 0 && (
        <div style={{...cardStyle,padding:12,marginTop:12}}>
          <p>{ui.selected}: {pendingFiles.length}</p>
          {pendingFiles.map((file,index)=><div key={index} style={{overflowWrap:"anywhere",marginBottom:4}}>{file.name}</div>)}
          <button disabled={uploading} onClick={()=>void uploadPhotos()} style={{...uploadButtonStyle,marginTop:10}}>{uploading ? t.uploading : ui.send} ({pendingFiles.length})</button>
          {!uploading && <button onClick={()=>setPendingFiles([])} style={{...navButtonStyle,margin:8}}>{ui.clear}</button>}
        </div>
      )}
      {progress && <p role="status">{progress}</p>}
      {uploadMessage && <p role="status" style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{uploadMessage}</p>}

      <h2 style={galleryTitleStyle}>{t.gallery}</h2>

      {photos.length === 0 ? (
        <div style={emptyStyle}>{t.noPhotos}</div>
      ) : (
        <div style={gridStyle}>
          {photos.map((photo) => {
            const url = getPhotoUrl(photo);

            if (!url) return null;

            return (
              <div key={photo.id} style={cardStyle}>
                {photoPreview(photo)}

                <div style={{ padding: "10px" }}>
                  <p style={roomTextStyle}>{roomName}</p>

                  <p style={workerTextStyle}>
                    {t.addedBy}: {getPhotoWorker(photo)}
                  </p>

                  <p style={dateTextStyle}>
                    {t.date}: {formatDate(photo.created_at)}
                  </p>

                  <button
                    onClick={() => setSelectedPhoto(photo)}
                    style={openButtonStyle}
                  >
                    {t.openFullscreen}
                  </button>

                  <button
                    onClick={() => downloadPhoto(photo)}
                    style={downloadButtonStyle}
                  >
                    {t.download}
                  </button>

                  <button
                    onClick={() => deletePhoto(photo)}
                    style={deleteButtonStyle}
                  >
                    {t.delete}
                  </button>
                </div>
              </div>
            );
          })}
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

          {photoPreview(selectedPhoto, true)}

          <div style={fullscreenInfoStyle}>
            <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>
              {roomName}
            </p>

            <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>
              {t.addedBy}: {getPhotoWorker(selectedPhoto)}
            </p>

            <p style={{ margin: "0 0 15px 0", color: "#aaa" }}>
              {t.date}: {formatDate(selectedPhoto.created_at)}
            </p>

            <div style={fullscreenButtonsStyle}>
              <button onClick={previousPhoto} style={navButtonStyle}>
                {t.previous}
              </button>

              <button onClick={nextPhoto} style={navButtonStyle}>
                {t.next}
              </button>

              <button
                onClick={() => downloadPhoto(selectedPhoto)}
                style={downloadButtonStyle}
              >
                {t.download}
              </button>

              <button
                onClick={() => deletePhoto(selectedPhoto)}
                style={deleteButtonStyle}
              >
                {t.delete}
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

const roomTextStyle: any = {
  margin: "0 0 5px 0",
  color: "#f97316",
  fontWeight: "bold",
  fontSize: "13px",
};

const workerTextStyle: any = {
  margin: "0 0 5px 0",
  fontWeight: "bold",
  fontSize: "13px",
};

const dateTextStyle: any = {
  margin: "0 0 10px 0",
  color: "#aaa",
  fontSize: "11px",
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