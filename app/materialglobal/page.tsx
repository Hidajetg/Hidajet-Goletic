"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

const ADMIN_NAMES = [
  "hido",
  "steffi",
  "florian",
  "admin",
  "hidajet",
  "hidajet goletic",
  "hidajet goletić",
];

type Tab = "add" | "overview";

function getLoggedUserFromLocalStorage() {
  if (typeof window === "undefined") return null;

  const keys = [
    "currentWorker",
    "worker",
    "loggedWorker",
    "selectedWorker",
    "currentUser",
    "loggedUser",
    "user",
    "userName",
    "workerName",
    "name",
    "loginUser",
    "baustelle_user",
    "stone_user",
    "app_user",
  ];

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (!value) continue;

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    const value = localStorage.getItem(key);
    if (!value) continue;

    try {
      const parsed = JSON.parse(value);
      if (isAdminUser(parsed)) return parsed;
    } catch {
      if (isAdminUser(value)) return value;
    }
  }

  return null;
}

function isAdminUser(user: any) {
  if (!user) return false;

  if (typeof user === "string") {
    return ADMIN_NAMES.includes(user.trim().toLowerCase());
  }

  const role = String(user.role || user.rolle || user.tip || "").toLowerCase();

  const name = String(
    user.name ||
      user.worker_name ||
      user.radnik ||
      user.username ||
      user.userName ||
      user.displayName ||
      ""
  )
    .trim()
    .toLowerCase();

  return (
    role === "admin" ||
    role === "administrator" ||
    user.is_admin === true ||
    user.admin === true ||
    ADMIN_NAMES.includes(name)
  );
}

function formatNumber(value: any) {
  const n = parseNumber(value);
  return n.toLocaleString("de-AT", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 1,
    maximumFractionDigits: 2,
  });
}

