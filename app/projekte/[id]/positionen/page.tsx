"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];

export default function ProjektPositionenPage() {
  const params = useParams();
  const router = useRouter();

  const projektId = String(params.id);

  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [projekt, setProjekt] = useState<any>(null);
  const [positionen, setPositionen] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [positionNr, setPositionNr] = useState("");
  const [kurztext, setKurztext] = useState("");
  const [langtext, setLangtext] = useState("");
  const [gruppe, setGruppe] = useState("");
  const [mengeSoll, setMengeSoll] = useState("");
  const [einheit, setEinheit] = useState("m²");
  const [einheitspreis, setEinheitspreis] = useState("");
  const [positionspreis, setPositionspreis] = useState("");
  const [typ, setTyp] = useState("Normal");
  const [minutenProEinheit, setMinutenProEinheit] = useState("");
  const [aktiv, setAktiv] = useState(true);

  const summary = useMemo(() => {
    const totalPositions = positionen.length;
    const activePositions = positionen.filter((p) => p.aktiv).length;

    const totalSoll = positionen.reduce((sum, p) => {
      return sum + Number(p.positionspreis || 0);
    }, 0);

    const totalPlanHours = positionen.reduce((sum, p) => {
      const menge = Number(p.menge_soll || 0);
      const minuten = Number(p.minuten_pro_einheit || 0);
      return sum + (menge * minuten) / 60;
    }, 0);

    return {
      totalPositions,
      activePositions,
      totalSoll,
      totalPlanHours,
    };
  }, [positionen]);

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
      setProjekt(null);
      setLoading(false);
      return;
    }

    setProjekt(projektRes.data);

    const posRes = await supabase
      .from("projekt_lv_positionen")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("position_nr", { ascending: true });

    if (posRes.error) {
      alert("Greška kod učitavanja LV pozicija: " + posRes.error.message);
      setPositionen([]);
      setLoading(false);
      return;
    }

    setPositionen(posRes.data || []);
    setLoading(false);
  }

  function clearForm() {
    setEditingId(null);
    setPositionNr("");
    setKurztext("");
    setLangtext("");
    setGruppe("");
    setMengeSoll("");
    setEinheit("m²");
    setEinheitspreis("");
    setPositionspreis("");
    setTyp("Normal");
    setMinutenProEinheit("");
    setAktiv(true);
  }

  function calculatePositionspreis() {
    const menge = parseFloat(String(mengeSoll).replace(",", "."));
    const ep = parseFloat(String(einheitspreis).replace(",", "."));

    if (Number.isNaN(menge) || Number.isNaN(ep)) {
      setPositionspreis("");
      return;
    }

    setPositionspreis((menge * ep).toFixed(2));
  }

  async function savePosition() {
    if (!positionNr.trim()) {
      alert("Unesi Positionsnummer.");
      return;
    }

    if (!kurztext.trim()) {
      alert("Unesi Kurztext.");
      return;
    }

    const mengeNumber = parseFloat(String(mengeSoll || "0").replace(",", "."));
    const epNumber = parseFloat(String(einheitspreis || "0").replace(",", "."));
    const ppNumber = parseFloat(String(positionspreis || "0").replace(",", "."));
    const minutenNumber = parseFloat(
      String(minutenProEinheit || "0").replace(",", ".")
    );

    const payload = {
      projekt_id: Number(projektId),
      position_nr: positionNr.trim(),
      kurztext: kurztext.trim(),
      langtext: langtext.trim() || null,
      gruppe: gruppe.trim() || null,
      menge_soll: Number.isNaN(mengeNumber) ? 0 : mengeNumber,
      einheit: einheit.trim() || null,
      einheitspreis: Number.isNaN(epNumber) ? 0 : epNumber,
      positionspreis: Number.isNaN(ppNumber) ? 0 : ppNumber,
      typ,
      minuten_pro_einheit: Number.isNaN(minutenNumber) ? 0 : minutenNumber,
      aktiv,
      created_by: workerName,
    };

    if (editingId) {
      const { error } = await supabase
        .from("projekt_lv_positionen")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        alert("Greška kod izmjene pozicije: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("projekt_lv_positionen")
        .insert(payload);

      if (error) {
        alert("Greška kod dodavanja pozicije: " + error.message);
        return;
      }
    }

    clearForm();
    setShowForm(false);
    loadData();
  }

  function editPosition(pos: any) {
    setEditingId(pos.id);
    setPositionNr(pos.position_nr || "");
    setKurztext(pos.kurztext || "");
    setLangtext(pos.langtext || "");
    setGruppe(pos.gruppe || "");
    setMengeSoll(String(pos.menge_soll ?? ""));
    setEinheit(pos.einheit || "m²");
    setEinheitspreis(String(pos.einheitspreis ?? ""));
    setPositionspreis(String(pos.positionspreis ?? ""));
    setTyp(pos.typ || "Normal");
    setMinutenProEinheit(String(pos.minuten_pro_einheit ?? ""));
    setAktiv(pos.aktiv ?? true);
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deletePosition(id: number) {
    const ok = confirm("Da li sigurno želiš obrisati ovu LV poziciju?");

    if (!ok) return;

    const { error } = await supabase
      .from("projekt_lv_positionen")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Greška kod brisanja pozicije: " + error.message);
      return;
    }

    loadData();
  }

  async function toggleAktiv(pos: any) {
    const { error } = await supabase
      .from("projekt_lv_positionen")
      .update({ aktiv: !pos.aktiv })
      .eq("id", pos.id);

    if (error) {
      alert("Greška kod promjene statusa: " + error.message);
      return;
    }

    loadData();
  }

  function formatNumber(value: any, digits = 2) {
    const num = Number(value || 0);

    return num.toLocaleString("de-AT", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  function plannedHours(pos: any) {
    const menge = Number(pos.menge_soll || 0);
    const minuten = Number(pos.minuten_pro_einheit || 0);

    return (menge * minuten) / 60;
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <h1 style={titleStyle}>📋 LV Positionen</h1>
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

        <button
          onClick={() => {
            clearForm();
            setShowForm(!showForm);
          }}
          style={newButtonStyle}
        >
          {showForm ? "Schließen" : "+ Manuelle Position"}
        </button>
      </div>

      <h1 style={titleStyle}>📋 LV Positionen</h1>

      <p style={descriptionStyle}>
        Projekt: <strong>{projekt?.project_name || "-"}</strong>
      </p>

      <section style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Positionen</span>
          <strong style={summaryValueStyle}>{summary.totalPositions}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Aktiv</span>
          <strong style={summaryValueStyle}>{summary.activePositions}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Soll Summe</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.totalSoll)} €
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Plan Stunden</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.totalPlanHours)} h
          </strong>
        </div>
      </section>

      <section style={importInfoStyle}>
        <h2 style={sectionTitleStyle}>LV Import</h2>
        <p style={infoTextStyle}>
          ONLV / ÖNORM Import wird hier später ergänzt. PDF bleibt nur Reserve.
          Ručni unos za admina ostaje uvijek dostupan.
        </p>
      </section>

      {showForm && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>
            {editingId ? "Position bearbeiten" : "Manuelle LV Position"}
          </h2>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Positionsnummer *</label>
              <input
                value={positionNr}
                onChange={(e) => setPositionNr(e.target.value)}
                placeholder="z.B. 24.11.52A"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Typ</label>
              <select
                value={typ}
                onChange={(e) => setTyp(e.target.value)}
                style={inputStyle}
              >
                <option value="Normal">Normal</option>
                <option value="Eventual">Eventual</option>
                <option value="Regie">Regie</option>
                <option value="Nachtrag">Nachtrag</option>
                <option value="Intern">Intern</option>
              </select>
            </div>
          </div>

          <label style={labelStyle}>Kurztext *</label>
          <input
            value={kurztext}
            onChange={(e) => setKurztext(e.target.value)}
            placeholder="z.B. Wandbelag 30x60cm innen"
            style={inputStyle}
          />

          <label style={labelStyle}>Langtext</label>
          <textarea
            value={langtext}
            onChange={(e) => setLangtext(e.target.value)}
            placeholder="Kompletan opis pozicije / Ausschreibung Text"
            style={textareaStyle}
          />

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Gruppe</label>
              <input
                value={gruppe}
                onChange={(e) => setGruppe(e.target.value)}
                placeholder="z.B. Wandbeläge innen"
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
                <option value="m²">m²</option>
                <option value="m">m</option>
                <option value="Stk.">Stk.</option>
                <option value="h">h</option>
                <option value="VE">VE</option>
                <option value="kg">kg</option>
                <option value="Sack">Sack</option>
                <option value="Psch">Psch</option>
              </select>
            </div>
          </div>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Soll Menge</label>
              <input
                value={mengeSoll}
                onChange={(e) => setMengeSoll(e.target.value)}
                placeholder="z.B. 290"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Einheitspreis €</label>
              <input
                value={einheitspreis}
                onChange={(e) => setEinheitspreis(e.target.value)}
                placeholder="z.B. 69.97"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Positionspreis €</label>
              <input
                value={positionspreis}
                onChange={(e) => setPositionspreis(e.target.value)}
                placeholder="wird automatisch berechnet oder manuell"
                style={inputStyle}
              />
            </div>
          </div>

          <button onClick={calculatePositionspreis} style={calcButtonStyle}>
            Positionspreis berechnen
          </button>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Minuten pro Einheit</label>
              <input
                value={minutenProEinheit}
                onChange={(e) => setMinutenProEinheit(e.target.value)}
                placeholder="z.B. 35"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Aktiv</label>
              <select
                value={aktiv ? "true" : "false"}
                onChange={(e) => setAktiv(e.target.value === "true")}
                style={inputStyle}
              >
                <option value="true">Aktiv</option>
                <option value="false">Inaktiv</option>
              </select>
            </div>
          </div>

          <div style={formButtonRowStyle}>
            <button onClick={savePosition} style={saveButtonStyle}>
              {editingId ? "Änderungen speichern" : "Position speichern"}
            </button>

            <button
              onClick={() => {
                clearForm();
                setShowForm(false);
              }}
              style={cancelButtonStyle}
            >
              Abbrechen
            </button>
          </div>
        </section>
      )}

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Positionen Liste</h2>

        {positionen.length === 0 ? (
          <p style={emptyStyle}>Noch keine LV Positionen vorhanden.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Aktiv</th>
                  <th style={thStyle}>Typ</th>
                  <th style={thStyle}>Position</th>
                  <th style={thStyle}>Kurztext</th>
                  <th style={thStyle}>Gruppe</th>
                  <th style={thStyle}>Soll</th>
                  <th style={thStyle}>EH</th>
                  <th style={thStyle}>EP</th>
                  <th style={thStyle}>PP</th>
                  <th style={thStyle}>Min/EH</th>
                  <th style={thStyle}>Plan h</th>
                  <th style={thStyle}>Aktion</th>
                </tr>
              </thead>

              <tbody>
                {positionen.map((pos) => (
                  <tr
                    key={pos.id}
                    style={{
                      background: pos.aktiv ? "#000" : "#1f1f1f",
                      opacity: pos.aktiv ? 1 : 0.55,
                    }}
                  >
                    <td style={tdStyle}>
                      <button
                        onClick={() => toggleAktiv(pos)}
                        style={pos.aktiv ? activeButtonStyle : inactiveButtonStyle}
                      >
                        {pos.aktiv ? "Aktiv" : "Inaktiv"}
                      </button>
                    </td>

                    <td style={tdStyle}>{pos.typ || "Normal"}</td>

                    <td style={tdStyle}>
                      <strong>{pos.position_nr}</strong>
                    </td>

                    <td style={tdStyle}>{pos.kurztext}</td>
                    <td style={tdStyle}>{pos.gruppe || "-"}</td>
                    <td style={tdRightStyle}>{formatNumber(pos.menge_soll)}</td>
                    <td style={tdStyle}>{pos.einheit || "-"}</td>

                    <td style={tdRightStyle}>
                      {formatNumber(pos.einheitspreis)} €
                    </td>

                    <td style={tdRightStyle}>
                      {formatNumber(pos.positionspreis)} €
                    </td>

                    <td style={tdRightStyle}>
                      {formatNumber(pos.minuten_pro_einheit)}
                    </td>

                    <td style={tdRightStyle}>
                      {formatNumber(plannedHours(pos))}
                    </td>

                    <td style={tdStyle}>
                      <div style={actionRowStyle}>
                        <button
                          onClick={() => editPosition(pos)}
                          style={editButtonStyle}
                        >
                          Bearbeiten
                        </button>

                        <button
                          onClick={() => deletePosition(pos.id)}
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

const importInfoStyle: any = {
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
  minHeight: "110px",
  resize: "vertical",
};

const calcButtonStyle: any = {
  background: "#9333ea",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "11px 14px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "12px",
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
};

const activeButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "6px 9px",
  fontWeight: "bold",
  cursor: "pointer",
};

const inactiveButtonStyle: any = {
  background: "#4b5563",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "6px 9px",
  fontWeight: "bold",
  cursor: "pointer",
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