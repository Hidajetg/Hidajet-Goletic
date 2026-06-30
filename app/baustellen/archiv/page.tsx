"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

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
  if (!value || value === "-") return "-";

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

function getDateForArchiveGroup(b: any) {
  const dateValue =
    b.zadnjiDan && b.zadnjiDan !== "-"
      ? b.zadnjiDan
      : b.prviDan && b.prviDan !== "-"
      ? b.prviDan
      : b.updated_at || b.created_at || "";

  if (!dateValue) return null;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function getMonthName(date: Date) {
  return date.toLocaleDateString("de-AT", {
    month: "long",
  });
}

function getSearchText(b: any) {
  return [
    b.naziv,
    b.lokacija,
    b.auftraggeber,
    b.kunde,
    b.client,
    b.bauleiter,
    b.opis,
    b.description,
    b.napomena,
    b.radniciText,
    b.prviDan,
    b.zadnjiDan,
    b.regieText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function ArchivPage() {
  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [baustellen, setBaustellen] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  async function loadArchiv() {
    setLoading(true);

    const { data, error } = await supabase
      .from("baustellen")
      .select("*")
      .eq("status", "Archiv")
      .order("id", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const result: any[] = [];

    for (const b of data || []) {
      const { data: sati } = await supabase
        .from("baustelle_hours")
        .select("datum, radnik, ukupno_sati, sati")
        .eq("baustelle_id", b.id)
        .order("datum", { ascending: true });

      let prviDan = "-";
      let zadnjiDan = "-";

      const workers = [
        ...new Set((sati || []).map((h: any) => h.radnik).filter(Boolean)),
      ];

      const arbeitsstunden = (sati || []).reduce(
        (sum: number, h: any) =>
          sum + Number(h.ukupno_sati || h.sati || 0),
        0
      );

      if (sati && sati.length > 0) {
        prviDan = sati[0].datum;
        zadnjiDan = sati[sati.length - 1].datum;
      }

      const { data: regieberichte } = await supabase
        .from("regieberichte")
        .select("id, bericht_nr, datum")
        .eq("baustelle_id", b.id)
        .order("datum", { ascending: true });

      const regieberichtIds = (regieberichte || []).map((r: any) => r.id);

      let regieStunden = 0;
      let regieWorkerText = "";

      if (regieberichtIds.length > 0) {
        const { data: regieWorkers } = await supabase
          .from("regiebericht_workers")
          .select("worker_name, stunden")
          .in("regiebericht_id", regieberichtIds);

        regieStunden = (regieWorkers || []).reduce(
          (sum: number, row: any) => sum + toNumberValue(row.stunden),
          0
        );

        const regieWorkersUnique = [
          ...new Set(
            (regieWorkers || [])
              .map((row: any) => row.worker_name)
              .filter(Boolean)
          ),
        ];

        regieWorkerText = regieWorkersUnique.join(", ");
      }

      const archiveDate = getDateForArchiveGroup({
        ...b,
        prviDan,
        zadnjiDan,
      });

      result.push({
        ...b,
        prviDan,
        zadnjiDan,
        workers,
        radniciText: workers.join(", "),
        arbeitsstunden,
        regieberichte: regieberichte || [],
        regieberichteCount: regieberichte?.length || 0,
        regieStunden,
        regieText: regieWorkerText,
        archiveDate,
        archiveYear: archiveDate ? archiveDate.getFullYear() : "Ohne Jahr",
        archiveMonthNumber: archiveDate ? archiveDate.getMonth() + 1 : 0,
        archiveMonthName: archiveDate ? getMonthName(archiveDate) : "Ohne Monat",
      });
    }

    setBaustellen(result);
    setLoading(false);
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
    const loggedUser = getLoggedUserFromLocalStorage();
    const adminOk = isAdminUser(loggedUser);

    setIsAdmin(adminOk);
    setAccessChecked(true);

    if (!adminOk) {
      setLoading(false);
      return;
    }

    loadArchiv();
  }, []);

  const filteredBaustellen = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return baustellen;

    return baustellen.filter((b) => getSearchText(b).includes(search));
  }, [baustellen, searchTerm]);

  const suggestions = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return [];

    return filteredBaustellen.slice(0, 8);
  }, [filteredBaustellen, searchTerm]);

  const groupedArchiv = useMemo(() => {
    const groups: any = {};

    for (const b of filteredBaustellen) {
      const year = String(b.archiveYear || "Ohne Jahr");
      const monthKey = String(b.archiveMonthNumber || 0).padStart(2, "0");
      const monthLabel = b.archiveMonthName || "Ohne Monat";

      if (!groups[year]) {
        groups[year] = {};
      }

      if (!groups[year][monthKey]) {
        groups[year][monthKey] = {
          monthLabel,
          items: [],
        };
      }

      groups[year][monthKey].items.push(b);
    }

    return groups;
  }, [filteredBaustellen]);

  const yearKeys = Object.keys(groupedArchiv).sort((a, b) => {
    if (a === "Ohne Jahr") return 1;
    if (b === "Ohne Jahr") return -1;
    return Number(b) - Number(a);
  });

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

        <div style={noAccessBoxStyle}>
          <h1 style={noAccessTitleStyle}>Kein Zugriff</h1>
          <p>Der Archivbereich ist nur für Admins sichtbar.</p>
        </div>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <Link href="/baustellen" style={backLinkStyle}>
        ← Zurück zu Baustellen
      </Link>

      <div style={headerRowStyle}>
        <div>
          <h1 style={titleStyle}>Archiv</h1>
          <p style={subTextStyle}>
            Baustellen nach Jahr und Monat organisiert. Regieberichte können
            separat geöffnet und gedruckt werden.
          </p>
        </div>

        <button onClick={loadArchiv} style={refreshButtonStyle}>
          🔄 Aktualisieren
        </button>
      </div>

      <section style={searchBoxStyle}>
        <label style={searchLabelStyle}>Baustelle suchen</label>

        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Name, Ort, Auftraggeber, Bauleiter, Mitarbeiter..."
          style={searchInputStyle}
        />

        {suggestions.length > 0 && (
          <div style={suggestionBoxStyle}>
            {suggestions.map((b) => (
              <button
                key={b.id}
                onClick={() => setSearchTerm(b.naziv || "")}
                style={suggestionButtonStyle}
              >
                <strong>{b.naziv}</strong>
                <span style={suggestionSmallStyle}>
                  {b.lokacija || "-"} · {b.archiveMonthName} {b.archiveYear} ·{" "}
                  {b.regieberichteCount} Regieberichte
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {loading && (
        <div style={emptyBoxStyle}>
          Archiv wird geladen...
        </div>
      )}

      {!loading && baustellen.length === 0 && (
        <div style={emptyBoxStyle}>
          Keine archivierten Baustellen vorhanden.
        </div>
      )}

      {!loading && baustellen.length > 0 && filteredBaustellen.length === 0 && (
        <div style={emptyBoxStyle}>
          Keine Baustelle für diese Suche gefunden.
        </div>
      )}

      {!loading &&
        yearKeys.map((year) => {
          const monthKeys = Object.keys(groupedArchiv[year]).sort((a, b) => {
            return Number(b) - Number(a);
          });

          const yearCount = monthKeys.reduce(
            (sum, monthKey) =>
              sum + groupedArchiv[year][monthKey].items.length,
            0
          );

          return (
            <details key={year} open style={yearFolderStyle}>
              <summary style={yearSummaryStyle}>
                📁 {year}{" "}
                <span style={countBadgeStyle}>{yearCount} Baustellen</span>
              </summary>

              <div style={monthWrapStyle}>
                {monthKeys.map((monthKey) => {
                  const monthGroup = groupedArchiv[year][monthKey];
                  const items = monthGroup.items.sort((a: any, b: any) => {
                    const aDate = getDateForArchiveGroup(a)?.getTime() || 0;
                    const bDate = getDateForArchiveGroup(b)?.getTime() || 0;
                    return bDate - aDate;
                  });

                  return (
                    <details key={`${year}-${monthKey}`} open style={monthFolderStyle}>
                      <summary style={monthSummaryStyle}>
                        📂 {monthGroup.monthLabel} {year}{" "}
                        <span style={countBadgeSmallStyle}>
                          {items.length} Baustellen
                        </span>
                      </summary>

                      <div style={cardGridStyle}>
                        {items.map((b: any) => (
                          <div key={b.id} style={cardStyle}>
                            <div style={cardHeaderStyle}>
                              <div>
                                <h2 style={cardTitleStyle}>{b.naziv}</h2>
                                <div style={cardLocationStyle}>
                                  📍 {b.lokacija || "-"}
                                </div>
                              </div>

                              <div style={statusBadgeStyle}>Archiv</div>
                            </div>

                            <div style={infoGridStyle}>
                              <p>
                                <strong>Erster Arbeitstag:</strong>
                                <br />
                                {formatDate(b.prviDan)}
                              </p>

                              <p>
                                <strong>Letzter Arbeitstag:</strong>
                                <br />
                                {formatDate(b.zadnjiDan)}
                              </p>

                              <p>
                                <strong>Mitarbeiter:</strong>
                                <br />
                                {b.radniciText || "-"}
                              </p>

                              <p>
                                <strong>Arbeitsstunden:</strong>
                                <br />
                                {formatNumber(b.arbeitsstunden)} h
                              </p>

                              <p>
                                <strong>Regieberichte:</strong>
                                <br />
                                {b.regieberichteCount}
                              </p>

                              <p>
                                <strong>Regiestunden:</strong>
                                <br />
                                {formatNumber(b.regieStunden)} h
                              </p>
                            </div>

                            <div style={buttonRowStyle}>
                              <Link
                                href={`/baustellen/archiv/${b.id}`}
                                style={berichtButtonStyle}
                              >
                                📄 Abschlussbericht
                              </Link>

                              <Link
                                href={`/baustellen/archiv/${b.id}/regieberichte`}
                                style={regieButtonStyle}
                              >
                                🧾 Regieberichte separat
                              </Link>

                              <button
                                onClick={() => vratiAktivno(b.id)}
                                style={activeButtonStyle}
                              >
                                Zurück zu Aktiv
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </details>
          );
        })}
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
};

const headerRowStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginTop: "30px",
  marginBottom: "25px",
  flexWrap: "wrap",
};

const titleStyle: any = {
  fontSize: "60px",
  fontWeight: "bold",
  margin: 0,
};

const subTextStyle: any = {
  color: "#aaa",
  marginTop: "10px",
  fontSize: "16px",
};

const refreshButtonStyle: any = {
  background: "#374151",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const searchBoxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  padding: "22px",
  borderRadius: "18px",
  marginBottom: "25px",
  position: "relative",
};

const searchLabelStyle: any = {
  display: "block",
  color: "#f97316",
  fontWeight: "bold",
  marginBottom: "10px",
  fontSize: "18px",
};

const searchInputStyle: any = {
  width: "100%",
  background: "#000",
  color: "white",
  border: "1px solid #333",
  padding: "15px",
  borderRadius: "12px",
  fontSize: "16px",
  outline: "none",
};

const suggestionBoxStyle: any = {
  marginTop: "12px",
  display: "grid",
  gap: "8px",
};

const suggestionButtonStyle: any = {
  background: "#1f2937",
  color: "white",
  border: "1px solid #374151",
  padding: "12px",
  borderRadius: "10px",
  cursor: "pointer",
  textAlign: "left",
  display: "grid",
  gap: "4px",
};

const suggestionSmallStyle: any = {
  color: "#cbd5e1",
  fontSize: "13px",
};

const emptyBoxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  color: "#ddd",
};

const noAccessBoxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  marginTop: "40px",
};

const noAccessTitleStyle: any = {
  color: "#dc2626",
  marginTop: 0,
};

const yearFolderStyle: any = {
  background: "#090909",
  border: "1px solid #222",
  borderRadius: "20px",
  marginBottom: "24px",
  padding: "18px",
};

const yearSummaryStyle: any = {
  cursor: "pointer",
  fontSize: "34px",
  fontWeight: "bold",
  color: "#f97316",
  listStyle: "none",
};

const monthWrapStyle: any = {
  marginTop: "20px",
  display: "grid",
  gap: "18px",
};

const monthFolderStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "18px",
  padding: "16px",
};

const monthSummaryStyle: any = {
  cursor: "pointer",
  fontSize: "24px",
  fontWeight: "bold",
  color: "#60a5fa",
  listStyle: "none",
};

const countBadgeStyle: any = {
  background: "#1f2937",
  color: "white",
  fontSize: "14px",
  padding: "7px 10px",
  borderRadius: "999px",
  marginLeft: "10px",
  verticalAlign: "middle",
};

const countBadgeSmallStyle: any = {
  background: "#172554",
  color: "white",
  fontSize: "13px",
  padding: "6px 9px",
  borderRadius: "999px",
  marginLeft: "8px",
  verticalAlign: "middle",
};

const cardGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: "18px",
  marginTop: "16px",
};

const cardStyle: any = {
  background: "#000",
  border: "1px solid #333",
  padding: "22px",
  borderRadius: "18px",
};

const cardHeaderStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  marginBottom: "16px",
};

const cardTitleStyle: any = {
  margin: 0,
  color: "white",
  fontSize: "24px",
};

const cardLocationStyle: any = {
  color: "#cbd5e1",
  marginTop: "6px",
};

const statusBadgeStyle: any = {
  background: "#7c2d12",
  color: "white",
  padding: "7px 10px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "12px",
};

const infoGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "12px",
  color: "#ddd",
};

const buttonRowStyle: any = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "18px",
};

const berichtButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  textDecoration: "none",
  border: "none",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
  display: "inline-block",
};

const regieButtonStyle: any = {
  background: "#f97316",
  color: "white",
  textDecoration: "none",
  border: "none",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
  display: "inline-block",
};

const activeButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};