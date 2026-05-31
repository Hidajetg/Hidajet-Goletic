"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function PregledPage() {
  const params = useParams();
  const baustelleId = params.id as string;

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
        href={`/baustellen/${baustelleId}`}
        style={{
          color: "#3b82f6",
          textDecoration: "none",
          fontWeight: "bold",
          fontSize: "18px",
        }}
      >
        ← Nazad na Baustelle
      </Link>

      <h1
        style={{
          fontSize: "56px",
          fontWeight: "bold",
          marginTop: "25px",
          marginBottom: "30px",
        }}
      >
        Pregled gradilišta
      </h1>

      <div
        style={{
          background: "#111",
          borderRadius: "20px",
          padding: "30px",
        }}
      >
        <h2>Pregled je u izradi</h2>

        <p style={{ color: "#999", marginTop: "15px" }}>
          Ovdje će se prikazivati:
        </p>

        <ul
          style={{
            lineHeight: "2",
            color: "#ddd",
            marginTop: "20px",
          }}
        >
          <li>Ukupni sati svih prostorija</li>
          <li>Ukupna produktivnost</li>
          <li>Ukupan materijal</li>
          <li>Pregled svih prostorija</li>
          <li>Fotografije gradilišta</li>
          <li>PDF izvještaj</li>
        </ul>
      </div>
    </main>
  );
}