"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];
const BUCKET = "projekt-fotos";

function getTodayLocalDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function ProjektFotosPage() {
  const params = useParams();
  const router = useRouter();

  const projektId = String(params.id);
  const uploadLockRef = useRef(false);

  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(Date.now());

  const [projekt, setProjekt] = useState<any>(null);
  const [raeume, setRaeume] = useState<any[]>([]);
  const [positionen, setPositionen] = useState<any[]>([]);
  const [fotos, setFotos] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [datum, setDatum] = useState(getTodayLocalDate());
  const [selectedRaumId, setSelectedRaumId] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [typ, setTyp] = useState("Fortschritt");
  const [titel, setTitel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [freigabeStatus, setFreigabeStatus] = useState("Wartet");

  const [filterTyp, setFilterTyp] = useState("Alle");
  const [filterStatus, setFilterStatus] = useState("Alle");
  const [filterDatum, setFilterDatum] = useState("");

  const summary = useMemo(() => {
    const fortschritt = fotos.filter((f) => f.typ === "Fortschritt").length;
    const mangel = fotos.filter((f) => f.typ === "Mangel").length;
    const vorher = fotos.filter((f) => f.typ === "Vorher").length;
    const nachher = fotos.filter((f) => f.typ === "Nachher").length;
    const nachweis = fotos.filter((f) => f.typ === "Nachweis").length;

    const wartet = fotos.filter((f) => (f.freigabe_status || "Wartet") === "Wartet").length;
    const genehmigt = fotos.filter((f) => f.freigabe_status === "Genehmigt").length;
    const abgelehnt = fotos.filter((f) => f.freigabe_status === "Abgelehnt").length;

    return {
      total: fotos.length,
      fortschritt,
      mangel,
      vorher,
      nachher,
      nachweis,
      wartet,
      genehmigt,
      abgelehnt,
    };
  }, [fotos]);

  const filteredFotos = useMemo(() => {
    return fotos
      .filter((foto) => {
        if (filterTyp !== "Alle" && foto.typ !== filterTyp) return false;

        const status = foto.freigabe_status || "Wartet";
        if (filterStatus !== "Alle" && status !== filterStatus) return false;

        if (filterDatum && foto.datum !== filterDatum) return false;

        return true;
      })
      .sort((a, b) => {
        const dateA = String(a.datum || "");
        const dateB = String(b.datum || "");

        if (dateA !== dateB) return dateB.localeCompare(dateA);

        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;

        return timeB - timeA;
      });
  }, [fotos, filterTyp, filterStatus, filterDatum]);

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
    loadData();
  }, [router, projektId]);

  async function loadData() {
    setLoading(true);

    const projektRes = await supabase
      .from("projekte")
      .select("*")
      .eq("id", Number(projektId))
      .single();

    if (projektRes.error) {
      alert("Greška kod učitavanja projekta: " + projektRes.error.message);
      setLoading(false);
      return;
    }

    setProjekt(projektRes.data);

    const raeumeRes = await supabase
      .from("projekt_raeume")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("created_at", { ascending: true });

    if (raeumeRes.error) {
      alert("Greška kod učitavanja prostorija: " + raeumeRes.error.message);
      setRaeume([]);
      setLoading(false);
      return;
    }

    setRaeume(raeumeRes.data || []);

    const positionenRes = await supabase
      .from("projekt_lv_positionen")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .eq("aktiv", true)
      .order("position_nr", { ascending: true });

    if (positionenRes.error) {
      alert("Greška kod učitavanja LV pozicija: " + positionenRes.error.message);
      setPositionen([]);
      setLoading(false);
      return;
    }

    setPositionen(positionenRes.data || []);

    const fotosRes = await supabase
      .from("projekt_fotos")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("datum", { ascending: false })
      .order("created_at", { ascending: false });

    if (fotosRes.error) {
      alert("Greška kod učitavanja slika: " + fotosRes.error.message);
      setFotos([]);
      setLoading(false);
      return;
    }

    setFotos(fotosRes.data || []);
    setLoading(false);
  }

  function clearForm() {
    setEditingId(null);
    setDatum(getTodayLocalDate());
    setSelectedRaumId("");
    setSelectedPositionId("");
    setTyp("Fortschritt");
    setTitel("");
    setBeschreibung("");
    setFile(null);
    setFreigabeStatus("Wartet");
    setFileInputKey(Date.now());
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    const parts = String(value).slice(0, 10).split("-");
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }

    return value;
  }

  function formatDateTime(value: string | null) {
    if (!value) return "-";

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
      return String(value);
    }

    return d.toLocaleString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getRaumName(id: number | string | null) {
    if (!id) return "-";

    const raum = raeume.find((r) => Number(r.id) === Number(id));

    if (!raum) return "-";

    return `${raum.ebene ? raum.ebene + " - " : ""}${raum.raum_name}`;
  }

  function getPositionText(id: number | string | null) {
    if (!id) return "-";

    const pos = positionen.find((p) => Number(p.id) === Number(id));

    if (!pos) return "-";

    return `${pos.position_nr} - ${pos.kurztext}`;
  }

  function getSafeFileName(originalName: string) {
    const ext = originalName.split(".").pop() || "jpg";
    const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "jpg";
    const random = Math.random().toString(36).slice(2);

    return `${Date.now()}-${random}.${cleanExt}`;
  }

  function validateImageFile(selectedFile: File) {
    if (!selectedFile.type.startsWith("image/")) {
      alert("Odaberi sliku.");
      return false;
    }

    const maxSizeMb = 15;
    const maxSize = maxSizeMb * 1024 * 1024;

    if (selectedFile.size > maxSize) {
      alert(`Slika je prevelika. Maksimalno ${maxSizeMb} MB.`);
      return false;
    }

    return true;
  }

  async function uploadFoto() {
    if (uploadLockRef.current) return;

    if (!editingId && !file) {
      alert("Odaberi sliku.");
      return;
    }

    if (file && !validateImageFile(file)) return;

    if (!datum) {
      alert("Odaberi datum.");
      return;
    }

    if (!titel.trim()) {
      alert("Unesi naslov slike.");
      return;
    }

    uploadLockRef.current = true;
    setUploading(true);

    let fotoUrl = "";
    let storagePath = "";
    let uploadedNewFile = false;

    try {
      if (file) {
        const safeName = getSafeFileName(file.name);
        storagePath = `${projektId}/${safeName}`;

        const uploadRes = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadRes.error) {
          alert("Greška kod upload slike: " + uploadRes.error.message);
          uploadLockRef.current = false;
          setUploading(false);
          return;
        }

        uploadedNewFile = true;

        const publicUrlRes = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
        fotoUrl = publicUrlRes.data.publicUrl;
      }

      const payload: any = {
        projekt_id: Number(projektId),
        datum,
        raum_id: selectedRaumId ? Number(selectedRaumId) : null,
        lv_position_id: selectedPositionId ? Number(selectedPositionId) : null,
        titel: titel.trim(),
        beschreibung: beschreibung.trim() || null,
        typ,
        freigabe_status: freigabeStatus,
      };

      if (file) {
        payload.foto_url = fotoUrl;
        payload.storage_path = storagePath;
      }

      if (editingId) {
        const oldFoto = fotos.find((f) => Number(f.id) === Number(editingId));

        const { error } = await supabase
          .from("projekt_fotos")
          .update(payload)
          .eq("id", editingId);

        if (error) {
          if (uploadedNewFile && storagePath) {
            await supabase.storage.from(BUCKET).remove([storagePath]);
          }

          alert("Greška kod izmjene slike: " + error.message);
          uploadLockRef.current = false;
          setUploading(false);
          return;
        }

        if (file && oldFoto?.storage_path && oldFoto.storage_path !== storagePath) {
          await supabase.storage.from(BUCKET).remove([oldFoto.storage_path]);
        }
      } else {
        payload.created_by = workerName;

        const { error } = await supabase.from("projekt_fotos").insert(payload);

        if (error) {
          if (uploadedNewFile && storagePath) {
            await supabase.storage.from(BUCKET).remove([storagePath]);
          }

          alert("Greška kod dodavanja slike: " + error.message);
          uploadLockRef.current = false;
          setUploading(false);
          return;
        }
      }

      clearForm();
      setShowForm(false);
      await loadData();
    } finally {
      uploadLockRef.current = false;
      setUploading(false);
    }
  }

  function editFoto(item: any) {
    setEditingId(item.id);
    setDatum(item.datum || getTodayLocalDate());
    setSelectedRaumId(item.raum_id ? String(item.raum_id) : "");
    setSelectedPositionId(item.lv_position_id ? String(item.lv_position_id) : "");
    setTyp(item.typ || "Fortschritt");
    setTitel(item.titel || "");
    setBeschreibung(item.beschreibung || "");
    setFreigabeStatus(item.freigabe_status || "Wartet");
    setFile(null);
    setFileInputKey(Date.now());
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteFoto(item: any) {
    const ok = confirm("Da li sigurno želiš obrisati ovu sliku?");

    if (!ok) return;

    if (item.storage_path) {
      await supabase.storage.from(BUCKET).remove([item.storage_path]);
    }

    const { error } = await supabase
      .from("projekt_fotos")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert("Greška kod brisanja slike: " + error.message);
      return;
    }

    loadData();
  }

  async function changeStatus(item: any, newStatus: string) {
    const { error } = await supabase
      .from("projekt_fotos")
      .update({ freigabe_status: newStatus })
      .eq("id", item.id);

    if (error) {
      alert("Greška kod promjene statusa: " + error.message);
      return;
    }

    loadData();
  }

  function getTypeBadgeStyle(typeValue: string) {
    if (typeValue === "Mangel") return dangerBadgeStyle;
    if (typeValue === "Nachher") return okBadgeStyle;
    if (typeValue === "Vorher") return blueBadgeStyle;
    if (typeValue === "Nachweis") return purpleBadgeStyle;

    return warningBadgeStyle;
  }

  function getStatusBadgeStyle(statusValue: string) {
    if (statusValue === "Genehmigt") return okBadgeStyle;
    if (statusValue === "Abgelehnt") return dangerBadgeStyle;

    return waitBadgeStyle;
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <h1 style={titleStyle}>📸 Fotos</h1>
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
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <div style={topButtonWrapStyle}>
          <button onClick={loadData} style={refreshButtonStyle}>
            Aktualisieren
          </button>

          <button
            onClick={() => {
              clearForm();
              setShowForm(!showForm);
            }}
            disabled={uploading}
            style={newButtonStyle}
          >
            {showForm ? "Schließen" : "+ Foto"}
          </button>
        </div>
      </div>

      <h1 style={titleStyle}>📸 Fotos / Dokumentation</h1>

      <p style={descriptionStyle}>
        Projekt: <strong>{projekt?.project_name || "-"}</strong> · Admin:{" "}
        <strong>{workerName}</strong>
      </p>

      <section style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Alle Fotos</span>
          <strong style={summaryValueStyle}>{summary.total}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Wartet</span>
          <strong style={{ ...summaryValueStyle, color: "#facc15" }}>
            {summary.wartet}
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Genehmigt</span>
          <strong style={{ ...summaryValueStyle, color: "#22c55e" }}>
            {summary.genehmigt}
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Abgelehnt</span>
          <strong style={{ ...summaryValueStyle, color: "#ef4444" }}>
            {summary.abgelehnt}
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Fortschritt</span>
          <strong style={summaryValueStyle}>{summary.fortschritt}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Mangel</span>
          <strong style={summaryValueStyle}>{summary.mangel}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Vorher / Nachher</span>
          <strong style={summaryValueStyle}>
            {summary.vorher + summary.nachher}
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Nachweis</span>
          <strong style={summaryValueStyle}>{summary.nachweis}</strong>
        </div>
      </section>

      <section style={filterBoxStyle}>
        <div style={filterGridStyle}>
          <div>
            <label style={labelStyle}>Typ Filter</label>
            <select
              value={filterTyp}
              onChange={(e) => setFilterTyp(e.target.value)}
              style={inputStyle}
            >
              <option value="Alle">Alle</option>
              <option value="Fortschritt">Fortschritt</option>
              <option value="Mangel">Mangel</option>
              <option value="Nachweis">Nachweis</option>
              <option value="Vorher">Vorher</option>
              <option value="Nachher">Nachher</option>
              <option value="Sonstiges">Sonstiges</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Status Filter</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={inputStyle}
            >
              <option value="Alle">Alle</option>
              <option value="Wartet">Wartet</option>
              <option value="Genehmigt">Genehmigt</option>
              <option value="Abgelehnt">Abgelehnt</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Datum Filter</label>
            <input
              type="date"
              value={filterDatum}
              onChange={(e) => setFilterDatum(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button
            onClick={() => {
              setFilterTyp("Alle");
              setFilterStatus("Alle");
              setFilterDatum("");
            }}
            style={grayButtonStyle}
          >
            Filter löschen
          </button>
        </div>
      </section>

      <section style={infoBoxStyle}>
        <h2 style={sectionTitleStyle}>Foto Regel</h2>
        <p style={infoTextStyle}>
          Svaka slika može biti povezana sa prostorijom i LV pozicijom. Za
          nedostatke koristi tip <strong>Mangel</strong>, za dokaz koristi{" "}
          <strong>Nachweis</strong>, a za dokumentaciju napretka koristi{" "}
          <strong>Fortschritt</strong>.
        </p>
      </section>

      {showForm && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>
            {editingId ? "Foto bearbeiten" : "Foto hochladen"}
          </h2>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Datum *</label>
              <input
                type="date"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Typ</label>
              <select
                value={typ}
                onChange={(e) => setTyp(e.target.value)}
                style={inputStyle}
              >
                <option value="Fortschritt">Fortschritt</option>
                <option value="Mangel">Mangel</option>
                <option value="Nachweis">Nachweis</option>
                <option value="Vorher">Vorher</option>
                <option value="Nachher">Nachher</option>
                <option value="Sonstiges">Sonstiges</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={freigabeStatus}
                onChange={(e) => setFreigabeStatus(e.target.value)}
                style={inputStyle}
              >
                <option value="Wartet">Wartet</option>
                <option value="Genehmigt">Genehmigt</option>
                <option value="Abgelehnt">Abgelehnt</option>
              </select>
            </div>
          </div>

          <label style={labelStyle}>Titel *</label>
          <input
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="z.B. Bad EG Abdichtung fertig"
            style={inputStyle}
          />

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Raum</label>
              <select
                value={selectedRaumId}
                onChange={(e) => setSelectedRaumId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Ohne Raum</option>
                {raeume.map((raum) => (
                  <option key={raum.id} value={raum.id}>
                    {raum.ebene ? `${raum.ebene} - ` : ""}
                    {raum.raum_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>LV Position</label>
              <select
                value={selectedPositionId}
                onChange={(e) => setSelectedPositionId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Ohne LV Position</option>
                {positionen.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.position_nr} - {pos.kurztext}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label style={labelStyle}>Beschreibung</label>
          <textarea
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
            placeholder="Opis slike"
            style={textareaStyle}
          />

          <label style={labelStyle}>
            Foto {editingId ? "(leer lassen wenn Bild gleich bleibt)" : "*"}
          </label>
          <input
            key={fileInputKey}
            type="file"
            accept="image/*"
            capture="environment"
            disabled={uploading}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={fileInputStyle}
          />

          {file && (
            <p style={selectedFileStyle}>
              Odabrano: <strong>{file.name}</strong>
            </p>
          )}

          <div style={formButtonRowStyle}>
            <button
              onClick={uploadFoto}
              disabled={uploading}
              style={{
                ...saveButtonStyle,
                opacity: uploading ? 0.5 : 1,
                cursor: uploading ? "not-allowed" : "pointer",
              }}
            >
              {uploading
                ? "Speichern..."
                : editingId
                ? "Änderungen speichern"
                : "Foto speichern"}
            </button>

            <button
              onClick={() => {
                clearForm();
                setShowForm(false);
              }}
              disabled={uploading}
              style={cancelButtonStyle}
            >
              Abbrechen
            </button>
          </div>
        </section>
      )}

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Foto Galerie</h2>

        {filteredFotos.length === 0 ? (
          <p style={emptyStyle}>Keine Fotos gefunden.</p>
        ) : (
          <div style={photoGridStyle}>
            {filteredFotos.map((foto) => {
              const statusValue = foto.freigabe_status || "Wartet";

              return (
                <div key={foto.id} style={photoCardStyle}>
                  <a href={foto.foto_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={foto.foto_url}
                      alt={foto.titel || "Foto"}
                      style={photoStyle}
                    />
                  </a>

                  <div style={photoBodyStyle}>
                    <div style={photoTopRowStyle}>
                      <span style={getTypeBadgeStyle(foto.typ || "Fortschritt")}>
                        {foto.typ || "Fortschritt"}
                      </span>

                      <span style={getStatusBadgeStyle(statusValue)}>
                        {statusValue}
                      </span>
                    </div>

                    <h3 style={photoTitleStyle}>{foto.titel || "-"}</h3>

                    <p style={photoMetaStyle}>
                      Datum: <strong>{formatDate(foto.datum)}</strong>
                    </p>

                    <p style={photoMetaStyle}>
                      Raum: <strong>{getRaumName(foto.raum_id)}</strong>
                    </p>

                    <p style={photoMetaStyle}>
                      LV: <strong>{getPositionText(foto.lv_position_id)}</strong>
                    </p>

                    <p style={photoMetaStyle}>
                      Erstellt von: <strong>{foto.created_by || "-"}</strong>
                    </p>

                    {isAdmin && (
                      <p style={photoMetaStyle}>
                        Zeit der Eingabe:{" "}
                        <strong>{formatDateTime(foto.created_at)}</strong>
                      </p>
                    )}

                    {foto.beschreibung && (
                      <p style={photoDescriptionStyle}>{foto.beschreibung}</p>
                    )}

                    <div style={quickStatusGridStyle}>
                      <button
                        onClick={() => changeStatus(foto, "Genehmigt")}
                        style={approveButtonStyle}
                      >
                        Genehmigen
                      </button>

                      <button
                        onClick={() => changeStatus(foto, "Abgelehnt")}
                        style={rejectButtonStyle}
                      >
                        Ablehnen
                      </button>

                      <button
                        onClick={() => changeStatus(foto, "Wartet")}
                        style={waitButtonStyle}
                      >
                        Wartet
                      </button>
                    </div>

                    <div style={actionRowStyle}>
                      <button onClick={() => editFoto(foto)} style={editButtonStyle}>
                        Bearbeiten
                      </button>

                      <button
                        onClick={() => deleteFoto(foto)}
                        style={deleteButtonStyle}
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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

const topButtonWrapStyle: any = {
  display: "flex",
  gap: "10px",
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
  margin: "0 0 10px 0",
};

const descriptionStyle: any = {
  color: "#bbb",
  fontSize: "16px",
  marginBottom: "18px",
};

const loadingStyle: any = {
  color: "#aaa",
  fontSize: "18px",
};

const refreshButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px 18px",
  fontSize: "15px",
  fontWeight: "bold",
  cursor: "pointer",
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

const summaryGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
  gap: "12px",
  marginBottom: "20px",
};

const summaryCardStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "14px",
  padding: "14px",
};

const summaryLabelStyle: any = {
  display: "block",
  color: "#aaa",
  fontSize: "13px",
  marginBottom: "6px",
};

const summaryValueStyle: any = {
  color: "#f97316",
  fontSize: "22px",
};

const filterBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "20px",
};

const filterGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "12px",
  alignItems: "end",
};

const infoBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "20px",
};

const infoTextStyle: any = {
  color: "#ccc",
  margin: 0,
  lineHeight: "1.5",
};

const formBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "22px",
};

const formTitleStyle: any = {
  color: "#f97316",
  marginTop: 0,
  marginBottom: "14px",
};

const sectionTitleStyle: any = {
  color: "#f97316",
  marginTop: 0,
  marginBottom: "14px",
};

const formGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
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

const textareaStyle: any = {
  ...inputStyle,
  minHeight: "95px",
  resize: "vertical",
};

const fileInputStyle: any = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid #333",
  background: "#000",
  color: "white",
  boxSizing: "border-box",
  fontSize: "15px",
};

const selectedFileStyle: any = {
  color: "#bbb",
  fontSize: "13px",
  margin: "8px 0 0 0",
};

const formButtonRowStyle: any = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginTop: "18px",
};

const saveButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "13px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const cancelButtonStyle: any = {
  background: "#4b5563",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "13px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const grayButtonStyle: any = {
  background: "#4b5563",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px",
  fontWeight: "bold",
  cursor: "pointer",
};

const listBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "22px",
};

const emptyStyle: any = {
  color: "#aaa",
  fontSize: "16px",
};

const photoGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "16px",
};

const photoCardStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "16px",
  overflow: "hidden",
};

const photoStyle: any = {
  width: "100%",
  height: "220px",
  objectFit: "cover",
  display: "block",
  background: "#111",
};

const photoBodyStyle: any = {
  padding: "14px",
};

const photoTopRowStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  marginBottom: "10px",
  flexWrap: "wrap",
};

const photoTitleStyle: any = {
  color: "#f97316",
  margin: "0 0 10px 0",
  fontSize: "18px",
};

const photoMetaStyle: any = {
  color: "#ccc",
  fontSize: "13px",
  margin: "5px 0",
};

const photoDescriptionStyle: any = {
  color: "#aaa",
  fontSize: "13px",
  lineHeight: "1.4",
  marginTop: "10px",
};

const quickStatusGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "8px",
  marginTop: "12px",
};

const actionRowStyle: any = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "12px",
};

const editButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "8px 10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const deleteButtonStyle: any = {
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "8px 10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const approveButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "8px",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "12px",
};

const rejectButtonStyle: any = {
  ...approveButtonStyle,
  background: "#7f1d1d",
};

const waitButtonStyle: any = {
  ...approveButtonStyle,
  background: "#ca8a04",
};

const okBadgeStyle: any = {
  background: "#16a34a",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const warningBadgeStyle: any = {
  background: "#ca8a04",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const waitBadgeStyle: any = {
  background: "#ca8a04",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const dangerBadgeStyle: any = {
  background: "#dc2626",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const blueBadgeStyle: any = {
  background: "#2563eb",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const purpleBadgeStyle: any = {
  background: "#7c3aed",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};