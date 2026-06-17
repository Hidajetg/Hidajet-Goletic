"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];

export default function ProjektePage() {
  const router = useRouter();

  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projekte, setProjekte] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [auftraggeber, setAuftraggeber] = useState("");
  const [bauleiter, setBauleiter] = useState("");
  const [adresse, setAdresse] = useState("");
  const [ort, setOrt] = useState("");
  const [googleLocation, setGoogleLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("Aktiv");

  useEffect(() => {
    const name = localStorage.getItem("worker_name");

    if (!name) {
      router.push("/login");
      return;
    }

    const adminStatus = ADMINI.includes(name);

    if (!adminStatus) {
      router.push("/");
      return;
    }

    setWorkerName(name);
    setIsAdmin(adminStatus);
    loadProjekte();
  }, [router]);

  async function loadProjekte() {
    setLoading(true);

    const { data, error } = await supabase
      .from("projekte")
      .select("*")
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

  async function createProjekt() {
    if (!projectName.trim()) {
      alert("Unesi naziv projekta.");
      return;
    }

    const { error } = await supabase.from("projekte").insert({
      project_name: projectName.trim(),
      auftraggeber: auftraggeber.trim() || null,
      bauleiter: bauleiter.trim() || null,
      adresse: adresse.trim() || null,
      ort: ort.trim() || null,
      google_location: googleLocation.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      status,
      created_by: workerName,
    });

    if (error) {
      alert("Greška kod kreiranja projekta: " + error.message);
      return;
    }

    setProjectName("");
    setAuftraggeber("");
    setBauleiter("");
    setAdresse("");
    setOrt("");
    setGoogleLocation("");
    setStartDate("");
    setEndDate("");
    setStatus("Aktiv");
    setShowForm(false);

    loadProjekte();
  }

  async function deleteProjekt(id: number) {
    const ok = confirm("Da li sigurno želiš obrisati ovaj projekt?");

    if (!ok) return;

    const { error } = await supabase.from("projekte").delete().eq("id", id);

    if (error) {
      alert("Greška kod brisanja projekta: " + error.message);
      return;
    }

    loadProjekte();
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    return new Date(value).toLocaleDateString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <Link href="/" style={backStyle}>
          ← Zurück
        </Link>

        <h1 style={titleStyle}>📂 Projekte</h1>
        <p style={loadingStyle}>Wird geladen...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main style={mainStyle}>
        <h1 style={titleStyle}>Kein Zugriff</h1>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <div style={topBarStyle}>
        <Link href="/" style={backStyle}>
          ← Dashboard
        </Link>

        <button onClick={() => setShowForm(!showForm)} style={newButtonStyle}>
          {showForm ? "Schließen" : "+ Neues Projekt"}
        </button>
      </div>

      <h1 style={titleStyle}>📂 Projekte</h1>

      <p style={descriptionStyle}>
        Große Baustellen mit LV / Ausschreibung, Soll-Werten, Ist-Werten,
        Aufmaß, Regie und Leistung.
      </p>

      {showForm && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>Neues Projekt erstellen</h2>

          <label style={labelStyle}>Projektname *</label>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="z.B. ARBÖ Tirol"
            style={inputStyle}
          />

          <label style={labelStyle}>Auftraggeber</label>
          <input
            value={auftraggeber}
            onChange={(e) => setAuftraggeber(e.target.value)}
            placeholder="z.B. Ing. Hans Bodner Bauges. mbH & Co KG"
            style={inputStyle}
          />

          <label style={labelStyle}>Bauleiter</label>
          <input
            value={bauleiter}
            onChange={(e) => setBauleiter(e.target.value)}
            placeholder="Name Bauleiter"
            style={inputStyle}
          />

          <label style={labelStyle}>Adresse</label>
          <input
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            placeholder="Straße / Adresse"
            style={inputStyle}
          />

          <label style={labelStyle}>PLZ / Ort</label>
          <input
            value={ort}
            onChange={(e) => setOrt(e.target.value)}
            placeholder="z.B. 1020 Wien"
            style={inputStyle}
          />

          <label style={labelStyle}>Google Standort</label>
          <input
            value={googleLocation}
            onChange={(e) => setGoogleLocation(e.target.value)}
            placeholder="Google Maps Link"
            style={inputStyle}
          />

          <div style={dateGridStyle}>
            <div>
              <label style={labelStyle}>Ausführungsbeginn</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Ausführungsende</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <label style={labelStyle}>Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={inputStyle}
          >
            <option value="Aktiv">Aktiv</option>
            <option value="Geplant">Geplant</option>
            <option value="Pausiert">Pausiert</option>
            <option value="Abgeschlossen">Abgeschlossen</option>
          </select>

          <button onClick={createProjekt} style={saveButtonStyle}>
            Projekt speichern
          </button>
        </section>
      )}

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Projektliste</h2>

        {projekte.length === 0 ? (
          <p style={emptyStyle}>Noch keine Projekte vorhanden.</p>
        ) : (
          <div style={projectGridStyle}>
            {projekte.map((projekt) => (
              <div key={projekt.id} style={projectCardStyle}>
                <div style={cardHeaderStyle}>
                  <h3 style={projectNameStyle}>{projekt.project_name}</h3>

                  <span
                    style={{
                      ...statusStyle,
                      background:
                        projekt.status === "Aktiv"
                          ? "#16a34a"
                          : projekt.status === "Geplant"
                          ? "#2563eb"
                          : projekt.status === "Pausiert"
                          ? "#ca8a04"
                          : "#4b5563",
                    }}
                  >
                    {projekt.status || "Aktiv"}
                  </span>
                </div>

                <div style={infoLineStyle}>
                  <strong>Auftraggeber:</strong>{" "}
                  {projekt.auftraggeber || "-"}
                </div>

                <div style={infoLineStyle}>
                  <strong>Bauleiter:</strong> {projekt.bauleiter || "-"}
                </div>

                <div style={infoLineStyle}>
                  <strong>Adresse:</strong> {projekt.adresse || "-"}
                </div>

                <div style={infoLineStyle}>
                  <strong>Ort:</strong> {projekt.ort || "-"}
                </div>

                <div style={infoLineStyle}>
                  <strong>Beginn:</strong> {formatDate(projekt.start_date)}
                </div>

                <div style={infoLineStyle}>
                  <strong>Ende:</strong> {formatDate(projekt.end_date)}
                </div>

                {projekt.google_location && (
                  <a
                    href={projekt.google_location}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={mapButtonStyle}
                  >
                    📍 Google Standort öffnen
                  </a>
                )}

                <div style={cardButtonRowStyle}>
                  <Link href={`/projekte/${projekt.id}`} style={openButtonStyle}>
                    Öffnen
                  </Link>

                  <button
                    onClick={() => deleteProjekt(projekt.id)}
                    style={deleteButtonStyle}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const mainStyle: any = {
  background: "#000",
  minHeight: "100vh",
  color: "white",
  padding: "20px",
};

const topBarStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "20px",
  flexWrap: "wrap",
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
  margin: "0 0 8px 0",
};

const descriptionStyle: any = {
  color: "#bbb",
  fontSize: "16px",
  marginBottom: "20px",
  maxWidth: "900px",
};

const loadingStyle: any = {
  color: "#aaa",
  fontSize: "18px",
};

const newButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px 18px",
  fontSize: "15px",
  fontWeight: "bold",
  cursor: "pointer",
};

const formBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "24px",
};

const formTitleStyle: any = {
  color: "#f97316",
  marginTop: 0,
  marginBottom: "14px",
};

const labelStyle: any = {
  display: "block",
  color: "#ddd",
  fontWeight: "bold",
  marginBottom: "6px",
  marginTop: "12px",
};

const inputStyle: any = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #333",
  background: "#000",
  color: "white",
  fontSize: "15px",
  boxSizing: "border-box",
};

const dateGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
};

const saveButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "13px 18px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "18px",
  width: "100%",
};

const listBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
};

