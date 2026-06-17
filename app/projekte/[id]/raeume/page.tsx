"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];

export default function ProjektRaeumePage() {
  const params = useParams();
  const router = useRouter();

  const projektId = String(params.id);

  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [projekt, setProjekt] = useState<any>(null);
  const [raeume, setRaeume] = useState<any[]>([]);
  const [positionen, setPositionen] = useState<any[]>([]);
  const [aufmass, setAufmass] = useState<any[]>([]);

  const [showRaumForm, setShowRaumForm] = useState(false);
  const [showAufmassForm, setShowAufmassForm] = useState(false);

  const [editingRaumId, setEditingRaumId] = useState<number | null>(null);
  const [editingAufmassId, setEditingAufmassId] = useState<number | null>(null);

  const [raumName, setRaumName] = useState("");
  const [ebene, setEbene] = useState("");
  const [raumTyp, setRaumTyp] = useState("Normal");
  const [grundflaeche, setGrundflaeche] = useState("");
  const [raumFaktor, setRaumFaktor] = useState("1.00");
  const [raumNotiz, setRaumNotiz] = useState("");

  const [selectedRaumId, setSelectedRaumId] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [aufmassMenge, setAufmassMenge] = useState("");
  const [aufmassEinheit, setAufmassEinheit] = useState("m²");
  const [aufmassFaktor, setAufmassFaktor] = useState("1.00");
  const [aufmassNotiz, setAufmassNotiz] = useState("");

  const summary = useMemo(() => {
    const totalRaeume = raeume.length;
    const totalAufmass = aufmass.length;

    const totalPlanHours = aufmass.reduce((sum, item) => {
      const pos = positionen.find((p) => p.id === item.lv_position_id);
      const menge = Number(item.menge_soll || 0);
      const faktor = Number(item.faktor || 1);
      const minuten = Number(pos?.minuten_pro_einheit || 0);

      return sum + (menge * faktor * minuten) / 60;
    }, 0);

    return {
      totalRaeume,
      totalAufmass,
      totalPlanHours,
    };
  }, [raeume, aufmass, positionen]);

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

    const aufmassRes = await supabase
      .from("projekt_aufmass")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("created_at", { ascending: false });

    if (aufmassRes.error) {
      alert("Greška kod učitavanja Aufmaß: " + aufmassRes.error.message);
      setAufmass([]);
      setLoading(false);
      return;
    }

    setAufmass(aufmassRes.data || []);
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

  function getAutoFaktor(sizeValue: string, typeValue: string) {
    const size = parseNumber(sizeValue);
    let faktor = 1;

    if (size > 0 && size <= 5) {
      faktor = 1.45;
    } else if (size > 5 && size <= 10) {
      faktor = 1.35;
    } else if (size > 10 && size <= 20) {
      faktor = 1.25;
    } else if (size > 20 && size <= 40) {
      faktor = 1.1;
    } else {
      faktor = 1;
    }

    if (typeValue === "WC") faktor += 0.1;
    if (typeValue === "Bad") faktor += 0.08;
    if (typeValue === "Dusche") faktor += 0.1;
    if (typeValue === "Treppe") faktor += 0.2;
    if (typeValue === "Technik") faktor += 0.05;

    if (faktor > 1.7) faktor = 1.7;

    return faktor.toFixed(2);
  }

  function berechneRaumFaktor() {
    setRaumFaktor(getAutoFaktor(grundflaeche, raumTyp));
  }

  function clearRaumForm() {
    setEditingRaumId(null);
    setRaumName("");
    setEbene("");
    setRaumTyp("Normal");
    setGrundflaeche("");
    setRaumFaktor("1.00");
    setRaumNotiz("");
  }

  function clearAufmassForm() {
    setEditingAufmassId(null);
    setSelectedRaumId("");
    setSelectedPositionId("");
    setAufmassMenge("");
    setAufmassEinheit("m²");
    setAufmassFaktor("1.00");
    setAufmassNotiz("");
  }

  async function saveRaum() {
    if (!raumName.trim()) {
      alert("Unesi naziv prostorije.");
      return;
    }

    const faktorNumber = parseNumber(raumFaktor);

    if (faktorNumber <= 0) {
      alert("Faktor mora biti veći od 0.");
      return;
    }

    const payload = {
      projekt_id: Number(projektId),
      raum_name: raumName.trim(),
      ebene: ebene.trim() || null,
      raum_typ: raumTyp,
      grundflaeche: parseNumber(grundflaeche),
      faktor: faktorNumber,
      notiz: raumNotiz.trim() || null,
      created_by: workerName,
    };

    if (editingRaumId) {
      const { error } = await supabase
        .from("projekt_raeume")
        .update(payload)
        .eq("id", editingRaumId);

      if (error) {
        alert("Greška kod izmjene prostorije: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("projekt_raeume").insert(payload);

      if (error) {
        alert("Greška kod dodavanja prostorije: " + error.message);
        return;
      }
    }

    clearRaumForm();
    setShowRaumForm(false);
    loadData();
  }

  function editRaum(raum: any) {
    setEditingRaumId(raum.id);
    setRaumName(raum.raum_name || "");
    setEbene(raum.ebene || "");
    setRaumTyp(raum.raum_typ || "Normal");
    setGrundflaeche(String(raum.grundflaeche ?? ""));
    setRaumFaktor(String(raum.faktor ?? "1.00"));
    setRaumNotiz(raum.notiz || "");
    setShowRaumForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteRaum(id: number) {
    const ok = confirm(
      "Da li sigurno želiš obrisati ovu prostoriju? Svi Aufmaß unosi za ovu prostoriju će biti obrisani."
    );

    if (!ok) return;

    const { error } = await supabase.from("projekt_raeume").delete().eq("id", id);

    if (error) {
      alert("Greška kod brisanja prostorije: " + error.message);
      return;
    }

    loadData();
  }

  function onSelectRaum(id: string) {
    setSelectedRaumId(id);

    const raum = raeume.find((r) => String(r.id) === id);

    if (raum) {
      setAufmassFaktor(String(raum.faktor || "1.00"));
    }
  }

  function onSelectPosition(id: string) {
    setSelectedPositionId(id);

    const pos = positionen.find((p) => String(p.id) === id);

    if (pos) {
      setAufmassEinheit(pos.einheit || "m²");
    }
  }

  async function saveAufmass() {
    if (!selectedRaumId) {
      alert("Odaberi prostoriju.");
      return;
    }

    if (!selectedPositionId) {
      alert("Odaberi LV poziciju.");
      return;
    }

    const faktorNumber = parseNumber(aufmassFaktor);

    if (faktorNumber <= 0) {
      alert("Faktor mora biti veći od 0.");
      return;
    }

    const payload = {
      projekt_id: Number(projektId),
      raum_id: Number(selectedRaumId),
      lv_position_id: Number(selectedPositionId),
      menge_soll: parseNumber(aufmassMenge),
      einheit: aufmassEinheit,
      faktor: faktorNumber,
      notiz: aufmassNotiz.trim() || null,
      created_by: workerName,
    };

    if (editingAufmassId) {
      const { error } = await supabase
        .from("projekt_aufmass")
        .update(payload)
        .eq("id", editingAufmassId);

      if (error) {
        alert("Greška kod izmjene Aufmaß: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("projekt_aufmass").insert(payload);

      if (error) {
        alert("Greška kod dodavanja Aufmaß: " + error.message);
        return;
      }
    }

    clearAufmassForm();
    setShowAufmassForm(false);
    loadData();
  }

  function editAufmass(item: any) {
    setEditingAufmassId(item.id);
    setSelectedRaumId(String(item.raum_id || ""));
    setSelectedPositionId(String(item.lv_position_id || ""));
    setAufmassMenge(String(item.menge_soll ?? ""));
    setAufmassEinheit(item.einheit || "m²");
    setAufmassFaktor(String(item.faktor ?? "1.00"));
    setAufmassNotiz(item.notiz || "");
    setShowAufmassForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteAufmass(id: number) {
    const ok = confirm("Da li sigurno želiš obrisati ovaj Aufmaß unos?");

    if (!ok) return;

    const { error } = await supabase.from("projekt_aufmass").delete().eq("id", id);

    if (error) {
      alert("Greška kod brisanja Aufmaß: " + error.message);
      return;
    }

    loadData();
  }

  function getRaumName(id: number) {
    const raum = raeume.find((r) => r.id === id);
    if (!raum) return "-";

    return `${raum.ebene ? raum.ebene + " - " : ""}${raum.raum_name}`;
  }

  function getPositionText(id: number) {
    const pos = positionen.find((p) => p.id === id);
    if (!pos) return "-";

    return `${pos.position_nr} - ${pos.kurztext}`;
  }

  function getPosition(id: number) {
    return positionen.find((p) => p.id === id);
  }

  function wirksameMenge(item: any) {
    return Number(item.menge_soll || 0) * Number(item.faktor || 1);
  }

  function planHours(item: any) {
    const pos = getPosition(item.lv_position_id);
    const minuten = Number(pos?.minuten_pro_einheit || 0);

    return (wirksameMenge(item) * minuten) / 60;
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <h1 style={titleStyle}>📐 Aufmaß / Räume</h1>
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
              clearRaumForm();
              setShowRaumForm(!showRaumForm);
              setShowAufmassForm(false);
            }}
            style={newButtonStyle}
          >
            {showRaumForm ? "Schließen" : "+ Raum"}
          </button>

          <button
            onClick={() => {
              clearAufmassForm();
              setShowAufmassForm(!showAufmassForm);
              setShowRaumForm(false);
            }}
            style={blueButtonStyle}
          >
            {showAufmassForm ? "Schließen" : "+ Aufmaß"}
          </button>
        </div>
      </div>

      <h1 style={titleStyle}>📐 Aufmaß / Räume</h1>

      <p style={descriptionStyle}>
        Projekt: <strong>{projekt?.project_name || "-"}</strong>
      </p>

      <section style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Räume</span>
          <strong style={summaryValueStyle}>{summary.totalRaeume}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Aufmaß Einträge</span>
          <strong style={summaryValueStyle}>{summary.totalAufmass}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Plan Stunden mit Faktor</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.totalPlanHours)} h
          </strong>
        </div>
      </section>

      {showRaumForm && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>
            {editingRaumId ? "Raum bearbeiten" : "Neuen Raum hinzufügen"}
          </h2>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Raumname *</label>
              <input
                value={raumName}
                onChange={(e) => setRaumName(e.target.value)}
                placeholder="z.B. WC EG"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Ebene / Geschoss</label>
              <input
                value={ebene}
                onChange={(e) => setEbene(e.target.value)}
                placeholder="z.B. EG, 1.OG, KG"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Raumtyp</label>
              <select
                value={raumTyp}
                onChange={(e) => setRaumTyp(e.target.value)}
                style={inputStyle}
              >
                <option value="Normal">Normal</option>
                <option value="WC">WC</option>
                <option value="Bad">Bad</option>
                <option value="Dusche">Dusche</option>
                <option value="Gang">Gang</option>
                <option value="Büro">Büro</option>
                <option value="Werkstatt">Werkstatt</option>
                <option value="Technik">Technik</option>
                <option value="Treppe">Treppe</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Grundfläche m²</label>
              <input
                value={grundflaeche}
                onChange={(e) => setGrundflaeche(e.target.value)}
                placeholder="z.B. 4.5"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Faktor *</label>
              <input
                value={raumFaktor}
                onChange={(e) => setRaumFaktor(e.target.value)}
                placeholder="z.B. 1.40"
                style={inputStyle}
              />
            </div>
          </div>

          <button onClick={berechneRaumFaktor} style={purpleButtonStyle}>
            Faktor automatisch berechnen
          </button>

          <label style={labelStyle}>Notiz</label>
          <textarea
            value={raumNotiz}
            onChange={(e) => setRaumNotiz(e.target.value)}
            placeholder="z.B. puno rezanja, instalacije, uski prostor..."
            style={textareaStyle}
          />

          <div style={formButtonRowStyle}>
            <button onClick={saveRaum} style={saveButtonStyle}>
              {editingRaumId ? "Änderungen speichern" : "Raum speichern"}
            </button>

            <button
              onClick={() => {
                clearRaumForm();
                setShowRaumForm(false);
              }}
              style={cancelButtonStyle}
            >
              Abbrechen
            </button>
          </div>
        </section>
      )}

      {showAufmassForm && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>
            {editingAufmassId ? "Aufmaß bearbeiten" : "Aufmaß hinzufügen"}
          </h2>

          {raeume.length === 0 || positionen.length === 0 ? (
            <p style={warningStyle}>
              Prvo moraš imati najmanje jednu prostoriju i jednu aktivnu LV
              poziciju.
            </p>
          ) : (
            <>
              <div style={formGridStyle}>
                <div>
                  <label style={labelStyle}>Raum *</label>
                  <select
                    value={selectedRaumId}
                    onChange={(e) => onSelectRaum(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Odaberi prostoriju</option>
                    {raeume.map((raum) => (
                      <option key={raum.id} value={raum.id}>
                        {raum.ebene ? `${raum.ebene} - ` : ""}
                        {raum.raum_name} | Faktor {raum.faktor}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>LV Position *</label>
                  <select
                    value={selectedPositionId}
                    onChange={(e) => onSelectPosition(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Odaberi LV poziciju</option>
                    {positionen.map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.position_nr} - {pos.kurztext}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={formGridStyle}>
                <div>
                  <label style={labelStyle}>Menge Soll</label>
                  <input
                    value={aufmassMenge}
                    onChange={(e) => setAufmassMenge(e.target.value)}
                    placeholder="z.B. 18"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Einheit</label>
                  <input
                    value={aufmassEinheit}
                    onChange={(e) => setAufmassEinheit(e.target.value)}
                    placeholder="m² / m / Stk."
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Faktor</label>
                  <input
                    value={aufmassFaktor}
                    onChange={(e) => setAufmassFaktor(e.target.value)}
                    placeholder="z.B. 1.40"
                    style={inputStyle}
                  />
                </div>
              </div>

              <label style={labelStyle}>Notiz</label>
              <textarea
                value={aufmassNotiz}
                onChange={(e) => setAufmassNotiz(e.target.value)}
                placeholder="Napomena za ovu poziciju u ovoj prostoriji"
                style={textareaStyle}
              />

              <div style={formButtonRowStyle}>
                <button onClick={saveAufmass} style={saveButtonStyle}>
                  {editingAufmassId
                    ? "Änderungen speichern"
                    : "Aufmaß speichern"}
                </button>

                <button
                  onClick={() => {
                    clearAufmassForm();
                    setShowAufmassForm(false);
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
        <h2 style={sectionTitleStyle}>Räume Liste</h2>

        {raeume.length === 0 ? (
          <p style={emptyStyle}>Noch keine Räume vorhanden.</p>
        ) : (
          <div style={roomGridStyle}>
            {raeume.map((raum) => (
              <div key={raum.id} style={roomCardStyle}>
                <h3 style={roomTitleStyle}>
                  {raum.ebene ? `${raum.ebene} - ` : ""}
                  {raum.raum_name}
                </h3>

                <p style={roomTextStyle}>
                  <strong>Typ:</strong> {raum.raum_typ || "-"}
                </p>

                <p style={roomTextStyle}>
                  <strong>Grundfläche:</strong>{" "}
                  {formatNumber(raum.grundflaeche)} m²
                </p>

                <p style={roomTextStyle}>
                  <strong>Faktor:</strong> {formatNumber(raum.faktor)}
                </p>

                {raum.notiz && <p style={roomTextStyle}>{raum.notiz}</p>}

                <div style={actionRowStyle}>
                  <button onClick={() => editRaum(raum)} style={editButtonStyle}>
                    Bearbeiten
                  </button>

                  <button
                    onClick={() => deleteRaum(raum.id)}
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

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Aufmaß nach Räumen</h2>

        {aufmass.length === 0 ? (
          <p style={emptyStyle}>Noch kein Aufmaß vorhanden.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Raum</th>
                  <th style={thStyle}>LV Position</th>
                  <th style={thStyle}>Menge</th>
                  <th style={thStyle}>EH</th>
                  <th style={thStyle}>Faktor</th>
                  <th style={thStyle}>Wirksame Menge</th>
                  <th style={thStyle}>Plan h</th>
                  <th style={thStyle}>Notiz</th>
                  <th style={thStyle}>Aktion</th>
                </tr>
              </thead>

              <tbody>
                {aufmass.map((item) => (
                  <tr key={item.id}>
                    <td style={tdStyle}>{getRaumName(item.raum_id)}</td>
                    <td style={tdStyle}>{getPositionText(item.lv_position_id)}</td>
                    <td style={tdRightStyle}>
                      {formatNumber(item.menge_soll)}
                    </td>
                    <td style={tdStyle}>{item.einheit || "-"}</td>
                    <td style={tdRightStyle}>{formatNumber(item.faktor)}</td>
                    <td style={tdRightStyle}>
                      {formatNumber(wirksameMenge(item))}
                    </td>
                    <td style={tdRightStyle}>{formatNumber(planHours(item))}</td>
                    <td style={tdStyle}>{item.notiz || "-"}</td>
                    <td style={tdStyle}>
                      <div style={actionRowStyle}>
                        <button
                          onClick={() => editAufmass(item)}
                          style={editButtonStyle}
                        >
                          Bearbeiten
                        </button>

                        <button
                          onClick={() => deleteAufmass(item.id)}
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

const purpleButtonStyle: any = {
  background: "#9333ea",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "11px 14px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "12px",
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

const roomGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "12px",
};

const roomCardStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "14px",
  padding: "14px",
};

const roomTitleStyle: any = {
  color: "#f97316",
  marginTop: 0,
  marginBottom: "10px",
};

const roomTextStyle: any = {
  color: "#ccc",
  margin: "6px 0",
  fontSize: "14px",
};

const tableWrapStyle: any = {
  overflowX: "auto",
};

const tableStyle: any = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "1100px",
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

const actionRowStyle: any = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "10px",
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