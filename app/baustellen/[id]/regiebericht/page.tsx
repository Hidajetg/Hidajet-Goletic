"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const FIRMA = "Nocker & Bernardi GmbH / Stone Boutique";
const POTPIS = "Hidajet Goletić";

export default function RegieberichtPage() {
  const params = useParams();
  const baustelleId = String(params.id);

  const [baustelle, setBaustelle] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);

  const [berichtNr, setBerichtNr] = useState("");
  const [datum, setDatum] = useState(new Date().toISOString().split("T")[0]);
  const [auftraggeber, setAuftraggeber] = useState("");
  const [bauleiter, setBauleiter] = useState("");
  const [ort, setOrt] = useState("");
  const [arbeiten, setArbeiten] = useState("");

  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedRooms, setSelectedRooms] = useState<any[]>([]);

  const [workerName, setWorkerName] = useState("");
  const [von, setVon] = useState("08:00");
  const [bis, setBis] = useState("17:00");
  const [bemerkung, setBemerkung] = useState("");
  const [workerRows, setWorkerRows] = useState<any[]>([]);

  const [materialId, setMaterialId] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [menge, setMenge] = useState("");
  const [einheit, setEinheit] = useState("");
  const [materialRows, setMaterialRows] = useState<any[]>([]);

  const [photos, setPhotos] = useState<any[]>([]);
  const [photoNote, setPhotoNote] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const baustelleRes = await supabase
      .from("baustellen")
      .select("*")
      .eq("id", Number(baustelleId))
      .single();

    if (baustelleRes.error) {
      alert("LOAD BAUSTELLE: " + baustelleRes.error.message);
      return;
    }

    setBaustelle(baustelleRes.data);
    setOrt(baustelleRes.data?.lokacija || "");
    setAuftraggeber(baustelleRes.data?.auftraggeber || "");

    const roomsRes = await supabase
      .from("prostorije")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("naziv", { ascending: true });

    setRooms(roomsRes.data || []);

    const workersRes = await supabase
      .from("workers")
      .select("*")
      .order("name", { ascending: true });

    setWorkers((workersRes.data || []).filter((w: any) => w.role !== "admin"));

    const materialsRes = await supabase
      .from("materials")
      .select("*")
      .order("naziv", { ascending: true });

    setMaterials(materialsRes.data || []);
  }

  function timeToNumber(time: string) {
    const [h, m] = time.split(":").map(Number);
    return h + m / 60;
  }

  function calcHours(start: string, end: string) {
    const total = timeToNumber(end) - timeToNumber(start);
    if (total < 0) return 0;
    return Number(total.toFixed(2));
  }

  function addRoom() {
    if (!selectedRoom) return;

    const room = rooms.find((r) => String(r.id) === String(selectedRoom));
    if (!room) return;

    if (selectedRooms.find((r) => String(r.room_id) === String(room.id))) {
      return;
    }

    setSelectedRooms((prev) => [
      ...prev,
      {
        room_id: room.id,
        room_name: room.naziv,
      },
    ]);

    setSelectedRoom("");
  }

  function removeRoom(index: number) {
    setSelectedRooms((prev) => prev.filter((_, i) => i !== index));
  }

  function addWorker() {
    if (!workerName) {
      alert("Odaberi radnika.");
      return;
    }

    const stunden = calcHours(von, bis);

    setWorkerRows((prev) => [
      ...prev,
      {
        worker_name: workerName,
        von,
        bis,
        stunden,
        bemerkung,
      },
    ]);

    setWorkerName("");
    setVon("08:00");
    setBis("17:00");
    setBemerkung("");
  }

  function removeWorker(index: number) {
    setWorkerRows((prev) => prev.filter((_, i) => i !== index));
  }

  function onMaterialSelect(value: string) {
    setMaterialId(value);

    if (!value) {
      setMaterialName("");
      setEinheit("");
      return;
    }

    const m = materials.find((x) => String(x.id) === String(value));

    if (m) {
      setMaterialName(m.naziv || "");
      setEinheit(m.jedinica || "");
    }
  }

  function addMaterial() {
    if (!materialName.trim()) {
      alert("Unesi ili odaberi materijal.");
      return;
    }

    if (!menge || Number(menge) <= 0) {
      alert("Unesi količinu.");
      return;
    }

    setMaterialRows((prev) => [
      ...prev,
      {
        material_id: materialId ? Number(materialId) : null,
        bezeichnung: materialName.trim(),
        menge: Number(menge),
        einheit: einheit.trim(),
      },
    ]);

    setMaterialId("");
    setMaterialName("");
    setMenge("");
    setEinheit("");
  }

  function removeMaterial(index: number) {
    setMaterialRows((prev) => prev.filter((_, i) => i !== index));
  }

  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;

    const newPhotos = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      note: photoNote,
    }));

    setPhotos((prev) => [...prev, ...newPhotos]);
    setPhotoNote("");
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadPhoto(file: File, berichtId: number) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${berichtId}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;

    const filePath = `regieberichte/${berichtId}/${fileName}`;

    const { error } = await supabase.storage
      .from("regiebericht-photos")
      .upload(filePath, file);

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from("regiebericht-photos")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function saveBericht() {
    if (!baustelle) {
      alert("Baustelle nije učitana.");
      return;
    }

    if (!auftraggeber.trim()) {
      alert("Unesi Auftraggeber.");
      return;
    }

    if (!bauleiter.trim()) {
      alert("Unesi Bauleiter.");
      return;
    }

    if (!arbeiten.trim()) {
      alert("Unesi izvedene radove.");
      return;
    }

    const { data: bericht, error: berichtError } = await supabase
      .from("regieberichte")
      .insert([
        {
          baustelle_id: Number(baustelleId),
          bericht_nr: berichtNr.trim(),
          datum,
          auftragnehmer: FIRMA,
          auftraggeber: auftraggeber.trim(),
          bauleiter: bauleiter.trim(),
          bauvorhaben: baustelle.naziv || "",
          ort: ort.trim(),
          ausgefuehrte_arbeiten: arbeiten.trim(),
          unterschrift_auftragnehmer: POTPIS,
          status: "ENTWURF",
        },
      ])
      .select()
      .single();

    if (berichtError) {
      alert("INSERT REGIEBERICHT: " + berichtError.message);
      return;
    }

    const berichtId = bericht.id;

    if (selectedRooms.length > 0) {
      const { error } = await supabase.from("regiebericht_rooms").insert(
        selectedRooms.map((r) => ({
          regiebericht_id: berichtId,
          room_id: r.room_id,
          room_name: r.room_name,
        }))
      );

      if (error) {
        alert("INSERT ROOMS: " + error.message);
        return;
      }
    }

    if (workerRows.length > 0) {
      const { error } = await supabase.from("regiebericht_workers").insert(
        workerRows.map((w) => ({
          regiebericht_id: berichtId,
          worker_name: w.worker_name,
          von: w.von,
          bis: w.bis,
          stunden: w.stunden,
          bemerkung: w.bemerkung,
        }))
      );

      if (error) {
        alert("INSERT WORKERS: " + error.message);
        return;
      }
    }

    if (materialRows.length > 0) {
      const { error } = await supabase.from("regiebericht_materials").insert(
        materialRows.map((m) => ({
          regiebericht_id: berichtId,
          material_id: m.material_id,
          bezeichnung: m.bezeichnung,
          menge: m.menge,
          einheit: m.einheit,
        }))
      );

      if (error) {
        alert("INSERT MATERIALS: " + error.message);
        return;
      }
    }

    if (photos.length > 0) {
      for (const p of photos) {
        try {
          const url = await uploadPhoto(p.file, berichtId);

          const { error } = await supabase.from("regiebericht_photos").insert([
            {
              regiebericht_id: berichtId,
              photo_url: url,
              note: p.note || "",
            },
          ]);

          if (error) {
            alert("INSERT PHOTO: " + error.message);
            return;
          }
        } catch (err: any) {
          alert(
            "UPLOAD FOTO GREŠKA: " +
              err.message +
              "\n\nAko bucket ne postoji, napravi u Supabase Storage bucket: regiebericht-photos"
          );
          return;
        }
      }
    }

    alert("Regiebericht je sačuvan.");
  }

  function exportPrint() {
    window.print();
  }

  return (
    <main style={styles.page}>
      <div className="no-print">
        <Link href={`/baustellen/${baustelleId}`} style={styles.backLink}>
          ← Nazad na Baustelle
        </Link>
      </div>

      <h1 style={styles.title}>Regietagesbericht</h1>

      <section style={styles.box}>
        <div style={styles.headerGrid}>
          <div>
            <label style={styles.label}>Auftragnehmer</label>
            <div style={styles.readonlyBox}>{FIRMA}</div>
          </div>

          <div>
            <label style={styles.label}>Auftraggeber</label>
            <input
              value={auftraggeber}
              onChange={(e) => setAuftraggeber(e.target.value)}
              style={styles.input}
              placeholder="Auftraggeber"
            />
          </div>

          <div>
            <label style={styles.label}>Nr.</label>
            <input
              value={berichtNr}
              onChange={(e) => setBerichtNr(e.target.value)}
              style={styles.input}
              placeholder="Nr."
            />
          </div>

          <div>
            <label style={styles.label}>Datum</label>
            <input
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              style={styles.input}
            />
          </div>

          <div>
            <label style={styles.label}>Baustelle / Bauvorhaben</label>
            <div style={styles.readonlyBox}>{baustelle?.naziv || "-"}</div>
          </div>

          <div>
            <label style={styles.label}>Ort</label>
            <input
              value={ort}
              onChange={(e) => setOrt(e.target.value)}
              style={styles.input}
              placeholder="Ort"
            />
          </div>

          <div>
            <label style={styles.label}>Bauleiter</label>
            <input
              value={bauleiter}
              onChange={(e) => setBauleiter(e.target.value)}
              style={styles.input}
              placeholder="Name Bauleiter"
            />
          </div>
        </div>
      </section>

      <section style={styles.box}>
        <h2 style={styles.subtitle}>Prostorije / Bauteile</h2>

        <div className="no-print" style={styles.inlineGrid}>
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            style={styles.input}
          >
            <option value="">Odaberi prostoriju</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.naziv}
              </option>
            ))}
          </select>

          <button onClick={addRoom} style={styles.blueButton}>
            Dodaj prostoriju
          </button>
        </div>

        <div style={styles.chipBox}>
          {selectedRooms.map((r, index) => (
            <div key={index} style={styles.chip}>
              {r.room_name}
              <button
                className="no-print"
                onClick={() => removeRoom(index)}
                style={styles.smallDelete}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.box}>
        <h2 style={styles.subtitle}>Ausgeführte Arbeiten</h2>

        <textarea
          value={arbeiten}
          onChange={(e) => setArbeiten(e.target.value)}
          style={styles.textarea}
          placeholder="Opis izvedenih radova..."
        />
      </section>

      <section style={styles.box}>
        <h2 style={styles.subtitle}>Eingesetzte Arbeitskräfte</h2>

        <div className="no-print" style={styles.workerGrid}>
          <select
            value={workerName}
            onChange={(e) => setWorkerName(e.target.value)}
            style={styles.input}
          >
            <option value="">Odaberi radnika</option>
            {workers.map((w) => (
              <option key={w.id} value={w.name}>
                {w.name}
              </option>
            ))}
          </select>

          <input
            type="time"
            value={von}
            onChange={(e) => setVon(e.target.value)}
            style={styles.input}
          />

          <input
            type="time"
            value={bis}
            onChange={(e) => setBis(e.target.value)}
            style={styles.input}
          />

          <input
            value={bemerkung}
            onChange={(e) => setBemerkung(e.target.value)}
            style={styles.input}
            placeholder="Bemerkung"
          />

          <button onClick={addWorker} style={styles.blueButton}>
            Dodaj radnika
          </button>
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>von</th>
              <th style={styles.th}>bis</th>
              <th style={styles.th}>Stunden</th>
              <th style={styles.th}>Bemerkungen</th>
              <th className="no-print" style={styles.th}></th>
            </tr>
          </thead>

          <tbody>
            {workerRows.map((w, index) => (
              <tr key={index}>
                <td style={styles.td}>{w.worker_name}</td>
                <td style={styles.td}>{w.von}</td>
                <td style={styles.td}>{w.bis}</td>
                <td style={styles.td}>{w.stunden}</td>
                <td style={styles.td}>{w.bemerkung}</td>
                <td className="no-print" style={styles.td}>
                  <button
                    onClick={() => removeWorker(index)}
                    style={styles.deleteButton}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={styles.box}>
        <h2 style={styles.subtitle}>Material / Geräte / Sonstiges</h2>

        <div className="no-print" style={styles.materialGrid}>
          <select
            value={materialId}
            onChange={(e) => onMaterialSelect(e.target.value)}
            style={styles.input}
          >
            <option value="">Materijal iz kataloga</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.naziv} {m.jedinica ? `(${m.jedinica})` : ""}
              </option>
            ))}
          </select>

          <input
            value={materialName}
            onChange={(e) => setMaterialName(e.target.value)}
            style={styles.input}
            placeholder="Slobodni materijal / naziv"
          />

          <input
            type="number"
            value={menge}
            onChange={(e) => setMenge(e.target.value)}
            style={styles.input}
            placeholder="Menge"
          />

          <input
            value={einheit}
            onChange={(e) => setEinheit(e.target.value)}
            style={styles.input}
            placeholder="EH"
          />

          <button onClick={addMaterial} style={styles.blueButton}>
            Dodaj materijal
          </button>
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Menge</th>
              <th style={styles.th}>EH</th>
              <th style={styles.th}>Bezeichnung</th>
              <th className="no-print" style={styles.th}></th>
            </tr>
          </thead>

          <tbody>
            {materialRows.map((m, index) => (
              <tr key={index}>
                <td style={styles.td}>{m.menge}</td>
                <td style={styles.td}>{m.einheit}</td>
                <td style={styles.td}>{m.bezeichnung}</td>
                <td className="no-print" style={styles.td}>
                  <button
                    onClick={() => removeMaterial(index)}
                    style={styles.deleteButton}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={styles.box}>
        <h2 style={styles.subtitle}>Bilder / Fotos</h2>

        <div className="no-print">
          <input
            value={photoNote}
            onChange={(e) => setPhotoNote(e.target.value)}
            style={styles.input}
            placeholder="Napomena za slike"
          />

          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => addPhotos(e.target.files)}
            style={styles.fileInput}
          />
        </div>

        <div style={styles.photoGrid}>
          {photos.map((p, index) => (
            <div key={index} style={styles.photoCard}>
              <img src={p.preview} style={styles.photo} alt="Regiebericht" />

              {p.note && <p>{p.note}</p>}

              <button
                className="no-print"
                onClick={() => removePhoto(index)}
                style={styles.deleteButton}
              >
                Obriši
              </button>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.signatureBox}>
        <div>
          <strong>Unterschrift Auftragnehmer</strong>
          <div style={styles.signatureLine}>{POTPIS}</div>
        </div>

        <div>
          <strong>Unterschrift Auftraggeber / Bauleiter</strong>
          <div style={styles.signatureLine}>{bauleiter || "________________"}</div>
        </div>
      </section>

      <div className="no-print" style={styles.actionRow}>
        <button onClick={saveBericht} style={styles.saveButton}>
          Regiebericht speichern
        </button>

        <button onClick={exportPrint} style={styles.printButton}>
          Export / Drucken
        </button>
      </div>

<style>{`
  @media print {
    .no-print {
      display: none !important;
    }

    body {
      background: white !important;
    }

    main {
      background: white !important;
      color: black !important;
      padding: 10px !important;
    }

    input,
    textarea,
    select {
      border: none !important;
      background: white !important;
      color: black !important;
    }
  }
`}</style>
    </main>
  );
}

const styles: any = {
  page: {
    background: "#000",
    minHeight: "100vh",
    color: "white",
    padding: "30px",
  },
  backLink: {
    color: "#3b82f6",
    textDecoration: "none",
    fontWeight: "bold",
  },
  title: {
    fontSize: "56px",
    marginTop: "25px",
    marginBottom: "30px",
  },
  box: {
    background: "#111",
    padding: "20px",
    borderRadius: "18px",
    marginBottom: "22px",
    border: "1px solid #333",
  },
  subtitle: {
    color: "#60a5fa",
    marginBottom: "16px",
  },
  headerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px",
  },
  inlineGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 220px",
    gap: "14px",
  },
  workerGrid: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr 1fr 1.5fr 180px",
    gap: "12px",
    marginBottom: "18px",
  },
  materialGrid: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1.5fr 1fr 1fr 180px",
    gap: "12px",
    marginBottom: "18px",
  },
  label: {
    display: "block",
    color: "#aaa",
    marginBottom: "6px",
    fontWeight: "bold",
  },
  readonlyBox: {
    background: "#222",
    padding: "14px",
    borderRadius: "10px",
    minHeight: "48px",
  },
  input: {
    width: "100%",
    background: "#222",
    color: "white",
    border: "1px solid #333",
    padding: "14px",
    borderRadius: "10px",
    fontSize: "16px",
  },
  textarea: {
    width: "100%",
    minHeight: "180px",
    background: "#222",
    color: "white",
    border: "1px solid #333",
    padding: "14px",
    borderRadius: "10px",
    fontSize: "16px",
    resize: "vertical",
  },
  blueButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "14px 20px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  saveButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "16px 24px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px",
  },
  printButton: {
    background: "#f97316",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "16px 24px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px",
  },
  deleteButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  smallDelete: {
    marginLeft: "10px",
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  chipBox: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "15px",
  },
  chip: {
    background: "#2563eb",
    padding: "10px 14px",
    borderRadius: "999px",
    fontWeight: "bold",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "10px",
  },
  th: {
    border: "1px solid #444",
    padding: "10px",
    textAlign: "left",
    background: "#1f1f1f",
  },
  td: {
    border: "1px solid #444",
    padding: "10px",
  },
  fileInput: {
    marginTop: "12px",
    marginBottom: "15px",
    color: "white",
  },
  photoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },
  photoCard: {
    background: "#222",
    padding: "12px",
    borderRadius: "14px",
  },
  photo: {
    width: "100%",
    borderRadius: "10px",
    maxHeight: "260px",
    objectFit: "cover",
  },
  signatureBox: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: "18px",
    padding: "25px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "30px",
    marginBottom: "25px",
  },
  signatureLine: {
    marginTop: "40px",
    borderTop: "1px solid #777",
    paddingTop: "10px",
    minHeight: "40px",
  },
  actionRow: {
    display: "flex",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "40px",
  },
};