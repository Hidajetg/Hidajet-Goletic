"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Language = "de" | "ba" | "uz" | "en";

type MaterialRow = {
  id: number;
  naziv?: string;
  name?: string;
  material?: string;
  bezeichnung?: string;
  jedinica?: string;
  unit?: string;
  einheit?: string;
  grupa?: string;
  group_name?: string;
};

type BaustelleRow = {
  id: number;
  naziv?: string;
  name?: string;
  lokacija?: string;
  location?: string;
  status?: string;
  stanje?: string;
  aktivna?: boolean;
  active?: boolean;
  archived?: boolean;
  archiviran?: boolean;
  is_archived?: boolean;
};

type CartItem = {
  temporaryId: string;
  materialId: number;
  materialName: string;
  quantity: number;
  unit: string;
  destinationType: "lager" | "baustelle";
  baustelleId: number | null;
  baustelleName: string | null;
  note: string;
  addedAt: string;
};

type MaterialOrder = {
  id: number;
  material_id?: number | null;
  material_name: string;
  quantity: number;
  unit: string;
  destination_type: "lager" | "baustelle";
  baustelle_id?: number | null;
  baustelle_name?: string | null;
  requested_by: string;
  requested_at: string;
  status: string;
  note?: string | null;
};

const LANGUAGE_STORAGE_KEY = "materialOrdersLanguage";

const LANGUAGE_OPTIONS: Array<{ code: Language; label: string }> = [
  { code: "de", label: "DE" },
  { code: "ba", label: "BA" },
  { code: "uz", label: "UZ" },
  { code: "en", label: "EN" },
];

const LOCALES: Record<Language, string> = {
  de: "de-AT",
  ba: "bs-BA",
  uz: "uz-UZ",
  en: "en-GB",
};

