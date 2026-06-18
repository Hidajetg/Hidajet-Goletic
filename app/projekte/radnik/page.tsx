"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const translations: any = {
  de: {
    back: "← Zurück",
    title: "👷 Meine Projekte",
    loggedAs: "Eingeloggt als",
    searchLabel: "Projekt suchen",
    searchPlaceholder: "Projekt, Ort oder Auftraggeber suchen...",
    noProjectsTitle: "Keine aktiven Projekte",
    noProjectsText: "Aktuell gibt es keine aktiven Projekte.",
    client: "Auftraggeber",
    manager: "Bauleiter",
    place: "Ort",
    execution: "Ausführung",
    open: "Öffnen →",
    loading: "Wird geladen...",
    planned: "Geplant",
    active: "Aktiv",
  },
  ba: {
    back: "← Nazad",
    title: "👷 Moji projekti",
    loggedAs: "Prijavljen kao",
    searchLabel: "Pretraži projekt",
    searchPlaceholder: "Traži projekt, mjesto ili Auftraggeber...",
    noProjectsTitle: "Nema aktivnih projekata",
    noProjectsText: "Trenutno nema aktivnih projekata.",
    client: "Auftraggeber",
    manager: "Bauleiter",
    place: "Mjesto",
    execution: "Izvođenje",
    open: "Otvori →",
    loading: "Učitava se...",
    planned: "Planirano",
    active: "Aktivno",
  },
  uz: {
    back: "← Orqaga",
    title: "👷 Mening loyihalarim",
    loggedAs: "Kirdi",
    searchLabel: "Loyiha qidirish",
    searchPlaceholder: "Loyiha, joy yoki Auftraggeber qidirish...",
    noProjectsTitle: "Aktiv loyihalar yo‘q",
    noProjectsText: "Hozircha aktiv loyihalar yo‘q.",
    client: "Buyurtmachi",
    manager: "Bauleiter",
    place: "Joy",
    execution: "Bajarish vaqti",
    open: "Ochish →",
    loading: "Yuklanmoqda...",
    planned: "Rejada",
    active: "Aktiv",
  },
  en: {
    back: "← Back",
    title: "👷 My projects",
    loggedAs: "Logged in as",
    searchLabel: "Search project",
    searchPlaceholder: "Search project, place or client...",
    noProjectsTitle: "No active projects",
    noProjectsText: "There are currently no active projects.",
    client: "Client",
    manager: "Site manager",
    place: "Place",
    execution: "Execution",
    open: "Open →",
    loading: "Loading...",
    planned: "Planned",
    active: "Active",
  },
};

