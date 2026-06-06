"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const translations: any = {
  de: {
    back: "Zurück zur Baustelle",
    title: "Baustelle Info",
    google: "Google Maps Standort",
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
    edit: "Bearbeiten",
    save: "Speichern",
    close: "Schließen",
    empty: "Keine Information eingetragen.",
  },
  ba: {
    back: "Nazad na Baustelle",
    title: "Info Baustelle",
    google: "Google Maps lokacija",
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
    edit: "Uredi",
    save: "Sačuvaj",
    close: "Zatvori",
    empty: "Nema unesene informacije.",
  },
  en: {
    back: "Back to site",
    title: "Site Info",
    google: "Google Maps location",
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
    edit: "Edit",
    save: "Save",
    close: "Close",
    empty: "No information entered.",
  },
  uz: {
    back: "Obyektga qaytish",
    title: "Obyekt ma’lumoti",
    google: "Google Maps manzil",
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
    edit: "Tahrirlash",
    save: "Saqlash",
    close: "Yopish",
    empty: "Ma’lumot kiritilmagan.",
  },
};

export default function BaustelleInfoPage() {
  const params = useParams();
  const baustelleId = String(params.id);

  const [lang, setLang] = useState("de");
  const [workerRole, setWorkerRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const [info, setInfo] = useState<any>({
    google_maps: "",
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
  });

  const t = translations[lang] || translations.de;
  const isAdmin = workerRole === "admin";

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") || "de";
    const role = localStorage.getItem("worker_role") || "worker";

    setLang(savedLang);
    setWorkerRole(role);
    loadInfo();
  }, []);

  async function loadInfo() {
    setLoading(true);

    const { data, error } = await supabase
      .from("baustelle_info")
      .select("*")
      .eq("baustelle_id", baustelleId)
      .maybeSingle();

    if (error) {
      alert("Fehler beim Laden: " + error.message);
      setLoading(false);
      return;
    }

    if (data) {
      setInfo(data);
    }

    setLoading(false);
  }

  function updateField(field: string, value: string) {
    setInfo({ ...info, [field]: value });
  }

  async function saveInfo() {
    const payload = {
      baustelle_id: Number(baustelleId),
      google_maps: info.google_maps || "",
      ansprechpartner: info.ansprechpartner || "",
      zugang: info.zugang || "",
      parking: info.parking || "",
      schluessel: info.schluessel || "",
      wc: info.wc || "",
      strom: info.strom || "",
      wasser: info.wasser || "",
      lift: info.lift || "",
      arbeitszeit: info.arbeitszeit || "",
      telefone: info.telefone || "",
      notizen: info.notizen || "",
    };

    const { error } = await supabase
      .from("baustelle_info")
      .upsert(payload, { onConflict: "baustelle_id" });

    if (error) {
      alert("Fehler beim Speichern: " + error.message);
      return;
    }

    setEditMode(false);
    loadInfo();
  }

  function renderField(icon: string, label: string, field: string, multiline = false) {
    const value = info[field] || "";

    return (
      <div style={fieldCardStyle}>
        <h3 style={fieldTitleStyle}>
          {icon} {label}
        </h3>

        {editMode && isAdmin ? (
          multiline ? (
            <textarea
              value={value}
              onChange={(e) => updateField(field, e.target.value)}
              style={textareaStyle}
            />
          ) : (
            <input
              value={value}
              onChange={(e) => updateField(field, e.target.value)}
              style={inputStyle}
            />
          )
        ) : field === "google_maps" && value ? (
          <a href={value} target="_blank" style={linkStyle}>
            Google Maps öffnen
          </a>
        ) : value ? (
          <p style={textStyle}>{value}</p>
        ) : (
          <p style={emptyStyle}>{t.empty}</p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <p>Wird geladen...</p>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <Link href={`/baustellen/${baustelleId}`} style={backStyle}>
        ← {t.back}
      </Link>

      <div style={headerStyle}>
        <h1 style={titleStyle}>ℹ️ {t.title}</h1>

        {isAdmin && (
          <button
            onClick={() => (editMode ? setEditMode(false) : setEditMode(true))}
            style={editButtonStyle}
          >
            {editMode ? t.close : t.edit}
          </button>
        )}
      </div>

      <div style={gridStyle}>
        {renderField("📍", t.google, "google_maps")}
        {renderField("👷", t.ansprechpartner, "ansprechpartner", true)}
        {renderField("🚪", t.zugang, "zugang", true)}
        {renderField("🚗", t.parking, "parking", true)}
        {renderField("🔑", t.schluessel, "schluessel", true)}
        {renderField("🚾", t.wc, "wc", true)}
        {renderField("⚡", t.strom, "strom", true)}
        {renderField("💧", t.wasser, "wasser", true)}
        {renderField("🛗", t.lift, "lift", true)}
        {renderField("⏰", t.arbeitszeit, "arbeitszeit", true)}
        {renderField("📞", t.telefone, "telefone", true)}
        {renderField("📝", t.notizen, "notizen", true)}
      </div>

      {editMode && isAdmin && (
        <button onClick={saveInfo} style={saveButtonStyle}>
          {t.save}
        </button>
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

const backStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "18px",
};

const headerStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
  marginTop: "25px",
  marginBottom: "30px",
};

const titleStyle: any = {
  fontSize: "52px",
  fontWeight: "bold",
};

const gridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "20px",
};

const fieldCardStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "18px",
  padding: "22px",
};

const fieldTitleStyle: any = {
  fontSize: "21px",
  fontWeight: "bold",
  marginBottom: "14px",
  color: "#93c5fd",
};

const textStyle: any = {
  whiteSpace: "pre-wrap",
  lineHeight: "1.6",
  fontSize: "17px",
};

const emptyStyle: any = {
  color: "#777",
  fontSize: "16px",
};

const inputStyle: any = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid #444",
  background: "#000",
  color: "white",
  fontSize: "16px",
};

const textareaStyle: any = {
  width: "100%",
  minHeight: "110px",
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid #444",
  background: "#000",
  color: "white",
  fontSize: "16px",
  resize: "vertical",
};

const editButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "14px 22px",
  fontSize: "17px",
  fontWeight: "bold",
  cursor: "pointer",
};

const saveButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "16px 26px",
  fontSize: "18px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "30px",
};

const linkStyle: any = {
  color: "#60a5fa",
  fontWeight: "bold",
  fontSize: "17px",
};