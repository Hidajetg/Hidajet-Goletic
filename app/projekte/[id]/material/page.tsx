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

export default function ProjektMaterialPage() {
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
  const [materialien, setMaterialien] = useState<any[]>([]);
  const [bewegungen, setBewegungen] = useState<any[]>([]);

  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showBewegungForm, setShowBewegungForm] = useState(false);

  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);
  const [editingBewegungId, setEditingBewegungId] = useState<number | null>(null);

  const [materialName, setMaterialName] = useState("");
  const [gruppe, setGruppe] = useState("");
  const [einheit, setEinheit] = useState("Stk.");
  const [mengePlan, setMengePlan] = useState("");
  const [mindestbestand, setMindestbestand] = useState("");
  const [materialNotiz, setMaterialNotiz] = useState("");

  const [bewegungDatum, setBewegungDatum] = useState(getTodayLocalDate());
  const [bewegungMaterialId, setBewegungMaterialId] = useState("");
  const [bewegungTyp, setBewegungTyp] = useState("Verbrauch");
  const [bewegungMenge, setBewegungMenge] = useState("");
  const [bewegungRaumId, setBewegungRaumId] = useState("");
  const [bewegungPositionId, setBewegungPositionId] = useState("");
  const [bewegungNotiz, setBewegungNotiz] = useState("");

  const [filterMaterial, setFilterMaterial] = useState("Alle");
  const [filterTyp, setFilterTyp] = useState("Alle");
  const [filterDatum, setFilterDatum] = useState("");

  const materialRows = useMemo(() => {
    return materialien
      .map((mat) => {
        const entries = bewegungen.filter(
          (b) => Number(b.material_id) === Number(mat.id)
        );

        const zugang = entries
          .filter((b) => b.typ === "Zugang")
          .reduce((sum, b) => sum + Number(b.menge || 0), 0);

        const verbrauch = entries
          .filter((b) => b.typ === "Verbrauch")
          .reduce((sum, b) => sum + Number(b.menge || 0), 0);

        const rueckgabe = entries
          .filter((b) => b.typ === "Rückgabe")
          .reduce((sum, b) => sum + Number(b.menge || 0), 0);

        const plan = Number(mat.menge_plan || 0);
        const mindest = Number(mat.mindestbestand || 0);
        const rest = plan + zugang + rueckgabe - verbrauch;

        return {
          ...mat,
          plan,
          zugang,
          verbrauch,
          rueckgabe,
          rest,
          mindest,
          warnung: mindest > 0 && rest <= mindest,
        };
      })
      .sort((a, b) => String(a.material_name || "").localeCompare(String(b.material_name || "")));
  }, [materialien, bewegungen]);

  const filteredBewegungen = useMemo(() => {
    return bewegungen
      .filter((item) => {
        if (filterMaterial !== "Alle" && String(item.material_id || "") !== filterMaterial)
          return false;

        if (filterTyp !== "Alle" && item.typ !== filterTyp) return false;

        if (filterDatum && item.datum !== filterDatum) return false;

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
  }, [bewegungen, filterMaterial, filterTyp, filterDatum]);

  const summary = useMemo(() => {
    const plan = materialRows.reduce((sum, m) => sum + Number(m.plan || 0), 0);
    const zugang = materialRows.reduce((sum, m) => sum + Number(m.zugang || 0), 0);
    const verbrauch = materialRows.reduce(
      (sum, m) => sum + Number(m.verbrauch || 0),
      0
    );
    const rueckgabe = materialRows.reduce(
      (sum, m) => sum + Number(m.rueckgabe || 0),
      0
    );
    const rest = materialRows.reduce((sum, m) => sum + Number(m.rest || 0), 0);
    const warnungen = materialRows.filter((m) => m.warnung).length;

    return {
      materialien: materialien.length,
      bewegungen: bewegungen.length,
      plan,
      zugang,
      verbrauch,
      rueckgabe,
      rest,
      warnungen,
    };
  }, [materialRows, materialien, bewegungen]);

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
      .order("position_nr", { ascending: true });

    if (positionenRes.error) {
      alert("Greška kod učitavanja LV pozicija: " + positionenRes.error.message);
      setPositionen([]);
      setLoading(false);
      return;
    }

    setPositionen(positionenRes.data || []);

    const materialRes = await supabase
      .from("projekt_materialien")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("material_name", { ascending: true });

    if (materialRes.error) {
      alert("Greška kod učitavanja materijala: " + materialRes.error.message);
      setMaterialien([]);
      setLoading(false);
      return;
    }

    setMaterialien(materialRes.data || []);

    const bewegungRes = await supabase
      .from("projekt_material_bewegungen")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("datum", { ascending: false })
      .order("created_at", { ascending: false });

    if (bewegungRes.error) {
      alert("Greška kod učitavanja kretanja materijala: " + bewegungRes.error.message);
      setBewegungen([]);
      setLoading(false);
      return;
    }

    setBewegungen(bewegungRes.data || []);
    setLoading(false);
  }

  function clearMaterialForm() {
    setEditingMaterialId(null);
    setMaterialName("");
    setGruppe("");
    setEinheit("Stk.");
    setMengePlan("");
    setMindestbestand("");
    setMaterialNotiz("");
  }

  function clearBewegungForm() {
    setEditingBewegungId(null);
    setBewegungDatum(getTodayLocalDate());
    setBewegungMaterialId("");
    setBewegungTyp("Verbrauch");
    setBewegungMenge("");
    setBewegungRaumId("");
    setBewegungPositionId("");
    setBewegungNotiz("");
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

  function getMaterial(id: number | string | null) {
    if (!id) return null;
    return materialien.find((m) => String(m.id) === String(id)) || null;
  }

  function getMaterialRow(id: number | string | null) {
    if (!id) return null;
    return materialRows.find((m) => String(m.id) === String(id)) || null;
  }

  function getMaterialName(id: number | string | null) {
    const mat = getMaterial(id);
    if (!mat) return "-";

    return mat.material_name || "-";
  }

  function getMaterialEinheit(id: number | string | null) {
    const mat = getMaterial(id);
    if (!mat) return "";

    return mat.einheit || "";
  }

  function getRaumName(id: number | string | null) {
    if (!id) return "-";

    const raum = raeume.find((r) => String(r.id) === String(id));
    if (!raum) return "-";

    return `${raum.ebene ? raum.ebene + " - " : ""}${raum.raum_name}`;
  }

  function getPositionText(id: number | string | null) {
    if (!id) return "-";

    const pos = positionen.find((p) => String(p.id) === String(id));
    if (!pos) return "-";

    return `${pos.position_nr} - ${pos.kurztext}`;
  }

  async function saveMaterial() {
    if (savingRef.current) return;

    if (!materialName.trim()) {
      alert("Unesi naziv materijala.");
      return;
    }

    const plan = parseNumber(mengePlan);
    const mindest = parseNumber(mindestbestand);

    savingRef.current = true;
    setSaving(true);

    const payload: any = {
      projekt_id: Number(projektId),
      material_name: materialName.trim(),
      gruppe: gruppe.trim() || null,
      einheit: einheit.trim() || "Stk.",
      menge_plan: plan,
      mindestbestand: mindest,
      notiz: materialNotiz.trim() || null,
    };

    if (editingMaterialId) {
      const { error } = await supabase
        .from("projekt_materialien")
        .update(payload)
        .eq("id", editingMaterialId);

      if (error) {
        alert("Greška kod izmjene materijala: " + error.message);
        savingRef.current = false;
        setSaving(false);
        return;
      }
    } else {
      payload.created_by = workerName;

      const { error } = await supabase.from("projekt_materialien").insert(payload);

      if (error) {
        alert("Greška kod dodavanja materijala: " + error.message);
        savingRef.current = false;
        setSaving(false);
        return;
      }
    }

    clearMaterialForm();
    setShowMaterialForm(false);
    await loadData();

    savingRef.current = false;
    setSaving(false);
  }

  function editMaterial(item: any) {
    setEditingMaterialId(item.id);
    setMaterialName(item.material_name || "");
    setGruppe(item.gruppe || "");
    setEinheit(item.einheit || "Stk.");
    setMengePlan(String(item.menge_plan || ""));
    setMindestbestand(String(item.mindestbestand || ""));
    setMaterialNotiz(item.notiz || "");
    setShowMaterialForm(true);
    setShowBewegungForm(false);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteMaterial(item: any) {
    const related = bewegungen.filter(
      (b) => Number(b.material_id) === Number(item.id)
    );

    if (related.length > 0) {
      alert(
        "Ovaj materijal ima kretanja. Prvo obriši kretanja materijala pa onda materijal."
      );
      return;
    }

    const ok = confirm("Da li sigurno želiš obrisati ovaj materijal?");

    if (!ok) return;

    const { error } = await supabase
      .from("projekt_materialien")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert("Greška kod brisanja materijala: " + error.message);
      return;
    }

    loadData();
  }

  async function saveBewegung() {
    if (savingRef.current) return;

    if (!bewegungDatum) {
      alert("Odaberi datum.");
      return;
    }

    if (!bewegungMaterialId) {
      alert("Odaberi materijal.");
      return;
    }

    const menge = parseNumber(bewegungMenge);

    if (!menge || menge <= 0) {
      alert("Unesi ispravnu količinu.");
      return;
    }

    savingRef.current = true;
    setSaving(true);

    const payload: any = {
      projekt_id: Number(projektId),
      material_id: Number(bewegungMaterialId),
      datum: bewegungDatum,
      typ: bewegungTyp,
      menge,
      raum_id: bewegungRaumId ? Number(bewegungRaumId) : null,
      lv_position_id: bewegungPositionId ? Number(bewegungPositionId) : null,
      notiz: bewegungNotiz.trim() || null,
    };

    if (editingBewegungId) {
      const { error } = await supabase
        .from("projekt_material_bewegungen")
        .update(payload)
        .eq("id", editingBewegungId);

      if (error) {
        alert("Greška kod izmjene kretanja: " + error.message);
        savingRef.current = false;
        setSaving(false);
        return;
      }
    } else {
      payload.created_by = workerName;

      const { error } = await supabase
        .from("projekt_material_bewegungen")
        .insert(payload);

      if (error) {
        alert("Greška kod dodavanja kretanja: " + error.message);
        savingRef.current = false;
        setSaving(false);
        return;
      }
    }

    clearBewegungForm();
    setShowBewegungForm(false);
    await loadData();

    savingRef.current = false;
    setSaving(false);
  }

  function editBewegung(item: any) {
    setEditingBewegungId(item.id);
    setBewegungDatum(item.datum || getTodayLocalDate());
    setBewegungMaterialId(item.material_id ? String(item.material_id) : "");
    setBewegungTyp(item.typ || "Verbrauch");
    setBewegungMenge(String(item.menge || ""));
    setBewegungRaumId(item.raum_id ? String(item.raum_id) : "");
    setBewegungPositionId(item.lv_position_id ? String(item.lv_position_id) : "");
    setBewegungNotiz(item.notiz || "");
    setShowBewegungForm(true);
    setShowMaterialForm(false);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteBewegung(item: any) {
    const ok = confirm("Da li sigurno želiš obrisati ovo kretanje materijala?");

    if (!ok) return;

    const { error } = await supabase
      .from("projekt_material_bewegungen")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert("Greška kod brisanja kretanja: " + error.message);
      return;
    }

    loadData();
  }

  function getTypStyle(typ: string) {
    if (typ === "Zugang") return okBadgeStyle;
    if (typ === "Rückgabe") return blueBadgeStyle;
    if (typ === "Korrektur") return grayBadgeStyle;

    return warningBadgeStyle;
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <h1 style={titleStyle}>🧱 Material</h1>
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
              clearMaterialForm();
              setShowMaterialForm(!showMaterialForm);
              setShowBewegungForm(false);
            }}
            disabled={saving}
            style={newButtonStyle}
          >
            {showMaterialForm ? "Material schließen" : "+ Material"}
          </button>

          <button
            onClick={() => {
              clearBewegungForm();
              setShowBewegungForm(!showBewegungForm);
              setShowMaterialForm(false);
            }}
            disabled={saving}
            style={orangeButtonStyle}
          >
            {showBewegungForm ? "Bewegung schließen" : "+ Bewegung"}
          </button>
        </div>
      </div>

      <h1 style={titleStyle}>🧱 Material</h1>

      <p style={descriptionStyle}>
        Projekt: <strong>{projekt?.project_name || "-"}</strong> · Admin:{" "}
        <strong>{workerName}</strong>
      </p>

      <section style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Materialien</span>
          <strong style={summaryValueStyle}>{summary.materialien}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Bewegungen</span>
          <strong style={summaryValueStyle}>{summary.bewegungen}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Plan Menge</span>
          <strong style={summaryValueStyle}>{formatNumber(summary.plan)}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Zugang</span>
          <strong style={{ ...summaryValueStyle, color: "#22c55e" }}>
            {formatNumber(summary.zugang)}
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Verbrauch</span>
          <strong style={{ ...summaryValueStyle, color: "#f97316" }}>
            {formatNumber(summary.verbrauch)}
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Rückgabe</span>
          <strong style={{ ...summaryValueStyle, color: "#3b82f6" }}>
            {formatNumber(summary.rueckgabe)}
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Rest</span>
          <strong style={summaryValueStyle}>{formatNumber(summary.rest)}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Warnungen</span>
          <strong
            style={{
              ...summaryValueStyle,
              color: summary.warnungen > 0 ? "#ef4444" : "#22c55e",
            }}
          >
            {summary.warnungen}
          </strong>
        </div>
      </section>

      <section style={infoBoxStyle}>
        <h2 style={sectionTitleStyle}>Material Regel</h2>
        <p style={infoTextStyle}>
          Material ima planiranu količinu. Kretanja su Zugang, Verbrauch, Rückgabe
          ili Korrektur. Rest se računa automatski: Plan + Zugang + Rückgabe -
          Verbrauch.
        </p>
      </section>

      {showMaterialForm && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>
            {editingMaterialId ? "Material bearbeiten" : "Material anlegen"}
          </h2>

          <label style={labelStyle}>Material Name *</label>
          <input
            value={materialName}
            onChange={(e) => setMaterialName(e.target.value)}
            placeholder="z.B. Fliesenkleber S1"
            style={inputStyle}
          />

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Gruppe</label>
              <input
                value={gruppe}
                onChange={(e) => setGruppe(e.target.value)}
                placeholder="z.B. Kleber, Fuge, Silikon"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Einheit</label>
              <input
                value={einheit}
                onChange={(e) => setEinheit(e.target.value)}
                placeholder="Stk. / kg / Sack / m²"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Plan Menge</label>
              <input
                type="number"
                step="0.01"
                value={mengePlan}
                onChange={(e) => setMengePlan(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Mindestbestand</label>
              <input
                type="number"
                step="0.01"
                value={mindestbestand}
                onChange={(e) => setMindestbestand(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <label style={labelStyle}>Notiz</label>
          <textarea
            value={materialNotiz}
            onChange={(e) => setMaterialNotiz(e.target.value)}
            placeholder="Napomena za materijal..."
            style={textareaStyle}
          />

          <div style={formButtonRowStyle}>
            <button
              onClick={saveMaterial}
              disabled={saving}
              style={{
                ...saveButtonStyle,
                opacity: saving ? 0.5 : 1,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving
                ? "Speichern..."
                : editingMaterialId
                ? "Änderungen speichern"
                : "Material speichern"}
            </button>

            <button
              onClick={() => {
                clearMaterialForm();
                setShowMaterialForm(false);
              }}
              disabled={saving}
              style={cancelButtonStyle}
            >
              Abbrechen
            </button>
          </div>
        </section>
      )}

      {showBewegungForm && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>
            {editingBewegungId ? "Bewegung bearbeiten" : "Material Bewegung"}
          </h2>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Datum *</label>
              <input
                type="date"
                value={bewegungDatum}
                onChange={(e) => setBewegungDatum(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Typ</label>
              <select
                value={bewegungTyp}
                onChange={(e) => setBewegungTyp(e.target.value)}
                style={inputStyle}
              >
                <option value="Zugang">Zugang</option>
                <option value="Verbrauch">Verbrauch</option>
                <option value="Rückgabe">Rückgabe</option>
                <option value="Korrektur">Korrektur</option>
              </select>
            </div>
          </div>

          <label style={labelStyle}>Material *</label>
          <select
            value={bewegungMaterialId}
            onChange={(e) => setBewegungMaterialId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Material auswählen</option>
            {materialRows.map((mat) => (
              <option key={mat.id} value={mat.id}>
                {mat.material_name} · Rest {formatNumber(mat.rest)} {mat.einheit || ""}
              </option>
            ))}
          </select>

          {bewegungMaterialId && (
            <div style={previewBoxStyle}>
              <strong>Aktueller Rest:</strong>{" "}
              {formatNumber(getMaterialRow(bewegungMaterialId)?.rest || 0)}{" "}
              {getMaterialEinheit(bewegungMaterialId)}
            </div>
          )}

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Menge *</label>
              <input
                type="number"
                step="0.01"
                value={bewegungMenge}
                onChange={(e) => setBewegungMenge(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Raum</label>
              <select
                value={bewegungRaumId}
                onChange={(e) => setBewegungRaumId(e.target.value)}
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
          </div>

          <label style={labelStyle}>LV Position</label>
          <select
            value={bewegungPositionId}
            onChange={(e) => setBewegungPositionId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Ohne LV Position</option>
            {positionen.map((pos) => (
              <option key={pos.id} value={pos.id}>
                {pos.position_nr} - {pos.kurztext}
              </option>
            ))}
          </select>

          <label style={labelStyle}>Notiz</label>
          <textarea
            value={bewegungNotiz}
            onChange={(e) => setBewegungNotiz(e.target.value)}
            placeholder="Napomena za kretanje materijala..."
            style={textareaStyle}
          />

          <div style={formButtonRowStyle}>
            <button
              onClick={saveBewegung}
              disabled={saving}
              style={{
                ...saveButtonStyle,
                opacity: saving ? 0.5 : 1,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving
                ? "Speichern..."
                : editingBewegungId
                ? "Änderungen speichern"
                : "Bewegung speichern"}
            </button>

            <button
              onClick={() => {
                clearBewegungForm();
                setShowBewegungForm(false);
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
        <h2 style={sectionTitleStyle}>Material Übersicht</h2>

        {materialRows.length === 0 ? (
          <p style={emptyStyle}>Kein Material vorhanden.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Material</th>
                  <th style={thStyle}>Gruppe</th>
                  <th style={thStyle}>EH</th>
                  <th style={thRightStyle}>Plan</th>
                  <th style={thRightStyle}>Zugang</th>
                  <th style={thRightStyle}>Verbrauch</th>
                  <th style={thRightStyle}>Rückgabe</th>
                  <th style={thRightStyle}>Rest</th>
                  <th style={thRightStyle}>Mindest</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Aktion</th>
                </tr>
              </thead>

              <tbody>
                {materialRows.map((mat) => (
                  <tr key={mat.id}>
                    <td style={tdStyle}>
                      <strong>{mat.material_name}</strong>
                      {mat.notiz && <div style={miniTextStyle}>{mat.notiz}</div>}
                    </td>
                    <td style={tdStyle}>{mat.gruppe || "-"}</td>
                    <td style={tdStyle}>{mat.einheit || "-"}</td>
                    <td style={tdRightStyle}>{formatNumber(mat.plan)}</td>
                    <td style={tdRightStyle}>{formatNumber(mat.zugang)}</td>
                    <td style={tdRightStyle}>{formatNumber(mat.verbrauch)}</td>
                    <td style={tdRightStyle}>{formatNumber(mat.rueckgabe)}</td>
                    <td style={tdRightStyle}>
                      <strong>{formatNumber(mat.rest)}</strong>
                    </td>
                    <td style={tdRightStyle}>{formatNumber(mat.mindest)}</td>
                    <td style={tdStyle}>
                      {mat.warnung ? (
                        <span style={dangerBadgeStyle}>Niedrig</span>
                      ) : (
                        <span style={okBadgeStyle}>OK</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <div style={actionRowStyle}>
                        <button onClick={() => editMaterial(mat)} style={editButtonStyle}>
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => deleteMaterial(mat)}
                          style={deleteButtonStyle}
                        >
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={filterBoxStyle}>
        <h2 style={sectionTitleStyle}>Bewegungen Filter</h2>

        <div style={filterGridStyle}>
          <div>
            <label style={labelStyle}>Material Filter</label>
            <select
              value={filterMaterial}
              onChange={(e) => setFilterMaterial(e.target.value)}
              style={inputStyle}
            >
              <option value="Alle">Alle Materialien</option>
              {materialien.map((mat) => (
                <option key={mat.id} value={mat.id}>
                  {mat.material_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Typ Filter</label>
            <select
              value={filterTyp}
              onChange={(e) => setFilterTyp(e.target.value)}
              style={inputStyle}
            >
              <option value="Alle">Alle</option>
              <option value="Zugang">Zugang</option>
              <option value="Verbrauch">Verbrauch</option>
              <option value="Rückgabe">Rückgabe</option>
              <option value="Korrektur">Korrektur</option>
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
              setFilterMaterial("Alle");
              setFilterTyp("Alle");
              setFilterDatum("");
            }}
            style={grayButtonStyle}
          >
            Filter löschen
          </button>
        </div>
      </section>

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Material Bewegungen</h2>

        {filteredBewegungen.length === 0 ? (
          <p style={emptyStyle}>Keine Bewegungen gefunden.</p>
        ) : (
          <div style={bewegungGridStyle}>
            {filteredBewegungen.map((item) => (
              <div key={item.id} style={bewegungCardStyle}>
                <div style={cardTopStyle}>
                  <span style={getTypStyle(item.typ)}>{item.typ || "-"}</span>
                  <strong style={dateTextStyle}>{formatDate(item.datum)}</strong>
                </div>

                <h3 style={cardTitleStyle}>{getMaterialName(item.material_id)}</h3>

                <div style={detailGridStyle}>
                  <div>
                    <span style={smallLabelStyle}>Menge</span>
                    <strong>
                      {formatNumber(item.menge)} {getMaterialEinheit(item.material_id)}
                    </strong>
                  </div>

                  <div>
                    <span style={smallLabelStyle}>Raum</span>
                    <strong>{getRaumName(item.raum_id)}</strong>
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

                <div style={actionRowStyle}>
                  <button onClick={() => editBewegung(item)} style={editButtonStyle}>
                    Bearbeiten
                  </button>

                  <button
                    onClick={() => deleteBewegung(item)}
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

const orangeButtonStyle: any = {
  ...newButtonStyle,
  background: "#f97316",
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

const previewBoxStyle: any = {
  marginTop: "12px",
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

const listBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "22px",
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

const grayButtonStyle: any = {
  background: "#4b5563",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px",
  fontWeight: "bold",
  cursor: "pointer",
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
  minWidth: "1150px",
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

const miniTextStyle: any = {
  color: "#999",
  fontSize: "12px",
  marginTop: "4px",
};

const actionRowStyle: any = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const editButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "7px 9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const deleteButtonStyle: any = {
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "7px 9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const bewegungGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: "14px",
};

const bewegungCardStyle: any = {
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

const dateTextStyle: any = {
  color: "#ccc",
  fontSize: "13px",
};

const cardTitleStyle: any = {
  color: "#f97316",
  margin: "12px 0 10px 0",
  fontSize: "18px",
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

const blueBadgeStyle: any = {
  background: "#2563eb",
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