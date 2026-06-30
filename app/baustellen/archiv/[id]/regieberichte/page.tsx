"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

const ADMIN_NAMES = [
  "hido",
  "steffi",
  "admin",
  "hidajet",
  "hidajet goletic",
  "hidajet goletić",
];

function getLoggedUserFromLocalStorage() {
  if (typeof window === "undefined") return null;

  const keys = [
    "currentWorker",
    "worker",
    "loggedWorker",
    "selectedWorker",
    "currentUser",
    "loggedUser",
    "user",
    "userName",
    "workerName",
    "name",
    "loginUser",
    "baustelle_user",
    "stone_user",
    "app_user",
  ];

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (!value) continue;

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    const value = localStorage.getItem(key);
    if (!value) continue;

    try {
      const parsed = JSON.parse(value);
      if (isAdminUser(parsed)) return parsed;
    } catch {
      if (isAdminUser(value)) return value;
    }
  }

  return null;
}

function isAdminUser(user: any) {
  if (!user) return false;

  if (typeof user === "string") {
    return ADMIN_NAMES.includes(user.trim().toLowerCase());
  }

  const role = String(user.role || user.rolle || user.tip || "").toLowerCase();

  const name = String(
    user.name ||
      user.worker_name ||
      user.radnik ||
      user.username ||
      user.userName ||
      user.displayName ||
      ""
  )
    .trim()
    .toLowerCase();

  return (
    role === "admin" ||
    role === "administrator" ||
    user.is_admin === true ||
    user.admin === true ||
    ADMIN_NAMES.includes(name)
  );
}

