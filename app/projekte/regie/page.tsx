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

export default function ProjektRegiePage() {
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
  const [regie, setRegie] = useState<any[]>([]);
  const [regieWorkers, setRegieWorkers] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [datum, setDatum] = useState(getTodayLocalDate());
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [pauseMinuten, setPauseMinuten] = useState("30");
  const [stundenProWorker, setStundenProWorker] = useState("8.5");
  const [beschreibung, setBeschreibung] = useState("");
  const [selectedRaumId, setSelectedRaumId] = useState("");
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [status, setStatus] = useState("Wartet");

  const [filterStatus, setFilterStatus] = useState("Alle");
  const [filterDatum, setFilterDatum] = useState("");
  const [filterWorker, setFilterWorker] = useState("Alle");

  const summary = useMemo(() => {
    const wartet = regie.filter((r) => normalizeStatus(r.status) === "Wartet").length;
    const genehmigt = regie.filter((r) => normalizeStatus(r.status) === "Genehmigt").length;
    const abgelehnt = regie.filter((r) => normalizeStatus(r.status) === "Abgelehnt").length;

    const totalWorkerHours = regieWorkers.reduce(
      (sum, w) => sum + Number(w.stunden || 0),
      0
    );

    return {
      total: regie.length,
      wartet,
      genehmigt,
      abgelehnt,
      workerHours: totalWorkerHours,
      workers: regieWorkers.length,
    };
  }, [regie, regieWorkers]);

  const filteredRegie = useMemo(() => {
    return regie
      .filter((item) => {
        const currentStatus = normalizeStatus(item.status);

        if (filterStatus !== "Alle" && currentStatus !== filterStatus) return false;
        if (filterDatum && item.datum !== filterDatum) return false;

        if (filterWorker !== "Alle") {
          const workers = getWorkersForRegie(item.id);
          const hasWorker = workers.some((w) => w.worker_name === filterWorker);
          if (!hasWorker) return false;
        }

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
  }, [regie, regieWorkers, filterStatus, filterDatum, filterWorker]);

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

    const regieRes = await supabase
      .from("projekt_regie")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("datum", { ascending: false })
      .order("created_at", { ascending: false });

    if (regieRes.error) {
      alert("Greška kod učitavanja Regie: " + regieRes.error.message);
      setRegie([]);
      setRegieWorkers([]);
      setLoading(false);
      return;
    }

    const regieData = regieRes.data || [];
    setRegie(regieData);

    const regieIds = regieData.map((r) => r.id);

    if (regieIds.length > 0) {
      const workersRes = await supabase
        .from("projekt_regie_workers")
        .select("*")
        .in("regie_id", regieIds);

      if (workersRes.error) {
        alert("Greška kod učitavanja Regie radnika: " + workersRes.error.message);
        setRegieWorkers([]);
      } else {
        setRegieWorkers(workersRes.data || []);
      }
    } else {
      setRegieWorkers([]);
    }

    setLoading(false);
  }

  function clearForm() {
    setEditingId(null);
    setDatum(getTodayLocalDate());
    setStartTime("08:00");
    setEndTime("17:00");
    setPauseMinuten("30");
    setStundenProWorker("8.5");
    setBeschreibung("");
    setSelectedRaumId("");
    setSelectedWorkers([]);
    setStatus("Wartet");
  }

  function normalizeStatus(value: string | null) {
    if (value === "Genehmigt") return "Genehmigt";
    if (value === "Abgelehnt") return "Abgelehnt";
    return "Wartet";
  }

  function parseNumber(value: any) {
    return Number(String(value || "0").replace(",", "."));
  }

  function calculateHours() {
    if (!startTime || !endTime) {
      alert("Unesi početak i kraj.");
      return;
    }

    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    const pause = parseNumber(pauseMinuten);

    if (end <= start) {
      alert("Kraj mora biti poslije početka.");
      return;
    }

    const total = Math.max(0, end - start - pause);
    const hours = total / 60;

    setStundenProWorker(String(Number(hours.toFixed(2))));
  }

  function timeToMinutes(value: string) {
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
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

  function formatNumber(value: any, digits = 2) {
    const num = Number(value || 0);

    return num.toLocaleString("de-AT", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  function getRaumName(id: number | string | null) {
    if (!id) return "-";

    const raum = raeume.find((r) => Number(r.id) === Number(id));

    if (!raum) return "-";

    return `${raum.ebene ? raum.ebene + " - " : ""}${raum.raum_name}`;
  }

  function getWorkersForRegie(regieId: number) {
    return regieWorkers.filter((w) => Number(w.regie_id) === Number(regieId));
  }

  function getTotalHoursForRegie(regieId: number) {
    return getWorkersForRegie(regieId).reduce(
      (sum, w) => sum + Number(w.stunden || 0),
      0
    );
  }

  function toggleWorker(name: string) {
    setSelectedWorkers((prev) => {
      if (prev.includes(name)) {
        return prev.filter((w) => w !== name);
      }

      return [...prev, name];
    });
  }

  async function saveRegie() {
    if (savingRef.current) return;

    if (!datum) {
      alert("Odaberi datum.");
      return;
    }

    if (!startTime || !endTime) {
      alert("Unesi početak i kraj.");
      return;
    }

    if (selectedWorkers.length === 0) {
      alert("Odaberi najmanje jednog radnika.");
      return;
    }

    const hours = parseNumber(stundenProWorker);

    if (!hours || hours <= 0) {
      alert("Unesi ispravne sate po radniku.");
      return;
    }

    if (!beschreibung.trim()) {
      alert("Unesi opis Regie rada.");
      return;
    }

    savingRef.current = true;
    setSaving(true);

    const payload: any = {
      projekt_id: Number(projektId),
      datum,
      start_time: startTime,
      end_time: endTime,
      stunden_pro_worker: hours,
      raum_id: selectedRaumId ? Number(selectedRaumId) : null,
      beschreibung: beschreibung.trim(),
      status,
    };

    let regieId = editingId;

    if (editingId) {
      const { error } = await supabase
        .from("projekt_regie")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        alert("Greška kod izmjene Regie: " + error.message);
        savingRef.current = false;
        setSaving(false);
        return;
      }

      await supabase
        .from("projekt_regie_workers")
        .delete()
        .eq("regie_id", editingId);
    } else {
      payload.created_by = workerName;

      const { data, error } = await supabase
        .from("projekt_regie")
        .insert(payload)
        .select()
        .single();

      if (error) {
        alert("Greška kod dodavanja Regie: " + error.message);
        savingRef.current = false;
        setSaving(false);
        return;
      }

      regieId = data.id;
    }

    const workerPayload = selectedWorkers.map((name) => ({
      regie_id: regieId,
      worker_name: name,
      stunden: hours,
    }));

    const workersInsert = await supabase
      .from("projekt_regie_workers")
      .insert(workerPayload);

    if (workersInsert.error) {
      alert("Regie je sačuvan, ali radnici nisu dodani: " + workersInsert.error.message);
      savingRef.current = false;
      setSaving(false);
      return;
    }

    clearForm();
    setShowForm(false);
    await loadData();

    savingRef.current = false;
    setSaving(false);
  }

  function editRegie(item: any) {
    const workers = getWorkersForRegie(item.id);

    setEditingId(item.id);
    setDatum(item.datum || getTodayLocalDate());
    setStartTime(String(item.start_time || "08:00").slice(0, 5));
    setEndTime(String(item.end_time || "17:00").slice(0, 5));
    setPauseMinuten("0");
    setStundenProWorker(String(Number(item.stunden_pro_worker || 0)));
    setBeschreibung(item.beschreibung || "");
    setSelectedRaumId(item.raum_id ? String(item.raum_id) : "");
    setSelectedWorkers(workers.map((w) => w.worker_name));
    setStatus(normalizeStatus(item.status));
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteRegie(item: any) {
    const ok = confirm("Da li sigurno želiš obrisati ovaj Regie unos?");

    if (!ok) return;

    await supabase
      .from("projekt_regie_workers")
      .delete()
      .eq("regie_id", item.id);

    const { error } = await supabase
      .from("projekt_regie")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert("Greška kod brisanja Regie: " + error.message);
      return;
    }

    loadData();
  }

  async function changeStatus(item: any, newStatus: string) {
    const { error } = await supabase
      .from("projekt_regie")
      .update({ status: newStatus })
      .eq("id", item.id);

    if (error) {
      alert("Greška kod promjene statusa: " + error.message);
      return;
    }

    loadData();
  }

  function getStatusBadgeStyle(statusValue: string) {
    if (statusValue === "Genehmigt") return okBadgeStyle;
    if (statusValue === "Abgelehnt") return dangerBadgeStyle;

    return warningBadgeStyle;
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <h1 style={titleStyle}>🧾 Regie</h1>
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
            {showForm ? "Schließen" : "+ Regie"}
          </button>
        </div>
      </div>

      <h1 style={titleStyle}>🧾 Regie</h1>

      <p style={descriptionStyle}>
        Projekt: <strong>{projekt?.project_name || "-"}</strong> · Admin:{" "}
        <strong>{workerName}</strong>
      </p>

      <section style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Alle Regie</span>
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
          <span style={summaryLabelStyle}>Radnik Einträge</span>
          <strong style={summaryValueStyle}>{summary.workers}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Regie Stunden</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.workerHours)} h
          </strong>
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

          <button
            onClick={() => {
              setFilterStatus("Alle");
              setFilterDatum("");
              setFilterWorker("Alle");
            }}
            style={grayButtonStyle}
          >
            Filter löschen
          </button>
        </div>
      </section>

      <section style={infoBoxStyle}>
        <h2 style={sectionTitleStyle}>Regie Regel</h2>
        <p style={infoTextStyle}>
          Regie je za posebne radove koji se obračunavaju po satu. Odaberi više
          radnika, unesi vrijeme i opis rada. Unos ide u Freigabe / Kontrolle,
          Tagesbericht, Auswertung i Bericht / Druck.
        </p>
      </section>

      {showForm && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>
            {editingId ? "Regie bearbeiten" : "Regie erfassen"}
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
              <label style={labelStyle}>Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Ende</label>
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
                value={pauseMinuten}
                onChange={(e) => setPauseMinuten(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={calculateRowStyle}>
            <button onClick={calculateHours} type="button" style={calculateButtonStyle}>
              Stunden berechnen
            </button>

            <div>
              <label style={labelStyle}>Stunden pro Arbeiter *</label>
              <input
                type="number"
                step="0.25"
                value={stundenProWorker}
                onChange={(e) => setStundenProWorker(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={inputStyle}
              >
                <option value="Wartet">Wartet</option>
                <option value="Genehmigt">Genehmigt</option>
                <option value="Abgelehnt">Abgelehnt</option>
              </select>
            </div>
          </div>

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

          <label style={labelStyle}>Radnici *</label>
          <div style={workerGridStyle}>
            {RADNICI.map((name) => (
              <button
                key={name}
                onClick={() => toggleWorker(name)}
                type="button"
                style={{
                  ...workerButtonStyle,
                  background: selectedWorkers.includes(name) ? "#16a34a" : "#000",
                  border: selectedWorkers.includes(name)
                    ? "1px solid #16a34a"
                    : "1px solid #333",
                }}
              >
                {selectedWorkers.includes(name) ? "✓ " : ""}
                {name}
              </button>
            ))}
          </div>

          <label style={labelStyle}>Beschreibung *</label>
          <textarea
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
            placeholder="Opis Regie rada..."
            style={textareaStyle}
          />

          <div style={previewBoxStyle}>
            <strong>Pregled:</strong>{" "}
            {selectedWorkers.length} radnika × {formatNumber(parseNumber(stundenProWorker))} h ={" "}
            <strong>
              {formatNumber(selectedWorkers.length * parseNumber(stundenProWorker))} h
            </strong>
          </div>

          <div style={formButtonRowStyle}>
            <button
              onClick={saveRegie}
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
                : "Regie speichern"}
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

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Regie Liste</h2>

        {filteredRegie.length === 0 ? (
          <p style={emptyStyle}>Keine Regie Einträge gefunden.</p>
        ) : (
          <div style={regieGridStyle}>
            {filteredRegie.map((item) => {
              const workers = getWorkersForRegie(item.id);
              const statusValue = normalizeStatus(item.status);
              const totalHours = getTotalHoursForRegie(item.id);

              return (
                <div key={item.id} style={regieCardStyle}>
                  <div style={cardTopStyle}>
                    <span style={regieBadgeStyle}>Regie</span>
                    <span style={getStatusBadgeStyle(statusValue)}>{statusValue}</span>
                  </div>

                  <h3 style={regieTitleStyle}>
                    {formatDate(item.datum)} ·{" "}
                    {String(item.start_time || "").slice(0, 5)} -{" "}
                    {String(item.end_time || "").slice(0, 5)}
                  </h3>

                  <div style={regieInfoGridStyle}>
                    <div>
                      <span style={smallLabelStyle}>h / Arbeiter</span>
                      <strong>{formatNumber(item.stunden_pro_worker)} h</strong>
                    </div>

                    <div>
                      <span style={smallLabelStyle}>Arbeiter</span>
                      <strong>{workers.length}</strong>
                    </div>

                    <div>
                      <span style={smallLabelStyle}>Gesamt</span>
                      <strong>{formatNumber(totalHours)} h</strong>
                    </div>

                    <div>
                      <span style={smallLabelStyle}>Raum</span>
                      <strong>{getRaumName(item.raum_id)}</strong>
                    </div>
                  </div>

                  <p style={descriptionCardStyle}>{item.beschreibung || "-"}</p>

                  <div style={workersBoxStyle}>
                    {workers.length === 0 ? (
                      <p style={workerTextStyle}>Keine Arbeiter gespeichert.</p>
                    ) : (
                      workers.map((w) => (
                        <div key={w.id || `${item.id}-${w.worker_name}`} style={workerLineStyle}>
                          <span>{w.worker_name}</span>
                          <strong>{formatNumber(w.stunden)} h</strong>
                        </div>
                      ))
                    )}
                  </div>

                  <p style={metaTextStyle}>
                    Erstellt von: <strong>{item.created_by || "-"}</strong>
                  </p>

                  {isAdmin && (
                    <p style={metaTextStyle}>
                      Zeit der Eingabe:{" "}
                      <strong>{formatDateTime(item.created_at)}</strong>
                    </p>
                  )}

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
                    <button onClick={() => editRegie(item)} style={editButtonStyle}>
                      Bearbeiten
                    </button>

                    <button onClick={() => deleteRegie(item)} style={deleteButtonStyle}>
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
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
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
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "12px",
};

const calculateRowStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "12px",
  alignItems: "end",
  marginTop: "4px",
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
  minHeight: "110px",
  resize: "vertical",
};

const calculateButtonStyle: any = {
  background: "#f97316",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "13px",
  fontWeight: "bold",
  cursor: "pointer",
};

const workerGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: "10px",
};

const workerButtonStyle: any = {
  color: "white",
  borderRadius: "10px",
  padding: "12px",
  fontWeight: "bold",
  cursor: "pointer",
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

const regieGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: "14px",
};

const regieCardStyle: any = {
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

const regieTitleStyle: any = {
  color: "#f97316",
  margin: "12px 0 10px 0",
  fontSize: "18px",
};

const regieInfoGridStyle: any = {
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

const descriptionCardStyle: any = {
  color: "#ccc",
  fontSize: "14px",
  lineHeight: "1.45",
  margin: "12px 0",
};

const workersBoxStyle: any = {
  background: "#080808",
  border: "1px solid #222",
  borderRadius: "12px",
  padding: "10px",
};

const workerTextStyle: any = {
  color: "#aaa",
  margin: 0,
};

const workerLineStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  padding: "6px 0",
  borderBottom: "1px solid #181818",
  color: "#ddd",
  fontSize: "13px",
};

const metaTextStyle: any = {
  color: "#aaa",
  fontSize: "13px",
  margin: "8px 0",
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

const regieBadgeStyle: any = {
  background: "#7c3aed",
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