"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Projekt = {
  id: number | string;
  name?: string | null;
  naziv?: string | null;
  title?: string | null;
  projekt?: string | null;
  baustelle_name?: string | null;
  ort?: string | null;
  mjesto?: string | null;
  location?: string | null;
  adresse?: string | null;
  [key: string]: any;
};

type TableConfig = {
  table: string;
  column: string;
};

type FotoForm = {
  datum: string;
  titel: string;
  beschreibung: string;
  kategorie: string;
  raum_id: string;
  status: string;
};

const STORAGE_BUCKETS = [
  "fotos",
  "photos",
  "bilder",
  "projekt-fotos",
  "baustelle-fotos",
];

const KATEGORIEN = [
  "Allgemein",
  "Vorher",
  "Während Arbeit",
  "Nachher",
  "Mangel",
  "Material",
  "Abnahme",
];

export default function ProjektFotosPage() {
  const params = useParams();
  const projektId = String(params.id);
  const projektIdValue = isNaN(Number(projektId)) ? projektId : Number(projektId);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [fotos, setFotos] = useState<any[]>([]);
  const [raeume, setRaeume] = useState<any[]>([]);
  const [errorText, setErrorText] = useState("");

  const [fotoConfig, setFotoConfig] = useState<TableConfig>({
    table: "fotos",
    column: "projekt_id",
  });

  const [search, setSearch] = useState("");
  const [filterKategorie, setFilterKategorie] = useState("Alle");
  const [filterRaum, setFilterRaum] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | string | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [form, setForm] = useState<FotoForm>({
    datum: today(),
    titel: "",
    beschreibung: "",
    kategorie: "Allgemein",
    raum_id: "",
    status: "Offen",
  });

  useEffect(() => {
    loadAll();
  }, [projektId]);

  function today() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function getProjektName() {
    if (!projekt) return "Projekt";

    return (
      projekt.name ||
      projekt.naziv ||
      projekt.title ||
      projekt.projekt ||
      projekt.baustelle_name ||
      `Projekt ${projekt.id}`
    );
  }

  function getProjektOrt() {
    if (!projekt) return "";
    return projekt.ort || projekt.mjesto || projekt.location || projekt.adresse || "";
  }

  function getDate(row: any) {
    return row.datum || row.date || row.tag || row.day || row.created_date || "";
  }

  function getTitle(row: any) {
    return row.titel || row.title || row.name || row.foto_name || row.bild_name || "";
  }

  function getDescription(row: any) {
    return (
      row.beschreibung ||
      row.description ||
      row.notiz ||
      row.note ||
      row.info ||
      ""
    );
  }

  function getCategory(row: any) {
    return row.kategorie || row.category || row.typ || row.type || "Allgemein";
  }

  function getStatus(row: any) {
    return row.status || "Offen";
  }

  function getRoomId(row: any) {
    return row.raum_id || row.room_id || row.prostorija_id || "";
  }

  function getFileName(row: any) {
    return row.file_name || row.filename || row.dateiname || row.name || "";
  }

  function getImageUrl(row: any) {
    return (
      row.url ||
      row.image_url ||
      row.foto_url ||
      row.photo_url ||
      row.bild_url ||
      row.public_url ||
      row.download_url ||
      ""
    );
  }

  function getStoragePath(row: any) {
    return row.storage_path || row.path || row.file_path || row.bild_path || "";
  }

  function getRoomName(room: any) {
    return (
      room.name ||
      room.raum_name ||
      room.naziv ||
      room.title ||
      room.prostorija ||
      `Raum ${room.id}`
    );
  }

  function findRoomName(roomId: string | number) {
    if (!roomId) return "";
    const room = raeume.find((r) => String(r.id) === String(roomId));
    return room ? getRoomName(room) : "";
  }

  function resetForm() {
    setEditId(null);
    setSelectedFiles([]);
    setForm({
      datum: today(),
      titel: "",
      beschreibung: "",
      kategorie: "Allgemein",
      raum_id: "",
      status: "Offen",
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function loadAll() {
    setLoading(true);
    setErrorText("");

    await loadProjekt();
    await loadRaeume();
    await loadFotos();

    setLoading(false);
  }

  async function loadProjekt() {
    const tables = ["projekte", "baustellen"];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", projektIdValue)
        .maybeSingle();

      if (!error && data) {
        setProjekt(data as Projekt);
        return;
      }
    }

    setProjekt(null);
  }

  async function loadRaeume() {
    const configs: TableConfig[] = [
      { table: "projekt_raeume", column: "projekt_id" },
      { table: "raeume", column: "projekt_id" },
      { table: "raeume", column: "project_id" },
      { table: "prostorije", column: "projekt_id" },
      { table: "prostorije", column: "project_id" },
      { table: "rooms", column: "projekt_id" },
      { table: "rooms", column: "project_id" },
      { table: "prostorije", column: "baustelle_id" },
      { table: "raeume", column: "baustelle_id" },
    ];

    for (const config of configs) {
      const { data, error } = await supabase
        .from(config.table)
        .select("*")
        .eq(config.column, projektIdValue);

      if (!error) {
        setRaeume(data || []);
        return;
      }
    }

    setRaeume([]);
  }

  async function loadFotos() {
    const configs: TableConfig[] = [
      { table: "fotos", column: "projekt_id" },
      { table: "fotos", column: "project_id" },
      { table: "fotos", column: "baustelle_id" },
      { table: "fotos", column: "baustellen_id" },
      { table: "photos", column: "projekt_id" },
      { table: "photos", column: "project_id" },
      { table: "photos", column: "baustelle_id" },
      { table: "bilder", column: "projekt_id" },
      { table: "bilder", column: "project_id" },
      { table: "bilder", column: "baustelle_id" },
    ];

    for (const config of configs) {
      const { data, error } = await supabase
        .from(config.table)
        .select("*")
        .eq(config.column, projektIdValue);

      if (!error) {
        const sorted = [...(data || [])].sort((a: any, b: any) => {
          const da = String(getDate(a));
          const db = String(getDate(b));
          return db.localeCompare(da);
        });

        setFotoConfig(config);
        setFotos(sorted);
        return;
      }
    }

    setFotos([]);
    setErrorText(
      "Ne mogu učitati Fotos. Provjeri tabelu fotos i kolonu projekt_id."
    );
  }

  const filteredFotos = useMemo(() => {
    return fotos.filter((row) => {
      const roomName = findRoomName(getRoomId(row));

      const text = `
        ${getDate(row)}
        ${getTitle(row)}
        ${getDescription(row)}
        ${getCategory(row)}
        ${getStatus(row)}
        ${getFileName(row)}
        ${roomName}
      `.toLowerCase();

      const searchOk = text.includes(search.toLowerCase());
      const categoryOk =
        filterKategorie === "Alle" || getCategory(row) === filterKategorie;
      const roomOk = !filterRaum || String(getRoomId(row)) === String(filterRaum);

      return searchOk && categoryOk && roomOk;
    });
  }, [fotos, search, filterKategorie, filterRaum, raeume]);

  function onFilesSelected(files: FileList | null) {
    const incoming = Array.from(files || []);

    const onlyImages = incoming.filter((file) => file.type.startsWith("image/"));

    const unique = [...selectedFiles];

    onlyImages.forEach((file) => {
      const exists = unique.some(
        (old) =>
          old.name === file.name &&
          old.size === file.size &&
          old.lastModified === file.lastModified
      );

      if (!exists) {
        unique.push(file);
      }
    });

    setSelectedFiles(unique);
  }

  function removeSelectedFile(index: number) {
    setSelectedFiles((old) => old.filter((_, i) => i !== index));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function uploadFile(file: File) {
    const safeName = file.name
      .replaceAll(" ", "_")
      .replaceAll("ä", "ae")
      .replaceAll("ö", "oe")
      .replaceAll("ü", "ue")
      .replaceAll("ß", "ss");

    const filePath = `${projektId}/${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}_${safeName}`;

    let lastError: any = null;

    for (const bucket of STORAGE_BUCKETS) {
      const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

        return {
          bucket,
          storage_path: filePath,
          url: data.publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
        };
      }

      lastError = error;
    }

    throw new Error(lastError?.message || "Upload nije uspio.");
  }

  function isDuplicate(fileName: string, fileSize: number) {
    return fotos.some((row) => {
      return (
        String(getFileName(row)) === String(fileName) &&
        Number(row.file_size || row.size || 0) === Number(fileSize)
      );
    });
  }

  function buildPayloads(uploadData: any) {
    const base: any = {};
    base[fotoConfig.column] = projektIdValue;

    const roomValue =
      form.raum_id && !isNaN(Number(form.raum_id))
        ? Number(form.raum_id)
        : form.raum_id;

    const roomPayload1 = form.raum_id ? { raum_id: roomValue } : {};
    const roomPayload2 = form.raum_id ? { room_id: roomValue } : {};

    return [
      {
        ...base,
        datum: form.datum,
        titel: form.titel.trim(),
        beschreibung: form.beschreibung.trim(),
        kategorie: form.kategorie,
        status: form.status,
        url: uploadData.url,
        image_url: uploadData.url,
        storage_bucket: uploadData.bucket,
        storage_path: uploadData.storage_path,
        file_name: uploadData.file_name,
        file_size: uploadData.file_size,
        mime_type: uploadData.mime_type,
        ...roomPayload1,
      },
      {
        ...base,
        date: form.datum,
        title: form.titel.trim(),
        description: form.beschreibung.trim(),
        category: form.kategorie,
        status: form.status,
        photo_url: uploadData.url,
        public_url: uploadData.url,
        storage_bucket: uploadData.bucket,
        path: uploadData.storage_path,
        filename: uploadData.file_name,
        size: uploadData.file_size,
        type: uploadData.mime_type,
        ...roomPayload2,
      },
      {
        ...base,
        datum: form.datum,
        name: form.titel.trim() || uploadData.file_name,
        info: form.beschreibung.trim(),
        typ: form.kategorie,
        status: form.status,
        bild_url: uploadData.url,
        storage_path: uploadData.storage_path,
        file_name: uploadData.file_name,
        ...roomPayload1,
      },
      {
        ...base,
        datum: form.datum,
        url: uploadData.url,
        storage_path: uploadData.storage_path,
        file_name: uploadData.file_name,
        ...roomPayload1,
      },
      {
        ...base,
        image_url: uploadData.url,
      },
    ];
  }

  function buildUpdatePayloads() {
    return [
      {
        datum: form.datum,
        titel: form.titel.trim(),
        beschreibung: form.beschreibung.trim(),
        kategorie: form.kategorie,
        status: form.status,
        raum_id: form.raum_id ? Number(form.raum_id) : null,
      },
      {
        date: form.datum,
        title: form.titel.trim(),
        description: form.beschreibung.trim(),
        category: form.kategorie,
        status: form.status,
        room_id: form.raum_id ? Number(form.raum_id) : null,
      },
      {
        datum: form.datum,
        name: form.titel.trim(),
        info: form.beschreibung.trim(),
        typ: form.kategorie,
        status: form.status,
      },
      {
        status: form.status,
      },
    ];
  }

  async function saveFotos() {
    if (!form.datum) {
      alert("Odaberi datum.");
      return;
    }

    if (!editId && selectedFiles.length === 0) {
      alert("Odaberi najmanje jednu sliku.");
      return;
    }

    setSaving(true);

    try {
      if (editId) {
        let lastError: any = null;

        for (const payload of buildUpdatePayloads()) {
          const { error } = await supabase
            .from(fotoConfig.table)
            .update(payload as any)
            .eq("id", editId);

          if (!error) {
            resetForm();
            setShowForm(false);
            setSaving(false);
            await loadFotos();
            return;
          }

          lastError = error;
        }

        throw new Error(lastError?.message || "Uređivanje nije uspjelo.");
      }

      let added = 0;
      let skipped = 0;
      let lastError: any = null;

      for (const file of selectedFiles) {
        if (isDuplicate(file.name, file.size)) {
          skipped += 1;
          continue;
        }

        const uploadData = await uploadFile(file);

        for (const payload of buildPayloads(uploadData)) {
          const { error } = await supabase
            .from(fotoConfig.table)
            .insert(payload as any);

          if (!error) {
            added += 1;
            lastError = null;
            break;
          }

          lastError = error;
        }
      }

      resetForm();
      setShowForm(false);
      setSaving(false);
      await loadFotos();

      if (added === 0 && skipped > 0) {
        alert("Slike već postoje. Dupli unos nije dodan.");
      }

      if (added === 0 && lastError) {
        alert("Greška kod spremanja slike: " + lastError.message);
      }
    } catch (err: any) {
      setSaving(false);
      alert("Greška kod upload slika: " + (err?.message || ""));
    }
  }

  function startEdit(row: any) {
    setEditId(row.id);

    setForm({
      datum: String(getDate(row) || today()),
      titel: String(getTitle(row) || ""),
      beschreibung: String(getDescription(row) || ""),
      kategorie: String(getCategory(row) || "Allgemein"),
      raum_id: String(getRoomId(row) || ""),
      status: String(getStatus(row) || "Offen"),
    });

    setSelectedFiles([]);
    setShowForm(true);
  }

  async function changeStatus(row: any, newStatus: string) {
    const { error } = await supabase
      .from(fotoConfig.table)
      .update({ status: newStatus } as any)
      .eq("id", row.id);

    if (error) {
      alert("Greška kod statusa: " + error.message);
      return;
    }

    await loadFotos();
  }

  async function deleteFoto(row: any) {
    const ok = confirm("Da li želiš obrisati ovu sliku?");

    if (!ok) return;

    const { error } = await supabase
      .from(fotoConfig.table)
      .delete()
      .eq("id", row.id);

    if (error) {
      alert("Greška kod brisanja: " + error.message);
      return;
    }

    const bucket = row.storage_bucket || "";
    const path = getStoragePath(row);

    if (bucket && path) {
      await supabase.storage.from(bucket).remove([path]);
    }

    await loadFotos();
  }

  return (
    <main className="page">
      <section className="top">
        <div>
          <Link className="back" href={`/projekte/${projektId}`}>
            ← Zurück zu Projekt
          </Link>

          <p className="label">Projekt Fotos</p>
          <h1>Fotos</h1>
          <p className="subtitle">
            {getProjektName()}
            {getProjektOrt() ? ` · ${getProjektOrt()}` : ""}
          </p>
        </div>

        <div className="topButtons">
          <button className="btn gray" onClick={loadAll}>
            Aktualisieren
          </button>

          <button
            className="btn blue"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + Fotos hinzufügen
          </button>
        </div>
      </section>

      {errorText && <div className="errorBox">{errorText}</div>}

      <section className="stats">
        <div className="stat">
          <span>Ukupno Fotos</span>
          <strong>{filteredFotos.length}</strong>
        </div>

        <div className="stat">
          <span>Räume mit Fotos</span>
          <strong>
            {
              new Set(
                filteredFotos
                  .map((row) => String(getRoomId(row)))
                  .filter((x) => x !== "")
              ).size
            }
          </strong>
        </div>

        <div className="stat">
          <span>Mängel</span>
          <strong>
            {
              filteredFotos.filter(
                (row) => String(getCategory(row)).toLowerCase() === "mangel"
              ).length
            }
          </strong>
        </div>
      </section>

      <section className="toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Traži slike, opis, Raum, kategoriju..."
        />

        <select
          value={filterKategorie}
          onChange={(e) => setFilterKategorie(e.target.value)}
        >
          <option value="Alle">Alle Kategorien</option>
          {KATEGORIEN.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>

        <select value={filterRaum} onChange={(e) => setFilterRaum(e.target.value)}>
          <option value="">Alle Räume</option>
          {raeume.map((room) => (
            <option key={room.id} value={room.id}>
              {getRoomName(room)}
            </option>
          ))}
        </select>
      </section>

      {loading ? (
        <div className="emptyBox">Učitavanje Fotos...</div>
      ) : filteredFotos.length === 0 ? (
        <div className="emptyBox">
          <h2>Nema slika</h2>
          <p>Dodaj prve slike za ovaj projekt.</p>
        </div>
      ) : (
        <section className="grid">
          {filteredFotos.map((row) => {
            const imageUrl = getImageUrl(row);

            return (
              <article key={row.id} className="card">
                <div className="imageBox">
                  {imageUrl ? (
                    <img src={imageUrl} alt={getTitle(row) || "Foto"} />
                  ) : (
                    <div className="noImage">Keine Bild URL</div>
                  )}
                </div>

                <div className="cardBody">
                  <div className="cardTop">
                    <div>
                      <h2>{getTitle(row) || getFileName(row) || "Foto"}</h2>
                      <p>
                        {getDate(row) || "-"}
                        {findRoomName(getRoomId(row))
                          ? ` · ${findRoomName(getRoomId(row))}`
                          : ""}
                      </p>
                    </div>

                    <span
                      className={
                        String(getStatus(row)).toLowerCase() === "fertig"
                          ? "badge done"
                          : "badge"
                      }
                    >
                      {getStatus(row)}
                    </span>
                  </div>

                  <div className="meta">
                    <span>{getCategory(row)}</span>
                  </div>

                  {getDescription(row) && (
                    <p className="description">{getDescription(row)}</p>
                  )}

                  <div className="actions">
                    {imageUrl && (
                      <a href={imageUrl} target="_blank" rel="noreferrer">
                        Öffnen
                      </a>
                    )}

                    <button onClick={() => startEdit(row)}>Bearbeiten</button>
                    <button onClick={() => changeStatus(row, "Fertig")}>
                      Fertig
                    </button>
                    <button className="delete" onClick={() => deleteFoto(row)}>
                      Löschen
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {showForm && (
        <div className="modalBg">
          <div className="modal">
            <div className="modalHead">
              <h2>{editId ? "Foto bearbeiten" : "Fotos hinzufügen"}</h2>

              <button
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                ×
              </button>
            </div>

            <label>Datum</label>
            <input
              type="date"
              value={form.datum}
              onChange={(e) =>
                setForm((old) => ({ ...old, datum: e.target.value }))
              }
            />

            {!editId && (
              <>
                <label>Fotos auswählen</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={(e) => onFilesSelected(e.target.files)}
                />

                {selectedFiles.length > 0 && (
                  <div className="selectedFiles">
                    {selectedFiles.map((file, index) => (
                      <div key={`${file.name}-${file.size}-${index}`}>
                        <span>
                          {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>

                        <button onClick={() => removeSelectedFile(index)}>
                          Entfernen
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <label>Titel</label>
            <input
              value={form.titel}
              onChange={(e) =>
                setForm((old) => ({ ...old, titel: e.target.value }))
              }
              placeholder="z.B. Bad EG Abdichtung"
            />

            <label>Kategorie</label>
            <select
              value={form.kategorie}
              onChange={(e) =>
                setForm((old) => ({ ...old, kategorie: e.target.value }))
              }
            >
              {KATEGORIEN.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>

            <label>Raum / prostorija</label>
            <select
              value={form.raum_id}
              onChange={(e) =>
                setForm((old) => ({ ...old, raum_id: e.target.value }))
              }
            >
              <option value="">Ohne Raum</option>
              {raeume.map((room) => (
                <option key={room.id} value={room.id}>
                  {getRoomName(room)}
                </option>
              ))}
            </select>

            <label>Beschreibung / Notiz</label>
            <textarea
              value={form.beschreibung}
              onChange={(e) =>
                setForm((old) => ({ ...old, beschreibung: e.target.value }))
              }
              placeholder="Opis slike ili napomena"
            />

            <label>Status</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((old) => ({ ...old, status: e.target.value }))
              }
            >
              <option value="Offen">Offen</option>
              <option value="Fertig">Fertig</option>
            </select>

            <div className="modalActions">
              <button
                className="cancel"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Abbrechen
              </button>

              <button className="save" onClick={saveFotos} disabled={saving}>
                {saving ? "Speichern..." : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .page {
          min-height: 100vh;
          background: #050505;
          color: white;
          padding: 28px;
          font-family: Arial, sans-serif;
        }

        .top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 22px;
        }

        .back {
          display: inline-block;
          color: white;
          text-decoration: none;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 11px 15px;
          font-weight: 800;
          margin-bottom: 18px;
        }

        .label {
          color: #9ca3af;
          margin: 0 0 8px;
          font-size: 14px;
          font-weight: 800;
        }

        h1 {
          margin: 0;
          font-size: 44px;
          line-height: 1;
        }

        .subtitle {
          color: #cbd5e1;
          margin: 12px 0 0;
          font-size: 17px;
          font-weight: 700;
        }

        .topButtons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        button,
        a,
        input,
        textarea,
        select {
          font-family: inherit;
        }

        button,
        a {
          -webkit-tap-highlight-color: transparent;
        }

        .btn {
          border: 0;
          border-radius: 14px;
          padding: 14px 18px;
          color: white;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
        }

        .gray {
          background: #374151;
        }

        .blue {
          background: #2563eb;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }

        .stat {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 18px;
        }

        .stat span {
          display: block;
          color: #9ca3af;
          margin-bottom: 8px;
          font-weight: 800;
        }

        .stat strong {
          font-size: 34px;
        }

        .toolbar {
          display: grid;
          grid-template-columns: 1fr 210px 210px;
          gap: 10px;
          margin-bottom: 18px;
        }

        .toolbar input,
        .toolbar select {
          background: #111827;
          color: white;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 15px 16px;
          font-size: 16px;
          outline: none;
        }

        .errorBox {
          background: #7f1d1d;
          border: 1px solid #ef4444;
          color: white;
          padding: 16px;
          border-radius: 14px;
          margin-bottom: 18px;
          font-weight: 800;
        }

        .emptyBox {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 30px;
          text-align: center;
          color: #cbd5e1;
        }

        .emptyBox h2 {
          color: white;
          margin-top: 0;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 18px;
        }

        .card {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 22px;
          overflow: hidden;
        }

        .imageBox {
          background: #030712;
          height: 250px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .imageBox img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .noImage {
          color: #9ca3af;
          font-weight: 800;
        }

        .cardBody {
          padding: 18px;
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
        }

        .card h2 {
          margin: 0;
          font-size: 22px;
        }

        .card p {
          margin: 8px 0 0;
          color: #cbd5e1;
          line-height: 1.45;
        }

        .badge {
          background: #064e3b;
          color: #bbf7d0;
          border: 1px solid #16a34a;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
        }

        .badge.done {
          background: #374151;
          color: #e5e7eb;
          border-color: #6b7280;
        }

        .meta {
          margin-bottom: 12px;
        }

        .meta span {
          display: inline-block;
          background: #0b1220;
          border: 1px solid #374151;
          color: #d1d5db;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 13px;
          font-weight: 800;
        }

        .description {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 12px;
          white-space: pre-wrap;
          margin-bottom: 12px !important;
        }

        .actions {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          padding-top: 14px;
          border-top: 1px solid #1f2937;
        }

        .actions button,
        .actions a {
          background: #374151;
          color: white;
          border: 0;
          border-radius: 12px;
          padding: 12px 8px;
          font-weight: 900;
          cursor: pointer;
          text-decoration: none;
          text-align: center;
          font-size: 14px;
        }

        .actions .delete {
          background: #dc2626;
        }

        .modalBg {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.78);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 16px;
          z-index: 100;
        }

        .modal {
          width: 100%;
          max-width: 680px;
          max-height: 92vh;
          overflow: auto;
          background: #111827;
          border: 1px solid #374151;
          border-radius: 22px;
          padding: 22px;
        }

        .modalHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .modalHead h2 {
          margin: 0;
          font-size: 28px;
        }

        .modalHead button {
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 12px;
          background: #374151;
          color: white;
          font-size: 28px;
          cursor: pointer;
        }

        label {
          display: block;
          color: #d1d5db;
          font-weight: 800;
          margin: 14px 0 7px;
        }

        .modal input,
        .modal textarea,
        .modal select {
          width: 100%;
          box-sizing: border-box;
          background: #030712;
          color: white;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 14px;
          font-size: 16px;
          outline: none;
        }

        .modal textarea {
          min-height: 95px;
          resize: vertical;
        }

        .selectedFiles {
          margin-top: 12px;
          display: grid;
          gap: 8px;
        }

        .selectedFiles div {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 12px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }

        .selectedFiles span {
          color: #d1d5db;
          font-size: 14px;
          word-break: break-word;
        }

        .selectedFiles button {
          background: #dc2626;
          color: white;
          border: 0;
          border-radius: 12px;
          padding: 10px 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .modalActions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }

        .modalActions button {
          border: 0;
          border-radius: 14px;
          padding: 14px 18px;
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .cancel {
          background: #374151;
        }

        .save {
          background: #2563eb;
        }

        .save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 900px) {
          .toolbar {
            grid-template-columns: 1fr;
          }

          .actions {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 760px) {
          .page {
            padding: 16px;
          }

          .top {
            display: block;
          }

          h1 {
            font-size: 36px;
          }

          .topButtons {
            display: grid;
            grid-template-columns: 1fr;
            margin-top: 16px;
          }

          .stats,
          .grid {
            grid-template-columns: 1fr;
          }

          .imageBox {
            height: 220px;
          }

          .actions {
            grid-template-columns: 1fr;
          }

          .selectedFiles div {
            display: grid;
          }
        }
      `}</style>
    </main>
  );
}