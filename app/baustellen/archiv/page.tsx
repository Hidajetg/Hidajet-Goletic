"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function ArchivPage() {
  const [baustellen, setBaustellen] = useState<any[]>([]);

  async function loadArchiv() {
    const { data, error } = await supabase
      .from("baustellen")
      .select("*")
      .eq("status", "Archiv")
      .order("id", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    const result = [];

    for (const b of data || []) {
      const { data: sati } = await supabase
        .from("baustelle_hours")
        .select("datum")
        .eq("baustelle_id", b.id)
        .order("datum", { ascending: true });

      let prviDan = "-";
      let zadnjiDan = "-";

      if (sati && sati.length > 0) {
        prviDan = sati[0].datum;
        zadnjiDan = sati[sati.length - 1].datum;
      }

      result.push({
        ...b,
        prviDan,
        zadnjiDan,
      });
    }

    setBaustellen(result);
  }

  async function vratiAktivno(id: number) {
    const potvrda = confirm(
      "Möchten Sie diese Baustelle wirklich wieder aktivieren?"
    );

    if (!potvrda) return;

    const { error } = await supabase
      .from("baustellen")
      .update({
        status: "Aktiv",
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadArchiv();
  }

  useEffect(() => {
    loadArchiv();
  }, []);

  return (
    <main
      style={{
        background: "#000",
        minHeight: "100vh",
        color: "white",
        padding: "40px",
      }}
    >
      <Link
        href="/baustellen"
        style={{
          color: "#3b82f6",
          textDecoration: "none",
          fontWeight: "bold",
        }}
      >
        ← Zurück zu Baustellen
      </Link>

      <h1
        style={{
          fontSize: "60px",
          fontWeight: "bold",
          marginTop: "30px",
          marginBottom: "40px",
        }}
      >
        Archiv
      </h1>

      {baustellen.length === 0 && (
        <div
          style={{
            background: "#111",
            padding: "25px",
            borderRadius: "20px",
          }}
        >
          Keine archivierten Baustellen vorhanden.
        </div>
      )}

      {baustellen.map((b) => (
        <div
          key={b.id}
          style={{
            background: "#111",
            padding: "25px",
            borderRadius: "20px",
            marginBottom: "20px",
          }}
        >
          <h2>{b.naziv}</h2>

          <p>
            <strong>Ort:</strong> {b.lokacija || "-"}
          </p>

          <p>
            <strong>Erster Arbeitstag:</strong> {b.prviDan}
          </p>

          <p>
            <strong>Letzter Arbeitstag:</strong> {b.zadnjiDan}
          </p>

          <p>
            <strong>Status:</strong> Archiv
          </p>

          <div
            style={{
              display: "flex",
              gap: "15px",
              flexWrap: "wrap",
              marginTop: "15px",
            }}
          >
            <Link
              href={`/baustellen/archiv/${b.id}`}
              style={{
                background: "#2563eb",
                color: "white",
                textDecoration: "none",
                border: "none",
                padding: "12px 20px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "bold",
                display: "inline-block",
              }}
            >
              📄 Bericht anzeigen
            </Link>

            <button
              onClick={() => vratiAktivno(b.id)}
              style={{
                background: "#16a34a",
                color: "white",
                border: "none",
                padding: "12px 20px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Zurück zu Aktiv
            </button>
          </div>
        </div>
      ))}
    </main>
  );
}