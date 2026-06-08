"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];

const UNIT_OPTIONS = [
  "Stk.",
  "kom",
  "Paket",
  "Karton",
  "Sack",
  "kg",
  "m",
  "lfm",
  "m²",
  "m3",
  "L",
  "Rolle",
  "Eimer",
];

const translations: any = {
  de: {
    title: "Material bestellen",
    back: "← Zurück zum Dashboard",
    destination: "Ziel",
    baustelle: "Baustelle",
    lager: "Lager",
    chooseBaustelle: "Baustelle auswählen",
    materialType: "Materialart",
    catalog: "Aus Katalog",
    free: "Freies Material",
    chooseGroup: "Gruppe auswählen",
    chooseMaterial: "Material auswählen",
    selectedMaterial: "Ausgewähltes Material",
    materialName: "Materialname",
    unit: "Einheit",
    quantity: "Menge",
    note: "Notiz",
    save: "Bestellung speichern",
    orders: "Materialbestellungen",
    worker: "Mitarbeiter",
    status: "Status",
    delete: "Löschen",
    empty: "Noch keine Materialbestellungen vorhanden.",
    selectDestination: "Ziel auswählen.",
    selectBaustelle: "Baustelle auswählen.",
    selectMaterial: "Material auswählen.",
    enterMaterial: "Materialname eingeben.",
    enterUnit: "Einheit eingeben.",
    enterQuantity: "Menge eingeben.",
    search: "Material in dieser Gruppe suchen...",
    backGroups: "← Zurück zu Gruppen",
  },
  ba: {
    title: "Naruči materijal",
    back: "← Nazad na Dashboard",
    destination: "Odredište",
    baustelle: "Baustelle",
    lager: "Lager",
    chooseBaustelle: "Odaberi Baustelle",
    materialType: "Vrsta materijala",
    catalog: "Iz kataloga",
    free: "Slobodni materijal",
    chooseGroup: "Odaberi grupu",
    chooseMaterial: "Odaberi materijal",
    selectedMaterial: "Odabrani materijal",
    materialName: "Naziv materijala",
    unit: "Jedinica",
    quantity: "Količina",
    note: "Napomena",
    save: "Sačuvaj narudžbu",
    orders: "Narudžbe materijala",
    worker: "Radnik",
    status: "Status",
    delete: "Obriši",
    empty: "Još nema narudžbi materijala.",
    selectDestination: "Odaberi odredište.",
    selectBaustelle: "Odaberi Baustelle.",
    selectMaterial: "Odaberi materijal.",
    enterMaterial: "Unesi naziv materijala.",
    enterUnit: "Unesi jedinicu.",
    enterQuantity: "Unesi količinu.",
    search: "Traži materijal u ovoj grupi...",
    backGroups: "← Nazad na grupe",
  },
  uz: {
    title: "Material buyurtma",
    back: "← Dashboardga qaytish",
    destination: "Manzil",
    baustelle: "Obyekt",
    lager: "Ombor",
    chooseBaustelle: "Obyektni tanlang",
    materialType: "Material turi",
    catalog: "Katalogdan",
    free: "Erkin material",
    chooseGroup: "Guruhni tanlang",
    chooseMaterial: "Material tanlang",
    selectedMaterial: "Tanlangan material",
    materialName: "Material nomi",
    unit: "Birlik",
    quantity: "Miqdor",
    note: "Izoh",
    save: "Buyurtmani saqlash",
    orders: "Material buyurtmalari",
    worker: "Ishchi",
    status: "Holat",
    delete: "O‘chirish",
    empty: "Hozircha material buyurtmalari yo‘q.",
    selectDestination: "Manzilni tanlang.",
    selectBaustelle: "Obyektni tanlang.",
    selectMaterial: "Material tanlang.",
    enterMaterial: "Material nomini kiriting.",
    enterUnit: "Birlikni kiriting.",
    enterQuantity: "Miqdorni kiriting.",
    search: "Bu guruhda material qidirish...",
    backGroups: "← Guruhlarga qaytish",
  },
  en: {
    title: "Order material",
    back: "← Back to Dashboard",
    destination: "Destination",
    baustelle: "Site",
    lager: "Warehouse",
    chooseBaustelle: "Choose site",
    materialType: "Material type",
    catalog: "From catalog",
    free: "Free material",
    chooseGroup: "Choose group",
    chooseMaterial: "Choose material",
    selectedMaterial: "Selected material",
    materialName: "Material name",
    unit: "Unit",
    quantity: "Quantity",
    note: "Note",
    save: "Save order",
    orders: "Material orders",
    worker: "Worker",
    status: "Status",
    delete: "Delete",
    empty: "No material orders yet.",
    selectDestination: "Choose destination.",
    selectBaustelle: "Choose site.",
    selectMaterial: "Choose material.",
    enterMaterial: "Enter material name.",
    enterUnit: "Enter unit.",
    enterQuantity: "Enter quantity.",
    search: "Search material in this group...",
    backGroups: "← Back to groups",
  },
};

