"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const translations: any = {
  de: {
    back: "Zurück zu Baustellen",
    loading: "Wird geladen...",
    location: "Ort",
    status: "Status",
    active: "Aktiv",
    addedRooms: "Hinzugefügte Räume",
    addRooms: "Räume hinzufügen",
    overview: "Übersicht",
    arbeitsinfo: "Arbeitsinfo",
    regiebericht: "Regietagesbericht",
    closeSite: "Baustelle abschließen",
    deleteSite: "Baustelle löschen",
    googleLocation: "Google Standort",
    openGoogle: "Auf Google Maps öffnen",
    visualization3d: "3D Visualisierung",
    openVisualization3d: "3D Ansicht öffnen",
    siteInfo: "Informationen zur Baustelle",
    addInfo: "Information hinzufügen",
    close: "Schließen",
    save: "Speichern",
    edit: "Bearbeiten",
    delete: "Löschen",
    value: "Information / Text",
    emptyInfo: "Noch keine Informationen eingetragen.",
    ansprechpartner: "Bauleiter / Ansprechpartner",
    zugang: "Zugang / Türnummer",
    parking: "Parking",
    schluessel: "Schlüssel",
    wc: "WC",
    strom: "Strom",
    wasser: "Wasser",
    lift: "Lift",
    arbeitszeit: "Arbeitszeit",
    telefone: "Wichtige Telefonnummern",
    notizen: "Zusätzliche Hinweise",
  },
  ba: {
    back: "Nazad na Baustelle",
    loading: "Učitavanje...",
    location: "Lokacija",
    status: "Status",
    active: "Aktiv",
    addedRooms: "Dodane prostorije",
    addRooms: "Dodaj prostorije",
    overview: "Pregled",
    arbeitsinfo: "Arbeitsinfo",
    regiebericht: "Regietagesbericht",
    closeSite: "Zatvori Baustelle",
    deleteSite: "Obriši Baustelle",
    googleLocation: "Google lokacija",
    openGoogle: "Otvori na Google Maps",
    visualization3d: "3D Vizualizacija",
    openVisualization3d: "Otvori 3D prikaz",
    siteInfo: "Informacije o Baustelle",
    addInfo: "Dodaj informaciju",
    close: "Zatvori",
    save: "Sačuvaj",
    edit: "Uredi",
    delete: "Obriši",
    value: "Informacija / tekst",
    emptyInfo: "Još nema dodanih informacija.",
    ansprechpartner: "Bauleiter / Ansprechpartner",
    zugang: "Zugang / broj vrata",
    parking: "Parking",
    schluessel: "Ključevi",
    wc: "WC",
    strom: "Struja",
    wasser: "Voda",
    lift: "Lift",
    arbeitszeit: "Radno vrijeme objekta",
    telefone: "Važni telefoni",
    notizen: "Dodatne napomene",
  },
  en: {
    back: "Back to Sites",
    loading: "Loading...",
    location: "Location",
    status: "Status",
    active: "Active",
    addedRooms: "Added rooms",
    addRooms: "Add rooms",
    overview: "Overview",
    arbeitsinfo: "Work info",
    regiebericht: "Regie daily report",
    closeSite: "Close Site",
    deleteSite: "Delete Site",
    googleLocation: "Google location",
    openGoogle: "Open in Google Maps",
    visualization3d: "3D Visualization",
    openVisualization3d: "Open 3D view",
    siteInfo: "Site information",
    addInfo: "Add information",
    close: "Close",
    save: "Save",
    edit: "Edit",
    delete: "Delete",
    value: "Information / text",
    emptyInfo: "No information added yet.",
    ansprechpartner: "Site manager / contact person",
    zugang: "Access / door number",
    parking: "Parking",
    schluessel: "Keys",
    wc: "WC",
    strom: "Electricity",
    wasser: "Water",
    lift: "Lift",
    arbeitszeit: "Working hours",
    telefone: "Important phone numbers",
    notizen: "Additional notes",
  },
  uz: {
    back: "Obyektlarga qaytish",
    loading: "Yuklanmoqda...",
    location: "Manzil",
    status: "Holat",
    active: "Faol",
    addedRooms: "Qo‘shilgan xonalar",
    addRooms: "Xona qo‘shish",
    overview: "Ko‘rinish",
    arbeitsinfo: "Ish ma’lumoti",
    regiebericht: "Regie hisoboti",
    closeSite: "Obyektni yopish",
    deleteSite: "Obyektni o‘chirish",
    googleLocation: "Google manzil",
    openGoogle: "Google Maps’da ochish",
    visualization3d: "3D vizualizatsiya",
    openVisualization3d: "3D ko‘rinishni ochish",
    siteInfo: "Obyekt ma’lumoti",
    addInfo: "Ma’lumot qo‘shish",
    close: "Yopish",
    save: "Saqlash",
    edit: "Tahrirlash",
    delete: "O‘chirish",
    value: "Ma’lumot / matn",
    emptyInfo: "Hali ma’lumot qo‘shilmagan.",
    ansprechpartner: "Bauleiter / mas’ul shaxs",
    zugang: "Kirish / eshik raqami",
    parking: "Parking",
    schluessel: "Kalitlar",
    wc: "WC",
    strom: "Elektr",
    wasser: "Suv",
    lift: "Lift",
    arbeitszeit: "Ish vaqti",
    telefone: "Muhim telefonlar",
    notizen: "Qo‘shimcha eslatmalar",
  },
};

