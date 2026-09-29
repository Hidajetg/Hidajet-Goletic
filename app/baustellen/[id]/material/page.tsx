"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { type AppLanguage, readAppLanguage } from "../../../lib/language";

const DEFAULT_GROUP_ORDER = [
  "Priprema podloge",
  "Estrich",
  "Hidroizolacija",
  "Ljepilo",
  "Schienen",
  "Fuge",
  "Silikoni",
  "Terase",
  "Dodaci",
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
];


const GROUP_TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  de: {
    "priprema podloge": "Untergrundvorbereitung",
    "primer podloge": "Grundierung",
    estrich: "Estrich",
    hidroizolacija: "Abdichtung",
    ljepilo: "Kleber",
    schienen: "Schienen",
    fuge: "Fugen",
    silikoni: "Silikone",
    terase: "Terrassen",
    dodaci: "Zubehör",
  },
  ba: {
    "priprema podloge": "Priprema podloge",
    "primer podloge": "Primer podloge",
    estrich: "Estrih",
    hidroizolacija: "Hidroizolacija",
    ljepilo: "Ljepilo",
    schienen: "Lajsne / profili",
    fuge: "Fuge",
    silikoni: "Silikoni",
    terase: "Terase",
    dodaci: "Dodaci",
  },
  uz: {
    "priprema podloge": "Sirtni tayyorlash",
    "primer podloge": "Gruntovka",
    estrich: "Styajka",
    hidroizolacija: "Gidroizolyatsiya",
    ljepilo: "Yelim",
    schienen: "Profillar",
    fuge: "Fuga",
    silikoni: "Silikonlar",
    terase: "Terasalar",
    dodaci: "Qo‘shimchalar",
  },
  cz: {
    "priprema podloge": "Příprava podkladu",
    "primer podloge": "Penetrace",
    estrich: "Potěr",
    hidroizolacija: "Hydroizolace",
    ljepilo: "Lepidlo",
    schienen: "Lišty / profily",
    fuge: "Spárování",
    silikoni: "Silikony",
    terase: "Terasy",
    dodaci: "Doplňky",
  },
  en: {
    "priprema podloge": "Surface preparation",
    "primer podloge": "Primer",
    estrich: "Screed",
    hidroizolacija: "Waterproofing",
    ljepilo: "Adhesive",
    schienen: "Trims / profiles",
    fuge: "Grout",
    silikoni: "Silicones",
    terase: "Terraces",
    dodaci: "Accessories",
  },
};

function translatedGroupName(name: unknown, lang: AppLanguage) {
  const original = String(name ?? "").trim();
  const key = original.toLowerCase();
  return GROUP_TRANSLATIONS[lang]?.[key] || original;
}

function materialCountLabel(count: number, lang: AppLanguage) {
  if (lang === "de") return count === 1 ? "Material" : "Materialien";
  if (lang === "ba") return "materijala";
  if (lang === "uz") return "material";
  if (lang === "cz") return count === 1 ? "materiál" : "materiálů";
  return count === 1 ? "material" : "materials";
}

