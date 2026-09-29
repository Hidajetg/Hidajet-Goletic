"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const STORAGE_BUCKET = "bau-dokumentation";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

type DokumentDatei = {
  id: number;
  dokumentation_id: number;
  baustelle_id: string;
  datei_name: string;
  datei_typ: "bild" | "plan";
  mime_type: string | null;
  storage_path: string;
  public_url: string;
  hochgeladen_von: string;
  created_at: string;
};

type DokumentEintrag = {
  id: number;
  baustelle_id: string;
  dokument_datum: string;
  titel: string;
  beschreibung: string;
  bemerkung: string;
  erstellt_von: string;
  created_at: string;
  updated_at: string;
  bau_dokumentation_dateien?: DokumentDatei[];
};

type Baustelle = {
  id: number;
  name?: string;
  naziv?: string;
  ort?: string;
  lokacija?: string;
  location?: string;
};

function todayInputValue(): string {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function safeFileName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(-150);
}

function formatGermanDate(value: string): string {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function formatDateTime(value: string): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}


function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.name || "JavaScript-Fehler ohne Nachricht";
  }

  if (typeof error === "string") {
    return error || "Leere Fehlermeldung";
  }

  if (error === null) return "Fehlerobjekt ist null";
  if (error === undefined) return "Fehlerobjekt ist undefined";

  if (typeof error === "object") {
    const value = error as Record<string, unknown>;
    const parts = [
      value.message,
      value.details,
      value.hint,
      value.code,
      value.status,
      value.statusText,
      value.name,
    ]
      .filter(
        (part): part is string | number =>
          (typeof part === "string" && part.trim().length > 0) ||
          typeof part === "number",
      )
      .map(String);

    if (parts.length > 0) {
      return parts.join(" – ");
    }

    try {
      const ownValues: Record<string, unknown> = {};
      for (const key of Object.getOwnPropertyNames(error)) {
        ownValues[key] = value[key];
      }
      const serialized = JSON.stringify(ownValues);
      if (serialized && serialized !== "{}") return serialized;
    } catch {
      // Nastavi na String(error).
    }

    const fallback = String(error);
    return fallback === "[object Object]"
      ? "Leeres Fehlerobjekt {}"
      : fallback;
  }

  return String(error);
}

function throwSupabaseError(context: string, error: unknown): never {
  throw new Error(`${context}: ${getErrorMessage(error)}`);
}

function getStoredUserName(): string {
  return (
    localStorage.getItem("worker_name") ||
    localStorage.getItem("user_name") ||
    localStorage.getItem("logged_user") ||
    localStorage.getItem("name") ||
    "Admin"
  );
}

