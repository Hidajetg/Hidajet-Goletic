"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

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

export default function BaustelleMaterialPage() {
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

  function getMaterial(materialId: number) {
    return materijali.find((m) => Number(m.id) === Number(materialId));
  }

  const materijaliAktivneGrupe = useMemo(() => {
    if (!aktivnaGrupa) return [];

    const term = searchTerm.trim().toLowerCase();

    return materijali
      .filter((m) => Number(m.group_id) === Number(aktivnaGrupa.id))
      .filter((m) => {
        if (!term) return true;
        return String(m.naziv || "").toLowerCase().includes(term);
      });
  }, [aktivnaGrupa, materijali, searchTerm]);

  async function dodajKataloskiMaterijal(material: any) {
    const kolicina = kolicine[material.id];

    if (!kolicina || Number(kolicina) <= 0) {
      alert("Unesi količinu.");
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
          kolicina: Number(existing.kolicina) + Number(kolicina),
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
          materijal: material.naziv,
          kolicina: Number(kolicina),
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
    if (!keramikaNaziv || !keramikaKolicina || Number(keramikaKolicina) <= 0) {
      alert("Unesi naziv/format keramike i količinu paketa.");
      return;
    }

    const naziv = `Keramika - ${keramikaNaziv.trim()}`;

    const { error } = await supabase.from("baustelle_material").insert([
      {
        baustelle_id: Number(baustelleId),
        material_id: null,
        materijal: naziv,
        kolicina: Number(keramikaKolicina),
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
      !dodatakNaziv ||
      !dodatakJedinica ||
      !dodatakKolicina ||
      Number(dodatakKolicina) <= 0
    ) {
      alert("Unesi naziv, jedinicu i količinu.");
      return;
    }

    const { error } = await supabase.from("baustelle_material").insert([
      {
        baustelle_id: Number(baustelleId),
        material_id: null,
        materijal: dodatakNaziv.trim(),
        kolicina: Number(dodatakKolicina),
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
      !slobodniNaziv ||
      !slobodnaJedinica ||
      !slobodnaKolicina ||
      Number(slobodnaKolicina) <= 0
    ) {
      alert("Unesi naziv materijala, jedinicu i količinu.");
      return;
    }

    const { error } = await supabase.from("baustelle_material").insert([
      {
        baustelle_id: Number(baustelleId),
        material_id: null,
        materijal: slobodniNaziv.trim(),
        kolicina: Number(slobodnaKolicina),
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
    const novaKolicina = Number(trenutna) + promjena;

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
    const potvrda = confirm("Da li želiš obrisati ovaj materijal?");
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
    if (unos.custom_naziv) return unos.custom_naziv;
    if (unos.materijal) return unos.materijal;

    const material = getMaterial(unos.material_id);
    return material ? material.naziv : "Nepoznat materijal";
  }

  function jedinicaUnosa(unos: any) {
    if (unos.custom_jedinica) return unos.custom_jedinica;

    const material = getMaterial(unos.material_id);
    return material ? material.jedinica : "";
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

      <h1 style={styles.title}>Materijal gradilišta</h1>

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
                (m) => Number(m.group_id) === Number(g.id)
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

          {aktivnaGrupa.naziv !== "Dodaci" && (
            <>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pretraga u ovoj grupi..."
                style={styles.searchInput}
              />

              {materijaliAktivneGrupe.length === 0 ? (
                <div style={styles.emptyText}>Nema materijala u ovoj grupi.</div>
              ) : (
                <div style={styles.materialList}>
                  {materijaliAktivneGrupe.map((m) => (
                    <div key={m.id} style={styles.materialRow}>
                      <div style={styles.materialTextBox}>
                        <strong>{m.naziv}</strong>
                        <div style={styles.smallText}>{m.jedinica}</div>
                      </div>

                      <div style={styles.addArea}>
                        <input
                          type="number"
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
          Lista materijala za gradilište ({baustelleMaterijal.length})
        </h2>

        {baustelleMaterijal.length === 0 && (
          <p style={styles.emptyText}>Još nema unesenog materijala.</p>
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
                Obriši
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
