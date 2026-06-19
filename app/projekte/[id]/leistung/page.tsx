"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];

function getTodayLocalDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function ProjektLeistungPage() {
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
  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [leistungen, setLeistungen] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [datum, setDatum] = useState(getTodayLocalDate());
  const [selectedRaumId, setSelectedRaumId] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [mengeIst, setMengeIst] = useState("");
  const [einheit, setEinheit] = useState("m²");
  const [faktor, setFaktor] = useState("1.00");
  const [status, setStatus] = useState("Offen");
  const [notiz, setNotiz] = useState("");

  const [filterStatus, setFilterStatus] = useState("Alle");
  const [filterDatum, setFilterDatum] = useState("");
  const [filterRaum, setFilterRaum] = useState("Alle");
  const [filterPosition, setFilterPosition] = useState("Alle");

  const filteredLeistungen = useMemo(() => {
    return leistungen
      .filter((item) => {
        const currentStatus = normalizeStatus(item.status);

        if (filterStatus !== "Alle" && currentStatus !== filterStatus) return false;
        if (filterDatum && item.datum !== filterDatum) return false;
        if (filterRaum !== "Alle" && String(item.raum_id || "") !== filterRaum)
          return false;
        if (
          filterPosition !== "Alle" &&
          String(item.lv_position_id || "") !== filterPosition
        )
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
  }, [leistungen, filterStatus, filterDatum, filterRaum, filterPosition]);

  const summary = useMemo(() => {
    const offen = leistungen.filter(
      (item) => normalizeStatus(item.status) === "Offen"
    ).length;

    const genehmigt = leistungen.filter(
      (item) => normalizeStatus(item.status) === "Genehmigt"
    ).length;

    const abgelehnt = leistungen.filter(
      (item) => normalizeStatus(item.status) === "Abgelehnt"
    ).length;

    const approvedLeistungen = leistungen.filter(
      (item) => normalizeStatus(item.status) === "Genehmigt"
    );

    const totalMenge = approvedLeistungen.reduce(
      (sum, item) => sum + Number(item.menge_ist || 0),
      0
    );

    const totalWirksameMenge = approvedLeistungen.reduce(
      (sum, item) => sum + getWirksameMenge(item),
      0
    );

    const totalEffectiveHours = approvedLeistungen.reduce(
      (sum, item) => sum + getEffectiveHours(item),
      0
    );

    const approvedArbeitszeitHours = arbeitszeiten
      .filter((item) => item.freigabe_status === "Genehmigt")
      .reduce((sum, item) => sum + Number(item.stunden || 0), 0);

    const produktivitaet =
      approvedArbeitszeitHours > 0
        ? (totalEffectiveHours / approvedArbeitszeitHours) * 100
        : 0;

    return {
      total: leistungen.length,
      offen,
      genehmigt,
      abgelehnt,
      totalMenge,
      totalWirksameMenge,
      totalEffectiveHours,
      approvedArbeitszeitHours,
      produktivitaet,
    };
  }, [leistungen, arbeitszeiten, positionen]);

  const positionRows = useMemo(() => {
    return positionen.map((pos) => {
      const related = leistungen.filter(
        (item) =>
          Number(item.lv_position_id) === Number(pos.id) &&
          normalizeStatus(item.status) !== "Abgelehnt"
      );

      const mengeIstTotal = related.reduce(
        (sum, item) => sum + Number(item.menge_ist || 0),
        0
      );

      const effectiveHours = related.reduce(
        (sum, item) => sum + getEffectiveHours(item),
        0
      );

      const mengeSoll = Number(pos.menge_soll || 0);
      const percent = mengeSoll > 0 ? (mengeIstTotal / mengeSoll) * 100 : 0;

      return {
        id: pos.id,
        position_nr: pos.position_nr,
        kurztext: pos.kurztext,
        einheit: pos.einheit || "",
        mengeSoll,
        mengeIstTotal,
        percent,
        effectiveHours,
      };
    });
  }, [positionen, leistungen]);

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

    const arbeitszeitRes = await supabase
      .from("projekt_arbeitszeiten")
      .select("*")
      .eq("projekt_id", Number(projektId));

    if (arbeitszeitRes.error) {
      alert("Greška kod učitavanja Arbeitszeit: " + arbeitszeitRes.error.message);
      setArbeitszeiten([]);
      setLoading(false);
      return;
    }

    setArbeitszeiten(arbeitszeitRes.data || []);

    const leistungRes = await supabase
      .from("projekt_leistungen")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("datum", { ascending: false })
      .order("created_at", { ascending: false });

    if (leistungRes.error) {
      alert("Greška kod učitavanja Leistung: " + leistungRes.error.message);
      setLeistungen([]);
      setLoading(false);
      return;
    }

    setLeistungen(leistungRes.data || []);
    setLoading(false);
  }

  function clearForm() {
    setEditingId(null);
    setDatum(getTodayLocalDate());
    setSelectedRaumId("");
    setSelectedPositionId("");
    setMengeIst("");
    setEinheit("m²");
    setFaktor("1.00");
    setStatus("Offen");
    setNotiz("");
  }

  function normalizeStatus(value: string | null) {
    if (value === "Genehmigt") return "Genehmigt";
    if (value === "Abgelehnt") return "Abgelehnt";
    return "Offen";
  }

  function parseNumber(value: any) {
    const num = parseFloat(String(value || "0").replace(",", "."));
    return Number.isNaN(num) ? 0 : num;
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

  function getWirksameMenge(item: any) {
    return Number(item.menge_ist || 0) * Number(item.faktor || 1);
  }

  function getEffectiveHours(item: any) {
    const pos = getPosition(item.lv_position_id);
    const minuten = Number(pos?.minuten_pro_einheit || 0);
    const menge = Number(item.menge_ist || 0);
    const faktorValue = Number(item.faktor || 1);

    return (menge * faktorValue * minuten) / 60;
  }

  function getPreviewEffectiveHours() {
    const pos = getPosition(selectedPositionId);
    const minuten = Number(pos?.minuten_pro_einheit || 0);
    const menge = parseNumber(mengeIst);
    const faktorValue = parseNumber(faktor) || 1;

    return (menge * faktorValue * minuten) / 60;
  }

  function handlePositionChange(value: string) {
    setSelectedPositionId(value);

    const pos = getPosition(value);
    if (pos?.einheit) {
      setEinheit(pos.einheit);
    }
  }

  async function saveLeistung() {
    if (savingRef.current) return;

    if (!datum) {
      alert("Odaberi datum.");
      return;
    }

    if (!selectedPositionId) {
      alert("Odaberi LV poziciju.");
      return;
    }

    const menge = parseNumber(mengeIst);
    const faktorValue = parseNumber(faktor) || 1;

    if (!menge || menge <= 0) {
      alert("Unesi ispravnu količinu.");
      return;
    }

    savingRef.current = true;
    setSaving(true);

    const payload: any = {
      projekt_id: Number(projektId),
      datum,
      raum_id: selectedRaumId ? Number(selectedRaumId) : null,
      lv_position_id: selectedPositionId ? Number(selectedPositionId) : null,
      menge_ist: menge,
      einheit: einheit || null,
      faktor: faktorValue,
      status,
      notiz: notiz.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("projekt_leistungen")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        alert("Greška kod izmjene Leistung: " + error.message);
        savingRef.current = false;
        setSaving(false);
        return;
      }
    } else {
      payload.created_by = workerName;

      const { error } = await supabase.from("projekt_leistungen").insert(payload);

      if (error) {
        alert("Greška kod dodavanja Leistung: " + error.message);
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

  function editLeistung(item: any) {
    setEditingId(item.id);
    setDatum(item.datum || getTodayLocalDate());
    setSelectedRaumId(item.raum_id ? String(item.raum_id) : "");
    setSelectedPositionId(item.lv_position_id ? String(item.lv_position_id) : "");
    setMengeIst(String(item.menge_ist || ""));
    setEinheit(item.einheit || "m²");
    setFaktor(String(item.faktor || "1.00"));
    setStatus(normalizeStatus(item.status));
    setNotiz(item.notiz || "");
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteLeistung(item: any) {
    const ok = confirm("Da li sigurno želiš obrisati ovaj Leistung unos?");

    if (!ok) return;

    const { error } = await supabase
      .from("projekt_leistungen")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert("Greška kod brisanja Leistung: " + error.message);
      return;
    }

    loadData();
  }

  async function changeStatus(item: any, newStatus: string) {
    const { error } = await supabase
      .from("projekt_leistungen")
      .update({ status: newStatus })
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

  function getProgressBadgeStyle(percent: number) {
    if (percent >= 100) return okBadgeStyle;
    if (percent >= 50) return warningBadgeStyle;
    return grayBadgeStyle;
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <h1 style={titleStyle}>✅ Leistung</h1>
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
            {showForm ? "Schließen" : "+ Leistung"}
          </button>
        </div>
      </div>

      <h1 style={titleStyle}>✅ Leistung / Produktivität</h1>

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
          <span style={summaryLabelStyle}>Offen / Wartet</span>
          <strong style={{ ...summaryValueStyle, color: "#facc15" }}>
            {summary.offen}
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
          <span style={summaryLabelStyle}>Genehmigte Menge</span>
          <strong style={summaryValueStyle}>{formatNumber(summary.totalMenge)}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Wirksame Menge</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.totalWirksameMenge)}
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Effektive Stunden</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.totalEffectiveHours)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Arbeitszeit genehmigt</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.approvedArbeitszeitHours)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Produktivität</span>
          <strong
            style={{
              ...summaryValueStyle,
              color:
                summary.produktivitaet >= 100
                  ? "#22c55e"
                  : summary.produktivitaet >= 80
                  ? "#f97316"
                  : "#ef4444",
            }}
          >
            {formatNumber(summary.produktivitaet, 0)}%
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
              <option value="Offen">Offen / Wartet</option>
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

          <div>
            <label style={labelStyle}>LV Filter</label>
            <select
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
              style={inputStyle}
            >
              <option value="Alle">Alle Positionen</option>
              {positionen.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.position_nr} - {pos.kurztext}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setFilterStatus("Alle");
              setFilterDatum("");
              setFilterRaum("Alle");
              setFilterPosition("Alle");
            }}
            style={grayButtonStyle}
          >
            Filter löschen
          </button>
        </div>
      </section>

      <section style={infoBoxStyle}>
        <h2 style={sectionTitleStyle}>Leistung Regel</h2>
        <p style={infoTextStyle}>
          Leistung je dnevni učinak po LV poziciji i prostoriji. Genehmigte
          Einträge ulaze u Freigabe / Kontrolle, Tagesbericht, Auswertung i Bericht
          / Druck. Offen znači da unos još čeka potvrdu.
        </p>
      </section>

      {showForm && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>
            {editingId ? "Leistung bearbeiten" : "Leistung erfassen"}
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
              <label style={labelStyle}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={inputStyle}
              >
                <option value="Offen">Offen / Wartet</option>
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

          <label style={labelStyle}>LV Position *</label>
          <select
            value={selectedPositionId}
            onChange={(e) => handlePositionChange(e.target.value)}
            style={inputStyle}
          >
            <option value="">LV Position auswählen</option>
            {positionen.map((pos) => (
              <option key={pos.id} value={pos.id}>
                {pos.position_nr} - {pos.kurztext}
              </option>
            ))}
          </select>

          {selectedPositionId && (
            <div style={selectedPositionBoxStyle}>
              <strong>Ausgewählte Position:</strong>{" "}
              {getPositionText(selectedPositionId)}
              <br />
              <span>
                Einheit: <strong>{getPosition(selectedPositionId)?.einheit || "-"}</strong>{" "}
                · Soll:{" "}
                <strong>
                  {formatNumber(getPosition(selectedPositionId)?.menge_soll || 0)}
                </strong>{" "}
                · Minuten/EH:{" "}
                <strong>
                  {formatNumber(
                    getPosition(selectedPositionId)?.minuten_pro_einheit || 0,
                    0
                  )}
                </strong>
              </span>
            </div>
          )}

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Menge Ist *</label>
              <input
                type="number"
                step="0.01"
                value={mengeIst}
                onChange={(e) => setMengeIst(e.target.value)}
                placeholder="z.B. 25"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Einheit</label>
              <input
                value={einheit}
                onChange={(e) => setEinheit(e.target.value)}
                placeholder="m² / lfm / Stk."
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Faktor</label>
              <input
                type="number"
                step="0.05"
                value={faktor}
                onChange={(e) => setFaktor(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <label style={labelStyle}>Notiz</label>
          <textarea
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            placeholder="Napomena za ovaj učinak..."
            style={textareaStyle}
          />

          <div style={previewBoxStyle}>
            <strong>Pregled:</strong>{" "}
            Menge {formatNumber(parseNumber(mengeIst))} × Faktor{" "}
            {formatNumber(parseNumber(faktor) || 1)} ={" "}
            <strong>{formatNumber(parseNumber(mengeIst) * (parseNumber(faktor) || 1))}</strong>{" "}
            wirksame Menge · Effektiv{" "}
            <strong>{formatNumber(getPreviewEffectiveHours())} h</strong>
          </div>

          <div style={formButtonRowStyle}>
            <button
              onClick={saveLeistung}
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
                : "Leistung speichern"}
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
        <h2 style={sectionTitleStyle}>LV Positionen Soll / Ist</h2>

        {positionRows.length === 0 ? (
          <p style={emptyStyle}>Keine LV Positionen vorhanden.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Pos.</th>
                  <th style={thStyle}>Kurztext</th>
                  <th style={thRightStyle}>Soll</th>
                  <th style={thRightStyle}>Ist</th>
                  <th style={thStyle}>EH</th>
                  <th style={thRightStyle}>%</th>
                  <th style={thRightStyle}>Effektiv h</th>
                </tr>
              </thead>

              <tbody>
                {positionRows.map((row) => (
                  <tr key={row.id}>
                    <td style={tdStyle}>{row.position_nr}</td>
                    <td style={tdStyle}>{row.kurztext}</td>
                    <td style={tdRightStyle}>{formatNumber(row.mengeSoll)}</td>
                    <td style={tdRightStyle}>{formatNumber(row.mengeIstTotal)}</td>
                    <td style={tdStyle}>{row.einheit || "-"}</td>
                    <td style={tdRightStyle}>
                      <span style={getProgressBadgeStyle(row.percent)}>
                        {formatNumber(row.percent, 0)}%
                      </span>
                    </td>
                    <td style={tdRightStyle}>
                      <strong>{formatNumber(row.effectiveHours)} h</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Leistung Liste</h2>

        {filteredLeistungen.length === 0 ? (
          <p style={emptyStyle}>Keine Leistung Einträge gefunden.</p>
        ) : (
          <div style={leistungGridStyle}>
            {filteredLeistungen.map((item) => {
              const statusValue = normalizeStatus(item.status);

              return (
                <div key={item.id} style={leistungCardStyle}>
                  <div style={cardTopStyle}>
                    <span style={leistungBadgeStyle}>Leistung</span>
                    <span style={getStatusBadgeStyle(statusValue)}>
                      {statusValue === "Offen" ? "Offen / Wartet" : statusValue}
                    </span>
                  </div>

                  <h3 style={leistungTitleStyle}>
                    {formatNumber(item.menge_ist)} {item.einheit || ""} ·{" "}
                    {getPositionText(item.lv_position_id)}
                  </h3>

                  <div style={detailGridStyle}>
                    <div>
                      <span style={smallLabelStyle}>Datum</span>
                      <strong>{formatDate(item.datum)}</strong>
                    </div>

                    <div>
                      <span style={smallLabelStyle}>Raum</span>
                      <strong>{getRaumName(item.raum_id)}</strong>
                    </div>

                    <div>
                      <span style={smallLabelStyle}>Faktor</span>
                      <strong>{formatNumber(item.faktor)}</strong>
                    </div>

                    <div>
                      <span style={smallLabelStyle}>Wirksame Menge</span>
                      <strong>{formatNumber(getWirksameMenge(item))}</strong>
                    </div>

                    <div>
                      <span style={smallLabelStyle}>Effektiv</span>
                      <strong>{formatNumber(getEffectiveHours(item))} h</strong>
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
                      onClick={() => changeStatus(item, "Offen")}
                      style={waitButtonStyle}
                    >
                      Offen
                    </button>
                  </div>

                  <div style={actionRowStyle}>
                    <button
                      onClick={() => editLeistung(item)}
                      style={editButtonStyle}
                    >
                      Bearbeiten
                    </button>

                    <button
                      onClick={() => deleteLeistung(item)}
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

const selectedPositionBoxStyle: any = {
  marginTop: "12px",
  background: "#000",
  border: "1px solid #333",
  borderRadius: "12px",
  padding: "12px",
  color: "#ddd",
  lineHeight: "1.5",
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
  minWidth: "850px",
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

const leistungGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: "14px",
};

const leistungCardStyle: any = {
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

const leistungTitleStyle: any = {
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

const leistungBadgeStyle: any = {
  background: "#16a34a",
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

const grayBadgeStyle: any = {
  background: "#4b5563",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};