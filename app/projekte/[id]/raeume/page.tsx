"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];

const STANDARD_POSITIONEN = [
  {
    position_nr: "01",
    kurztext: "Keramika",
    einheit: "m²",
    menge_soll: 0,
    minuten_pro_einheit: 60,
    positionspreis: 0,
  },
  {
    position_nr: "02",
    kurztext: "Priprema podloge",
    einheit: "m²",
    menge_soll: 0,
    minuten_pro_einheit: 15,
    positionspreis: 0,
  },
  {
    position_nr: "03",
    kurztext: "Estrich",
    einheit: "m²",
    menge_soll: 0,
    minuten_pro_einheit: 30,
    positionspreis: 0,
  },
  {
    position_nr: "04",
    kurztext: "Hidroizolacija",
    einheit: "m²",
    menge_soll: 0,
    minuten_pro_einheit: 20,
    positionspreis: 0,
  },
  {
    position_nr: "05",
    kurztext: "Ljepilo",
    einheit: "Sack",
    menge_soll: 0,
    minuten_pro_einheit: 0,
    positionspreis: 0,
  },
  {
    position_nr: "06",
    kurztext: "Schienen",
    einheit: "lfm",
    menge_soll: 0,
    minuten_pro_einheit: 10,
    positionspreis: 0,
  },
  {
    position_nr: "07",
    kurztext: "Fuge",
    einheit: "m²",
    menge_soll: 0,
    minuten_pro_einheit: 12,
    positionspreis: 0,
  },
  {
    position_nr: "08",
    kurztext: "Silikoni",
    einheit: "lfm",
    menge_soll: 0,
    minuten_pro_einheit: 8,
    positionspreis: 0,
  },
  {
    position_nr: "09",
    kurztext: "Terase",
    einheit: "m²",
    menge_soll: 0,
    minuten_pro_einheit: 75,
    positionspreis: 0,
  },
  {
    position_nr: "10",
    kurztext: "Dodaci",
    einheit: "Stk.",
    menge_soll: 0,
    minuten_pro_einheit: 0,
    positionspreis: 0,
  },
];