const translations = {
  de: {
    loading: "Materialbestellungen werden geladen...",
    pageTitle: "Material bestellen",
    loggedInAs: "Angemeldet als",
    dashboard: "Dashboard",
    addMissingMaterial: "Fehlendes Material hinzufügen",
    searchMaterial: "Material suchen",
    materialSearchPlaceholder: "Materialname eingeben...",
    selectMaterial: "Material auswählen",
    materialSelectPlaceholder: "Material auswählen...",
    quantity: "Menge",
    unit: "Einheit",
    unitPlaceholder: "Stk., kg, Sack...",
    selectDestination: "Lieferort auswählen",
    warehouse: "Lager",
    activeSite: "Aktive Baustelle",
    selectSite: "Baustelle auswählen",
    activeSitePlaceholder: "Aktive Baustelle auswählen...",
    noActiveSite: "Keine aktive Baustelle gefunden.",
    note: "Bemerkung",
    notePlaceholder: "Zusätzliche Information...",
    addToOrder: "+ Material zur Bestellung hinzufügen",
    orderList: "Bestellliste",
    noMaterialAdded: "Noch kein Material hinzugefügt.",
    remove: "Entfernen",
    target: "Ziel",
    employee: "Mitarbeiter",
    addedAt: "Hinzugefügt",
    savingOrder: "Bestellung wird gespeichert...",
    orderMaterial: "MATERIAL BESTELLEN",
    orderMaterialCount: "🔴 MATERIAL BESTELLEN ({count})",
    redButtonInfo:
      "Der Bestellknopf ist rot, weil Material in der Bestellliste liegt.",
    openOrders: "Offene Materialbestellungen",
    openOrdersDescription:
      "Hier sehen Sie, wer das Material bestellt hat und wann.",
    openCount: "{count} offen",
    noOpenOrders: "Keine offenen Materialbestellungen vorhanden.",
    orderedBy: "Bestellt von",
    dateTime: "Datum / Uhrzeit",
    status: "Status",
    myOrders: "Meine Bestellungen",
    noMyOrders: "Sie haben noch kein Material bestellt.",
    orderedAt: "Bestellt am",
    site: "Baustelle",
    unknownWorker: "Unbekannter Mitarbeiter",
    materialFallback: "Material",
    siteFallback: "Baustelle",
    loadMaterialsError: "Materialien konnten nicht geladen werden",
    loadSitesError: "Baustellen konnten nicht geladen werden",
    loadOrdersError: "Bestellungen konnten nicht geladen werden",
    selectMaterialError: "Bitte wählen Sie ein Material aus.",
    validQuantityError: "Bitte geben Sie eine gültige Menge ein.",
    selectActiveSiteError: "Bitte wählen Sie eine aktive Baustelle aus.",
    orderSuccess:
      "{count} Materialposition(en) wurden erfolgreich bestellt.",
    saveOrderError: "Die Materialbestellung konnte nicht gespeichert werden",
    statusOpen: "Offen",
    statusOrdered: "Bestellt",
    statusDelivered: "Geliefert",
    statusCancelled: "Storniert",
  },
  ba: {
    loading: "Narudžbe materijala se učitavaju...",
    pageTitle: "Naruči materijal",
    loggedInAs: "Prijavljen kao",
    dashboard: "Početna",
    addMissingMaterial: "Dodaj materijal koji nedostaje",
    searchMaterial: "Pretraži materijal",
    materialSearchPlaceholder: "Upiši naziv materijala...",
    selectMaterial: "Odaberi materijal",
    materialSelectPlaceholder: "Odaberi materijal...",
    quantity: "Količina",
    unit: "Jedinica",
    unitPlaceholder: "Kom., kg, vreća...",
    selectDestination: "Odaberi mjesto isporuke",
    warehouse: "Lager",
    activeSite: "Aktivna Baustelle",
    selectSite: "Odaberi Baustelle",
    activeSitePlaceholder: "Odaberi aktivnu Baustelle...",
    noActiveSite: "Nije pronađena aktivna Baustelle.",
    note: "Napomena",
    notePlaceholder: "Dodatna informacija...",
    addToOrder: "+ Dodaj materijal u narudžbu",
    orderList: "Lista narudžbe",
    noMaterialAdded: "Još nije dodat nijedan materijal.",
    remove: "Ukloni",
    target: "Odredište",
    employee: "Radnik",
    addedAt: "Dodano",
    savingOrder: "Narudžba se sprema...",
    orderMaterial: "NARUČI MATERIJAL",
    orderMaterialCount: "🔴 NARUČI MATERIJAL ({count})",
    redButtonInfo:
      "Dugme je crveno jer se materijal nalazi u listi narudžbe.",
    openOrders: "Otvorene narudžbe materijala",
    openOrdersDescription:
      "Ovdje se vidi ko je naručio materijal i kada.",
    openCount: "{count} otvoreno",
    noOpenOrders: "Nema otvorenih narudžbi materijala.",
    orderedBy: "Naručio",
    dateTime: "Datum / vrijeme",
    status: "Status",
    myOrders: "Moje narudžbe",
    noMyOrders: "Još niste naručili materijal.",
    orderedAt: "Naručeno",
    site: "Baustelle",
    unknownWorker: "Nepoznat radnik",
    materialFallback: "Materijal",
    siteFallback: "Baustelle",
    loadMaterialsError: "Materijali se nisu mogli učitati",
    loadSitesError: "Baustelle se nisu mogle učitati",
    loadOrdersError: "Narudžbe se nisu mogle učitati",
    selectMaterialError: "Odaberite materijal.",
    validQuantityError: "Unesite ispravnu količinu.",
    selectActiveSiteError: "Odaberite aktivnu Baustelle.",
    orderSuccess: "{count} stavka/e materijala je uspješno naručeno.",
    saveOrderError: "Narudžba materijala se nije mogla spremiti",
    statusOpen: "Otvoreno",
    statusOrdered: "Naručeno",
    statusDelivered: "Isporučeno",
    statusCancelled: "Otkazano",
  },
  uz: {
    loading: "Material buyurtmalari yuklanmoqda...",
    pageTitle: "Material buyurtma qilish",
    loggedInAs: "Tizimga kirgan",
    dashboard: "Bosh sahifa",
    addMissingMaterial: "Yetishmayotgan materialni qo‘shish",
    searchMaterial: "Material qidirish",
    materialSearchPlaceholder: "Material nomini kiriting...",
    selectMaterial: "Materialni tanlash",
    materialSelectPlaceholder: "Materialni tanlang...",
    quantity: "Miqdor",
    unit: "Birlik",
    unitPlaceholder: "Dona, kg, qop...",
    selectDestination: "Yetkazib berish joyini tanlang",
    warehouse: "Ombor",
    activeSite: "Faol qurilish obyekti",
    selectSite: "Qurilish obyektini tanlang",
    activeSitePlaceholder: "Faol qurilish obyektini tanlang...",
    noActiveSite: "Faol qurilish obyekti topilmadi.",
    note: "Izoh",
    notePlaceholder: "Qo‘shimcha ma’lumot...",
    addToOrder: "+ Materialni buyurtmaga qo‘shish",
    orderList: "Buyurtma ro‘yxati",
    noMaterialAdded: "Hali material qo‘shilmagan.",
    remove: "Olib tashlash",
    target: "Manzil",
    employee: "Xodim",
    addedAt: "Qo‘shilgan",
    savingOrder: "Buyurtma saqlanmoqda...",
    orderMaterial: "MATERIAL BUYURTMA QILISH",
    orderMaterialCount: "🔴 MATERIAL BUYURTMA QILISH ({count})",
    redButtonInfo:
      "Buyurtma ro‘yxatida material borligi uchun tugma qizil.",
    openOrders: "Ochiq material buyurtmalari",
    openOrdersDescription:
      "Bu yerda materialni kim va qachon buyurtma qilgani ko‘rinadi.",
    openCount: "{count} ochiq",
    noOpenOrders: "Ochiq material buyurtmalari yo‘q.",
    orderedBy: "Buyurtma bergan",
    dateTime: "Sana / vaqt",
    status: "Holat",
    myOrders: "Mening buyurtmalarim",
    noMyOrders: "Siz hali material buyurtma qilmagansiz.",
    orderedAt: "Buyurtma sanasi",
    site: "Qurilish obyekti",
    unknownWorker: "Noma’lum xodim",
    materialFallback: "Material",
    siteFallback: "Qurilish obyekti",
    loadMaterialsError: "Materiallarni yuklab bo‘lmadi",
    loadSitesError: "Qurilish obyektlarini yuklab bo‘lmadi",
    loadOrdersError: "Buyurtmalarni yuklab bo‘lmadi",
    selectMaterialError: "Materialni tanlang.",
    validQuantityError: "To‘g‘ri miqdorni kiriting.",
    selectActiveSiteError: "Faol qurilish obyektini tanlang.",
    orderSuccess: "{count} ta material pozitsiyasi muvaffaqiyatli buyurtma qilindi.",
    saveOrderError: "Material buyurtmasini saqlab bo‘lmadi",
    statusOpen: "Ochiq",
    statusOrdered: "Buyurtma qilindi",
    statusDelivered: "Yetkazildi",
    statusCancelled: "Bekor qilindi",
  },
  en: {
    loading: "Loading material orders...",
    pageTitle: "Order material",
    loggedInAs: "Logged in as",
    dashboard: "Dashboard",
    addMissingMaterial: "Add missing material",
    searchMaterial: "Search material",
    materialSearchPlaceholder: "Enter material name...",
    selectMaterial: "Select material",
    materialSelectPlaceholder: "Select material...",
    quantity: "Quantity",
    unit: "Unit",
    unitPlaceholder: "pcs., kg, bag...",
    selectDestination: "Select delivery destination",
    warehouse: "Warehouse",
    activeSite: "Active construction site",
    selectSite: "Select construction site",
    activeSitePlaceholder: "Select an active construction site...",
    noActiveSite: "No active construction site found.",
    note: "Note",
    notePlaceholder: "Additional information...",
    addToOrder: "+ Add material to order",
    orderList: "Order list",
    noMaterialAdded: "No material has been added yet.",
    remove: "Remove",
    target: "Destination",
    employee: "Employee",
    addedAt: "Added",
    savingOrder: "Saving order...",
    orderMaterial: "ORDER MATERIAL",
    orderMaterialCount: "🔴 ORDER MATERIAL ({count})",
    redButtonInfo:
      "The order button is red because material is in the order list.",
    openOrders: "Open material orders",
    openOrdersDescription:
      "Here you can see who ordered the material and when.",
    openCount: "{count} open",
    noOpenOrders: "There are no open material orders.",
    orderedBy: "Ordered by",
    dateTime: "Date / time",
    status: "Status",
    myOrders: "My orders",
    noMyOrders: "You have not ordered any material yet.",
    orderedAt: "Ordered at",
    site: "Construction site",
    unknownWorker: "Unknown employee",
    materialFallback: "Material",
    siteFallback: "Construction site",
    loadMaterialsError: "Materials could not be loaded",
    loadSitesError: "Construction sites could not be loaded",
    loadOrdersError: "Orders could not be loaded",
    selectMaterialError: "Please select a material.",
    validQuantityError: "Please enter a valid quantity.",
    selectActiveSiteError: "Please select an active construction site.",
    orderSuccess: "{count} material item(s) were ordered successfully.",
    saveOrderError: "The material order could not be saved",
    statusOpen: "Open",
    statusOrdered: "Ordered",
    statusDelivered: "Delivered",
    statusCancelled: "Cancelled",
  },
} as const;