export default function BauDokumentationPage() {
  const params = useParams();
  const router = useRouter();
  const baustelleId = String(params.id);

  const [baustelle, setBaustelle] = useState<Baustelle | null>(null);
  const [eintraege, setEintraege] = useState<DokumentEintrag[]>([]);
  const [adminName, setAdminName] = useState("Admin");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingText, setUploadingText] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [datum, setDatum] = useState(todayInputValue());
  const [titel, setTitel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [bemerkung, setBemerkung] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  const baustelleName =
    baustelle?.name || baustelle?.naziv || `Baustelle ${baustelleId}`;
  const baustelleOrt =
    baustelle?.ort || baustelle?.lokacija || baustelle?.location || "";

  useEffect(() => {
    const role = localStorage.getItem("worker_role") || "worker";

    if (role !== "admin") {
      alert("Nur Administratoren haben Zugriff auf die Bau-Dokumentation.");
      router.replace(`/baustellen/${baustelleId}`);
      return;
    }

    setAdminName(getStoredUserName());
    void loadAll();
  }, [baustelleId, router]);

  const groupedEntries = useMemo(() => {
    const groups: Record<string, DokumentEintrag[]> = {};

    for (const entry of eintraege) {
      if (!groups[entry.dokument_datum]) {
        groups[entry.dokument_datum] = [];
      }
      groups[entry.dokument_datum].push(entry);
    }

    return Object.entries(groups).sort(([dateA], [dateB]) =>
      dateA.localeCompare(dateB),
    );
  }, [eintraege]);

  async function loadAll() {
    setLoading(true);

    try {
      // Odvojeni upiti su pouzdaniji od ugrađenog relational selecta.
      // Tako stranica radi i odmah nakon kreiranja novih tabela.
      const { data: baustelleData, error: baustelleError } = await supabase
        .from("baustellen")
        .select("*")
        .eq("id", baustelleId)
        .single();

      if (baustelleError) throwSupabaseError("Baustelle laden", baustelleError);

      const { data: dokumentationData, error: dokumentationError } =
        await supabase
          .from("bau_dokumentation")
          .select("*")
          .eq("baustelle_id", baustelleId)
          .order("dokument_datum", { ascending: true })
          .order("created_at", { ascending: true });

      if (dokumentationError) throwSupabaseError("Tabelle bau_dokumentation laden", dokumentationError);

      const { data: dateienData, error: dateienError } = await supabase
        .from("bau_dokumentation_dateien")
        .select("*")
        .eq("baustelle_id", baustelleId)
        .order("created_at", { ascending: true });

      if (dateienError) throwSupabaseError("Tabelle bau_dokumentation_dateien laden", dateienError);

      const filesByEntry = new Map<number, DokumentDatei[]>();

      for (const file of (dateienData || []) as DokumentDatei[]) {
        const list = filesByEntry.get(file.dokumentation_id) || [];
        list.push(file);
        filesByEntry.set(file.dokumentation_id, list);
      }

      const entries = ((dokumentationData || []) as DokumentEintrag[]).map(
        (entry) => ({
          ...entry,
          bau_dokumentation_dateien: filesByEntry.get(entry.id) || [],
        }),
      );

      setBaustelle(baustelleData as Baustelle);
      setEintraege(entries);
    } catch (error) {
      console.error("Bau-Dokumentation loadAll error:", error);
      alert(
        "Bau-Dokumentation konnte nicht geladen werden:\n\n" +
          getErrorMessage(error),
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setDatum(todayInputValue());
    setTitel("");
    setBeschreibung("");
    setBemerkung("");
    setSelectedFiles([]);
    setFileInputKey((value) => value + 1);
    setUploadingText("");
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    const tooLarge = files.find((file) => file.size > MAX_FILE_SIZE);

    if (tooLarge) {
      alert(`Die Datei „${tooLarge.name}“ ist größer als 50 MB.`);
      event.target.value = "";
      return;
    }

    setSelectedFiles(files);
  }

  async function uploadFiles(dokumentationId: number, entryDate: string) {
    if (selectedFiles.length === 0) return;

    for (let index = 0; index < selectedFiles.length; index += 1) {
      const file = selectedFiles[index];
      setUploadingText(
        `Datei ${index + 1} von ${selectedFiles.length} wird hochgeladen...`,
      );

      const uniquePart = `${Date.now()}-${crypto.randomUUID()}`;
      const path = `${baustelleId}/${entryDate}/${dokumentationId}/${uniquePart}-${safeFileName(
        file.name,
      )}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) {
        throw new Error(
          `Upload von „${file.name}“ fehlgeschlagen: ${uploadError.message}`,
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);

      const fileType: "bild" | "plan" = file.type.startsWith("image/")
        ? "bild"
        : "plan";

      const { error: metadataError } = await supabase
        .from("bau_dokumentation_dateien")
        .insert({
          dokumentation_id: dokumentationId,
          baustelle_id: baustelleId,
          datei_name: file.name,
          datei_typ: fileType,
          mime_type: file.type || null,
          storage_path: path,
          public_url: publicUrlData.publicUrl,
          hochgeladen_von: adminName,
        });

      if (metadataError) {
        await supabase.storage.from(STORAGE_BUCKET).remove([path]);
        throw new Error(
          `Datei „${file.name}“ konnte nicht gespeichert werden: ${metadataError.message}`,
        );
      }
    }
  }

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!datum) {
      alert("Bitte Datum auswählen.");
      return;
    }

    if (!beschreibung.trim()) {
      alert("Bitte die ausgeführten Arbeiten eintragen.");
      return;
    }

    setSaving(true);
    setUploadingText("");

    try {
      let dokumentationId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from("bau_dokumentation")
          .update({
            dokument_datum: datum,
            titel: titel.trim(),
            beschreibung: beschreibung.trim(),
            bemerkung: bemerkung.trim(),
          })
          .eq("id", editingId)
          .eq("baustelle_id", baustelleId);

        if (error) throwSupabaseError("Eintrag aktualisieren", error);
      } else {
        const { data, error } = await supabase
          .from("bau_dokumentation")
          .insert({
            baustelle_id: baustelleId,
            dokument_datum: datum,
            titel: titel.trim(),
            beschreibung: beschreibung.trim(),
            bemerkung: bemerkung.trim(),
            erstellt_von: adminName,
          })
          .select("id");

        if (error) {
          throwSupabaseError("Neuen Tagesbericht einfügen", error);
        }

        const insertedRow = Array.isArray(data) ? data[0] : null;
        if (!insertedRow?.id) {
          throw new Error(
            "Der Tagesbericht wurde nicht zurückgegeben. Prüfe SELECT/INSERT-Rechte der Tabelle bau_dokumentation.",
          );
        }

        dokumentationId = Number(insertedRow.id);
      }

      if (!dokumentationId) {
        throw new Error("Dokumentations-ID wurde nicht erstellt.");
      }

      await uploadFiles(dokumentationId, datum);
      resetForm();
      await loadAll();
      alert(editingId ? "Eintrag wurde aktualisiert." : "Eintrag wurde gespeichert.");
    } catch (error) {
      console.error(error);
      alert(
        "Speichern fehlgeschlagen: " +
          getErrorMessage(error),
      );
    } finally {
      setSaving(false);
      setUploadingText("");
    }
  }

  function startEditing(entry: DokumentEintrag) {
    setEditingId(entry.id);
    setDatum(entry.dokument_datum);
    setTitel(entry.titel || "");
    setBeschreibung(entry.beschreibung || "");
    setBemerkung(entry.bemerkung || "");
    setSelectedFiles([]);
    setFileInputKey((value) => value + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteEntry(entry: DokumentEintrag) {
    const confirmed = confirm(
      `Eintrag vom ${formatGermanDate(
        entry.dokument_datum,
      )} inklusive aller Bilder und Pläne löschen?`,
    );

    if (!confirmed) return;

    try {
      const paths = (entry.bau_dokumentation_dateien || []).map(
        (file) => file.storage_path,
      );

      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(paths);

        if (storageError) throwSupabaseError("Datei aus Storage löschen", storageError);
      }

      const { error } = await supabase
        .from("bau_dokumentation")
        .delete()
        .eq("id", entry.id)
        .eq("baustelle_id", baustelleId);

      if (error) throwSupabaseError("Tagesbericht löschen", error);

      if (editingId === entry.id) resetForm();
      await loadAll();
    } catch (error) {
      console.error(error);
      alert(
        "Löschen fehlgeschlagen: " +
          getErrorMessage(error),
      );
    }
  }

  async function deleteFile(file: DokumentDatei) {
    if (!confirm(`Datei „${file.datei_name}“ wirklich löschen?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([file.storage_path]);

      if (storageError) throwSupabaseError("Datei aus Storage löschen", storageError);

      const { error: databaseError } = await supabase
        .from("bau_dokumentation_dateien")
        .delete()
        .eq("id", file.id)
        .eq("baustelle_id", baustelleId);

      if (databaseError) throwSupabaseError("Datei-Metadaten löschen", databaseError);
      await loadAll();
    } catch (error) {
      console.error(error);
      alert(
        "Datei konnte nicht gelöscht werden: " +
          getErrorMessage(error),
      );
    }
  }

  if (loading) {
    return (
      <main className="page loadingPage">
        <div className="spinner" />
        <p>Bau-Dokumentation wird geladen...</p>
        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="topBar">
        <Link href={`/baustellen/${baustelleId}`} className="backButton">
          ← Zurück zur Baustelle
        </Link>
        <div className="adminBadge">🔒 Nur Admin</div>
      </div>

      <header className="header">
        <div>
          <p className="eyebrow">BAUTAGEBUCH</p>
          <h1>📋 Bau-Dokumentation</h1>
          <h2>{baustelleName}</h2>
          {baustelleOrt && <p className="siteLocation">📍 {baustelleOrt}</p>}
        </div>
        <div className="authorBox">
          <span>Angemeldet als</span>
          <strong>{adminName}</strong>
        </div>
      </header>

      <section className="formCard">
        <div className="sectionTitleRow">
          <div>
            <p className="eyebrow">TAGESBERICHT</p>
            <h3>{editingId ? "Eintrag bearbeiten" : "Neuen Tag dokumentieren"}</h3>
          </div>
          {editingId && (
            <button type="button" className="secondaryButton" onClick={resetForm}>
              Bearbeitung abbrechen
            </button>
          )}
        </div>

        <form onSubmit={saveEntry}>
          <div className="formGrid">
            <label>
              <span>Datum *</span>
              <input
                type="date"
                value={datum}
                onChange={(event) => setDatum(event.target.value)}
                required
              />
            </label>

            <label>
              <span>Titel / Abschnitt</span>
              <input
                type="text"
                value={titel}
                onChange={(event) => setTitel(event.target.value)}
                placeholder="z. B. Abdichtung Badezimmer"
              />
            </label>
          </div>

          <label className="fullField">
            <span>Ausgeführte Arbeiten *</span>
            <textarea
              value={beschreibung}
              onChange={(event) => setBeschreibung(event.target.value)}
              placeholder="Was wurde heute auf der Baustelle ausgeführt?"
              rows={7}
              required
            />
          </label>

          <label className="fullField">
            <span>Probleme, Kontrollen und Bemerkungen</span>
            <textarea
              value={bemerkung}
              onChange={(event) => setBemerkung(event.target.value)}
              placeholder="Offene Punkte, Schäden, Lieferungen, Absprachen oder wichtige Hinweise..."
              rows={5}
            />
          </label>

          <label className="uploadBox">
            <span className="uploadIcon">📎</span>
            <strong>Bilder und Pläne hinzufügen</strong>
            <small>JPG, PNG, HEIC, WEBP, PDF, DWG, DXF und weitere Dateien – max. 50 MB pro Datei</small>
            <input
              key={fileInputKey}
              type="file"
              multiple
              accept="image/*,.pdf,.dwg,.dxf,.doc,.docx,.xls,.xlsx"
              onChange={handleFileSelection}
            />
          </label>

          {selectedFiles.length > 0 && (
            <div className="selectedFiles">
              <strong>Ausgewählte Dateien ({selectedFiles.length})</strong>
              {selectedFiles.map((file) => (
                <div key={`${file.name}-${file.lastModified}`} className="selectedFile">
                  <span>{file.type.startsWith("image/") ? "🖼️" : "📐"}</span>
                  <span>{file.name}</span>
                  <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>
                </div>
              ))}
            </div>
          )}

          {uploadingText && <p className="uploadingText">⏳ {uploadingText}</p>}

          <div className="formActions">
            <button type="submit" className="saveButton" disabled={saving}>
              {saving
                ? "Wird gespeichert..."
                : editingId
                  ? "Änderungen speichern"
                  : "Tagesbericht speichern"}
            </button>
            {editingId && (
              <button type="button" className="secondaryButton" onClick={resetForm}>
                Abbrechen
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="timelineSection">
        <div className="timelineHeading">
          <div>
            <p className="eyebrow">CHRONOLOGIE</p>
            <h3>Baustellenverlauf</h3>
          </div>
          <div className="entryCount">
            {eintraege.length} {eintraege.length === 1 ? "Eintrag" : "Einträge"}
          </div>
        </div>

        {groupedEntries.length === 0 ? (
          <div className="emptyState">
            <div>📭</div>
            <h4>Noch keine Bau-Dokumentation vorhanden</h4>
            <p>Der erste Tagesbericht kann oben hinzugefügt werden.</p>
          </div>
        ) : (
          <div className="timeline">
            {groupedEntries.map(([date, entries]) => (
              <div className="dayGroup" key={date}>
                <div className="dateMarker">
                  <span className="dateDot" />
                  <strong>{formatGermanDate(date)}</strong>
                </div>

                <div className="dayEntries">
                  {entries.map((entry) => {
                    const files = entry.bau_dokumentation_dateien || [];
                    const images = files.filter((file) => file.datei_typ === "bild");
                    const plans = files.filter((file) => file.datei_typ === "plan");

                    return (
                      <article className="entryCard" key={entry.id}>
                        <div className="entryHeader">
                          <div>
                            <h4>{entry.titel || "Tagesbericht"}</h4>
                            <p>
                              Von <strong>{entry.erstellt_von}</strong> · erstellt {formatDateTime(entry.created_at)}
                            </p>
                          </div>
                          <div className="entryActions">
                            <button type="button" onClick={() => startEditing(entry)}>
                              ✏️ Bearbeiten
                            </button>
                            <button
                              type="button"
                              className="dangerTextButton"
                              onClick={() => void deleteEntry(entry)}
                            >
                              🗑️ Löschen
                            </button>
                          </div>
                        </div>

                        <div className="entryBlock">
                          <h5>Ausgeführte Arbeiten</h5>
                          <p>{entry.beschreibung}</p>
                        </div>

                        {entry.bemerkung && (
                          <div className="entryBlock noteBlock">
                            <h5>Probleme, Kontrollen und Bemerkungen</h5>
                            <p>{entry.bemerkung}</p>
                          </div>
                        )}

                        {images.length > 0 && (
                          <div className="attachmentSection">
                            <h5>📷 Bilder ({images.length})</h5>
                            <div className="imageGrid">
                              {images.map((file) => (
                                <div className="imageCard" key={file.id}>
                                  <a href={file.public_url} target="_blank" rel="noreferrer">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={file.public_url} alt={file.datei_name} />
                                  </a>
                                  <div className="fileFooter">
                                    <span title={file.datei_name}>{file.datei_name}</span>
                                    <button
                                      type="button"
                                      title="Datei löschen"
                                      onClick={() => void deleteFile(file)}
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {plans.length > 0 && (
                          <div className="attachmentSection">
                            <h5>📐 Pläne und Dokumente ({plans.length})</h5>
                            <div className="planList">
                              {plans.map((file) => (
                                <div className="planRow" key={file.id}>
                                  <a href={file.public_url} target="_blank" rel="noreferrer">
                                    <span className="planIcon">📄</span>
                                    <span>
                                      <strong>{file.datei_name}</strong>
                                      <small>{file.mime_type || "Dokument"}</small>
                                    </span>
                                  </a>
                                  <button
                                    type="button"
                                    title="Datei löschen"
                                    onClick={() => void deleteFile(file)}
                                  >
                                    🗑️
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  .page {
    min-height: 100vh;
    background: #000;
    color: #fff;
    padding: 28px 30px 70px;
  }

  .loadingPage {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  .spinner {
    width: 44px;
    height: 44px;
    border: 4px solid #2a2a2a;
    border-top-color: #16a34a;
    border-radius: 999px;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .topBar,
  .header,
  .sectionTitleRow,
  .timelineHeading,
  .entryHeader,
  .formActions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }

  .topBar {
    margin-bottom: 28px;
  }

  .backButton {
    color: #2997ff;
    font-weight: 800;
    text-decoration: none;
  }

  .adminBadge {
    padding: 8px 12px;
    border-radius: 999px;
    background: #1c1c1c;
    border: 1px solid #333;
    color: #d4d4d4;
    font-size: 13px;
    font-weight: 800;
  }

  .header {
    align-items: flex-end;
    max-width: 1500px;
    margin: 0 auto 28px;
  }

  .header h1 {
    margin: 2px 0 8px;
    font-size: clamp(34px, 5vw, 58px);
    line-height: 1;
  }

  .header h2 {
    margin: 0;
    font-size: 24px;
    color: #d7d7d7;
  }

  .siteLocation {
    margin: 8px 0 0;
    color: #a3a3a3;
  }

  .eyebrow {
    margin: 0 0 7px;
    color: #43d17c;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.15em;
  }

  .authorBox {
    min-width: 180px;
    padding: 14px 18px;
    border: 1px solid #2d2d2d;
    border-radius: 14px;
    background: #111;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .authorBox span {
    color: #8e8e8e;
    font-size: 12px;
  }

  .authorBox strong {
    font-size: 17px;
  }

  .formCard,
  .timelineSection {
    max-width: 1500px;
    margin: 0 auto;
    border: 1px solid #242424;
    border-radius: 20px;
    background: #101010;
    padding: 26px;
  }

  .timelineSection {
    margin-top: 28px;
  }

  .sectionTitleRow,
  .timelineHeading {
    margin-bottom: 22px;
  }

  .sectionTitleRow h3,
  .timelineHeading h3 {
    margin: 0;
    font-size: 26px;
  }

  .formGrid {
    display: grid;
    grid-template-columns: minmax(220px, 0.45fr) minmax(300px, 1.55fr);
    gap: 16px;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-weight: 800;
  }

  label > span {
    color: #e5e5e5;
    font-size: 14px;
  }

  input,
  textarea {
    width: 100%;
    color: #fff;
    background: #050505;
    border: 1px solid #363636;
    border-radius: 12px;
    padding: 13px 14px;
    font: inherit;
    outline: none;
  }

  input:focus,
  textarea:focus {
    border-color: #22c55e;
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.13);
  }

  textarea {
    resize: vertical;
    line-height: 1.55;
  }

  .fullField {
    margin-top: 16px;
  }

  .uploadBox {
    margin-top: 18px;
    padding: 24px;
    border: 2px dashed #3b3b3b;
    border-radius: 16px;
    background: #080808;
    align-items: center;
    text-align: center;
    cursor: pointer;
  }

  .uploadBox:hover {
    border-color: #16a34a;
  }

  .uploadBox input {
    max-width: 620px;
    margin-top: 8px;
    padding: 10px;
    cursor: pointer;
  }

  .uploadBox small {
    color: #939393;
    font-weight: 500;
  }

  .uploadIcon {
    font-size: 34px;
  }

  .selectedFiles {
    margin-top: 14px;
    padding: 14px;
    border-radius: 12px;
    background: #080808;
    border: 1px solid #292929;
  }

  .selectedFile {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #242424;
  }

  .selectedFile:last-child {
    border-bottom: 0;
  }

  .selectedFile small {
    color: #929292;
  }

  .uploadingText {
    color: #fbbf24;
    font-weight: 800;
  }

  .formActions {
    justify-content: flex-start;
    margin-top: 20px;
  }

  button {
    border: 0;
    font: inherit;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .saveButton,
  .secondaryButton {
    min-height: 46px;
    border-radius: 12px;
    padding: 11px 18px;
    font-weight: 900;
  }

  .saveButton {
    color: #fff;
    background: linear-gradient(135deg, #16a34a, #047857);
  }

  .secondaryButton {
    color: #fff;
    background: #292929;
    border: 1px solid #3b3b3b;
  }

  .entryCount {
    padding: 9px 13px;
    border-radius: 999px;
    background: #072d18;
    color: #68e99b;
    font-weight: 900;
  }

  .emptyState {
    padding: 60px 20px;
    text-align: center;
    color: #9f9f9f;
  }

  .emptyState > div {
    font-size: 44px;
  }

  .emptyState h4 {
    margin: 14px 0 5px;
    color: #fff;
    font-size: 20px;
  }

  .emptyState p {
    margin: 0;
  }

  .timeline {
    position: relative;
  }

  .timeline::before {
    content: "";
    position: absolute;
    left: 104px;
    top: 12px;
    bottom: 10px;
    width: 2px;
    background: #2c2c2c;
  }

  .dayGroup {
    display: grid;
    grid-template-columns: 106px minmax(0, 1fr);
    gap: 24px;
    position: relative;
    margin-bottom: 25px;
  }

  .dateMarker {
    position: relative;
    padding-top: 19px;
    color: #75e9a2;
    font-size: 14px;
  }

  .dateDot {
    position: absolute;
    right: -7px;
    top: 24px;
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: #22c55e;
    border: 3px solid #101010;
    box-shadow: 0 0 0 2px #22c55e;
  }

  .dayEntries {
    display: grid;
    gap: 18px;
  }

  .entryCard {
    padding: 22px;
    border-radius: 16px;
    border: 1px solid #303030;
    background: #080808;
  }

  .entryHeader {
    align-items: flex-start;
    padding-bottom: 16px;
    border-bottom: 1px solid #262626;
  }

  .entryHeader h4 {
    margin: 0 0 6px;
    font-size: 21px;
  }

  .entryHeader p {
    margin: 0;
    color: #929292;
    font-size: 13px;
  }

  .entryActions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .entryActions button {
    padding: 8px 10px;
    border-radius: 9px;
    background: #242424;
    color: #fff;
    font-size: 13px;
    font-weight: 800;
  }

  .entryActions .dangerTextButton {
    background: #341010;
    color: #ff9b9b;
  }

  .entryBlock {
    margin-top: 18px;
  }

  .entryBlock h5,
  .attachmentSection h5 {
    margin: 0 0 8px;
    color: #d4d4d4;
    font-size: 14px;
  }

  .entryBlock p {
    margin: 0;
    color: #f1f1f1;
    line-height: 1.65;
    white-space: pre-wrap;
  }

  .noteBlock {
    padding: 14px;
    border-radius: 12px;
    background: #271d05;
    border: 1px solid #624a0d;
  }

  .noteBlock h5 {
    color: #f4ca62;
  }

  .attachmentSection {
    margin-top: 22px;
  }

  .imageGrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 12px;
  }

  .imageCard {
    min-width: 0;
    overflow: hidden;
    border-radius: 12px;
    background: #121212;
    border: 1px solid #2e2e2e;
  }

  .imageCard a {
    display: block;
    aspect-ratio: 4 / 3;
    background: #000;
  }

  .imageCard img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .fileFooter {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    padding: 9px;
  }

  .fileFooter span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: #c6c6c6;
  }

  .fileFooter button,
  .planRow > button {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    color: #ff9f9f;
    background: #311111;
  }

  .planList {
    display: grid;
    gap: 9px;
  }

  .planRow {
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: space-between;
    padding: 10px;
    border-radius: 11px;
    border: 1px solid #2d2d2d;
    background: #111;
  }

  .planRow a {
    min-width: 0;
    flex: 1;
    display: flex;
    align-items: center;
    gap: 11px;
    color: #fff;
    text-decoration: none;
  }

  .planRow a > span:last-child {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .planRow strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .planRow small {
    color: #8d8d8d;
  }

  .planIcon {
    font-size: 26px;
  }

  @media (max-width: 800px) {
    .page {
      padding: 20px 14px 50px;
    }

    .header,
    .topBar,
    .sectionTitleRow,
    .timelineHeading,
    .entryHeader {
      align-items: flex-start;
      flex-direction: column;
    }

    .authorBox {
      width: 100%;
    }

    .formCard,
    .timelineSection {
      padding: 18px;
      border-radius: 16px;
    }

    .formGrid {
      grid-template-columns: 1fr;
    }

    .timeline::before {
      left: 7px;
    }

    .dayGroup {
      grid-template-columns: 1fr;
      padding-left: 27px;
      gap: 10px;
    }

    .dateMarker {
      padding-top: 0;
    }

    .dateDot {
      left: -27px;
      right: auto;
      top: 3px;
    }

    .entryActions {
      justify-content: flex-start;
    }

    .formActions {
      align-items: stretch;
      flex-direction: column;
    }

    .saveButton,
    .secondaryButton {
      width: 100%;
    }
  }
`;