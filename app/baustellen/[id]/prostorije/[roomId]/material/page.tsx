"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";

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
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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
  const [dodaniMaterijali, setDodaniMaterijali] = useState<any[]>([]);

  const [aktivnaGrupa, setAktivnaGrupa] = useState<any | null>(null);
  const [showKeramika, setShowKeramika] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [entryTable, setEntryTable] = useState("room_material");
  const [entryMode, setEntryMode] = useState<"room" | "baustelle_room" | "baustelle_only">("room");

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

  async function loadDodaniMaterijali(materijaliData: any[]) {
    // Prvo pokušava staru/pravu tabelu za prostoriju: room_material.
    let res = await supabase
      .from("room_material")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .eq("room_id", Number(roomId))
      .order("id", { ascending: false });

    if (!res.error) {
      setEntryTable("room_material");
      setEntryMode("room");
      setDodaniMaterijali(res.data || []);
      return;
    }

    // Ako nema room_material tabele, pokušava baustelle_material sa room_id kolonom.
    res = await supabase
      .from("baustelle_material")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .eq("room_id", Number(roomId))
      .order("id", { ascending: false });

    if (!res.error) {
      setEntryTable("baustelle_material");
      setEntryMode("baustelle_room");
      setDodaniMaterijali(res.data || []);
      return;
    }

    // Zadnji fallback: stara tabela bez room_id. Ovo će prikazati sve materijale za gradilište.
    const fallback = await supabase
      .from("baustelle_material")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("id", { ascending: false });

    if (fallback.error) {
      alert("LOAD DODANI MATERIJALI: " + fallback.error.message);
      setDodaniMaterijali([]);
      return;
    }

    setEntryTable("baustelle_material");
    setEntryMode("baustelle_only");
    setDodaniMaterijali(fallback.data || []);
  }

  async function loadData() {
    setLoading(true);

    const [baustelleRes, roomRes, grupeRes, materijaliRes] = await Promise.all([
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

    const materialsData = materijaliRes.data || [];

    setBaustelle(baustelleRes.data);
    setRoom(roomRes.data);
    setGrupe(sortGroups(grupeRes.data || []));
    setMaterijali(materialsData);

    await loadDodaniMaterijali(materialsData);
    setLoading(false);
  }

  function getMaterial(materialId: number) {
    return materijali.find((m) => Number(m.id) === Number(materialId));
  }

  function getMaterialUnit(material: any) {
    return material?.jedinica || material?.unit || material?.einheit || "";
  }

  function getMaterialGroupId(material: any) {
    return Number(material?.group_id ?? material?.gruppe_id ?? material?.material_group_id ?? 0);
  }

  const materijaliAktivneGrupe = useMemo(() => {
    if (!aktivnaGrupa) return [];

    const term = searchTerm.trim().toLowerCase();

    return materijali
      .filter((m) => getMaterialGroupId(m) === Number(aktivnaGrupa.id))
      .filter((m) => {
        if (!term) return true;
        return String(m.naziv || "").toLowerCase().includes(term);
      });
  }, [aktivnaGrupa, materijali, searchTerm]);

  function baseEntryPayload() {
    const base: any = {
      baustelle_id: Number(baustelleId),
    };

    if (entryMode === "room" || entryMode === "baustelle_room") {
      base.room_id = Number(roomId);
    }

    return base;
  }

  async function insertEntry(payload: any) {
    const finalPayload = {
      ...baseEntryPayload(),
      ...payload,
    };

    let { error } = await supabase.from(entryTable).insert([finalPayload]);

    // Ako tabela ne podržava room_id, pokušaj bez room_id.
    if (error && String(error.message || "").toLowerCase().includes("room_id")) {
      const withoutRoom = { ...finalPayload };
      delete withoutRoom.room_id;
      const retry = await supabase.from(entryTable).insert([withoutRoom]);
      error = retry.error;
    }

    return error;
  }

  async function findExistingEntry(materialId: number) {
    let query = supabase
      .from(entryTable)
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .eq("material_id", Number(materialId));

    if (entryMode === "room" || entryMode === "baustelle_room") {
      query = query.eq("room_id", Number(roomId));
    }

    let { data, error } = await query.maybeSingle();

    if (error && String(error.message || "").toLowerCase().includes("room_id")) {
      const retry = await supabase
        .from(entryTable)
        .select("*")
        .eq("baustelle_id", Number(baustelleId))
        .eq("material_id", Number(materialId))
        .maybeSingle();

      data = retry.data;
      error = retry.error;
    }

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async function dodajKataloskiMaterijal(material: any) {
    const kolicina = kolicine[material.id];

    if (!kolicina || Number(kolicina) <= 0) {
      alert("Unesi količinu.");
      return;
    }

    try {
      const existing = await findExistingEntry(Number(material.id));

      if (existing) {
        const { error } = await supabase
          .from(entryTable)
          .update({
            kolicina: toNumber(existing.kolicina) + Number(kolicina),
          })
          .eq("id", existing.id);

        if (error) {
          alert("UPDATE: " + error.message);
          return;
        }
      } else {
        const error = await insertEntry({
          material_id: Number(material.id),
          materijal: material.naziv,
          kolicina: Number(kolicina),
        });

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
    } catch (err: any) {
      alert("CHECK EXISTING: " + err.message);
    }
  }

  async function dodajKeramiku() {
    if (!keramikaNaziv || !keramikaKolicina || Number(keramikaKolicina) <= 0) {
      alert("Unesi naziv/format keramike i količinu paketa.");
      return;
    }

    const naziv = `Keramika - ${keramikaNaziv.trim()}`;

    const error = await insertEntry({
      material_id: null,
      materijal: naziv,
      kolicina: Number(keramikaKolicina),
      custom_naziv: naziv,
      custom_jedinica: "paket",
    });

    if (error) {
      alert("INSERT KERAMIKA: " + error.message);
      return;
    }

    setKeramikaNaziv("");
    setKeramikaKolicina("");
    await loadData();
  }

  async function dodajDodatak() {
    if (!dodatakNaziv || !dodatakJedinica || !dodatakKolicina || Number(dodatakKolicina) <= 0) {
      alert("Unesi naziv, jedinicu i količinu.");
      return;
    }

    const error = await insertEntry({
      material_id: null,
      materijal: dodatakNaziv.trim(),
      kolicina: Number(dodatakKolicina),
      custom_naziv: dodatakNaziv.trim(),
      custom_jedinica: dodatakJedinica,
    });

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
    if (!slobodniNaziv || !slobodnaJedinica || !slobodnaKolicina || Number(slobodnaKolicina) <= 0) {
      alert("Unesi naziv materijala, jedinicu i količinu.");
      return;
    }

    const error = await insertEntry({
      material_id: null,
      materijal: slobodniNaziv.trim(),
      kolicina: Number(slobodnaKolicina),
      custom_naziv: slobodniNaziv.trim(),
      custom_jedinica: slobodnaJedinica,
    });

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
      await obrisiMaterijal(id, true);
      return;
    }

    const { error } = await supabase
      .from(entryTable)
      .update({ kolicina: novaKolicina })
      .eq("id", id);

    if (error) {
      alert("UPDATE: " + error.message);
      return;
    }

    await loadData();
  }

  async function setKolicinaDirektno(id: number, value: string) {
    const novaKolicina = Number(value);

    if (!Number.isFinite(novaKolicina) || novaKolicina < 0) return;

    if (novaKolicina === 0) {
      await obrisiMaterijal(id, true);
      return;
    }

    const { error } = await supabase
      .from(entryTable)
      .update({ kolicina: novaKolicina })
      .eq("id", id);

    if (error) {
      alert("UPDATE: " + error.message);
      return;
    }

    await loadData();
  }

  async function obrisiMaterijal(id: number, skipConfirm = false) {
    if (!skipConfirm) {
      const potvrda = confirm("Da li želiš obrisati ovaj materijal?");
      if (!potvrda) return;
    }

    const { error } = await supabase
      .from(entryTable)
      .delete()
      .eq("id", id);

    if (error) {
      alert("DELETE: " + error.message);
      return;
    }

    await loadData();
  }

  function nazivUnosa(unos: any) {
    if (unos.custom_naziv) return unos.custom_naziv;
    if (unos.materijal) return unos.materijal;

    const material = getMaterial(unos.material_id);
    return material ? material.naziv : "Nepoznat materijal";
  }

  function jedinicaUnosa(unos: any) {
    if (unos.custom_jedinica) return unos.custom_jedinica;

    const material = getMaterial(unos.material_id);
    return material ? getMaterialUnit(material) : "";
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
        ← Nazad na Baustelle
      </Link>

      <h1 style={styles.title}>Materijal u prostoriji</h1>

      <div style={styles.roomInfo}>
        <strong>{baustelle?.naziv || "Baustelle"}</strong>
        <span> / </span>
        <strong>{room?.naziv || "Prostorija"}</strong>
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
                  <div style={styles.groupName}>{g.naziv}</div>
                  <div style={styles.groupCount}>{broj} mat.</div>
                </button>
              );
            })}
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
            placeholder="Pretraga materijala u grupi..."
            style={styles.searchInput}
          />

          {materijaliAktivneGrupe.length === 0 ? (
            <div style={styles.emptyBox}>Nema materijala u ovoj grupi.</div>
          ) : (
            <div style={styles.materialList}>
              {materijaliAktivneGrupe.map((m) => (
                <div key={m.id} style={styles.materialRow}>
                  <div style={styles.materialInfo}>
                    <strong>{m.naziv}</strong>
                    <span>{getMaterialUnit(m)}</span>
                  </div>

                  <input
                    type="number"
                    value={kolicine[m.id] || ""}
                    onChange={(e) =>
                      setKolicine((prev) => ({
                        ...prev,
                        [m.id]: e.target.value,
                      }))
                    }
                    placeholder="0"
                    style={styles.qtyInput}
                  />

                  <button
                    onClick={() => dodajKataloskiMaterijal(m)}
                    style={styles.addButton}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section style={styles.box}>
        <h2 style={styles.subtitle}>
          Dodani materijali u prostoriji ({dodaniMaterijali.length})
        </h2>

        {loading ? (
          <div style={styles.emptyBox}>Učitavanje...</div>
        ) : dodaniMaterijali.length === 0 ? (
          <div style={styles.emptyBox}>Još nema unesenog materijala.</div>
        ) : (
          <div style={styles.addedList}>
            {dodaniMaterijali.map((unos) => (
              <div key={unos.id} style={styles.addedRow}>
                <div style={styles.addedInfo}>
                  <strong>{nazivUnosa(unos)}</strong>
                  <span>{jedinicaUnosa(unos)}</span>
                </div>

                <div style={styles.addedActions}>
                  <button
                    onClick={() => promijeniKolicinu(unos.id, unos.kolicina, -1)}
                    style={styles.minusButton}
                  >
                    -
                  </button>

                  <input
                    type="number"
                    value={String(unos.kolicina ?? 0)}
                    onChange={(e) => setKolicinaDirektno(unos.id, e.target.value)}
                    style={styles.addedQtyInput}
                  />

                  <button
                    onClick={() => promijeniKolicinu(unos.id, unos.kolicina, 1)}
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
    padding: "14px",
    paddingBottom: "40px",
  },
  backLink: {
    color: "#3b82f6",
    textDecoration: "none",
    fontWeight: "bold",
    fontSize: "13px",
  },
  title: {
    fontSize: "30px",
    fontWeight: "bold",
    marginTop: "24px",
    marginBottom: "8px",
  },
  roomInfo: {
    color: "#bbb",
    marginBottom: "18px",
    fontSize: "14px",
  },
  freeBox: {
    background: "#111",
    border: "1px solid #16a34a",
    borderRadius: "14px",
    padding: "12px",
    marginBottom: "14px",
  },
  box: {
    background: "#111",
    border: "1px solid #1f1f1f",
    borderRadius: "14px",
    padding: "12px",
    marginBottom: "14px",
  },
  subtitle: {
    color: "#60a5fa",
    fontSize: "15px",
    marginTop: 0,
    marginBottom: "10px",
  },
  mobileHint: {
    color: "#bbb",
    fontSize: "11px",
    marginBottom: "10px",
  },
  freeGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "8px",
  },
  input: {
    width: "100%",
    background: "#000",
    color: "white",
    border: "1px solid #333",
    padding: "11px",
    borderRadius: "8px",
    fontSize: "15px",
  },
  searchInput: {
    width: "100%",
    background: "#000",
    color: "white",
    border: "1px solid #333",
    padding: "11px",
    borderRadius: "8px",
    fontSize: "15px",
    marginBottom: "10px",
  },
  saveButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px 14px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  backButton: {
    background: "#222",
    color: "#60a5fa",
    border: "1px solid #333",
    borderRadius: "8px",
    padding: "9px 12px",
    cursor: "pointer",
    fontWeight: "bold",
    marginBottom: "10px",
  },
  groupTitle: {
    color: "#fff",
    marginTop: "4px",
    marginBottom: "12px",
    fontSize: "22px",
  },
  groupGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))",
    gap: "8px",
  },
  groupCard: {
    background: "#222",
    color: "white",
    border: "1px solid #333",
    borderRadius: "10px",
    minHeight: "74px",
    padding: "8px 5px",
    cursor: "pointer",
    textAlign: "center",
  },
  groupCardSpecial: {
    background: "#172554",
    color: "white",
    border: "1px solid #2563eb",
    borderRadius: "10px",
    minHeight: "74px",
    padding: "8px 5px",
    cursor: "pointer",
    textAlign: "center",
  },
  groupIcon: {
    fontSize: "17px",
    lineHeight: "1",
    marginBottom: "5px",
  },
  groupName: {
    fontSize: "11px",
    fontWeight: "bold",
    lineHeight: "1.15",
    wordBreak: "break-word",
  },
  groupCount: {
    color: "#bbb",
    fontSize: "10px",
    marginTop: "4px",
  },
  manualBox: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "8px",
    marginBottom: "12px",
  },
  materialList: {
    display: "grid",
    gap: "8px",
  },
  materialRow: {
    background: "#202020",
    borderRadius: "10px",
    padding: "10px",
    display: "grid",
    gridTemplateColumns: "1fr 82px 42px",
    gap: "8px",
    alignItems: "center",
  },
  materialInfo: {
    display: "grid",
    gap: "4px",
    fontSize: "13px",
  },
  qtyInput: {
    background: "#000",
    color: "white",
    border: "1px solid #333",
    borderRadius: "8px",
    padding: "10px",
    width: "100%",
    fontSize: "16px",
    textAlign: "center",
  },
  addButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "10px 0",
    fontWeight: "bold",
    fontSize: "18px",
    cursor: "pointer",
  },
  emptyBox: {
    background: "#1b1b1b",
    color: "#bbb",
    borderRadius: "10px",
    padding: "14px",
    fontSize: "14px",
  },
  addedList: {
    display: "grid",
    gap: "8px",
  },
  addedRow: {
    background: "#202020",
    borderRadius: "10px",
    padding: "10px",
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
  },
  addedInfo: {
    display: "grid",
    gap: "4px",
    fontSize: "14px",
  },
  addedActions: {
    display: "grid",
    gridTemplateColumns: "42px 1fr 42px 80px",
    gap: "8px",
    alignItems: "center",
  },
  addedQtyInput: {
    background: "#000",
    color: "white",
    border: "1px solid #333",
    borderRadius: "8px",
    padding: "10px",
    width: "100%",
    fontSize: "16px",
    textAlign: "center",
  },
  minusButton: {
    background: "#475569",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "10px 0",
    fontWeight: "bold",
    cursor: "pointer",
  },
  plusButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "10px 0",
    fontWeight: "bold",
    cursor: "pointer",
  },
  deleteButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "10px 6px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "12px",
  },
};