const sectionTitleStyle: any = {
  color: "#f97316",
  marginTop: 0,
  marginBottom: "14px",
};

const emptyStyle: any = {
  color: "#aaa",
  fontSize: "16px",
};

const projectGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "14px",
};

const projectCardStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "14px",
  padding: "16px",
};

const cardHeaderStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "10px",
  marginBottom: "12px",
};

const projectNameStyle: any = {
  color: "white",
  fontSize: "21px",
  margin: 0,
};

const statusStyle: any = {
  color: "white",
  borderRadius: "999px",
  padding: "5px 10px",
  fontSize: "12px",
  fontWeight: "bold",
  whiteSpace: "nowrap",
};

const infoLineStyle: any = {
  color: "#ccc",
  fontSize: "14px",
  marginBottom: "7px",
};

const mapButtonStyle: any = {
  display: "block",
  background: "#9333ea",
  color: "white",
  textDecoration: "none",
  textAlign: "center",
  borderRadius: "10px",
  padding: "10px",
  fontWeight: "bold",
  marginTop: "12px",
};

const cardButtonRowStyle: any = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "12px",
};

const openButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "10px",
  fontWeight: "bold",
  cursor: "pointer",
  textAlign: "center",
  textDecoration: "none",
  display: "block",
};

const deleteButtonStyle: any = {
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};