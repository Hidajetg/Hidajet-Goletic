"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type WorkerRole = "admin" | "worker";

type Worker = {
  id: string;
  name: string;
  role: WorkerRole;
  active: boolean;
};

const ADMIN_NAMES = new Set([
  "hido",
  "steffi",
  "admin",
  "hidajet",
  "hidajet goletic",
  "hidajet goletić",
]);

export default function MitarbeiterPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sessionWarning, setSessionWarning] = useState(false);

  const [showAdd, setShowAdd] = useState(false);

  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newRole, setNewRole] = useState<WorkerRole>("worker");

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPin, setEditPin] = useState("");
  const [editRole, setEditRole] = useState<WorkerRole>("worker");

  useEffect(() => {
    loadWorkers();
  }, []);

  const admins = useMemo(
    () => workers.filter((worker) => worker.role === "admin"),
    [workers],
  );

  const employees = useMemo(
    () => workers.filter((worker) => worker.role !== "admin"),
    [workers],
  );

  function normalizeWorker(row: any): Worker {
    const name = String(row?.name || row?.worker_name || row?.radnik || "").trim();

    const detectedRole =
      String(row?.role || "").toLowerCase() === "admin" ||
      ADMIN_NAMES.has(name.toLowerCase())
        ? "admin"
        : "worker";

    return {
      id: String(row?.id ?? name),
      name: name || "Unbekannt",
      role: detectedRole,
      active: row?.active !== false,
    };
  }

  async function loadWorkers() {
    setLoading(true);
    setError("");
    setSessionWarning(false);

    let apiWorkers: Worker[] = [];
    let apiError = "";
    let noAdminSession = false;

    try {
      const response = await fetch("/api/admin/workers", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        apiWorkers = Array.isArray(data?.workers)
          ? data.workers.map(normalizeWorker)
          : [];
      } else {
        apiError =
          data?.error || "Mitarbeiter konnten nicht über den Admin-API geladen werden.";

        if (response.status === 401 || response.status === 403) {
          noAdminSession = true;
        }
      }
    } catch (err: any) {
      apiError = err?.message || "Admin-API konnte nicht erreicht werden.";
    }

    // Fallback samo za prikaz postojeće liste.
    // Dodavanje/izmjena i dalje ide kroz zaštićeni Admin API.
    let directWorkers: Worker[] = [];
    let directError = "";

    try {
      const { data, error: supabaseError } = await supabase
        .from("workers")
        .select("*")
        .order("name", { ascending: true });

      if (supabaseError) {
        directError = supabaseError.message;
      } else {
        directWorkers = (data || []).map(normalizeWorker);
      }
    } catch (err: any) {
      directError = err?.message || "Workers-Tabelle konnte nicht gelesen werden.";
    }

    const source =
      apiWorkers.length > 0
        ? apiWorkers
        : directWorkers.length > 0
          ? directWorkers
          : apiWorkers;

    const unique = new Map<string, Worker>();

    for (const worker of source) {
      const key = String(worker.id || worker.name).toLowerCase();
      unique.set(key, worker);
    }

    const sorted = Array.from(unique.values()).sort((a, b) => {
      if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
      return a.name.localeCompare(b.name, "de");
    });

    setWorkers(sorted);

    if (noAdminSession) {
      setSessionWarning(true);
      setError(
        "Deine Admin-Sitzung ist nicht mehr gültig. Die bestehende Mitarbeiterliste wird angezeigt, aber für Hinzufügen, Bearbeiten oder Deaktivieren bitte einmal abmelden und neu als Admin anmelden.",
      );
    } else if (sorted.length === 0 && (apiError || directError)) {
      setError(
        [apiError, directError].filter(Boolean).join(" | ") ||
          "Mitarbeiter konnten nicht geladen werden.",
      );
    }

    setLoading(false);
  }

  function resetMessages() {
    setSuccess("");
    if (!sessionWarning) {
      setError("");
    }
  }

  function handleAdminApiError(response: Response, data: any) {
    if (response.status === 401 || response.status === 403) {
      setSessionWarning(true);
      setError(
        "Admin-Sitzung fehlt oder ist abgelaufen. Bitte abmelden und neu als Admin anmelden.",
      );
      return true;
    }

    return false;
  }

  async function addWorker() {
    resetMessages();

    const name = newName.trim();
    const pin = newPin.trim();

    if (name.length < 2) {
      setError("Bitte Name eingeben.");
      return;
    }

    if (!/^\d{4,8}$/.test(pin)) {
      setError("PIN muss aus 4 bis 8 Zahlen bestehen.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/workers", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          pin,
          role: newRole,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (handleAdminApiError(response, data)) return;
        throw new Error(data?.error || "Mitarbeiter konnte nicht hinzugefügt werden.");
      }

      setNewName("");
      setNewPin("");
      setNewRole("worker");
      setShowAdd(false);
      setSuccess(`${name} wurde erfolgreich hinzugefügt.`);

      await loadWorkers();
    } catch (err: any) {
      setError(err?.message || "Fehler beim Hinzufügen.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(worker: Worker) {
    resetMessages();
    setEditId(worker.id);
    setEditName(worker.name);
    setEditPin("");
    setEditRole(worker.role);
  }

  function cancelEdit() {
    setEditId(null);
    setEditName("");
    setEditPin("");
    setEditRole("worker");
  }

  async function saveEdit(worker: Worker) {
    resetMessages();

    const name = editName.trim();
    const pin = editPin.trim();

    if (name.length < 2) {
      setError("Bitte Name eingeben.");
      return;
    }

    if (pin && !/^\d{4,8}$/.test(pin)) {
      setError("PIN muss aus 4 bis 8 Zahlen bestehen.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/workers", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: worker.id,
          name,
          pin,
          role: editRole,
          active: worker.active,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (handleAdminApiError(response, data)) return;
        throw new Error(data?.error || "Änderung konnte nicht gespeichert werden.");
      }

      cancelEdit();
      setSuccess(`${name} wurde gespeichert.`);

      await loadWorkers();
    } catch (err: any) {
      setError(err?.message || "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  async function changeActive(worker: Worker) {
    resetMessages();

    const action = worker.active ? "deaktivieren" : "aktivieren";

    if (
      !window.confirm(
        `Möchtest du ${worker.name} wirklich ${action}?`,
      )
    ) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/workers", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: worker.id,
          name: worker.name,
          role: worker.role,
          active: !worker.active,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (handleAdminApiError(response, data)) return;
        throw new Error(data?.error || "Status konnte nicht geändert werden.");
      }

      setSuccess(
        worker.active
          ? `${worker.name} wurde deaktiviert.`
          : `${worker.name} wurde aktiviert.`,
      );

      await loadWorkers();
    } catch (err: any) {
      setError(err?.message || "Fehler beim Ändern des Status.");
    } finally {
      setSaving(false);
    }
  }

  function renderWorker(worker: Worker) {
    const editing = editId === worker.id;

    return (
      <div
        key={worker.id}
        style={{
          ...workerCardStyle,
          opacity: worker.active ? 1 : 0.65,
        }}
      >
        {editing ? (
          <div style={editAreaStyle}>
            <div style={editGridStyle}>
              <div style={fieldBoxStyle}>
                <label style={labelStyle}>Name</label>
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={fieldBoxStyle}>
                <label style={labelStyle}>Neuer PIN</label>
                <input
                  value={editPin}
                  onChange={(event) =>
                    setEditPin(event.target.value.replace(/\D/g, ""))
                  }
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="leer = unverändert"
                  style={inputStyle}
                />
              </div>

              <div style={fieldBoxStyle}>
                <label style={labelStyle}>Rolle</label>
                <select
                  value={editRole}
                  onChange={(event) =>
                    setEditRole(event.target.value as WorkerRole)
                  }
                  style={selectStyle}
                >
                  <option value="worker">Mitarbeiter</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>

            <div style={actionRowStyle}>
              <button
                type="button"
                onClick={() => saveEdit(worker)}
                disabled={saving}
                style={greenButtonStyle}
              >
                💾 Speichern
              </button>

              <button type="button" onClick={cancelEdit} style={grayButtonStyle}>
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <div style={workerRowStyle}>
            <div style={workerInfoStyle}>
              <div
                style={{
                  ...avatarStyle,
                  background:
                    worker.role === "admin"
                      ? "#f97316"
                      : worker.active
                        ? "#16a34a"
                        : "#7f1d1d",
                }}
              >
                {worker.role === "admin" ? "A" : "M"}
              </div>

              <div>
                <div style={workerNameStyle}>{worker.name}</div>

                <div style={badgeRowStyle}>
                  <span
                    style={
                      worker.role === "admin"
                        ? adminBadgeStyle
                        : workerBadgeStyle
                    }
                  >
                    {worker.role === "admin"
                      ? "ADMINISTRATOR"
                      : "MITARBEITER"}
                  </span>

                  <span
                    style={
                      worker.active ? activeBadgeStyle : inactiveBadgeStyle
                    }
                  >
                    {worker.active ? "AKTIV" : "DEAKTIVIERT"}
                  </span>
                </div>
              </div>
            </div>

            <div style={actionRowStyle}>
              <button
                type="button"
                onClick={() => startEdit(worker)}
                disabled={saving}
                style={editButtonStyle}
              >
                ✏️ Bearbeiten
              </button>

              <button
                type="button"
                onClick={() => changeActive(worker)}
                disabled={saving}
                style={worker.active ? redButtonStyle : greenButtonStyle}
              >
                {worker.active ? "Deaktivieren" : "Aktivieren"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <div style={topbarStyle}>
          <div>
            <div style={adminLabelStyle}>ADMIN</div>
            <h1 style={titleStyle}>Mitarbeiter</h1>
            <p style={subtitleStyle}>
              Mitarbeiter, Administratoren und Zugänge verwalten.
            </p>
          </div>

          <div style={topActionsStyle}>
            <Link href="/dashboard" style={dashboardButtonStyle}>
              ← Dashboard
            </Link>

            <button
              type="button"
              onClick={() => {
                setSuccess("");
                setShowAdd((current) => !current);
              }}
              style={orangeButtonStyle}
            >
              {showAdd ? "✕ Schließen" : "+ Neuer Mitarbeiter"}
            </button>
          </div>
        </div>

        {error && <div style={errorBoxStyle}>{error}</div>}
        {success && <div style={successBoxStyle}>{success}</div>}

        {sessionWarning && (
          <div style={warningActionsStyle}>
            <Link href="/login" style={orangeButtonStyle}>
              Neu als Admin anmelden
            </Link>
            <button type="button" onClick={loadWorkers} style={grayButtonStyle}>
              Liste neu laden
            </button>
          </div>
        )}

        {showAdd && (
          <section style={panelStyle}>
            <h2 style={sectionTitleStyle}>Neuen Mitarbeiter hinzufügen</h2>

            <div style={formGridStyle}>
              <div style={fieldBoxStyle}>
                <label style={labelStyle}>Name</label>
                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="z. B. Adnan"
                  style={inputStyle}
                />
              </div>

              <div style={fieldBoxStyle}>
                <label style={labelStyle}>PIN</label>
                <input
                  value={newPin}
                  onChange={(event) =>
                    setNewPin(event.target.value.replace(/\D/g, ""))
                  }
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="4-8 Zahlen"
                  style={inputStyle}
                />
              </div>

              <div style={fieldBoxStyle}>
                <label style={labelStyle}>Rolle</label>
                <select
                  value={newRole}
                  onChange={(event) =>
                    setNewRole(event.target.value as WorkerRole)
                  }
                  style={selectStyle}
                >
                  <option value="worker">Mitarbeiter</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>

            <div style={actionRowStyle}>
              <button
                type="button"
                onClick={addWorker}
                disabled={saving}
                style={greenButtonStyle}
              >
                {saving ? "Speichern..." : "✓ Mitarbeiter hinzufügen"}
              </button>

              <button
                type="button"
                onClick={() => setShowAdd(false)}
                style={grayButtonStyle}
              >
                Abbrechen
              </button>
            </div>
          </section>
        )}

        <section style={statsGridStyle}>
          <div style={statBoxStyle}>
            <span style={statNumberStyle}>{workers.length}</span>
            <span style={statLabelStyle}>Gesamt</span>
          </div>

          <div style={statBoxStyle}>
            <span style={statNumberStyle}>{admins.length}</span>
            <span style={statLabelStyle}>Administratoren</span>
          </div>

          <div style={statBoxStyle}>
            <span style={statNumberStyle}>{employees.length}</span>
            <span style={statLabelStyle}>Mitarbeiter</span>
          </div>

          <div style={statBoxStyle}>
            <span style={statNumberStyle}>
              {workers.filter((worker) => !worker.active).length}
            </span>
            <span style={statLabelStyle}>Deaktiviert</span>
          </div>
        </section>

        {loading ? (
          <section style={panelStyle}>
            <div style={loadingStyle}>Mitarbeiter werden geladen...</div>
          </section>
        ) : (
          <>
            <section style={panelStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <div style={sectionEyebrowStyle}>ADMIN</div>
                  <h2 style={sectionTitleStyle}>Administratoren</h2>
                </div>
                <div style={countBadgeStyle}>{admins.length}</div>
              </div>

              {admins.length === 0 ? (
                <div style={emptyStyle}>Keine Administratoren gefunden.</div>
              ) : (
                <div style={listStyle}>{admins.map(renderWorker)}</div>
              )}
            </section>

            <section style={panelStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <div style={sectionEyebrowStyle}>TEAM</div>
                  <h2 style={sectionTitleStyle}>Mitarbeiter</h2>
                </div>
                <div style={countBadgeStyle}>{employees.length}</div>
              </div>

              {employees.length === 0 ? (
                <div style={emptyStyle}>Keine Mitarbeiter gefunden.</div>
              ) : (
                <div style={listStyle}>{employees.map(renderWorker)}</div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#000000",
  color: "#ffffff",
  padding: "20px",
};

const containerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "1500px",
  margin: "0 auto",
};

const topbarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const topActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const adminLabelStyle: React.CSSProperties = {
  color: "#f97316",
  fontSize: "14px",
  fontWeight: 900,
  letterSpacing: "0.7px",
  marginBottom: "8px",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  color: "#ffffff",
  fontSize: "34px",
  lineHeight: 1.1,
  fontWeight: 900,
};

const subtitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#b8c0cc",
  fontSize: "14px",
};

const panelStyle: React.CSSProperties = {
  background: "#171717",
  border: "1px solid #343434",
  borderRadius: "15px",
  padding: "18px",
  marginBottom: "18px",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "14px",
};

const sectionEyebrowStyle: React.CSSProperties = {
  color: "#f97316",
  fontSize: "11px",
  fontWeight: 900,
  marginBottom: "4px",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#ffffff",
  fontSize: "21px",
  fontWeight: 900,
};

const countBadgeStyle: React.CSSProperties = {
  minWidth: "38px",
  height: "38px",
  borderRadius: "50%",
  background: "#f97316",
  color: "#000000",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "10px",
  marginBottom: "18px",
};

const statBoxStyle: React.CSSProperties = {
  background: "#111111",
  border: "1px solid #333333",
  borderRadius: "13px",
  padding: "14px",
  display: "flex",
  flexDirection: "column",
  gap: "3px",
};

const statNumberStyle: React.CSSProperties = {
  color: "#f97316",
  fontSize: "26px",
  fontWeight: 900,
};

const statLabelStyle: React.CSSProperties = {
  color: "#c7c7c7",
  fontSize: "12px",
  fontWeight: 700,
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
  marginTop: "16px",
};

const editGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "12px",
};

const fieldBoxStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const labelStyle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: 800,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#0b0b0b",
  color: "#ffffff",
  border: "1px solid #444444",
  borderRadius: "10px",
  padding: "12px",
  fontSize: "15px",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  background: "#0b0b0b",
};

const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "9px",
};

const workerCardStyle: React.CSSProperties = {
  background: "#0d0d0d",
  border: "1px solid #2c2c2c",
  borderRadius: "12px",
  padding: "13px",
};

const workerRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  flexWrap: "wrap",
};

const workerInfoStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  minWidth: 0,
};

const avatarStyle: React.CSSProperties = {
  width: "42px",
  height: "42px",
  flex: "0 0 42px",
  borderRadius: "10px",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "17px",
  fontWeight: 900,
};

const workerNameStyle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "17px",
  fontWeight: 900,
  marginBottom: "6px",
};

const badgeRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
};

const baseBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "999px",
  padding: "4px 8px",
  fontSize: "10px",
  fontWeight: 900,
};

const adminBadgeStyle: React.CSSProperties = {
  ...baseBadgeStyle,
  background: "#431407",
  color: "#fdba74",
  border: "1px solid #9a3412",
};

const workerBadgeStyle: React.CSSProperties = {
  ...baseBadgeStyle,
  background: "#052e16",
  color: "#86efac",
  border: "1px solid #166534",
};

const activeBadgeStyle: React.CSSProperties = {
  ...baseBadgeStyle,
  background: "#0f172a",
  color: "#93c5fd",
  border: "1px solid #1d4ed8",
};

const inactiveBadgeStyle: React.CSSProperties = {
  ...baseBadgeStyle,
  background: "#450a0a",
  color: "#fecaca",
  border: "1px solid #991b1b",
};

const actionRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "12px",
};

const editAreaStyle: React.CSSProperties = {
  width: "100%",
};

const baseButtonStyle: React.CSSProperties = {
  textDecoration: "none",
  border: "none",
  borderRadius: "10px",
  padding: "11px 14px",
  fontSize: "13px",
  fontWeight: 900,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const dashboardButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  background: "#111111",
  color: "#ffffff",
  border: "1px solid #444444",
};

const orangeButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  background: "#f97316",
  color: "#000000",
};

const greenButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  background: "#22c55e",
  color: "#07150b",
};

const redButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  background: "#dc2626",
  color: "#ffffff",
};

const grayButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  background: "#262626",
  color: "#ffffff",
  border: "1px solid #444444",
};

const editButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  background: "#2563eb",
  color: "#ffffff",
};

const errorBoxStyle: React.CSSProperties = {
  background: "#450a0a",
  color: "#fecaca",
  border: "1px solid #991b1b",
  borderRadius: "12px",
  padding: "13px",
  marginBottom: "14px",
  fontWeight: 700,
  fontSize: "13px",
};

const successBoxStyle: React.CSSProperties = {
  background: "#052e16",
  color: "#bbf7d0",
  border: "1px solid #166534",
  borderRadius: "12px",
  padding: "13px",
  marginBottom: "14px",
  fontWeight: 700,
  fontSize: "13px",
};

const warningActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "16px",
};

const loadingStyle: React.CSSProperties = {
  color: "#b8c0cc",
  textAlign: "center",
  padding: "24px",
  fontWeight: 700,
};

const emptyStyle: React.CSSProperties = {
  color: "#9ca3af",
  border: "1px dashed #3a3a3a",
  borderRadius: "10px",
  padding: "18px",
  textAlign: "center",
};