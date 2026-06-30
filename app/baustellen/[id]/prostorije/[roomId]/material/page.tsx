"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";

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

function toNumber(value: any) {
  const n = Number(String(value ?? "0").replace(",", "."));

  return Number.isFinite(n) ? n : 0;
}

function cleanText(value: any) {
  return String(value ?? "").trim();
}

export default function RoomMaterialPage() {
  const params = useParams();

  const baustelleId = String(params.id);
  const roomId = String(params.roomId);

  const [loading, setLoading] = useState(true);
  const [baustelle, setBaustelle] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);

  const [grupe, setGrupe] = useState<any[]>([]);
  const [materijali, setMaterijali] = useState<any[]>([]);
  const [roomMaterial, setRoomMaterial] = useState<any[]>([]);

  const [aktivnaGrupa, setAktivnaGrupa] = useState<any | null>(null);
  const [showKeramika, setShowKeramika] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [kolicine, setKolicine] = useState<{ [key: number]: string }>({});

  const [keramikaNaziv, setKeramikaNaziv] = useState("");
  const [keramikaKolicina, setKeramikaKolicina] = useState("");

  const [dodatakNaziv, setDodatakNaziv] = useState("");
  const [dodatakJedinica, setDodatakJedinica] = useState("kom");
  const [dodatakKolicina, setDodatakKolicina] = useState("");

  const [slobodniNaziv, setSlobodniNaziv] = useState("");
  const [slobodnaJedinica, setSlobodnaJedinica] = useState("kom");
  const [slobodnaKolicina, setSlobodnaKolicina] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  function sortGroups(data: any[]) {
    return [...data]
      .filter((g) => String(g.naziv || "").toLowerCase() !== "keramika")
      .sort((a, b) => {
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
    setLoading(true);

    const [baustelleRes, roomRes, grupeRes, materijaliRes, roomMaterialRes] =
      await Promise.all([
        supabase
          .from("baustellen")
          .select("*")
          .eq("id", Number(baustelleId))
          .maybeSingle(),

        supabase
          .from("prostorije")
          .select("*")
          .eq("id", Number(roomId))
          .maybeSingle(),

        supabase
          .from("material_groups")
          .select("*")
          .order("sort_order", { ascending: true }),

        supabase
          .from("materials")
          .select("*")
          .order("naziv", { ascending: true }),

        supabase
          .from("room_material")
          .select("*")
          .eq("room_id", Number(roomId))
          .order("id", { ascending: false }),
      ]);

    if (baustelleRes.error) {
      alert("LOAD BAUSTELLE: " + baustelleRes.error.message);
      setLoading(false);
      return;
    }

    if (roomRes.error) {
      alert("LOAD ROOM: " + roomRes.error.message);
      setLoading(false);
      return;
    }

    if (grupeRes.error) {
      alert("LOAD GRUPE: " + grupeRes.error.message);
      setLoading(false);
      return;
    }

    if (materijaliRes.error) {
      alert("LOAD MATERIALS: " + materijaliRes.error.message);
      setLoading(false);
      return;
    }

    if (roomMaterialRes.error) {
      alert("LOAD ROOM MATERIAL: " + roomMaterialRes.error.message);
      setLoading(false);
      return;
    }

    setBaustelle(baustelleRes.data);
    setRoom(roomRes.data);
    setGrupe(sortGroups(grupeRes.data || []));
    setMaterijali(materijaliRes.data || []);
    setRoomMaterial(roomMaterialRes.data || []);

    setLoading(false);
  }

  function getMaterial(materialId: any) {
    if (!materialId) return null;

    return materijali.find((m) => Number(m.id) === Number(materialId)) || null;
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

  function nazivUnosa(unos: any) {
    const customNaziv = cleanText(unos?.custom_naziv);

    if (customNaziv) {
      return customNaziv;
    }

    const material = getMaterial(unos?.material_id);

    const katalogNaziv =
      cleanText(material?.naziv) ||
      cleanText(material?.name) ||
      cleanText(material?.title);

    if (katalogNaziv) {
      return katalogNaziv;
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

  function getGroupCount(groupId: number) {
    return materijali.filter((m) => getMaterialGroupId(m) === Number(groupId))
      .length;
  }

  async function dodajKataloskiMaterijal(material: any) {
    const kolicina = kolicine[material.id];

    if (!kolicina || toNumber(kolicina) <= 0) {
      alert("Unesi količinu.");
      return;
    }

    const { data: existing, error: existingError } = await supabase
      .from("room_material")
      .select("*")
      .eq("room_id", Number(roomId))
      .eq("material_id", Number(material.id))
      .maybeSingle();

    if (existingError) {
      alert("CHECK EXISTING ROOM MATERIAL: " + existingError.message);
      return;
    }

    if (existing) {
      const { error } = await supabase
        .from("room_material")
        .update({
          kolicina: toNumber(existing.kolicina) + toNumber(kolicina),
        })
        .eq("id", existing.id);

      if (error) {
        alert("UPDATE ROOM MATERIAL: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("room_material").insert([
        {
          room_id: Number(roomId),
          material_id: Number(material.id),
          kolicina: toNumber(kolicina),
          custom_naziv: null,
          custom_jedinica: null,
        },
      ]);

      if (error) {
        alert("INSERT ROOM MATERIAL: " + error.message);
        return;
      }
    }

    setKolicine((prev) => ({ ...prev, [material.id]: "" }));

    await loadData();
  }

  async function dodajKeramiku() {
    if (
      !keramikaNaziv.trim() ||
      !keramikaKolicina ||
      toNumber(keramikaKolicina) <= 0
    ) {
      alert("Unesi naziv/format keramike i količinu paketa.");
      return;
    }

    const naziv = `Keramika - ${keramikaNaziv.trim()}`;

    const { error } = await supabase.from("room_material").insert([
      {
        room_id: Number(roomId),
        material_id: null,
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
      alert("Unesi naziv, jedinicu i količinu.");
      return;
    }

    const { error } = await supabase.from("room_material").insert([
      {
        room_id: Number(roomId),
        material_id: null,
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
      alert("Unesi naziv materijala, jedinicu i količinu.");
      return;
    }

    const { error } = await supabase.from("room_material").insert([
      {
        room_id: Number(roomId),
        material_id: null,
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

  async function promijeniKolicinu(
    id: number,
    trenutna: number,
    promjena: number
  ) {
    const novaKolicina = toNumber(trenutna) + promjena;

    if (novaKolicina <= 0) {
      await obrisiMaterijal(id);
      return;
    }

    const { error } = await supabase
      .from("room_material")
      .update({ kolicina: novaKolicina })
      .eq("id", id);

    if (error) {
      alert("UPDATE ROOM MATERIAL: " + error.message);
      return;
    }

    await loadData();
  }

  async function obrisiMaterijal(id: number) {
    const potvrda = confirm("Da li želiš obrisati ovaj materijal?");

    if (!potvrda) return;

    const { error } = await supabase.from("room_material").delete().eq("id", id);

    if (error) {
      alert("DELETE ROOM MATERIAL: " + error.message);
      return;
    }

    await loadData();
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

  const roomTitle = room?.naziv || room?.name || room?.title || `Raum ${roomId}`;
  const baustelleTitle =
    baustelle?.naziv || baustelle?.name || `Baustelle ${baustelleId}`;

  return (
    <main style={styles.page}>
      <Link
        href={`/baustellen/${baustelleId}/prostorije`}
        style={styles.backLink}
      >
        ← Nazad na prostorije
      </Link>

      <h1 style={styles.title}>Materijal u prostoriji</h1>

      <div style={styles.contextText}>
        {baustelleTitle} / {roomTitle}
      </div>

      <section style={styles.freeBox}>
        <h2 style={styles.subtitle}>+ Slobodni materijal</h2>

        <div style={styles.freeGrid}>
          <input
            value={slobodniNaziv}
            onChange={(e) => setSlobodniNaziv(e.target.value)}
            placeholder="Naziv materijala"
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
            placeholder="Količina"
            type="number"
            inputMode="decimal"
            style={styles.input}
          />

          <button onClick={dodajSlobodniMaterijal} style={styles.saveButton}>
            Dodaj
          </button>
        </div>
      </section>

      {!aktivnaGrupa && !showKeramika && (
        <section style={styles.box}>
          <h2 style={styles.subtitle}>Odaberi grupu</h2>

          <div style={styles.mobileHint}>
            Radnik odabere jednu grupu i vidi samo materijale iz te grupe.
          </div>

          <div style={styles.groupGrid}>
            <button onClick={openKeramika} style={styles.groupCardSpecial}>
              <div style={styles.groupIcon}>▧</div>
              <div style={styles.groupName}>Keramika</div>
              <div style={styles.groupCount}>Ručni unos</div>
            </button>

            {grupe.map((g) => (
              <button
                key={g.id}
                onClick={() => openGroup(g)}
                style={styles.groupCard}
              >
                <div style={styles.groupIcon}>{getGroupIcon(g.naziv)}</div>
                <div style={styles.groupName}>{g.naziv}</div>
                <div style={styles.groupCount}>{getGroupCount(g.id)} mat.</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {showKeramika && (
        <section style={styles.box}>
          <button onClick={closeActiveView} style={styles.backButton}>
            ← Nazad na grupe
          </button>

          <h2 style={styles.groupTitle}>Keramika</h2>

          <div style={styles.manualBox}>
            <input
              value={keramikaNaziv}
              onChange={(e) => setKeramikaNaziv(e.target.value)}
              placeholder="Format / naziv keramike"
              style={styles.input}
            />

            <input
              value={keramikaKolicina}
              onChange={(e) => setKeramikaKolicina(e.target.value)}
              placeholder="Količina paketa"
              type="number"
              inputMode="decimal"
              style={styles.input}
            />

            <button onClick={dodajKeramiku} style={styles.saveButton}>
              Dodaj keramiku
            </button>
          </div>
        </section>
      )}

      {aktivnaGrupa && (
        <section style={styles.box}>
          <button onClick={closeActiveView} style={styles.backButton}>
            ← Nazad na grupe
          </button>

          <h2 style={styles.groupTitle}>
            {getGroupIcon(aktivnaGrupa.naziv)} {aktivnaGrupa.naziv}
          </h2>

          {aktivnaGrupa.naziv === "Dodaci" && (
            <div style={styles.manualBox}>
              <input
                value={dodatakNaziv}
                onChange={(e) => setDodatakNaziv(e.target.value)}
                placeholder="Unesi naziv dodatka"
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
                placeholder="Količina"
                type="number"
                inputMode="decimal"
                style={styles.input}
              />

              <button onClick={dodajDodatak} style={styles.saveButton}>
                Dodaj dodatak
              </button>
            </div>
          )}

          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pretraga materijala u ovoj grupi..."
            style={styles.searchInput}
          />

          {loading ? (
            <div style={styles.emptyBox}>Učitavanje...</div>
          ) : materijaliAktivneGrupe.length === 0 ? (
            <div style={styles.emptyBox}>Nema materijala u ovoj grupi.</div>
          ) : (
            <div style={styles.materialList}>
              {materijaliAktivneGrupe.map((m) => (
                <div key={m.id} style={styles.materialRow}>
                  <div style={styles.materialInfo}>
                    <strong>{m.naziv}</strong>
                    <span>{getMaterialUnit(m)}</span>
                  </div>

                  <div style={styles.addInline}>
                    <input
                      value={kolicine[m.id] || ""}
                      onChange={(e) =>
                        setKolicine((prev) => ({
                          ...prev,
                          [m.id]: e.target.value,
                        }))
                      }
                      placeholder="0"
                      type="number"
                      inputMode="decimal"
                      style={styles.qtyInput}
                    />

                    <button
                      onClick={() => dodajKataloskiMaterijal(m)}
                      style={styles.smallSaveButton}
                    >
                      Dodaj
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section style={styles.box}>
        <h2 style={styles.subtitle}>
          Dodani materijali u prostoriji ({roomMaterial.length})
        </h2>

        {roomMaterial.length === 0 ? (
          <div style={styles.emptyBox}>Još nema unesenog materijala.</div>
        ) : (
          <div style={styles.addedList}>
            {roomMaterial.map((unos) => (
              <div key={unos.id} style={styles.addedRow}>
                <div style={styles.addedInfo}>
                  <strong>{nazivUnosa(unos)}</strong>
                  <span>{jedinicaUnosa(unos)}</span>
                </div>

                <div style={styles.qtyControls}>
                  <button
                    onClick={() =>
                      promijeniKolicinu(unos.id, unos.kolicina, -1)
                    }
                    style={styles.minusButton}
                  >
                    −
                  </button>

                  <div style={styles.qtyBadge}>{Number(unos.kolicina || 0)}</div>

                  <button
                    onClick={() =>
                      promijeniKolicinu(unos.id, unos.kolicina, 1)
                    }
                    style={styles.plusButton}
                  >
                    +
                  </button>

                  <button
                    onClick={() => obrisiMaterijal(unos.id)}
                    style={styles.deleteButton}
                  >
                    Obriši
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
    marginTop: "26px",
    marginBottom: "8px",
  },

  contextText: {
    color: "#ddd",
    fontSize: "14px",
    fontWeight: "bold",
    marginBottom: "18px",
  },

  freeBox: {
    border: "1px solid #16a34a",
    borderRadius: "16px",
    padding: "14px",
    marginBottom: "18px",
    background: "#111",
  },

  box: {
    background: "#111",
    borderRadius: "16px",
    padding: "14px",
    marginBottom: "14px",
  },

  subtitle: {
    color: "#3b82f6",
    fontSize: "16px",
    marginTop: 0,
    marginBottom: "12px",
  },

  mobileHint: {
    color: "#aaa",
    fontSize: "12px",
    marginBottom: "12px",
  },

  freeGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
  },

  input: {
    width: "100%",
    background: "#000",
    color: "white",
    border: "1px solid #333",
    padding: "13px",
    borderRadius: "9px",
    fontSize: "16px",
    boxSizing: "border-box",
  },

  searchInput: {
    width: "100%",
    background: "#000",
    color: "white",
    border: "1px solid #333",
    padding: "13px",
    borderRadius: "9px",
    fontSize: "16px",
    marginBottom: "12px",
    boxSizing: "border-box",
  },

  saveButton: {
    width: "100%",
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "9px",
    padding: "14px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  groupGrid: {
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    paddingBottom: "4px",
  },

  groupCard: {
    minWidth: "82px",
    width: "82px",
    minHeight: "74px",
    background: "#222",
    color: "white",
    border: "1px solid #333",
    borderRadius: "10px",
    padding: "7px 5px",
    cursor: "pointer",
    textAlign: "center",
  },

  groupCardSpecial: {
    minWidth: "82px",
    width: "82px",
    minHeight: "74px",
    background: "#172554",
    color: "white",
    border: "1px solid #2563eb",
    borderRadius: "10px",
    padding: "7px 5px",
    cursor: "pointer",
    textAlign: "center",
  },

  groupIcon: {
    fontSize: "18px",
    lineHeight: "20px",
    marginBottom: "3px",
  },

  groupName: {
    fontSize: "11px",
    fontWeight: "bold",
    lineHeight: "13px",
  },

  groupCount: {
    fontSize: "9px",
    color: "#ddd",
    marginTop: "2px",
  },

  backButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "9px",
    padding: "10px 12px",
    fontWeight: "bold",
    cursor: "pointer",
    marginBottom: "12px",
  },

  groupTitle: {
    color: "#f97316",
    fontSize: "24px",
    marginTop: 0,
    marginBottom: "12px",
  },

  manualBox: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
    marginBottom: "12px",
  },

  materialList: {
    display: "grid",
    gap: "8px",
  },

  materialRow: {
    background: "#222",
    borderRadius: "10px",
    padding: "10px",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "10px",
    alignItems: "center",
  },

  materialInfo: {
    display: "grid",
    gap: "4px",
    fontSize: "14px",
  },

  addInline: {
    display: "flex",
    gap: "6px",
    alignItems: "center",
  },

  qtyInput: {
    width: "76px",
    background: "#000",
    color: "white",
    border: "1px solid #333",
    padding: "10px",
    borderRadius: "8px",
    fontSize: "16px",
    boxSizing: "border-box",
  },

  smallSaveButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "10px 12px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  emptyBox: {
    background: "#1a1a1a",
    borderRadius: "10px",
    padding: "14px",
    color: "#ddd",
  },

  addedList: {
    display: "grid",
    gap: "8px",
  },

  addedRow: {
    background: "#222",
    borderRadius: "10px",
    padding: "10px",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "10px",
    alignItems: "center",
  },

  addedInfo: {
    display: "grid",
    gap: "4px",
    fontSize: "14px",
  },

  qtyControls: {
    display: "flex",
    gap: "6px",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  minusButton: {
    background: "#374151",
    color: "white",
    border: "none",
    borderRadius: "8px",
    width: "34px",
    height: "34px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  plusButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "8px",
    width: "34px",
    height: "34px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  qtyBadge: {
    minWidth: "54px",
    textAlign: "center",
    background: "#000",
    border: "1px solid #333",
    borderRadius: "8px",
    padding: "8px",
    fontWeight: "bold",
  },

  deleteButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "9px 10px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};