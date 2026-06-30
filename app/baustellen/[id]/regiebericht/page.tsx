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
  const [regieberichte, setRegieberichte] = useState<any[]>([]);
  const [regieHours, setRegieHours] = useState<any[]>([]);
  const [productivity, setProductivity] = useState<any[]>([]);
  const [roomMaterials, setRoomMaterials] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [baustelleInfo, setBaustelleInfo] = useState<any[]>([]);
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

    const { data: regieberichteData } = await supabase
      .from("regieberichte")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("datum", { ascending: true });

    const regieberichtIds = (regieberichteData || []).map((r: any) => r.id);

    let regieWorkersData: any[] = [];

    if (regieberichtIds.length > 0) {
      const { data } = await supabase
        .from("regiebericht_workers")
        .select("*")
        .in("regiebericht_id", regieberichtIds);

      regieWorkersData = data || [];
    }

    const { data: productivityData } = await supabase
      .from("produktivnost")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("datum", { ascending: true });

    const { data: infoData } = await supabase
      .from("baustelle_info")
      .select("*")
      .eq("baustelle_id", Number(baustelleId));

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
        .order("created_at", { ascending: true });

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
    setRegieberichte(regieberichteData || []);
    setRegieHours(regieWorkersData || []);
    setProductivity(productivityData || []);
    setRoomMaterials(roomMaterialData || []);
    setMaterials(materialsData || []);
    setPhotos(photosData || []);
    setBaustelleInfo(infoData || []);
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

  function formatDateTime(value: string) {
    if (!value) return "-";

    return new Date(value).toLocaleString("de-AT", {
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
    const mat = materials.find((m: any) => Number(m.id) === Number(materialId));

    return mat?.naziv || mat?.name || mat?.material || mat?.bezeichnung || "";
  }

  function getMaterialNameFromRoomMaterial(m: any) {
    const manualName =
      m?.custom_naziv ||
      m?.custom_name ||
      m?.material_name ||
      m?.naziv ||
      m?.name ||
      m?.material ||
      m?.bezeichnung ||
      m?.opis ||
      m?.description ||
      m?.manual_name ||
      m?.keramika_naziv ||
      m?.title ||
      "";

    const catalogName = m?.material_id ? getMaterialName(m.material_id) : "";

    return manualName || catalogName || "Unbekannter Materialeintrag";
  }

  function getMaterialUnitFromRoomMaterial(m: any) {
    return (
      m?.custom_jedinica ||
      m?.custom_unit ||
      m?.jedinica ||
      m?.unit ||
      m?.einheit ||
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

  function getRegiebericht(row: any) {
    return regieberichte.find(
      (r: any) => Number(r.id) === Number(row.regiebericht_id)
    );
  }

  function getRegieDate(row: any) {
    const bericht = getRegiebericht(row);
    return bericht?.datum || row?.datum || row?.created_at || "";
  }

  function getRegieNumber(row: any) {
    const bericht = getRegiebericht(row);
    return bericht?.bericht_nr || bericht?.id || row?.regiebericht_id || "-";
  }

  function getRegieWorkText(row: any) {
    const bericht = getRegiebericht(row);

    return (
      bericht?.ausgefuehrte_arbeiten ||
      bericht?.arbeiten ||
      bericht?.beschreibung ||
      row?.ausgefuehrte_arbeiten ||
      row?.taetigkeit ||
      row?.bemerkung ||
      "-"
    );
  }

  function getRegieberichtNumber(bericht: any) {
    return bericht?.bericht_nr || bericht?.nummer || bericht?.id || "-";
  }

  function getRegieberichtOrt(bericht: any) {
    return bericht?.ort || bericht?.place || bericht?.location || baustelle?.ort || "-";
  }

  function getRegieberichtWorkText(bericht: any) {
    return (
      bericht?.ausgefuehrte_arbeiten ||
      bericht?.arbeiten ||
      bericht?.beschreibung ||
      bericht?.taetigkeit ||
      bericht?.bemerkung ||
      "-"
    );
  }

  function getRegieberichtRows(berichtId: number) {
    return regieHours.filter(
      (row: any) => Number(row.regiebericht_id) === Number(berichtId)
    );
  }

  function getRegieberichtTotalHours(berichtId: number) {
    return getRegieberichtRows(berichtId).reduce(
      (sum: number, row: any) =>
        sum + Number(row.stunden || row.sati || row.ukupno_sati || 0),
      0
    );
  }

  function getGoogleMapsUrl() {
    const row = baustelleInfo.find((x: any) => x.type === "google_maps");
    return row?.google_maps_url || "";
  }

  function getVisualizationUrl() {
    const row = baustelleInfo.find((x: any) => x.type === "visualization_3d");
    return row?.visualization_url || "";
  }

  const totalHours = hours.reduce(
    (sum, h) => sum + Number(h.ukupno_sati || h.sati || 0),
    0
  );

  const totalRegieHours = regieHours.reduce(
    (sum, h) => sum + Number(h.stunden || h.sati || h.ukupno_sati || 0),
    0
  );

  const startDate = hours.length > 0 ? hours[0].datum : "-";
  const endDate = hours.length > 0 ? hours[hours.length - 1].datum : "-";

  const workers = [...new Set(hours.map((h: any) => h.radnik).filter(Boolean))];

  const regieWorkers = [
    ...new Set(regieHours.map((h: any) => h.worker_name).filter(Boolean)),
  ];

  const allWorkers = [...new Set([...workers, ...regieWorkers])];

  const workDays = [...new Set(hours.map((h: any) => h.datum).filter(Boolean))];

  const regieHoursByWorker = regieWorkers.map((workerName: any) => {
    const sum = regieHours
      .filter((r: any) => r.worker_name === workerName)
      .reduce((total, r) => total + Number(r.stunden || 0), 0);

    return {
      workerName,
      sum,
    };
  });

  const regieHoursByBericht = regieberichte.map((bericht: any) => {
    const rows = regieHours.filter(
      (r: any) => Number(r.regiebericht_id) === Number(bericht.id)
    );

    const sum = rows.reduce(
      (total, r) => total + Number(r.stunden || r.sati || r.ukupno_sati || 0),
      0
    );

    return {
      bericht,
      rows,
      sum,
    };
  });

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

            .print-regie-block {
              background: white !important;
              color: black !important;
              border: 1px solid #ddd !important;
              page-break-inside: avoid;
              break-inside: avoid;
            }

            .photo-img {
              height: 170px !important;
              width: 100% !important;
              object-fit: contain !important;
              background: white !important;
            }

            table {
              font-size: 11px !important;
            }

            th, td {
              color: black !important;
              border-color: #ccc !important;
              padding: 5px !important;
            }

            h1 {
              font-size: 28px !important;
              color: black !important;
            }

            h2, h3 {
              color: black !important;
            }
          }
        `}
      </style>

      <div style={topBarStyle} className="no-print">
        <Link href="/baustellen/archiv" style={backLinkStyle}>
          ← Zurück zum Archiv
        </Link>

        <div style={topButtonRowStyle}>
          {getGoogleMapsUrl() && (
            <a href={getGoogleMapsUrl()} target="_blank" style={mapsButtonStyle}>
              📍 Google Maps
            </a>
          )}

          {getVisualizationUrl() && (
            <a
              href={getVisualizationUrl()}
              target="_blank"
              style={visualizationButtonStyle}
            >
              🏗️ 3D Visualisierung
            </a>
          )}

          <button onClick={printPdf} style={pdfButtonStyle}>
            📥 PDF herunterladen
          </button>
        </div>
      </div>

      <h1 style={titleStyle}>ABSCHLUSSBERICHT BAUSTELLE</h1>

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
            {allWorkers.length > 0 ? allWorkers.join(", ") : "-"}
          </p>

          <p>
            <strong>Arbeitsstunden:</strong>
            <br />
            {formatNumber(totalHours)} h
          </p>

          <p>
            <strong>Regiestunden:</strong>
            <br />
            {formatNumber(totalRegieHours)} h
          </p>

          <p>
            <strong>Gesamt inkl. Regie:</strong>
            <br />
            {formatNumber(totalHours + totalRegieHours)} h
          </p>
        </div>
      </section>

      <section style={boxStyle} className="print-box">
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

      <section style={boxStyle} className="print-box">
        <h2 style={sectionTitleStyle}>Regiestunden</h2>

        <div style={regieSummaryStyle}>
          <p>
            <strong>Gesamt Regiestunden:</strong> {formatNumber(totalRegieHours)} h
          </p>

          <p>
            <strong>Anzahl Regieberichte:</strong> {regieberichte.length}
          </p>
        </div>

        {regieHoursByWorker.length > 0 && (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Mitarbeiter</th>
                  <th style={thStyle}>Regiestunden gesamt</th>
                </tr>
              </thead>

              <tbody>
                {regieHoursByWorker.map((row: any) => (
                  <tr key={row.workerName}>
                    <td style={tdStyle}>{row.workerName}</td>
                    <td style={tdStyle}>{formatNumber(row.sum)} h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 style={subTitleStyle}>Einzelne Regieeinträge</h3>

        {regieHours.length === 0 ? (
          <p style={mutedTextStyle}>Keine Regiestunden vorhanden.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Bericht Nr.</th>
                  <th style={thStyle}>Datum</th>
                  <th style={thStyle}>Mitarbeiter</th>
                  <th style={thStyle}>Von</th>
                  <th style={thStyle}>Bis</th>
                  <th style={thStyle}>Stunden</th>
                  <th style={thStyle}>Ausgeführte Arbeiten</th>
                </tr>
              </thead>

              <tbody>
                {regieHours.map((r: any) => (
                  <tr key={r.id}>
                    <td style={tdStyle}>{getRegieNumber(r)}</td>
                    <td style={tdStyle}>{formatDate(getRegieDate(r))}</td>
                    <td style={tdStyle}>{r.worker_name || "-"}</td>
                    <td style={tdStyle}>{r.von || "-"}</td>
                    <td style={tdStyle}>{r.bis || "-"}</td>
                    <td style={tdStyle}>{formatNumber(r.stunden)} h</td>
                    <td style={tdStyle}>{getRegieWorkText(r)}</td>
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
            <div key={room.id} style={roomBoxStyle} className="print-room">
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
                        <th style={thStyle}>Einheit</th>
                      </tr>
                    </thead>

                    <tbody>
                      {roomMat.map((m: any) => (
                        <tr key={m.id}>
                          <td style={tdStyle}>{getMaterialNameFromRoomMaterial(m)}</td>
                          <td style={tdStyle}>{formatNumber(m.kolicina)}</td>
                          <td style={tdStyle}>{getMaterialUnitFromRoomMaterial(m)}</td>
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
                          <td style={tdStyle}>{translatePosition(p.pozicija)}</td>
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
                <div style={photoGridStyle} className="photo-grid">
                  {roomPhotos.map((photo: any) => {
                    const url = getPhotoUrl(photo);

                    if (!url) return null;

                    return (
                      <div key={photo.id} style={photoCardStyle} className="photo-card">
                        <img
                          src={url}
                          alt={getPhotoDescription(photo) || "Foto"}
                          style={photoStyle}
                          className="photo-img"
                          onClick={() => setSelectedPhoto(url)}
                        />

                        <div style={photoInfoStyle}>
                          <p style={photoRoomStyle}>{getRoomName(photo.room_id)}</p>
                          <p style={photoCaptionStyle}>
                            <strong>Hinzugefügt von:</strong> {getPhotoWorker(photo)}
                          </p>
                          <p style={photoCaptionStyle}>
                            <strong>Datum:</strong>{" "}
                            {formatDateTime(getPhotoCreatedAt(photo))}
                          </p>
                          {getPhotoDescription(photo) && (
                            <p style={photoCaptionStyle}>
                              <strong>Beschreibung:</strong>{" "}
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
        <h2 style={sectionTitleStyle}>Gesamtauswertung</h2>

        <p>
          <strong>Arbeitsstunden:</strong> {formatNumber(totalHours)} h
        </p>

        <p>
          <strong>Regiestunden:</strong> {formatNumber(totalRegieHours)} h
        </p>

        <p>
          <strong>Gesamtstunden inkl. Regie:</strong>{" "}
          {formatNumber(totalHours + totalRegieHours)} h
        </p>

        <p>
          <strong>Anzahl Mitarbeiter:</strong> {allWorkers.length}
        </p>

        <p>
          <strong>Anzahl Räume:</strong> {rooms.length}
        </p>

        <p>
          <strong>Anzahl Arbeitstage:</strong> {workDays.length}
        </p>

        <p>
          <strong>Anzahl Regieberichte:</strong> {regieberichte.length}
        </p>

        <p>
          <strong>Anzahl Fotos:</strong> {photos.length}
        </p>

        <p>
          <strong>Bericht erstellt am:</strong>{" "}
          {new Date().toLocaleDateString("de-AT")}
        </p>
      </section>

      <section style={boxStyle} className="print-box">
        <h2 style={sectionTitleStyle}>Regieberichte / Režijski blokovi</h2>

        {regieberichte.length === 0 ? (
          <p style={mutedTextStyle}>Keine Regieberichte vorhanden.</p>
        ) : (
          regieberichte.map((bericht: any, index: number) => {
            const rows = getRegieberichtRows(bericht.id);
            const sum = getRegieberichtTotalHours(bericht.id);

            return (
              <div
                key={bericht.id || index}
                style={regieBlockStyle}
                className="print-regie-block"
              >
                <h3 style={regieBlockTitleStyle}>
                  Regiebericht Nr. {getRegieberichtNumber(bericht)}
                </h3>

                <div style={regieHeaderGridStyle}>
                  <p>
                    <strong>Datum:</strong> {formatDate(bericht.datum)}
                  </p>

                  <p>
                    <strong>Ort:</strong> {getRegieberichtOrt(bericht)}
                  </p>

                  <p>
                    <strong>Gesamtstunden:</strong> {formatNumber(sum)} h
                  </p>
                </div>

                <div style={regieWorkTextStyle}>
                  <strong>Ausgeführte Arbeiten:</strong>
                  <p>{getRegieberichtWorkText(bericht)}</p>
                </div>

                {rows.length === 0 ? (
                  <p style={mutedTextStyle}>Keine Mitarbeiterzeiten vorhanden.</p>
                ) : (
                  <div style={tableWrapStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Mitarbeiter</th>
                          <th style={thStyle}>Von</th>
                          <th style={thStyle}>Bis</th>
                          <th style={thStyle}>Stunden</th>
                        </tr>
                      </thead>

                      <tbody>
                        {rows.map((row: any) => (
                          <tr key={row.id}>
                            <td style={tdStyle}>{row.worker_name || row.radnik || "-"}</td>
                            <td style={tdStyle}>{row.von || row.pocetak || "-"}</td>
                            <td style={tdStyle}>{row.bis || row.kraj || "-"}</td>
                            <td style={tdStyle}>
                              {formatNumber(row.stunden || row.sati || row.ukupno_sati)} h
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {selectedPhoto && (
        <div
          style={modalOverlayStyle}
          className="no-print"
          onClick={() => setSelectedPhoto(null)}
        >
          <img src={selectedPhoto} alt="Foto" style={modalImageStyle} />
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
  flexWrap: "wrap",
};

const topButtonRowStyle: any = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
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
  textDecoration: "none",
};

const mapsButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "12px 20px",
  fontWeight: "bold",
  cursor: "pointer",
  textDecoration: "none",
};

const visualizationButtonStyle: any = {
  background: "#7c3aed",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "12px 20px",
  fontWeight: "bold",
  cursor: "pointer",
  textDecoration: "none",
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
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "20px",
};

const regieSummaryStyle: any = {
  display: "flex",
  gap: "30px",
  flexWrap: "wrap",
  marginBottom: "20px",
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
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 260px))",
  gap: "16px",
  marginTop: "15px",
  alignItems: "start",
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
  height: "220px",
  objectFit: "contain",
  objectPosition: "center",
  background: "#000",
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

const regieBlockStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "22px",
};

const regieBlockTitleStyle: any = {
  fontSize: "22px",
  color: "#f97316",
  marginBottom: "14px",
};

const regieHeaderGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "10px",
  marginBottom: "14px",
};

const regieWorkTextStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "12px",
  padding: "12px",
  marginBottom: "14px",
  whiteSpace: "pre-wrap",
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