const statusLabels: any = {
  de: { NEW: "Neu", APPROVED: "Freigegeben", ORDERED: "Bestellt", DELIVERED: "Geliefert", REJECTED: "Abgelehnt" },
  ba: { NEW: "Novo", APPROVED: "Odobreno", ORDERED: "Naručeno", DELIVERED: "Isporučeno", REJECTED: "Odbijeno" },
  uz: { NEW: "Yangi", APPROVED: "Tasdiqlangan", ORDERED: "Buyurtma qilingan", DELIVERED: "Yetkazildi", REJECTED: "Rad etildi" },
  en: { NEW: "New", APPROVED: "Approved", ORDERED: "Ordered", DELIVERED: "Delivered", REJECTED: "Rejected" },
};

const STATUS_OPTIONS = ["NEW", "APPROVED", "ORDERED", "DELIVERED", "REJECTED"];

function safeNumber(value: any) {
  const n = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function getMaterialGroupId(material: any) {
  return Number(material?.group_id ?? material?.gruppe_id ?? material?.material_group_id ?? 0);
}

function getGroupIcon(name: string) {
  const n = String(name || "").toLowerCase();
  if (n.includes("vorbereitung") || n.includes("priprema")) return "🧹";
  if (n.includes("estrich")) return "◻️";
  if (n.includes("hidro") || n.includes("abdicht")) return "💧";
  if (n.includes("ljep") || n.includes("kleber")) return "🧴";
  if (n.includes("schienen")) return "📏";
  if (n.includes("fuge")) return "▦";
  if (n.includes("silikon")) return "〰️";
  if (n.includes("terase") || n.includes("terrasse")) return "🧱";
  if (n.includes("dodaci") || n.includes("zusatz")) return "+";
  return "📦";
}

function formatDate(value: string) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function MaterialOrdersPage() {
  const [lang, setLang] = useState("ba");
  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [ziel, setZiel] = useState("BAUSTELLE");
  const [baustelleId, setBaustelleId] = useState("");
  const [materialType, setMaterialType] = useState("CATALOG");

  const [materialId, setMaterialId] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [einheit, setEinheit] = useState("");
  const [menge, setMenge] = useState("");
  const [notiz, setNotiz] = useState("");

  const [baustellen, setBaustellen] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const [activeGroup, setActiveGroup] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const t = translations[lang] || translations.ba;
  const s = statusLabels[lang] || statusLabels.ba;

  useEffect(() => {
    const name = localStorage.getItem("worker_name") || "";
    const savedLang = localStorage.getItem("lang") || "ba";

    setWorkerName(name);
    setIsAdmin(ADMINI.includes(name));
    setLang(savedLang);

    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [baustellenRes, groupsRes, materialsRes, ordersRes] = await Promise.all([
      supabase
        .from("baustellen")
        .select("id, naziv, lokacija, status")
        .eq("status", "Aktiv")
        .order("naziv", { ascending: true }),
      supabase
        .from("material_groups")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("materials")
        .select("*")
        .order("naziv", { ascending: true }),
      supabase
        .from("material_orders")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (baustellenRes.error) alert("LOAD BAUSTELLEN: " + baustellenRes.error.message);
    if (groupsRes.error) alert("LOAD MATERIAL GROUPS: " + groupsRes.error.message);
    if (materialsRes.error) alert("LOAD MATERIALS: " + materialsRes.error.message);
    if (ordersRes.error) alert("LOAD ORDERS: " + ordersRes.error.message);

    const loadedGroups = groupsRes.data || [];
    const loadedMaterials = materialsRes.data || [];

    setBaustellen(baustellenRes.data || []);
    setGroups(loadedGroups);
    setMaterials(loadedMaterials);
    setOrders(ordersRes.data || []);

    if (!activeGroup && loadedGroups.length > 0) {
      setActiveGroup(loadedGroups[0]);
    }

    setLoading(false);
  }

  const filteredMaterials = useMemo(() => {
    if (materialType !== "CATALOG" || !activeGroup) return [];

    const term = searchTerm.trim().toLowerCase();

    return materials
      .filter((m) => getMaterialGroupId(m) === Number(activeGroup.id))
      .filter((m) => {
        if (!term) return true;
        return String(m.naziv || "").toLowerCase().includes(term);
      });
  }, [materials, activeGroup, searchTerm, materialType]);

  function groupCount(groupId: number) {
    return materials.filter((m) => getMaterialGroupId(m) === Number(groupId)).length;
  }

  function selectMaterial(material: any) {
    setMaterialId(String(material.id));
    setMaterialName(material.naziv || "");
    setEinheit(material.jedinica || material.unit || material.einheit || "");
  }

  function switchToCatalog() {
    setMaterialType("CATALOG");
    setMaterialId("");
    setMaterialName("");
    setEinheit("");
  }

  function switchToFree() {
    setMaterialType("FREE");
    setMaterialId("");
    setMaterialName("");
    setEinheit("");
  }

  function resetForm() {
    setZiel("BAUSTELLE");
    setBaustelleId("");
    setMaterialType("CATALOG");
    setMaterialId("");
    setMaterialName("");
    setEinheit("");
    setMenge("");
    setNotiz("");
    setSearchTerm("");
  }

  async function saveOrder() {
    if (!ziel) {
      alert(t.selectDestination);
      return;
    }

    if (ziel === "BAUSTELLE" && !baustelleId) {
      alert(t.selectBaustelle);
      return;
    }

    if (materialType === "CATALOG" && !materialId) {
      alert(t.selectMaterial);
      return;
    }

    if (materialType === "FREE" && !materialName.trim()) {
      alert(t.enterMaterial);
      return;
    }

    if (!einheit.trim()) {
      alert(t.enterUnit);
      return;
    }

    if (!menge || safeNumber(menge) <= 0) {
      alert(t.enterQuantity);
      return;
    }

    const payload: any = {
      ziel,
      baustelle_id: ziel === "BAUSTELLE" ? Number(baustelleId) : null,
      material_id: materialType === "CATALOG" ? Number(materialId) : null,
      material_name: materialName.trim(),
      einheit: einheit.trim(),
      menge: safeNumber(menge),
      notiz: notiz.trim(),
      worker_name: workerName || "Unbekannt",
      status: "NEW",
    };

    const { error } = await supabase.from("material_orders").insert([payload]);

    if (error) {
      alert("SAVE MATERIAL ORDER: " + error.message);
      return;
    }

    resetForm();
    await loadData();
    alert("Materialbestellung wurde gespeichert.");
  }

  async function deleteOrder(id: number) {
    const ok = confirm("Materialbestellung wirklich löschen?");
    if (!ok) return;

    const { error } = await supabase.from("material_orders").delete().eq("id", id);

    if (error) {
      alert("DELETE MATERIAL ORDER: " + error.message);
      return;
    }

    await loadData();
  }

  async function updateStatus(id: number, status: string) {
    const { error } = await supabase
      .from("material_orders")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert("UPDATE STATUS: " + error.message);
      return;
    }

    await loadData();
  }

  function baustelleName(id: any) {
    const b = baustellen.find((x) => Number(x.id) === Number(id));
    if (!b) return "-";
    return `${b.naziv || "Baustelle"}${b.lokacija ? " - " + b.lokacija : ""}`;
  }

  function orderMaterialName(order: any) {
    if (order.material_name) return order.material_name;
    const material = materials.find((m) => Number(m.id) === Number(order.material_id));
    return material?.naziv || "-";
  }

  return (
    <main style={styles.page}>
      <Link href="/dashboard" style={styles.backLink}>{t.back}</Link>

      <h1 style={styles.title}>🧱 {t.title}</h1>

      <section style={styles.formBox}>
        <div style={styles.label}>{t.destination}</div>
        <div style={styles.toggleRow}>
          <button
            onClick={() => setZiel("BAUSTELLE")}
            style={ziel === "BAUSTELLE" ? styles.activeToggle : styles.toggleButton}
          >
            🏗️ {t.baustelle}
          </button>

          <button
            onClick={() => setZiel("LAGER")}
            style={ziel === "LAGER" ? styles.activeToggle : styles.toggleButton}
          >
            📦 {t.lager}
          </button>
        </div>

        {ziel === "BAUSTELLE" && (
          <select
            value={baustelleId}
            onChange={(e) => setBaustelleId(e.target.value)}
            style={styles.input}
          >
            <option value="">{t.chooseBaustelle}</option>
            {baustellen.map((b) => (
              <option key={b.id} value={b.id}>
                {b.naziv} {b.lokacija ? `- ${b.lokacija}` : ""}
              </option>
            ))}
          </select>
        )}

        <div style={styles.label}>{t.materialType}</div>
        <div style={styles.toggleRow}>
          <button
            onClick={switchToCatalog}
            style={materialType === "CATALOG" ? styles.activeToggle : styles.toggleButton}
          >
            📋 {t.catalog}
          </button>

          <button
            onClick={switchToFree}
            style={materialType === "FREE" ? styles.activeToggle : styles.toggleButton}
          >
            ✍️ {t.free}
          </button>
        </div>

        {materialType === "CATALOG" ? (
          <>
            <section style={styles.groupBox}>
              <div style={styles.label}>{t.chooseGroup}</div>
              <div style={styles.groupGrid}>
                {groups.map((g) => {
                  const active = Number(activeGroup?.id) === Number(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => {
                        setActiveGroup(g);
                        setSearchTerm("");
                        setMaterialId("");
                        setMaterialName("");
                        setEinheit("");
                      }}
                      style={active ? styles.activeGroupCard : styles.groupCard}
                    >
                      <div style={styles.groupIcon}>{getGroupIcon(g.naziv)}</div>
                      <div style={styles.groupName}>{g.naziv}</div>
                      <div style={styles.groupCount}>{groupCount(g.id)} mat.</div>
                    </button>
                  );
                })}
              </div>
            </section>

            {activeGroup && (
              <section style={styles.materialBox}>
                <div style={styles.materialBoxHeader}>
                  <div style={styles.label}>
                    {getGroupIcon(activeGroup.naziv)} {activeGroup.naziv}
                  </div>
                  {materialName && (
                    <div style={styles.selectedBadge}>{t.selectedMaterial}: {materialName}</div>
                  )}
                </div>

                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t.search}
                  style={styles.input}
                />

                <div style={styles.materialGrid}>
                  {filteredMaterials.length === 0 ? (
                    <div style={styles.emptySmall}>Nema materijala u ovoj grupi.</div>
                  ) : (
                    filteredMaterials.map((m) => {
                      const active = String(materialId) === String(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => selectMaterial(m)}
                          style={active ? styles.activeMaterialCard : styles.materialCard}
                        >
                          <strong>{m.naziv}</strong>
                          <span>{m.jedinica || m.unit || m.einheit || ""}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>
            )}
          </>
        ) : (
          <>
            <input
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
              placeholder={t.materialName}
              style={styles.input}
            />

            <select
              value={einheit}
              onChange={(e) => setEinheit(e.target.value)}
              style={styles.input}
            >
              <option value="">{t.unit}</option>
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </>
        )}

        {materialType === "CATALOG" && (
          <input
            value={einheit}
            onChange={(e) => setEinheit(e.target.value)}
            placeholder={t.unit}
            style={styles.input}
          />
        )}

        <input
          value={menge}
          onChange={(e) => setMenge(e.target.value)}
          placeholder={t.quantity}
          type="number"
          style={styles.input}
        />

        <textarea
          value={notiz}
          onChange={(e) => setNotiz(e.target.value)}
          placeholder={t.note}
          style={styles.textarea}
        />

        <button onClick={saveOrder} style={styles.saveButton}>{t.save}</button>
      </section>

      <section style={styles.ordersBox}>
        <h2 style={styles.sectionTitle}>{t.orders} ({orders.length})</h2>

        {loading ? (
          <div style={styles.emptyBox}>Lade...</div>
        ) : orders.length === 0 ? (
          <div style={styles.emptyBox}>{t.empty}</div>
        ) : (
          <div style={styles.ordersList}>
            {orders.map((o) => (
              <div key={o.id} style={styles.orderCard}>
                <div style={styles.orderMain}>
                  <div style={styles.orderTitle}>{orderMaterialName(o)}</div>
                  <div style={styles.orderText}>
                    <strong>{o.menge}</strong> {o.einheit}
                  </div>
                  <div style={styles.orderText}>Ziel: {o.ziel === "LAGER" ? t.lager : baustelleName(o.baustelle_id)}</div>
                  <div style={styles.orderText}>{t.worker}: {o.worker_name || "-"}</div>
                  {o.notiz && <div style={styles.orderNote}>{o.notiz}</div>}
                  <div style={styles.orderText}>Datum: {formatDate(o.created_at)}</div>
                </div>

                <div style={styles.orderActions}>
                  <div style={styles.statusBadge}>{s[o.status] || o.status || "NEW"}</div>

                  {isAdmin ? (
                    <select
                      value={o.status || "NEW"}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                      style={styles.statusSelect}
                    >
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>{s[st] || st}</option>
                      ))}
                    </select>
                  ) : null}

                  {(isAdmin || o.worker_name === workerName) && (
                    <button onClick={() => deleteOrder(o.id)} style={styles.deleteButton}>
                      {t.delete}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const styles: any = {
  page: {
    background: "#000",
    minHeight: "100vh",
    color: "white",
    padding: "18px",
    paddingBottom: "45px",
  },
  backLink: {
    color: "#3b82f6",
    textDecoration: "none",
    fontWeight: "bold",
  },
  title: {
    color: "#f97316",
    fontSize: "34px",
    marginTop: "22px",
    marginBottom: "24px",
  },
  formBox: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: "14px",
    padding: "16px",
    display: "grid",
    gap: "12px",
    marginBottom: "20px",
  },
  label: {
    color: "#f97316",
    fontWeight: "bold",
    fontSize: "14px",
  },
  toggleRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  toggleButton: {
    background: "#222",
    color: "white",
    border: "1px solid #444",
    borderRadius: "10px",
    padding: "12px 14px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  activeToggle: {
    background: "#2563eb",
    color: "white",
    border: "1px solid #3b82f6",
    borderRadius: "10px",
    padding: "12px 14px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  input: {
    width: "100%",
    background: "#222",
    color: "white",
    border: "1px solid #333",
    borderRadius: "10px",
    padding: "13px",
    fontSize: "15px",
  },
  textarea: {
    width: "100%",
    minHeight: "90px",
    background: "#222",
    color: "white",
    border: "1px solid #333",
    borderRadius: "10px",
    padding: "13px",
    fontSize: "15px",
    resize: "vertical",
  },
  saveButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "15px 20px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "16px",
  },
  groupBox: {
    background: "#151515",
    border: "1px solid #222",
    borderRadius: "12px",
    padding: "12px",
  },
  groupGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(78px, 1fr))",
    gap: "8px",
    marginTop: "10px",
  },
  groupCard: {
    minHeight: "72px",
    background: "#242424",
    color: "white",
    border: "1px solid #3a3a3a",
    borderRadius: "10px",
    padding: "8px 5px",
    textAlign: "center",
    cursor: "pointer",
  },
  activeGroupCard: {
    minHeight: "72px",
    background: "#1e3a8a",
    color: "white",
    border: "1px solid #3b82f6",
    borderRadius: "10px",
    padding: "8px 5px",
    textAlign: "center",
    cursor: "pointer",
  },
  groupIcon: {
    fontSize: "18px",
    lineHeight: "1",
    marginBottom: "4px",
  },
  groupName: {
    fontSize: "11px",
    fontWeight: "bold",
    lineHeight: "1.15",
    minHeight: "24px",
  },
  groupCount: {
    fontSize: "10px",
    color: "#ccc",
    marginTop: "2px",
  },
  materialBox: {
    background: "#151515",
    border: "1px solid #222",
    borderRadius: "12px",
    padding: "12px",
    display: "grid",
    gap: "10px",
  },
  materialBoxHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  selectedBadge: {
    background: "#14532d",
    border: "1px solid #22c55e",
    color: "white",
    borderRadius: "999px",
    padding: "7px 10px",
    fontSize: "12px",
    fontWeight: "bold",
  },
  materialGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: "8px",
  },
  materialCard: {
    background: "#222",
    color: "white",
    border: "1px solid #333",
    borderRadius: "10px",
    padding: "12px",
    cursor: "pointer",
    textAlign: "left",
    display: "grid",
    gap: "5px",
  },
  activeMaterialCard: {
    background: "#064e3b",
    color: "white",
    border: "1px solid #22c55e",
    borderRadius: "10px",
    padding: "12px",
    cursor: "pointer",
    textAlign: "left",
    display: "grid",
    gap: "5px",
  },
  emptySmall: {
    background: "#222",
    color: "#aaa",
    borderRadius: "10px",
    padding: "12px",
  },
  ordersBox: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: "14px",
    padding: "16px",
  },
  sectionTitle: {
    color: "#f97316",
    fontSize: "18px",
    marginTop: 0,
    marginBottom: "14px",
  },
  emptyBox: {
    background: "#1a1a1a",
    borderRadius: "10px",
    padding: "16px",
    color: "#aaa",
  },
  ordersList: {
    display: "grid",
    gap: "12px",
  },
  orderCard: {
    background: "#050505",
    border: "1px solid #333",
    borderRadius: "12px",
    padding: "14px",
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  },
  orderMain: {
    display: "grid",
    gap: "6px",
    minWidth: "260px",
  },
  orderTitle: {
    color: "#f97316",
    fontWeight: "bold",
    fontSize: "16px",
  },
  orderText: {
    color: "#eee",
    fontWeight: "bold",
  },
  orderNote: {
    color: "#ccc",
    background: "#111",
    borderRadius: "8px",
    padding: "8px",
  },
  orderActions: {
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
    flexWrap: "wrap",
  },
  statusBadge: {
    background: "#222",
    color: "white",
    borderRadius: "999px",
    padding: "7px 10px",
    fontSize: "12px",
    fontWeight: "bold",
  },
  statusSelect: {
    background: "#222",
    color: "white",
    border: "1px solid #333",
    borderRadius: "8px",
    padding: "9px",
    fontWeight: "bold",
  },
  deleteButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "10px 14px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};
