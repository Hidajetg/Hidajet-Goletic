"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

const REDOSLIJED_GRUPA = [
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
];

export default function BaustelleMaterialPage() {
  const params = useParams();
  const baustelleId = String(params.id);

  const [grupe, setGrupe] = useState<any[]>([]);
  const [materijali, setMaterijali] = useState<any[]>([]);
  const [baustelleMaterijal, setBaustelleMaterijal] = useState<any[]>([]);
  const [aktivnaGrupa, setAktivnaGrupa] = useState<any | null>(null);

  const [kolicine, setKolicine] = useState<{ [key: number]: string }>({});

  const [keramikaNaziv, setKeramikaNaziv] = useState("");
  const [keramikaKolicina, setKeramikaKolicina] = useState("");

  const [dodatakNaziv, setDodatakNaziv] = useState("");
  const [dodatakJedinica, setDodatakJedinica] = useState("kom");
  const [dodatakKolicina, setDodatakKolicina] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  function sortirajGrupe(data: any[]) {
    return [...data].sort((a, b) => {
      const indexA = REDOSLIJED_GRUPA.indexOf(a.naziv);
      const indexB = REDOSLIJED_GRUPA.indexOf(b.naziv);

      if (indexA === -1 && indexB === -1) {
        return a.naziv.localeCompare(b.naziv);
      }

      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });
  }

  async function loadData() {
    const grupeRes = await supabase.from("material_groups").select("*");
    const materijaliRes = await supabase.from("materials").select("*").order("id");

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

    setGrupe(sortirajGrupe(grupeRes.data || []));
    setMaterijali(materijaliRes.data || []);
    setBaustelleMaterijal(baustelleMaterijalRes.data || []);
  }

  function getMaterial(materialId: number) {
    return materijali.find((m) => Number(m.id) === Number(materialId));
  }

  function materijaliAktivneGrupe() {
    if (!aktivnaGrupa) return [];

    return materijali.filter(
      (m) => Number(m.group_id) === Number(aktivnaGrupa.id)
    );
  }

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

    const naziv = `Keramika - ${keramikaNaziv}`;

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
    if (!dodatakNaziv || !dodatakJedinica || !dodatakKolicina || Number(dodatakKolicina) <= 0) {
      alert("Unesi naziv, jedinicu i količinu.");
      return;
    }

    const { error } = await supabase.from("baustelle_material").insert([
      {
        baustelle_id: Number(baustelleId),
        material_id: null,
        materijal: dodatakNaziv,
        kolicina: Number(dodatakKolicina),
        custom_naziv: dodatakNaziv,
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

  return (
    <main style={styles.page}>
      <Link href={`/baustellen/${baustelleId}`} style={styles.backLink}>
        ← Nazad na Baustelle
      </Link>

      <h1 style={styles.title}>Materijal gradilišta</h1>

      {!aktivnaGrupa && (
        <section style={styles.box}>
          <h2 style={styles.subtitle}>Odaberi grupu</h2>

          <div style={styles.groupGrid}>
            {grupe.map((g) => {
              const broj = materijali.filter(
                (m) => Number(m.group_id) === Number(g.id)
              ).length;

              return (
                <button
                  key={g.id}
                  onClick={() => setAktivnaGrupa(g)}
                  style={styles.groupCard}
                >
                  <div style={styles.groupName}>{g.naziv}</div>
                  <div style={styles.groupCount}>
                    {g.naziv === "Keramika"
                      ? "Ručni unos"
                      : g.naziv === "Dodaci"
                      ? "Ručni unos"
                      : `${broj} materijala`}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {aktivnaGrupa && (
        <section style={styles.box}>
          <button onClick={() => setAktivnaGrupa(null)} style={styles.backButton}>
            ← Nazad na grupe
          </button>

          <h2 style={styles.groupTitle}>{aktivnaGrupa.naziv}</h2>

          {aktivnaGrupa.naziv === "Keramika" && (
            <div style={styles.manualBox}>
              <input
                value={keramikaNaziv}
                onChange={(e) => setKeramikaNaziv(e.target.value)}
                placeholder="Unesi format / naziv keramike"
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
          )}

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
                <option value="kom">kom</option>
                <option value="m">m</option>
                <option value="m²">m²</option>
                <option value="kg">kg</option>
                <option value="vreća">vreća</option>
                <option value="rola">rola</option>
                <option value="paket">paket</option>
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

          {aktivnaGrupa.naziv !== "Keramika" && aktivnaGrupa.naziv !== "Dodaci" && (
            <div>
              {materijaliAktivneGrupe().map((m) => (
                <div key={m.id} style={styles.materialRow}>
                  <div>
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
          Lista materijala za gradilište ({baustelleMaterijal.length})
        </h2>

        {baustelleMaterijal.length === 0 && (
          <p style={styles.emptyText}>Još nema unesenog materijala.</p>
        )}

        {baustelleMaterijal.map((m) => (
          <div key={m.id} style={styles.savedCard}>
            <strong>{nazivUnosa(m)}</strong>

            <div style={styles.savedQuantity}>
              {m.kolicina} {jedinicaUnosa(m)}
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
    padding: "30px",
  },
  backLink: {
    color: "#3b82f6",
    textDecoration: "none",
    fontWeight: "bold",
  },
  title: {
    fontSize: "56px",
    fontWeight: "bold",
    marginTop: "25px",
    marginBottom: "30px",
  },
  box: {
    background: "#111",
    padding: "20px",
    borderRadius: "20px",
    marginBottom: "30px",
  },
  subtitle: {
    marginBottom: "20px",
  },
  groupGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
    gap: "15px",
  },
  groupCard: {
    background: "#1f1f1f",
    color: "white",
    border: "1px solid #333",
    borderRadius: "16px",
    padding: "22px",
    textAlign: "left",
    cursor: "pointer",
  },
  groupName: {
    fontSize: "22px",
    fontWeight: "bold",
    marginBottom: "8px",
  },
  groupCount: {
    color: "#aaa",
  },
  backButton: {
    background: "#222",
    color: "#60a5fa",
    border: "1px solid #333",
    padding: "12px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
    marginBottom: "20px",
  },
  groupTitle: {
    color: "#60a5fa",
    marginBottom: "20px",
    fontSize: "32px",
  },
  manualBox: {
    background: "#1a1a1a",
    padding: "18px",
    borderRadius: "16px",
  },
  input: {
    width: "100%",
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid #333",
    background: "#000",
    color: "white",
    fontSize: "16px",
    marginBottom: "12px",
  },
  materialRow: {
    background: "#222",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "10px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
  },
  smallText: {
    color: "#aaa",
    marginTop: "5px",
  },
  addArea: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  quantityInput: {
    width: "110px",
    padding: "14px",
    borderRadius: "8px",
    border: "1px solid #333",
    background: "#000",
    color: "white",
    fontSize: "18px",
  },
  addButton: {
    background: "#16a34a",
    color: "white",
    padding: "14px 18px",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  saveButton: {
    background: "#16a34a",
    color: "white",
    padding: "16px 25px",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px",
  },
  emptyText: {
    color: "#999",
  },
  savedCard: {
    background: "#222",
    padding: "18px",
    borderRadius: "14px",
    marginTop: "15px",
  },
  savedQuantity: {
    marginTop: "10px",
    color: "#ddd",
  },
  buttonRow: {
    display: "flex",
    gap: "10px",
    marginTop: "15px",
  },
  plusButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  minusButton: {
    background: "#f59e0b",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  deleteButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};