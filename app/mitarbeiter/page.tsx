"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Worker = {
  id: string;
  name: string;
  role: "admin" | "worker";
  active: boolean;
};

export default function MitarbeiterPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showAdd, setShowAdd] = useState(false);

  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newRole, setNewRole] =
    useState<"admin" | "worker">("worker");

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPin, setEditPin] = useState("");
  const [editRole, setEditRole] =
    useState<"admin" | "worker">("worker");

  useEffect(() => {
    loadWorkers();
  }, []);

  async function loadWorkers() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/workers",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Mitarbeiter konnten nicht geladen werden."
        );
      }

      setWorkers(data.workers || []);
    } catch (err: any) {
      setError(
        err?.message ||
          "Mitarbeiter konnten nicht geladen werden."
      );
    } finally {
      setLoading(false);
    }
  }

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  async function addWorker() {
    clearMessages();

    if (!newName.trim()) {
      setError("Bitte Name eingeben.");
      return;
    }

    if (!/^\d{4,8}$/.test(newPin)) {
      setError(
        "PIN muss aus 4 bis 8 Zahlen bestehen."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/admin/workers",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name: newName.trim(),
            pin: newPin,
            role: newRole,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Mitarbeiter konnte nicht hinzugefügt werden."
        );
      }

      setNewName("");
      setNewPin("");
      setNewRole("worker");
      setShowAdd(false);

      setSuccess(
        "Mitarbeiter wurde erfolgreich hinzugefügt."
      );

      await loadWorkers();
    } catch (err: any) {
      setError(err?.message || "Fehler.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(worker: Worker) {
    clearMessages();

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
    clearMessages();

    if (!editName.trim()) {
      setError("Bitte Name eingeben.");
      return;
    }

    if (
      editPin &&
      !/^\d{4,8}$/.test(editPin)
    ) {
      setError(
        "PIN muss aus 4 bis 8 Zahlen bestehen."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/admin/workers",
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            id: worker.id,
            name: editName.trim(),
            pin: editPin,
            role: editRole,
            active: worker.active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Änderung konnte nicht gespeichert werden."
        );
      }

      cancelEdit();

      setSuccess(
        "Änderungen wurden gespeichert."
      );

      await loadWorkers();
    } catch (err: any) {
      setError(err?.message || "Fehler.");
    } finally {
      setSaving(false);
    }
  }

  async function changeActive(worker: Worker) {
    clearMessages();
    setSaving(true);

    try {
      const response = await fetch(
        "/api/admin/workers",
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            id: worker.id,
            name: worker.name,
            role: worker.role,
            active: !worker.active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Status konnte nicht geändert werden."
        );
      }

      setSuccess(
        worker.active
          ? `${worker.name} wurde deaktiviert.`
          : `${worker.name} wurde aktiviert.`
      );

      await loadWorkers();
    } catch (err: any) {
      setError(err?.message || "Fehler.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">

          <div>
            <h1 className="text-3xl font-black text-slate-900">
              👷 Mitarbeiter
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Mitarbeiter verwalten
            </p>
          </div>

          <div className="flex gap-2">

            <Link
              href="/dashboard"
              className="rounded-xl border bg-white px-4 py-3 font-bold text-slate-700 shadow-sm"
            >
              ← Dashboard
            </Link>

            <button
              onClick={() => {
                clearMessages();
                setShowAdd(true);
              }}
              className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-blue-700"
            >
              + Neuer Mitarbeiter
            </button>

          </div>
        </div>


        {/* ERROR */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
            {error}
          </div>
        )}


        {/* SUCCESS */}
        {success && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 font-semibold text-green-700">
            {success}
          </div>
        )}


        {/* ADD */}
        {showAdd && (
          <div className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">

            <h2 className="mb-5 text-xl font-black">
              Neuer Mitarbeiter
            </h2>

            <div className="grid gap-4 md:grid-cols-3">

              <div>
                <label className="mb-1 block text-sm font-bold">
                  Name
                </label>

                <input
                  value={newName}
                  onChange={(e) =>
                    setNewName(e.target.value)
                  }
                  placeholder="z.B. Adnan"
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>


              <div>
                <label className="mb-1 block text-sm font-bold">
                  PIN
                </label>

                <input
                  value={newPin}
                  onChange={(e) =>
                    setNewPin(
                      e.target.value.replace(/\D/g, "")
                    )
                  }
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="4-8 Zahlen"
                  className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>


              <div>
                <label className="mb-1 block text-sm font-bold">
                  Rolle
                </label>

                <select
                  value={newRole}
                  onChange={(e) =>
                    setNewRole(
                      e.target.value as
                        | "admin"
                        | "worker"
                    )
                  }
                  className="w-full rounded-xl border bg-white px-4 py-3"
                >
                  <option value="worker">
                    Mitarbeiter
                  </option>

                  <option value="admin">
                    Administrator
                  </option>
                </select>
              </div>

            </div>


            <div className="mt-5 flex gap-3">

              <button
                disabled={saving}
                onClick={addWorker}
                className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white disabled:opacity-50"
              >
                {saving
                  ? "Speichern..."
                  : "Mitarbeiter hinzufügen"}
              </button>

              <button
                onClick={() => setShowAdd(false)}
                className="rounded-xl bg-slate-200 px-5 py-3 font-bold"
              >
                Abbrechen
              </button>

            </div>

          </div>
        )}


        {/* LIST */}
        <div className="rounded-2xl border bg-white shadow-sm">

          <div className="border-b px-5 py-4">
            <h2 className="font-black">
              Mitarbeiterliste
            </h2>
          </div>


          {loading ? (

            <div className="p-8 text-center text-slate-500">
              Mitarbeiter werden geladen...
            </div>

          ) : workers.length === 0 ? (

            <div className="p-8 text-center text-slate-500">
              Keine Mitarbeiter vorhanden.
            </div>

          ) : (

            <div className="divide-y">

              {workers.map((worker) => {

                const editing =
                  editId === worker.id;

                return (
                  <div
                    key={worker.id}
                    className={
                      worker.active
                        ? "p-5"
                        : "bg-slate-50 p-5 opacity-70"
                    }
                  >

                    {editing ? (

                      <div>

                        <div className="grid gap-3 md:grid-cols-3">

                          <input
                            value={editName}
                            onChange={(e) =>
                              setEditName(
                                e.target.value
                              )
                            }
                            className="rounded-xl border px-4 py-3"
                          />

                          <input
                            value={editPin}
                            onChange={(e) =>
                              setEditPin(
                                e.target.value.replace(
                                  /\D/g,
                                  ""
                                )
                              )
                            }
                            inputMode="numeric"
                            maxLength={8}
                            placeholder="Neuer PIN (optional)"
                            className="rounded-xl border px-4 py-3"
                          />

                          <select
                            value={editRole}
                            onChange={(e) =>
                              setEditRole(
                                e.target.value as
                                  | "admin"
                                  | "worker"
                              )
                            }
                            className="rounded-xl border bg-white px-4 py-3"
                          >
                            <option value="worker">
                              Mitarbeiter
                            </option>

                            <option value="admin">
                              Administrator
                            </option>
                          </select>

                        </div>


                        <div className="mt-4 flex gap-2">

                          <button
                            disabled={saving}
                            onClick={() =>
                              saveEdit(worker)
                            }
                            className="rounded-xl bg-green-600 px-4 py-2 font-bold text-white"
                          >
                            Speichern
                          </button>

                          <button
                            onClick={cancelEdit}
                            className="rounded-xl bg-slate-200 px-4 py-2 font-bold"
                          >
                            Abbrechen
                          </button>

                        </div>

                      </div>

                    ) : (

                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

                        <div className="flex items-center gap-4">

                          <div
                            className={
                              worker.active
                                ? "flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-xl"
                                : "flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl"
                            }
                          >
                            {worker.active
                              ? "👷"
                              : "⛔"}
                          </div>


                          <div>

                            <div className="text-lg font-black">
                              {worker.name}
                            </div>

                            <div className="mt-1 flex flex-wrap gap-2">

                              <span
                                className={
                                  worker.role ===
                                  "admin"
                                    ? "rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700"
                                    : "rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700"
                                }
                              >
                                {worker.role ===
                                "admin"
                                  ? "Administrator"
                                  : "Mitarbeiter"}
                              </span>


                              <span
                                className={
                                  worker.active
                                    ? "rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700"
                                    : "rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700"
                                }
                              >
                                {worker.active
                                  ? "Aktiv"
                                  : "Deaktiviert"}
                              </span>

                            </div>

                          </div>

                        </div>


                        <div className="flex flex-wrap gap-2">

                          <button
                            onClick={() =>
                              startEdit(worker)
                            }
                            className="rounded-xl bg-slate-200 px-4 py-2 font-bold text-slate-800"
                          >
                            ✏️ Bearbeiten
                          </button>


                          <button
                            disabled={saving}
                            onClick={() =>
                              changeActive(worker)
                            }
                            className={
                              worker.active
                                ? "rounded-xl bg-red-600 px-4 py-2 font-bold text-white"
                                : "rounded-xl bg-green-600 px-4 py-2 font-bold text-white"
                            }
                          >
                            {worker.active
                              ? "Deaktivieren"
                              : "Aktivieren"}
                          </button>

                        </div>

                      </div>

                    )}

                  </div>
                );
              })}

            </div>
          )}

        </div>

      </div>
    </main>
  );
}