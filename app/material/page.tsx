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

const GROUP_LABELS_DE: Record<string, string> = {
  Keramika: "Fliesen",
  "Priprema podloge": "Untergrundvorbereitung",
  Estrich: "Estrich",
  Hidroizolacija: "Abdichtung",
  Ljepilo: "Kleber",
  Schienen: "Schienen",
  Fuge: "Fugen",
  Silikoni: "Silikone",
  Terase: "Terrassen",
  Dodaci: "Zubehör",
  "Slobodni materijal": "Freies Material",
};

const UNIT_LABELS_DE: Record<string, string> = {
  kom: "Stk.",
  vreća: "Sack",
  vreca: "Sack",
  rola: "Rolle",
  paket: "Paket",
  karton: "Karton",
  set: "Set",
  l: "l",
  kg: "kg",
  m: "m",
  "m²": "m²",
  "m2": "m²",
  "m³": "m³",
  "m3": "m³",
  "-": "-",
};

const UNIT_OPTIONS = [
  "Stk.",
  "m",
  "m²",
  "m³",
  "kg",
  "l",
  "Sack",
  "Rolle",
  "Paket",
  "Karton",
  "Set",
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

function displayGroupName(value: any) {
  const name = cleanText(value);
  return GROUP_LABELS_DE[name] || name || "Gruppe";
}

function displayUnit(value: any) {
  const unit = cleanText(value);
  if (!unit) return "-";
  return UNIT_LABELS_DE[unit] || UNIT_LABELS_DE[unit.toLowerCase()] || unit;
}

function getGroupIcon(name: string) {
  const n = cleanText(name).toLowerCase();

  if (n.includes("keramika") || n.includes("fliesen")) return "▧";
  if (n.includes("priprema") || n.includes("untergrund")) return "🧹";
  if (n.includes("estrich")) return "⬜";
  if (n.includes("hidro") || n.includes("abdichtung")) return "💧";
  if (n.includes("ljepilo") || n.includes("kleber")) return "🪣";
  if (n.includes("schienen")) return "📏";
  if (n.includes("fuge") || n.includes("fugen")) return "▦";
  if (n.includes("silikoni") || n.includes("silikone") || n.includes("silikon")) return "〰️";
  if (n.includes("terase") || n.includes("terrassen")) return "🏗️";
  if (n.includes("dodaci") || n.includes("zubehör")) return "+";
  if (n.includes("slobodni") || n.includes("freies")) return "📦";

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
      material?.material_name ||
      material?.bezeichnung ||
      material?.title ||
      material?.produkt ||
      material?.product ||
      material?.artikel ||
      material?.artikel_name ||
      material?.material_naziv ||
      material?.material_title ||
      material?.beschreibung ||
      material?.description
  );
}

function getMaterialUnitFromCatalog(material: any) {
  return cleanText(
    material?.jedinica ||
      material?.unit ||
      material?.einheit ||
      material?.me ||
      material?.unit_name ||
      material?.jedinica_mjere ||
      material?.unit_label ||
      "-"
  );
}

function getMaterialGroupId(material: any) {
  return Number(
    material?.group_id ?? material?.gruppe_id ?? material?.material_group_id ?? material?.material_gruppe_id ?? material?.category_id ?? 0
  );
}

function getUsedMaterialId(row: any) {
  return Number(
    row?.material_id ??
      row?.material_catalog_id ??
      row?.catalog_id ??
      row?.materialId ??
      0
  );
}

function getMaterialSignature(material: any) {
  return `${normalizeKey(getMaterialNameFromCatalog(material))}__${normalizeKey(
    getMaterialUnitFromCatalog(material)
  )}__${getMaterialGroupId(material)}`;
}

function getGroupName(group: any) {
  return cleanText(group?.naziv || group?.name || group?.title || "Gruppe");
}


function getBaustelleIdFromMaterialRow(row: any) {
  return Number(
    row?.baustelle_id ??
      row?.baustellen_id ??
      row?.baustelleId ??
      row?.projekt_id ??
      row?.project_id ??
      row?.projectId ??
      row?.projektId ??
      0
  );
}

