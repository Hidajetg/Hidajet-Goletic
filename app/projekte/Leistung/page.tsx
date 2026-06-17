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

export default function ProjektLeistungPage() {
  const params = useParams();
  const router = useRouter();

  const projektId = String(params.id);

  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const summary = useMemo(() => {
    const totalEntries = leistungen.length;

    const totalEffectiveHours = leistungen.reduce((sum, item) => {
      return sum + getEffectiveHours(item);
    }, 0);

    const totalIstMenge = leistungen.reduce((sum, item) => {
      return sum + Number(item.menge_ist || 0);
    }, 0);

    const confirmed = leistungen.filter((item) => item.status === "Bestätigt")
      .length;

    return {
      totalEntries,
      totalEffectiveHours,
      totalIstMenge,
      confirmed,
    };
  }, [leistungen, positionen]);

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

    return new Date(value).toLocaleDateString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
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

  function getRaumName(id: number | null) {
    const raum = getRaum(id);
    if (!raum) return "-";

    return `${raum.ebene ? raum.ebene + " - " : ""}${raum.raum_name}`;
  }

  function getPositionText(id: number | null) {
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
    const wirksameMenge = getWirksameMenge(item);

    return (wirksameMenge * minuten) / 60;
  }

  function getRelatedArbeitszeiten(item: any) {
    return arbeitszeiten.filter((zeit) => {
      const sameDate = zeit.datum === item.datum;
      const sameRaum = Number(zeit.raum_id) === Number(item.raum_id);

      const samePosition =
        !zeit.lv_position_id ||
        Number(zeit.lv_position_id) === Number(item.lv_position_id);

      return sameDate && sameRaum && samePosition;
    });
  }

  function getWorkerSplit(item: any) {
    const related = getRelatedArbeitszeiten(item);
    const effectiveHours = getEffectiveHours(item);

    const byWorker: any = {};

    related.forEach((zeit) => {
      const name = zeit.worker_name || "Unbekannt";
      byWorker[name] = (byWorker[name] || 0) + Number(zeit.stunden || 0);
    });

    const totalRealHours = Object.values(byWorker).reduce(
      (sum: any, value: any) => {
        return Number(sum) + Number(value || 0);
      },
      0
    ) as number;

    return Object.keys(byWorker).map((name) => {
      const realHours = Number(byWorker[name] || 0);
      const share = totalRealHours > 0 ? realHours / totalRealHours : 0;
      const effectiveShare = effectiveHours * share;
      const efficiency = realHours > 0 ? (effectiveShare / realHours) * 100 : 0;

      return {
        name,
        realHours,
        effectiveShare,
        efficiency,
      };
    });
  }

  function onSelectRaum(id: string) {
    setSelectedRaumId(id);

    const raum = getRaum(id);

    if (raum) {
      setFaktor(String(raum.faktor || "1.00"));
    }
  }

  function onSelectPosition(id: string) {
    setSelectedPositionId(id);

    const pos = getPosition(id);

    if (pos) {
      setEinheit(pos.einheit || "m²");
    }
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

  async function saveLeistung() {
    if (!datum) {
      alert("Odaberi datum.");
      return;
    }

    if (!selectedRaumId) {
      alert("Odaberi prostoriju.");
      return;
    }

    if (!selectedPositionId) {
      alert("Odaberi LV poziciju.");
      return;
    }

    const mengeNumber = parseNumber(mengeIst);
    const faktorNumber = parseNumber(faktor);

    if (mengeNumber <= 0) {
      alert("Menge mora biti veća od 0.");
      return;
    }

    if (faktorNumber <= 0) {
      alert("Faktor mora biti veći od 0.");
      return;
    }

    const payload = {
      projekt_id: Number(projektId),
      datum,
      raum_id: Number(selectedRaumId),
      lv_position_id: Number(selectedPositionId),
      menge_ist: mengeNumber,
      einheit,
      faktor: faktorNumber,
      wirksame_menge: mengeNumber * faktorNumber,
      status,
      notiz: notiz.trim() || null,
      created_by: workerName,
    };

    if (editingId) {
      const { error } = await supabase
        .from("projekt_leistungen")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        alert("Greška kod izmjene Leistung: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("projekt_leistungen").insert(payload);

      if (error) {
        alert("Greška kod dodavanja Leistung: " + error.message);
        return;
      }
    }

    clearForm();
    setShowForm(false);
    loadData();
  }

  function editLeistung(item: any) {
    setEditingId(item.id);
    setDatum(item.datum || getTodayLocalDate());
    setSelectedRaumId(item.raum_id ? String(item.raum_id) : "");
    setSelectedPositionId(item.lv_position_id ? String(item.lv_position_id) : "");
    setMengeIst(String(item.menge_ist ?? ""));
    setEinheit(item.einheit || "m²");
    setFaktor(String(item.faktor ?? "1.00"));
    setStatus(item.status || "Offen");
    setNotiz(item.notiz || "");
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteLeistung(id: number) {
    const ok = confirm("Da li sigurno želiš obrisati ovaj Leistung unos?");

    if (!ok) return;

    const { error } = await supabase
      .from("projekt_leistungen")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Greška kod brisanja Leistung: " + error.message);
      return;
    }

    loadData();
  }

  async function changeStatus(id: number, newStatus: string) {
    const { error } = await supabase
      .from("projekt_leistungen")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      alert("Greška kod statusa: " + error.message);
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

        <button
          onClick={() => {
            clearForm();
            setShowForm(!showForm);
          }}
          style={newButtonStyle}
        >
          {showForm ? "Schließen" : "+ Leistung"}
        </button>
      </div>

      <h1 style={titleStyle}>✅ Leistung</h1>

      <p style={descriptionStyle}>
        Projekt: <strong>{projekt?.project_name || "-"}</strong>
      </p>

      <section style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Einträge</span>
          <strong style={summaryValueStyle}>{summary.totalEntries}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Bestätigt</span>
          <strong style={summaryValueStyle}>{summary.confirmed}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Ist Menge</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.totalIstMenge)}
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Effektive Stunden</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.totalEffectiveHours)} h
          </strong>
        </div>
      </section>

      <section style={infoBoxStyle}>
        <h2 style={sectionTitleStyle}>Kako se računa?</h2>
        <p style={infoTextStyle}>
          Leistung se unosi jednom po prostoru i LV poziciji. Aplikacija uzima
          normu iz LV pozicije, faktor iz prostorije i stvarne sate iz
          Arbeitszeit. Tako se kasnije vidi ko je koliko stvarno doprinio.
        </p>
      </section>

      {showForm && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>
            {editingId ? "Leistung bearbeiten" : "Leistung eintragen"}
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
                  <label style={labelStyle}>Datum *</label>
                  <input
                    type="date"
                    value={datum}
                    onChange={(e) => setDatum(e.target.value)}
                    style={inputStyle}
                  />
                </div>

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
              </div>

              <label style={labelStyle}>LV Position *</label>
              <select
                value={selectedPositionId}
                onChange={(e) => onSelectPosition(e.target.value)}
                style={inputStyle}
              >
                <option value="">Odaberi LV poziciju</option>
                {positionen.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.position_nr} - {pos.kurztext} | {pos.einheit} |{" "}
                    {pos.minuten_pro_einheit} Min/EH
                  </option>
                ))}
              </select>

              <div style={formGridStyle}>
                <div>
                  <label style={labelStyle}>Menge Ist *</label>
                  <input
                    value={mengeIst}
                    onChange={(e) => setMengeIst(e.target.value)}
                    placeholder="z.B. 18"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Einheit</label>
                  <input
                    value={einheit}
                    onChange={(e) => setEinheit(e.target.value)}
                    placeholder="m² / m / Stk."
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Faktor</label>
                  <input
                    value={faktor}
                    onChange={(e) => setFaktor(e.target.value)}
                    placeholder="z.B. 1.25"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={calculatedBoxStyle}>
                Wirksame Menge:{" "}
                <strong>{formatNumber(parseNumber(mengeIst) * parseNumber(faktor))}</strong>{" "}
                {einheit}
                <br />
                Effektive Stunden:{" "}
                <strong>
                  {formatNumber(
                    (parseNumber(mengeIst) *
                      parseNumber(faktor) *
                      Number(
                        getPosition(selectedPositionId)?.minuten_pro_einheit || 0
                      )) /
                      60
                  )}{" "}
                  h
                </strong>
              </div>

              <label style={labelStyle}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={inputStyle}
              >
                <option value="Offen">Offen</option>
                <option value="Bestätigt">Bestätigt</option>
                <option value="Abgelehnt">Abgelehnt</option>
              </select>

              <label style={labelStyle}>Notiz</label>
              <textarea
                value={notiz}
                onChange={(e) => setNotiz(e.target.value)}
                placeholder="Napomena za dnevni učinak"
                style={textareaStyle}
              />

              <div style={formButtonRowStyle}>
                <button onClick={saveLeistung} style={saveButtonStyle}>
                  {editingId ? "Änderungen speichern" : "Leistung speichern"}
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
            </>
          )}
        </section>
      )}

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Leistung Liste</h2>

        {leistungen.length === 0 ? (
          <p style={emptyStyle}>Noch keine Leistung vorhanden.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Datum</th>
                  <th style={thStyle}>Raum</th>
                  <th style={thStyle}>LV Position</th>
                  <th style={thStyle}>Menge</th>
                  <th style={thStyle}>EH</th>
                  <th style={thStyle}>Faktor</th>
                  <th style={thStyle}>Wirksam</th>
                  <th style={thStyle}>Eff. h</th>
                  <th style={thStyle}>Arbeitszeit h</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Aktion</th>
                </tr>
              </thead>

              <tbody>
                {leistungen.map((item) => {
                  const related = getRelatedArbeitszeiten(item);
                  const realHours = related.reduce(
                    (sum, z) => sum + Number(z.stunden || 0),
                    0
                  );

                  return (
                    <tr key={item.id}>
                      <td style={tdStyle}>{formatDate(item.datum)}</td>
                      <td style={tdStyle}>{getRaumName(item.raum_id)}</td>
                      <td style={tdStyle}>
                        {getPositionText(item.lv_position_id)}
                      </td>
                      <td style={tdRightStyle}>
                        {formatNumber(item.menge_ist)}
                      </td>
                      <td style={tdStyle}>{item.einheit || "-"}</td>
                      <td style={tdRightStyle}>{formatNumber(item.faktor)}</td>
                      <td style={tdRightStyle}>
                        {formatNumber(item.wirksame_menge)}
                      </td>
                      <td style={tdRightStyle}>
                        <strong>{formatNumber(getEffectiveHours(item))} h</strong>
                      </td>
                      <td style={tdRightStyle}>{formatNumber(realHours)} h</td>
                      <td style={tdStyle}>
                        <select
                          value={item.status || "Offen"}
                          onChange={(e) => changeStatus(item.id, e.target.value)}
                          style={smallSelectStyle}
                        >
                          <option value="Offen">Offen</option>
                          <option value="Bestätigt">Bestätigt</option>
                          <option value="Abgelehnt">Abgelehnt</option>
                        </select>
                      </td>
                      <td style={tdStyle}>
                        <div style={actionRowStyle}>
                          <button
                            onClick={() => editLeistung(item)}
                            style={editButtonStyle}
                          >
                            Bearbeiten
                          </button>

                          <button
                            onClick={() => deleteLeistung(item.id)}
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
        <h2 style={sectionTitleStyle}>Aufteilung nach Arbeitszeit</h2>

        {leistungen.length === 0 ? (
          <p style={emptyStyle}>Noch keine Aufteilung vorhanden.</p>
        ) : (
          <div style={splitGridStyle}>
            {leistungen.map((item) => {
              const split = getWorkerSplit(item);

              return (
                <div key={item.id} style={splitCardStyle}>
                  <h3 style={splitTitleStyle}>
                    {formatDate(item.datum)} · {getRaumName(item.raum_id)}
                  </h3>

                  <p style={splitTextStyle}>
                    <strong>{getPositionText(item.lv_position_id)}</strong>
                  </p>

                  <p style={splitTextStyle}>
                    Effektive Stunden:{" "}
                    <strong>{formatNumber(getEffectiveHours(item))} h</strong>
                  </p>

                  {split.length === 0 ? (
                    <p style={warningSmallStyle}>
                      Nema Arbeitszeit za ovaj datum i ovu prostoriju.
                    </p>
                  ) : (
                    <div style={miniTableWrapStyle}>
                      <table style={miniTableStyle}>
                        <thead>
                          <tr>
                            <th style={miniThStyle}>Radnik</th>
                            <th style={miniThStyle}>Real h</th>
                            <th style={miniThStyle}>Eff. h</th>
                            <th style={miniThStyle}>%</th>
                          </tr>
                        </thead>

                        <tbody>
                          {split.map((worker) => (
                            <tr key={worker.name}>
                              <td style={miniTdStyle}>{worker.name}</td>
                              <td style={miniTdRightStyle}>
                                {formatNumber(worker.realHours)}
                              </td>
                              <td style={miniTdRightStyle}>
                                {formatNumber(worker.effectiveShare)}
                              </td>
                              <td style={miniTdRightStyle}>
                                {formatNumber(worker.efficiency, 0)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
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

const smallSelectStyle: any = {
  background: "#000",
  color: "white",
  border: "1px solid #333",
  borderRadius: "8px",
  padding: "7px",
};

const textareaStyle: any = {
  ...inputStyle,
  minHeight: "95px",
  resize: "vertical",
};

const calculatedBoxStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "12px",
  padding: "12px",
  marginTop: "12px",
  color: "#f97316",
  fontSize: "16px",
  lineHeight: "1.7",
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

const warningSmallStyle: any = {
  background: "#7f1d1d",
  border: "1px solid #dc2626",
  color: "white",
  borderRadius: "10px",
  padding: "10px",
  fontSize: "13px",
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

const splitGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "14px",
};

const splitCardStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "14px",
  padding: "14px",
};

const splitTitleStyle: any = {
  color: "#f97316",
  marginTop: 0,
  marginBottom: "8px",
};

const splitTextStyle: any = {
  color: "#ccc",
  margin: "6px 0",
  fontSize: "14px",
};

const miniTableWrapStyle: any = {
  overflowX: "auto",
};

const miniTableStyle: any = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "10px",
};

const miniThStyle: any = {
  borderBottom: "1px solid #333",
  color: "#f97316",
  padding: "7px",
  fontSize: "12px",
  textAlign: "left",
};

const miniTdStyle: any = {
  borderBottom: "1px solid #222",
  color: "#ddd",
  padding: "7px",
  fontSize: "12px",
};

const miniTdRightStyle: any = {
  ...miniTdStyle,
  textAlign: "right",
};