const infoFields = [
  { key: "ansprechpartner", icon: "👷" },
  { key: "zugang", icon: "🚪" },
  { key: "parking", icon: "🚗" },
  { key: "schluessel", icon: "🔑" },
  { key: "wc", icon: "🚾" },
  { key: "strom", icon: "⚡" },
  { key: "wasser", icon: "💧" },
  { key: "lift", icon: "🛗" },
  { key: "arbeitszeit", icon: "⏰" },
  { key: "telefone", icon: "📞" },
  { key: "notizen", icon: "📝" },
];

const emptyInfoData: any = {
  google_maps: "",
  visualization_3d: "",
  ansprechpartner: "",
  zugang: "",
  parking: "",
  schluessel: "",
  wc: "",
  strom: "",
  wasser: "",
  lift: "",
  arbeitszeit: "",
  telefone: "",
  notizen: "",
};

export default function BaustelleDetailPage() {
  const params = useParams();
  const router = useRouter();

  const baustelleId = String(params.id);

  const [baustelle, setBaustelle] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [info, setInfo] = useState<any>(emptyInfoData);

  const [workerRole, setWorkerRole] = useState("");
  const [lang, setLang] = useState("de");
  const [loading, setLoading] = useState(true);

  const [showInfoForm, setShowInfoForm] = useState(false);
  const [infoField, setInfoField] = useState("google_maps");
  const [infoValue, setInfoValue] = useState("");
  const [editingField, setEditingField] = useState("");

  const t = translations[lang] || translations.de;
  const isAdmin = workerRole === "admin";

  useEffect(() => {
    const role = localStorage.getItem("worker_role") || "worker";
    const savedLang = localStorage.getItem("lang") || "de";

    setWorkerRole(role);
    setLang(savedLang);

    loadAll();
  }, []);

  function playNotificationSound() {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 1;
    audio.play().catch(() => {});
  }

  async function loadAll() {
    setLoading(true);
    await loadBaustelle();
    await loadRooms();
    await loadInfo();
    setLoading(false);
  }

  async function loadBaustelle() {
    const { data, error } = await supabase
      .from("baustellen")
      .select("*")
      .eq("id", baustelleId)
      .single();

    if (error) {
      alert("Fehler beim Laden der Baustelle: " + error.message);
      return;
    }

    setBaustelle(data);
  }

  async function loadRooms() {
    const { data, error } = await supabase
      .from("prostorije")
      .select("*")
      .eq("baustelle_id", baustelleId)
      .order("id", { ascending: true });

    if (error) {
      alert("Fehler beim Laden der Räume: " + error.message);
      return;
    }

    setRooms(data || []);
  }

  async function loadInfo() {
    const { data, error } = await supabase
      .from("baustelle_info")
      .select("*")
      .eq("baustelle_id", Number(baustelleId));

    if (error) {
      alert("Fehler beim Laden der Baustelle-Info: " + error.message);
      return;
    }

    const nextInfo = { ...emptyInfoData };

    (data || []).forEach((row: any) => {
      if (row.type === "google_maps") {
        nextInfo.google_maps =
          row.google_maps_url || row.note_bs || row.note_de || "";
      } else if (row.type === "visualization_3d") {
        nextInfo.visualization_3d =
          row.visualization_url || row.google_maps_url || row.note_bs || "";
      } else if (row.type) {
        nextInfo[row.type] =
          row.note_bs ||
          row.note_de ||
          row.note_en ||
          row.note_uz ||
          row.google_maps_url ||
          "";
      }
    });

    setInfo(nextInfo);
  }

  function startAddInfo() {
    setEditingField("");
    setInfoField("google_maps");
    setInfoValue("");
    setShowInfoForm(true);
  }

  function startEditInfo(field: string) {
    setEditingField(field);
    setInfoField(field);
    setInfoValue(info[field] || "");
    setShowInfoForm(true);
  }

  function getInfoLabel(field: string) {
    if (field === "google_maps") return t.googleLocation;
    if (field === "visualization_3d") return t.visualization3d;
    return t[field] || field;
  }

  function buildInfoPayload(field: string, value: string) {
    const labelDe =
      field === "google_maps"
        ? translations.de.googleLocation
        : field === "visualization_3d"
        ? translations.de.visualization3d
        : translations.de[field] || field;

    const labelBs =
      field === "google_maps"
        ? translations.ba.googleLocation
        : field === "visualization_3d"
        ? translations.ba.visualization3d
        : translations.ba[field] || field;

    const labelUz =
      field === "google_maps"
        ? translations.uz.googleLocation
        : field === "visualization_3d"
        ? translations.uz.visualization3d
        : translations.uz[field] || field;

    const labelEn =
      field === "google_maps"
        ? translations.en.googleLocation
        : field === "visualization_3d"
        ? translations.en.visualization3d
        : translations.en[field] || field;

    return {
      baustelle_id: Number(baustelleId),
      room_id: null,
      type: field,
      title_de: labelDe,
      title_bs: labelBs,
      title_uz: labelUz,
      title_en: labelEn,
      note_de:
        field === "google_maps" || field === "visualization_3d" ? "" : value,
      note_bs:
        field === "google_maps" || field === "visualization_3d" ? "" : value,
      note_uz:
        field === "google_maps" || field === "visualization_3d" ? "" : value,
      note_en:
        field === "google_maps" || field === "visualization_3d" ? "" : value,
      google_maps_url: field === "google_maps" ? value : "",
      visualization_url: field === "visualization_3d" ? value : "",
    };
  }

  async function saveInfoField() {
    if (!infoValue.trim()) {
      alert(t.value);
      return;
    }

    await supabase
      .from("baustelle_info")
      .delete()
      .eq("baustelle_id", Number(baustelleId))
      .eq("type", infoField);

    const payload = buildInfoPayload(infoField, infoValue.trim());

    const { error } = await supabase.from("baustelle_info").insert([payload]);

    if (error) {
      alert("Fehler beim Speichern: " + error.message);
      return;
    }

    playNotificationSound();

    setShowInfoForm(false);
    setEditingField("");
    setInfoValue("");
    await loadInfo();
  }

  async function deleteInfoField(field: string) {
    const ok = confirm("Information wirklich löschen?");
    if (!ok) return;

    const { error } = await supabase
      .from("baustelle_info")
      .delete()
      .eq("baustelle_id", Number(baustelleId))
      .eq("type", field);

    if (error) {
      alert("Fehler beim Löschen: " + error.message);
      return;
    }

    await loadInfo();
  }

  async function countRows(tableName: string) {
    const { count } = await supabase
      .from(tableName)
      .select("*", { count: "exact", head: true })
      .eq("baustelle_id", baustelleId);

    return count || 0;
  }

  async function checkIfBaustelleHasEntries() {
    const prostorijeCount = await countRows("prostorije");
    const satiCount = await countRows("baustelle_hours");
    const materijalCount = await countRows("material_entries");
    const roomMaterialCount = await countRows("room_material");
    const photosCount = await countRows("room_photos");
    const produktivnostCount = await countRows("produktivnost");

    return (
      prostorijeCount +
        satiCount +
        materijalCount +
        roomMaterialCount +
        photosCount +
        produktivnostCount >
      0
    );
  }

  async function archiveBaustelle() {
    const ok = confirm(
      "Möchten Sie diese Baustelle wirklich abschließen und ins Archiv verschieben?"
    );

    if (!ok) return;

    const { error } = await supabase
      .from("baustellen")
      .update({ status: "Archiv" })
      .eq("id", baustelleId);

    if (error) {
      alert("Fehler beim Archivieren: " + error.message);
      return;
    }

    router.push("/baustellen");
  }

  async function deleteBaustelle() {
    const hasEntries = await checkIfBaustelleHasEntries();

    if (hasEntries && workerRole !== "admin") {
      alert(
        "Diese Baustelle hat Einträge. Nur Admin kann eine Baustelle mit bestehenden Einträgen löschen."
      );
      return;
    }

    const ok = confirm(
      hasEntries
        ? "Diese Baustelle hat Einträge. Möchte der Admin diese Baustelle wirklich dauerhaft löschen?"
        : "Möchten Sie diese leere Baustelle wirklich löschen?"
    );

    if (!ok) return;

    const { error } = await supabase
      .from("baustellen")
      .delete()
      .eq("id", baustelleId);

    if (error) {
      alert("Fehler beim Löschen: " + error.message);
      return;
    }

    router.push("/baustellen");
  }

  const visibleInfoFields = infoFields.filter((field) => info[field.key]);

  if (loading || !baustelle) {
    return (
      <main style={mainStyle}>
        <p>{t.loading}</p>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <Link href="/baustellen" style={backLinkStyle}>
        ← {t.back}
      </Link>

      <h1 style={titleStyle}>{baustelle.naziv || "Baustelle"}</h1>

      <div style={topInfoBoxStyle}>
        <a
          href={info.google_maps || "#"}
          target={info.google_maps ? "_blank" : "_self"}
          onClick={(e) => {
            if (!info.google_maps) {
              e.preventDefault();
              alert("Keine Google Maps Adresse eingetragen.");
            }
          }}
          style={googleButtonStyle}
        >
          <div style={googleIconStyle}>📍</div>
          <div style={googleTitleStyle}>{t.googleLocation}</div>
          <div style={googleSmallTextStyle}>{t.openGoogle}</div>
        </a>

        <a
          href={info.visualization_3d || "#"}
          target={info.visualization_3d ? "_blank" : "_self"}
          onClick={(e) => {
            if (!info.visualization_3d) {
              e.preventDefault();
              alert("Keine 3D Visualisierung eingetragen.");
            }
          }}
          style={visualizationButtonStyle}
        >
          <div style={googleIconStyle}>🏗️</div>
          <div style={googleTitleStyle}>{t.visualization3d}</div>
          <div style={googleSmallTextStyle}>{t.openVisualization3d}</div>
        </a>

        <div style={topDividerStyle} />

        <div style={basicInfoStyle}>
          {baustelle.lokacija && (
            <p>
              <strong>{t.location}:</strong> {baustelle.lokacija}
            </p>
          )}

          <p>
            <strong>{t.status}:</strong>{" "}
            {baustelle.status === "Aktiv" ? t.active : baustelle.status}
          </p>
        </div>
      </div>

      <div style={infoSectionStyle}>
        <div style={infoHeaderStyle}>
          <h2 style={sectionTitleStyle}>ℹ️ {t.siteInfo}</h2>

          {isAdmin && (
            <button onClick={startAddInfo} style={buttonStyle}>
              + {t.addInfo}
            </button>
          )}
        </div>

        {showInfoForm && isAdmin && (
          <div style={infoFormStyle}>
            <select
              value={infoField}
              onChange={(e) => {
                setInfoField(e.target.value);
                setInfoValue(info[e.target.value] || "");
              }}
              disabled={!!editingField}
              style={inputStyle}
            >
              <option value="google_maps">📍 {t.googleLocation}</option>
              <option value="visualization_3d">🏗️ {t.visualization3d}</option>

              {infoFields.map((field) => (
                <option key={field.key} value={field.key}>
                  {field.icon} {getInfoLabel(field.key)}
                </option>
              ))}
            </select>

            <textarea
              value={infoValue}
              onChange={(e) => setInfoValue(e.target.value)}
              placeholder={t.value}
              style={textareaStyle}
            />

            <div style={formButtonsStyle}>
              <button onClick={saveInfoField} style={saveButtonStyle}>
                {t.save}
              </button>

              <button
                onClick={() => {
                  setShowInfoForm(false);
                  setEditingField("");
                  setInfoValue("");
                }}
                style={smallDarkButtonStyle}
              >
                {t.close}
              </button>
            </div>
          </div>
        )}

        {visibleInfoFields.length === 0 ? (
          <p style={emptyInfoStyle}>{t.emptyInfo}</p>
        ) : (
          <div style={infoGridStyle}>
            {visibleInfoFields.map((field) => (
              <div key={field.key} style={infoItemStyle}>
                <div style={infoIconStyle}>{field.icon}</div>

                <div style={infoTextWrapStyle}>
                  <strong>{getInfoLabel(field.key)}</strong>
                  <p style={infoTextStyle}>{info[field.key]}</p>

                  {isAdmin && (
                    <div style={smallActionRowStyle}>
                      <button
                        onClick={() => startEditInfo(field.key)}
                        style={smallEditButtonStyle}
                      >
                        {t.edit}
                      </button>

                      <button
                        onClick={() => deleteInfoField(field.key)}
                        style={smallDeleteButtonStyle}
                      >
                        {t.delete}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={roomsBoxStyle}>
        <h2 style={sectionTitleStyle}>{t.addedRooms}</h2>

        {rooms.length === 0 ? (
          <p style={emptyInfoStyle}>Keine Räume vorhanden.</p>
        ) : (
          <div style={roomListStyle}>
            {rooms.map((room) => (
              <Link
                key={room.id}
                href={`/baustellen/${baustelleId}/prostorije/${room.id}`}
                style={roomBadgeStyle}
              >
                {room.naziv || room.name || "Raum"}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div style={gridStyle}>
        <Link href={`/baustellen/${baustelleId}/prostorije`} style={buttonStyle}>
          {t.addRooms}
        </Link>

        <Link href={`/baustellen/${baustelleId}/pregled`} style={buttonStyle}>
          {t.overview}
        </Link>

        <Link
          href={`/baustellen/${baustelleId}/arbeitsinfo`}
          style={buttonStyle}
        >
          {t.arbeitsinfo}
        </Link>

        <Link
          href={`/baustellen/${baustelleId}/regiebericht`}
          style={buttonStyle}
        >
          {t.regiebericht}
        </Link>
      </div>

      <div style={actionBoxStyle}>
        <button onClick={archiveBaustelle} style={archiveButtonStyle}>
          {t.closeSite}
        </button>

        <button onClick={deleteBaustelle} style={deleteButtonStyle}>
          {t.deleteSite}
        </button>
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

const topInfoBoxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  marginBottom: "25px",
  display: "flex",
  alignItems: "center",
  gap: "30px",
  flexWrap: "wrap",
};

const googleButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  borderRadius: "16px",
  padding: "25px 35px",
  minWidth: "260px",
  textDecoration: "none",
  textAlign: "center",
  fontWeight: "bold",
  display: "block",
};

const visualizationButtonStyle: any = {
  background: "#7c3aed",
  color: "white",
  borderRadius: "16px",
  padding: "25px 35px",
  minWidth: "260px",
  textDecoration: "none",
  textAlign: "center",
  fontWeight: "bold",
  display: "block",
};

const googleIconStyle: any = {
  fontSize: "40px",
  marginBottom: "10px",
};

const googleTitleStyle: any = {
  fontSize: "22px",
  marginBottom: "8px",
};

const googleSmallTextStyle: any = {
  fontSize: "15px",
  opacity: 0.9,
};

const topDividerStyle: any = {
  width: "1px",
  minHeight: "120px",
  background: "#333",
};

const basicInfoStyle: any = {
  lineHeight: "1.7",
  fontSize: "17px",
};

const infoSectionStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  marginBottom: "25px",
};

const infoHeaderStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "15px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const sectionTitleStyle: any = {
  fontSize: "26px",
  fontWeight: "bold",
  marginBottom: "15px",
};

const infoFormStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "20px",
  marginBottom: "20px",
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

const textareaStyle: any = {
  width: "100%",
  minHeight: "120px",
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid #333",
  background: "#1f2937",
  color: "white",
  fontSize: "16px",
  marginBottom: "14px",
  resize: "vertical",
};

const formButtonsStyle: any = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const infoGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "18px",
};

const infoItemStyle: any = {
  display: "flex",
  gap: "14px",
  borderBottom: "1px solid #2a2a2a",
  paddingBottom: "14px",
};

const infoIconStyle: any = {
  fontSize: "28px",
};

const infoTextWrapStyle: any = {
  flex: 1,
};

const infoTextStyle: any = {
  whiteSpace: "pre-wrap",
  lineHeight: "1.5",
  marginTop: "6px",
};

const smallActionRowStyle: any = {
  display: "flex",
  gap: "8px",
  marginTop: "10px",
};

const smallEditButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "7px 10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const smallDeleteButtonStyle: any = {
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "7px 10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const emptyInfoStyle: any = {
  color: "#9ca3af",
};

const roomsBoxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  marginBottom: "25px",
};

const roomListStyle: any = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
};

const roomBadgeStyle: any = {
  background: "#1f2937",
  color: "white",
  padding: "14px 18px",
  borderRadius: "12px",
  textDecoration: "none",
  fontWeight: "bold",
};

const gridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "20px",
  marginBottom: "25px",
};

const buttonStyle: any = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "25px",
  background: "#2563eb",
  color: "white",
  borderRadius: "16px",
  fontSize: "20px",
  fontWeight: "bold",
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
};

const actionBoxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  display: "flex",
  gap: "20px",
  flexWrap: "wrap",
};

const archiveButtonStyle: any = {
  background: "#f97316",
  color: "white",
  padding: "16px 24px",
  border: "none",
  borderRadius: "12px",
  fontSize: "18px",
  fontWeight: "bold",
  cursor: "pointer",
};

const deleteButtonStyle: any = {
  background: "#dc2626",
  color: "white",
  padding: "16px 24px",
  border: "none",
  borderRadius: "12px",
  fontSize: "18px",
  fontWeight: "bold",
  cursor: "pointer",
};

const saveButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  padding: "14px 20px",
  border: "none",
  borderRadius: "12px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const smallDarkButtonStyle: any = {
  background: "#374151",
  color: "white",
  padding: "14px 20px",
  border: "none",
  borderRadius: "12px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};