function getBaustelleNameFromMaterialRow(row: any) {
  return cleanText(
    row?.baustelle_name ||
      row?.baustelle ||
      row?.projekt_name ||
      row?.projekt ||
      row?.project_name ||
      row?.project ||
      row?.building_site_name ||
      ""
  );
}

function mergeBaustelleRows(existing: any[], incoming: any[], source: string) {
  const map = new Map<number, any>();

  for (const row of existing) {
    const id = Number(row?.id ?? row?.__lookupId ?? 0);
    if (id) map.set(id, row);
  }

  for (const row of incoming || []) {
    const id = Number(row?.id ?? 0);
    if (!id) continue;

    if (!map.has(id)) {
      map.set(id, { ...row, __lookupId: id, __source: source });
    }
  }

  return Array.from(map.values());
}

function getBaustelleName(baustelle: any, fallbackId?: any, fallbackName?: string) {
  if (!baustelle) {
    if (fallbackName) return fallbackName;
    if (fallbackId) return `Baustelle ID ${fallbackId}`;
    return "Baustelle nicht gefunden";
  }

  const name = cleanText(
    baustelle.name ||
      baustelle.naziv ||
      baustelle.baustelle ||
      baustelle.projekt ||
      baustelle.projekt_name ||
      baustelle.title ||
      baustelle.kunde ||
      "Baustelle"
  );

  const ort = cleanText(
    baustelle.ort ||
      baustelle.location ||
      baustelle.mjesto ||
      baustelle.adresa ||
      baustelle.adresse ||
      baustelle.address ||
      ""
  );

  return ort ? `${name} - ${ort}` : name;
}

function getBaustelleStatus(baustelle: any) {
  if (!baustelle) return "Unbekannt";

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

  return archived ? "Archiv" : "Aktiv";
}