export default function ProjektPositionenPage() {
  const params = useParams();
  const router = useRouter();
  const savingRef = useRef(false);

  const projektId = String(params.id);

  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projekt, setProjekt] = useState<any>(null);
  const [positionen, setPositionen] = useState<any[]>([]);

  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [leistungen, setLeistungen] = useState<any[]>([]);
  const [fotos, setFotos] = useState<any[]>([]);
  const [aufgaben, setAufgaben] = useState<any[]>([]);
  const [materialBewegungen, setMaterialBewegungen] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [positionNr, setPositionNr] = useState("");
  const [kurztext, setKurztext] = useState("");
  const [einheit, setEinheit] = useState("m²");
  const [mengeSoll, setMengeSoll] = useState("");
  const [minutenProEinheit, setMinutenProEinheit] = useState("");
  const [positionspreis, setPositionspreis] = useState("");
  const [aktiv, setAktiv] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("Alle");

  const positionRows = useMemo(() => {
    return positionen
      .map((pos) => {
        const usage = getPositionUsage(pos.id);

        const mengeSollNum = Number(pos.menge_soll || 0);
        const minuten = Number(pos.minuten_pro_einheit || 0);
        const preis = Number(pos.positionspreis || 0);

        const planStunden = (mengeSollNum * minuten) / 60;
        const planWert = mengeSollNum * preis;

        const leistungListe = leistungen.filter(
          (x) => Number(x.lv_position_id) === Number(pos.id)
        );

        const istMenge = leistungListe.reduce(
          (sum, x) => sum + Number(x.menge_ist || 0) * Number(x.faktor || 1),
          0
        );

        const genehmigtMenge = leistungListe
          .filter((x) => x.status === "Genehmigt")
          .reduce(
            (sum, x) => sum + Number(x.menge_ist || 0) * Number(x.faktor || 1),
            0
          );

        const arbeitszeitStunden = arbeitszeiten
          .filter((x) => Number(x.lv_position_id) === Number(pos.id))
          .reduce((sum, x) => sum + Number(x.stunden || 0), 0);

        const genehmigteStunden = arbeitszeiten
          .filter(
            (x) =>
              Number(x.lv_position_id) === Number(pos.id) &&
              x.freigabe_status === "Genehmigt"
          )
          .reduce((sum, x) => sum + Number(x.stunden || 0), 0);

        const restMenge = mengeSollNum - genehmigtMenge;
        const fortschritt =
          mengeSollNum > 0 ? Math.min((genehmigtMenge / mengeSollNum) * 100, 999) : 0;

        return {
          ...pos,
          aktivStatus: pos.aktiv !== false,
          usage,
          mengeSollNum,
          minuten,
          preis,
          planStunden,
          planWert,
          istMenge,
          genehmigtMenge,
          restMenge,
          arbeitszeitStunden,
          genehmigteStunden,
          fortschritt,
        };
      })
      .filter((row) => {
        if (filterStatus === "Aktiv" && !row.aktivStatus) return false;
        if (filterStatus === "Inaktiv" && row.aktivStatus) return false;

        if (searchText.trim()) {
          const text = `${row.position_nr || ""} ${row.kurztext || ""} ${
            row.einheit || ""
          }`.toLowerCase();

          return text.includes(searchText.trim().toLowerCase());
        }

        return true;
      })
      .sort((a, b) => {
        return String(a.position_nr || "").localeCompare(String(b.position_nr || ""), "de", {
          numeric: true,
        });
      });
  }, [
    positionen,
    arbeitszeiten,
    leistungen,
    fotos,
    aufgaben,
    materialBewegungen,
    searchText,
    filterStatus,
  ]);

  const summary = useMemo(() => {
    const activeRows = positionen.filter((p) => p.aktiv !== false);
    const inactiveRows = positionen.filter((p) => p.aktiv === false);

    const totalPlanStunden = positionen.reduce((sum, p) => {
      return (
        sum +
        (Number(p.menge_soll || 0) * Number(p.minuten_pro_einheit || 0)) / 60
      );
    }, 0);

    const totalPlanWert = positionen.reduce((sum, p) => {
      return sum + Number(p.menge_soll || 0) * Number(p.positionspreis || 0);
    }, 0);

    const totalLeistungMenge = leistungen
      .filter((l) => l.status === "Genehmigt")
      .reduce((sum, l) => {
        return sum + Number(l.menge_ist || 0) * Number(l.faktor || 1);
      }, 0);

    const totalArbeitszeit = arbeitszeiten
      .filter((a) => a.freigabe_status === "Genehmigt")
      .reduce((sum, a) => sum + Number(a.stunden || 0), 0);

    const usedPositions = positionen.filter((p) => getPositionUsage(p.id).total > 0)
      .length;

    return {
      total: positionen.length,
      active: activeRows.length,
      inactive: inactiveRows.length,
      totalPlanStunden,
      totalPlanWert,
      totalLeistungMenge,
      totalArbeitszeit,
      usedPositions,
    };
  }, [positionen, arbeitszeiten, leistungen, fotos, aufgaben, materialBewegungen]);

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

    const arbeitszeitRes = await supabase
      .from("projekt_arbeitszeiten")
      .select("*")
      .eq("projekt_id", Number(projektId));

    setArbeitszeiten(arbeitszeitRes.data || []);

    const leistungRes = await supabase
      .from("projekt_leistungen")
      .select("*")
      .eq("projekt_id", Number(projektId));

    setLeistungen(leistungRes.data || []);

    const fotosRes = await supabase
      .from("projekt_fotos")
      .select("*")
      .eq("projekt_id", Number(projektId));

    setFotos(fotosRes.data || []);

    const aufgabenRes = await supabase
      .from("projekt_aufgaben")
      .select("*")
      .eq("projekt_id", Number(projektId));

    setAufgaben(aufgabenRes.data || []);

    const materialRes = await supabase
      .from("projekt_material_bewegungen")
      .select("*")
      .eq("projekt_id", Number(projektId));

    setMaterialBewegungen(materialRes.data || []);

    setLoading(false);
  }

  function clearForm() {
    setEditingId(null);
    setPositionNr("");
    setKurztext("");
    setEinheit("m²");
    setMengeSoll("");
    setMinutenProEinheit("");
    setPositionspreis("");
    setAktiv(true);
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

  function formatMoney(value: any) {
    const num = Number(value || 0);

    return num.toLocaleString("de-AT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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

  function getPositionUsage(positionId: number | string) {
    const arbeitszeitCount = arbeitszeiten.filter(
      (x) => Number(x.lv_position_id) === Number(positionId)
    ).length;

    const leistungCount = leistungen.filter(
      (x) => Number(x.lv_position_id) === Number(positionId)
    ).length;

    const fotosCount = fotos.filter(
      (x) => Number(x.lv_position_id) === Number(positionId)
    ).length;

    const aufgabenCount = aufgaben.filter(
      (x) => Number(x.lv_position_id) === Number(positionId)
    ).length;

    const materialCount = materialBewegungen.filter(
      (x) => Number(x.lv_position_id) === Number(positionId)
    ).length;

    return {
      arbeitszeitCount,
      leistungCount,
      fotosCount,
      aufgabenCount,
      materialCount,
      total:
        arbeitszeitCount + leistungCount + fotosCount + aufgabenCount + materialCount,
    };
  }

  function checkDuplicatePosition() {
    return positionen.find((pos) => {
      if (editingId && Number(pos.id) === Number(editingId)) return false;

      return (
        String(pos.position_nr || "").trim().toLowerCase() ===
        positionNr.trim().toLowerCase()
      );
    });
  }

  async function savePosition() {
    if (savingRef.current) return;

    if (!positionNr.trim()) {
      alert("Unesi broj pozicije.");
      return;
    }

    if (!kurztext.trim()) {
      alert("Unesi naziv rada / Kurztext.");
      return;
    }

    const duplicate = checkDuplicatePosition();

    if (duplicate) {
      alert("Ovaj broj pozicije već postoji.");
      return;
    }

    savingRef.current = true;
    setSaving(true);

    const payload: any = {
      projekt_id: Number(projektId),
      position_nr: positionNr.trim(),
      kurztext: kurztext.trim(),
      einheit: einheit.trim() || "m²",
      menge_soll: parseNumber(mengeSoll),
      minuten_pro_einheit: parseNumber(minutenProEinheit),
      positionspreis: parseNumber(positionspreis),
      aktiv,
    };

    if (editingId) {
      const { error } = await supabase
        .from("projekt_lv_positionen")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        alert("Greška kod izmjene LV pozicije: " + error.message);
        savingRef.current = false;
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("projekt_lv_positionen").insert(payload);

      if (error) {
        alert("Greška kod dodavanja LV pozicije: " + error.message);
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

  function editPosition(pos: any) {
    setEditingId(pos.id);
    setPositionNr(pos.position_nr || "");
    setKurztext(pos.kurztext || "");
    setEinheit(pos.einheit || "m²");
    setMengeSoll(String(pos.menge_soll || ""));
    setMinutenProEinheit(String(pos.minuten_pro_einheit || ""));
    setPositionspreis(String(pos.positionspreis || ""));
    setAktiv(pos.aktiv !== false);
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deletePosition(pos: any) {
    const usage = getPositionUsage(pos.id);

    if (usage.total > 0) {
      alert(
        "Ova LV pozicija se već koristi i ne može se obrisati.\n\n" +
          "Možeš je postaviti kao INAKTIV.\n\n" +
          `Arbeitszeit: ${usage.arbeitszeitCount}\n` +
          `Leistung: ${usage.leistungCount}\n` +
          `Fotos: ${usage.fotosCount}\n` +
          `Aufgaben: ${usage.aufgabenCount}\n` +
          `Material: ${usage.materialCount}`
      );
      return;
    }

    const ok = confirm("Da li sigurno želiš obrisati ovu LV poziciju?");

    if (!ok) return;

    const { error } = await supabase
      .from("projekt_lv_positionen")
      .delete()
      .eq("id", pos.id);

    if (error) {
      alert("Greška kod brisanja LV pozicije: " + error.message);
      return;
    }

    await loadData();
  }

  async function toggleAktiv(pos: any) {
    const { error } = await supabase
      .from("projekt_lv_positionen")
      .update({ aktiv: pos.aktiv === false })
      .eq("id", pos.id);

    if (error) {
      alert("Greška kod promjene statusa: " + error.message);
      return;
    }

    await loadData();
  }

  async function addStandardPositionen() {
    if (savingRef.current) return;

    const ok = confirm(
      "Dodati standardne LV pozicije?\n\nDupli brojevi pozicija se neće dodati."
    );

    if (!ok) return;

    const existingNumbers = positionen.map((p) =>
      String(p.position_nr || "").trim().toLowerCase()
    );

    const rowsToInsert = STANDARD_POSITIONEN.filter((item) => {
      return !existingNumbers.includes(String(item.position_nr).trim().toLowerCase());
    }).map((item) => ({
      projekt_id: Number(projektId),
      position_nr: item.position_nr,
      kurztext: item.kurztext,
      einheit: item.einheit,
      menge_soll: item.menge_soll,
      minuten_pro_einheit: item.minuten_pro_einheit,
      positionspreis: item.positionspreis,
      aktiv: true,
    }));

    if (rowsToInsert.length === 0) {
      alert("Sve standardne pozicije već postoje.");
      return;
    }

    savingRef.current = true;
    setSaving(true);

    const { error } = await supabase.from("projekt_lv_positionen").insert(rowsToInsert);

    if (error) {
      alert("Greška kod dodavanja standardnih pozicija: " + error.message);
      savingRef.current = false;
      setSaving(false);
      return;
    }

    await loadData();

    savingRef.current = false;
    setSaving(false);
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

        <div style={topButtonWrapStyle}>
          <button onClick={loadData} style={refreshButtonStyle}>
            Aktualisieren
          </button>

          <button onClick={addStandardPositionen} disabled={saving} style={purpleButtonStyle}>
            Standard LV
          </button>

          <button
            onClick={() => {
              clearForm();
              setShowForm(!showForm);
            }}
            disabled={saving}
            style={newButtonStyle}
          >
            {showForm ? "Schließen" : "+ LV Position"}
          </button>
        </div>
      </div>

      <h1 style={titleStyle}>📋 LV Positionen</h1>

      <p style={descriptionStyle}>
        Projekt: <strong>{projekt?.project_name || "-"}</strong> · Admin:{" "}
        <strong>{workerName}</strong>
      </p>

      <section style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Positionen</span>
          <strong style={summaryValueStyle}>{summary.total}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Aktiv</span>
          <strong style={{ ...summaryValueStyle, color: "#22c55e" }}>
            {summary.active}
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Inaktiv</span>
          <strong style={{ ...summaryValueStyle, color: "#ef4444" }}>
            {summary.inactive}
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Benutzt</span>
          <strong style={summaryValueStyle}>{summary.usedPositions}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Plan Stunden</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.totalPlanStunden)} h
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>LV Wert</span>
          <strong style={summaryValueStyle}>{formatMoney(summary.totalPlanWert)} €</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Genehmigte Leistung</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.totalLeistungMenge)}
          </strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Genehmigte Stunden</span>
          <strong style={summaryValueStyle}>
            {formatNumber(summary.totalArbeitszeit)} h
          </strong>
        </div>
      </section>

      <section style={infoBoxStyle}>
        <h2 style={sectionTitleStyle}>LV Regel</h2>
        <p style={infoTextStyle}>
          LV pozicije se koriste u Arbeitszeit, Leistung, Fotos, Aufgaben i
          Material. Pozicija koja se već koristi ne briše se, nego se postavlja kao
          inaktiv.
        </p>
      </section>

      <section style={filterBoxStyle}>
        <div style={filterGridStyle}>
          <div>
            <label style={labelStyle}>Traži poziciju</label>
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Broj, naziv, jedinica..."
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Status Filter</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={inputStyle}
            >
              <option value="Alle">Alle</option>
              <option value="Aktiv">Aktiv</option>
              <option value="Inaktiv">Inaktiv</option>
            </select>
          </div>

          <button
            onClick={() => {
              setSearchText("");
              setFilterStatus("Alle");
            }}
            style={grayButtonStyle}
          >
            Filter löschen
          </button>
        </div>
      </section>

      {showForm && (
        <section style={formBoxStyle}>
          <h2 style={formTitleStyle}>
            {editingId ? "LV Position bearbeiten" : "LV Position anlegen"}
          </h2>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Position Nr. *</label>
              <input
                value={positionNr}
                onChange={(e) => setPositionNr(e.target.value)}
                placeholder="z.B. 01"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Einheit</label>
              <input
                value={einheit}
                onChange={(e) => setEinheit(e.target.value)}
                placeholder="m² / lfm / Stk. / Sack"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Aktiv</label>
              <select
                value={aktiv ? "Ja" : "Nein"}
                onChange={(e) => setAktiv(e.target.value === "Ja")}
                style={inputStyle}
              >
                <option value="Ja">Ja</option>
                <option value="Nein">Nein</option>
              </select>
            </div>
          </div>

          <label style={labelStyle}>Kurztext / Arbeit *</label>
          <input
            value={kurztext}
            onChange={(e) => setKurztext(e.target.value)}
            placeholder="z.B. Keramika, Fuge, Silikon..."
            style={inputStyle}
          />

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Menge Soll</label>
              <input
                type="number"
                step="0.01"
                value={mengeSoll}
                onChange={(e) => setMengeSoll(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Minuten pro Einheit</label>
              <input
                type="number"
                step="0.01"
                value={minutenProEinheit}
                onChange={(e) => setMinutenProEinheit(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Positionspreis €</label>
              <input
                type="number"
                step="0.01"
                value={positionspreis}
                onChange={(e) => setPositionspreis(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={previewBoxStyle}>
            <strong>Pregled:</strong> {positionNr || "-"} · {kurztext || "-"} · Menge{" "}
            {formatNumber(parseNumber(mengeSoll))} {einheit || ""} · Plan{" "}
            <strong>
              {formatNumber(
                (parseNumber(mengeSoll) * parseNumber(minutenProEinheit)) / 60
              )}{" "}
              h
            </strong>{" "}
            · Wert{" "}
            <strong>
              {formatMoney(parseNumber(mengeSoll) * parseNumber(positionspreis))} €
            </strong>
          </div>

          <div style={formButtonRowStyle}>
            <button
              onClick={savePosition}
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
                : "Position speichern"}
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
        <h2 style={sectionTitleStyle}>LV Positionen Liste</h2>

        {positionRows.length === 0 ? (
          <p style={emptyStyle}>Keine LV Positionen gefunden.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Nr.</th>
                  <th style={thStyle}>Kurztext</th>
                  <th style={thStyle}>EH</th>
                  <th style={thRightStyle}>Menge Soll</th>
                  <th style={thRightStyle}>Min/EH</th>
                  <th style={thRightStyle}>Plan h</th>
                  <th style={thRightStyle}>Preis</th>
                  <th style={thRightStyle}>Wert</th>
                  <th style={thRightStyle}>Ist</th>
                  <th style={thRightStyle}>Fortschritt</th>
                  <th style={thRightStyle}>Nutzung</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Aktion</th>
                </tr>
              </thead>

              <tbody>
                {positionRows.map((pos) => (
                  <tr key={pos.id}>
                    <td style={tdStyle}>
                      <strong>{pos.position_nr}</strong>
                    </td>

                    <td style={tdStyle}>
                      <strong>{pos.kurztext}</strong>
                      {isAdmin && (
                        <div style={miniTextStyle}>
                          Zeit der Eingabe: {formatDateTime(pos.created_at)}
                        </div>
                      )}
                    </td>

                    <td style={tdStyle}>{pos.einheit || "-"}</td>
                    <td style={tdRightStyle}>{formatNumber(pos.mengeSollNum)}</td>
                    <td style={tdRightStyle}>{formatNumber(pos.minuten)}</td>
                    <td style={tdRightStyle}>{formatNumber(pos.planStunden)} h</td>
                    <td style={tdRightStyle}>{formatMoney(pos.preis)} €</td>
                    <td style={tdRightStyle}>{formatMoney(pos.planWert)} €</td>
                    <td style={tdRightStyle}>{formatNumber(pos.genehmigtMenge)}</td>
                    <td style={tdRightStyle}>{formatNumber(pos.fortschritt)}%</td>
                    <td style={tdRightStyle}>
                      {pos.usage.total > 0 ? (
                        <span style={warningBadgeStyle}>{pos.usage.total}</span>
                      ) : (
                        <span style={okBadgeStyle}>frei</span>
                      )}
                    </td>

                    <td style={tdStyle}>
                      {pos.aktivStatus ? (
                        <span style={okBadgeStyle}>Aktiv</span>
                      ) : (
                        <span style={dangerBadgeStyle}>Inaktiv</span>
                      )}
                    </td>

                    <td style={tdStyle}>
                      <div style={actionRowStyle}>
                        <button onClick={() => editPosition(pos)} style={editButtonStyle}>
                          Bearbeiten
                        </button>

                        <button onClick={() => toggleAktiv(pos)} style={statusButtonStyle}>
                          {pos.aktivStatus ? "Inaktiv" : "Aktiv"}
                        </button>

                        <button
                          onClick={() => deletePosition(pos)}
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

const purpleButtonStyle: any = {
  background: "#7c3aed",
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

const filterBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "20px",
};

const filterGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "12px",
  alignItems: "end",
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

const previewBoxStyle: any = {
  marginTop: "14px",
  background: "#000",
  border: "1px solid #333",
  borderRadius: "12px",
  padding: "12px",
  color: "#ddd",
  lineHeight: "1.5",
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

const tableWrapStyle: any = {
  overflowX: "auto",
};

const tableStyle: any = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "1450px",
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

const statusButtonStyle: any = {
  background: "#ca8a04",
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

const dangerBadgeStyle: any = {
  background: "#dc2626",
  color: "white",
  borderRadius: "999px",
  padding: "5px 9px",
  fontWeight: "bold",
  fontSize: "12px",
  whiteSpace: "nowrap",
};