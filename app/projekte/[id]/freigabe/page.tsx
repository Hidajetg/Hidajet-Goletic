"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];
const STATUSI = ["Wartet", "Genehmigt", "Abgelehnt"];

function getTodayLocalDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function ProjektFreigabePage() {
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
  const [regie, setRegie] = useState<any[]>([]);
  const [regieWorkers, setRegieWorkers] = useState<any[]>([]);
  const [fotos, setFotos] = useState<any[]>([]);
  const [aufgaben, setAufgaben] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState("Wartet");
  const [selectedDate, setSelectedDate] = useState("");
  const [adminNotiz, setAdminNotiz] = useState<{ [key: string]: string }>({});

  const summary = useMemo(() => {
    const allItems = getAllItems();

    const wartet = allItems.filter((i) => i.status === "Wartet").length;
    const genehmigt = allItems.filter((i) => i.status === "Genehmigt").length;
    const abgelehnt = allItems.filter((i) => i.status === "Abgelehnt").length;

    return {
      total: allItems.length,
      wartet,
      genehmigt,
      abgelehnt,
      arbeitszeiten: arbeitszeiten.length,
      leistungen: leistungen.length,
      regie: regie.length,
      fotos: fotos.length,
      aufgaben: aufgaben.length,
    };
  }, [arbeitszeiten, leistungen, regie, fotos, aufgaben]);

  const filteredItems = useMemo(() => {
    let items = getAllItems();

    if (activeTab !== "Alle") {
      items = items.filter((item) => item.status === activeTab);
    }

    if (selectedDate) {
      items = items.filter((item) => item.datum === selectedDate);
    }

    return items.sort((a, b) => {
      const dateA = String(a.datum || "");
      const dateB = String(b.datum || "");

      if (dateA !== dateB) return dateB.localeCompare(dateA);

      return b.sortId - a.sortId;
    });
  }, [
    activeTab,
    selectedDate,
    arbeitszeiten,
    leistungen,
    regie,
    fotos,
    aufgaben,
    regieWorkers,
    raeume,
    positionen,
  ]);

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

    setRaeume(raeumeRes.data || []);

    const positionenRes = await supabase
      .from("projekt_lv_positionen")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("position_nr", { ascending: true });

    setPositionen(positionenRes.data || []);

    const arbeitszeitRes = await supabase
      .from("projekt_arbeitszeiten")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("datum", { ascending: false })
      .order("created_at", { ascending: false });

    setArbeitszeiten(arbeitszeitRes.data || []);

    const leistungRes = await supabase
      .from("projekt_leistungen")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("datum", { ascending: false })
      .order("created_at", { ascending: false });

    setLeistungen(leistungRes.data || []);

    const regieRes = await supabase
      .from("projekt_regie")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("datum", { ascending: false })
      .order("created_at", { ascending: false });

    const regieData = regieRes.data || [];
    setRegie(regieData);

    const regieIds = regieData.map((r) => r.id);

    if (regieIds.length > 0) {
      const workersRes = await supabase
        .from("projekt_regie_workers")
        .select("*")
        .in("regie_id", regieIds);

      setRegieWorkers(workersRes.data || []);
    } else {
      setRegieWorkers([]);
    }

    const fotosRes = await supabase
      .from("projekt_fotos")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("datum", { ascending: false })
      .order("created_at", { ascending: false });

    setFotos(fotosRes.data || []);

    const aufgabenRes = await supabase
      .from("projekt_aufgaben")
      .select("*")
      .eq("projekt_id", Number(projektId))
      .order("created_at", { ascending: false });

    setAufgaben(aufgabenRes.data || []);

    setLoading(false);
  }

  function getAllItems() {
    const a = arbeitszeiten.map((item) => ({
      sortId: Number(item.id),
      id: item.id,
      table: "projekt_arbeitszeiten",
      type: "Arbeitszeit",
      datum: item.datum,
      title: `${item.worker_name} · ${String(item.start_time || "").slice(0, 5)}-${String(
        item.end_time || ""
      ).slice(0, 5)} · ${formatNumber(item.stunden)} h`,
      status: item.freigabe_status || "Wartet",
      createdBy: item.created_by || item.worker_name || "-",
      adminNotiz: item.admin_notiz || "",
      raw: item,
    }));

    const l = leistungen.map((item) => ({
      sortId: Number(item.id),
      id: item.id,
      table: "projekt_leistungen",
      type: "Leistung",
      datum: item.datum,
      title: `${formatNumber(item.menge_ist)} ${item.einheit || ""} · ${getPositionText(
        item.lv_position_id
      )}`,
      status: item.status || "Wartet",
      createdBy: item.created_by || "-",
      adminNotiz: item.admin_notiz || "",
      raw: item,
    }));

    const r = regie.map((item) => ({
      sortId: Number(item.id),
      id: item.id,
      table: "projekt_regie",
      type: "Regie",
      datum: item.datum,
      title: `${String(item.start_time || "").slice(0, 5)}-${String(
        item.end_time || ""
      ).slice(0, 5)} · ${formatNumber(item.stunden_pro_worker)} h / Arbeiter`,
      status: normalizeRegieStatus(item.status),
      createdBy: item.created_by || "-",
      adminNotiz: item.admin_notiz || "",
      raw: item,
    }));

    const f = fotos.map((item) => ({
      sortId: Number(item.id),
      id: item.id,
      table: "projekt_fotos",
      type: "Foto",
      datum: item.datum,
      title: item.titel || "Foto",
      status: item.freigabe_status || "Wartet",
      createdBy: item.created_by || "-",
      adminNotiz: item.admin_notiz || "",
      raw: item,
    }));

    const g = aufgaben.map((item) => ({
      sortId: Number(item.id),
      id: item.id,
      table: "projekt_aufgaben",
      type: item.typ || "Aufgabe",
      datum: item.datum,
      title: item.titel || "-",
      status: normalizeAufgabeStatus(item.status),
      createdBy: item.created_by || "-",
      adminNotiz: item.admin_notiz || "",
      raw: item,
    }));

    return [...a, ...l, ...r, ...f, ...g];
  }

  function normalizeRegieStatus(status: string) {
    if (status === "Genehmigt") return "Genehmigt";
    if (status === "Abgelehnt") return "Abgelehnt";
    return "Wartet";
  }

  function normalizeAufgabeStatus(status: string) {
    if (status === "Erledigt") return "Genehmigt";
    if (status === "Abgelehnt") return "Abgelehnt";
    return "Wartet";
  }

  function statusToDbValue(table: string, status: string) {
    if (table === "projekt_aufgaben") {
      if (status === "Genehmigt") return "Erledigt";
      if (status === "Abgelehnt") return "Abgelehnt";
      return "Offen";
    }

    if (table === "projekt_regie") {
      if (status === "Genehmigt") return "Genehmigt";
      if (status === "Abgelehnt") return "Abgelehnt";
      return "Wartet";
    }

    if (table === "projekt_leistungen") {
      if (status === "Genehmigt") return "Genehmigt";
      if (status === "Abgelehnt") return "Abgelehnt";
      return "Offen";
    }

    return status;
  }

  function getStatusField(table: string) {
    if (table === "projekt_arbeitszeiten") return "freigabe_status";
    if (table === "projekt_fotos") return "freigabe_status";
    return "status";
  }

  async function changeStatus(item: any, newStatus: string) {
    const statusField = getStatusField(item.table);
    const dbValue = statusToDbValue(item.table, newStatus);
    const noteKey = `${item.table}-${item.id}`;
    const noteValue =
      adminNotiz[noteKey] !== undefined ? adminNotiz[noteKey] : item.adminNotiz;

    const payload: any = {
      [statusField]: dbValue,
      admin_notiz: noteValue || null,
    };

    if (item.table === "projekt_aufgaben") {
      payload.erledigt_am = newStatus === "Genehmigt" ? getTodayLocalDate() : null;
    }

    const { error } = await supabase
      .from(item.table)
      .update(payload)
      .eq("id", item.id);

    if (error) {
      alert("Greška kod promjene statusa: " + error.message);
      return;
    }

    await loadData();
  }

  async function deleteItem(item: any) {
    const ok = confirm("Da li sigurno želiš obrisati ovaj unos?");

    if (!ok) return;

    if (item.table === "projekt_fotos" && item.raw.storage_path) {
      await supabase.storage.from("projekt-fotos").remove([item.raw.storage_path]);
    }

    const { error } = await supabase.from(item.table).delete().eq("id", item.id);

    if (error) {
      alert("Greška kod brisanja: " + error.message);
      return;
    }

    await loadData();
  }

  function approveAllWaiting() {
    const waitingItems = filteredItems.filter((item) => item.status === "Wartet");

    if (waitingItems.length === 0) {
      alert("Nema unosa sa statusom Wartet.");
      return;
    }

    const ok = confirm(
      "Potvrditi sve trenutno prikazane unose sa statusom Wartet? Broj: " +
        waitingItems.length
    );

    if (!ok) return;

    runApproveAll(waitingItems);
  }

  async function runApproveAll(items: any[]) {
    for (const item of items) {
      const statusField = getStatusField(item.table);
      const dbValue = statusToDbValue(item.table, "Genehmigt");

      const payload: any = {
        [statusField]: dbValue,
      };

      if (item.table === "projekt_aufgaben") {
        payload.erledigt_am = getTodayLocalDate();
      }

      await supabase.from(item.table).update(payload).eq("id", item.id);
    }

    await loadData();
    alert("Potvrđeno: " + items.length + " unosa.");
  }

  function setNote(item: any, value: string) {
    const key = `${item.table}-${item.id}`;

    setAdminNotiz((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function getNote(item: any) {
    const key = `${item.table}-${item.id}`;

    if (adminNotiz[key] !== undefined) return adminNotiz[key];

    return item.adminNotiz || "";
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

  function getWorkersForRegie(regieId: number) {
    return regieWorkers
      .filter((w) => Number(w.regie_id) === Number(regieId))
      .map((w) => `${w.worker_name} (${formatNumber(w.stunden)} h)`)
      .join(", ");
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    const parts = String(value).split("-");
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }

    return value;
  }

  function formatNumber(value: any, digits = 2) {
    const num = Number(value || 0);

    return num.toLocaleString("de-AT", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  function getTypeBadgeStyle(type: string) {
    if (type === "Arbeitszeit") return blueBadgeStyle;
    if (type === "Leistung") return okBadgeStyle;
    if (type === "Regie") return warningBadgeStyle;
    if (type === "Foto") return photoBadgeStyle;
    if (type === "Mangel") return dangerBadgeStyle;

    return grayBadgeStyle;
  }

  function getStatusBadgeStyle(status: string) {
    if (status === "Genehmigt") return okBadgeStyle;
    if (status === "Abgelehnt") return dangerBadgeStyle;

    return warningBadgeStyle;
  }

  function getEditLink(item: any) {
    if (item.table === "projekt_arbeitszeiten") {
      return `/projekte/${projektId}/arbeitszeit`;
    }

    if (item.table === "projekt_leistungen") {
      return `/projekte/${projektId}/leistung`;
    }

    if (item.table === "projekt_regie") {
      return `/projekte/${projektId}/regie`;
    }

    if (item.table === "projekt_fotos") {
      return `/projekte/${projektId}/fotos`;
    }

    if (item.table === "projekt_aufgaben") {
      return `/projekte/${projektId}/aufgaben`;
    }

    return `/projekte/${projektId}`;
  }

  function renderDetails(item: any) {
    const raw = item.raw;

    if (item.table === "projekt_arbeitszeiten") {
      return (
        <>
          <p style={detailTextStyle}>Radnik: {raw.worker_name || "-"}</p>
          <p style={detailTextStyle}>Raum: {getRaumName(raw.raum_id)}</p>
          <p style={detailTextStyle}>LV: {getPositionText(raw.lv_position_id)}</p>
          <p style={detailTextStyle}>Art: {raw.arbeitsart || "-"}</p>
          <p style={detailTextStyle}>Notiz: {raw.notiz || "-"}</p>
        </>
      );
    }

    if (item.table === "projekt_leistungen") {
      return (
        <>
          <p style={detailTextStyle}>Raum: {getRaumName(raw.raum_id)}</p>
          <p style={detailTextStyle}>LV: {getPositionText(raw.lv_position_id)}</p>
          <p style={detailTextStyle}>
            Menge: {formatNumber(raw.menge_ist)} {raw.einheit || ""}
          </p>
          <p style={detailTextStyle}>Faktor: {formatNumber(raw.faktor)}</p>
          <p style={detailTextStyle}>Notiz: {raw.notiz || "-"}</p>
        </>
      );
    }

    if (item.table === "projekt_regie") {
      return (
        <>
          <p style={detailTextStyle}>Raum: {getRaumName(raw.raum_id)}</p>
          <p style={detailTextStyle}>Arbeiter: {getWorkersForRegie(raw.id) || "-"}</p>
          <p style={detailTextStyle}>Beschreibung: {raw.beschreibung || "-"}</p>
        </>
      );
    }

    if (item.table === "projekt_fotos") {
      return (
        <>
          <p style={detailTextStyle}>Typ: {raw.typ || "-"}</p>
          <p style={detailTextStyle}>Raum: {getRaumName(raw.raum_id)}</p>
          <p style={detailTextStyle}>LV: {getPositionText(raw.lv_position_id)}</p>
          <p style={detailTextStyle}>Beschreibung: {raw.beschreibung || "-"}</p>

          {raw.foto_url && (
            <a href={raw.foto_url} target="_blank" rel="noopener noreferrer">
              <img src={raw.foto_url} alt={raw.titel || "Foto"} style={photoStyle} />
            </a>
          )}
        </>
      );
    }

    if (item.table === "projekt_aufgaben") {
      return (
        <>
          <p style={detailTextStyle}>Priorität: {raw.prioritaet || "-"}</p>
          <p style={detailTextStyle}>Zuständig: {raw.assigned_to || "-"}</p>
          <p style={detailTextStyle}>Fällig bis: {formatDate(raw.faellig_bis)}</p>
          <p style={detailTextStyle}>Raum: {getRaumName(raw.raum_id)}</p>
          <p style={detailTextStyle}>Beschreibung: {raw.beschreibung || "-"}</p>
        </>
      );
    }

    return null;
  }

  if (loading) {
    return (
      <main style={mainStyle}>
        <Link href={`/projekte/${projektId}`} style={backStyle}>
          ← Zurück zum Projekt
        </Link>

        <h1 style={titleStyle}>🟢 Freigabe / Kontrolle</h1>
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

        <button onClick={loadData} style={refreshButtonStyle}>
          Aktualisieren
        </button>
      </div>

      <h1 style={titleStyle}>🟢 Freigabe / Kontrolle</h1>

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
      </section>

      <section style={filterBoxStyle}>
        <div style={tabRowStyle}>
          {["Wartet", "Genehmigt", "Abgelehnt", "Alle"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...tabButtonStyle,
                background: activeTab === tab ? "#f97316" : "#111",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={filterGridStyle}>
          <div>
            <label style={labelStyle}>Datum Filter</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={filterButtonWrapStyle}>
            <button onClick={() => setSelectedDate("")} style={grayButtonStyle}>
              Datum löschen
            </button>

            <button onClick={approveAllWaiting} style={approveAllButtonStyle}>
              Alle Wartet bestätigen
            </button>
          </div>
        </div>
      </section>

      <section style={listBoxStyle}>
        <h2 style={sectionTitleStyle}>Einträge</h2>

        {filteredItems.length === 0 ? (
          <p style={emptyStyle}>Keine Einträge gefunden.</p>
        ) : (
          <div style={entryGridStyle}>
            {filteredItems.map((item) => (
              <div key={`${item.table}-${item.id}`} style={entryCardStyle}>
                <div style={cardTopStyle}>
                  <span style={getTypeBadgeStyle(item.type)}>{item.type}</span>
                  <span style={getStatusBadgeStyle(item.status)}>{item.status}</span>
                </div>

                <h3 style={entryTitleStyle}>{item.title}</h3>

                <p style={metaTextStyle}>
                  Datum: <strong>{formatDate(item.datum)}</strong>
                </p>

                <p style={metaTextStyle}>
                  Erstellt von: <strong>{item.createdBy}</strong>
                </p>

                <div style={detailBoxStyle}>{renderDetails(item)}</div>

                <label style={labelStyle}>Admin Notiz</label>
                <textarea
                  value={getNote(item)}
                  onChange={(e) => setNote(item, e.target.value)}
                  placeholder="Napomena admina..."
                  style={textareaStyle}
                />

                <div style={actionGridStyle}>
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

                  <Link href={getEditLink(item)} style={editLinkStyle}>
                    Öffnen
                  </Link>

                  <button onClick={() => deleteItem(item)} style={deleteButtonStyle}>
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

const backStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "16px",
};

const refreshButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "10px 14px",
  fontWeight: "bold",
  cursor: "pointer",
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
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
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
  padding: "16px",
  marginBottom: "20px",
};

const tabRowStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: "8px",
  marginBottom: "14px",
};

const tabButtonStyle: any = {
  color: "white",
  border: "1px solid #333",
  borderRadius: "12px",
  padding: "11px",
  fontWeight: "bold",
  cursor: "pointer",
};

const filterGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
  alignItems: "end",
};

const filterButtonWrapStyle: any = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const labelStyle: any = {
  display: "block",
  color: "#ddd",
  fontWeight: "bold",
  marginBottom: "6px",
  marginTop: "10px",
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
  minHeight: "80px",
  resize: "vertical",
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

const approveAllButtonStyle: any = {
  ...grayButtonStyle,
  background: "#16a34a",
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

const emptyStyle: any = {
  color: "#aaa",
  fontSize: "16px",
};

const entryGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: "14px",
};

const entryCardStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "14px",
};

const cardTopStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "10px",
};

const entryTitleStyle: any = {
  color: "#f97316",
  fontSize: "18px",
  margin: "8px 0 10px 0",
  lineHeight: "1.3",
};

const metaTextStyle: any = {
  color: "#ccc",
  fontSize: "13px",
  margin: "5px 0",
};

const detailBoxStyle: any = {
  background: "#080808",
  border: "1px solid #222",
  borderRadius: "12px",
  padding: "10px",
  marginTop: "10px",
};

const detailTextStyle: any = {
  color: "#aaa",
  fontSize: "13px",
  margin: "5px 0",
};

const photoStyle: any = {
  width: "100%",
  height: "190px",
  objectFit: "cover",
  borderRadius: "10px",
  marginTop: "10px",
};

const actionGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px",
  marginTop: "12px",
};

const approveButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "10px",
  padding: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const rejectButtonStyle: any = {
  ...approveButtonStyle,
  background: "#dc2626",
};

const waitButtonStyle: any = {
  ...approveButtonStyle,
  background: "#ca8a04",
};

const deleteButtonStyle: any = {
  ...approveButtonStyle,
  background: "#7f1d1d",
  gridColumn: "1 / -1",
};

const editLinkStyle: any = {
  background: "#2563eb",
  color: "white",
  borderRadius: "10px",
  padding: "10px",
  fontWeight: "bold",
  textAlign: "center",
  textDecoration: "none",
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

const photoBadgeStyle: any = {
  background: "#be123c",
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