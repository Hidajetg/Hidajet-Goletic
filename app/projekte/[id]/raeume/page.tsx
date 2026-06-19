"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Projekt = {
  id: number | string;
  project_name?: string | null;
  name?: string | null;
  naziv?: string | null;
  ort?: string | null;
  adresse?: string | null;
  status?: string | null;
  [key: string]: any;
};

type RoomTableConfig = {
  table: string;
  column: string;
};

export default function ProjektRaeumePage() {
  const params = useParams();
  const projektId = String(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [projekt, setProjekt] = useState<Projekt | null>(null);
  const [raeume, setRaeume] = useState<any[]>([]);
  const [roomConfig, setRoomConfig] = useState<RoomTableConfig>({
    table: "projekt_raeume",
    column: "projekt_id",
  });

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | string | null>(null);

  const [form, setForm] = useState({
    name: "",
    etage: "",
    bereich: "",
    status: "Offen",
    beschreibung: "",
  });

  useEffect(() => {
    loadAll();
  }, [projektId]);

  function getProjektName() {
    if (!projekt) return "Projekt";

    return (
      projekt.project_name ||
      projekt.name ||
      projekt.naziv ||
      projekt.title ||
      `Projekt ${projekt.id}`
    );
  }

  function getRoomName(room: any) {
    return (
      room.name ||
      room.raum_name ||
      room.naziv ||
      room.title ||
      room.prostorija ||
      `Raum ${room.id}`
    );
  }

  function getRoomEtage(room: any) {
    return room.etage || room.stockwerk || room.floor || "";
  }

  function getRoomBereich(room: any) {
    return room.bereich || room.zone || room.gruppe || room.category || "";
  }

  function getRoomStatus(room: any) {
    return room.status || room.stand || "Offen";
  }

  function getRoomInfo(room: any) {
    return room.beschreibung || room.info || room.notiz || room.note || "";
  }

  function resetForm() {
    setForm({
      name: "",
      etage: "",
      bereich: "",
      status: "Offen",
      beschreibung: "",
    });
    setEditId(null);
  }

  async function loadAll() {
    setLoading(true);
    setErrorText("");

    await loadProjekt();
    await loadRaeume();

    setLoading(false);
  }

  async function loadProjekt() {
    const { data } = await supabase
      .from("projekte")
      .select("*")
      .eq("id", Number(projektId))
      .maybeSingle();

    setProjekt((data as Projekt) || null);
  }

  async function loadRaeume() {
    const configs: RoomTableConfig[] = [
      { table: "projekt_raeume", column: "projekt_id" },
      { table: "raeume", column: "projekt_id" },
      { table: "raeume", column: "project_id" },
      { table: "prostorije", column: "projekt_id" },
      { table: "prostorije", column: "project_id" },
      { table: "rooms", column: "projekt_id" },
      { table: "rooms", column: "project_id" },
      { table: "prostorije", column: "baustelle_id" },
      { table: "raeume", column: "baustelle_id" },
    ];

    for (const config of configs) {
      const { data, error } = await supabase
        .from(config.table)
        .select("*")
        .eq(config.column, Number(projektId));

      if (!error) {
        const sorted = [...(data || [])].sort((a: any, b: any) => {
          const ao = Number(a.sort_order || a.reihenfolge || a.order || a.id || 0);
          const bo = Number(b.sort_order || b.reihenfolge || b.order || b.id || 0);
          return ao - bo;
        });

        setRoomConfig(config);
        setRaeume(sorted);
        return;
      }
    }

    setRaeume([]);
    setErrorText(
      "Ne mogu učitati Räume. Provjeri tabelu projekt_raeume i kolonu projekt_id."
    );
  }

  const filteredRaeume = useMemo(() => {
    return raeume.filter((room) => {
      const text = `${getRoomName(room)} ${getRoomEtage(room)} ${getRoomBereich(
        room
      )} ${getRoomStatus(room)} ${getRoomInfo(room)}`.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [raeume, search]);

  function makeRoomPayload(nameValue?: string) {
    const roomName = (nameValue || form.name).trim();
    const base: any = {};
    base[roomConfig.column] = Number(projektId);

    return [
      {
        ...base,
        name: roomName,
        etage: form.etage.trim(),
        bereich: form.bereich.trim(),
        status: form.status,
        beschreibung: form.beschreibung.trim(),
      },
      {
        ...base,
        raum_name: roomName,
        etage: form.etage.trim(),
        bereich: form.bereich.trim(),
        status: form.status,
        beschreibung: form.beschreibung.trim(),
      },
      {
        ...base,
        naziv: roomName,
        etage: form.etage.trim(),
        status: form.status,
        info: form.beschreibung.trim(),
      },
      {
        ...base,
        name: roomName,
        status: form.status,
      },
      {
        ...base,
        raum_name: roomName,
        status: form.status,
      },
      {
        ...base,
        naziv: roomName,
        status: form.status,
      },
      {
        ...base,
        name: roomName,
      },
      {
        ...base,
        raum_name: roomName,
      },
      {
        ...base,
        naziv: roomName,
      },
    ];
  }

  async function saveRoom() {
    if (!form.name.trim()) {
      alert("Upiši naziv prostorije.");
      return;
    }

    setSaving(true);
    let lastError: any = null;

    for (const payload of makeRoomPayload()) {
      const query = editId
        ? supabase
            .from(roomConfig.table)
            .update(payload as any)
            .eq("id", editId)
        : supabase.from(roomConfig.table).insert(payload as any);

      const { error } = await query;

      if (!error) {
        resetForm();
        setShowForm(false);
        setSaving(false);
        await loadRaeume();
        return;
      }

      lastError = error;
    }

    setSaving(false);
    alert("Greška kod spremanja Räume: " + (lastError?.message || ""));
  }

  async function quickAddRoom(name: string) {
    setSaving(true);
    let lastError: any = null;

    const oldForm = { ...form };
    const quickPayloads = makeRoomPayload(name).map((payload: any) => ({
      ...payload,
      status: "Offen",
    }));

    for (const payload of quickPayloads) {
      const { error } = await supabase.from(roomConfig.table).insert(payload as any);

      if (!error) {
        setSaving(false);
        setForm(oldForm);
        await loadRaeume();
        return;
      }

      lastError = error;
    }

    setSaving(false);
    alert("Greška kod brzog dodavanja: " + (lastError?.message || ""));
  }

  function startEdit(room: any) {
    setEditId(room.id);
    setForm({
      name: getRoomName(room),
      etage: getRoomEtage(room),
      bereich: getRoomBereich(room),
      status: getRoomStatus(room),
      beschreibung: getRoomInfo(room),
    });
    setShowForm(true);
  }

  async function changeStatus(room: any, newStatus: string) {
    const payloads: any[] = [{ status: newStatus }, { stand: newStatus }];
    let lastError: any = null;

    for (const payload of payloads) {
      const { error } = await supabase
        .from(roomConfig.table)
        .update(payload as any)
        .eq("id", room.id);

      if (!error) {
        await loadRaeume();
        return;
      }

      lastError = error;
    }

    alert("Greška kod statusa: " + (lastError?.message || ""));
  }

  async function deleteRoom(room: any) {
    const ok = confirm(`Da li želiš obrisati prostoriju: ${getRoomName(room)}?`);

    if (!ok) return;

    const { error } = await supabase.from(roomConfig.table).delete().eq("id", room.id);

    if (error) {
      alert("Greška kod brisanja: " + error.message);
      return;
    }

    await loadRaeume();
  }

  if (loading) {
    return (
      <main className="page">
        <div className="emptyBox">Učitavanje Räume...</div>

        <style>{`
          .page {
            min-height: 100vh;
            background: #050505;
            color: white;
            padding: 28px;
            font-family: Arial, sans-serif;
          }

          .emptyBox {
            background: #111827;
            border: 1px solid #1f2937;
            border-radius: 18px;
            padding: 30px;
            text-align: center;
            color: #cbd5e1;
            font-weight: 800;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="top">
        <div>
          <Link className="back" href={`/projekte/${projektId}`}>
            ← Zurück zu Projekt
          </Link>

          <p className="label">Projekt Räume</p>
          <h1>Räume</h1>
          <p className="subtitle">{getProjektName()}</p>
        </div>

        <div className="topButtons">
          <button className="btn gray" onClick={loadAll}>
            Aktualisieren
          </button>

          <button
            className="btn blue"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + Raum hinzufügen
          </button>
        </div>
      </section>

      {errorText && <div className="errorBox">{errorText}</div>}

      <section className="stats">
        <div className="stat">
          <span>Ukupno Räume</span>
          <strong>{raeume.length}</strong>
        </div>

        <div className="stat">
          <span>Offen</span>
          <strong>
            {raeume.filter((r) => String(getRoomStatus(r)).toLowerCase() !== "fertig").length}
          </strong>
        </div>

        <div className="stat">
          <span>Fertig</span>
          <strong>
            {raeume.filter((r) => String(getRoomStatus(r)).toLowerCase() === "fertig").length}
          </strong>
        </div>
      </section>

      <section className="toolbar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Traži Raum, Etage, Bereich ili Status..."
        />
      </section>

      <section className="quickAdd">
        <h2>Brzo dodavanje</h2>
        <div className="quickGrid">
          {["Bad", "WC", "Küche", "Wohnzimmer", "Schlafzimmer", "Flur", "Keller", "Terrasse"].map(
            (name) => (
              <button key={name} onClick={() => quickAddRoom(name)} disabled={saving}>
                + {name}
              </button>
            )
          )}
        </div>
      </section>

      {filteredRaeume.length === 0 ? (
        <div className="emptyBox">
          <h2>Nema Räume</h2>
          <p>Dodaj prvu prostoriju za ovaj projekt.</p>
        </div>
      ) : (
        <section className="grid">
          {filteredRaeume.map((room) => (
            <article key={room.id} className="card">
              <div className="cardTop">
                <div>
                  <h2>{getRoomName(room)}</h2>
                  <p>
                    {[getRoomEtage(room), getRoomBereich(room)]
                      .filter(Boolean)
                      .join(" · ") || "Bez dodatnih podataka"}
                  </p>
                </div>

                <span
                  className={
                    String(getRoomStatus(room)).toLowerCase() === "fertig"
                      ? "badge done"
                      : "badge"
                  }
                >
                  {getRoomStatus(room)}
                </span>
              </div>

              {getRoomInfo(room) && <div className="info">{getRoomInfo(room)}</div>}

              <div className="roomLinks">
                <Link href={`/projekte/${projektId}/positionen?raum=${room.id}`}>
                  Positionen
                </Link>
                <Link href={`/projekte/${projektId}/material?raum=${room.id}`}>Material</Link>
                <Link href={`/projekte/${projektId}/fotos?raum=${room.id}`}>Fotos</Link>
                <Link href={`/projekte/${projektId}/arbeitszeit?raum=${room.id}`}>
                  Arbeitszeit
                </Link>
              </div>

              <div className="actions">
                <button onClick={() => startEdit(room)}>Bearbeiten</button>
                <button onClick={() => changeStatus(room, "Fertig")}>Fertig</button>
                <button onClick={() => changeStatus(room, "Offen")}>Offen</button>
                <button className="delete" onClick={() => deleteRoom(room)}>
                  Löschen
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {showForm && (
        <div className="modalBg">
          <div className="modal">
            <div className="modalHead">
              <h2>{editId ? "Raum bearbeiten" : "Raum hinzufügen"}</h2>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                ×
              </button>
            </div>

            <label>Raum Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((old) => ({ ...old, name: e.target.value }))}
              placeholder="z.B. Bad EG"
            />

            <label>Etage</label>
            <input
              value={form.etage}
              onChange={(e) => setForm((old) => ({ ...old, etage: e.target.value }))}
              placeholder="z.B. EG, OG, DG"
            />

            <label>Bereich</label>
            <input
              value={form.bereich}
              onChange={(e) => setForm((old) => ({ ...old, bereich: e.target.value }))}
              placeholder="z.B. Wohnung 1, Haus A"
            />

            <label>Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((old) => ({ ...old, status: e.target.value }))}
            >
              <option value="Offen">Offen</option>
              <option value="In Arbeit">In Arbeit</option>
              <option value="Fertig">Fertig</option>
            </select>

            <label>Info / Notiz</label>
            <textarea
              value={form.beschreibung}
              onChange={(e) =>
                setForm((old) => ({ ...old, beschreibung: e.target.value }))
              }
              placeholder="Kratka informacija za ovu prostoriju"
            />

            <div className="modalActions">
              <button
                className="cancel"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Abbrechen
              </button>

              <button className="save" onClick={saveRoom} disabled={saving}>
                {saving ? "Speichern..." : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .page {
          min-height: 100vh;
          background: #050505;
          color: white;
          padding: 28px;
          font-family: Arial, sans-serif;
        }

        .top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 22px;
        }

        .back {
          display: inline-block;
          color: white;
          text-decoration: none;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 11px 15px;
          font-weight: 800;
          margin-bottom: 18px;
        }

        .label {
          color: #9ca3af;
          margin: 0 0 8px;
          font-size: 14px;
          font-weight: 800;
        }

        h1 {
          margin: 0;
          font-size: 44px;
          line-height: 1;
        }

        .subtitle {
          color: #cbd5e1;
          margin: 12px 0 0;
          font-size: 17px;
          font-weight: 700;
        }

        .topButtons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        button,
        a,
        input,
        textarea,
        select {
          font-family: inherit;
        }

        button,
        a {
          -webkit-tap-highlight-color: transparent;
        }

        .btn {
          border: 0;
          border-radius: 14px;
          padding: 14px 18px;
          color: white;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
        }

        .gray {
          background: #374151;
        }

        .blue {
          background: #2563eb;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }

        .stat {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 18px;
        }

        .stat span {
          display: block;
          color: #9ca3af;
          margin-bottom: 8px;
          font-weight: 800;
        }

        .stat strong {
          font-size: 34px;
        }

        .toolbar {
          margin-bottom: 18px;
        }

        .toolbar input {
          width: 100%;
          box-sizing: border-box;
          background: #111827;
          color: white;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 15px 16px;
          font-size: 16px;
          outline: none;
        }

        .quickAdd {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 18px;
          margin-bottom: 18px;
        }

        .quickAdd h2 {
          margin: 0 0 12px;
          font-size: 22px;
        }

        .quickGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .quickGrid button {
          background: #1f2937;
          border: 1px solid #374151;
          color: white;
          border-radius: 14px;
          padding: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .errorBox {
          background: #7f1d1d;
          border: 1px solid #ef4444;
          color: white;
          padding: 16px;
          border-radius: 14px;
          margin-bottom: 18px;
          font-weight: 800;
        }

        .emptyBox {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 18px;
          padding: 30px;
          text-align: center;
          color: #cbd5e1;
        }

        .emptyBox h2 {
          color: white;
          margin-top: 0;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 18px;
        }

        .card {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 22px;
          padding: 20px;
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 14px;
        }

        .card h2 {
          margin: 0;
          font-size: 24px;
        }

        .card p {
          margin: 8px 0 0;
          color: #cbd5e1;
        }

        .badge {
          background: #064e3b;
          color: #bbf7d0;
          border: 1px solid #16a34a;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
        }

        .badge.done {
          background: #374151;
          color: #e5e7eb;
          border-color: #6b7280;
        }

        .info {
          background: #0b1220;
          border: 1px solid #1f2937;
          border-radius: 14px;
          padding: 12px;
          color: #d1d5db;
          margin-bottom: 12px;
          white-space: pre-wrap;
        }

        .roomLinks {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 14px;
        }

        .roomLinks a {
          background: #1f2937;
          border: 1px solid #374151;
          color: white;
          text-decoration: none;
          text-align: center;
          border-radius: 14px;
          padding: 12px;
          font-weight: 800;
        }

        .actions {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          padding-top: 14px;
          border-top: 1px solid #1f2937;
        }

        .actions button {
          background: #374151;
          color: white;
          border: 0;
          border-radius: 12px;
          padding: 12px 8px;
          font-weight: 900;
          cursor: pointer;
        }

        .actions .delete {
          background: #dc2626;
        }

        .modalBg {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.78);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 16px;
          z-index: 100;
        }

        .modal {
          width: 100%;
          max-width: 620px;
          max-height: 92vh;
          overflow: auto;
          background: #111827;
          border: 1px solid #374151;
          border-radius: 22px;
          padding: 22px;
        }

        .modalHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .modalHead h2 {
          margin: 0;
          font-size: 28px;
        }

        .modalHead button {
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 12px;
          background: #374151;
          color: white;
          font-size: 28px;
          cursor: pointer;
        }

        label {
          display: block;
          color: #d1d5db;
          font-weight: 800;
          margin: 14px 0 7px;
        }

        .modal input,
        .modal textarea,
        .modal select {
          width: 100%;
          box-sizing: border-box;
          background: #030712;
          color: white;
          border: 1px solid #374151;
          border-radius: 14px;
          padding: 14px;
          font-size: 16px;
          outline: none;
        }

        .modal textarea {
          min-height: 90px;
          resize: vertical;
        }

        .modalActions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }

        .modalActions button {
          border: 0;
          border-radius: 14px;
          padding: 14px 18px;
          color: white;
          font-weight: 900;
          cursor: pointer;
        }

        .cancel {
          background: #374151;
        }

        .save {
          background: #2563eb;
        }

        .save:disabled,
        .quickGrid button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 760px) {
          .page {
            padding: 16px;
          }

          .top {
            display: block;
          }

          h1 {
            font-size: 36px;
          }

          .topButtons {
            display: grid;
            grid-template-columns: 1fr;
            margin-top: 16px;
          }

          .stats,
          .quickGrid,
          .grid,
          .roomLinks,
          .actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}