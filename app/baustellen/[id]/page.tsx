"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function BaustelleDetailPage() {
  const params = useParams();
  const router = useRouter();

  const baustelleId = String(params.id);

  const [baustelle, setBaustelle] = useState<any>(null);
  const [workerRole, setWorkerRole] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("worker_role") || "worker";
    setWorkerRole(role);
    loadBaustelle();
  }, []);

  async function loadBaustelle() {
    const { data, error } = await supabase
      .from("baustellen")
      .select("*")
      .eq("id", baustelleId)
      .single();

    if (error) {
      alert("Greška kod učitavanja Baustelle: " + error.message);
      return;
    }

    setBaustelle(data);
  }

  async function countRows(tableName: string) {
    const { count } = await supabase
      .from(tableName)
      .select("*", { count: "exact", head: true })
      .eq("baustelle_id", baustelleId);

    return count || 0;
  }

  async function checkIfBaustelleHasEntries() {
    const prostorijeCount = await countRows("prostorije");
    const satiCount = await countRows("baustelle_hours");
    const materijalCount = await countRows("material_entries");
    const roomMaterialCount = await countRows("room_material");
    const photosCount = await countRows("room_photos");
    const produktivnostCount = await countRows("produktivnost");

    return (
      prostorijeCount +
        satiCount +
        materijalCount +
        roomMaterialCount +
        photosCount +
        produktivnostCount >
      0
    );
  }

  async function archiveBaustelle() {
    const confirmArchive = confirm(
      "Möchten Sie diese Baustelle wirklich abschließen und ins Archiv verschieben?"
    );

    if (!confirmArchive) return;

    const { error } = await supabase
      .from("baustellen")
      .update({ status: "Archiv" })
      .eq("id", baustelleId);

    if (error) {
      alert("Greška kod arhiviranja: " + error.message);
      return;
    }

    router.push("/baustellen");
  }

  async function deleteBaustelle() {
    const hasEntries = await checkIfBaustelleHasEntries();

    if (hasEntries && workerRole !== "admin") {
      alert(
        "Ova Baustelle ima unose. Samo admin može obrisati Baustelle sa postojećim unosima."
      );
      return;
    }

    const confirmDelete = confirm(
      hasEntries
        ? "Ova Baustelle ima unose. Da li admin zaista želi trajno obrisati ovu Baustelle?"
        : "Da li zaista želiš obrisati ovu praznu Baustelle?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("baustellen")
      .delete()
      .eq("id", baustelleId);

    if (error) {
      alert("Greška kod brisanja: " + error.message);
      return;
    }

    router.push("/baustellen");
  }

  if (!baustelle) {
    return (
      <main style={mainStyle}>
        <p>Učitavanje...</p>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <Link href="/baustellen" style={backLinkStyle}>
        ← Nazad na Baustellen
      </Link>

      <h1 style={titleStyle}>{baustelle.naziv || "Baustelle"}</h1>

      <div style={infoBoxStyle}>
        {baustelle.lokacija && (
          <p>
            <strong>Lokacija:</strong> {baustelle.lokacija}
          </p>
        )}

        {baustelle.opis && (
          <p>
            <strong>Opis:</strong> {baustelle.opis}
          </p>
        )}

        <p>
          <strong>Status:</strong> {baustelle.status || "Aktiv"}
        </p>
      </div>

      <div style={gridStyle}>
        <Link href={`/baustellen/${baustelleId}/prostorije`} style={buttonStyle}>
          Prostorije
        </Link>

        <Link href={`/baustellen/${baustelleId}/pregled`} style={buttonStyle}>
          Pregled
        </Link>
      </div>

      <div style={actionBoxStyle}>
        <button onClick={archiveBaustelle} style={archiveButtonStyle}>
          Baustelle abschließen
        </button>

        <button onClick={deleteBaustelle} style={deleteButtonStyle}>
          Baustelle löschen
        </button>
      </div>
    </main>
  );
}

const mainStyle: any = {
  background: "#000",
  minHeight: "100vh",
  color: "white",
  padding: "40px",
};

const backLinkStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "18px",
};

const titleStyle: any = {
  fontSize: "56px",
  fontWeight: "bold",
  marginTop: "25px",
  marginBottom: "30px",
};

const infoBoxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  marginBottom: "30px",
  lineHeight: "1.6",
};

const gridStyle: any = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px",
  marginBottom: "35px",
};

const buttonStyle: any = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "25px",
  background: "#2563eb",
  color: "white",
  borderRadius: "16px",
  fontSize: "20px",
  fontWeight: "bold",
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
};

const actionBoxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  display: "flex",
  gap: "20px",
  flexWrap: "wrap",
};

const archiveButtonStyle: any = {
  background: "#f97316",
  color: "white",
  padding: "16px 24px",
  border: "none",
  borderRadius: "12px",
  fontSize: "18px",
  fontWeight: "bold",
  cursor: "pointer",
};

const deleteButtonStyle: any = {
  background: "#dc2626",
  color: "white",
  padding: "16px 24px",
  border: "none",
  borderRadius: "12px",
  fontSize: "18px",
  fontWeight: "bold",
  cursor: "pointer",
};