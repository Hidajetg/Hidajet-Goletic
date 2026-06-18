"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

  const projektId = String(params.id);

  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const summary = useMemo(() => {
    let plan = 0;
    let zugang = 0;
    let verbrauch = 0;
    let rueckgabe = 0;

    materialien.forEach((mat) => {
      plan += Number(mat.menge_plan || 0);
    });

    bewegungen.forEach((b) => {
      const menge = Number(b.menge || 0);

      if (b.typ === "Zugang") zugang += menge;
      if (b.typ === "Verbrauch") verbrauch += menge;
      if (b.typ === "Rückgabe") rueckgabe += menge;
    });

    return {
      materialCount: materialien.length,
      bewegungCount: bewegungen.length,
      plan,
      zugang,
      verbrauch,
      rueckgabe,
      rest: plan + zugang + rueckgabe - verbrauch,
    };
  }, [materialien, bewegungen]);

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

    const materialRes = await supabase
      .from("projekt_materialien")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("material_name", { ascending: true });

    if (materialRes.error) {
      alert("Greška kod učitavanja materiala: " + materialRes.error.message);
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
      alert(
        "Greška kod učitavanja material kretanja: " + bewegungRes.error.message
      );
      setBewegungen([]);
      setLoading(false);
      return;
    }

    setBewegungen(bewegungRes.data || []);
    setLoading(false);
  }

  function parseNumber(value: string) {
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

    const parts = String(value).split("-");
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }

    return value;
  }

  function getMaterial(id: number | string | null) {
    if (!id) return null;
    return materialien.find((m) => String(m.id) === String(id)) || null;
  }

  function getMaterialName(id: number | string | null) {
    const mat = getMaterial(id);
    if (!mat) return "-";
    return mat.material_name;
  }

  function getMaterialEinheit(id: number | string | null) {
    const mat = getMaterial(id);
    if (!mat) return "";
    return mat.einheit || "";
  }

  function getRaumName(id: number | null) {
    if (!id) return "-";

    const raum = raeume.find((r) => Number(r.id) === Number(id));

    if (!raum) return "-";

    return `${raum.ebene ? raum.ebene + " - " : ""}${raum.raum_name}`;
  }

  function getPositionText(id: number | null) {
    if (!id) return "-";

    const pos = positionen.find((p) => Number(p.id) === Number(id));

    if (!pos) return "-";

    return `${pos.position_nr} - ${pos.kurztext}`;
  }

  function getStatsForMaterial(materialId: number) {
    const mat = materialien.find((m) => Number(m.id) === Number(materialId));
    const entries = bewegungen.filter(
      (b) => Number(b.material_id) === Number(materialId)
    );

    let zugang = 0;
    let verbrauch = 0;
    let rueckgabe = 0;

    entries.forEach((b) => {
      const menge = Number(b.menge || 0);

      if (b.typ === "Zugang") zugang += menge;
      if (b.typ === "Verbrauch") verbrauch += menge;
      if (b.typ === "Rückgabe") rueckgabe += menge;
    });

    const plan = Number(mat?.menge_plan || 0);
    const rest = plan + zugang + rueckgabe - verbrauch;

    return {
      plan,
      zugang,
      verbrauch,
      rueckgabe,
      rest,
      mindestbestand: Number(mat?.mindestbestand || 0),
    };
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

  async function saveMaterial() {
    if (!materialName.trim()) {
      alert("Unesi naziv materiala.");
      return;
    }

    const payload = {
      projekt_id: Number(projektId),
      material_name: materialName.trim(),
      gruppe: gruppe.trim() || null,
      einheit: einheit || "Stk.",
      menge_plan: parseNumber(mengePlan),
      mindestbestand: parseNumber(mindestbestand),
      notiz: materialNotiz.trim() || null,
      created_by: workerName,
    };

    if (editingMaterialId) {
      const { error } = await supabase
        .from("projekt_materialien")
        .update(payload)
        .eq("id", editingMaterialId);

      if (error) {
        alert("Greška kod izmjene materiala: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("projekt_materialien").insert(payload);

      if (error) {
        alert("Greška kod dodavanja materiala: " + error.message);
        return;
      }
    }

    clearMaterialForm();
    setShowMaterialForm(false);
    loadData();
  }

  function editMaterial(mat: any) {
    setEditingMaterialId(mat.id);
    setMaterialName(mat.material_name || "");
    setGruppe(mat.gruppe || "");
    setEinheit(mat.einheit || "Stk.");
    setMengePlan(String(mat.menge_plan ?? ""));
    setMindestbestand(String(mat.mindestbestand ?? ""));
    setMaterialNotiz(mat.notiz || "");
    setShowMaterialForm(true);
    setShowBewegungForm(false);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteMaterial(id: number) {
    const ok = confirm(
      "Da li sigurno želiš obrisati ovaj material? Sva kretanja za ovaj material će biti obrisana."
    );

    if (!ok) return;

    const { error } = await supabase
      .from("projekt_materialien")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Greška kod brisanja materiala: " + error.message);
      return;
    }

    loadData();
  }

  function onSelectMaterialForBewegung(id: string) {
    setBewegungMaterialId(id);

    const mat = getMaterial(id);

    if (mat) {
      setEinheit(mat.einheit || "Stk.");
    }
  }

  async function saveBewegung() {
    if (!bewegungDatum) {
      alert("Odaberi datum.");
      return;
    }

    if (!bewegungMaterialId) {
      alert("Odaberi material.");
      return;
    }

    const mengeNumber = parseNumber(bewegungMenge);

    if (mengeNumber <= 0) {
      alert("Menge mora biti veća od 0.");
      return;
    }

    const payload = {
      projekt_id: Number(projektId),
      material_id: Number(bewegungMaterialId),
      datum: bewegungDatum,
      typ: bewegungTyp,
      menge: mengeNumber,
      raum_id: bewegungRaumId ? Number(bewegungRaumId) : null,
      lv_position_id: bewegungPositionId ? Number(bewegungPositionId) : null,
      notiz: bewegungNotiz.trim() || null,
      created_by: workerName,
    };

    if (editingBewegungId) {
      const { error } = await supabase
        .from("projekt_material_bewegungen")
        .update(payload)
        .eq("id", editingBewegungId);

      if (error) {
        alert("Greška kod izmjene kretanja: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("projekt_material_bewegungen")
        .insert(payload);

      if (error) {
        alert("Greška kod dodavanja kretanja: " + error.message);
        return;
      }
    }

    clearBewegungForm();
    setShowBewegungForm(false);
    loadData();
  }

  function editBewegung(item: any) {
    setEditingBewegungId(item.id);
    setBewegungDatum(item.datum || getTodayLocalDate());
    setBewegungMaterialId(item.material_id ? String(item.material_id) : "");
    setBewegungTyp(item.typ || "Verbrauch");
    setBewegungMenge(String(item.menge ?? ""));
    setBewegungRaumId(item.raum_id ? String(item.raum_id) : "");
    setBewegungPositionId(item.lv_position_id ? String(item.lv_position_id) : "");
    setBewegungNotiz(item.notiz || "");
    setShowBewegungForm(true);
    setShowMaterialForm(false);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteBewegung(id: number) {
    const ok = confirm("Da li sigurno želiš obrisati ovo material kretanje?");

    if (!ok) return;

    const { error } = await supabase
      .from("projekt_material_bewegungen")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Greška kod brisanja kretanja: " + error.message);
      return;
    }

    loadData();
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

        <div style={topButtonRowStyle}>
          <button
            onClick={() => {
              clearMaterialForm();
              setShowMaterialForm(!showMaterialForm);
              setShowBewegungForm(false);
            }}
            style={newButtonStyle}
          >
            {showMaterialForm ? "Schließen" : "+ Material"}
          </button>

          <button
            onClick={() => {
              clearBewegungForm();
              setShowBewegungForm(!showBewegungForm);
              setShowMaterialForm(false);
            }}
            style={blueButtonStyle}
          >
            {showBewegungForm ? "Schließen" : "+ Bewegung"}
          </button>
        </div>
      </div>

      <h1 style={titleStyle}>🧱 Material</h1>

      <p style={descriptionStyle}>
        Projekt: <strong>{projekt?.project_name || "-"}</strong>
      </p>

      <section style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Materialien</span>
          <strong style={summaryValueStyle}>{summary.materialCount}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Bewegungen</span>
          <strong style={summaryValueStyle}>{summary.bewegungCount}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Plan Gesamt</span>
          <strong style={summaryValueStyle}>{formatNumber(summary.plan)}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Verbrauch Gesamt</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.verbrauch)}
          </strong>
        </div>
      </section>

      <section style={infoBoxStyle}>
        <h2 style={sectionTitleStyle}>Material Regel</h2>
        <p style={infoTextStyle}>
          Material wird zuerst als Plan angelegt. Danach werden Bewegungen
          erfasst: Zugang, Verbrauch oder Rückgabe. Verbrauch kann optional einem
          Raum und einer LV Position zugeordnet werden.
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
            placeholder="z.B. Flexkleber C2TE S1"
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
              <select
                value={einheit}
                onChange={(e) => setEinheit(e.target.value)}
                style={inputStyle}
              >
                <option value="Stk.">Stk.</option>
                <option value="Sack">Sack</option>
                <option value="kg">kg</option>
                <option value="m²">m²</option>
                <option value="m">m</option>
                <option value="Liter">Liter</option>
                <option value="Karton">Karton</option>
                <option value="Tube">Tube</option>
                <option value="Rolle">Rolle</option>
                <option value="Palette">Palette</option>
              </select>
            </div>
          </div>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Plan Menge</label>
              <input
                value={mengePlan}
                onChange={(e) => setMengePlan(e.target.value)}
                placeholder="z.B. 120"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Mindestbestand</label>
              <input
                value={mindestbestand}
                onChange={(e) => setMindestbestand(e.target.value)}
                placeholder="z.B. 10"
                style={inputStyle}
              />
            </div>
          </div>

          <label style={labelStyle}>Notiz</label>
          <textarea
            value={materialNotiz}
            onChange={(e) => setMaterialNotiz(e.target.value)}
            placeholder="Napomena za material"
            style={textareaStyle}
          />

          <div style={formButtonRowStyle}>
            <button onClick={saveMaterial} style={saveButtonStyle}>
              {editingMaterialId ? "Änderungen speichern" : "Material speichern"}
            </button>

            <button
              onClick={() => {
                clearMaterialForm();
                setShowMaterialForm(false);
              }}
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

          {materialien.length === 0 ? (
            <p style={warningStyle}>Prvo moraš dodati najmanje jedan material.</p>
          ) : (
            <>
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
                  <label style={labelStyle}>Material *</label>
                  <select
                    value={bewegungMaterialId}
                    onChange={(e) => onSelectMaterialForBewegung(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Odaberi material</option>
                    {materialien.map((mat) => (
                      <option key={mat.id} value={mat.id}>
                        {mat.material_name} | {mat.einheit}
                      </option>
                    ))}
                  </select>
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
                  </select>
                </div>
              </div>

              <label style={labelStyle}>Menge *</label>
              <input
                value={bewegungMenge}
                onChange={(e) => setBewegungMenge(e.target.value)}
                placeholder="z.B. 5"
                style={inputStyle}
              />

              <div style={formGridStyle}>
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

                <div>
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
                </div>
              </div>

              <label style={labelStyle}>Notiz</label>
              <textarea
                value={bewegungNotiz}
                onChange={(e) => setBewegungNotiz(e.target.value)}
                placeholder="Napomena za kretanje"
                style={textareaStyle}
              />

              <div style={formButtonRowStyle}>
                <button onClick={saveBewegung} style={saveButtonStyle}>
                  {editingBewegungId
                    ? "Änderungen speichern"
                    : "Bewegung speichern"}
                </button>

                <button
                  onClick={() => {
                    clearBewegungForm();
                    setShowBewegungForm(false);
                  }}
                  style={cancelButtonStyle}
                >
                  Abbrechen
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Material Übersicht</h2>

        {materialien.length === 0 ? (
          <p style={emptyStyle}>Noch kein Material vorhanden.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Material</th>
                  <th style={thStyle}>Gruppe</th>
                  <th style={thStyle}>Einheit</th>
                  <th style={thStyle}>Plan</th>
                  <th style={thStyle}>Zugang</th>
                  <th style={thStyle}>Verbrauch</th>
                  <th style={thStyle}>Rückgabe</th>
                  <th style={thStyle}>Rest</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Aktion</th>
                </tr>
              </thead>

              <tbody>
                {materialien.map((mat) => {
                  const stats = getStatsForMaterial(mat.id);
                  const low =
                    stats.mindestbestand > 0 && stats.rest <= stats.mindestbestand;

                  return (
                    <tr key={mat.id}>
                      <td style={tdStyle}>
                        <strong>{mat.material_name}</strong>
                        {mat.notiz && (
                          <>
                            <br />
                            <span style={smallTextStyle}>{mat.notiz}</span>
                          </>
                        )}
                      </td>

                      <td style={tdStyle}>{mat.gruppe || "-"}</td>
                      <td style={tdStyle}>{mat.einheit || "-"}</td>
                      <td style={tdRightStyle}>{formatNumber(stats.plan)}</td>
                      <td style={tdRightStyle}>{formatNumber(stats.zugang)}</td>
                      <td style={tdRightStyle}>{formatNumber(stats.verbrauch)}</td>
                      <td style={tdRightStyle}>{formatNumber(stats.rueckgabe)}</td>
                      <td style={tdRightStyle}>
                        <strong>{formatNumber(stats.rest)}</strong>
                      </td>
                      <td style={tdStyle}>
                        <span style={low ? warningBadgeStyle : okBadgeStyle}>
                          {low ? "Niedrig" : "OK"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={actionRowStyle}>
                          <button
                            onClick={() => editMaterial(mat)}
                            style={editButtonStyle}
                          >
                            Bearbeiten
                          </button>

                          <button
                            onClick={() => deleteMaterial(mat.id)}
                            style={deleteButtonStyle}
                          >
                            Löschen
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Material Bewegungen</h2>

        {bewegungen.length === 0 ? (
          <p style={emptyStyle}>Noch keine Material Bewegung vorhanden.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Datum</th>
                  <th style={thStyle}>Typ</th>
                  <th style={thStyle}>Material</th>
                  <th style={thStyle}>Menge</th>
                  <th style={thStyle}>Einheit</th>
                  <th style={thStyle}>Raum</th>
                  <th style={thStyle}>LV Position</th>
                  <th style={thStyle}>Notiz</th>
                  <th style={thStyle}>Aktion</th>
                </tr>
              </thead>

              <tbody>
                {bewegungen.map((item) => (
                  <tr key={item.id}>
                    <td style={tdStyle}>{formatDate(item.datum)}</td>
                    <td style={tdStyle}>
                      <span
                        style={
                          item.typ === "Zugang"
                            ? okBadgeStyle
                            : item.typ === "Rückgabe"
                            ? blueBadgeStyle
                            : warningBadgeStyle
                        }
                      >
                        {item.typ}
                      </span>
                    </td>
                    <td style={tdStyle}>{getMaterialName(item.material_id)}</td>
                    <td style={tdRightStyle}>
                      <strong>{formatNumber(item.menge)}</strong>
                    </td>
                    <td style={tdStyle}>{getMaterialEinheit(item.material_id)}</td>
                    <td style={tdStyle}>{getRaumName(item.raum_id)}</td>
                    <td style={tdStyle}>{getPositionText(item.lv_position_id)}</td>
                    <td style={tdStyle}>{item.notiz || "-"}</td>
                    <td style={tdStyle}>
                      <div style={actionRowStyle}>
                        <button
                          onClick={() => editBewegung(item)}
                          style={editButtonStyle}
                        >
                          Bearbeiten
                        </button>

                        <button
                          onClick={() => deleteBewegung(item.id)}
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

const topButtonRowStyle: any = {
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

const blueButtonStyle: any = {
  ...newButtonStyle,
  background: "#2563eb",
};

const summaryGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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

const warningStyle: any = {
  background: "#7f1d1d",
  border: "1px solid #dc2626",
  color: "white",
  borderRadius: "12px",
  padding: "12px",
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

const smallTextStyle: any = {
  color: "#aaa",
  fontSize: "12px",
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

const blueBadgeStyle: any = {
  background: "#2563eb",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};