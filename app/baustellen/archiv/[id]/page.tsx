"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

export default function ArchivBerichtPage() {
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

    const roomIds = (roomsData || []).map((r: any) => r.id);

    let roomMaterialData: any[] = [];
    let photosData: any[] = [];

    if (roomIds.length > 0) {
      const { data: rmData } = await supabase
        .from("room_material")
        .select("*")
        .in("room_id", roomIds);

      roomMaterialData = rmData || [];

      const { data: phData } = await supabase
        .from("room_photos")
        .select("*")
        .in("room_id", roomIds)
        .order("id", { ascending: true });

      photosData = phData || [];
    }

    const materialIds = [
      ...new Set(roomMaterialData.map((m: any) => m.material_id)),
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
    setRoomMaterials(roomMaterialData || []);
    setMaterials(materialsData || []);
    setPhotos(photosData || []);
    setLoading(false);
  }

  function formatDate(value: string) {
    if (!value) return "-";

    return new Date(value).toLocaleDateString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function formatNumber(value: any) {
    return Number(value || 0).toLocaleString("de-AT", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    });
  }

  function getMaterialName(materialId: number) {
    const mat = materials.find((m: any) => Number(m.id) === Number(materialId));

    return (
      mat?.naziv ||
      mat?.name ||
      mat?.material ||
      mat?.bezeichnung ||
      `Material ID ${materialId}`
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

  function getPhotoTitle(photo: any) {
    return (
      photo?.opis ||
      photo?.napomena ||
      photo?.description ||
      photo?.title ||
      "Foto"
    );
  }

  function getRoomName(roomId: number) {
    const room = rooms.find((r: any) => Number(r.id) === Number(roomId));
    return room?.naziv || `Raum ${roomId}`;
  }

  function getHoursForRoom(roomId: number) {
    return hours.filter((h: any) => Number(h.room_id) === Number(roomId));
  }

  function getProductivityForRoom(roomId: number) {
    return productivity.filter((p: any) => Number(p.room_id) === Number(roomId));
  }

  function getMaterialsForRoom(roomId: number) {
    return roomMaterials.filter((m: any) => Number(m.room_id) === Number(roomId));
  }

  function getPhotosForRoom(roomId: number) {
    return photos.filter((p: any) => Number(p.room_id) === Number(roomId));
  }

  const totalHours = hours.reduce(
    (sum, h) => sum + Number(h.ukupno_sati || h.sati || 0),
    0
  );

  const startDate = hours.length > 0 ? hours[0].datum : "-";
  const endDate = hours.length > 0 ? hours[hours.length - 1].datum : "-";

  const workers = [...new Set(hours.map((h: any) => h.radnik).filter(Boolean))];

  const workDays = [
    ...new Set(hours.map((h: any) => h.datum).filter(Boolean)),
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
      <div style={topBarStyle}>
        <Link href="/baustellen/archiv" style={backLinkStyle}>
          ← Zurück zum Archiv
        </Link>

        <button onClick={printPdf} style={pdfButtonStyle}>
          📥 PDF herunterladen
        </button>
      </div>

      <h1 style={titleStyle}>ABSCHLUSSBERICHT BAUSTELLE</h1>

      <section style={boxStyle}>
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

      <section style={boxStyle}>
        <h2 style={sectionTitleStyle}>Gesamtübersicht Arbeitsstunden</h2>

        {hours.length === 0 ? (
          <p style={mutedTextStyle}>Keine Arbeitsstunden vorhanden.</p>
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
                {hours.map((h: any) => (
                  <tr key={h.id}>
                    <td style={tdStyle}>{formatDate(h.datum)}</td>
                    <td style={tdStyle}>{h.radnik || "-"}</td>
                    <td style={tdStyle}>
                      {h.room_id ? getRoomName(h.room_id) : "-"}
                    </td>
                    <td style={tdStyle}>{h.pocetak || "-"}</td>
                    <td style={tdStyle}>{h.kraj || "-"}</td>
                    <td style={tdStyle}>{formatNumber(h.pauza)} h</td>
                    <td style={tdStyle}>
                      {formatNumber(h.ukupno_sati || h.sati)} h
                    </td>
                    <td style={tdStyle}>{h.opis_posla || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={boxStyle}>
        <h2 style={sectionTitleStyle}>Raumübersicht</h2>

        {rooms.length === 0 && (
          <p style={mutedTextStyle}>Keine Räume vorhanden.</p>
        )}

        {rooms.map((room: any) => {
          const roomHours = getHoursForRoom(room.id);
          const roomProd = getProductivityForRoom(room.id);
          const roomMat = getMaterialsForRoom(room.id);
          const roomPhotos = getPhotosForRoom(room.id);

          const roomTotalHours = roomHours.reduce(
            (sum, h) => sum + Number(h.ukupno_sati || h.sati || 0),
            0
          );

          return (
            <div key={room.id} style={roomBoxStyle}>
              <h2 style={roomTitleStyle}>Raum: {room.naziv}</h2>

              <h3 style={subTitleStyle}>Arbeitsstunden</h3>

              <p>
                <strong>Summe Raum:</strong> {formatNumber(roomTotalHours)} h
              </p>

              {roomHours.length === 0 ? (
                <p style={mutedTextStyle}>Keine Arbeitsstunden für diesen Raum.</p>
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
                      {roomHours.map((h: any) => (
                        <tr key={h.id}>
                          <td style={tdStyle}>{formatDate(h.datum)}</td>
                          <td style={tdStyle}>{h.radnik || "-"}</td>
                          <td style={tdStyle}>{h.pocetak || "-"}</td>
                          <td style={tdStyle}>{h.kraj || "-"}</td>
                          <td style={tdStyle}>{formatNumber(h.pauza)} h</td>
                          <td style={tdStyle}>
                            {formatNumber(h.ukupno_sati || h.sati)} h
                          </td>
                          <td style={tdStyle}>{h.opis_posla || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 style={subTitleStyle}>Materialverbrauch</h3>

              {roomMat.length === 0 ? (
                <p style={mutedTextStyle}>Kein Material für diesen Raum.</p>
              ) : (
                <div style={tableWrapStyle}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Material</th>
                        <th style={thStyle}>Menge</th>
                      </tr>
                    </thead>

                    <tbody>
                      {roomMat.map((m: any) => (
                        <tr key={m.id}>
                          <td style={tdStyle}>{getMaterialName(m.material_id)}</td>
                          <td style={tdStyle}>{formatNumber(m.kolicina)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 style={subTitleStyle}>Leistungsnachweis</h3>

              {roomProd.length === 0 ? (
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
                      {roomProd.map((p: any) => (
                        <tr key={p.id}>
                          <td style={tdStyle}>{formatDate(p.datum)}</td>
                          <td style={tdStyle}>{p.radnik || "-"}</td>
                          <td style={tdStyle}>{p.pozicija || "-"}</td>
                          <td style={tdStyle}>{formatNumber(p.kolicina)}</td>
                          <td style={tdStyle}>{p.jedinica || "-"}</td>
                          <td style={tdStyle}>{p.napomena || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 style={subTitleStyle}>Fotodokumentation</h3>

              {roomPhotos.length === 0 ? (
                <p style={mutedTextStyle}>Keine Fotos für diesen Raum.</p>
              ) : (
                <div style={photoGridStyle}>
                  {roomPhotos.map((photo: any) => {
                    const url = getPhotoUrl(photo);

                    if (!url) return null;

                    return (
                      <div key={photo.id} style={photoCardStyle}>
                        <img
                          src={url}
                          alt={getPhotoTitle(photo)}
                          style={photoStyle}
                        />

                        <p style={photoCaptionStyle}>{getPhotoTitle(photo)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section style={boxStyle}>
        <h2 style={sectionTitleStyle}>Gesamtauswertung</h2>

        <p>
          <strong>Gesamtstunden:</strong> {formatNumber(totalHours)} h
        </p>

        <p>
          <strong>Anzahl Mitarbeiter:</strong> {workers.length}
        </p>

        <p>
          <strong>Anzahl Räume:</strong> {rooms.length}
        </p>

        <p>
          <strong>Anzahl Arbeitstage:</strong> {workDays.length}
        </p>

        <p>
          <strong>Anzahl Fotos:</strong> {photos.length}
        </p>

        <p>
          <strong>Bericht erstellt am:</strong>{" "}
          {new Date().toLocaleDateString("de-AT")}
        </p>
      </section>
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
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "18px",
  marginTop: "15px",
};

const photoCardStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "14px",
  padding: "12px",
};

const photoStyle: any = {
  width: "100%",
  height: "220px",
  objectFit: "cover",
  borderRadius: "10px",
  display: "block",
};

const photoCaptionStyle: any = {
  color: "#aaa",
  fontSize: "14px",
  marginTop: "8px",
  marginBottom: 0,
};