"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const BUCKET = "projekt-fotos";

function getTodayLocalDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function RadnikProjektDetailPage() {
  const params = useParams();
  const router = useRouter();

  const projektId = String(params.id);

  const [workerName, setWorkerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [projekt, setProjekt] = useState<any>(null);
  const [raeume, setRaeume] = useState<any[]>([]);
  const [positionen, setPositionen] = useState<any[]>([]);

  const [datum, setDatum] = useState(getTodayLocalDate());
  const [activeForm, setActiveForm] = useState("");

  const [myArbeitszeiten, setMyArbeitszeiten] = useState<any[]>([]);
  const [myLeistungen, setMyLeistungen] = useState<any[]>([]);
  const [myRegie, setMyRegie] = useState<any[]>([]);
  const [myRegieWorkers, setMyRegieWorkers] = useState<any[]>([]);
  const [myAufgaben, setMyAufgaben] = useState<any[]>([]);
  const [myFotos, setMyFotos] = useState<any[]>([]);

  const [zeitStart, setZeitStart] = useState("");
  const [zeitEnde, setZeitEnde] = useState("");
  const [zeitPause, setZeitPause] = useState("0");
  const [zeitRaumId, setZeitRaumId] = useState("");
  const [zeitPositionId, setZeitPositionId] = useState("");
  const [arbeitsart, setArbeitsart] = useState("Leistung");
  const [zeitNotiz, setZeitNotiz] = useState("");

  const [leistungRaumId, setLeistungRaumId] = useState("");
  const [leistungPositionId, setLeistungPositionId] = useState("");
  const [leistungMenge, setLeistungMenge] = useState("");
  const [leistungNotiz, setLeistungNotiz] = useState("");

  const [regieStart, setRegieStart] = useState("");
  const [regieEnde, setRegieEnde] = useState("");
  const [regiePause, setRegiePause] = useState("0");
  const [regieRaumId, setRegieRaumId] = useState("");
  const [regieBeschreibung, setRegieBeschreibung] = useState("");

  const [aufgabeTyp, setAufgabeTyp] = useState("Aufgabe");
  const [aufgabeTitel, setAufgabeTitel] = useState("");
  const [aufgabeBeschreibung, setAufgabeBeschreibung] = useState("");
  const [aufgabePrioritaet, setAufgabePrioritaet] = useState("Normal");
  const [aufgabeRaumId, setAufgabeRaumId] = useState("");
  const [aufgabePositionId, setAufgabePositionId] = useState("");
  const [aufgabeFaellig, setAufgabeFaellig] = useState("");

  const [fotoTyp, setFotoTyp] = useState("Fortschritt");
  const [fotoTitel, setFotoTitel] = useState("");
  const [fotoBeschreibung, setFotoBeschreibung] = useState("");
  const [fotoRaumId, setFotoRaumId] = useState("");
  const [fotoPositionId, setFotoPositionId] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  const summary = useMemo(() => {
    const normalHours = myArbeitszeiten.reduce(
      (sum, z) => sum + Number(z.stunden || 0),
      0
    );

    const regieHours = myRegieWorkers.reduce(
      (sum, r) => sum + Number(r.stunden || 0),
      0
    );

    return {
      normalHours,
      regieHours,
      totalHours: normalHours + regieHours,
      leistungen: myLeistungen.length,
      aufgaben: myAufgaben.length,
      fotos: myFotos.length,
    };
  }, [
    myArbeitszeiten,
    myRegieWorkers,
    myLeistungen,
    myAufgaben,
    myFotos,
  ]);

  useEffect(() => {
    const name = localStorage.getItem("worker_name");

    if (!name) {
      router.push("/login");
      return;
    }

    setWorkerName(name);
    loadBaseData(name, datum);
  }, [router, projektId]);

  async function loadBaseData(currentWorker: string, currentDate: string) {
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

    setRaeume(raeumeRes.data || []);

    const positionenRes = await supabase
      .from("projekt_lv_positionen")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .eq("aktiv", true)
      .order("position_nr", { ascending: true });

    setPositionen(positionenRes.data || []);

    await loadDayData(currentWorker, currentDate);

    setLoading(false);
  }

  async function loadDayData(
    currentWorker: string = workerName,
    currentDate: string = datum
  ) {
    const arbeitszeitRes = await supabase
      .from("projekt_arbeitszeiten")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .eq("worker_name", currentWorker)
      .eq("datum", currentDate)
      .order("start_time", { ascending: true });

    setMyArbeitszeiten(arbeitszeitRes.data || []);

    const leistungRes = await supabase
      .from("projekt_leistungen")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .eq("created_by", currentWorker)
      .eq("datum", currentDate)
      .order("created_at", { ascending: false });

    setMyLeistungen(leistungRes.data || []);

    const regieRes = await supabase
      .from("projekt_regie")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .eq("datum", currentDate)
      .order("start_time", { ascending: true });

    const allRegie = regieRes.data || [];
    const regieIds = allRegie.map((r) => r.id);

    if (regieIds.length > 0) {
      const workersRes = await supabase
        .from("projekt_regie_workers")
        .select("*")
        .in("regie_id", regieIds)
        .eq("worker_name", currentWorker);

      const workerRows = workersRes.data || [];
      const myIds = workerRows.map((w) => Number(w.regie_id));

      setMyRegie(allRegie.filter((r) => myIds.includes(Number(r.id))));
      setMyRegieWorkers(workerRows);
    } else {
      setMyRegie([]);
      setMyRegieWorkers([]);
    }

    const aufgabenRes = await supabase
      .from("projekt_aufgaben")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("created_at", { ascending: false });

    const allAufgaben = aufgabenRes.data || [];

    setMyAufgaben(
      allAufgaben.filter((a) => {
        return (
          a.assigned_to === currentWorker ||
          a.created_by === currentWorker ||
          !a.assigned_to
        );
      })
    );

    const fotosRes = await supabase
      .from("projekt_fotos")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .eq("created_by", currentWorker)
      .eq("datum", currentDate)
      .order("created_at", { ascending: false });

    setMyFotos(fotosRes.data || []);
  }

  function parseNumber(value: string) {
    const num = parseFloat(String(value || "0").replace(",", "."));
    return Number.isNaN(num) ? 0 : num;
  }

  function calculateHours(start: string, end: string, pauseMinutes: string) {
    if (!start || !end) return 0;

    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);

    let startTotal = sh * 60 + sm;
    let endTotal = eh * 60 + em;

    if (endTotal <= startTotal) {
      endTotal += 24 * 60;
    }

    const pause = parseNumber(pauseMinutes);
    const minutes = Math.max(0, endTotal - startTotal - pause);

    return Math.round((minutes / 60) * 100) / 100;
  }

  function formatNumber(value: any, digits = 2) {
    const num = Number(value || 0);

    return num.toLocaleString("de-AT", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    const parts = String(value).split("-");
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }

    return value;
  }

  function getRaum(id: number | string | null) {
    if (!id) return null;
    return raeume.find((r) => String(r.id) === String(id)) || null;
  }

  function getPosition(id: number | string | null) {
    if (!id) return null;
    return positionen.find((p) => String(p.id) === String(id)) || null;
  }

  function getRaumName(id: number | string | null) {
    const raum = getRaum(id);
    if (!raum) return "-";

    return `${raum.ebene ? raum.ebene + " - " : ""}${raum.raum_name}`;
  }

  function getPositionText(id: number | string | null) {
    const pos = getPosition(id);
    if (!pos) return "-";

    return `${pos.position_nr} - ${pos.kurztext}`;
  }

  function getRaumFaktor(id: number | string | null) {
    const raum = getRaum(id);

    return Number(raum?.faktor || 1);
  }

  function getPositionEinheit(id: number | string | null) {
    const pos = getPosition(id);

    return pos?.einheit || "";
  }

  function getSafeFileName(originalName: string) {
    const ext = originalName.split(".").pop() || "jpg";
    const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "jpg";
    const random = Math.random().toString(36).slice(2);

    return `${Date.now()}-${random}.${cleanExt}`;
  }

  function clearZeitForm() {
    setZeitStart("");
    setZeitEnde("");
    setZeitPause("0");
    setZeitRaumId("");
    setZeitPositionId("");
    setArbeitsart("Leistung");
    setZeitNotiz("");
  }

  function clearLeistungForm() {
    setLeistungRaumId("");
    setLeistungPositionId("");
    setLeistungMenge("");
    setLeistungNotiz("");
  }

  function clearRegieForm() {
    setRegieStart("");
    setRegieEnde("");
    setRegiePause("0");
    setRegieRaumId("");
    setRegieBeschreibung("");
  }

  function clearAufgabeForm() {
    setAufgabeTyp("Aufgabe");
    setAufgabeTitel("");
    setAufgabeBeschreibung("");
    setAufgabePrioritaet("Normal");
    setAufgabeRaumId("");
    setAufgabePositionId("");
    setAufgabeFaellig("");
  }

  function clearFotoForm() {
    setFotoTyp("Fortschritt");
    setFotoTitel("");
    setFotoBeschreibung("");
    setFotoRaumId("");
    setFotoPositionId("");
    setFotoFile(null);
  }

  async function saveArbeitszeit() {
    if (!datum || !zeitStart || !zeitEnde) {
      alert("Unesi datum, start i ende.");
      return;
    }

    if (!zeitRaumId) {
      alert("Odaberi Raum.");
      return;
    }

    const stunden = calculateHours(zeitStart, zeitEnde, zeitPause);

    if (stunden <= 0) {
      alert("Stunden moraju biti veće od 0.");
      return;
    }

    setSaving(true);

    const payload = {
      projekt_id: Number(projektId),
      worker_name: workerName,
      datum,
      start_time: zeitStart,
      end_time: zeitEnde,
      pause_minutes: parseNumber(zeitPause),
      stunden,
      raum_id: Number(zeitRaumId),
      lv_position_id: zeitPositionId ? Number(zeitPositionId) : null,
      arbeitsart,
      notiz: zeitNotiz.trim() || null,
      created_by: workerName,
    };

    const { error } = await supabase.from("projekt_arbeitszeiten").insert(payload);

    if (error) {
      alert("Greška kod spremanja Arbeitszeit: " + error.message);
      setSaving(false);
      return;
    }

    clearZeitForm();
    setActiveForm("");
    await loadDayData(workerName, datum);
    setSaving(false);
  }

  async function saveLeistung() {
    if (!datum || !leistungRaumId || !leistungPositionId) {
      alert("Odaberi datum, Raum i LV Position.");
      return;
    }

    const menge = parseNumber(leistungMenge);

    if (menge <= 0) {
      alert("Menge mora biti veća od 0.");
      return;
    }

    const faktor = getRaumFaktor(leistungRaumId);
    const einheit = getPositionEinheit(leistungPositionId);

    setSaving(true);

    const payload = {
      projekt_id: Number(projektId),
      datum,
      raum_id: Number(leistungRaumId),
      lv_position_id: Number(leistungPositionId),
      menge_ist: menge,
      einheit,
      faktor,
      wirksame_menge: menge * faktor,
      status: "Offen",
      notiz: leistungNotiz.trim() || null,
      created_by: workerName,
    };

    const { error } = await supabase.from("projekt_leistungen").insert(payload);

    if (error) {
      alert("Greška kod spremanja Leistung: " + error.message);
      setSaving(false);
      return;
    }

    clearLeistungForm();
    setActiveForm("");
    await loadDayData(workerName, datum);
    setSaving(false);
  }

  async function saveRegie() {
    if (!datum || !regieStart || !regieEnde || !regieRaumId) {
      alert("Unesi datum, vrijeme i Raum.");
      return;
    }

    if (!regieBeschreibung.trim()) {
      alert("Unesi opis Regie rada.");
      return;
    }

    const stunden = calculateHours(regieStart, regieEnde, regiePause);

    if (stunden <= 0) {
      alert("Regie Stunden moraju biti veće od 0.");
      return;
    }

    setSaving(true);

    const payload = {
      projekt_id: Number(projektId),
      raum_id: Number(regieRaumId),
      datum,
      start_time: regieStart,
      end_time: regieEnde,
      pause_minutes: parseNumber(regiePause),
      stunden_pro_worker: stunden,
      beschreibung: regieBeschreibung.trim(),
      status: "Wartet",
      auftraggeber: projekt?.auftraggeber || null,
      bauleiter: projekt?.bauleiter || null,
      created_by: workerName,
    };

    const regieRes = await supabase
      .from("projekt_regie")
      .insert(payload)
      .select()
      .single();

    if (regieRes.error) {
      alert("Greška kod spremanja Regie: " + regieRes.error.message);
      setSaving(false);
      return;
    }

    const { error: workerError } = await supabase
      .from("projekt_regie_workers")
      .insert({
        regie_id: regieRes.data.id,
        worker_name: workerName,
        stunden,
      });

    if (workerError) {
      alert("Regie je spremljen, ali radnik nije povezan: " + workerError.message);
      setSaving(false);
      return;
    }

    clearRegieForm();
    setActiveForm("");
    await loadDayData(workerName, datum);
    setSaving(false);
  }

  async function saveAufgabe() {
    if (!aufgabeTitel.trim()) {
      alert("Unesi naslov.");
      return;
    }

    setSaving(true);

    const payload = {
      projekt_id: Number(projektId),
      datum,
      typ: aufgabeTyp,
      titel: aufgabeTitel.trim(),
      beschreibung: aufgabeBeschreibung.trim() || null,
      prioritaet: aufgabePrioritaet,
      status: "Offen",
      assigned_to: workerName,
      faellig_bis: aufgabeFaellig || null,
      erledigt_am: null,
      raum_id: aufgabeRaumId ? Number(aufgabeRaumId) : null,
      lv_position_id: aufgabePositionId ? Number(aufgabePositionId) : null,
      created_by: workerName,
    };

    const { error } = await supabase.from("projekt_aufgaben").insert(payload);

    if (error) {
      alert("Greška kod spremanja Aufgabe: " + error.message);
      setSaving(false);
      return;
    }

    clearAufgabeForm();
    setActiveForm("");
    await loadDayData(workerName, datum);
    setSaving(false);
  }

  async function saveFoto() {
    if (!datum) {
      alert("Odaberi datum.");
      return;
    }

    if (!fotoTitel.trim()) {
      alert("Unesi naslov slike.");
      return;
    }

    if (!fotoFile) {
      alert("Odaberi sliku.");
      return;
    }

    setUploading(true);

    const safeName = getSafeFileName(fotoFile.name);
    const storagePath = `${projektId}/${workerName}/${safeName}`;

    const uploadRes = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fotoFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadRes.error) {
      alert("Greška kod upload slike: " + uploadRes.error.message);
      setUploading(false);
      return;
    }

    const publicUrlRes = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    const payload = {
      projekt_id: Number(projektId),
      datum,
      raum_id: fotoRaumId ? Number(fotoRaumId) : null,
      lv_position_id: fotoPositionId ? Number(fotoPositionId) : null,
      titel: fotoTitel.trim(),
      beschreibung: fotoBeschreibung.trim() || null,
      typ: fotoTyp,
      foto_url: publicUrlRes.data.publicUrl,
      storage_path: storagePath,
      created_by: workerName,
    };

    const { error } = await supabase.from("projekt_fotos").insert(payload);

    if (error) {
      alert("Greška kod spremanja slike: " + error.message);
      setUploading(false);
      return;
    }

    clearFotoForm();
    setActiveForm("");
    await loadDayData(workerName, datum);
    setUploading(false);
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

    await loadDayData(workerName, datum);
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <Link href="/projekte/radnik" style={backStyle}>
          ← Zurück zu Projekte
        </Link>

        <h1 style={titleStyle}>👷 Projekt</h1>
        <p style={loadingStyle}>Wird geladen...</p>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <Link href="/projekte/radnik" style={backStyle}>
        ← Zurück zu Projekte
      </Link>

      <h1 style={titleStyle}>👷 {projekt?.project_name || "Projekt"}</h1>

      <p style={descriptionStyle}>
        Radnik: <strong>{workerName}</strong>
      </p>

      <section style={dateBoxStyle}>
        <label style={labelStyle}>Datum</label>
        <div style={dateRowStyle}>
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            style={inputStyle}
          />

          <button
            onClick={() => loadDayData(workerName, datum)}
            style={blueButtonStyle}
          >
            Laden
          </button>
        </div>
      </section>

      <section style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Normal h</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.normalHours)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Regie h</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.regieHours)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Gesamt</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.totalHours)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Fotos</span>
          <strong style={summaryValueStyle}>{summary.fotos}</strong>
        </div>
      </section>

      <section style={buttonGridStyle}>
        <button
          onClick={() => setActiveForm(activeForm === "zeit" ? "" : "zeit")}
          style={greenButtonStyle}
        >
          ⏱️ Arbeitszeit
        </button>

        <button
          onClick={() =>
            setActiveForm(activeForm === "leistung" ? "" : "leistung")
          }
          style={blueButtonFullStyle}
        >
          ✅ Leistung
        </button>

        <button
          onClick={() => setActiveForm(activeForm === "regie" ? "" : "regie")}
          style={orangeButtonStyle}
        >
          🧾 Regie
        </button>

        <button
          onClick={() =>
            setActiveForm(activeForm === "aufgabe" ? "" : "aufgabe")
          }
          style={purpleButtonStyle}
        >
          ⚠️ Aufgabe
        </button>

        <button
          onClick={() => setActiveForm(activeForm === "foto" ? "" : "foto")}
          style={photoButtonStyle}
        >
          📸 Foto
        </button>
      </section>

      {activeForm === "zeit" && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>Arbeitszeit eintragen</h2>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Start</label>
              <input
                type="time"
                value={zeitStart}
                onChange={(e) => setZeitStart(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Ende</label>
              <input
                type="time"
                value={zeitEnde}
                onChange={(e) => setZeitEnde(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Pause Minuten</label>
              <input
                value={zeitPause}
                onChange={(e) => setZeitPause(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <label style={labelStyle}>Raum *</label>
          <select
            value={zeitRaumId}
            onChange={(e) => setZeitRaumId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Raum wählen</option>
            {raeume.map((raum) => (
              <option key={raum.id} value={raum.id}>
                {raum.ebene ? `${raum.ebene} - ` : ""}
                {raum.raum_name}
              </option>
            ))}
          </select>

          <label style={labelStyle}>LV Position</label>
          <select
            value={zeitPositionId}
            onChange={(e) => setZeitPositionId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Ohne LV Position</option>
            {positionen.map((pos) => (
              <option key={pos.id} value={pos.id}>
                {pos.position_nr} - {pos.kurztext}
              </option>
            ))}
          </select>

          <label style={labelStyle}>Arbeitsart</label>
          <select
            value={arbeitsart}
            onChange={(e) => setArbeitsart(e.target.value)}
            style={inputStyle}
          >
            <option value="Leistung">Leistung</option>
            <option value="Vorbereitung">Vorbereitung</option>
            <option value="Material">Material</option>
            <option value="Reinigung">Reinigung</option>
            <option value="Sonstiges">Sonstiges</option>
          </select>

          <label style={labelStyle}>Notiz</label>
          <textarea
            value={zeitNotiz}
            onChange={(e) => setZeitNotiz(e.target.value)}
            style={textareaStyle}
          />

          <button
            onClick={saveArbeitszeit}
            disabled={saving}
            style={saveButtonStyle}
          >
            {saving ? "Speichern..." : "Arbeitszeit speichern"}
          </button>
        </section>
      )}

      {activeForm === "leistung" && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>Leistung eintragen</h2>

          <p style={hintStyle}>
            Wichtig: Leistung nur einmal pro Raum / LV Position eintragen, nicht
            jeder Radnik separat.
          </p>

          <label style={labelStyle}>Raum *</label>
          <select
            value={leistungRaumId}
            onChange={(e) => setLeistungRaumId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Raum wählen</option>
            {raeume.map((raum) => (
              <option key={raum.id} value={raum.id}>
                {raum.ebene ? `${raum.ebene} - ` : ""}
                {raum.raum_name}
              </option>
            ))}
          </select>

          <label style={labelStyle}>LV Position *</label>
          <select
            value={leistungPositionId}
            onChange={(e) => setLeistungPositionId(e.target.value)}
            style={inputStyle}
          >
            <option value="">LV Position wählen</option>
            {positionen.map((pos) => (
              <option key={pos.id} value={pos.id}>
                {pos.position_nr} - {pos.kurztext} | {pos.einheit}
              </option>
            ))}
          </select>

          <label style={labelStyle}>
            Menge{" "}
            {leistungPositionId ? `(${getPositionEinheit(leistungPositionId)})` : ""}
          </label>
          <input
            value={leistungMenge}
            onChange={(e) => setLeistungMenge(e.target.value)}
            placeholder="z.B. 12,5"
            style={inputStyle}
          />

          <label style={labelStyle}>Notiz</label>
          <textarea
            value={leistungNotiz}
            onChange={(e) => setLeistungNotiz(e.target.value)}
            style={textareaStyle}
          />

          <button
            onClick={saveLeistung}
            disabled={saving}
            style={saveButtonStyle}
          >
            {saving ? "Speichern..." : "Leistung speichern"}
          </button>
        </section>
      )}

      {activeForm === "regie" && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>Regie melden</h2>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Start</label>
              <input
                type="time"
                value={regieStart}
                onChange={(e) => setRegieStart(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Ende</label>
              <input
                type="time"
                value={regieEnde}
                onChange={(e) => setRegieEnde(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Pause Minuten</label>
              <input
                value={regiePause}
                onChange={(e) => setRegiePause(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <label style={labelStyle}>Raum *</label>
          <select
            value={regieRaumId}
            onChange={(e) => setRegieRaumId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Raum wählen</option>
            {raeume.map((raum) => (
              <option key={raum.id} value={raum.id}>
                {raum.ebene ? `${raum.ebene} - ` : ""}
                {raum.raum_name}
              </option>
            ))}
          </select>

          <label style={labelStyle}>Beschreibung *</label>
          <textarea
            value={regieBeschreibung}
            onChange={(e) => setRegieBeschreibung(e.target.value)}
            placeholder="Opis Regie rada"
            style={textareaStyle}
          />

          <button onClick={saveRegie} disabled={saving} style={saveButtonStyle}>
            {saving ? "Speichern..." : "Regie speichern"}
          </button>
        </section>
      )}

      {activeForm === "aufgabe" && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>Aufgabe / Mangel melden</h2>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Typ</label>
              <select
                value={aufgabeTyp}
                onChange={(e) => setAufgabeTyp(e.target.value)}
                style={inputStyle}
              >
                <option value="Aufgabe">Aufgabe</option>
                <option value="Mangel">Mangel</option>
                <option value="Info">Info</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Priorität</label>
              <select
                value={aufgabePrioritaet}
                onChange={(e) => setAufgabePrioritaet(e.target.value)}
                style={inputStyle}
              >
                <option value="Niedrig">Niedrig</option>
                <option value="Normal">Normal</option>
                <option value="Hoch">Hoch</option>
                <option value="Dringend">Dringend</option>
              </select>
            </div>
          </div>

          <label style={labelStyle}>Titel *</label>
          <input
            value={aufgabeTitel}
            onChange={(e) => setAufgabeTitel(e.target.value)}
            placeholder="z.B. Bad EG Mangel an Wand"
            style={inputStyle}
          />

          <label style={labelStyle}>Beschreibung</label>
          <textarea
            value={aufgabeBeschreibung}
            onChange={(e) => setAufgabeBeschreibung(e.target.value)}
            style={textareaStyle}
          />

          <label style={labelStyle}>Raum</label>
          <select
            value={aufgabeRaumId}
            onChange={(e) => setAufgabeRaumId(e.target.value)}
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

          <label style={labelStyle}>LV Position</label>
          <select
            value={aufgabePositionId}
            onChange={(e) => setAufgabePositionId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Ohne LV Position</option>
            {positionen.map((pos) => (
              <option key={pos.id} value={pos.id}>
                {pos.position_nr} - {pos.kurztext}
              </option>
            ))}
          </select>

          <label style={labelStyle}>Fällig bis</label>
          <input
            type="date"
            value={aufgabeFaellig}
            onChange={(e) => setAufgabeFaellig(e.target.value)}
            style={inputStyle}
          />

          <button
            onClick={saveAufgabe}
            disabled={saving}
            style={saveButtonStyle}
          >
            {saving ? "Speichern..." : "Aufgabe speichern"}
          </button>
        </section>
      )}

      {activeForm === "foto" && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>Foto hochladen</h2>

          <label style={labelStyle}>Typ</label>
          <select
            value={fotoTyp}
            onChange={(e) => setFotoTyp(e.target.value)}
            style={inputStyle}
          >
            <option value="Fortschritt">Fortschritt</option>
            <option value="Mangel">Mangel</option>
            <option value="Vorher">Vorher</option>
            <option value="Nachher">Nachher</option>
            <option value="Sonstiges">Sonstiges</option>
          </select>

          <label style={labelStyle}>Titel *</label>
          <input
            value={fotoTitel}
            onChange={(e) => setFotoTitel(e.target.value)}
            placeholder="z.B. Bad EG Abdichtung fertig"
            style={inputStyle}
          />

          <label style={labelStyle}>Beschreibung</label>
          <textarea
            value={fotoBeschreibung}
            onChange={(e) => setFotoBeschreibung(e.target.value)}
            placeholder="Opis slike"
            style={textareaStyle}
          />

          <label style={labelStyle}>Raum</label>
          <select
            value={fotoRaumId}
            onChange={(e) => setFotoRaumId(e.target.value)}
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

          <label style={labelStyle}>LV Position</label>
          <select
            value={fotoPositionId}
            onChange={(e) => setFotoPositionId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Ohne LV Position</option>
            {positionen.map((pos) => (
              <option key={pos.id} value={pos.id}>
                {pos.position_nr} - {pos.kurztext}
              </option>
            ))}
          </select>

          <label style={labelStyle}>Foto *</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
            style={inputStyle}
          />

          <button
            onClick={saveFoto}
            disabled={uploading}
            style={{
              ...saveButtonStyle,
              opacity: uploading ? 0.5 : 1,
            }}
          >
            {uploading ? "Foto wird gespeichert..." : "Foto speichern"}
          </button>
        </section>
      )}

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Meine Einträge am {formatDate(datum)}</h2>

        <h3 style={subTitleStyle}>Arbeitszeit</h3>

        {myArbeitszeiten.length === 0 ? (
          <p style={emptyStyle}>Keine Arbeitszeit vorhanden.</p>
        ) : (
          myArbeitszeiten.map((z) => (
            <div key={z.id} style={miniCardStyle}>
              <strong>
                {String(z.start_time || "").slice(0, 5)} -{" "}
                {String(z.end_time || "").slice(0, 5)} |{" "}
                {formatNumber(z.stunden)} h
              </strong>
              <p style={miniTextStyle}>Raum: {getRaumName(z.raum_id)}</p>
              <p style={miniTextStyle}>LV: {getPositionText(z.lv_position_id)}</p>
              <p style={miniTextStyle}>Art: {z.arbeitsart || "-"}</p>
            </div>
          ))
        )}

        <h3 style={subTitleStyle}>Leistung</h3>

        {myLeistungen.length === 0 ? (
          <p style={emptyStyle}>Keine Leistung vorhanden.</p>
        ) : (
          myLeistungen.map((l) => (
            <div key={l.id} style={miniCardStyle}>
              <strong>
                {formatNumber(l.menge_ist)} {l.einheit || ""}
              </strong>
              <p style={miniTextStyle}>Raum: {getRaumName(l.raum_id)}</p>
              <p style={miniTextStyle}>LV: {getPositionText(l.lv_position_id)}</p>
              <p style={miniTextStyle}>Status: {l.status || "Offen"}</p>
            </div>
          ))
        )}

        <h3 style={subTitleStyle}>Regie</h3>

        {myRegie.length === 0 ? (
          <p style={emptyStyle}>Keine Regie vorhanden.</p>
        ) : (
          myRegie.map((r) => (
            <div key={r.id} style={miniCardStyle}>
              <strong>
                {String(r.start_time || "").slice(0, 5)} -{" "}
                {String(r.end_time || "").slice(0, 5)} |{" "}
                {formatNumber(r.stunden_pro_worker)} h
              </strong>
              <p style={miniTextStyle}>Raum: {getRaumName(r.raum_id)}</p>
              <p style={miniTextStyle}>Status: {r.status || "Wartet"}</p>
              <p style={miniTextStyle}>{r.beschreibung}</p>
            </div>
          ))
        )}

        <h3 style={subTitleStyle}>Fotos</h3>

        {myFotos.length === 0 ? (
          <p style={emptyStyle}>Keine Fotos vorhanden.</p>
        ) : (
          <div style={photoGridStyle}>
            {myFotos.map((foto) => (
              <div key={foto.id} style={photoCardStyle}>
                <a href={foto.foto_url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={foto.foto_url}
                    alt={foto.titel || "Foto"}
                    style={photoStyle}
                  />
                </a>

                <div style={photoBodyStyle}>
                  <strong>{foto.titel || "-"}</strong>
                  <p style={miniTextStyle}>Typ: {foto.typ || "-"}</p>
                  <p style={miniTextStyle}>Raum: {getRaumName(foto.raum_id)}</p>

                  <button
                    onClick={() => deleteFoto(foto)}
                    style={deleteFotoButtonStyle}
                  >
                    Foto löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h3 style={subTitleStyle}>Aufgaben / Mängel</h3>

        {myAufgaben.length === 0 ? (
          <p style={emptyStyle}>Keine Aufgaben vorhanden.</p>
        ) : (
          myAufgaben.slice(0, 10).map((a) => (
            <div key={a.id} style={miniCardStyle}>
              <strong>
                {a.typ}: {a.titel}
              </strong>
              <p style={miniTextStyle}>Status: {a.status}</p>
              <p style={miniTextStyle}>Priorität: {a.prioritaet}</p>
              <p style={miniTextStyle}>Raum: {getRaumName(a.raum_id)}</p>
            </div>
          ))
        )}
      </section>
    </main>
  );
}

const mainStyle: any = {
  background: "#000",
  minHeight: "100vh",
  color: "white",
  padding: "18px",
};

const backStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "16px",
};

const titleStyle: any = {
  fontSize: "32px",
  color: "#f97316",
  margin: "18px 0 8px 0",
};

const descriptionStyle: any = {
  color: "#bbb",
  marginBottom: "18px",
};

const loadingStyle: any = {
  color: "#aaa",
};

const dateBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "16px",
  marginBottom: "16px",
};

const dateRowStyle: any = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "10px",
};

const labelStyle: any = {
  display: "block",
  color: "#ddd",
  fontWeight: "bold",
  marginBottom: "7px",
  marginTop: "12px",
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

const textareaStyle: any = {
  ...inputStyle,
  minHeight: "95px",
  resize: "vertical",
};

const summaryGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "10px",
  marginBottom: "16px",
};

const summaryCardStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "14px",
  padding: "13px",
};

const summaryLabelStyle: any = {
  display: "block",
  color: "#aaa",
  fontSize: "12px",
  marginBottom: "5px",
};

const summaryValueStyle: any = {
  color: "#f97316",
  fontSize: "20px",
};

const buttonGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginBottom: "18px",
};

const greenButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "14px",
  padding: "15px 10px",
  fontSize: "15px",
  fontWeight: "bold",
  cursor: "pointer",
};

const blueButtonFullStyle: any = {
  ...greenButtonStyle,
  background: "#2563eb",
};

const orangeButtonStyle: any = {
  ...greenButtonStyle,
  background: "#ca8a04",
};

const purpleButtonStyle: any = {
  ...greenButtonStyle,
  background: "#9333ea",
};

const photoButtonStyle: any = {
  ...greenButtonStyle,
  background: "#be123c",
  gridColumn: "1 / -1",
};

const blueButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "0 16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const formBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "16px",
  marginBottom: "18px",
};

const formTitleStyle: any = {
  color: "#f97316",
  marginTop: 0,
};

const formGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: "10px",
};

const hintStyle: any = {
  color: "#facc15",
  background: "#1f1600",
  border: "1px solid #ca8a04",
  borderRadius: "10px",
  padding: "10px",
  fontSize: "13px",
};

const saveButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "14px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  width: "100%",
  marginTop: "16px",
};

const listBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "16px",
  marginBottom: "20px",
};

const sectionTitleStyle: any = {
  color: "#f97316",
  marginTop: 0,
};

const subTitleStyle: any = {
  color: "#f97316",
  fontSize: "17px",
  marginTop: "18px",
};

const emptyStyle: any = {
  color: "#aaa",
  fontSize: "14px",
};

const miniCardStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "12px",
  padding: "12px",
  marginBottom: "10px",
};

const miniTextStyle: any = {
  color: "#ccc",
  fontSize: "13px",
  margin: "5px 0",
};

const photoGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "12px",
};

const photoCardStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "12px",
  overflow: "hidden",
};

const photoStyle: any = {
  width: "100%",
  height: "220px",
  objectFit: "cover",
  display: "block",
};

const photoBodyStyle: any = {
  padding: "12px",
};

const deleteFotoButtonStyle: any = {
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "10px",
  fontWeight: "bold",
  cursor: "pointer",
  width: "100%",
  marginTop: "10px",
};