"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];
const RADNICI = ["Arnes", "Ramiz", "Abror", "Shohruh", "Harun", "Hido", "Steffi"];

function getTodayLocalDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function ProjektArbeitszeitPage() {
  const params = useParams();
  const router = useRouter();
  const savingRef = useRef(false);

  const projektId = String(params.id);

  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projekt, setProjekt] = useState<any>(null);
  const [raeume, setRaeume] = useState<any[]>([]);
  const [positionen, setPositionen] = useState<any[]>([]);
  const [zeiten, setZeiten] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [selectedWorker, setSelectedWorker] = useState("");
  const [datum, setDatum] = useState(getTodayLocalDate());
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [pauseMinutes, setPauseMinutes] = useState("30");
  const [selectedRaumId, setSelectedRaumId] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [arbeitsart, setArbeitsart] = useState("Leistung");
  const [freigabeStatus, setFreigabeStatus] = useState("Wartet");
  const [notiz, setNotiz] = useState("");

  const [filterStatus, setFilterStatus] = useState("Alle");
  const [filterDatum, setFilterDatum] = useState("");
  const [filterWorker, setFilterWorker] = useState("Alle");
  const [filterRaum, setFilterRaum] = useState("Alle");

  const filteredZeiten = useMemo(() => {
    return zeiten
      .filter((item) => {
        const status = normalizeStatus(item.freigabe_status);

        if (filterStatus !== "Alle" && status !== filterStatus) return false;
        if (filterDatum && item.datum !== filterDatum) return false;
        if (filterWorker !== "Alle" && item.worker_name !== filterWorker) return false;
        if (filterRaum !== "Alle" && String(item.raum_id || "") !== filterRaum)
          return false;

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
  }, [zeiten, filterStatus, filterDatum, filterWorker, filterRaum]);

  const summary = useMemo(() => {
    const totalHours = zeiten.reduce((sum, z) => sum + Number(z.stunden || 0), 0);

    const approvedHours = zeiten
      .filter((z) => normalizeStatus(z.freigabe_status) === "Genehmigt")
      .reduce((sum, z) => sum + Number(z.stunden || 0), 0);

    const waitingHours = zeiten
      .filter((z) => normalizeStatus(z.freigabe_status) === "Wartet")
      .reduce((sum, z) => sum + Number(z.stunden || 0), 0);

    const rejectedHours = zeiten
      .filter((z) => normalizeStatus(z.freigabe_status) === "Abgelehnt")
      .reduce((sum, z) => sum + Number(z.stunden || 0), 0);

    const wartet = zeiten.filter(
      (z) => normalizeStatus(z.freigabe_status) === "Wartet"
    ).length;

    const genehmigt = zeiten.filter(
      (z) => normalizeStatus(z.freigabe_status) === "Genehmigt"
    ).length;

    const abgelehnt = zeiten.filter(
      (z) => normalizeStatus(z.freigabe_status) === "Abgelehnt"
    ).length;

    const todayHours = zeiten
      .filter((z) => z.datum === getTodayLocalDate())
      .reduce((sum, z) => sum + Number(z.stunden || 0), 0);

    const workers = Array.from(new Set(zeiten.map((z) => z.worker_name))).filter(
      Boolean
    );

    return {
      total: zeiten.length,
      totalHours,
      approvedHours,
      waitingHours,
      rejectedHours,
      wartet,
      genehmigt,
      abgelehnt,
      todayHours,
      workerCount: workers.length,
    };
  }, [zeiten]);

  const workerRows = useMemo(() => {
    return RADNICI.map((name) => {
      const list = zeiten.filter((z) => z.worker_name === name);

      const total = list.reduce((sum, z) => sum + Number(z.stunden || 0), 0);

      const genehmigt = list
        .filter((z) => normalizeStatus(z.freigabe_status) === "Genehmigt")
        .reduce((sum, z) => sum + Number(z.stunden || 0), 0);

      const wartet = list
        .filter((z) => normalizeStatus(z.freigabe_status) === "Wartet")
        .reduce((sum, z) => sum + Number(z.stunden || 0), 0);

      return {
        name,
        total,
        genehmigt,
        wartet,
        count: list.length,
      };
    }).filter((row) => row.total > 0 || row.count > 0);
  }, [zeiten]);

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
    setSelectedWorker(name);
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

    const zeitenRes = await supabase
      .from("projekt_arbeitszeiten")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("datum", { ascending: false })
      .order("created_at", { ascending: false });

    if (zeitenRes.error) {
      alert("Greška kod učitavanja radnog vremena: " + zeitenRes.error.message);
      setZeiten([]);
      setLoading(false);
      return;
    }

    setZeiten(zeitenRes.data || []);
    setLoading(false);
  }

  function clearForm() {
    setEditingId(null);
    setSelectedWorker(workerName || "Arnes");
    setDatum(getTodayLocalDate());
    setStartTime("08:00");
    setEndTime("17:00");
    setPauseMinutes("30");
    setSelectedRaumId("");
    setSelectedPositionId("");
    setArbeitsart("Leistung");
    setFreigabeStatus("Wartet");
    setNotiz("");
  }

  function normalizeStatus(value: string | null) {
    if (value === "Genehmigt") return "Genehmigt";
    if (value === "Abgelehnt") return "Abgelehnt";
    return "Wartet";
  }

  function timeToMinutes(value: string) {
    if (!value || !value.includes(":")) return 0;

    const [h, m] = value.split(":").map(Number);

    return h * 60 + m;
  }

  function calculateHours() {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    const pause = Number(pauseMinutes || 0);

    let diff = end - start - pause;

    if (diff < 0) diff = 0;

    return diff / 60;
  }

  function setStandardTime() {
    setStartTime("08:00");
    setEndTime("17:00");
    setPauseMinutes("30");
  }

  function setEarlyTime() {
    setStartTime("07:00");
    setEndTime("16:00");
    setPauseMinutes("30");
  }

  function setShortDay() {
    setStartTime("08:00");
    setEndTime("14:00");
    setPauseMinutes("30");
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

  function checkDuplicate() {
    if (editingId) return false;

    return zeiten.some((z) => {
      return (
        z.worker_name === selectedWorker &&
        z.datum === datum &&
        String(z.start_time || "").slice(0, 5) === startTime &&
        String(z.end_time || "").slice(0, 5) === endTime &&
        String(z.raum_id || "") === String(selectedRaumId || "") &&
        String(z.lv_position_id || "") === String(selectedPositionId || "")
      );
    });
  }

  async function saveArbeitszeit() {
    if (savingRef.current) return;

    if (!selectedWorker) {
      alert("Odaberi radnika.");
      return;
    }

    if (!datum) {
      alert("Odaberi datum.");
      return;
    }

    if (!startTime || !endTime) {
      alert("Unesi početak i kraj.");
      return;
    }

    if (!selectedRaumId) {
      alert("Odaberi prostoriju.");
      return;
    }

    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);

    if (end <= start) {
      alert("Kraj rada mora biti poslije početka rada.");
      return;
    }

    const stunden = calculateHours();

    if (stunden <= 0) {
      alert("Radno vrijeme mora biti veće od 0.");
      return;
    }

    if (checkDuplicate()) {
      alert("Ovaj unos već postoji i neće biti dupliran.");
      return;
    }

    savingRef.current = true;
    setSaving(true);

    const payload: any = {
      projekt_id: Number(projektId),
      worker_name: selectedWorker,
      datum,
      start_time: startTime,
      end_time: endTime,
      pause_minutes: Number(pauseMinutes || 0),
      stunden,
      raum_id: selectedRaumId ? Number(selectedRaumId) : null,
      lv_position_id: selectedPositionId ? Number(selectedPositionId) : null,
      arbeitsart,
      freigabe_status: freigabeStatus,
      notiz: notiz.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("projekt_arbeitszeiten")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        alert("Greška kod izmjene radnog vremena: " + error.message);
        savingRef.current = false;
        setSaving(false);
        return;
      }
    } else {
      payload.created_by = workerName;

      const { error } = await supabase.from("projekt_arbeitszeiten").insert(payload);

      if (error) {
        alert("Greška kod dodavanja radnog vremena: " + error.message);
        savingRef.current = false;
        setSaving(false);
        return;
      }
    }

    clearForm();
    setShowForm(false);
    await loadData();

    savingRef.current = false;
    setSaving(false);
  }

  function editArbeitszeit(item: any) {
    setEditingId(item.id);
    setSelectedWorker(item.worker_name || workerName || "Arnes");
    setDatum(item.datum || getTodayLocalDate());
    setStartTime(String(item.start_time || "08:00").slice(0, 5));
    setEndTime(String(item.end_time || "17:00").slice(0, 5));
    setPauseMinutes(String(item.pause_minutes ?? "30"));
    setSelectedRaumId(item.raum_id ? String(item.raum_id) : "");
    setSelectedPositionId(item.lv_position_id ? String(item.lv_position_id) : "");
    setArbeitsart(item.arbeitsart || "Leistung");
    setFreigabeStatus(normalizeStatus(item.freigabe_status));
    setNotiz(item.notiz || "");
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteArbeitszeit(item: any) {
    const ok = confirm("Da li sigurno želiš obrisati ovaj unos radnog vremena?");

    if (!ok) return;

    const { error } = await supabase
      .from("projekt_arbeitszeiten")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert("Greška kod brisanja radnog vremena: " + error.message);
      return;
    }

    loadData();
  }

  async function changeStatus(item: any, newStatus: string) {
    const { error } = await supabase
      .from("projekt_arbeitszeiten")
      .update({ freigabe_status: newStatus })
      .eq("id", item.id);

    if (error) {
      alert("Greška kod promjene statusa: " + error.message);
      return;
    }

    loadData();
  }

  function getStatusBadgeStyle(statusValue: string) {
    const normalized = normalizeStatus(statusValue);

    if (normalized === "Genehmigt") return okBadgeStyle;
    if (normalized === "Abgelehnt") return dangerBadgeStyle;

    return warningBadgeStyle;
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <h1 style={titleStyle}>⏱️ Arbeitszeit</h1>
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
            disabled={saving}
            style={newButtonStyle}
          >
            {showForm ? "Schließen" : "+ Arbeitszeit"}
          </button>
        </div>
      </div>

      <h1 style={titleStyle}>⏱️ Arbeitszeit</h1>

      <p style={descriptionStyle}>
        Projekt: <strong>{projekt?.project_name || "-"}</strong> · Admin:{" "}
        <strong>{workerName}</strong>
      </p>

      <section style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Alle Einträge</span>
          <strong style={summaryValueStyle}>{summary.total}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Gesamt Stunden</span>
          <strong style={summaryValueStyle}>{formatNumber(summary.totalHours)} h</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Genehmigt</span>
          <strong style={{ ...summaryValueStyle, color: "#22c55e" }}>
            {formatNumber(summary.approvedHours)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Wartet</span>
          <strong style={{ ...summaryValueStyle, color: "#facc15" }}>
            {formatNumber(summary.waitingHours)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Abgelehnt</span>
          <strong style={{ ...summaryValueStyle, color: "#ef4444" }}>
            {formatNumber(summary.rejectedHours)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Heute</span>
          <strong style={summaryValueStyle}>{formatNumber(summary.todayHours)} h</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Radnici</span>
          <strong style={summaryValueStyle}>{summary.workerCount}</strong>
        </div>
      </section>

      <section style={filterBoxStyle}>
        <div style={filterGridStyle}>
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

          <div>
            <label style={labelStyle}>Radnik Filter</label>
            <select
              value={filterWorker}
              onChange={(e) => setFilterWorker(e.target.value)}
              style={inputStyle}
            >
              <option value="Alle">Alle</option>
              {RADNICI.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Raum Filter</label>
            <select
              value={filterRaum}
              onChange={(e) => setFilterRaum(e.target.value)}
              style={inputStyle}
            >
              <option value="Alle">Alle Räume</option>
              {raeume.map((raum) => (
                <option key={raum.id} value={raum.id}>
                  {raum.ebene ? `${raum.ebene} - ` : ""}
                  {raum.raum_name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setFilterStatus("Alle");
              setFilterDatum("");
              setFilterWorker("Alle");
              setFilterRaum("Alle");
            }}
            style={grayButtonStyle}
          >
            Filter löschen
          </button>
        </div>
      </section>

      <section style={infoBoxStyle}>
        <h2 style={sectionTitleStyle}>Arbeitszeit Regel</h2>
        <p style={infoTextStyle}>
          Standard je 08:00 - 17:00 sa 30 min pauze. Unos ide u Freigabe /
          Kontrolle. Samo Genehmigt ulazi u Tagesbericht, Auswertung i Bericht /
          Druck.
        </p>
      </section>

      {showForm && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>
            {editingId ? "Arbeitszeit bearbeiten" : "Arbeitszeit erfassen"}
          </h2>

          <div style={quickTimeGridStyle}>
            <button onClick={setStandardTime} type="button" style={quickTimeButtonStyle}>
              08:00 - 17:00 / 30 min
            </button>

            <button onClick={setEarlyTime} type="button" style={quickTimeButtonStyle}>
              07:00 - 16:00 / 30 min
            </button>

            <button onClick={setShortDay} type="button" style={quickTimeButtonStyle}>
              Kurz 08:00 - 14:00
            </button>
          </div>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Radnik *</label>
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                style={inputStyle}
              >
                <option value="">Radnik auswählen</option>
                {RADNICI.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

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

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Start *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Ende *</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Pause Minuten</label>
              <input
                type="number"
                value={pauseMinutes}
                onChange={(e) => setPauseMinutes(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Stunden</label>
              <div style={calculatedBoxStyle}>{formatNumber(calculateHours())} h</div>
            </div>
          </div>

          <label style={labelStyle}>Raum *</label>
          <select
            value={selectedRaumId}
            onChange={(e) => setSelectedRaumId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Raum auswählen</option>
            {raeume.map((raum) => (
              <option key={raum.id} value={raum.id}>
                {raum.ebene ? `${raum.ebene} - ` : ""}
                {raum.raum_name}
              </option>
            ))}
          </select>

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

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Art</label>
              <select
                value={arbeitsart}
                onChange={(e) => setArbeitsart(e.target.value)}
                style={inputStyle}
              >
                <option value="Leistung">Leistung</option>
                <option value="Vorbereitung">Vorbereitung</option>
                <option value="Nacharbeit">Nacharbeit</option>
                <option value="Aufräumen">Aufräumen</option>
                <option value="Sonstiges">Sonstiges</option>
              </select>
            </div>
          </div>

          <label style={labelStyle}>Notiz</label>
          <textarea
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            placeholder="Napomena za radno vrijeme..."
            style={textareaStyle}
          />

          <div style={previewBoxStyle}>
            <strong>Pregled:</strong> {selectedWorker || "-"} · {formatDate(datum)} ·{" "}
            {startTime} - {endTime} · Pause {pauseMinutes || 0} min ·{" "}
            <strong>{formatNumber(calculateHours())} h</strong>
          </div>

          <div style={formButtonRowStyle}>
            <button
              onClick={saveArbeitszeit}
              disabled={saving}
              style={{
                ...saveButtonStyle,
                opacity: saving ? 0.5 : 1,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving
                ? "Speichern..."
                : editingId
                ? "Änderungen speichern"
                : "Arbeitszeit speichern"}
            </button>

            <button
              onClick={() => {
                clearForm();
                setShowForm(false);
              }}
              disabled={saving}
              style={cancelButtonStyle}
            >
              Abbrechen
            </button>
          </div>
        </section>
      )}

      <section style={boxStyle}>
        <h2 style={sectionTitleStyle}>Stunden po radniku</h2>

        {workerRows.length === 0 ? (
          <p style={emptyStyle}>Nema sati.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Radnik</th>
                  <th style={thRightStyle}>Gesamt</th>
                  <th style={thRightStyle}>Genehmigt</th>
                  <th style={thRightStyle}>Wartet</th>
                  <th style={thRightStyle}>Einträge</th>
                </tr>
              </thead>

              <tbody>
                {workerRows.map((row) => (
                  <tr key={row.name}>
                    <td style={tdStyle}>
                      <strong>{row.name}</strong>
                    </td>
                    <td style={tdRightStyle}>{formatNumber(row.total)} h</td>
                    <td style={tdRightStyle}>{formatNumber(row.genehmigt)} h</td>
                    <td style={tdRightStyle}>{formatNumber(row.wartet)} h</td>
                    <td style={tdRightStyle}>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Arbeitszeit Liste</h2>

        {filteredZeiten.length === 0 ? (
          <p style={emptyStyle}>Keine Arbeitszeit Einträge gefunden.</p>
        ) : (
          <div style={zeitGridStyle}>
            {filteredZeiten.map((item) => {
              const statusValue = normalizeStatus(item.freigabe_status);

              return (
                <div key={item.id} style={zeitCardStyle}>
                  <div style={cardTopStyle}>
                    <span style={arbeitszeitBadgeStyle}>Arbeitszeit</span>
                    <span style={getStatusBadgeStyle(statusValue)}>
                      {statusValue}
                    </span>
                  </div>

                  <h3 style={zeitTitleStyle}>
                    {item.worker_name} · {String(item.start_time || "").slice(0, 5)} -{" "}
                    {String(item.end_time || "").slice(0, 5)} ·{" "}
                    {formatNumber(item.stunden)} h
                  </h3>

                  <div style={detailGridStyle}>
                    <div>
                      <span style={smallLabelStyle}>Datum</span>
                      <strong>{formatDate(item.datum)}</strong>
                    </div>

                    <div>
                      <span style={smallLabelStyle}>Pause</span>
                      <strong>{item.pause_minutes || 0} min</strong>
                    </div>

                    <div>
                      <span style={smallLabelStyle}>Raum</span>
                      <strong>{getRaumName(item.raum_id)}</strong>
                    </div>

                    <div>
                      <span style={smallLabelStyle}>Art</span>
                      <strong>{item.arbeitsart || "-"}</strong>
                    </div>

                    <div>
                      <span style={smallLabelStyle}>LV Position</span>
                      <strong>{getPositionText(item.lv_position_id)}</strong>
                    </div>

                    <div>
                      <span style={smallLabelStyle}>Erstellt von</span>
                      <strong>{item.created_by || "-"}</strong>
                    </div>
                  </div>

                  {isAdmin && (
                    <p style={metaTextStyle}>
                      Zeit der Eingabe:{" "}
                      <strong>{formatDateTime(item.created_at)}</strong>
                    </p>
                  )}

                  {item.notiz && <p style={noteTextStyle}>{item.notiz}</p>}

                  <div style={quickStatusGridStyle}>
                    <button
                      onClick={() => changeStatus(item, "Genehmigt")}
                      style={approveButtonStyle}
                    >
                      Genehmigen
                    </button>

                    <button
                      onClick={() => changeStatus(item, "Abgelehnt")}
                      style={rejectButtonStyle}
                    >
                      Ablehnen
                    </button>

                    <button
                      onClick={() => changeStatus(item, "Wartet")}
                      style={waitButtonStyle}
                    >
                      Wartet
                    </button>
                  </div>

                  <div style={actionRowStyle}>
                    <button
                      onClick={() => editArbeitszeit(item)}
                      style={editButtonStyle}
                    >
                      Bearbeiten
                    </button>

                    <button
                      onClick={() => deleteArbeitszeit(item)}
                      style={deleteButtonStyle}
                    >
                      Löschen
                    </button>
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

const quickTimeGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "10px",
  marginBottom: "12px",
};

const quickTimeButtonStyle: any = {
  background: "#000",
  color: "white",
  border: "1px solid #333",
  borderRadius: "12px",
  padding: "12px",
  fontWeight: "bold",
  cursor: "pointer",
};

const formGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
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
  minHeight: "100px",
  resize: "vertical",
};

const calculatedBoxStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "10px",
  padding: "12px",
  color: "#f97316",
  fontWeight: "bold",
};

const previewBoxStyle: any = {
  marginTop: "14px",
  background: "#000",
  border: "1px solid #333",
  borderRadius: "12px",
  padding: "12px",
  color: "#ddd",
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

const boxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "20px",
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

const tableWrapStyle: any = {
  overflowX: "auto",
};

const tableStyle: any = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "760px",
};

const thStyle: any = {
  borderBottom: "1px solid #333",
  color: "#f97316",
  padding: "10px",
  textAlign: "left",
  fontSize: "13px",
  whiteSpace: "nowrap",
};

const thRightStyle: any = {
  ...thStyle,
  textAlign: "right",
};

const tdStyle: any = {
  borderBottom: "1px solid #222",
  color: "#ddd",
  padding: "10px",
  fontSize: "13px",
  verticalAlign: "top",
};

const tdRightStyle: any = {
  ...tdStyle,
  textAlign: "right",
  whiteSpace: "nowrap",
};

const zeitGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: "14px",
};

const zeitCardStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "14px",
};

const cardTopStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
};

const zeitTitleStyle: any = {
  color: "#f97316",
  margin: "12px 0 10px 0",
  fontSize: "18px",
  lineHeight: "1.35",
};

const detailGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  background: "#080808",
  border: "1px solid #222",
  borderRadius: "12px",
  padding: "10px",
};

const smallLabelStyle: any = {
  display: "block",
  color: "#aaa",
  fontSize: "12px",
  marginBottom: "4px",
};

const metaTextStyle: any = {
  color: "#aaa",
  fontSize: "13px",
  margin: "8px 0",
};

const noteTextStyle: any = {
  color: "#ccc",
  fontSize: "13px",
  lineHeight: "1.4",
  background: "#080808",
  border: "1px solid #222",
  borderRadius: "10px",
  padding: "10px",
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

const arbeitszeitBadgeStyle: any = {
  background: "#2563eb",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
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

const dangerBadgeStyle: any = {
  background: "#dc2626",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};