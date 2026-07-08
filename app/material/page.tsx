"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
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

const DEFAULT_GROUP_ORDER = [
  "Keramika",
  "Priprema podloge",
  "Estrich",
  "Hidroizolacija",
  "Ljepilo",
  "Schienen",
  "Fuge",
  "Silikoni",
  "Terase",
  "Dodaci",
  "Slobodni materijal",
];

const UNIT_OPTIONS = [
  "kom",
  "m",
  "m²",
  "m³",
  "kg",
  "l",
  "vreća",
  "rola",
  "paket",
  "karton",
  "set",
  "Stk.",
  "Sack",
  "Karton",
  "-",
];

type Tab = "overview" | "add";

function cleanText(value: any) {
  return String(value ?? "").trim();
}

function parseNumber(value: any) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const cleaned = String(value)
    .replace(/[^0-9,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(value: any) {
  const n = parseNumber(value);

  return n.toLocaleString("de-AT", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 1,
    maximumFractionDigits: 2,
  });
}

function normalizeKey(value: any) {
  return cleanText(value).toLowerCase().replace(/\s+/g, " ");
}

function getGroupIcon(name: string) {
  const n = cleanText(name).toLowerCase();

  if (n.includes("keramika")) return "▧";
  if (n.includes("priprema")) return "🧹";
  if (n.includes("estrich")) return "⬜";
  if (n.includes("hidro")) return "💧";
  if (n.includes("ljepilo")) return "🪣";
  if (n.includes("schienen")) return "📏";
  if (n.includes("fuge")) return "▦";
  if (n.includes("silikoni")) return "〰️";
  if (n.includes("terase")) return "🏗️";
  if (n.includes("dodaci")) return "+";
  if (n.includes("slobodni")) return "📦";

  return "📦";
}

function sortGroups(data: any[]) {
  return [...data].sort((a, b) => {
    const orderA = Number(a.sort_order || 9999);
    const orderB = Number(b.sort_order || 9999);

    if (orderA !== orderB) return orderA - orderB;

    const indexA = DEFAULT_GROUP_ORDER.indexOf(cleanText(a.naziv || a.name));
    const indexB = DEFAULT_GROUP_ORDER.indexOf(cleanText(b.naziv || b.name));

    if (indexA === -1 && indexB === -1) {
      return cleanText(a.naziv || a.name).localeCompare(cleanText(b.naziv || b.name), "de");
    }

    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });
}

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

  const role = cleanText(user.role || user.rolle || user.tip).toLowerCase();

  const name = cleanText(
    user.name ||
      user.worker_name ||
      user.radnik ||
      user.username ||
      user.userName ||
      user.displayName
  ).toLowerCase();

  return (
    role === "admin" ||
    role === "administrator" ||
    user.is_admin === true ||
    user.admin === true ||
    ADMIN_NAMES.includes(name)
  );
}

function getMaterialNameFromCatalog(material: any) {
  return cleanText(
    material?.naziv ||
      material?.name ||
      material?.material ||
      material?.bezeichnung ||
      material?.title
  );
}

function getMaterialUnitFromCatalog(material: any) {
  return cleanText(
    material?.jedinica || material?.unit || material?.einheit || material?.me || "-"
  );
}

function getMaterialGroupId(material: any) {
  return Number(
    material?.group_id ?? material?.gruppe_id ?? material?.material_group_id ?? 0
  );
}

function getGroupName(group: any) {
  return cleanText(group?.naziv || group?.name || group?.title || "Grupa");
}

function getBaustelleName(baustelle: any) {
  if (!baustelle) return "Baustelle nije pronađena";

  const name = cleanText(
    baustelle.name ||
      baustelle.naziv ||
      baustelle.baustelle ||
      baustelle.projekt ||
      baustelle.title ||
      "Baustelle"
  );

  const ort = cleanText(baustelle.ort || baustelle.location || baustelle.mjesto || "");

  return ort ? `${name} - ${ort}` : name;
}

function getBaustelleStatus(baustelle: any) {
  const raw = cleanText(
    baustelle?.status ||
      baustelle?.state ||
      baustelle?.phase ||
      baustelle?.archiv_status ||
      ""
  ).toLowerCase();

  const archived =
    baustelle?.archived === true ||
    baustelle?.is_archived === true ||
    baustelle?.archiv === true ||
    raw.includes("archiv") ||
    raw.includes("closed") ||
    raw.includes("fertig") ||
    raw.includes("abgeschlossen");

  return archived ? "Arhiv" : "Aktivno";
}