export default function RadnikProjektePage() {
  const router = useRouter();

  const [workerName, setWorkerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [projekte, setProjekte] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [lang, setLang] = useState("ba");

  const t = translations[lang] || translations.ba;

  const filteredProjekte = useMemo(() => {
    const s = search.toLowerCase().trim();

    if (!s) return projekte;

    return projekte.filter((p) => {
      return (
        String(p.project_name || "").toLowerCase().includes(s) ||
        String(p.ort || "").toLowerCase().includes(s) ||
        String(p.auftraggeber || "").toLowerCase().includes(s)
      );
    });
  }, [projekte, search]);

  useEffect(() => {
    const name = localStorage.getItem("worker_name");
    const savedLang = localStorage.getItem("lang") || "ba";

    if (!name) {
      router.push("/login");
      return;
    }

    setWorkerName(name);
    setLang(savedLang);
    loadProjekte();
  }, [router]);

  async function loadProjekte() {
    setLoading(true);

    const { data, error } = await supabase
      .from("projekte")
      .select("*")
      .in("status", ["Aktiv", "Geplant"])
      .order("created_at", { ascending: false });

    if (error) {
      alert("Greška kod učitavanja projekata: " + error.message);
      setProjekte([]);
      setLoading(false);
      return;
    }

    setProjekte(data || []);
    setLoading(false);
  }

  function changeLanguage(newLang: string) {
    localStorage.setItem("lang", newLang);
    setLang(newLang);
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    const parts = String(value).split("-");
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }

    return value;
  }

  function statusLabel(status: string) {
    if (status === "Geplant") return t.planned;
    if (status === "Aktiv") return t.active;

    return status || t.active;
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <Link href="/dashboard" style={backStyle}>
          {t.back}
        </Link>

        <h1 style={titleStyle}>{t.title}</h1>
        <p style={loadingStyle}>{t.loading}</p>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <Link href="/dashboard" style={backStyle}>
        {t.back}
      </Link>

      <h1 style={titleStyle}>{t.title}</h1>

      <p style={descriptionStyle}>
        {t.loggedAs}: <strong>{workerName}</strong>
      </p>

      <div style={languageBoxStyle}>
        {["de", "ba", "uz", "en"].map((code) => (
          <button
            key={code}
            onClick={() => changeLanguage(code)}
            style={lang === code ? activeLangButtonStyle : langButtonStyle}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>

      <section style={searchBoxStyle}>
        <label style={labelStyle}>{t.searchLabel}</label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.searchPlaceholder}
          style={inputStyle}
        />
      </section>

      {filteredProjekte.length === 0 ? (
        <section style={emptyBoxStyle}>
          <h2 style={sectionTitleStyle}>{t.noProjectsTitle}</h2>
          <p style={emptyTextStyle}>{t.noProjectsText}</p>
        </section>
      ) : (
        <section style={gridStyle}>
          {filteredProjekte.map((projekt) => (
            <Link
              key={projekt.id}
              href={`/projekte/radnik/${projekt.id}`}
              style={cardStyle}
            >
              <div style={cardTopStyle}>
                <span style={iconStyle}>📂</span>

                <span
                  style={{
                    ...statusStyle,
                    background:
                      projekt.status === "Aktiv" ? "#16a34a" : "#2563eb",
                  }}
                >
                  {statusLabel(projekt.status)}
                </span>
              </div>

              <h2 style={cardTitleStyle}>{projekt.project_name}</h2>

              <p style={metaStyle}>
                {t.client}: <strong>{projekt.auftraggeber || "-"}</strong>
              </p>

              <p style={metaStyle}>
                {t.manager}: <strong>{projekt.bauleiter || "-"}</strong>
              </p>

              <p style={metaStyle}>
                {t.place}: <strong>{projekt.ort || "-"}</strong>
              </p>

              <p style={metaStyle}>
                {t.execution}:{" "}
                <strong>
                  {formatDate(projekt.start_date)} - {formatDate(projekt.end_date)}
                </strong>
              </p>

              <div style={openButtonStyle}>{t.open}</div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}

const mainStyle: any = {
  background: "#000",
  minHeight: "100vh",
  color: "white",
  padding: "20px",
};

const backStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "16px",
};

const titleStyle: any = {
  fontSize: "38px",
  color: "#f97316",
  margin: "20px 0 10px 0",
};

const descriptionStyle: any = {
  color: "#bbb",
  fontSize: "16px",
  marginBottom: "14px",
};

const loadingStyle: any = {
  color: "#aaa",
  fontSize: "18px",
};

const languageBoxStyle: any = {
  display: "flex",
  gap: "8px",
  marginBottom: "18px",
  flexWrap: "wrap",
};

const langButtonStyle: any = {
  background: "#111",
  color: "white",
  border: "1px solid #333",
  borderRadius: "9px",
  padding: "7px 13px",
  fontSize: "13px",
  fontWeight: "bold",
  cursor: "pointer",
};

const activeLangButtonStyle: any = {
  ...langButtonStyle,
  background: "#f97316",
  border: "1px solid #f97316",
};

const searchBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "16px",
  marginBottom: "20px",
};

const labelStyle: any = {
  display: "block",
  color: "#ddd",
  fontWeight: "bold",
  marginBottom: "8px",
};

const inputStyle: any = {
  width: "100%",
  padding: "13px",
  borderRadius: "10px",
  border: "1px solid #333",
  background: "#000",
  color: "white",
  fontSize: "16px",
  boxSizing: "border-box",
};

const gridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
  gap: "16px",
};

const cardStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "18px",
  padding: "18px",
  color: "white",
  textDecoration: "none",
};

const cardTopStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "12px",
};

const iconStyle: any = {
  fontSize: "36px",
};

const statusStyle: any = {
  color: "white",
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: "bold",
};

const cardTitleStyle: any = {
  color: "#f97316",
  fontSize: "22px",
  margin: "0 0 14px 0",
};

const metaStyle: any = {
  color: "#ccc",
  fontSize: "14px",
  margin: "7px 0",
};

const openButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  borderRadius: "12px",
  padding: "11px",
  textAlign: "center",
  fontWeight: "bold",
  marginTop: "16px",
};

const emptyBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
};

const sectionTitleStyle: any = {
  color: "#f97316",
  marginTop: 0,
};

const emptyTextStyle: any = {
  color: "#aaa",
};