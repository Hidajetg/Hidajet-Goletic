"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

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

function getLoggedUserName(user: any) {
  if (!user) return "Unbekannter Mitarbeiter";

  if (typeof user === "string") {
    return user.trim() || "Unbekannter Mitarbeiter";
  }

  return String(
    user.name ||
      user.worker_name ||
      user.radnik ||
      user.username ||
      user.userName ||
      user.displayName ||
      "Unbekannter Mitarbeiter",
  ).trim();
}

function getMaterialName(material: MaterialRow) {
  return (
    material.naziv ||
    material.name ||
    material.material ||
    material.bezeichnung ||
    `Material ${material.id}`
  );
}

function getMaterialUnit(material: MaterialRow) {
  return material.jedinica || material.unit || material.einheit || "Stk.";
}

function getBaustelleName(baustelle: BaustelleRow) {
  return baustelle.naziv || baustelle.name || `Baustelle ${baustelle.id}`;
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

  if (archivedStatuses.includes(status)) return false;

  return true;
}

function formatDateTime(value: string) {
  if (!value) return "-";

  return new Date(value).toLocaleString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("de-AT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getStatusLabel(status: string) {
  switch (String(status || "").toLowerCase()) {
    case "ordered":
      return "Bestellt";
    case "delivered":
      return "Geliefert";
    case "cancelled":
      return "Storniert";
    default:
      return "Offen";
  }
}

export default function MaterialOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [loggedUserName, setLoggedUserName] = useState(
    "Unbekannter Mitarbeiter",
  );

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

  useEffect(() => {
    const loggedUser = getLoggedUser();
    setLoggedUserName(getLoggedUserName(loggedUser));

    loadPageData();
  }, []);

  async function loadPageData() {
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
          "Materialien konnten nicht geladen werden: " +
            materialsResult.error.message,
        );
      }

      if (baustellenResult.error) {
        throw new Error(
          "Baustellen konnten nicht geladen werden: " +
            baustellenResult.error.message,
        );
      }

      if (ordersResult.error) {
        throw new Error(
          "Bestellungen konnten nicht geladen werden: " +
            ordersResult.error.message,
        );
      }

      const sortedMaterials = [...(materialsResult.data || [])].sort(
        (a: MaterialRow, b: MaterialRow) =>
          getMaterialName(a).localeCompare(getMaterialName(b), "de"),
      );

      const activeBaustellen = [...(baustellenResult.data || [])]
        .filter((baustelle: BaustelleRow) => isActiveBaustelle(baustelle))
        .sort((a: BaustelleRow, b: BaustelleRow) =>
          getBaustelleName(a).localeCompare(getBaustelleName(b), "de"),
        );

      setMaterials(sortedMaterials);
      setBaustellen(activeBaustellen);
      setOrders((ordersResult.data || []) as MaterialOrder[]);

      if (activeBaustellen.length > 0) {
        setSelectedBaustelleId(String(activeBaustellen[0].id));
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
      const materialName = getMaterialName(material).toLowerCase();
      const groupName = String(
        material.grupa || material.group_name || "",
      ).toLowerCase();

      return materialName.includes(search) || groupName.includes(search);
    });
  }, [materials, materialSearch]);

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
      setErrorMessage("Bitte wählen Sie ein Material aus.");
      return;
    }

    const numericQuantity = Number(String(quantity).replace(",", "."));

    if (!numericQuantity || numericQuantity <= 0) {
      setErrorMessage("Bitte geben Sie eine gültige Menge ein.");
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
        setErrorMessage("Bitte wählen Sie eine aktive Baustelle aus.");
        return;
      }

      baustelleId = selectedBaustelle.id;

      const location = getBaustelleLocation(selectedBaustelle);

      baustelleName = location
        ? `${getBaustelleName(selectedBaustelle)} – ${location}`
        : getBaustelleName(selectedBaustelle);
    }

    const newItem: CartItem = {
      temporaryId: `${Date.now()}-${Math.random()}`,
      materialId: selectedMaterial.id,
      materialName: getMaterialName(selectedMaterial),
      quantity: numericQuantity,
      unit: unit.trim() || getMaterialUnit(selectedMaterial),
      destinationType,
      baustelleId,
      baustelleName,
      note: note.trim(),
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
        requested_by: loggedUserName,
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
        `${insertedOrders.length} Materialposition(en) wurden erfolgreich bestellt.`,
      );
    } catch (error: any) {
      setErrorMessage(
        "Die Materialbestellung konnte nicht gespeichert werden: " +
          (error?.message || String(error)),
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={loadingStyle}>Materialbestellungen werden geladen...</div>
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
          }
        `}
      </style>

      <div style={headerStyle} className="page-header">
        <div>
          <h1 style={titleStyle}>Material bestellen</h1>
          <p style={subtitleStyle}>
            Angemeldet als:{" "}
            <strong style={{ color: "#f97316" }}>{loggedUserName}</strong>
          </p>
        </div>

        <Link href="/dashboard" style={backButtonStyle}>
          ← Dashboard
        </Link>
      </div>

      {errorMessage && (
        <div style={errorMessageStyle}>{errorMessage}</div>
      )}

      {successMessage && (
        <div style={successMessageStyle}>{successMessage}</div>
      )}

      <div className="material-order-grid">
        <section style={cardStyle} className="order-card-mobile">
          <h2 style={sectionTitleStyle}>Fehlendes Material hinzufügen</h2>

          <label style={labelStyle}>
            Material suchen
            <input
              type="text"
              value={materialSearch}
              onChange={(event) => setMaterialSearch(event.target.value)}
              placeholder="Materialname eingeben..."
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Material auswählen
            <select
              value={selectedMaterialId}
              onChange={(event) =>
                handleMaterialChange(event.target.value)
              }
              style={inputStyle}
            >
              <option value="">Material auswählen...</option>

              {filteredMaterials.map((material) => (
                <option key={material.id} value={material.id}>
                  {getMaterialName(material)}
                  {material.grupa || material.group_name
                    ? ` – ${material.grupa || material.group_name}`
                    : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="form-grid">
            <label style={labelStyle}>
              Menge
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
              Einheit
              <input
                type="text"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                placeholder="Stk., kg, Sack..."
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ marginTop: "22px" }}>
            <div style={labelTitleStyle}>Lieferort auswählen</div>

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
                <span>Lager</span>
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
                <span>Aktive Baustelle</span>
              </button>
            </div>
          </div>

          {destinationType === "baustelle" && (
            <label style={{ ...labelStyle, marginTop: "18px" }}>
              Baustelle auswählen
              <select
                value={selectedBaustelleId}
                onChange={(event) =>
                  setSelectedBaustelleId(event.target.value)
                }
                style={inputStyle}
              >
                <option value="">Aktive Baustelle auswählen...</option>

                {baustellen.map((baustelle) => (
                  <option key={baustelle.id} value={baustelle.id}>
                    {getBaustelleName(baustelle)}
                    {getBaustelleLocation(baustelle)
                      ? ` – ${getBaustelleLocation(baustelle)}`
                      : ""}
                  </option>
                ))}
              </select>

              {baustellen.length === 0 && (
                <span style={warningTextStyle}>
                  Keine aktive Baustelle gefunden.
                </span>
              )}
            </label>
          )}

          <label style={{ ...labelStyle, marginTop: "18px" }}>
            Bemerkung
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Zusätzliche Information..."
              style={textareaStyle}
            />
          </label>

          <button
            type="button"
            onClick={addMaterialToCart}
            style={addButtonStyle}
          >
            + Material zur Bestellung hinzufügen
          </button>
        </section>

        <section style={cartCardStyle} className="order-card-mobile">
          <div style={cartHeaderStyle}>
            <h2 style={sectionTitleStyle}>Bestellliste</h2>

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
              <p>Noch kein Material hinzugefügt.</p>
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
                      title="Entfernen"
                    >
                      ×
                    </button>
                  </div>

                  <div style={cartItemDetailsStyle}>
                    <span>
                      Menge:{" "}
                      <strong>
                        {formatNumber(item.quantity)} {item.unit}
                      </strong>
                    </span>

                    <span>
                      Ziel:{" "}
                      <strong>
                        {item.destinationType === "lager"
                          ? "Lager"
                          : item.baustelleName}
                      </strong>
                    </span>

                    <span>
                      Mitarbeiter: <strong>{loggedUserName}</strong>
                    </span>

                    <span>
                      Hinzugefügt:{" "}
                      <strong>{formatDateTime(new Date().toISOString())}</strong>
                    </span>

                    {item.note && (
                      <span>
                        Bemerkung: <strong>{item.note}</strong>
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
              ? "Bestellung wird gespeichert..."
              : cart.length > 0
                ? `🔴 MATERIAL BESTELLEN (${cart.length})`
                : "MATERIAL BESTELLEN"}
          </button>

          {cart.length > 0 && (
            <p style={redButtonInfoStyle}>
              Das Bestellknopf ist rot, weil Material in der Bestellliste
              liegt.
            </p>
          )}
        </section>
      </div>

      <section style={{ ...cardStyle, marginTop: "24px" }}>
        <div style={ordersHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Offene Materialbestellungen</h2>
            <p style={subtitleStyle}>
              Hier sehen Sie, wer das Material bestellt hat und wann.
            </p>
          </div>

          <span
            style={{
              ...openOrdersBadgeStyle,
              background: openOrders.length > 0 ? "#dc2626" : "#166534",
            }}
          >
            {openOrders.length} offen
          </span>
        </div>

        {openOrders.length === 0 ? (
          <div style={emptyOrdersStyle}>
            Keine offenen Materialbestellungen vorhanden.
          </div>
        ) : (
          <div className="orders-table-wrap">
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Material</th>
                  <th style={thStyle}>Menge</th>
                  <th style={thStyle}>Lieferort</th>
                  <th style={thStyle}>Bestellt von</th>
                  <th style={thStyle}>Datum / Uhrzeit</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Bemerkung</th>
                </tr>
              </thead>

              <tbody>
                {openOrders.map((order) => (
                  <tr key={order.id}>
                    <td style={tdStyle}>
                      <strong>{order.material_name}</strong>
                    </td>

                    <td style={tdStyle}>
                      {formatNumber(order.quantity)} {order.unit}
                    </td>

                    <td style={tdStyle}>
                      {order.destination_type === "lager"
                        ? "Lager"
                        : order.baustelle_name || "Baustelle"}
                    </td>

                    <td style={tdStyle}>
                      <strong style={{ color: "#f97316" }}>
                        {order.requested_by}
                      </strong>
                    </td>

                    <td style={tdStyle}>
                      {formatDateTime(order.requested_at)}
                    </td>

                    <td style={tdStyle}>
                      <span style={statusBadgeStyle}>
                        {getStatusLabel(order.status)}
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
        <h2 style={sectionTitleStyle}>Meine Bestellungen</h2>

        {currentWorkerOrders.length === 0 ? (
          <p style={emptyOrdersStyle}>
            Sie haben noch kein Material bestellt.
          </p>
        ) : (
          <div className="orders-table-wrap">
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Material</th>
                  <th style={thStyle}>Menge</th>
                  <th style={thStyle}>Lieferort</th>
                  <th style={thStyle}>Bestellt am</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>

              <tbody>
                {currentWorkerOrders.map((order) => (
                  <tr key={`my-order-${order.id}`}>
                    <td style={tdStyle}>{order.material_name}</td>
                    <td style={tdStyle}>
                      {formatNumber(order.quantity)} {order.unit}
                    </td>
                    <td style={tdStyle}>
                      {order.destination_type === "lager"
                        ? "Lager"
                        : order.baustelle_name || "Baustelle"}
                    </td>
                    <td style={tdStyle}>
                      {formatDateTime(order.requested_at)}
                    </td>
                    <td style={tdStyle}>
                      <span style={statusBadgeStyle}>
                        {getStatusLabel(order.status)}
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