export default function AdminMaterialPage() {
  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  const [groups, setGroups] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [baustelleMaterials, setBaustelleMaterials] = useState<any[]>([]);
  const [baustellen, setBaustellen] = useState<any[]>([]);

  const [newMaterialName, setNewMaterialName] = useState("");
  const [newMaterialUnit, setNewMaterialUnit] = useState("m²");
  const [newMaterialGroupId, setNewMaterialGroupId] = useState("");
  const [newMaterialNote, setNewMaterialNote] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

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

    const groupsRes = await supabase
      .from("material_groups")
      .select("*")
      .order("sort_order", { ascending: true });

    if (groupsRes.error) {
      alert("Greška kod učitavanja grupa materijala: " + groupsRes.error.message);
      setLoading(false);
      return;
    }

    const materialsRes = await supabase
      .from("materials")
      .select("*")
      .order("naziv", { ascending: true });

    if (materialsRes.error) {
      alert("Greška kod učitavanja materijala: " + materialsRes.error.message);
      setLoading(false);
      return;
    }

    const usedRes = await supabase
      .from("baustelle_material")
      .select("*")
      .order("id", { ascending: false });

    if (usedRes.error) {
      alert("Greška kod učitavanja utrošenog materijala: " + usedRes.error.message);
      setLoading(false);
      return;
    }

    const baustelleIds = [
      ...new Set((usedRes.data || []).map((m: any) => Number(m.baustelle_id)).filter(Boolean)),
    ];

    let baustellenData: any[] = [];

    if (baustelleIds.length > 0) {
      const baustellenRes = await supabase
        .from("baustellen")
        .select("*")
        .in("id", baustelleIds);

      if (baustellenRes.error) {
        alert("Greška kod učitavanja Baustella: " + baustellenRes.error.message);
        setLoading(false);
        return;
      }

      baustellenData = baustellenRes.data || [];
    }

    const sortedGroups = sortGroups(groupsRes.data || []);

    setGroups(sortedGroups);
    setMaterials(materialsRes.data || []);
    setBaustelleMaterials(usedRes.data || []);
    setBaustellen(baustellenData);

    if (!newMaterialGroupId && sortedGroups.length > 0) {
      setNewMaterialGroupId(String(sortedGroups[0].id));
    }

    setLoading(false);
  }

  function getMaterialById(id: any) {
    return materials.find((m: any) => Number(m.id) === Number(id));
  }

  function getGroupById(id: any) {
    return groups.find((g: any) => Number(g.id) === Number(id));
  }

  function getBaustelleById(id: any) {
    return baustellen.find((b: any) => Number(b.id) === Number(id));
  }

  function getNameFromUsedMaterial(row: any) {
    const customName = cleanText(row?.custom_naziv || row?.custom_name);
    if (customName) return customName;

    const savedName = cleanText(
      row?.materijal || row?.material || row?.material_name || row?.naziv || row?.name
    );
    if (savedName) return savedName;

    const catalog = row?.material_id ? getMaterialById(row.material_id) : null;
    const catalogName = getMaterialNameFromCatalog(catalog);

    if (catalogName) return catalogName;
    if (row?.material_id) return `Materijal ID ${row.material_id}`;

    return "Materijal";
  }

  function getUnitFromUsedMaterial(row: any) {
    const customUnit = cleanText(row?.custom_jedinica || row?.custom_unit);
    if (customUnit) return customUnit;

    const directUnit = cleanText(row?.jedinica || row?.unit || row?.einheit);
    if (directUnit) return directUnit;

    const catalog = row?.material_id ? getMaterialById(row.material_id) : null;
    return getMaterialUnitFromCatalog(catalog) || "-";
  }

  function getGroupFromUsedMaterial(row: any) {
    const catalog = row?.material_id ? getMaterialById(row.material_id) : null;
    const groupId = getMaterialGroupId(catalog);
    const group = groupId ? getGroupById(groupId) : null;
    const groupName = getGroupName(group);

    if (groupName && groupName !== "Grupa") return groupName;

    const name = getNameFromUsedMaterial(row).toLowerCase();

    if (name.includes("keramika")) return "Keramika";
    if (name.includes("silikon")) return "Silikoni";
    if (name.includes("fuge") || name.includes("fuga")) return "Fuge";
    if (name.includes("schiene") || name.includes("profil")) return "Schienen";
    if (name.includes("ljepilo") || name.includes("kleber")) return "Ljepilo";
    if (name.includes("hidro") || name.includes("abdichtung")) return "Hidroizolacija";
    if (name.includes("estrich")) return "Estrich";

    return "Slobodni materijal";
  }

  const materialOverview = useMemo(() => {
    const map = new Map<string, any>();

    for (const row of baustelleMaterials) {
      const name = getNameFromUsedMaterial(row);
      const unit = getUnitFromUsedMaterial(row);
      const groupName = getGroupFromUsedMaterial(row);
      const quantity = parseNumber(
        row?.kolicina ?? row?.quantity ?? row?.menge ?? row?.amount ?? row?.qty ?? 0
      );

      if (!name || quantity === 0) continue;

      const key = `${normalizeKey(groupName)}__${normalizeKey(name)}__${normalizeKey(unit)}`;

      if (!map.has(key)) {
        map.set(key, {
          groupName,
          name,
          unit,
          total: 0,
          count: 0,
          baustelleIds: new Set<number>(),
          details: [],
        });
      }

      const baustelle = getBaustelleById(row.baustelle_id);
      const item = map.get(key);

      item.total += quantity;
      item.count += 1;
      if (row.baustelle_id) item.baustelleIds.add(Number(row.baustelle_id));

      item.details.push({
        id: row.id,
        baustelleId: row.baustelle_id,
        baustelleName: getBaustelleName(baustelle),
        baustelleStatus: getBaustelleStatus(baustelle),
        quantity,
        unit,
      });
    }

    return Array.from(map.values())
      .map((item: any) => ({
        ...item,
        baustelleCount: item.baustelleIds.size,
        baustelleIds: undefined,
      }))
      .sort((a: any, b: any) => {
        const groupA = DEFAULT_GROUP_ORDER.indexOf(a.groupName);
        const groupB = DEFAULT_GROUP_ORDER.indexOf(b.groupName);
        const safeA = groupA === -1 ? 999 : groupA;
        const safeB = groupB === -1 ? 999 : groupB;

        if (safeA !== safeB) return safeA - safeB;
        return String(a.name).localeCompare(String(b.name), "de");
      });
  }, [baustelleMaterials, baustellen, materials, groups]);

  const filteredOverview = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return materialOverview;

    return materialOverview.filter((item: any) => {
      const haystack = `${item.groupName} ${item.name} ${item.unit} ${item.details
        .map((d: any) => d.baustelleName)
        .join(" ")}`.toLowerCase();

      return haystack.includes(term);
    });
  }, [materialOverview, searchTerm]);

  const overviewByGroup = useMemo(() => {
    const map = new Map<string, any[]>();

    for (const item of filteredOverview) {
      if (!map.has(item.groupName)) map.set(item.groupName, []);
      map.get(item.groupName)?.push(item);
    }

    return Array.from(map.entries()).map(([groupName, items]) => ({ groupName, items }));
  }, [filteredOverview]);

  const totalUsedEntries = baustelleMaterials.length;
  const totalDifferentMaterials = materialOverview.length;
  const totalBaustellen = new Set(
    baustelleMaterials.map((m: any) => Number(m.baustelle_id)).filter(Boolean)
  ).size;

  const materialsByGroup = useMemo(() => {
    return groups.map((group: any) => {
      const items = materials
        .filter((m: any) => getMaterialGroupId(m) === Number(group.id))
        .sort((a: any, b: any) =>
          getMaterialNameFromCatalog(a).localeCompare(getMaterialNameFromCatalog(b), "de")
        );

      return { group, items };
    });
  }, [groups, materials]);

  async function addMaterial() {
    const name = newMaterialName.trim();
    const unit = newMaterialUnit.trim() || "-";
    const note = newMaterialNote.trim();
    const groupId = Number(newMaterialGroupId);

    if (!name) {
      alert("Upiši naziv materijala.");
      return;
    }

    if (!groupId) {
      alert("Odaberi grupu materijala.");
      return;
    }

    setSaving(true);

    const attempts: any[] = [
      { naziv: name, jedinica: unit, group_id: groupId, note, active: true },
      { naziv: name, jedinica: unit, group_id: groupId, active: true },
      { naziv: name, jedinica: unit, group_id: groupId },
      { naziv: name, jedinica: unit, material_group_id: groupId },
      { naziv: name, jedinica: unit, gruppe_id: groupId },
    ];

    let lastError: any = null;

    for (const payload of attempts) {
      const { error } = await supabase.from("materials").insert(payload);

      if (!error) {
        setNewMaterialName("");
        setNewMaterialNote("");
        await loadData();
        setTab("add");
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
            Grupe materijala, dodavanje novog materijala i pregled ukupne potrošnje sa aktivnih i arhiviranih Baustella.
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

      {tab === "overview" && (
        <section style={cardStyle}>
          <div style={overviewHeadStyle}>
            <div>
              <h2 style={titleStyle}>Ukupno utrošeno materijala</h2>
              <p style={mutedStyle}>
                Sabira tabelu <b>baustelle_material</b> iz svih Baustella, bez obzira da li su aktivne ili u arhivu.
              </p>
            </div>

            <button type="button" onClick={loadData} style={refreshButtonStyle}>
              Osvježi
            </button>
          </div>

          <div style={statsGridStyle}>
            <div style={statBoxStyle}>
              <span style={statNumberStyle}>{totalDifferentMaterials}</span>
              <span style={statTextStyle}>različitih materijala</span>
            </div>
            <div style={statBoxStyle}>
              <span style={statNumberStyle}>{totalUsedEntries}</span>
              <span style={statTextStyle}>unosa potrošnje</span>
            </div>
            <div style={statBoxStyle}>
              <span style={statNumberStyle}>{totalBaustellen}</span>
              <span style={statTextStyle}>Baustella</span>
            </div>
          </div>

          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pretraga materijala ili Baustelle..."
            style={searchInputStyle}
          />

          {filteredOverview.length === 0 ? (
            <p style={mutedBoxStyle}>Još nema potrošnje materijala ili nema rezultata za pretragu.</p>
          ) : (
            <div style={groupSectionsStyle}>
              {overviewByGroup.map((group: any) => (
                <div key={group.groupName} style={groupOverviewStyle}>
                  <h3 style={groupHeaderStyle}>
                    <span>{getGroupIcon(group.groupName)}</span>
                    <span>{group.groupName}</span>
                    <small style={groupSmallStyle}>{group.items.length} materijala</small>
                  </h3>

                  <div style={tableWrapStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Materijal</th>
                          <th style={thStyle}>Ukupno</th>
                          <th style={thStyle}>Jedinica</th>
                          <th style={thStyle}>Baustelle</th>
                          <th style={thStyle}>Detalji</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((m: any) => (
                          <tr key={`${m.groupName}-${m.name}-${m.unit}`}>
                            <td style={tdStrongStyle}>{m.name}</td>
                            <td style={tdStrongStyle}>{formatNumber(m.total)}</td>
                            <td style={tdStyle}>{m.unit}</td>
                            <td style={tdStyle}>{m.baustelleCount}</td>
                            <td style={tdStyle}>
                              <details>
                                <summary style={summaryStyle}>Prikaži gdje je trošeno</summary>
                                <div style={detailsBoxStyle}>
                                  {m.details.map((d: any) => (
                                    <div key={d.id} style={detailRowStyle}>
                                      <div>
                                        <b>{d.baustelleName}</b>
                                        <div style={detailSmallStyle}>ID: {d.baustelleId}</div>
                                      </div>
                                      <span style={statusBadgeStyle}>{d.baustelleStatus}</span>
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
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "add" && (
        <section style={cardStyle}>
          <h2 style={titleStyle}>Dodaj novi materijal u katalog</h2>
          <p style={mutedStyle}>
            Novi materijal se dodaje u postojeće grupe i poslije se vidi u Baustelle materijalu.
          </p>

          <div style={formGridStyle}>
            <label style={labelStyle}>
              Grupa materijala
              <select
                value={newMaterialGroupId}
                onChange={(e) => setNewMaterialGroupId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Odaberi grupu</option>
                {groups.map((g: any) => (
                  <option key={g.id} value={String(g.id)}>
                    {getGroupName(g)}
                  </option>
                ))}
              </select>
            </label>

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
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
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

          <h3 style={smallTitleStyle}>Postojeći materijali po grupama</h3>

          {materials.length === 0 ? (
            <p style={mutedBoxStyle}>Nema dodanih materijala.</p>
          ) : (
            <div style={catalogGridStyle}>
              {materialsByGroup.map((block: any) => (
                <div key={block.group.id} style={catalogGroupStyle}>
                  <h4 style={catalogGroupTitleStyle}>
                    {getGroupIcon(getGroupName(block.group))} {getGroupName(block.group)}
                  </h4>

                  {block.items.length === 0 ? (
                    <p style={mutedStyle}>Nema materijala u ovoj grupi.</p>
                  ) : (
                    <div style={catalogListStyle}>
                      {block.items.map((m: any) => (
                        <div key={m.id} style={catalogItemStyle}>
                          <b>{getMaterialNameFromCatalog(m) || "-"}</b>
                          <span>{getMaterialUnitFromCatalog(m)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#050505",
  color: "white",
  padding: "32px",
  fontFamily: "Arial, sans-serif",
};

const topBarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 24,
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: "#f97316",
  fontWeight: 800,
  letterSpacing: 1,
  textTransform: "uppercase",
};

const mainTitleStyle: CSSProperties = {
  margin: "6px 0 8px",
  fontSize: 42,
  fontWeight: 900,
};

const subTextStyle: CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: 16,
  maxWidth: 850,
};

const tabsStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 20,
};

const tabButtonStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.18)",
  background: "#151515",
  color: "white",
  padding: "14px 18px",
  borderRadius: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const activeTabButtonStyle: CSSProperties = {
  ...tabButtonStyle,
  border: "1px solid #f97316",
  background: "#f97316",
  color: "#111",
};

const cardStyle: CSSProperties = {
  background: "linear-gradient(180deg, #181818, #101010)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 22,
  padding: 22,
  boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
};

const titleStyle: CSSProperties = {
  margin: "0 0 14px",
  fontSize: 26,
  fontWeight: 900,
};

const smallTitleStyle: CSSProperties = {
  margin: "30px 0 14px",
  fontSize: 21,
  fontWeight: 900,
};

const textStyle: CSSProperties = {
  color: "#e5e7eb",
};

const mutedStyle: CSSProperties = {
  color: "#a3a3a3",
};

const mutedBoxStyle: CSSProperties = {
  color: "#a3a3a3",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  padding: 14,
  borderRadius: 14,
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 14,
  marginTop: 16,
};

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  color: "#e5e7eb",
  fontWeight: 800,
};

const inputStyle: CSSProperties = {
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

const searchInputStyle: CSSProperties = {
  ...inputStyle,
  marginBottom: 18,
};

const saveButtonStyle: CSSProperties = {
  marginTop: 16,
  border: 0,
  background: "#22c55e",
  color: "#07130b",
  padding: "14px 20px",
  borderRadius: 14,
  fontWeight: 900,
  cursor: "pointer",
};

const refreshButtonStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.15)",
  background: "#1f2937",
  color: "white",
  padding: "12px 16px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const backButtonStyle: CSSProperties = {
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
  whiteSpace: "nowrap",
};

const overviewHeadStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 18,
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12,
  marginBottom: 18,
};

const statBoxStyle: CSSProperties = {
  background: "rgba(249,115,22,0.10)",
  border: "1px solid rgba(249,115,22,0.28)",
  borderRadius: 16,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 5,
};

const statNumberStyle: CSSProperties = {
  fontSize: 30,
  fontWeight: 900,
  color: "#fb923c",
};

const statTextStyle: CSSProperties = {
  color: "#e5e7eb",
  fontWeight: 800,
};

const groupSectionsStyle: CSSProperties = {
  display: "grid",
  gap: 22,
};

const groupOverviewStyle: CSSProperties = {
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 18,
  padding: 16,
};

const groupHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  margin: "0 0 14px",
  fontSize: 21,
  color: "#f8fafc",
};

const groupSmallStyle: CSSProperties = {
  marginLeft: "auto",
  color: "#a3a3a3",
  fontSize: 13,
};

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 16,
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 820,
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "14px 12px",
  color: "#f97316",
  borderBottom: "1px solid rgba(255,255,255,0.15)",
  fontSize: 14,
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "14px 12px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  color: "#f8fafc",
  verticalAlign: "top",
};

const tdStrongStyle: CSSProperties = {
  ...tdStyle,
  fontWeight: 900,
};

const summaryStyle: CSSProperties = {
  cursor: "pointer",
  color: "#93c5fd",
  fontWeight: 800,
};

const detailsBoxStyle: CSSProperties = {
  marginTop: 10,
  display: "grid",
  gap: 8,
};

const detailRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.7fr auto auto",
  gap: 12,
  alignItems: "center",
  padding: "9px 10px",
  background: "rgba(255,255,255,0.05)",
  borderRadius: 10,
};

const detailSmallStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 12,
  marginTop: 3,
};

const statusBadgeStyle: CSSProperties = {
  background: "rgba(96,165,250,0.14)",
  border: "1px solid rgba(96,165,250,0.28)",
  color: "#bfdbfe",
  padding: "5px 8px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const catalogGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
};

const catalogGroupStyle: CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 16,
  padding: 14,
};

const catalogGroupTitleStyle: CSSProperties = {
  margin: "0 0 12px",
  color: "#fb923c",
  fontSize: 17,
};

const catalogListStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

const catalogItemStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  background: "rgba(0,0,0,0.28)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 10,
  padding: "9px 10px",
};
