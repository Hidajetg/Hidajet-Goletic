"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];

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
    chooseMaterial: "Material auswählen",
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
    chooseMaterial: "Odaberi materijal",
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
    chooseMaterial: "Material tanlang",
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
    chooseMaterial: "Choose material",
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
  },
};

const statusLabels: any = {
  de: {
    NEW: "Neu",
    APPROVED: "Freigegeben",
    ORDERED: "Bestellt",
    DELIVERED: "Geliefert",
    REJECTED: "Abgelehnt",
  },
  ba: {
    NEW: "Novo",
    APPROVED: "Odobreno",
    ORDERED: "Naručeno",
    DELIVERED: "Isporučeno",
    REJECTED: "Odbijeno",
  },
  uz: {
    NEW: "Yangi",
    APPROVED: "Tasdiqlangan",
    ORDERED: "Buyurtma qilingan",
    DELIVERED: "Yetkazildi",
    REJECTED: "Rad etildi",
  },
  en: {
    NEW: "New",
    APPROVED: "Approved",
    ORDERED: "Ordered",
    DELIVERED: "Delivered",
    REJECTED: "Rejected",
  },
};

export default function MaterialOrdersPage() {
  const [lang, setLang] = useState("ba");
  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [ziel, setZiel] = useState("BAUSTELLE");
  const [baustelleId, setBaustelleId] = useState("");
  const [materialType, setMaterialType] = useState("CATALOG");

  const [materialId, setMaterialId] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [einheit, setEinheit] = useState("");
  const [menge, setMenge] = useState("");
  const [notiz, setNotiz] = useState("");

  const [baustellen, setBaustellen] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

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
    const baustellenRes = await supabase
      .from("baustellen")
      .select("id, naziv, lokacija, status")
      .eq("status", "Aktiv")
      .order("naziv", { ascending: true });

    const materialsRes = await supabase
      .from("materials")
      .select("*")
      .order("naziv", { ascending: true });

    const ordersRes = await supabase
      .from("material_orders")
      .select("*")
      .order("created_at", { ascending: false });

    setBaustellen(baustellenRes.data || []);
    setMaterials(materialsRes.data || []);
    setOrders(ordersRes.data || []);
  }

  function changeMaterial(value: string) {
    setMaterialId(value);

    const selected = materials.find((m) => String(m.id) === String(value));

    if (selected) {
      setMaterialName(selected.naziv || "");
      setEinheit(selected.jedinica || "");
    }
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

    if (!materialName.trim()) {
      alert(t.enterMaterial);
      return;
    }

    if (!einheit.trim()) {
      alert(t.enterUnit);
      return;
    }

    if (!menge || Number(menge) <= 0) {
      alert(t.enterQuantity);
      return;
    }

    const { error } = await supabase.from("material_orders").insert([
      {
        worker_name: workerName || "Unbekannt",
        ziel,
        baustelle_id: ziel === "BAUSTELLE" ? Number(baustelleId) : null,
        material_id: materialType === "CATALOG" ? Number(materialId) : null,
        material_name: materialName.trim(),
        einheit: einheit.trim(),
        menge: Number(menge),
        notiz: notiz.trim(),
        status: "NEW",
      },
    ]);

    if (error) {
      alert("INSERT MATERIAL ORDER: " + error.message);
      return;
    }

    resetForm();
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

  async function deleteOrder(id: number) {
    const potvrda = confirm("Narudžbu obrisati?");
    if (!potvrda) return;

    const { error } = await supabase
      .from("material_orders")
      .delete()
      .eq("id", id);

    if (error) {
      alert("DELETE ORDER: " + error.message);
      return;
    }

    await loadData();
  }

  function getBaustelleName(id: number) {
    const b = baustellen.find((x) => Number(x.id) === Number(id));
    if (!b) return "-";
    return `${b.naziv}${b.lokacija ? " - " + b.lokacija : ""}`;
  }

  function formatDateTime(value: string) {
    return new Date(value).toLocaleString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main style={styles.page}>
      <Link href="/dashboard" style={styles.backLink}>
        {t.back}
      </Link>

      <h1 style={styles.title}>🧱 {t.title}</h1>

      <section style={styles.box}>
        <h2 style={styles.subtitle}>{t.destination}</h2>

        <div style={styles.toggleRow}>
          <button
            onClick={() => setZiel("BAUSTELLE")}
            style={ziel === "BAUSTELLE" ? styles.activeToggle : styles.toggle}
          >
            🏗️ {t.baustelle}
          </button>

          <button
            onClick={() => {
              setZiel("LAGER");
              setBaustelleId("");
            }}
            style={ziel === "LAGER" ? styles.activeToggle : styles.toggle}
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

        <h2 style={styles.subtitle}>{t.materialType}</h2>

        <div style={styles.toggleRow}>
          <button
            onClick={() => {
              setMaterialType("CATALOG");
              setMaterialName("");
              setEinheit("");
            }}
            style={
              materialType === "CATALOG" ? styles.activeToggle : styles.toggle
            }
          >
            📋 {t.catalog}
          </button>

          <button
            onClick={() => {
              setMaterialType("FREE");
              setMaterialId("");
              setMaterialName("");
              setEinheit("");
            }}
            style={materialType === "FREE" ? styles.activeToggle : styles.toggle}
          >
            ✍️ {t.free}
          </button>
        </div>

        {materialType === "CATALOG" ? (
          <select
            value={materialId}
            onChange={(e) => changeMaterial(e.target.value)}
            style={styles.input}
          >
            <option value="">{t.chooseMaterial}</option>

            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.naziv} {m.jedinica ? `(${m.jedinica})` : ""}
              </option>
            ))}
          </select>
        ) : (
          <>
            <input
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
              placeholder={t.materialName}
              style={styles.input}
            />

            <input
              value={einheit}
              onChange={(e) => setEinheit(e.target.value)}
              placeholder={`${t.unit}: kom, m², m, kg, l...`}
              style={styles.input}
            />
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

        <button onClick={saveOrder} style={styles.saveButton}>
          {t.save}
        </button>
      </section>

      <section style={styles.box}>
        <h2 style={styles.subtitle}>
          {t.orders} ({orders.length})
        </h2>

        {orders.length === 0 && <p style={styles.emptyText}>{t.empty}</p>}

        {orders.map((o) => (
          <div key={o.id} style={styles.orderCard}>
            <div style={styles.orderTop}>
              <strong>{o.material_name}</strong>
              <span style={styles.statusBadge}>{s[o.status] || o.status}</span>
            </div>

            <p style={styles.line}>
              {o.menge} {o.einheit}
            </p>

            <p style={styles.line}>
              <strong>{t.destination}:</strong>{" "}
              {o.ziel === "LAGER"
                ? t.lager
                : `${t.baustelle}: ${getBaustelleName(o.baustelle_id)}`}
            </p>

            <p style={styles.line}>
              <strong>{t.worker}:</strong> {o.worker_name}
            </p>

            <p style={styles.line}>
              <strong>Datum:</strong> {formatDateTime(o.created_at)}
            </p>

            {o.notiz && (
              <p style={styles.note}>
                <strong>{t.note}:</strong> {o.notiz}
              </p>
            )}

            {isAdmin && (
              <div style={styles.buttonRow}>
                <select
                  value={o.status}
                  onChange={(e) => updateStatus(o.id, e.target.value)}
                  style={styles.statusSelect}
                >
                  <option value="NEW">{s.NEW}</option>
                  <option value="APPROVED">{s.APPROVED}</option>
                  <option value="ORDERED">{s.ORDERED}</option>
                  <option value="DELIVERED">{s.DELIVERED}</option>
                  <option value="REJECTED">{s.REJECTED}</option>
                </select>

                <button
                  onClick={() => deleteOrder(o.id)}
                  style={styles.deleteButton}
                >
                  {t.delete}
                </button>
              </div>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}

const styles: any = {
  page: {
    background: "#000",
    minHeight: "100vh",
    color: "white",
    padding: "24px",
  },
  backLink: {
    color: "#3b82f6",
    textDecoration: "none",
    fontWeight: "bold",
  },
  title: {
    fontSize: "42px",
    color: "#f97316",
    marginTop: "24px",
    marginBottom: "28px",
  },
  box: {
    background: "#111",
    border: "1px solid #333",
    padding: "20px",
    borderRadius: "18px",
    marginBottom: "24px",
  },
  subtitle: {
    color: "#f97316",
    marginBottom: "14px",
  },
  toggleRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  toggle: {
    background: "#222",
    color: "white",
    border: "1px solid #333",
    padding: "12px 16px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  activeToggle: {
    background: "#2563eb",
    color: "white",
    border: "1px solid #2563eb",
    padding: "12px 16px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    background: "#222",
    color: "white",
    border: "1px solid #333",
    padding: "14px",
    borderRadius: "10px",
    marginBottom: "14px",
    fontSize: "16px",
  },
  textarea: {
    width: "100%",
    minHeight: "110px",
    background: "#222",
    color: "white",
    border: "1px solid #333",
    padding: "14px",
    borderRadius: "10px",
    marginBottom: "14px",
    fontSize: "16px",
  },
  saveButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    padding: "14px 22px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  emptyText: {
    color: "#aaa",
  },
  orderCard: {
    background: "#000",
    border: "1px solid #333",
    padding: "16px",
    borderRadius: "14px",
    marginBottom: "14px",
  },
  orderTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    color: "#f97316",
    marginBottom: "10px",
  },
  statusBadge: {
    background: "#222",
    color: "white",
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "13px",
  },
  line: {
    margin: "6px 0",
  },
  note: {
    color: "#ddd",
    whiteSpace: "pre-wrap",
    marginTop: "10px",
  },
  buttonRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "14px",
  },
  statusSelect: {
    background: "#222",
    color: "white",
    border: "1px solid #333",
    padding: "10px",
    borderRadius: "8px",
  },
  deleteButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
};