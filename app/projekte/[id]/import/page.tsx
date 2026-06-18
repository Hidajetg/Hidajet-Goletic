"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];

type ImportPosition = {
  selected: boolean;
  position_nr: string;
  kurztext: string;
  langtext: string;
  gruppe: string;
  menge_soll: number;
  einheit: string;
  einheitspreis: number;
  positionspreis: number;
  typ: string;
  minuten_pro_einheit: number;
  duplicate?: boolean;
};

export default function ProjektImportPage() {
  const params = useParams();
  const router = useRouter();

  const projektId = String(params.id);

  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [projekt, setProjekt] = useState<any>(null);
  const [existingPositionen, setExistingPositionen] = useState<any[]>([]);

  const [fileName, setFileName] = useState("");
  const [xmlText, setXmlText] = useState("");
  const [preview, setPreview] = useState<ImportPosition[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [importing, setImporting] = useState(false);

  const summary = useMemo(() => {
    const selected = preview.filter((p) => p.selected).length;
    const duplicates = preview.filter((p) => p.duplicate).length;
    const totalValue = preview
      .filter((p) => p.selected)
      .reduce((sum, p) => sum + Number(p.positionspreis || 0), 0);

    return {
      total: preview.length,
      selected,
      duplicates,
      totalValue,
    };
  }, [preview]);

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

    const posRes = await supabase
      .from("projekt_lv_positionen")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("position_nr", { ascending: true });

    if (posRes.error) {
      alert("Greška kod učitavanja postojećih LV pozicija: " + posRes.error.message);
      setExistingPositionen([]);
      setLoading(false);
      return;
    }

    setExistingPositionen(posRes.data || []);
    setLoading(false);
  }

  function parseNumber(value: string | null | undefined) {
    if (!value) return 0;

    const cleaned = String(value)
      .replace(/\s/g, "")
      .replace("€", "")
      .replace(",", ".");

    const num = parseFloat(cleaned);

    return Number.isNaN(num) ? 0 : num;
  }

  function formatNumber(value: any, digits = 2) {
    const num = Number(value || 0);

    return num.toLocaleString("de-AT", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  function formatEuro(value: any) {
    const num = Number(value || 0);

    return num.toLocaleString("de-AT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function directChildren(el: Element, name: string) {
    return Array.from(el.children).filter((child) => child.localName === name);
  }

  function directChild(el: Element | null, name: string) {
    if (!el) return null;
    return directChildren(el, name)[0] || null;
  }

  function firstDescendantText(el: Element | null, name: string) {
    if (!el) return "";

    const found = Array.from(el.getElementsByTagNameNS("*", name))[0];

    return found?.textContent?.trim() || "";
  }

  function directText(el: Element | null) {
    if (!el) return "";
    return el.textContent?.trim() || "";
  }

  function guessMinutes(kurztext: string, einheit: string) {
    const text = kurztext.toLowerCase();
    const eh = String(einheit || "").toLowerCase();

    if (text.includes("silikon")) return eh.includes("m") ? 3 : 5;
    if (text.includes("fuge") || text.includes("verfug")) return 5;
    if (text.includes("schiene") || text.includes("abschlussprofil")) return 4;
    if (text.includes("mosaik")) return 35;
    if (text.includes("wandbelag") || text.includes("wandfliese")) return 25;
    if (text.includes("bodenbelag") || text.includes("bodenfliese")) return 20;
    if (text.includes("abdicht") || text.includes("dichtband")) return 12;
    if (text.includes("grundier") || text.includes("voranstrich")) return 6;
    if (text.includes("ausgleich") || text.includes("spachtel")) return 10;
    if (text.includes("sockel")) return 8;
    if (text.includes("regie")) return 0;

    if (eh.includes("m²")) return 18;
    if (eh === "m") return 5;
    if (eh.includes("stk")) return 6;

    return 0;
  }

  function getPositionTyp(posEig: Element | null) {
    const pzzv = directChild(posEig, "pzzv");
    if (!pzzv) return "Normal";

    const names = Array.from(pzzv.children).map((child) => child.localName);

    if (names.includes("eventualposition")) return "Eventual";
    if (names.includes("wahlposition")) return "Wahl";
    if (names.includes("alternativposition")) return "Alternativ";
    if (names.includes("normalposition")) return "Normal";

    return "Normal";
  }

  function markDuplicates(items: ImportPosition[]) {
    const existing = new Set(
      existingPositionen.map((p) => String(p.position_nr || "").trim())
    );

    return items.map((item) => ({
      ...item,
      duplicate: existing.has(item.position_nr),
      selected: existing.has(item.position_nr) ? false : item.selected,
    }));
  }

  function parseOnlvXml(text: string) {
    if (!text.trim()) {
      alert("Prvo izaberi ONLV fajl ili zalijepi XML tekst.");
      return;
    }

    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");

    const parserError = xml.getElementsByTagName("parsererror")[0];

    if (parserError) {
      alert("XML nije ispravan. Provjeri ONLV fajl.");
      return;
    }

    const items: ImportPosition[] = [];
    const lgs = Array.from(xml.getElementsByTagNameNS("*", "lg"));

    lgs.forEach((lg) => {
      const lgNr = lg.getAttribute("nr") || "";
      const lgEig = directChild(lg, "lg-eigenschaften");
      const lgTitle = firstDescendantText(lgEig, "ueberschrift");

      const ulgs = directChildren(directChild(lg, "ulg-liste") || lg, "ulg");

      ulgs.forEach((ulg) => {
        const ulgNr = ulg.getAttribute("nr") || "";
        const ulgEig = directChild(ulg, "ulg-eigenschaften");
        const ulgTitle = firstDescendantText(ulgEig, "ueberschrift");

        const positionen = directChild(ulg, "positionen");
        if (!positionen) return;

        const grundtexte = directChildren(positionen, "grundtextnr");

        grundtexte.forEach((grund) => {
          const grundNr = grund.getAttribute("nr") || "";
          const grundTextElement = directChild(directChild(grund, "grundtext"), "langtext");
          const grundLangtext = directText(grundTextElement);

          const folgepositionen = directChildren(grund, "folgeposition");

          folgepositionen.forEach((folge) => {
            const ftnr = folge.getAttribute("ftnr") || "";
            const posEig = directChild(folge, "pos-eigenschaften");

            if (!posEig) return;

            const kurztext = firstDescendantText(posEig, "stichwort");
            const folgeLangtext = firstDescendantText(posEig, "langtext");
            const einheit = firstDescendantText(posEig, "einheit");
            const menge = parseNumber(firstDescendantText(posEig, "lvmenge"));
            const preis = directChild(posEig, "preis");
            const einheitspreis = parseNumber(firstDescendantText(preis, "gesamt"));
            const positionspreis = parseNumber(firstDescendantText(posEig, "pospreis"));

            if (!kurztext) return;

            const positionNr = `${lgNr}.${ulgNr}.${grundNr}${ftnr}`;
            const typ = getPositionTyp(posEig);

            items.push({
              selected: menge > 0,
              position_nr: positionNr,
              kurztext,
              langtext: [grundLangtext, folgeLangtext].filter(Boolean).join("\n\n"),
              gruppe: `${lgNr}.${ulgNr} ${ulgTitle || lgTitle || ""}`.trim(),
              menge_soll: menge,
              einheit,
              einheitspreis,
              positionspreis,
              typ,
              minuten_pro_einheit: guessMinutes(kurztext, einheit),
            });
          });
        });
      });
    });

    const uniqueMap = new Map<string, ImportPosition>();

    items.forEach((item) => {
      if (!uniqueMap.has(item.position_nr)) {
        uniqueMap.set(item.position_nr, item);
      }
    });

    const uniqueItems = Array.from(uniqueMap.values()).sort((a, b) =>
      a.position_nr.localeCompare(b.position_nr, "de", { numeric: true })
    );

    const withDuplicates = markDuplicates(uniqueItems);

    setPreview(withDuplicates);

    if (withDuplicates.length === 0) {
      alert("Nisam pronašao LV pozicije u ONLV fajlu.");
    }
  }

  async function handleFile(file: File | null) {
    if (!file) return;

    setFileName(file.name);

    const text = await file.text();
    setXmlText(text);
    parseOnlvXml(text);
  }

  function toggleSelected(positionNr: string) {
    setPreview((prev) =>
      prev.map((item) =>
        item.position_nr === positionNr
          ? { ...item, selected: !item.selected }
          : item
      )
    );
  }

  function selectAll(value: boolean) {
    setPreview((prev) =>
      prev.map((item) => ({
        ...item,
        selected: value && !item.duplicate,
      }))
    );
  }

  async function importPositions() {
    const selected = preview.filter((item) => item.selected);

    if (selected.length === 0) {
      alert("Nema odabranih pozicija za import.");
      return;
    }

    const ok = confirm(
      replaceExisting
        ? "Ovo će obrisati sve postojeće LV pozicije za ovaj projekt i importovati nove. Nastaviti?"
        : "Importovati odabrane LV pozicije?"
    );

    if (!ok) return;

    setImporting(true);

    if (replaceExisting) {
      const deleteRes = await supabase
        .from("projekt_lv_positionen")
        .delete()
        .eq("projekt_id", Number(projektId));

      if (deleteRes.error) {
        alert("Greška kod brisanja starih LV pozicija: " + deleteRes.error.message);
        setImporting(false);
        return;
      }
    }

    const existing = new Set(
      existingPositionen.map((p) => String(p.position_nr || "").trim())
    );

    const payload = selected
      .filter((item) => replaceExisting || !existing.has(item.position_nr))
      .map((item) => ({
        projekt_id: Number(projektId),
        position_nr: item.position_nr,
        kurztext: item.kurztext,
        langtext: item.langtext || null,
        gruppe: item.gruppe || null,
        menge_soll: item.menge_soll || 0,
        einheit: item.einheit || null,
        einheitspreis: item.einheitspreis || 0,
        positionspreis: item.positionspreis || 0,
        typ: item.typ || "Normal",
        minuten_pro_einheit: item.minuten_pro_einheit || 0,
        aktiv: true,
        created_by: workerName,
      }));

    if (payload.length === 0) {
      alert("Sve odabrane pozicije već postoje.");
      setImporting(false);
      return;
    }

    const { error } = await supabase.from("projekt_lv_positionen").insert(payload);

    if (error) {
      alert("Greška kod importa LV pozicija: " + error.message);
      setImporting(false);
      return;
    }

    await loadData();

    setPreview((prev) =>
      prev.map((item) => ({
        ...item,
        selected: false,
        duplicate: true,
      }))
    );

    setImporting(false);
    alert("Import završen: " + payload.length + " LV pozicija.");
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <h1 style={titleStyle}>📥 LV Import</h1>
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

        <Link href={`/projekte/${projektId}/positionen`} style={blueLinkStyle}>
          📋 LV Positionen öffnen
        </Link>
      </div>

      <h1 style={titleStyle}>📥 LV Import</h1>

      <p style={descriptionStyle}>
        Projekt: <strong>{projekt?.project_name || "-"}</strong>
      </p>

      <section style={summaryGridStyle}>
        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Bestehende LV Positionen</span>
          <strong style={summaryValueStyle}>{existingPositionen.length}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Gefunden im ONLV</span>
          <strong style={summaryValueStyle}>{summary.total}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Ausgewählt</span>
          <strong style={summaryValueStyle}>{summary.selected}</strong>
        </div>

        <div style={summaryCardStyle}>
          <span style={summaryLabelStyle}>Import Wert</span>
          <strong style={summaryValueStyle}>{formatEuro(summary.totalValue)}</strong>
        </div>
      </section>

      <section style={infoBoxStyle}>
        <h2 style={sectionTitleStyle}>ONLV Import</h2>

        <p style={infoTextStyle}>
          Izaberi <strong>.onlv</strong> fajl. Aplikacija čita ÖNORM XML i
          priprema LV pozicije. Duple pozicije se automatski ne označavaju za
          import.
        </p>

        <label style={labelStyle}>ONLV Datei auswählen</label>
        <input
          type="file"
          accept=".onlv,.xml,text/xml"
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
          style={fileInputStyle}
        />

        {fileName && <p style={smallTextStyle}>Datei: {fileName}</p>}

        <label style={labelStyle}>Oder XML / ONLV Text einfügen</label>
        <textarea
          value={xmlText}
          onChange={(e) => setXmlText(e.target.value)}
          placeholder="ONLV XML tekst možeš zalijepiti ovdje..."
          style={textareaStyle}
        />

        <div style={buttonRowStyle}>
          <button onClick={() => parseOnlvXml(xmlText)} style={blueButtonStyle}>
            Vorschau erstellen
          </button>

          <button onClick={() => selectAll(true)} style={grayButtonStyle}>
            Sve nove označi
          </button>

          <button onClick={() => selectAll(false)} style={grayButtonStyle}>
            Sve odznači
          </button>
        </div>

        <label style={checkboxRowStyle}>
          <input
            type="checkbox"
            checked={replaceExisting}
            onChange={(e) => setReplaceExisting(e.target.checked)}
          />
          <span>
            Obriši postojeće LV pozicije i napravi novi import
          </span>
        </label>

        <button
          onClick={importPositions}
          disabled={importing || summary.selected === 0}
          style={{
            ...importButtonStyle,
            opacity: importing || summary.selected === 0 ? 0.5 : 1,
          }}
        >
          {importing ? "Import läuft..." : "Ausgewählte Positionen importieren"}
        </button>
      </section>

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Import Vorschau</h2>

        {preview.length === 0 ? (
          <p style={emptyStyle}>Još nema podataka za pregled.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Import</th>
                  <th style={thStyle}>Position</th>
                  <th style={thStyle}>Kurztext</th>
                  <th style={thStyle}>Gruppe</th>
                  <th style={thStyle}>Menge</th>
                  <th style={thStyle}>EH</th>
                  <th style={thStyle}>EP</th>
                  <th style={thStyle}>Preis</th>
                  <th style={thStyle}>Typ</th>
                  <th style={thStyle}>Min/EH</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>

              <tbody>
                {preview.map((item) => (
                  <tr key={item.position_nr}>
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={item.selected}
                        disabled={item.duplicate && !replaceExisting}
                        onChange={() => toggleSelected(item.position_nr)}
                      />
                    </td>

                    <td style={tdStyle}>
                      <strong>{item.position_nr}</strong>
                    </td>

                    <td style={tdStyle}>{item.kurztext}</td>

                    <td style={tdStyle}>{item.gruppe || "-"}</td>

                    <td style={tdRightStyle}>
                      {formatNumber(item.menge_soll)}
                    </td>

                    <td style={tdStyle}>{item.einheit || "-"}</td>

                    <td style={tdRightStyle}>{formatEuro(item.einheitspreis)}</td>

                    <td style={tdRightStyle}>
                      <strong>{formatEuro(item.positionspreis)}</strong>
                    </td>

                    <td style={tdStyle}>{item.typ}</td>

                    <td style={tdRightStyle}>
                      {formatNumber(item.minuten_pro_einheit, 0)}
                    </td>

                    <td style={tdStyle}>
                      <span style={item.duplicate ? warningBadgeStyle : okBadgeStyle}>
                        {item.duplicate ? "Schon vorhanden" : "Neu"}
                      </span>
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

const blueLinkStyle: any = {
  background: "#2563eb",
  color: "white",
  textDecoration: "none",
  borderRadius: "12px",
  padding: "10px 14px",
  fontWeight: "bold",
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
  marginBottom: "22px",
};

const listBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "22px",
};

const sectionTitleStyle: any = {
  color: "#f97316",
  marginTop: 0,
  marginBottom: "14px",
};

const infoTextStyle: any = {
  color: "#ccc",
  margin: 0,
  lineHeight: "1.5",
};

const labelStyle: any = {
  display: "block",
  color: "#ddd",
  fontWeight: "bold",
  marginBottom: "6px",
  marginTop: "14px",
};

const fileInputStyle: any = {
  width: "100%",
  background: "#000",
  color: "white",
  border: "1px solid #333",
  borderRadius: "10px",
  padding: "12px",
  boxSizing: "border-box",
};

const textareaStyle: any = {
  width: "100%",
  minHeight: "120px",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #333",
  background: "#000",
  color: "white",
  fontSize: "14px",
  boxSizing: "border-box",
  resize: "vertical",
};

const buttonRowStyle: any = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "14px",
};

const blueButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px 16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const grayButtonStyle: any = {
  ...blueButtonStyle,
  background: "#4b5563",
};

const importButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "14px 18px",
  fontWeight: "bold",
  fontSize: "16px",
  cursor: "pointer",
  marginTop: "16px",
  width: "100%",
};

const checkboxRowStyle: any = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
  color: "#ddd",
  marginTop: "14px",
};

const smallTextStyle: any = {
  color: "#aaa",
  fontSize: "13px",
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
  minWidth: "1250px",
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