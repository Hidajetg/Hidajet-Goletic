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

  const [slobodniNaziv, setSlobodniNaziv] = useState("");
  const [slobodnaJedinica, setSlobodnaJedinica] = useState("Stk.");
  const [slobodnaKolicina, setSlobodnaKolicina] = useState("");

  function playNotificationSound() {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 1;
    audio.play().catch(() => {});
  }

  async function loadData() {
    const { data: grupeData, error: grupeError } = await supabase
      .from("material_groups")
      .select("*")
      .order("naziv", { ascending: true });

    if (grupeError) {
      alert("FEHLER GRUPPEN: " + grupeError.message);
      return;
    }

    const { data: materijaliData, error: materijaliError } = await supabase
      .from("materials")
      .select("*")
      .order("naziv", { ascending: true });

    if (materijaliError) {
      alert("FEHLER MATERIALIEN: " + materijaliError.message);
      return;
    }

    const { data: roomData, error: roomError } = await supabase
      .from("room_material")
      .select("*")
      .eq("room_id", Number(roomId))
      .order("id", { ascending: false });

    if (roomError) {
      alert("FEHLER RAUM-MATERIAL: " + roomError.message);
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
      alert("Bitte mindestens eine Menge eingeben.");
      return;
    }

    for (const [materialId, value] of unosi) {
      const { data: existing, error: existingError } = await supabase
        .from("room_material")
        .select("*")
        .eq("room_id", Number(roomId))
        .eq("material_id", Number(materialId))
        .maybeSingle();

      if (existingError) {
        alert("PRÜFEN: " + existingError.message);
        return;
      }

      if (existing) {
        const { error } = await supabase
          .from("room_material")
          .update({
            kolicina: Number(existing.kolicina) + Number(value),
          })
          .eq("id", existing.id);

        if (error) {
          alert("AKTUALISIEREN: " + error.message);
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
          alert("EINFÜGEN: " + error.message);
          return;
        }
      }
    }

    playNotificationSound();

    setKolicine({});
    await loadData();
  }

  async function dodajSlobodniMaterijal() {
    if (
      !slobodniNaziv.trim() ||
      !slobodnaJedinica ||
      !slobodnaKolicina ||
      Number(slobodnaKolicina) <= 0
    ) {
      alert("Bitte Materialname, Einheit und Menge eingeben.");
      return;
    }

    const dodaciGrupa = grupe.find(
      (g) => String(g.naziv).toLowerCase() === "dodaci"
    );

    const { data: noviMaterijal, error: materialError } = await supabase
      .from("materials")
      .insert([
        {
          naziv: slobodniNaziv.trim(),
          jedinica: slobodnaJedinica,
          group_id: dodaciGrupa ? Number(dodaciGrupa.id) : null,
        },
      ])
      .select()
      .single();

    if (materialError) {
      alert("MATERIAL ERSTELLEN: " + materialError.message);
      return;
    }

    if (!noviMaterijal?.id) {
      alert("Material wurde nicht erstellt.");
      return;
    }

    const { error: roomMaterialError } = await supabase
      .from("room_material")
      .insert([
        {
          room_id: Number(roomId),
          material_id: Number(noviMaterijal.id),
          kolicina: Number(slobodnaKolicina),
        },
      ]);

    if (roomMaterialError) {
      alert("FREIES MATERIAL EINFÜGEN: " + roomMaterialError.message);
      return;
    }

    playNotificationSound();

    setSlobodniNaziv("");
    setSlobodnaJedinica("Stk.");
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
      .from("room_material")
      .update({ kolicina: novaKolicina })
      .eq("id", id);

    if (error) {
      alert("AKTUALISIEREN: " + error.message);
      return;
    }

    await loadData();
  }

  async function obrisiMaterijal(id: number) {
    const potvrda = confirm("Dieses Material wirklich löschen?");
    if (!potvrda) return;

    const { error } = await supabase
      .from("room_material")
      .delete()
      .eq("id", id);

    if (error) {
      alert("LÖSCHEN: " + error.message);
      return;
    }

    await loadData();
  }

  function nazivUnosa(unos: any) {
    const material = getMaterial(unos.material_id);
    return material?.naziv || "Unbekanntes Material";
  }

  function jedinicaUnosa(unos: any) {
    const material = getMaterial(unos.material_id);
    return material?.jedinica || "";
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
        ← Zurück zum Raum
      </Link>

      <h1 style={styles.title}>Material im Raum</h1>

      <section style={styles.freeBox}>
        <h2 style={styles.groupTitle}>+ Freies Material</h2>

        <input
          value={slobodniNaziv}
          onChange={(e) => setSlobodniNaziv(e.target.value)}
          placeholder="Materialname"
          style={styles.input}
        />

        <select
          value={slobodnaJedinica}
          onChange={(e) => setSlobodnaJedinica(e.target.value)}
          style={styles.input}
        >
          <option value="Stk.">Stk.</option>
          <option value="m">m</option>
          <option value="m²">m²</option>
          <option value="m³">m³</option>
          <option value="kg">kg</option>
          <option value="l">l</option>
          <option value="Sack">Sack</option>
          <option value="Rolle">Rolle</option>
          <option value="Paket">Paket</option>
          <option value="Karton">Karton</option>
          <option value="Set">Set</option>
        </select>

        <input
          type="number"
          value={slobodnaKolicina}
          onChange={(e) => setSlobodnaKolicina(e.target.value)}
          placeholder="Menge"
          style={styles.input}
        />

        <button onClick={dodajSlobodniMaterijal} style={styles.saveButton}>
          Freies Material hinzufügen
        </button>
      </section>

      <section style={styles.box}>
        {grupe.map((g) => {
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
        })}

        <button onClick={sacuvajSveKolicine} style={styles.saveButton}>
          Alle eingegebenen Mengen speichern
        </button>
      </section>

      <section style={styles.box}>
        <h2>Material im Raum ({roomMaterial.length})</h2>

        {roomMaterial.length === 0 && (
          <p style={styles.emptyText}>Noch kein Material eingetragen.</p>
        )}

        {roomMaterial.map((m) => (
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
                Löschen
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
  freeBox: {
    background: "#111",
    border: "1px solid #16a34a",
    padding: "20px",
    borderRadius: "20px",
    marginBottom: "30px",
  },
  groupBox: {
    background: "#1a1a1a",
    padding: "18px",
    borderRadius: "16px",
    marginBottom: "18px",
  },
  groupTitle: {
    color: "#60a5fa",
    marginBottom: "15px",
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
    marginTop: "8px",
    marginBottom: "12px",
  },
  buttonRow: {
    display: "flex",
    gap: "10px",
  },
  plusButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  minusButton: {
    background: "#f59e0b",
    color: "white",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  deleteButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
};