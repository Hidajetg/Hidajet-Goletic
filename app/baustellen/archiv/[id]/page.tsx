"use client";

import { useParams } from "next/navigation";

export default function ArchivBerichtPage() {
  const params = useParams();

  const baustelleId = String(params.id);

  return (
    <main
      style={{
        background: "#000",
        minHeight: "100vh",
        color: "white",
        padding: "40px",
      }}
    >
      <h1
        style={{
          fontSize: "56px",
          marginBottom: "30px",
        }}
      >
        Abschlussbericht
      </h1>

      <div
        style={{
          background: "#111",
          padding: "25px",
          borderRadius: "20px",
        }}
      >
        <h2>Baustelle ID: {baustelleId}</h2>

        <p>Ovdje će doći kompletan izvještaj.</p>
      </div>
    </main>
  );
}