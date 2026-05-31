"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";

export default function RoomMaterialPage() {
  const params = useParams();

  const baustelleId = params.id as string;
  const roomId = params.roomId as string;

  const [grupe, setGrupe] = useState<any[]>([]);
  const [materijali, setMaterijali] = useState<any[]>([]);
  const [roomMaterial, setRoomMaterial] = useState<any[]>([]);
  const [kolicine, setKolicine] = useState<{ [key: number]: string }>({});

  async function loadData() {
    const { data: grupeData } = await supabase
      .from("material_groups")
      .select("*")
      .order("naziv", { ascending: true });

    const { data: materijaliData, error: materijaliError } = await supabase
      .from("materials")
      .select("*")
      .order("naziv", { ascending: true });

    const { data: roomData } = await supabase
      .from("room_material")
      .select("*")
      .eq("room_id", roomId)
      .order("id", { ascending: false });

    if (materijaliError) {
      alert("MATERIALS ERROR: " + materijaliError.message);
      return;
    }

    setGrupe(grupeData || []);
    setMaterijali(materijaliData || []);
    setRoomMaterial(roomData || []);
  }

  function getMaterial(materialId: number) {
    return materijali.find((m) => Number(m.id) === Number(materialId));
  }

  function setKolicina(materialId: number, value: string) {
    setKolicine((prev) => ({
      ...prev,
      [materialId]: value,
    }));
  }

  async function sacuvajSveKolicine() {
    const unosi = Object.entries(kolicine).filter(
      ([_, value]) => value && Number(value) > 0
    );

    if (unosi.length === 0) {
      alert("Unesi barem jednu količinu");
      return;
    }

    for (const [materialId, value] of unosi) {
      const { data: existing } = await supabase
        .from("room_material")
        .select("*")
        .eq("room_id", roomId)
        .eq("material_id", Number(materialId))
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("room_material")
          .update({
            kolicina: Number(existing.kolicina) + Number(value),
          })
          .eq("id", existing.id);

        if (error) {
          alert("UPDATE: " + error.message);
          return;
        }
      } else {
        const { error } = await supabase.from("room_material").insert([
          {
            room_id: Number(roomId),
            material_id: Number(materialId),
            kolicina: Number(value),
          },
        ]);

        if (error) {
          alert("INSERT: " + error.message);
          return;
        }
      }
    }

    setKolicine({});
    await loadData();
  }

  async function promijeniKolicinu(id: number, trenutna: number, promjena: number) {
    const novaKolicina = Number(trenutna) + promjena;

    if (novaKolicina <= 0) {
      await obrisiMaterijal(id);
      return;
    }

    const { error } = await supabase
      .from("room_material")
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
      .from("room_material")
      .delete()
      .eq("id", id);

    if (error) {
      alert("DELETE: " + error.message);
      return;
    }

    await loadData();
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <main style={styles.page}>
      <Link
        href={`/baustellen/${baustelleId}/prostorije/${roomId}`}
        style={styles.backLink}
      >
        ← Nazad na prostoriju
      </Link>

      <h1 style={styles.title}>Materijal prostorije</h1>

      <section style={styles.box}>
        {grupe.length > 0 ? (
          grupe.map((g) => {
            const materijaliGrupe = materijali.filter(
              (m) => String(m.group_id) === String(g.id)
            );

            return (
              <div key={g.id} style={styles.groupBox}>
                <h2 style={styles.groupTitle}>{g.naziv}</h2>

                {materijaliGrupe.map((m) => (
                  <div key={m.id} style={styles.materialRow}>
                    <div>
                      <strong>{m.naziv}</strong>
                      <div style={styles.smallText}>{m.jedinica}</div>
                    </div>

                    <input
                      type="number"
                      placeholder="0"
                      value={kolicine[m.id] || ""}
                      onChange={(e) => setKolicina(m.id, e.target.value)}
                      style={styles.quantityInput}
                    />
                  </div>
                ))}
              </div>
            );
          })
        ) : (
          <div style={styles.groupBox}>
            <h2 style={styles.groupTitle}>Svi materijali</h2>

            {materijali.map((m) => (
              <div key={m.id} style={styles.materialRow}>
                <div>
                  <strong>{m.naziv}</strong>
                  <div style={styles.smallText}>{m.jedinica}</div>
                </div>

                <input
                  type="number"
                  placeholder="0"
                  value={kolicine[m.id] || ""}
                  onChange={(e) => setKolicina(m.id, e.target.value)}
                  style={styles.quantityInput}
                />
              </div>
            ))}
          </div>
        )}

        <button onClick={sacuvajSveKolicine} style={styles.saveButton}>
          Sačuvaj sve unesene količine
        </button>
      </section>

      <section style={styles.box}>
        <h2>Materijal u prostoriji ({roomMaterial.length})</h2>

        {roomMaterial.map((m) => {
          const material = getMaterial(m.material_id);

          return (
            <div key={m.id} style={styles.savedCard}>
              <strong>{material?.naziv || "Nepoznat materijal"}</strong>

              <div style={styles.savedQuantity}>
                {m.kolicina} {material?.jedinica || ""}
              </div>

              <div style={styles.buttonRow}>
                <button onClick={() => promijeniKolicinu(m.id, m.kolicina, 1)} style={styles.plusButton}>
                  +
                </button>

                <button onClick={() => promijeniKolicinu(m.id, m.kolicina, -1)} style={styles.minusButton}>
                  -
                </button>

                <button onClick={() => obrisiMaterijal(m.id)} style={styles.deleteButton}>
                  Obriši
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}

const styles: any = {
  page: { background: "#000", minHeight: "100vh", color: "white", padding: "30px" },
  backLink: { color: "#3b82f6", textDecoration: "none", fontWeight: "bold" },
  title: { fontSize: "56px", fontWeight: "bold", marginTop: "25px", marginBottom: "30px" },
  box: { background: "#111", padding: "20px", borderRadius: "20px", marginBottom: "30px" },
  groupBox: { background: "#1a1a1a", padding: "18px", borderRadius: "16px", marginBottom: "18px" },
  groupTitle: { color: "#60a5fa", marginBottom: "15px" },
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
  smallText: { color: "#aaa", marginTop: "5px" },
  quantityInput: {
    width: "120px",
    padding: "14px",
    borderRadius: "8px",
    border: "1px solid #333",
    background: "#000",
    color: "white",
    fontSize: "18px",
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
  savedCard: { background: "#222", padding: "18px", borderRadius: "14px", marginTop: "15px" },
  savedQuantity: { marginTop: "8px", marginBottom: "12px" },
  buttonRow: { display: "flex", gap: "10px" },
  plusButton: { background: "#16a34a", color: "white", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  minusButton: { background: "#f59e0b", color: "white", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  deleteButton: { background: "#dc2626", color: "white", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
};