export default function AdminMaterialPage() {
  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  const [groups, setGroups] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [materialCatalog, setMaterialCatalog] = useState<any[]>([]);
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

  async function loadOptionalBaustellen(tableName: string, ids: number[]) {
    const res = await supabase.from(tableName).select("*").in("id", ids);
    if (res.error) return [];
    return res.data || [];
  }

  async function loadData() {
    setLoading(true);

    const groupsRes = await supabase
      .from("material_groups")
      .select("*")
      .order("sort_order", { ascending: true });

    if (groupsRes.error) {
      alert("Fehler beim Laden der Materialgruppen: " + groupsRes.error.message);
      setLoading(false);
      return;
    }

    const materialsRes = await supabase
      .from("materials")
      .select("*")
      .order("naziv", { ascending: true });

    if (materialsRes.error) {
      alert("Fehler beim Laden der Materialien: " + materialsRes.error.message);
      setLoading(false);
      return;
    }

    const catalogRes = await supabase
      .from("material_catalog")
      .select("*")
      .order("id", { ascending: true });

    const usedRes = await supabase
      .from("baustelle_material")
      .select("*")
      .order("id", { ascending: false });

    if (usedRes.error) {
      alert("Fehler beim Laden des Materialverbrauchs: " + usedRes.error.message);
      setLoading(false);
      return;
    }

    const baustelleIds = [
      ...new Set((usedRes.data || []).map((m: any) => getBaustelleIdFromMaterialRow(m)).filter(Boolean)),
    ];

    let baustellenData: any[] = [];

    if (baustelleIds.length > 0) {
      const lookupTables = [
        "baustellen",
        "projekte",
        "archiv",
        "archiv_baustellen",
        "baustellen_archiv",
      ];

      for (const tableName of lookupTables) {
        const rows = await loadOptionalBaustellen(tableName, baustelleIds);
        baustellenData = mergeBaustelleRows(baustellenData, rows, tableName);
      }
    }
    const sortedGroups = sortGroups(groupsRes.data || []);

    setGroups(sortedGroups);
    setMaterials(materialsRes.data || []);
    setMaterialCatalog(catalogRes.error ? [] : catalogRes.data || []);
    setBaustelleMaterials(usedRes.data || []);
    setBaustellen(baustellenData);

    if (!newMaterialGroupId && sortedGroups.length > 0) {
      setNewMaterialGroupId(String(sortedGroups[0].id));
    }

    setLoading(false);
  }

  function materialMatchesId(material: any, id: any) {
    const numericId = Number(id);
    return [
      material?.id,
      material?.material_id,
      material?.materialId,
      material?.catalog_id,
      material?.material_catalog_id,
      material?.artikel_id,
    ].some((value) => Number(value) === numericId);
  }

  function getMaterialById(id: any) {
    if (!id) return null;

    return (
      materials.find((m: any) => materialMatchesId(m, id)) ||
      materialCatalog.find((m: any) => materialMatchesId(m, id)) ||
      null
    );
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
      row?.materijal ||
        row?.material ||
        row?.material_name ||
        row?.material_naziv ||
        row?.naziv ||
        row?.name ||
        row?.bezeichnung ||
        row?.artikel ||
        row?.artikel_name ||
        row?.produkt ||
        row?.product ||
        row?.description ||
        row?.beschreibung
    );
    if (savedName) return savedName;

    const materialId = getUsedMaterialId(row);
    const catalog = materialId ? getMaterialById(materialId) : null;
    const catalogName = getMaterialNameFromCatalog(catalog);

    if (catalogName) return catalogName;
    if (materialId) return `Material ID ${materialId}`;

    return "Material";
  }

  function getUnitFromUsedMaterial(row: any) {
    const customUnit = cleanText(row?.custom_jedinica || row?.custom_unit);
    if (customUnit) return customUnit;

    const directUnit = cleanText(row?.jedinica || row?.unit || row?.einheit);
    if (directUnit) return directUnit;

    const materialId = getUsedMaterialId(row);
    const catalog = materialId ? getMaterialById(materialId) : null;
    return getMaterialUnitFromCatalog(catalog) || "-";
  }

  function getGroupFromUsedMaterial(row: any) {
    const directGroupName = cleanText(row?.group_name || row?.gruppe || row?.grupa || row?.category || row?.kategorija);
    if (directGroupName) return directGroupName;

    const directGroupId = Number(
      row?.group_id ?? row?.gruppe_id ?? row?.material_group_id ?? row?.material_gruppe_id ?? row?.category_id ?? 0
    );
    const directGroup = directGroupId ? getGroupById(directGroupId) : null;
    const directGroupLabel = getGroupName(directGroup);
    if (directGroupLabel && directGroupLabel !== "Gruppe") return directGroupLabel;

    const materialId = getUsedMaterialId(row);
    const catalog = materialId ? getMaterialById(materialId) : null;
    const groupId = getMaterialGroupId(catalog);
    const group = groupId ? getGroupById(groupId) : null;
    const groupName = getGroupName(group);

    if (groupName && groupName !== "Gruppe") return groupName;

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

      const baustelleId = getBaustelleIdFromMaterialRow(row);
      const baustelle = getBaustelleById(baustelleId);
      const baustelleNameFromRow = getBaustelleNameFromMaterialRow(row);
      const item = map.get(key);

      item.total += quantity;
      item.count += 1;
      if (baustelleId) item.baustelleIds.add(Number(baustelleId));

      item.details.push({
        id: row.id,
        baustelleId,
        baustelleName: getBaustelleName(baustelle, baustelleId, baustelleNameFromRow),
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
  }, [baustelleMaterials, baustellen, materials, materialCatalog, groups]);

  const filteredOverview = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return materialOverview;

    return materialOverview.filter((item: any) => {
      const haystack = `${item.groupName} ${displayGroupName(item.groupName)} ${item.name} ${item.unit} ${displayUnit(item.unit)} ${item.details
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
    baustelleMaterials.map((m: any) => getBaustelleIdFromMaterialRow(m)).filter(Boolean)
  ).size;

  const allCatalogMaterials = useMemo(() => {
    const map = new Map<string, any>();

    for (const material of [...materialCatalog, ...materials]) {
      const name = getMaterialNameFromCatalog(material);
      if (!name) continue;

      const key = getMaterialSignature(material);
      if (!map.has(key)) map.set(key, material);
    }

    return Array.from(map.values());
  }, [materials, materialCatalog]);

  const materialsByGroup = useMemo(() => {
    return groups.map((group: any) => {
      const items = allCatalogMaterials
        .filter((m: any) => getMaterialGroupId(m) === Number(group.id))
        .sort((a: any, b: any) =>
          getMaterialNameFromCatalog(a).localeCompare(getMaterialNameFromCatalog(b), "de")
        );

      return { group, items };
    });
  }, [groups, allCatalogMaterials]);

  async function addMaterial() {
    const name = newMaterialName.trim();
    const unit = newMaterialUnit.trim() || "-";
    const note = newMaterialNote.trim();
    const groupId = Number(newMaterialGroupId);

    if (!name) {
      alert("Materialname eingeben.");
      return;
    }

    if (!groupId) {
      alert("Materialgruppe auswählen.");
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
        alert("Material wurde hinzugefügt.");
        return;
      }

      lastError = error;
    }

    setSaving(false);
    alert("Material wurde nicht hinzugefügt: " + (lastError?.message || "Unbekannter Fehler"));
  }

  if (!accessChecked || loading) {
    return (
      <main style={pageStyle}>
        <div style={cardStyle}>Wird geladen...</div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Material</h1>
          <p style={textStyle}>Diese Seite ist nur für Admins verfügbar.</p>
          <Link href="/dashboard" style={backButtonStyle}>
            Zurück
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
            Materialgruppen, neues Material hinzufügen und Gesamtverbrauch aller aktiven und archivierten Baustellen anzeigen.
          </p>
        </div>

        <Link href="/dashboard" style={backButtonStyle}>
          Zurück
        </Link>
      </div>

      <div style={tabsStyle}>
        <button
          type="button"
          onClick={() => setTab("overview")}
          style={tab === "overview" ? activeTabButtonStyle : tabButtonStyle}
        >
          Materialverbrauch
        </button>

        <button
          type="button"
          onClick={() => setTab("add")}
          style={tab === "add" ? activeTabButtonStyle : tabButtonStyle}
        >
          Neues Material hinzufügen
        </button>
      </div>

      {tab === "overview" && (
        <section style={cardStyle}>
          <div style={overviewHeadStyle}>
            <div>
              <h2 style={titleStyle}>Gesamter Materialverbrauch</h2>
              <p style={mutedStyle}>
                Summiert <b>baustelle_material</b> aus allen Baustellen/Projekten und liest Namen aus <b>materials</b> + <b>material_catalog</b>.
              </p>
            </div>

            <button type="button" onClick={loadData} style={refreshButtonStyle}>
              Aktualisieren
            </button>
          </div>

          <div style={statsGridStyle}>
            <div style={statBoxStyle}>
              <span style={statNumberStyle}>{totalDifferentMaterials}</span>
              <span style={statTextStyle}>verschiedene Materialien</span>
            </div>
            <div style={statBoxStyle}>
              <span style={statNumberStyle}>{totalUsedEntries}</span>
              <span style={statTextStyle}>Verbrauchseinträge</span>
            </div>
            <div style={statBoxStyle}>
              <span style={statNumberStyle}>{totalBaustellen}</span>
              <span style={statTextStyle}>Baustellen</span>
            </div>
          </div>

          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Material oder Baustelle suchen..."
            style={searchInputStyle}
          />

          {filteredOverview.length === 0 ? (
            <p style={mutedBoxStyle}>Noch kein Materialverbrauch vorhanden oder keine Treffer für die Suche.</p>
          ) : (
            <div style={groupSectionsStyle}>
              {overviewByGroup.map((group: any) => (
                <div key={group.groupName} style={groupOverviewStyle}>
                  <h3 style={groupHeaderStyle}>
                    <span>{getGroupIcon(group.groupName)}</span>
                    <span>{displayGroupName(group.groupName)}</span>
                    <small style={groupSmallStyle}>{group.items.length} Materialien</small>
                  </h3>

                  <div style={tableWrapStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Material</th>
                          <th style={thStyle}>Gesamt</th>
                          <th style={thStyle}>Einheit</th>
                          <th style={thStyle}>Baustelle</th>
                          <th style={thStyle}>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((m: any) => (
                          <tr key={`${m.groupName}-${m.name}-${m.unit}`}>
                            <td style={tdStrongStyle}>{m.name}</td>
                            <td style={tdStrongStyle}>{formatNumber(m.total)}</td>
                            <td style={tdStyle}>{displayUnit(m.unit)}</td>
                            <td style={tdStyle}>{m.baustelleCount}</td>
                            <td style={tdStyle}>
                              <details>
                                <summary style={summaryStyle}>Anzeigen, wo verbraucht</summary>
                                <div style={detailsBoxStyle}>
                                  {m.details.map((d: any) => (
                                    <div key={d.id} style={detailRowStyle}>
                                      <div>
                                        <b>{d.baustelleName}</b>
                                        <div style={detailSmallStyle}>ID: {d.baustelleId}</div>
                                      </div>
                                      <span style={statusBadgeStyle}>{d.baustelleStatus}</span>
                                      <b>
                                        {formatNumber(d.quantity)} {displayUnit(d.unit)}
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
          <h2 style={titleStyle}>Neues Material zum Katalog hinzufügen</h2>
          <p style={mutedStyle}>
            Neues Material wird einer bestehenden Gruppe zugeordnet und ist danach im Baustellen-Material sichtbar.
          </p>

          <div style={formGridStyle}>
            <label style={labelStyle}>
              Materialgruppe
              <select
                value={newMaterialGroupId}
                onChange={(e) => setNewMaterialGroupId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Gruppe auswählen</option>
                {groups.map((g: any) => (
                  <option key={g.id} value={String(g.id)}>
                    {displayGroupName(getGroupName(g))}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              Materialname
              <input
                value={newMaterialName}
                onChange={(e) => setNewMaterialName(e.target.value)}
                placeholder="z. B. Flexkleber, Silikon, Grundierung..."
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Einheit
              <select
                value={newMaterialUnit}
                onChange={(e) => setNewMaterialUnit(e.target.value)}
                style={inputStyle}
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {displayUnit(u)}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
              Notiz / Beschreibung optional
              <textarea
                value={newMaterialNote}
                onChange={(e) => setNewMaterialNote(e.target.value)}
                placeholder="Optional..."
                style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
              />
            </label>
          </div>

          <button type="button" onClick={addMaterial} disabled={saving} style={saveButtonStyle}>
            {saving ? "Speichern..." : "Material speichern"}
          </button>

          <h3 style={smallTitleStyle}>Vorhandene Materialien nach Gruppen</h3>

          {materials.length === 0 ? (
            <p style={mutedBoxStyle}>Keine Materialien vorhanden.</p>
          ) : (
            <div style={catalogGridStyle}>
              {materialsByGroup.map((block: any) => (
                <div key={block.group.id} style={catalogGroupStyle}>
                  <h4 style={catalogGroupTitleStyle}>
                    {getGroupIcon(getGroupName(block.group))} {displayGroupName(getGroupName(block.group))}
                  </h4>

                  {block.items.length === 0 ? (
                    <p style={mutedStyle}>Keine Materialien in dieser Gruppe.</p>
                  ) : (
                    <div style={catalogListStyle}>
                      {block.items.map((m: any) => (
                        <div key={m.id} style={catalogItemStyle}>
                          <b>{getMaterialNameFromCatalog(m) || "-"}</b>
                          <span>{displayUnit(getMaterialUnitFromCatalog(m))}</span>
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