function parseNumber(value: any) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const cleaned = String(value)
    .replace(/[^0-9,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function normalizeKey(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getMaterialNameFromCatalog(material: any) {
  return (
    material?.naziv ||
    material?.name ||
    material?.material ||
    material?.bezeichnung ||
    material?.title ||
    ""
  );
}

function getMaterialUnitFromCatalog(material: any) {
  return (
    material?.jedinica ||
    material?.unit ||
    material?.einheit ||
    material?.me ||
    "-"
  );
}

function getBaustelleName(baustelle: any) {
  if (!baustelle) return "-";

  const name =
    baustelle.name ||
    baustelle.naziv ||
    baustelle.baustelle ||
    baustelle.projekt ||
    baustelle.title ||
    "Baustelle";

  const ort = baustelle.ort || baustelle.location || baustelle.mjesto || "";

  return ort ? `${name} - ${ort}` : name;
}

function getRoomName(room: any) {
  return room?.name || room?.naziv || room?.raum || room?.title || "-";
}

export default function AdminMaterialPage() {
  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  const [materials, setMaterials] = useState<any[]>([]);
  const [roomMaterials, setRoomMaterials] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [baustellen, setBaustellen] = useState<any[]>([]);

  const [newMaterialName, setNewMaterialName] = useState("");
  const [newMaterialUnit, setNewMaterialUnit] = useState("m²");
  const [newMaterialNote, setNewMaterialNote] = useState("");

  useEffect(() => {
    const loggedUser = getLoggedUserFromLocalStorage();
    const adminOk = isAdminUser(loggedUser);

    setIsAdmin(adminOk);
    setAccessChecked(true);

    if (!adminOk) {
      setLoading(false);
      return;
    }

    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: materialsData, error: materialsError } = await supabase
      .from("materials")
      .select("*")
      .order("id", { ascending: true });

    if (materialsError) {
      alert("Greška kod učitavanja materijala: " + materialsError.message);
      setLoading(false);
      return;
    }

    const { data: roomMaterialData, error: roomMaterialError } = await supabase
      .from("room_material")
      .select("*")
      .order("id", { ascending: true });

    if (roomMaterialError) {
      alert("Greška kod učitavanja potrošnje materijala: " + roomMaterialError.message);
      setLoading(false);
      return;
    }

    const roomIds = [
      ...new Set((roomMaterialData || []).map((m: any) => Number(m.room_id)).filter(Boolean)),
    ];

    let roomsData: any[] = [];

    if (roomIds.length > 0) {
      const { data, error } = await supabase
        .from("prostorije")
        .select("*")
        .in("id", roomIds);

      if (error) {
        alert("Greška kod učitavanja prostorija: " + error.message);
        setLoading(false);
        return;
      }

      roomsData = data || [];
    }

    const baustelleIds = [
      ...new Set((roomsData || []).map((r: any) => Number(r.baustelle_id)).filter(Boolean)),
    ];

    let baustellenData: any[] = [];

    if (baustelleIds.length > 0) {
      const { data, error } = await supabase
        .from("baustellen")
        .select("*")
        .in("id", baustelleIds);

      if (error) {
        alert("Greška kod učitavanja Baustelle: " + error.message);
        setLoading(false);
        return;
      }

      baustellenData = data || [];
    }

    setMaterials(materialsData || []);
    setRoomMaterials(roomMaterialData || []);
    setRooms(roomsData || []);
    setBaustellen(baustellenData || []);
    setLoading(false);
  }

  function getMaterialById(id: any) {
    return materials.find((m: any) => Number(m.id) === Number(id));
  }

  function getRoomById(id: any) {
    return rooms.find((r: any) => Number(r.id) === Number(id));
  }

  function getBaustelleById(id: any) {
    return baustellen.find((b: any) => Number(b.id) === Number(id));
  }

  function getMaterialNameFromRoomMaterial(m: any) {
    const manualName =
      m?.custom_naziv ||
      m?.custom_name ||
      m?.material_name ||
      m?.naziv ||
      m?.name ||
      m?.material ||
      m?.bezeichnung ||
      m?.opis ||
      m?.description ||
      m?.manual_name ||
      m?.keramika_naziv ||
      m?.title ||
      "";

    const catalogName = m?.material_id
      ? getMaterialNameFromCatalog(getMaterialById(m.material_id))
      : "";

    return manualName || catalogName || "Unbekannter Materialeintrag";
  }

  function getMaterialUnitFromRoomMaterial(m: any) {
    const manualUnit =
      m?.custom_jedinica ||
      m?.custom_unit ||
      m?.jedinica ||
      m?.unit ||
      m?.einheit ||
      "";

    const catalogUnit = m?.material_id
      ? getMaterialUnitFromCatalog(getMaterialById(m.material_id))
      : "";

    return manualUnit || catalogUnit || "-";
  }

  function getMaterialQuantity(m: any) {
    return parseNumber(
      m?.kolicina ??
        m?.quantity ??
        m?.menge ??
        m?.amount ??
        m?.qty ??
        m?.verbrauch ??
        0
    );
  }

  const materialOverview = useMemo(() => {
    const map = new Map<string, any>();

    for (const m of roomMaterials) {
      const name = getMaterialNameFromRoomMaterial(m);
      const unit = getMaterialUnitFromRoomMaterial(m);
      const quantity = getMaterialQuantity(m);

      if (!name || quantity === 0) continue;

      const key = `${normalizeKey(name)}__${normalizeKey(unit)}`;

      if (!map.has(key)) {
        map.set(key, {
          name,
          unit,
          total: 0,
          count: 0,
          details: [],
        });
      }

      const room = getRoomById(m.room_id);
      const baustelle = getBaustelleById(room?.baustelle_id);

      const item = map.get(key);
      item.total += quantity;
      item.count += 1;
      item.details.push({
        id: m.id,
        quantity,
        unit,
        roomName: getRoomName(room),
        baustelleName: getBaustelleName(baustelle),
      });
    }

    return Array.from(map.values()).sort((a: any, b: any) =>
      String(a.name).localeCompare(String(b.name), "de")
    );
  }, [roomMaterials, rooms, baustellen, materials]);

  async function addMaterial() {
    const name = newMaterialName.trim();
    const unit = newMaterialUnit.trim() || "-";
    const note = newMaterialNote.trim();

    if (!name) {
      alert("Upiši naziv materijala.");
      return;
    }

    setSaving(true);

    const attempts: any[] = [
      { naziv: name, jedinica: unit, note, active: true },
      { naziv: name, jedinica: unit, active: true },
      { naziv: name, jedinica: unit },
      { name, unit, note, active: true },
      { name, unit, active: true },
      { name, unit },
      { material: name, einheit: unit, active: true },
      { material: name, einheit: unit },
    ];

    let lastError: any = null;

    for (const payload of attempts) {
      const { error } = await supabase.from("materials").insert(payload);

      if (!error) {
        setNewMaterialName("");
        setNewMaterialNote("");
        await loadData();
        setTab("overview");
        setSaving(false);
        alert("Materijal je dodan.");
        return;
      }

      lastError = error;
    }

    setSaving(false);
    alert("Materijal nije dodan: " + (lastError?.message || "Nepoznata greška"));
  }

  if (!accessChecked || loading) {
    return (
      <main style={pageStyle}>
        <div style={cardStyle}>Učitavanje...</div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Material</h1>
          <p style={textStyle}>Ova stranica je dostupna samo adminu.</p>
          <Link href="/dashboard" style={backButtonStyle}>
            Nazad
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={topBarStyle}>
        <div>
          <p style={eyebrowStyle}>Admin</p>
          <h1 style={mainTitleStyle}>Material</h1>
          <p style={subTextStyle}>
            Dodavanje materijala i pregled ukupno utrošenog materijala na svim Baustellama.
          </p>
        </div>

        <Link href="/dashboard" style={backButtonStyle}>
          Nazad
        </Link>
      </div>

      <div style={tabsStyle}>
        <button
          type="button"
          onClick={() => setTab("overview")}
          style={tab === "overview" ? activeTabButtonStyle : tabButtonStyle}
        >
          Pregled utrošenog materijala
        </button>

        <button
          type="button"
          onClick={() => setTab("add")}
          style={tab === "add" ? activeTabButtonStyle : tabButtonStyle}
        >
          Dodaj novi materijal
        </button>
      </div>

      {tab === "add" && (
        <section style={cardStyle}>
          <h2 style={titleStyle}>Dodaj novi materijal</h2>

          <div style={formGridStyle}>
            <label style={labelStyle}>
              Naziv materijala
              <input
                value={newMaterialName}
                onChange={(e) => setNewMaterialName(e.target.value)}
                placeholder="npr. Flexkleber, Silikon, Grundierung..."
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Jedinica
              <select
                value={newMaterialUnit}
                onChange={(e) => setNewMaterialUnit(e.target.value)}
                style={inputStyle}
              >
                <option value="m²">m²</option>
                <option value="m">m</option>
                <option value="Stk.">Stk.</option>
                <option value="kg">kg</option>
                <option value="l">l</option>
                <option value="Sack">Sack</option>
                <option value="Karton">Karton</option>
                <option value="-">-</option>
              </select>
            </label>

            <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
              Napomena / opis nije obavezno
              <textarea
                value={newMaterialNote}
                onChange={(e) => setNewMaterialNote(e.target.value)}
                placeholder="Opcionalno..."
                style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
              />
            </label>
          </div>

          <button type="button" onClick={addMaterial} disabled={saving} style={saveButtonStyle}>
            {saving ? "Spremam..." : "Spremi materijal"}
          </button>

          <h3 style={smallTitleStyle}>Postojeći materijali</h3>

          {materials.length === 0 ? (
            <p style={mutedStyle}>Nema dodanih materijala.</p>
          ) : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>Materijal</th>
                    <th style={thStyle}>Jedinica</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m: any) => (
                    <tr key={m.id}>
                      <td style={tdStyle}>{m.id}</td>
                      <td style={tdStyle}>{getMaterialNameFromCatalog(m) || "-"}</td>
                      <td style={tdStyle}>{getMaterialUnitFromCatalog(m)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "overview" && (
        <section style={cardStyle}>
          <div style={overviewHeadStyle}>
            <div>
              <h2 style={titleStyle}>Ukupno utrošeno materijala</h2>
              <p style={mutedStyle}>Sabira sve unose iz svih prostorija i svih Baustella.</p>
            </div>

            <button type="button" onClick={loadData} style={refreshButtonStyle}>
              Osvježi
            </button>
          </div>

          {materialOverview.length === 0 ? (
            <p style={mutedStyle}>Još nema potrošnje materijala.</p>
          ) : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Materijal</th>
                    <th style={thStyle}>Ukupno</th>
                    <th style={thStyle}>Jedinica</th>
                    <th style={thStyle}>Broj unosa</th>
                    <th style={thStyle}>Gdje je trošeno</th>
                  </tr>
                </thead>
                <tbody>
                  {materialOverview.map((m: any) => (
                    <tr key={`${m.name}-${m.unit}`}>
                      <td style={tdStrongStyle}>{m.name}</td>
                      <td style={tdStrongStyle}>{formatNumber(m.total)}</td>
                      <td style={tdStyle}>{m.unit}</td>
                      <td style={tdStyle}>{m.count}</td>
                      <td style={tdStyle}>
                        <details>
                          <summary style={summaryStyle}>Prikaži Baustelle</summary>
                          <div style={detailsBoxStyle}>
                            {m.details.map((d: any) => (
                              <div key={d.id} style={detailRowStyle}>
                                <span>{d.baustelleName}</span>
                                <span>{d.roomName}</span>
                                <b>
                                  {formatNumber(d.quantity)} {d.unit}
                                </b>
                              </div>
                            ))}
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#050505",
  color: "white",
  padding: "32px",
  fontFamily: "Arial, sans-serif",
};

const topBarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 24,
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: "#f97316",
  fontWeight: 800,
  letterSpacing: 1,
  textTransform: "uppercase",
};

const mainTitleStyle: React.CSSProperties = {
  margin: "6px 0 8px",
  fontSize: 42,
  fontWeight: 900,
};

const subTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: 16,
};

const tabsStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 20,
};

const tabButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.18)",
  background: "#151515",
  color: "white",
  padding: "14px 18px",
  borderRadius: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const activeTabButtonStyle: React.CSSProperties = {
  ...tabButtonStyle,
  border: "1px solid #f97316",
  background: "#f97316",
  color: "#111",
};

const cardStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #181818, #101010)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 22,
  padding: 22,
  boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 18px",
  fontSize: 26,
  fontWeight: 900,
};

const smallTitleStyle: React.CSSProperties = {
  margin: "28px 0 12px",
  fontSize: 20,
  fontWeight: 900,
};

const textStyle: React.CSSProperties = {
  color: "#e5e7eb",
};

const mutedStyle: React.CSSProperties = {
  color: "#a3a3a3",
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 14,
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  color: "#e5e7eb",
  fontWeight: 800,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid rgba(255,255,255,0.18)",
  background: "#0b0b0b",
  color: "white",
  borderRadius: 12,
  padding: "14px 14px",
  fontSize: 16,
  outline: "none",
};

const saveButtonStyle: React.CSSProperties = {
  marginTop: 16,
  border: 0,
  background: "#22c55e",
  color: "#07130b",
  padding: "14px 20px",
  borderRadius: 14,
  fontWeight: 900,
  cursor: "pointer",
};

const refreshButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.15)",
  background: "#1f2937",
  color: "white",
  padding: "12px 16px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const backButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  background: "#111827",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "white",
  padding: "12px 16px",
  borderRadius: 14,
  fontWeight: 800,
};

const overviewHeadStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 18,
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 760,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "14px 12px",
  color: "#f97316",
  borderBottom: "1px solid rgba(255,255,255,0.15)",
  fontSize: 14,
};

const tdStyle: React.CSSProperties = {
  padding: "14px 12px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  color: "#f8fafc",
  verticalAlign: "top",
};

const tdStrongStyle: React.CSSProperties = {
  ...tdStyle,
  fontWeight: 900,
};

const summaryStyle: React.CSSProperties = {
  cursor: "pointer",
  color: "#93c5fd",
  fontWeight: 800,
};

const detailsBoxStyle: React.CSSProperties = {
  marginTop: 10,
  display: "grid",
  gap: 8,
};

const detailRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.5fr 1fr auto",
  gap: 10,
  padding: "8px 10px",
  background: "rgba(255,255,255,0.05)",
  borderRadius: 10,
};
