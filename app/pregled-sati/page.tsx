"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function PregledSatiPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [workerName, setWorkerName] = useState("");
  const [unosi, setUnosi] = useState<any[]>([]);

  useEffect(() => {
    const name = localStorage.getItem("worker_name") || "";
    setWorkerName(name);
  }, []);

  useEffect(() => {
    if (workerName) {
      loadData();
    }
  }, [workerName, year, month]);

  async function loadData() {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = getNextMonthDate(year, month);

    const { data: hoursData, error } = await supabase
      .from("baustelle_hours")
      .select("*")
      .eq("radnik", workerName)
      .gte("datum", startDate)
      .lt("datum", endDate)
      .order("datum", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    const baustelleIds = [
      ...new Set((hoursData || []).map((h: any) => h.baustelle_id)),
    ];

    const { data: baustellenData } = await supabase
      .from("baustellen")
      .select("id, naziv, lokacija")
      .in("id", baustelleIds);

    const merged = (hoursData || []).map((h: any) => {
      const b = (baustellenData || []).find(
        (x: any) => String(x.id) === String(h.baustelle_id)
      );

      return {
        ...h,
        baustelle_naziv: b?.naziv || "-",
        baustelle_lokacija: b?.lokacija || "-",
      };
    });

    setUnosi(merged);
  }

  function getNextMonthDate(y: number, m: number) {
    if (m === 12) return `${y + 1}-01-01`;
    return `${y}-${String(m + 1).padStart(2, "0")}-01`;
  }

  function getWorkdaysInMonth(y: number, m: number) {
    const daysInMonth = new Date(y, m, 0).getDate();
    let workdays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(y, m - 1, day);
      const weekDay = date.getDay();

      if (weekDay !== 0 && weekDay !== 6) {
        workdays++;
      }
    }

    return workdays;
  }

  function downloadCSV() {
    const rows = [
      ["Datum", "Radnik", "Tip", "Baustelle", "Lokacija", "Pocetak", "Kraj", "Pauza", "Sati"],
      ...unosi.map((u) => [
        u.datum,
        workerName,
        u.tip_unosa || "RAD",
        u.baustelle_naziv,
        u.baustelle_lokacija,
        u.pocetak || "",
        u.kraj || "",
        u.pauza || "",
        Number(u.ukupno_sati || u.sati || 0).toFixed(1),
      ]),
    ];

    const csvContent = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `pregled-sati-${workerName}-${year}-${String(month).padStart(
      2,
      "0"
    )}.csv`;

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const ukupnoSati = unosi.reduce(
    (sum, item) => sum + Number(item.ukupno_sati || item.sati || 0),
    0
  );

  const bolovanjeDani = unosi.filter(
    (item) => item.tip_unosa === "BOLOVANJE"
  ).length;

  const godisnjiDani = unosi.filter(
    (item) => item.tip_unosa === "GODISNJI" || item.tip_unosa === "GODIŠNJI"
  ).length;

  const praznikDani = unosi.filter(
    (item) => item.tip_unosa === "PRAZNIK"
  ).length;

  const radniDani = getWorkdaysInMonth(year, month);
  const normaSati = radniDani * 8.5;
  const saldo = ukupnoSati - normaSati;

  return (
    <main style={mainStyle}>
      <Link href="/dashboard" style={backLinkStyle}>
        ← Nazad na Dashboard
      </Link>

      <h1 style={titleStyle}>Pregled sati</h1>

      <p style={{ color: "#aaa", marginBottom: "30px" }}>
        Radnik: {workerName}
      </p>

      <div style={filterBoxStyle}>
        <div>
          <label>Godina</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={selectStyle}
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
            <option value={2028}>2028</option>
          </select>
        </div>

        <div>
          <label>Mjesec</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            style={selectStyle}
          >
            <option value={1}>Januar</option>
            <option value={2}>Februar</option>
            <option value={3}>Mart</option>
            <option value={4}>April</option>
            <option value={5}>Maj</option>
            <option value={6}>Juni</option>
            <option value={7}>Juli</option>
            <option value={8}>August</option>
            <option value={9}>Septembar</option>
            <option value={10}>Oktobar</option>
            <option value={11}>Novembar</option>
            <option value={12}>Decembar</option>
          </select>
        </div>
      </div>

      <div style={summaryGridStyle}>
        <div style={summaryBoxStyle}>
          <p>Ukupno sati</p>
          <h2>{ukupnoSati.toFixed(1)} h</h2>
        </div>

        <div style={summaryBoxStyle}>
          <p>Norma sati</p>
          <h2>{normaSati.toFixed(1)} h</h2>
          <small>{radniDani} radnih dana × 8.5 h</small>
        </div>

        <div style={summaryBoxStyle}>
          <p>Saldo</p>
          <h2 style={{ color: saldo >= 0 ? "#22c55e" : "#ef4444" }}>
            {saldo >= 0 ? "+" : ""}
            {saldo.toFixed(1)} h
          </h2>
        </div>

        <div style={summaryBoxStyle}>
          <p>Bolovanje</p>
          <h2>{bolovanjeDani} dana</h2>
        </div>

        <div style={summaryBoxStyle}>
          <p>Godišnji odmor</p>
          <h2>{godisnjiDani} dana</h2>
        </div>

        <div style={summaryBoxStyle}>
          <p>Praznik</p>
          <h2>{praznikDani} dana</h2>
        </div>
      </div>

      <div style={listBoxStyle}>
        <div style={listHeaderStyle}>
          <h2>Unosi u mjesecu</h2>

          <button onClick={downloadCSV} style={downloadButtonStyle}>
            Preuzmi CSV
          </button>
        </div>

        {unosi.length === 0 && (
          <p style={{ color: "#999" }}>Nema unesenih sati za ovaj mjesec.</p>
        )}

        {unosi.map((u) => (
          <div key={u.id} style={rowStyle}>
            <div>
              <strong>{formatDate(u.datum)}</strong>

              <p style={{ margin: "6px 0 0 0", color: "#aaa" }}>
                {u.tip_unosa || "RAD"}
              </p>

              <p style={{ margin: "6px 0 0 0" }}>
                Baustelle: <strong>{u.baustelle_naziv}</strong>
              </p>

              <p style={{ margin: "6px 0 0 0", color: "#aaa" }}>
                Lokacija: {u.baustelle_lokacija}
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <strong>
                {Number(u.ukupno_sati || u.sati || 0).toFixed(1)} h
              </strong>

              {u.pocetak && u.kraj && (
                <p style={{ margin: "6px 0 0 0", color: "#aaa" }}>
                  {u.pocetak} - {u.kraj}
                </p>
              )}
            </div>
          </div>
        ))}
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
};

const titleStyle: any = {
  fontSize: "56px",
  fontWeight: "bold",
  marginTop: "25px",
  marginBottom: "10px",
};

const filterBoxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px",
  marginBottom: "30px",
};

const selectStyle: any = {
  width: "100%",
  padding: "15px",
  marginTop: "8px",
  borderRadius: "12px",
  border: "none",
  background: "#222",
  color: "white",
  fontSize: "18px",
};

const summaryGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "20px",
  marginBottom: "30px",
};

const summaryBoxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
};

const listBoxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
};

const listHeaderStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  marginBottom: "20px",
};

const rowStyle: any = {
  background: "#222",
  padding: "18px",
  borderRadius: "14px",
  marginTop: "12px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
};

const downloadButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "12px 20px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};