const materialTranslations: Record<AppLanguage, Record<string, string>> = {
  de: { backSite: "← Zurück zur Baustelle", backRooms: "← Zurück zu den Räumen", siteTitle: "Material der Baustelle", roomTitle: "Material im Raum", freeMaterial: "+ Freies Material", materialName: "Materialname", quantity: "Menge", add: "Hinzufügen", chooseGroup: "Gruppe auswählen", groupHint: "Eine Gruppe auswählen, um nur die Materialien dieser Gruppe zu sehen.", tiles: "Fliesen", manual: "Manuelle Eingabe", backGroups: "← Zurück zu den Gruppen", tileFormat: "Format / Fliesenname", packageQuantity: "Anzahl Pakete", addTiles: "Fliesen hinzufügen", extraName: "Zusatzbezeichnung eingeben", addExtra: "Zusatz hinzufügen", search: "Material in dieser Gruppe suchen...", noMaterials: "Keine Materialien in dieser Gruppe.", addedSite: "Materialliste der Baustelle", addedRoom: "Hinzugefügte Materialien im Raum", emptyAdded: "Noch kein Material eingetragen.", delete: "Löschen", loading: "Wird geladen...", enterQuantity: "Menge eingeben.", enterTile: "Fliesenname/Format und Paketmenge eingeben.", enterFields: "Name, Einheit und Menge eingeben.", enterFree: "Materialname, Einheit und Menge eingeben.", deleteConfirm: "Möchten Sie dieses Material wirklich löschen?" },
  ba: { backSite: "← Nazad na Baustelle", backRooms: "← Nazad na prostorije", siteTitle: "Materijal gradilišta", roomTitle: "Materijal u prostoriji", freeMaterial: "+ Slobodni materijal", materialName: "Naziv materijala", quantity: "Količina", add: "Dodaj", chooseGroup: "Odaberi grupu", groupHint: "Radnik odabere jednu grupu i vidi samo materijale iz te grupe.", tiles: "Keramika", manual: "Ručni unos", backGroups: "← Nazad na grupe", tileFormat: "Format / naziv keramike", packageQuantity: "Količina paketa", addTiles: "Dodaj keramiku", extraName: "Unesi naziv dodatka", addExtra: "Dodaj dodatak", search: "Pretraga materijala u ovoj grupi...", noMaterials: "Nema materijala u ovoj grupi.", addedSite: "Lista materijala za gradilište", addedRoom: "Dodani materijali u prostoriji", emptyAdded: "Još nema unesenog materijala.", delete: "Obriši", loading: "Učitavanje...", enterQuantity: "Unesi količinu.", enterTile: "Unesi naziv/format keramike i količinu paketa.", enterFields: "Unesi naziv, jedinicu i količinu.", enterFree: "Unesi naziv materijala, jedinicu i količinu.", deleteConfirm: "Da li želiš obrisati ovaj materijal?" },
  uz: { backSite: "← Obyektga qaytish", backRooms: "← Xonalarga qaytish", siteTitle: "Obyekt materiali", roomTitle: "Xonadagi material", freeMaterial: "+ Erkin material", materialName: "Material nomi", quantity: "Miqdor", add: "Qo‘shish", chooseGroup: "Guruhni tanlang", groupHint: "Faqat shu guruh materiallarini ko‘rish uchun bitta guruhni tanlang.", tiles: "Plitka", manual: "Qo‘lda kiritish", backGroups: "← Guruhlarga qaytish", tileFormat: "Format / plitka nomi", packageQuantity: "Paket miqdori", addTiles: "Plitka qo‘shish", extraName: "Qo‘shimcha nomini kiriting", addExtra: "Qo‘shimcha qo‘shish", search: "Bu guruhda material qidirish...", noMaterials: "Bu guruhda material yo‘q.", addedSite: "Obyekt materiallari ro‘yxati", addedRoom: "Xonaga qo‘shilgan materiallar", emptyAdded: "Hali material kiritilmagan.", delete: "O‘chirish", loading: "Yuklanmoqda...", enterQuantity: "Miqdorni kiriting.", enterTile: "Plitka nomi/formatini va paket miqdorini kiriting.", enterFields: "Nom, birlik va miqdorni kiriting.", enterFree: "Material nomi, birlik va miqdorni kiriting.", deleteConfirm: "Bu materialni o‘chirmoqchimisiz?" },
  cz: { backSite: "← Zpět na stavbu", backRooms: "← Zpět na místnosti", siteTitle: "Materiál stavby", roomTitle: "Materiál v místnosti", freeMaterial: "+ Volný materiál", materialName: "Název materiálu", quantity: "Množství", add: "Přidat", chooseGroup: "Vyberte skupinu", groupHint: "Vyberte jednu skupinu a zobrazí se pouze materiály z této skupiny.", tiles: "Dlažba / obklady", manual: "Ruční zadání", backGroups: "← Zpět na skupiny", tileFormat: "Formát / název dlažby", packageQuantity: "Počet balení", addTiles: "Přidat dlažbu / obklady", extraName: "Zadejte název doplňku", addExtra: "Přidat doplněk", search: "Hledat materiál v této skupině...", noMaterials: "V této skupině nejsou žádné materiály.", addedSite: "Seznam materiálu pro stavbu", addedRoom: "Materiály přidané do místnosti", emptyAdded: "Zatím nebyl zadán žádný materiál.", delete: "Smazat", loading: "Načítání...", enterQuantity: "Zadejte množství.", enterTile: "Zadejte název/formát dlažby a počet balení.", enterFields: "Zadejte název, jednotku a množství.", enterFree: "Zadejte název materiálu, jednotku a množství.", deleteConfirm: "Opravdu chcete tento materiál smazat?" },
  en: { backSite: "← Back to site", backRooms: "← Back to rooms", siteTitle: "Site material", roomTitle: "Material in room", freeMaterial: "+ Free material", materialName: "Material name", quantity: "Quantity", add: "Add", chooseGroup: "Choose group", groupHint: "Choose one group to see only materials from that group.", tiles: "Tiles", manual: "Manual entry", backGroups: "← Back to groups", tileFormat: "Format / tile name", packageQuantity: "Package quantity", addTiles: "Add tiles", extraName: "Enter extra item name", addExtra: "Add extra item", search: "Search material in this group...", noMaterials: "No materials in this group.", addedSite: "Material list for site", addedRoom: "Materials added to room", emptyAdded: "No material entered yet.", delete: "Delete", loading: "Loading...", enterQuantity: "Enter quantity.", enterTile: "Enter tile name/format and package quantity.", enterFields: "Enter name, unit and quantity.", enterFree: "Enter material name, unit and quantity.", deleteConfirm: "Do you really want to delete this material?" },
};