function formatDate(value: string) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatNumber(value: any) {
  return Number(value || 0).toLocaleString("de-AT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

function toNumberValue(value: any) {
  if (value === null || value === undefined || value === "") return 0;

  const cleaned = String(value)
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");

  const numberValue = Number(cleaned);

  if (Number.isNaN(numberValue)) return 0;
  return numberValue;
}

export default function ArchivRegieberichtePage() {
  const params = useParams();
  const baustelleId = String(params.id);

  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [baustelle, setBaustelle] = useState<any>(null);
  const [berichte, setBerichte] = useState<any[]>([]);

  useEffect(() => {
    const loggedUser = getLoggedUserFromLocalStorage();
    const adminOk = isAdminUser(loggedUser);

    setIsAdmin(adminOk);
    setAccessChecked(true);

    if (!adminOk) {
      setLoading(false);
      return;
    }

    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: baustelleData, error: baustelleError } = await supabase
      .from("baustellen")
      .select("*")
      .eq("id", Number(baustelleId))
      .single();

    if (baustelleError) {
      alert("LOAD BAUSTELLE: " + baustelleError.message);
      setLoading(false);
      return;
    }

    setBaustelle(baustelleData);

    const { data: berichtData, error: berichtError } = await supabase
      .from("regieberichte")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("datum", { ascending: true })
      .order("id", { ascending: true });

    if (berichtError) {
      alert("LOAD REGIEBERICHTE: " + berichtError.message);
      setLoading(false);
      return;
    }

    const ids = (berichtData || []).map((b: any) => b.id);

    let workerRows: any[] = [];
    let roomRows: any[] = [];
    let photoRows: any[] = [];

    if (ids.length > 0) {
      const { data: workersData } = await supabase
        .from("regiebericht_workers")
        .select("*")
        .in("regiebericht_id", ids);

      workerRows = workersData || [];

      const { data: roomsData } = await supabase
        .from("regiebericht_rooms")
        .select("*")
        .in("regiebericht_id", ids);

      roomRows = roomsData || [];

      const { data: photosData } = await supabase
        .from("regiebericht_photos")
        .select("*")
        .in("regiebericht_id", ids);

      photoRows = photosData || [];
    }

    const withDetails = (berichtData || []).map((bericht: any) => {
      const workersForBericht = workerRows.filter(
        (w: any) => Number(w.regiebericht_id) === Number(bericht.id)
      );

      const roomsForBericht = roomRows.filter(
        (r: any) => Number(r.regiebericht_id) === Number(bericht.id)
      );

      const photosForBericht = photoRows.filter(
        (p: any) => Number(p.regiebericht_id) === Number(bericht.id)
      );

      const totalHours = workersForBericht.reduce(
        (sum: number, row: any) => sum + toNumberValue(row.stunden),
        0
      );

      const workersText = [
        ...new Set(
          workersForBericht.map((w: any) => w.worker_name).filter(Boolean)
        ),
      ].join(", ");

      const roomsText = roomsForBericht
        .map((r: any) => r.room_name || r.raum || r.name)
        .filter(Boolean)
        .join(", ");

      return {
        ...bericht,
        workers: workersForBericht,
        rooms: roomsForBericht,
        photos: photosForBericht,
        totalHours,
        workersText,
        roomsText,
      };
    });

    setBerichte(withDetails);
    setLoading(false);
  }

  if (!accessChecked) {
    return (
      <main style={mainStyle}>
        <p>Zugriff wird geprüft...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main style={mainStyle}>
        <Link href="/baustellen" style={backLinkStyle}>
          ← Zurück zu Baustellen
        </Link>

        <div style={boxStyle}>
          <h1 style={{ color: "#dc2626" }}>Kein Zugriff</h1>
          <p>Diese Seite ist nur für Admins sichtbar.</p>
        </div>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <div style={topBarStyle}>
        <Link href="/baustellen/archiv" style={backLinkStyle}>
          ← Zurück zum Archiv
        </Link>

        <Link
          href={`/baustellen/archiv/${baustelleId}`}
          style={abschlussButtonStyle}
        >
          📄 Abschlussbericht öffnen
        </Link>
      </div>

      <h1 style={titleStyle}>Regieberichte separat</h1>

      <section style={infoBoxStyle}>
        <h2 style={infoTitleStyle}>{baustelle?.naziv || "-"}</h2>

        <p style={mutedTextStyle}>Ort: {baustelle?.lokacija || "-"}</p>

        <p style={mutedTextStyle}>
          Jeder Regiebericht wird einzeln geöffnet und als eigenes
          A4-Landscape-Blatt gedruckt.
        </p>
      </section>

      {loading && <div style={boxStyle}>Regieberichte werden geladen...</div>}

      {!loading && berichte.length === 0 && (
        <div style={boxStyle}>
          Für diese Baustelle sind keine Regieberichte vorhanden.
        </div>
      )}

      {!loading && berichte.length > 0 && (
        <div style={gridStyle}>
          {berichte.map((bericht: any) => (
            <div key={bericht.id} style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <h2 style={cardTitleStyle}>
                    Regiebericht Nr. {bericht.bericht_nr || bericht.id}
                  </h2>

                  <p style={cardSubStyle}>
                    Datum: {formatDate(bericht.datum)}
                  </p>
                </div>

                <div style={hoursBadgeStyle}>
                  {formatNumber(bericht.totalHours)} h
                </div>
              </div>

              <div style={detailGridStyle}>
                <p>
                  <strong>Ort:</strong>
                  <br />
                  {bericht.ort || baustelle?.lokacija || "-"}
                </p>

                <p>
                  <strong>Auftraggeber:</strong>
                  <br />
                  {bericht.auftraggeber || "-"}
                </p>

                <p>
                  <strong>Bauleiter:</strong>
                  <br />
                  {bericht.bauleiter || "-"}
                </p>

                <p>
                  <strong>Räume:</strong>
                  <br />
                  {bericht.roomsText || "-"}
                </p>

                <p>
                  <strong>Mitarbeiter:</strong>
                  <br />
                  {bericht.workersText || "-"}
                </p>

                <p>
                  <strong>Fotos:</strong>
                  <br />
                  {bericht.photos.length}
                </p>
              </div>

              <div style={workBoxStyle}>
                <strong>Ausgeführte Arbeiten:</strong>
                <div style={workTextStyle}>
                  {bericht.ausgefuehrte_arbeiten || "-"}
                </div>
              </div>

              <div style={buttonRowStyle}>
                <Link
                  href={`/baustellen/archiv/${baustelleId}/regieberichte/${bericht.id}`}
                  style={printButtonStyle}
                >
                  🖨️ Öffnen / Drucken
                </Link>

                <Link
                  href={`/baustellen/${baustelleId}/regiebericht`}
                  style={editButtonStyle}
                >
                  ✏️ Im Regiebericht-Modul öffnen
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

const mainStyle: any = {
  background: "#000",
  minHeight: "100vh",
  color: "white",
  padding: "40px",
};

const topBarStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "30px",
};

const backLinkStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
};

const abschlussButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  textDecoration: "none",
  border: "none",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const titleStyle: any = {
  fontSize: "56px",
  fontWeight: "bold",
  marginTop: 0,
  marginBottom: "25px",
};

const boxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  marginBottom: "20px",
};

const infoBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  padding: "25px",
  borderRadius: "20px",
  marginBottom: "25px",
};

const infoTitleStyle: any = {
  color: "#f97316",
  fontSize: "30px",
  marginTop: 0,
  marginBottom: "8px",
};

const mutedTextStyle: any = {
  color: "#cbd5e1",
  marginBottom: 0,
};

const gridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
  gap: "20px",
};

const cardStyle: any = {
  background: "#111",
  border: "1px solid #333",
  padding: "24px",
  borderRadius: "20px",
};

const cardHeaderStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start",
  marginBottom: "18px",
};

const cardTitleStyle: any = {
  color: "#f97316",
  fontSize: "26px",
  margin: 0,
};

const cardSubStyle: any = {
  color: "#cbd5e1",
  marginTop: "7px",
  marginBottom: 0,
};

const hoursBadgeStyle: any = {
  background: "#14532d",
  border: "1px solid #22c55e",
  color: "white",
  padding: "9px 12px",
  borderRadius: "999px",
  fontWeight: "bold",
  whiteSpace: "nowrap",
};

const detailGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "12px",
  color: "#ddd",
  marginBottom: "18px",
};

const workBoxStyle: any = {
  background: "#000",
  border: "1px solid #333",
  padding: "14px",
  borderRadius: "12px",
  color: "#ddd",
  marginBottom: "18px",
};

const workTextStyle: any = {
  marginTop: "8px",
  whiteSpace: "pre-wrap",
  lineHeight: "1.45",
};

const buttonRowStyle: any = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const printButtonStyle: any = {
  background: "#f97316",
  color: "white",
  textDecoration: "none",
  border: "none",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const editButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  textDecoration: "none",
  border: "none",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};