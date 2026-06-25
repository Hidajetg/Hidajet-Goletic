"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

export default function BaustellePregledPage() {
  const params = useParams();
  const baustelleId = String(params.id);

  const [loading, setLoading] = useState(true);
  const [baustelle, setBaustelle] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [hours, setHours] = useState<any[]>([]);
  const [productivity, setProductivity] = useState<any[]>([]);
  const [roomMaterials, setRoomMaterials] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    setLoading(true);

    const { data: baustelleData, error: baustelleError } = await supabase
      .from("baustellen")
      .select("*")
      .eq("id", Number(baustelleId))
      .single();

    if (baustelleError) {
      alert("Fehler beim Laden der Baustelle: " + baustelleError.message);
      setLoading(false);
      return;
    }

    const { data: roomsData } = await supabase
      .from("prostorije")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("id", { ascending: true });

    const { data: hoursData } = await supabase
      .from("baustelle_hours")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("datum", { ascending: true });

    const { data: productivityData } = await supabase
      .from("produktivnost")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("datum", { ascending: true });

    const roomIds = (roomsData || []).map((room: any) => room.id);

    let roomMaterialData: any[] = [];
    let photosData: any[] = [];

    if (roomIds.length > 0) {
      const { data: materialData } = await supabase
        .from("room_material")
        .select("*")
        .in("room_id", roomIds);

      roomMaterialData = materialData || [];

      const { data: photoData } = await supabase
        .from("room_photos")
        .select("*")
        .in("room_id", roomIds)
        .order("created_at", { ascending: true });

      photosData = photoData || [];
    }

    const materialIds = [
      ...new Set(roomMaterialData.map((item: any) => item.material_id)),
    ].filter(Boolean);

    let materialsData: any[] = [];

    if (materialIds.length > 0) {
      const { data } = await supabase
        .from("materials")
        .select("*")
        .in("id", materialIds);

      materialsData = data || [];
    }

    setBaustelle(baustelleData);
    setRooms(roomsData || []);
    setHours(hoursData || []);
    setProductivity(productivityData || []);
    setRoomMaterials(roomMaterialData);
    setMaterials(materialsData);
    setPhotos(photosData);
    setLoading(false);
  }

  function formatDate(value: string) {
    if (!value || value === "-") return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatDateTime(value: string) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatNumber(value: any) {
    return Number(value || 0).toLocaleString("de-AT", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    });
  }

  function translatePosition(position: string) {
    const raw = String(position || "").trim();
    const value = raw.toLowerCase();

    const translations: Record<string, string> = {
      zid: "Wand",
      devor: "Wand",
      wall: "Wand",
      wand: "Wand",

      pod: "Boden",
      pol: "Boden",
      floor: "Boden",
      boden: "Boden",

      plintus: "Sockelleiste",
      randlajsna: "Sockelleiste",
      lajsna: "Sockelleiste",
      sockelleiste: "Sockelleiste",

      profil: "Profil",
      profile: "Profil",

      schiene: "Schiene",
      "schiene / lajsna": "Schiene / Sockelleiste",
      "schiene/lajsna": "Schiene / Sockelleiste",

      silikon: "Silikon",
      "silikon 5 mm gacha": "Silikon 5 mm",
      "silikon 5mm gacha": "Silikon 5 mm",
      silicone: "Silikon",

      acryl: "Acryl",
      akril: "Acryl",
      "akril 5 mm gacha": "Acryl 5 mm",
      "akril 5mm gacha": "Acryl 5 mm",

      stepenice: "Stufen",
      stufen: "Stufen",

      fuge: "Fugen",
      fugovanje: "Fugen",
      fugen: "Fugen",
    };

    return translations[value] || raw || "-";
  }

  function getMaterialName(materialId: number) {
    const material = materials.find(
      (item: any) => Number(item.id) === Number(materialId)
    );

    return (
      material?.naziv ||
      material?.name ||
      material?.material ||
      material?.bezeichnung ||
      ""
    );
  }

  function getMaterialNameFromRoomMaterial(item: any) {
    const manualName =
      item?.custom_naziv ||
      item?.custom_name ||
      item?.material_name ||
      item?.naziv ||
      item?.name ||
      item?.material ||
      item?.bezeichnung ||
      item?.opis ||
      item?.description ||
      item?.manual_name ||
      item?.keramika_naziv ||
      item?.title ||
      "";

    const catalogName = item?.material_id
      ? getMaterialName(item.material_id)
      : "";

    return manualName || catalogName || "Unbekannter Materialeintrag";
  }

  function getMaterialUnitFromRoomMaterial(item: any) {
    return (
      item?.custom_jedinica ||
      item?.custom_unit ||
      item?.jedinica ||
      item?.unit ||
      item?.einheit ||
      "-"
    );
  }

  function getPhotoUrl(photo: any) {
    return (
      photo?.photo_url ||
      photo?.url ||
      photo?.image_url ||
      photo?.public_url ||
      photo?.bild_url ||
      photo?.foto_url ||
      ""
    );
  }

  function getPhotoWorker(photo: any) {
    const name = String(
      photo?.worker_name ||
        photo?.radnik ||
        photo?.worker ||
        photo?.uploaded_by ||
        photo?.created_by ||
        ""
    ).trim();

    const lowerName = name.toLowerCase();

    if (
      !name ||
      lowerName === "radnik" ||
      lowerName === "mitarbeiter" ||
      lowerName === "nepoznat radnik" ||
      lowerName === "nicht gespeichert"
    ) {
      return "Nicht gespeichert";
    }

    return name;
  }

  function getPhotoCreatedAt(photo: any) {
    return (
      photo?.created_at ||
      photo?.datum ||
      photo?.date ||
      photo?.uploaded_at ||
      ""
    );
  }

  function getPhotoDescription(photo: any) {
    return (
      photo?.opis ||
      photo?.napomena ||
      photo?.description ||
      photo?.title ||
      ""
    );
  }

  function getRoomName(roomId: number) {
    const room = rooms.find(
      (item: any) => Number(item.id) === Number(roomId)
    );

    return room?.naziv || `Raum ${roomId}`;
  }

  function getHoursForRoom(roomId: number) {
    return hours.filter(
      (item: any) => Number(item.room_id) === Number(roomId)
    );
  }

  function getProductivityForRoom(roomId: number) {
    return productivity.filter(
      (item: any) => Number(item.room_id) === Number(roomId)
    );
  }

  function getMaterialsForRoom(roomId: number) {
    return roomMaterials.filter(
      (item: any) => Number(item.room_id) === Number(roomId)
    );
  }

  function getPhotosForRoom(roomId: number) {
    return photos.filter(
      (item: any) => Number(item.room_id) === Number(roomId)
    );
  }

  const totalHours = hours.reduce(
    (sum, item) =>
      sum + Number(item.ukupno_sati || item.sati || 0),
    0
  );

  const startDate = hours.length > 0 ? hours[0].datum : "-";

  const endDate =
    hours.length > 0 ? hours[hours.length - 1].datum : "-";

  const workers = [
    ...new Set(hours.map((item: any) => item.radnik).filter(Boolean)),
  ];

  const workDays = [
    ...new Set(hours.map((item: any) => item.datum).filter(Boolean)),
  ];

  function printPdf() {
    window.print();
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <p>Bericht wird geladen...</p>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <style>
        {`
          @media print {
            body {
              background: white !important;
            }

            main {
              background: white !important;
              color: black !important;
              padding: 20px !important;
            }

            .no-print {
              display: none !important;
            }

            .print-box {
              background: white !important;
              color: black !important;
              border: 1px solid #ddd !important;
              page-break-inside: avoid;
            }

            .print-room {
              background: white !important;
              color: black !important;
              border: 1px solid #ddd !important;
              page-break-inside: avoid;
            }

            .photo-grid {
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 10px !important;
            }

            .photo-card {
              background: white !important;
              border: 1px solid #ddd !important;
              padding: 6px !important;
              page-break-inside: avoid;
            }

            .photo-img {
              height: 120px !important;
              object-fit: cover !important;
            }

            table {
              font-size: 11px !important;
            }

            th,
            td {
              color: black !important;
              border-color: #ccc !important;
              padding: 5px !important;
            }

            h1 {
              font-size: 28px !important;
              color: black !important;
            }

            h2,
            h3 {
              color: black !important;
            }
          }

          @media (max-width: 700px) {
            .report-main {
              padding: 16px !important;
            }

            .report-title {
              font-size: 34px !important;
            }

            .report-topbar {
              align-items: stretch !important;
              flex-direction: column !important;
            }

            .report-pdf-button {
              width: 100% !important;
            }
          }
        `}
      </style>

      <div
        style={topBarStyle}
        className="no-print report-topbar"
      >
        <Link
          href={`/baustellen/${baustelleId}`}
          style={backLinkStyle}
        >
          ← Zurück zur Baustelle
        </Link>

        <button
          onClick={printPdf}
          style={pdfButtonStyle}
          className="report-pdf-button"
        >
          📥 PDF herunterladen
        </button>
      </div>

      <h1 style={titleStyle} className="report-title">
        ABSCHLUSSBERICHT BAUSTELLE
      </h1>

      <section style={boxStyle} className="print-box">
        <h2 style={sectionTitleStyle}>Baustellenübersicht</h2>

        <div style={infoGridStyle}>
          <p>
            <strong>Baustelle:</strong>
            <br />
            {baustelle?.naziv || "-"}
          </p>

          <p>
            <strong>Ort:</strong>
            <br />
            {baustelle?.lokacija || "-"}
          </p>

          <p>
            <strong>Projektbeginn:</strong>
            <br />
            {formatDate(startDate)}
          </p>

          <p>
            <strong>Projektende:</strong>
            <br />
            {formatDate(endDate)}
          </p>

          <p>
            <strong>Anzahl Räume:</strong>
            <br />
            {rooms.length}
          </p>

          <p>
            <strong>Anzahl Arbeitstage:</strong>
            <br />
            {workDays.length}
          </p>

          <p>
            <strong>Mitarbeiter:</strong>
            <br />
            {workers.length > 0 ? workers.join(", ") : "-"}
          </p>

          <p>
            <strong>Gesamtstunden:</strong>
            <br />
            {formatNumber(totalHours)} h
          </p>
        </div>
      </section>

      <section style={boxStyle} className="print-box">
        <h2 style={sectionTitleStyle}>
          Gesamtübersicht Arbeitsstunden
        </h2>

        {hours.length === 0 ? (
          <p style={mutedTextStyle}>
            Keine Arbeitsstunden vorhanden.
          </p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Datum</th>
                  <th style={thStyle}>Mitarbeiter</th>
                  <th style={thStyle}>Raum</th>
                  <th style={thStyle}>Beginn</th>
                  <th style={thStyle}>Ende</th>
                  <th style={thStyle}>Pause</th>
                  <th style={thStyle}>Gesamt</th>
                  <th style={thStyle}>Tätigkeit</th>
                </tr>
              </thead>

              <tbody>
                {hours.map((item: any) => (
                  <tr key={item.id}>
                    <td style={tdStyle}>
                      {formatDate(item.datum)}
                    </td>

                    <td style={tdStyle}>
                      {item.radnik || "-"}
                    </td>

                    <td style={tdStyle}>
                      {item.room_id
                        ? getRoomName(item.room_id)
                        : "-"}
                    </td>

                    <td style={tdStyle}>
                      {item.pocetak || "-"}
                    </td>

                    <td style={tdStyle}>
                      {item.kraj || "-"}
                    </td>

                    <td style={tdStyle}>
                      {formatNumber(item.pauza)} h
                    </td>

                    <td style={tdStyle}>
                      {formatNumber(
                        item.ukupno_sati || item.sati
                      )}{" "}
                      h
                    </td>

                    <td style={tdStyle}>
                      {item.opis_posla || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={boxStyle} className="print-box">
        <h2 style={sectionTitleStyle}>Raumübersicht</h2>

        {rooms.length === 0 && (
          <p style={mutedTextStyle}>
            Keine Räume vorhanden.
          </p>
        )}

        {rooms.map((room: any) => {
          const roomHours = getHoursForRoom(room.id);
          const roomProductivity =
            getProductivityForRoom(room.id);
          const roomMaterial = getMaterialsForRoom(room.id);
          const roomPhotos = getPhotosForRoom(room.id);

          const roomTotalHours = roomHours.reduce(
            (sum, item) =>
              sum +
              Number(item.ukupno_sati || item.sati || 0),
            0
          );

          return (
            <div
              key={room.id}
              style={roomBoxStyle}
              className="print-room"
            >
              <h2 style={roomTitleStyle}>
                Raum: {room.naziv}
              </h2>

              <h3 style={subTitleStyle}>Arbeitsstunden</h3>

              <p>
                <strong>Summe Raum:</strong>{" "}
                {formatNumber(roomTotalHours)} h
              </p>

              {roomHours.length === 0 ? (
                <p style={mutedTextStyle}>
                  Keine Arbeitsstunden für diesen Raum.
                </p>
              ) : (
                <div style={tableWrapStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Datum</th>
                        <th style={thStyle}>Mitarbeiter</th>
                        <th style={thStyle}>Beginn</th>
                        <th style={thStyle}>Ende</th>
                        <th style={thStyle}>Pause</th>
                        <th style={thStyle}>Gesamt</th>
                        <th style={thStyle}>Tätigkeit</th>
                      </tr>
                    </thead>

                    <tbody>
                      {roomHours.map((item: any) => (
                        <tr key={item.id}>
                          <td style={tdStyle}>
                            {formatDate(item.datum)}
                          </td>

                          <td style={tdStyle}>
                            {item.radnik || "-"}
                          </td>

                          <td style={tdStyle}>
                            {item.pocetak || "-"}
                          </td>

                          <td style={tdStyle}>
                            {item.kraj || "-"}
                          </td>

                          <td style={tdStyle}>
                            {formatNumber(item.pauza)} h
                          </td>

                          <td style={tdStyle}>
                            {formatNumber(
                              item.ukupno_sati || item.sati
                            )}{" "}
                            h
                          </td>

                          <td style={tdStyle}>
                            {item.opis_posla || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 style={subTitleStyle}>
                Materialverbrauch
              </h3>

              {roomMaterial.length === 0 ? (
                <p style={mutedTextStyle}>
                  Kein Material für diesen Raum.
                </p>
              ) : (
                <div style={tableWrapStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Material</th>
                        <th style={thStyle}>Menge</th>
                        <th style={thStyle}>Einheit</th>
                      </tr>
                    </thead>

                    <tbody>
                      {roomMaterial.map((item: any) => (
                        <tr key={item.id}>
                          <td style={tdStyle}>
                            {getMaterialNameFromRoomMaterial(
                              item
                            )}
                          </td>

                          <td style={tdStyle}>
                            {formatNumber(item.kolicina)}
                          </td>

                          <td style={tdStyle}>
                            {getMaterialUnitFromRoomMaterial(
                              item
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 style={subTitleStyle}>
                Leistungsnachweis
              </h3>

              {roomProductivity.length === 0 ? (
                <p style={mutedTextStyle}>
                  Keine Produktivitätsdaten für diesen Raum.
                </p>
              ) : (
                <div style={tableWrapStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Datum</th>
                        <th style={thStyle}>Mitarbeiter</th>
                        <th style={thStyle}>Leistung</th>
                        <th style={thStyle}>Menge</th>
                        <th style={thStyle}>Einheit</th>
                        <th style={thStyle}>Notiz</th>
                      </tr>
                    </thead>

                    <tbody>
                      {roomProductivity.map((item: any) => (
                        <tr key={item.id}>
                          <td style={tdStyle}>
                            {formatDate(item.datum)}
                          </td>

                          <td style={tdStyle}>
                            {item.radnik || "-"}
                          </td>

                          <td style={tdStyle}>
                            {translatePosition(item.pozicija)}
                          </td>

                          <td style={tdStyle}>
                            {formatNumber(item.kolicina)}
                          </td>

                          <td style={tdStyle}>
                            {item.jedinica || "-"}
                          </td>

                          <td style={tdStyle}>
                            {item.napomena || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 style={subTitleStyle}>
                Fotodokumentation
              </h3>

              {roomPhotos.length === 0 ? (
                <p style={mutedTextStyle}>
                  Keine Fotos für diesen Raum.
                </p>
              ) : (
                <div
                  style={photoGridStyle}
                  className="photo-grid"
                >
                  {roomPhotos.map((photo: any) => {
                    const url = getPhotoUrl(photo);

                    if (!url) return null;

                    return (
                      <div
                        key={photo.id}
                        style={photoCardStyle}
                        className="photo-card"
                      >
                        <img
                          src={url}
                          alt={
                            getPhotoDescription(photo) ||
                            "Foto"
                          }
                          style={photoStyle}
                          className="photo-img"
                          onClick={() =>
                            setSelectedPhoto(url)
                          }
                        />

                        <div style={photoInfoStyle}>
                          <p style={photoRoomStyle}>
                            {getRoomName(photo.room_id)}
                          </p>

                          <p style={photoCaptionStyle}>
                            <strong>
                              Hinzugefügt von:
                            </strong>{" "}
                            {getPhotoWorker(photo)}
                          </p>

                          <p style={photoCaptionStyle}>
                            <strong>Datum:</strong>{" "}
                            {formatDateTime(
                              getPhotoCreatedAt(photo)
                            )}
                          </p>

                          {getPhotoDescription(photo) && (
                            <p style={photoCaptionStyle}>
                              <strong>
                                Beschreibung:
                              </strong>{" "}
                              {getPhotoDescription(photo)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section style={boxStyle} className="print-box">
        <h2 style={sectionTitleStyle}>
          Gesamtauswertung
        </h2>

        <p>
          <strong>Gesamtstunden:</strong>{" "}
          {formatNumber(totalHours)} h
        </p>

        <p>
          <strong>Anzahl Mitarbeiter:</strong>{" "}
          {workers.length}
        </p>

        <p>
          <strong>Anzahl Räume:</strong> {rooms.length}
        </p>

        <p>
          <strong>Anzahl Arbeitstage:</strong>{" "}
          {workDays.length}
        </p>

        <p>
          <strong>Anzahl Fotos:</strong> {photos.length}
        </p>

        <p>
          <strong>Bericht erstellt am:</strong>{" "}
          {new Date().toLocaleDateString("de-AT")}
        </p>
      </section>

      {selectedPhoto && (
        <div
          style={modalOverlayStyle}
          className="no-print"
          onClick={() => setSelectedPhoto(null)}
        >
          <img
            src={selectedPhoto}
            alt="Foto"
            style={modalImageStyle}
          />
        </div>
      )}
    </main>
  );
}

const mainStyle: any = {
  background: "#000",
  minHeight: "100vh",
  color: "white",
  padding: "40px",
};

const topBarStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  alignItems: "center",
  marginBottom: "30px",
};

const backLinkStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
};

const pdfButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "12px 20px",
  fontWeight: "bold",
  cursor: "pointer",
};

const titleStyle: any = {
  fontSize: "56px",
  fontWeight: "bold",
  marginBottom: "30px",
};

const boxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  marginBottom: "30px",
};

const sectionTitleStyle: any = {
  fontSize: "28px",
  color: "#f97316",
  marginBottom: "20px",
};

const infoGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "20px",
};

const roomBoxStyle: any = {
  background: "#000",
  border: "1px solid #333",
  padding: "25px",
  borderRadius: "18px",
  marginBottom: "30px",
};

const roomTitleStyle: any = {
  fontSize: "30px",
  color: "#f97316",
  marginBottom: "20px",
};

const subTitleStyle: any = {
  fontSize: "22px",
  marginTop: "25px",
  marginBottom: "12px",
};

const mutedTextStyle: any = {
  color: "#999",
};

const tableWrapStyle: any = {
  overflowX: "auto",
};

const tableStyle: any = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "10px",
};

const thStyle: any = {
  borderBottom: "1px solid #444",
  padding: "10px",
  textAlign: "left",
  color: "#f97316",
  whiteSpace: "nowrap",
};

const tdStyle: any = {
  borderBottom: "1px solid #333",
  padding: "10px",
  verticalAlign: "top",
};

const photoGridStyle: any = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 260px))",
  gap: "16px",
  marginTop: "15px",
};

const photoCardStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "14px",
  padding: "10px",
  maxWidth: "260px",
};

const photoStyle: any = {
  width: "100%",
  height: "150px",
  objectFit: "cover",
  borderRadius: "10px",
  display: "block",
  cursor: "pointer",
};

const photoCaptionStyle: any = {
  color: "#aaa",
  fontSize: "13px",
  marginTop: "8px",
  marginBottom: 0,
};

const photoInfoStyle: any = {
  marginTop: "8px",
};

const photoRoomStyle: any = {
  color: "#f97316",
  fontSize: "14px",
  fontWeight: "bold",
  marginTop: "8px",
  marginBottom: "6px",
};

const modalOverlayStyle: any = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.85)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: "30px",
  cursor: "pointer",
};

const modalImageStyle: any = {
  maxWidth: "90vw",
  maxHeight: "90vh",
  borderRadius: "14px",
  objectFit: "contain",
};