function getGroupIcon(name: string) {
  const n = String(name || "").toLowerCase();

  if (n.includes("priprema")) return "🧹";
  if (n.includes("estrich")) return "⬜";
  if (n.includes("hidro")) return "💧";
  if (n.includes("ljepilo")) return "🪣";
  if (n.includes("schienen")) return "📏";
  if (n.includes("fuge")) return "▦";
  if (n.includes("silikoni")) return "〰️";
  if (n.includes("terase")) return "🏗️";
  if (n.includes("dodaci")) return "+";

  return "📦";
}

function cleanText(value: any) {
  return String(value ?? "").trim();
}

function toNumber(value: any) {
  const n = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export default function BaustelleMaterialPage() {
  const [lang, setLang] = useState<AppLanguage>("de");
  const t = materialTranslations[lang];
  const params = useParams();
  const baustelleId = String(params.id);

  const [grupe, setGrupe] = useState<any[]>([]);
  const [materijali, setMaterijali] = useState<any[]>([]);
  const [baustelleMaterijal, setBaustelleMaterijal] = useState<any[]>([]);
  const [aktivnaGrupa, setAktivnaGrupa] = useState<any | null>(null);
  const [showKeramika, setShowKeramika] = useState(false);

  const [kolicine, setKolicine] = useState<{ [key: number]: string }>({});

  const [keramikaNaziv, setKeramikaNaziv] = useState("");
  const [keramikaKolicina, setKeramikaKolicina] = useState("");

  const [dodatakNaziv, setDodatakNaziv] = useState("");
  const [dodatakJedinica, setDodatakJedinica] = useState("kom");
  const [dodatakKolicina, setDodatakKolicina] = useState("");

  const [slobodniNaziv, setSlobodniNaziv] = useState("");
  const [slobodnaJedinica, setSlobodnaJedinica] = useState("kom");
  const [slobodnaKolicina, setSlobodnaKolicina] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setLang(readAppLanguage("de"));
    loadData();
  }, []);

  function sortGroups(data: any[]) {
    return [...data].sort((a, b) => {
      const orderA = Number(a.sort_order || 9999);
      const orderB = Number(b.sort_order || 9999);

      if (orderA !== orderB) return orderA - orderB;

      const indexA = DEFAULT_GROUP_ORDER.indexOf(a.naziv);
      const indexB = DEFAULT_GROUP_ORDER.indexOf(b.naziv);

      if (indexA === -1 && indexB === -1) {
        return String(a.naziv || "").localeCompare(String(b.naziv || ""));
      }

      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });
  }

  async function loadData() {
    const grupeRes = await supabase
      .from("material_groups")
      .select("*")
      .order("sort_order", { ascending: true });

    const materijaliRes = await supabase
      .from("materials")
      .select("*")
      .order("naziv", { ascending: true });

    const baustelleMaterijalRes = await supabase
      .from("baustelle_material")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("id", { ascending: false });

    if (grupeRes.error) {
      alert("LOAD GRUPE: " + grupeRes.error.message);
      return;
    }

    if (materijaliRes.error) {
      alert("LOAD MATERIALS: " + materijaliRes.error.message);
      return;
    }

    if (baustelleMaterijalRes.error) {
      alert("LOAD BAUSTELLE MATERIAL: " + baustelleMaterijalRes.error.message);
      return;
    }

    setGrupe(sortGroups(grupeRes.data || []));
    setMaterijali(materijaliRes.data || []);
    setBaustelleMaterijal(baustelleMaterijalRes.data || []);
  }

  function getMaterial(materialId: any) {
    if (!materialId) return null;

    return (
      materijali.find((m) => Number(m.id) === Number(materialId)) || null
    );
  }

  function getMaterialUnit(material: any) {
    return (
      cleanText(material?.jedinica) ||
      cleanText(material?.unit) ||
      cleanText(material?.einheit) ||
      ""
    );
  }

  function getMaterialGroupId(material: any) {
    return Number(
      material?.group_id ??
        material?.gruppe_id ??
        material?.material_group_id ??
        0
    );
  }

  const materijaliAktivneGrupe = useMemo(() => {
    if (!aktivnaGrupa) return [];

    const term = searchTerm.trim().toLowerCase();

    return materijali
      .filter((m) => getMaterialGroupId(m) === Number(aktivnaGrupa.id))
      .filter((m) => {
        if (!term) return true;

        return String(m.naziv || "")
          .toLowerCase()
          .includes(term);
      });
  }, [aktivnaGrupa, materijali, searchTerm]);

  async function dodajKataloskiMaterijal(material: any) {
    const kolicina = kolicine[material.id];

    if (!kolicina || toNumber(kolicina) <= 0) {
      alert(t.enterQuantity);
      return;
    }

    const { data: existing, error: existingError } = await supabase
      .from("baustelle_material")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .eq("material_id", Number(material.id))
      .maybeSingle();

    if (existingError) {
      alert("CHECK EXISTING: " + existingError.message);
      return;
    }

    if (existing) {
      const { error } = await supabase
        .from("baustelle_material")
        .update({
          kolicina: toNumber(existing.kolicina) + toNumber(kolicina),
          materijal: cleanText(existing.materijal) || cleanText(material.naziv),
        })
        .eq("id", existing.id);

      if (error) {
        alert("UPDATE: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("baustelle_material").insert([
        {
          baustelle_id: Number(baustelleId),
          material_id: Number(material.id),
          materijal: cleanText(material.naziv),
          kolicina: toNumber(kolicina),
          custom_naziv: null,
          custom_jedinica: null,
        },
      ]);

      if (error) {
        alert("INSERT: " + error.message);
        return;
      }
    }

    setKolicine((prev) => ({
      ...prev,
      [material.id]: "",
    }));

    await loadData();
  }

  async function dodajKeramiku() {
    if (
      !keramikaNaziv.trim() ||
      !keramikaKolicina ||
      toNumber(keramikaKolicina) <= 0
    ) {
      alert(t.enterTile);
      return;
    }

    const naziv = `Keramika - ${keramikaNaziv.trim()}`;

    const { error } = await supabase.from("baustelle_material").insert([
      {
        baustelle_id: Number(baustelleId),
        material_id: null,
        materijal: naziv,
        kolicina: toNumber(keramikaKolicina),
        custom_naziv: naziv,
        custom_jedinica: "paket",
      },
    ]);

    if (error) {
      alert("INSERT KERAMIKA: " + error.message);
      return;
    }

    setKeramikaNaziv("");
    setKeramikaKolicina("");

    await loadData();
  }

  async function dodajDodatak() {
    if (
      !dodatakNaziv.trim() ||
      !dodatakJedinica ||
      !dodatakKolicina ||
      toNumber(dodatakKolicina) <= 0
    ) {
      alert(t.enterFields);
      return;
    }

    const { error } = await supabase.from("baustelle_material").insert([
      {
        baustelle_id: Number(baustelleId),
        material_id: null,
        materijal: dodatakNaziv.trim(),
        kolicina: toNumber(dodatakKolicina),
        custom_naziv: dodatakNaziv.trim(),
        custom_jedinica: dodatakJedinica,
      },
    ]);

    if (error) {
      alert("INSERT DODATAK: " + error.message);
      return;
    }

    setDodatakNaziv("");
    setDodatakJedinica("kom");
    setDodatakKolicina("");

    await loadData();
  }

  async function dodajSlobodniMaterijal() {
    if (
      !slobodniNaziv.trim() ||
      !slobodnaJedinica ||
      !slobodnaKolicina ||
      toNumber(slobodnaKolicina) <= 0
    ) {
      alert(t.enterFree);
      return;
    }

    const { error } = await supabase.from("baustelle_material").insert([
      {
        baustelle_id: Number(baustelleId),
        material_id: null,
        materijal: slobodniNaziv.trim(),
        kolicina: toNumber(slobodnaKolicina),
        custom_naziv: slobodniNaziv.trim(),
        custom_jedinica: slobodnaJedinica,
      },
    ]);

    if (error) {
      alert("INSERT SLOBODNI MATERIJAL: " + error.message);
      return;
    }

    setSlobodniNaziv("");
    setSlobodnaJedinica("kom");
    setSlobodnaKolicina("");

    await loadData();
  }

  async function promijeniKolicinu(id: number, trenutna: number, promjena: number) {
    const novaKolicina = toNumber(trenutna) + promjena;

    if (novaKolicina <= 0) {
      await obrisiMaterijal(id);
      return;
    }

    const { error } = await supabase
      .from("baustelle_material")
      .update({ kolicina: novaKolicina })
      .eq("id", id);

    if (error) {
      alert("UPDATE: " + error.message);
      return;
    }

    await loadData();
  }

  async function obrisiMaterijal(id: number) {
    const potvrda = confirm(t.deleteConfirm);

    if (!potvrda) return;

    const { error } = await supabase
      .from("baustelle_material")
      .delete()
      .eq("id", id);

    if (error) {
      alert("DELETE: " + error.message);
      return;
    }

    await loadData();
  }

  function nazivUnosa(unos: any) {
    const customNaziv = cleanText(unos?.custom_naziv);

    if (customNaziv) {
      return customNaziv;
    }

    const spremljeniNaziv = cleanText(unos?.materijal);

    if (spremljeniNaziv) {
      return spremljeniNaziv;
    }

    const material = getMaterial(unos?.material_id);

    const katalogNaziv =
      cleanText(material?.naziv) ||
      cleanText(material?.name) ||
      cleanText(material?.title);

    if (katalogNaziv) {
      return katalogNaziv;
    }

    if (unos?.material_id) {
      return `Materijal ID ${unos.material_id}`;
    }

    return "Materijal";
  }

  function jedinicaUnosa(unos: any) {
    const customJedinica = cleanText(unos?.custom_jedinica);

    if (customJedinica) {
      return customJedinica;
    }

    const material = getMaterial(unos?.material_id);

    return getMaterialUnit(material);
  }

  function openGroup(group: any) {
    setShowKeramika(false);
    setAktivnaGrupa(group);
    setSearchTerm("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openKeramika() {
    setAktivnaGrupa(null);
    setShowKeramika(true);
    setSearchTerm("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeActiveView() {
    setAktivnaGrupa(null);
    setShowKeramika(false);
    setSearchTerm("");
  }

  return (
    <main style={styles.page}>
      <Link href={`/baustellen/${baustelleId}`} style={styles.backLink}>
        {t.backSite}
      </Link>

      <h1 style={styles.title}>{t.siteTitle}</h1>

      <section style={styles.freeBox}>
        <h2 style={styles.subtitle}>{t.freeMaterial}</h2>

        <div style={styles.freeGrid}>
          <input
            value={slobodniNaziv}
            onChange={(e) => setSlobodniNaziv(e.target.value)}
            placeholder={t.materialName}
            style={styles.input}
          />

          <select
            value={slobodnaJedinica}
            onChange={(e) => setSlobodnaJedinica(e.target.value)}
            style={styles.input}
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>

          <input
            value={slobodnaKolicina}
            onChange={(e) => setSlobodnaKolicina(e.target.value)}
            placeholder={t.quantity}
            type="number"
            inputMode="decimal"
            style={styles.input}
          />

          <button onClick={dodajSlobodniMaterijal} style={styles.saveButton}>
            {t.add}
          </button>
        </div>
      </section>

      {!aktivnaGrupa && !showKeramika && (
        <section style={styles.box}>
          <h2 style={styles.subtitle}>{t.chooseGroup}</h2>

          <div style={styles.mobileHint}>
            {t.groupHint}
          </div>

          <div style={styles.groupGrid}>
            <button onClick={openKeramika} style={styles.groupCardSpecial}>
              <div style={styles.groupIcon}>▧</div>
              <div style={styles.groupName}>{t.tiles}</div>
              <div style={styles.groupCount}>{t.manual}</div>
            </button>

            {grupe.map((g) => {
              const broj = materijali.filter(
                (m) => getMaterialGroupId(m) === Number(g.id)
              ).length;

              return (
                <button
                  key={g.id}
                  onClick={() => openGroup(g)}
                  style={styles.groupCard}
                >
                  <div style={styles.groupIcon}>{getGroupIcon(g.naziv)}</div>
                  <div style={styles.groupName}>{translatedGroupName(g.naziv, lang)}</div>
                  <div style={styles.groupCount}>{broj} {materialCountLabel(broj, lang)}</div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {showKeramika && (
        <section style={styles.box}>
          <button onClick={closeActiveView} style={styles.backButton}>
            {t.backGroups}
          </button>

          <h2 style={styles.groupTitle}>{t.tiles}</h2>

          <div style={styles.manualBox}>
            <input
              value={keramikaNaziv}
              onChange={(e) => setKeramikaNaziv(e.target.value)}
              placeholder={t.tileFormat}
              style={styles.input}
            />

            <input
              value={keramikaKolicina}
              onChange={(e) => setKeramikaKolicina(e.target.value)}
              placeholder={t.packageQuantity}
              type="number"
              inputMode="decimal"
              style={styles.input}
            />

            <button onClick={dodajKeramiku} style={styles.saveButton}>
              {t.addTiles}
            </button>
          </div>
        </section>
      )}

      {aktivnaGrupa && (
        <section style={styles.box}>
          <button onClick={closeActiveView} style={styles.backButton}>
            {t.backGroups}
          </button>

          <h2 style={styles.groupTitle}>
            {getGroupIcon(aktivnaGrupa.naziv)} {translatedGroupName(aktivnaGrupa.naziv, lang)}
          </h2>

          {aktivnaGrupa.naziv === "Dodaci" && (
            <div style={styles.manualBox}>
              <input
                value={dodatakNaziv}
                onChange={(e) => setDodatakNaziv(e.target.value)}
                placeholder={t.extraName}
                style={styles.input}
              />

              <select
                value={dodatakJedinica}
                onChange={(e) => setDodatakJedinica(e.target.value)}
                style={styles.input}
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>

              <input
                value={dodatakKolicina}
                onChange={(e) => setDodatakKolicina(e.target.value)}
                placeholder={t.quantity}
                type="number"
                inputMode="decimal"
                style={styles.input}
              />

              <button onClick={dodajDodatak} style={styles.saveButton}>
                {t.addExtra}
              </button>
            </div>
          )}

          {aktivnaGrupa.naziv !== "Dodaci" && (
            <>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t.search}
                style={styles.searchInput}
              />

              {materijaliAktivneGrupe.length === 0 ? (
                <div style={styles.emptyText}>{t.noMaterials}</div>
              ) : (
                <div style={styles.materialList}>
                  {materijaliAktivneGrupe.map((m) => (
                    <div key={m.id} style={styles.materialRow}>
                      <div style={styles.materialTextBox}>
                        <strong>{m.naziv}</strong>
                        <div style={styles.smallText}>{getMaterialUnit(m)}</div>
                      </div>

                      <div style={styles.addArea}>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="0"
                          value={kolicine[m.id] || ""}
                          onChange={(e) =>
                            setKolicine((prev) => ({
                              ...prev,
                              [m.id]: e.target.value,
                            }))
                          }
                          style={styles.quantityInput}
                        />

                        <button
                          onClick={() => dodajKataloskiMaterijal(m)}
                          style={styles.addButton}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      )}

      <section style={styles.box}>
        <h2 style={styles.subtitle}>
          {t.addedSite} ({baustelleMaterijal.length})
        </h2>

        {baustelleMaterijal.length === 0 && (
          <p style={styles.emptyText}>{t.emptyAdded}</p>
        )}

        {baustelleMaterijal.map((m) => (
          <div key={m.id} style={styles.savedCard}>
            <div style={styles.savedTextBox}>
              <strong>{nazivUnosa(m)}</strong>

              <div style={styles.savedQuantity}>
                {m.kolicina} {jedinicaUnosa(m)}
              </div>
            </div>

            <div style={styles.buttonRow}>
              <button
                onClick={() => promijeniKolicinu(m.id, m.kolicina, 1)}
                style={styles.plusButton}
              >
                +
              </button>

              <button
                onClick={() => promijeniKolicinu(m.id, m.kolicina, -1)}
                style={styles.minusButton}
              >
                -
              </button>

              <button
                onClick={() => obrisiMaterijal(m.id)}
                style={styles.deleteButton}
              >
                {t.delete}
              </button>
            </div>
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
    padding: "16px",
    paddingBottom: "40px",
  },

  backLink: {
    color: "#3b82f6",
    textDecoration: "none",
    fontWeight: "bold",
    fontSize: "14px",
  },

  title: {
    fontSize: "34px",
    fontWeight: "bold",
    marginTop: "18px",
    marginBottom: "18px",
    lineHeight: "1.1",
  },

  box: {
    background: "#111",
    padding: "14px",
    borderRadius: "16px",
    marginBottom: "18px",
  },

  freeBox: {
    background: "#111",
    border: "1px solid #16a34a",
    padding: "14px",
    borderRadius: "16px",
    marginBottom: "18px",
  },

  subtitle: {
    color: "#60a5fa",
    fontSize: "17px",
    marginTop: 0,
    marginBottom: "12px",
  },

  mobileHint: {
    color: "#aaa",
    fontSize: "13px",
    marginBottom: "12px",
  },

  freeGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
  },

  groupGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(105px, 1fr))",
    gap: "9px",
  },

  groupCard: {
    background: "#1f1f1f",
    color: "white",
    border: "1px solid #333",
    borderRadius: "14px",
    padding: "10px 8px",
    textAlign: "center",
    cursor: "pointer",
    minHeight: "92px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "5px",
  },

  groupCardSpecial: {
    background: "#172554",
    color: "white",
    border: "1px solid #2563eb",
    borderRadius: "14px",
    padding: "10px 8px",
    textAlign: "center",
    cursor: "pointer",
    minHeight: "92px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "5px",
  },

  groupIcon: {
    fontSize: "20px",
    lineHeight: "1",
  },

  groupName: {
    fontSize: "13px",
    fontWeight: "bold",
    lineHeight: "1.15",
  },

  groupCount: {
    color: "#aaa",
    fontSize: "11px",
  },

  backButton: {
    background: "#222",
    color: "#60a5fa",
    border: "1px solid #333",
    padding: "10px 14px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
    marginBottom: "14px",
    width: "100%",
  },

  groupTitle: {
    color: "#60a5fa",
    marginBottom: "14px",
    marginTop: 0,
    fontSize: "25px",
    lineHeight: "1.2",
  },

  manualBox: {
    background: "#1a1a1a",
    padding: "12px",
    borderRadius: "14px",
    display: "grid",
    gap: "10px",
  },

  input: {
    width: "100%",
    background: "#000",
    color: "white",
    border: "1px solid #333",
    borderRadius: "10px",
    padding: "13px",
    fontSize: "16px",
    boxSizing: "border-box",
  },

  searchInput: {
    width: "100%",
    background: "#000",
    color: "white",
    border: "1px solid #333",
    borderRadius: "10px",
    padding: "13px",
    fontSize: "16px",
    marginBottom: "12px",
    boxSizing: "border-box",
  },

  saveButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "13px 16px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "15px",
  },

  materialList: {
    display: "grid",
    gap: "9px",
  },

  materialRow: {
    background: "#1f1f1f",
    borderRadius: "12px",
    padding: "10px",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "8px",
    alignItems: "center",
  },

  materialTextBox: {
    minWidth: 0,
    overflowWrap: "anywhere",
    fontSize: "14px",
  },

  smallText: {
    color: "#aaa",
    marginTop: "4px",
    fontSize: "12px",
  },

  addArea: {
    display: "flex",
    gap: "6px",
    alignItems: "center",
  },

  quantityInput: {
    width: "72px",
    background: "#000",
    color: "white",
    border: "1px solid #333",
    borderRadius: "8px",
    padding: "11px 8px",
    fontSize: "16px",
    textAlign: "center",
    boxSizing: "border-box",
  },

  addButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "11px 13px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "18px",
    minWidth: "44px",
  },

  emptyText: {
    color: "#aaa",
    background: "#1a1a1a",
    padding: "12px",
    borderRadius: "10px",
  },

  savedCard: {
    background: "#1f1f1f",
    borderRadius: "14px",
    padding: "12px",
    marginBottom: "10px",
    display: "grid",
    gap: "10px",
  },

  savedTextBox: {
    overflowWrap: "anywhere",
  },

  savedQuantity: {
    color: "#60a5fa",
    marginTop: "6px",
    fontWeight: "bold",
  },

  buttonRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1.3fr",
    gap: "8px",
  },

  plusButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "9px",
    padding: "11px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "18px",
  },

  minusButton: {
    background: "#f97316",
    color: "white",
    border: "none",
    borderRadius: "9px",
    padding: "11px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "18px",
  },

  deleteButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "9px",
    padding: "11px",
    cursor: "pointer",
    fontWeight: "bold",
  },
};