type TranslationKey = keyof typeof translations.de;

const LOCAL_STORAGE_USER_KEYS = [
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

function getSavedLanguage(): Language {
  if (typeof window === "undefined") return "de";

  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (
    savedLanguage === "de" ||
    savedLanguage === "ba" ||
    savedLanguage === "uz" ||
    savedLanguage === "en"
  ) {
    return savedLanguage;
  }

  return "de";
}

function translate(
  language: Language,
  key: TranslationKey,
  values?: Record<string, string | number>,
) {
  let value: string = translations[language][key] || translations.de[key];

  if (values) {
    for (const [name, replacement] of Object.entries(values)) {
      value = value.replaceAll(`{${name}}`, String(replacement));
    }
  }

  return value;
}

function getLoggedUser() {
  if (typeof window === "undefined") return null;

  for (const key of LOCAL_STORAGE_USER_KEYS) {
    const value = localStorage.getItem(key);

    if (!value) continue;

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return null;
}

function getLoggedUserName(user: any, fallback: string) {
  if (!user) return fallback;

  if (typeof user === "string") {
    return user.trim() || fallback;
  }

  return String(
    user.name ||
      user.worker_name ||
      user.radnik ||
      user.username ||
      user.userName ||
      user.displayName ||
      fallback,
  ).trim();
}

function getMaterialName(
  material: MaterialRow,
  fallbackLabel = "Material",
) {
  return (
    material.naziv ||
    material.name ||
    material.material ||
    material.bezeichnung ||
    `${fallbackLabel} ${material.id}`
  );
}

function getMaterialUnit(material: MaterialRow) {
  return material.jedinica || material.unit || material.einheit || "Stk.";
}

function getBaustelleName(
  baustelle: BaustelleRow,
  fallbackLabel = "Baustelle",
) {
  return baustelle.naziv || baustelle.name || `${fallbackLabel} ${baustelle.id}`;
}

function getBaustelleLocation(baustelle: BaustelleRow) {
  return baustelle.lokacija || baustelle.location || "";
}

function isActiveBaustelle(baustelle: BaustelleRow) {
  if (
    baustelle.archived === true ||
    baustelle.archiviran === true ||
    baustelle.is_archived === true
  ) {
    return false;
  }

  if (baustelle.aktivna === false || baustelle.active === false) {
    return false;
  }

  const status = String(baustelle.status || baustelle.stanje || "")
    .trim()
    .toLowerCase();

  if (!status) return true;

  const archivedStatuses = [
    "archiv",
    "archiviert",
    "arhiva",
    "arhivirana",
    "closed",
    "geschlossen",
    "fertig",
    "beendet",
    "završena",
    "zavrsena",
  ];

  return !archivedStatuses.includes(status);
}

function formatDateTime(value: string, language: Language) {
  if (!value) return "-";

  return new Date(value).toLocaleString(LOCALES[language], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(value: number, language: Language) {
  return Number(value || 0).toLocaleString(LOCALES[language], {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getStatusLabel(
  status: string,
  language: Language,
) {
  switch (String(status || "").toLowerCase()) {
    case "ordered":
      return translate(language, "statusOrdered");
    case "delivered":
      return translate(language, "statusDelivered");
    case "cancelled":
      return translate(language, "statusCancelled");
    default:
      return translate(language, "statusOpen");
  }
}

export default function MaterialOrdersPage() {
  const [language, setLanguage] = useState<Language>("de");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [loggedUserName, setLoggedUserName] = useState("");

  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [baustellen, setBaustellen] = useState<BaustelleRow[]>([]);
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [materialSearch, setMaterialSearch] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("Stk.");

  const [destinationType, setDestinationType] = useState<
    "lager" | "baustelle"
  >("baustelle");

  const [selectedBaustelleId, setSelectedBaustelleId] = useState("");
  const [note, setNote] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const t = (
    key: TranslationKey,
    values?: Record<string, string | number>,
  ) => translate(language, key, values);

  useEffect(() => {
    const savedLanguage = getSavedLanguage();
    const loggedUser = getLoggedUser();

    setLanguage(savedLanguage);
    setLoggedUserName(
      getLoggedUserName(
        loggedUser,
        translate(savedLanguage, "unknownWorker"),
      ),
    );

    loadPageData(savedLanguage);
  }, []);

  function changeLanguage(newLanguage: Language) {
    setLanguage(newLanguage);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);

    if (
      !loggedUserName ||
      Object.values(translations).some(
        (translation) => translation.unknownWorker === loggedUserName,
      )
    ) {
      setLoggedUserName(translate(newLanguage, "unknownWorker"));
    }

    setErrorMessage("");
    setSuccessMessage("");
  }

  async function loadPageData(activeLanguage: Language = language) {
    setLoading(true);
    setErrorMessage("");

    try {
      const [materialsResult, baustellenResult, ordersResult] =
        await Promise.all([
          supabase.from("materials").select("*"),
          supabase.from("baustellen").select("*"),
          supabase
            .from("material_orders")
            .select("*")
            .order("requested_at", { ascending: false })
            .limit(200),
        ]);

      if (materialsResult.error) {
        throw new Error(
          `${translate(activeLanguage, "loadMaterialsError")}: ${
            materialsResult.error.message
          }`,
        );
      }

      if (baustellenResult.error) {
        throw new Error(
          `${translate(activeLanguage, "loadSitesError")}: ${
            baustellenResult.error.message
          }`,
        );
      }

      if (ordersResult.error) {
        throw new Error(
          `${translate(activeLanguage, "loadOrdersError")}: ${
            ordersResult.error.message
          }`,
        );
      }

      const materialFallback = translate(
        activeLanguage,
        "materialFallback",
      );
      const siteFallback = translate(activeLanguage, "siteFallback");

      const sortedMaterials = [...(materialsResult.data || [])].sort(
        (a: MaterialRow, b: MaterialRow) =>
          getMaterialName(a, materialFallback).localeCompare(
            getMaterialName(b, materialFallback),
            LOCALES[activeLanguage],
          ),
      );

      const activeBaustellen = [...(baustellenResult.data || [])]
        .filter((baustelle: BaustelleRow) => isActiveBaustelle(baustelle))
        .sort((a: BaustelleRow, b: BaustelleRow) =>
          getBaustelleName(a, siteFallback).localeCompare(
            getBaustelleName(b, siteFallback),
            LOCALES[activeLanguage],
          ),
        );

      setMaterials(sortedMaterials);
      setBaustellen(activeBaustellen);
      setOrders((ordersResult.data || []) as MaterialOrder[]);

      if (activeBaustellen.length > 0) {
        setSelectedBaustelleId((current) =>
          current || String(activeBaustellen[0].id),
        );
      }
    } catch (error: any) {
      setErrorMessage(error?.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  const filteredMaterials = useMemo(() => {
    const search = materialSearch.trim().toLowerCase();

    if (!search) return materials;

    return materials.filter((material) => {
      const materialName = getMaterialName(
        material,
        t("materialFallback"),
      ).toLowerCase();

      const groupName = String(
        material.grupa || material.group_name || "",
      ).toLowerCase();

      return materialName.includes(search) || groupName.includes(search);
    });
  }, [materials, materialSearch, language]);

  const openOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = String(order.status || "open").toLowerCase();
      return status === "open" || status === "ordered";
    });
  }, [orders]);

  const currentWorkerOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        String(order.requested_by || "").trim().toLowerCase() ===
        loggedUserName.trim().toLowerCase(),
    );
  }, [orders, loggedUserName]);

  function handleMaterialChange(materialId: string) {
    setSelectedMaterialId(materialId);

    const selectedMaterial = materials.find(
      (material) => Number(material.id) === Number(materialId),
    );

    if (selectedMaterial) {
      setUnit(getMaterialUnit(selectedMaterial));
    }
  }

  function addMaterialToCart() {
    setErrorMessage("");
    setSuccessMessage("");

    const selectedMaterial = materials.find(
      (material) => Number(material.id) === Number(selectedMaterialId),
    );

    if (!selectedMaterial) {
      setErrorMessage(t("selectMaterialError"));
      return;
    }

    const numericQuantity = Number(String(quantity).replace(",", "."));

    if (!numericQuantity || numericQuantity <= 0) {
      setErrorMessage(t("validQuantityError"));
      return;
    }

    let baustelleId: number | null = null;
    let baustelleName: string | null = null;

    if (destinationType === "baustelle") {
      const selectedBaustelle = baustellen.find(
        (baustelle) =>
          Number(baustelle.id) === Number(selectedBaustelleId),
      );

      if (!selectedBaustelle) {
        setErrorMessage(t("selectActiveSiteError"));
        return;
      }

      baustelleId = selectedBaustelle.id;

      const location = getBaustelleLocation(selectedBaustelle);
      const siteName = getBaustelleName(
        selectedBaustelle,
        t("siteFallback"),
      );

      baustelleName = location ? `${siteName} – ${location}` : siteName;
    }

    const newItem: CartItem = {
      temporaryId: `${Date.now()}-${Math.random()}`,
      materialId: selectedMaterial.id,
      materialName: getMaterialName(
        selectedMaterial,
        t("materialFallback"),
      ),
      quantity: numericQuantity,
      unit: unit.trim() || getMaterialUnit(selectedMaterial),
      destinationType,
      baustelleId,
      baustelleName,
      note: note.trim(),
      addedAt: new Date().toISOString(),
    };

    setCart((current) => [...current, newItem]);

    setSelectedMaterialId("");
    setQuantity("1");
    setUnit("Stk.");
    setNote("");
    setMaterialSearch("");
  }

  function removeCartItem(temporaryId: string) {
    setCart((current) =>
      current.filter((item) => item.temporaryId !== temporaryId),
    );
  }

  async function submitMaterialOrder() {
    if (cart.length === 0 || saving) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const requestedAt = new Date().toISOString();

      const rows = cart.map((item) => ({
        material_id: item.materialId,
        material_name: item.materialName,
        quantity: item.quantity,
        unit: item.unit,
        destination_type: item.destinationType,
        baustelle_id: item.baustelleId,
        baustelle_name: item.baustelleName,
        requested_by: loggedUserName || t("unknownWorker"),
        requested_at: requestedAt,
        status: "open",
        note: item.note || null,
      }));

      const { data, error } = await supabase
        .from("material_orders")
        .insert(rows)
        .select("*");

      if (error) {
        throw new Error(error.message);
      }

      const insertedOrders = (data || []) as MaterialOrder[];

      setOrders((current) => [...insertedOrders, ...current]);
      setCart([]);

      localStorage.setItem("materialOrdersPending", "true");
      localStorage.setItem(
        "materialOrdersPendingCount",
        String(openOrders.length + insertedOrders.length),
      );

      window.dispatchEvent(new Event("material-orders-changed"));

      setSuccessMessage(
        t("orderSuccess", { count: insertedOrders.length }),
      );
    } catch (error: any) {
      setErrorMessage(
        `${t("saveOrderError")}: ${error?.message || String(error)}`,
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={loadingStyle}>{t("loading")}</div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <style>
        {`
          * {
            box-sizing: border-box;
          }

          .material-order-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(320px, 440px);
            gap: 24px;
            align-items: start;
            max-width: 1450px;
            margin: 0 auto;
          }

          .form-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }

          .destination-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .orders-table-wrap {
            overflow-x: auto;
          }

          @media (max-width: 950px) {
            .material-order-grid {
              grid-template-columns: 1fr;
            }

            .material-order-cart {
              position: static !important;
            }
          }

          @media (max-width: 650px) {
            .form-grid,
            .destination-grid {
              grid-template-columns: 1fr;
            }

            .page-header {
              align-items: stretch !important;
            }

            .page-header a {
              text-align: center;
            }

            .order-card-mobile {
              padding: 16px !important;
            }

            .header-actions {
              width: 100%;
              justify-content: space-between !important;
            }
          }
        `}
      </style>

      <div style={headerStyle} className="page-header">
        <div>
          <h1 style={titleStyle}>{t("pageTitle")}</h1>
          <p style={subtitleStyle}>
            {t("loggedInAs")}:{" "}
            <strong style={{ color: "#f97316" }}>
              {loggedUserName || t("unknownWorker")}
            </strong>
          </p>
        </div>

        <div style={headerActionsStyle} className="header-actions">
          <div style={languageSwitcherStyle}>
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => changeLanguage(option.code)}
                style={{
                  ...languageButtonStyle,
                  ...(language === option.code
                    ? activeLanguageButtonStyle
                    : {}),
                }}
                aria-pressed={language === option.code}
              >
                {option.label}
              </button>
            ))}
          </div>

          <Link href="/dashboard" style={backButtonStyle}>
            ← {t("dashboard")}
          </Link>
        </div>
      </div>

      {errorMessage && (
        <div style={errorMessageStyle}>{errorMessage}</div>
      )}

      {successMessage && (
        <div style={successMessageStyle}>{successMessage}</div>
      )}

      <div className="material-order-grid">
        <section
          style={{ ...cardStyle, margin: 0 }}
          className="order-card-mobile"
        >
          <h2 style={sectionTitleStyle}>{t("addMissingMaterial")}</h2>

          <label style={labelStyle}>
            {t("searchMaterial")}
            <input
              type="text"
              value={materialSearch}
              onChange={(event) => setMaterialSearch(event.target.value)}
              placeholder={t("materialSearchPlaceholder")}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            {t("selectMaterial")}
            <select
              value={selectedMaterialId}
              onChange={(event) =>
                handleMaterialChange(event.target.value)
              }
              style={inputStyle}
            >
              <option value="">{t("materialSelectPlaceholder")}</option>

              {filteredMaterials.map((material) => (
                <option key={material.id} value={material.id}>
                  {getMaterialName(material, t("materialFallback"))}
                  {material.grupa || material.group_name
                    ? ` – ${material.grupa || material.group_name}`
                    : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="form-grid">
            <label style={labelStyle}>
              {t("quantity")}
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              {t("unit")}
              <input
                type="text"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                placeholder={t("unitPlaceholder")}
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ marginTop: "22px" }}>
            <div style={labelTitleStyle}>{t("selectDestination")}</div>

            <div className="destination-grid">
              <button
                type="button"
                onClick={() => setDestinationType("lager")}
                style={{
                  ...destinationButtonStyle,
                  ...(destinationType === "lager"
                    ? selectedDestinationStyle
                    : {}),
                }}
              >
                <span style={destinationIconStyle}>🏢</span>
                <span>{t("warehouse")}</span>
              </button>

              <button
                type="button"
                onClick={() => setDestinationType("baustelle")}
                style={{
                  ...destinationButtonStyle,
                  ...(destinationType === "baustelle"
                    ? selectedDestinationStyle
                    : {}),
                }}
              >
                <span style={destinationIconStyle}>🏗️</span>
                <span>{t("activeSite")}</span>
              </button>
            </div>
          </div>

          {destinationType === "baustelle" && (
            <label style={{ ...labelStyle, marginTop: "18px" }}>
              {t("selectSite")}
              <select
                value={selectedBaustelleId}
                onChange={(event) =>
                  setSelectedBaustelleId(event.target.value)
                }
                style={inputStyle}
              >
                <option value="">{t("activeSitePlaceholder")}</option>

                {baustellen.map((baustelle) => (
                  <option key={baustelle.id} value={baustelle.id}>
                    {getBaustelleName(baustelle, t("siteFallback"))}
                    {getBaustelleLocation(baustelle)
                      ? ` – ${getBaustelleLocation(baustelle)}`
                      : ""}
                  </option>
                ))}
              </select>

              {baustellen.length === 0 && (
                <span style={warningTextStyle}>{t("noActiveSite")}</span>
              )}
            </label>
          )}

          <label style={{ ...labelStyle, marginTop: "18px" }}>
            {t("note")}
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("notePlaceholder")}
              style={textareaStyle}
            />
          </label>

          <button
            type="button"
            onClick={addMaterialToCart}
            style={addButtonStyle}
          >
            {t("addToOrder")}
          </button>
        </section>

        <section
          style={cartCardStyle}
          className="order-card-mobile material-order-cart"
        >
          <div style={cartHeaderStyle}>
            <h2 style={sectionTitleStyle}>{t("orderList")}</h2>

            <span
              style={{
                ...cartCountStyle,
                background: cart.length > 0 ? "#dc2626" : "#374151",
              }}
            >
              {cart.length}
            </span>
          </div>

          {cart.length === 0 ? (
            <div style={emptyCartStyle}>
              <div style={{ fontSize: "42px" }}>🛒</div>
              <p>{t("noMaterialAdded")}</p>
            </div>
          ) : (
            <div style={cartListStyle}>
              {cart.map((item) => (
                <div key={item.temporaryId} style={cartItemStyle}>
                  <div style={cartItemHeaderStyle}>
                    <strong style={{ color: "#fff" }}>
                      {item.materialName}
                    </strong>

                    <button
                      type="button"
                      onClick={() => removeCartItem(item.temporaryId)}
                      style={removeButtonStyle}
                      title={t("remove")}
                      aria-label={t("remove")}
                    >
                      ×
                    </button>
                  </div>

                  <div style={cartItemDetailsStyle}>
                    <span>
                      {t("quantity")}:{" "}
                      <strong>
                        {formatNumber(item.quantity, language)} {item.unit}
                      </strong>
                    </span>

                    <span>
                      {t("target")}:{" "}
                      <strong>
                        {item.destinationType === "lager"
                          ? t("warehouse")
                          : item.baustelleName}
                      </strong>
                    </span>

                    <span>
                      {t("employee")}:{" "}
                      <strong>{loggedUserName || t("unknownWorker")}</strong>
                    </span>

                    <span>
                      {t("addedAt")}:{" "}
                      <strong>
                        {formatDateTime(item.addedAt, language)}
                      </strong>
                    </span>

                    {item.note && (
                      <span>
                        {t("note")}: <strong>{item.note}</strong>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={submitMaterialOrder}
            disabled={cart.length === 0 || saving}
            style={{
              ...orderButtonStyle,
              background:
                cart.length > 0 && !saving ? "#dc2626" : "#374151",
              cursor:
                cart.length > 0 && !saving ? "pointer" : "not-allowed",
              boxShadow:
                cart.length > 0 && !saving
                  ? "0 0 0 4px rgba(220,38,38,0.22)"
                  : "none",
            }}
          >
            {saving
              ? t("savingOrder")
              : cart.length > 0
                ? t("orderMaterialCount", { count: cart.length })
                : t("orderMaterial")}
          </button>

          {cart.length > 0 && (
            <p style={redButtonInfoStyle}>{t("redButtonInfo")}</p>
          )}
        </section>
      </div>

      <section style={{ ...cardStyle, marginTop: "24px" }}>
        <div style={ordersHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>{t("openOrders")}</h2>
            <p style={subtitleStyle}>{t("openOrdersDescription")}</p>
          </div>

          <span
            style={{
              ...openOrdersBadgeStyle,
              background: openOrders.length > 0 ? "#dc2626" : "#166534",
            }}
          >
            {t("openCount", { count: openOrders.length })}
          </span>
        </div>

        {openOrders.length === 0 ? (
          <div style={emptyOrdersStyle}>{t("noOpenOrders")}</div>
        ) : (
          <div className="orders-table-wrap">
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{t("materialFallback")}</th>
                  <th style={thStyle}>{t("quantity")}</th>
                  <th style={thStyle}>{t("selectDestination")}</th>
                  <th style={thStyle}>{t("orderedBy")}</th>
                  <th style={thStyle}>{t("dateTime")}</th>
                  <th style={thStyle}>{t("status")}</th>
                  <th style={thStyle}>{t("note")}</th>
                </tr>
              </thead>

              <tbody>
                {openOrders.map((order) => (
                  <tr key={order.id}>
                    <td style={tdStyle}>
                      <strong>{order.material_name}</strong>
                    </td>

                    <td style={tdStyle}>
                      {formatNumber(order.quantity, language)} {order.unit}
                    </td>

                    <td style={tdStyle}>
                      {order.destination_type === "lager"
                        ? t("warehouse")
                        : order.baustelle_name || t("site")}
                    </td>

                    <td style={tdStyle}>
                      <strong style={{ color: "#f97316" }}>
                        {order.requested_by}
                      </strong>
                    </td>

                    <td style={tdStyle}>
                      {formatDateTime(order.requested_at, language)}
                    </td>

                    <td style={tdStyle}>
                      <span style={statusBadgeStyle}>
                        {getStatusLabel(order.status, language)}
                      </span>
                    </td>

                    <td style={tdStyle}>{order.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ ...cardStyle, marginTop: "24px" }}>
        <h2 style={sectionTitleStyle}>{t("myOrders")}</h2>

        {currentWorkerOrders.length === 0 ? (
          <p style={emptyOrdersStyle}>{t("noMyOrders")}</p>
        ) : (
          <div className="orders-table-wrap">
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{t("materialFallback")}</th>
                  <th style={thStyle}>{t("quantity")}</th>
                  <th style={thStyle}>{t("selectDestination")}</th>
                  <th style={thStyle}>{t("orderedAt")}</th>
                  <th style={thStyle}>{t("status")}</th>
                </tr>
              </thead>

              <tbody>
                {currentWorkerOrders.map((order) => (
                  <tr key={`my-order-${order.id}`}>
                    <td style={tdStyle}>{order.material_name}</td>
                    <td style={tdStyle}>
                      {formatNumber(order.quantity, language)} {order.unit}
                    </td>
                    <td style={tdStyle}>
                      {order.destination_type === "lager"
                        ? t("warehouse")
                        : order.baustelle_name || t("site")}
                    </td>
                    <td style={tdStyle}>
                      {formatDateTime(order.requested_at, language)}
                    </td>
                    <td style={tdStyle}>
                      <span style={statusBadgeStyle}>
                        {getStatusLabel(order.status, language)}
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

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top, #171717 0%, #080808 48%, #000 100%)",
  color: "#fff",
  padding: "28px",
  fontFamily: "Arial, sans-serif",
};

const loadingStyle: React.CSSProperties = {
  minHeight: "70vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
  fontWeight: 700,
};

const headerStyle: React.CSSProperties = {
  maxWidth: "1450px",
  margin: "0 auto 24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "20px",
  flexWrap: "wrap",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "clamp(30px, 5vw, 52px)",
  fontWeight: 900,
};

const subtitleStyle: React.CSSProperties = {
  color: "#a3a3a3",
  marginTop: "8px",
  marginBottom: 0,
};

const backButtonStyle: React.CSSProperties = {
  background: "#2563eb",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
  padding: "13px 20px",
  borderRadius: "12px",
};

const cardStyle: React.CSSProperties = {
  maxWidth: "1450px",
  margin: "0 auto",
  background: "rgba(20,20,20,0.94)",
  border: "1px solid #2f2f2f",
  borderRadius: "20px",
  padding: "24px",
  boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
};

const cartCardStyle: React.CSSProperties = {
  ...cardStyle,
  margin: 0,
  position: "sticky",
  top: "20px",
};

const sectionTitleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: "18px",
  color: "#f97316",
  fontSize: "24px",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginBottom: "16px",
  fontWeight: 800,
};

const labelTitleStyle: React.CSSProperties = {
  marginBottom: "10px",
  fontWeight: 800,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "48px",
  background: "#080808",
  color: "#fff",
  border: "1px solid #3f3f46",
  borderRadius: "11px",
  padding: "11px 13px",
  fontSize: "16px",
  outline: "none",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: "100px",
  resize: "vertical",
};

const destinationButtonStyle: React.CSSProperties = {
  minHeight: "82px",
  background: "#090909",
  color: "#d4d4d4",
  border: "2px solid #333",
  borderRadius: "14px",
  padding: "12px",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: 900,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
};

const selectedDestinationStyle: React.CSSProperties = {
  background: "rgba(249,115,22,0.13)",
  borderColor: "#f97316",
  color: "#fff",
  boxShadow: "0 0 0 3px rgba(249,115,22,0.15)",
};

const destinationIconStyle: React.CSSProperties = {
  fontSize: "27px",
};

const warningTextStyle: React.CSSProperties = {
  color: "#facc15",
  fontSize: "13px",
};

const addButtonStyle: React.CSSProperties = {
  width: "100%",
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: "12px",
  padding: "15px 18px",
  marginTop: "8px",
  fontSize: "16px",
  fontWeight: 900,
  cursor: "pointer",
};

const cartHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
};

const cartCountStyle: React.CSSProperties = {
  minWidth: "36px",
  height: "36px",
  borderRadius: "999px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontWeight: 900,
};

const emptyCartStyle: React.CSSProperties = {
  minHeight: "190px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  color: "#8a8a8a",
  textAlign: "center",
  border: "1px dashed #3f3f46",
  borderRadius: "14px",
};

const cartListStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
  maxHeight: "480px",
  overflowY: "auto",
  paddingRight: "3px",
};

const cartItemStyle: React.CSSProperties = {
  background: "#080808",
  border: "1px solid #343434",
  borderRadius: "13px",
  padding: "14px",
};

const cartItemHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "10px",
};

const cartItemDetailsStyle: React.CSSProperties = {
  display: "grid",
  gap: "7px",
  marginTop: "10px",
  color: "#a3a3a3",
  fontSize: "14px",
};

const removeButtonStyle: React.CSSProperties = {
  width: "30px",
  height: "30px",
  background: "#7f1d1d",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "21px",
  lineHeight: 1,
};

const orderButtonStyle: React.CSSProperties = {
  width: "100%",
  color: "#fff",
  border: "none",
  borderRadius: "13px",
  padding: "17px 15px",
  marginTop: "18px",
  fontSize: "17px",
  fontWeight: 900,
  transition: "all 0.2s ease",
};

const redButtonInfoStyle: React.CSSProperties = {
  color: "#fca5a5",
  fontSize: "12px",
  textAlign: "center",
  marginBottom: 0,
};

const errorMessageStyle: React.CSSProperties = {
  maxWidth: "1450px",
  margin: "0 auto 20px",
  background: "#7f1d1d",
  border: "1px solid #ef4444",
  color: "#fff",
  borderRadius: "12px",
  padding: "14px 17px",
  fontWeight: 700,
};

const successMessageStyle: React.CSSProperties = {
  maxWidth: "1450px",
  margin: "0 auto 20px",
  background: "#14532d",
  border: "1px solid #22c55e",
  color: "#fff",
  borderRadius: "12px",
  padding: "14px 17px",
  fontWeight: 700,
};

const ordersHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  flexWrap: "wrap",
  marginBottom: "18px",
};

const openOrdersBadgeStyle: React.CSSProperties = {
  color: "#fff",
  borderRadius: "999px",
  padding: "9px 15px",
  fontWeight: 900,
};

const emptyOrdersStyle: React.CSSProperties = {
  color: "#999",
  padding: "20px 0",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "900px",
};

const thStyle: React.CSSProperties = {
  background: "#090909",
  color: "#f97316",
  borderBottom: "1px solid #444",
  padding: "13px",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #2e2e2e",
  padding: "13px",
  color: "#ddd",
  verticalAlign: "top",
};

const statusBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  background: "#7f1d1d",
  color: "#fff",
  borderRadius: "999px",
  padding: "5px 10px",
  fontSize: "12px",
  fontWeight: 900,
};

const headerActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "12px",
  flexWrap: "wrap",
};

const languageSwitcherStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "5px",
  background: "#090909",
  border: "1px solid #333",
  borderRadius: "12px",
};

const languageButtonStyle: React.CSSProperties = {
  minWidth: "42px",
  height: "36px",
  padding: "0 10px",
  background: "transparent",
  color: "#a3a3a3",
  border: "1px solid transparent",
  borderRadius: "8px",
  fontWeight: 900,
  cursor: "pointer",
};

const activeLanguageButtonStyle: React.CSSProperties = {
  background: "#f97316",
  color: "#fff",
  borderColor: "#fb923c",
  boxShadow: "0 0 0 2px rgba(249,115,22,0.16)",
};