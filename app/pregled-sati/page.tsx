"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const RADNICI = ["Arnes", "Ramiz", "Abror", "Shohruh", "Harun"];
const ADMINI = ["Hido", "Steffi", "Admin"];

const GODISNJI_DANI_PO_RADNIKU = 25;
const SATI_PO_DANU = 8.5;

const translations: any = {
  ba: {
    back: "Nazad na Dashboard",
    title: "Pregled sati",
    loggedIn: "Prijavljen",
    worker: "Radnik",
    allWorkers: "Svi radnici",
    year: "Godina",
    month: "Mjesec",
    totalHours: "Ukupno sati",
    targetHours: "Norma sati",
    balance: "Razlika",
    sick: "Bolovanje",
    vacation: "Godišnji odmor",
    holiday: "Praznik",
    entries: "Unosi u mjesecu",
    download: "Preuzmi PDF",
    noEntries: "Nema unesenih sati za ovaj mjesec.",
    workdays: "radnih dana",
    workers: "radnika",
    days: "dana",
    location: "Lokacija",
    addAbsence: "Dodaj godišnji / bolovanje / praznik",
    absenceType: "Vrsta",
    fromDate: "Od datuma",
    toDate: "Do datuma",
    saveAbsence: "Sačuvaj odsustvo",
    vacationRight: "Pravo godišnjeg",
    vacationUsedYear: "Iskorišteno u godini",
    vacationRestYear: "Ostatak u godini",
    selectWorker: "Odaberi radnika",
    selectType: "Odaberi vrstu",
    enterDate: "Odaberi datum",
    dateWrong: "Datum do ne može biti prije datuma od.",
    onlyAdmin: "Samo admin može dodati godišnji, bolovanje ili praznik.",
    onlyAdminDownload: "Samo admin može izvesti PDF.",
    absenceSaved: "Odsustvo je sačuvano.",
  },
};

const monthNames: any = {
  ba: [
    "Januar",
    "Februar",
    "Mart",
    "April",
    "Maj",
    "Juni",
    "Juli",
    "August",
    "Septembar",
    "Oktobar",
    "Novembar",
    "Decembar",
  ],
};

export default function PregledSatiPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const today = new Date().toISOString().split("T")[0];

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [workerName, setWorkerName] = useState("");
  const [selectedWorker, setSelectedWorker] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [unosi, setUnosi] = useState<any[]>([]);
  const [lang, setLang] = useState("ba");

  const [absenceWorker, setAbsenceWorker] = useState("");
  const [absenceType, setAbsenceType] = useState("GODISNJI");
  const [absenceFrom, setAbsenceFrom] = useState(today);
  const [absenceTo, setAbsenceTo] = useState(today);
  const [godisnjiGodinaUnosi, setGodisnjiGodinaUnosi] = useState<any[]>([]);

  const t = translations[lang] || translations.ba;
  const months = monthNames[lang] || monthNames.ba;

  useEffect(() => {
    const name = localStorage.getItem("worker_name") || "";
    const savedLang = localStorage.getItem("lang") || "ba";
    const adminStatus = ADMINI.includes(name);

    setLang(savedLang);
    setWorkerName(name);
    setIsAdmin(adminStatus);

    if (adminStatus) {
      setSelectedWorker("ALL");
      setAbsenceWorker(RADNICI[0]);
    } else {
      setSelectedWorker(name);
      setAbsenceWorker(name);
    }
  }, []);

  useEffect(() => {
    if (selectedWorker) {
      loadData();
      loadGodisnjiGodina();
    }
  }, [selectedWorker, year, month]);

  async function loadData() {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = getNextMonthDate(year, month);

    let query = supabase
      .from("baustelle_hours")
      .select("*")
      .gte("datum", startDate)
      .lt("datum", endDate)
      .order("datum", { ascending: true });

    if (selectedWorker !== "ALL") {
      query = query.eq("radnik", selectedWorker);
    } else {
      query = query.in("radnik", RADNICI);
    }

    const { data: hoursData, error } = await query;

    if (error) {
      alert(error.message);
      return;
    }

    const baustelleIds = [
      ...new Set((hoursData || []).map((h: any) => h.baustelle_id)),
    ].filter(Boolean);

    let baustellenData: any[] = [];

    if (baustelleIds.length > 0) {
      const { data } = await supabase
        .from("baustellen")
        .select("id, naziv, lokacija")
        .in("id", baustelleIds);

      baustellenData = data || [];
    }

    const merged = (hoursData || []).map((h: any) => {
      const b = baustellenData.find(
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

  async function loadGodisnjiGodina() {
    const startDate = `${year}-01-01`;
    const endDate = `${year + 1}-01-01`;

    let query = supabase
      .from("baustelle_hours")
      .select("*")
      .gte("datum", startDate)
      .lt("datum", endDate)
      .or("tip_unosa.eq.GODISNJI,tip_unosa.eq.GODIŠNJI");

    if (selectedWorker !== "ALL") {
      query = query.eq("radnik", selectedWorker);
    } else {
      query = query.in("radnik", RADNICI);
    }

    const { data, error } = await query;

    if (error) {
      setGodisnjiGodinaUnosi([]);
      return;
    }

    setGodisnjiGodinaUnosi(data || []);
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

  function getDatesBetween(from: string, to: string) {
    const dates: string[] = [];
    const start = new Date(from);
    const end = new Date(to);
    const current = new Date(start);

    while (current <= end) {
      const day = current.getDay();

      if (day !== 0 && day !== 6) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, "0");
        const d = String(current.getDate()).padStart(2, "0");
        dates.push(`${y}-${m}-${d}`);
      }

      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  function nazivTipa(tip: string) {
    if (tip === "GODISNJI" || tip === "GODIŠNJI") return t.vacation;
    if (tip === "BOLOVANJE") return t.sick;
    if (tip === "PRAZNIK") return t.holiday;
    return "RAD";
  }

  async function saveAbsence() {
    if (!isAdmin) {
      alert(t.onlyAdmin);
      return;
    }

    if (!absenceWorker) {
      alert(t.selectWorker);
      return;
    }

    if (!absenceType) {
      alert(t.selectType);
      return;
    }

    if (!absenceFrom || !absenceTo) {
      alert(t.enterDate);
      return;
    }

    if (new Date(absenceTo) < new Date(absenceFrom)) {
      alert(t.dateWrong);
      return;
    }

    const dates = getDatesBetween(absenceFrom, absenceTo);

    if (dates.length === 0) {
      alert(t.enterDate);
      return;
    }

    const inserts = dates.map((datum) => ({
      baustelle_id: null,
      room_id: null,
      radnik: absenceWorker,
      datum,
      tip_unosa: absenceType,
      pocetak: null,
      kraj: null,
      pauza: 0,
      ukupno_sati: SATI_PO_DANU,
      sati: SATI_PO_DANU,
      prekovremeni: 0,
      opis_posla: nazivTipa(absenceType),
    }));

    const { error } = await supabase.from("baustelle_hours").insert(inserts);

    if (error) {
      alert(error.message);
      return;
    }

    alert(t.absenceSaved);
    await loadData();
    await loadGodisnjiGodina();
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function safeText(value: any) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function downloadPDF() {
    if (!isAdmin) {
      alert(t.onlyAdminDownload);
      return;
    }

    const workerLabel =
      selectedWorker === "ALL" ? "Svi radnici" : selectedWorker || workerName;

    const monthLabel = months[month - 1];

    const rowsHtml = unosi
      .map((u, index) => {
        const sati = Number(u.ukupno_sati || u.sati || 0).toFixed(1);
        const tip = u.tip_unosa || "RAD";

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${safeText(formatDate(u.datum))}</td>
            <td>${safeText(u.radnik || "")}</td>
            <td>${safeText(u.pocetak || "-")}</td>
            <td>${safeText(String(u.pauza ?? "0"))}</td>
            <td>${safeText(u.kraj || "-")}</td>
            <td><strong>${safeText(sati)} h</strong></td>
            <td>${safeText(u.baustelle_lokacija || "-")}</td>
            <td>${safeText(tip)}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Pregled sati - ${safeText(workerLabel)} - ${safeText(
      monthLabel
    )} ${year}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #111;
              margin: 0;
              background: white;
              font-size: 10px;
            }

            .page {
              width: 100%;
            }

            .header {
              border-bottom: 2px solid #111;
              padding-bottom: 8px;
              margin-bottom: 10px;
              display: flex;
              justify-content: space-between;
              gap: 20px;
              align-items: flex-start;
            }

            .company {
              font-size: 18px;
              font-weight: 800;
              margin: 0 0 4px 0;
            }

            .subtitle {
              font-size: 10px;
              color: #555;
              margin: 0;
            }

            .doc-title {
              text-align: right;
            }

            .doc-title h1 {
              font-size: 20px;
              margin: 0 0 4px 0;
              letter-spacing: 0.5px;
            }

            .doc-title p {
              margin: 0;
              color: #555;
              font-size: 10px;
            }

            .info-grid {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 6px;
              margin-bottom: 10px;
            }

            .info-box {
              border: 1px solid #ddd;
              border-radius: 6px;
              padding: 6px;
              min-height: 42px;
            }

            .info-label {
              font-size: 8px;
              color: #666;
              text-transform: uppercase;
              margin-bottom: 3px;
            }

            .info-value {
              font-size: 13px;
              font-weight: 800;
            }

            .positive {
              color: #047857;
            }

            .negative {
              color: #b91c1c;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            th {
              background: #111;
              color: white;
              padding: 5px 4px;
              font-size: 8.5px;
              text-align: left;
              border: 1px solid #111;
            }

            td {
              padding: 4px;
              border: 1px solid #ddd;
              font-size: 8.5px;
              vertical-align: middle;
              word-wrap: break-word;
            }

            tr:nth-child(even) td {
              background: #f7f7f7;
            }

            .footer {
              margin-top: 8px;
              display: flex;
              justify-content: space-between;
              color: #666;
              font-size: 8px;
              border-top: 1px solid #ddd;
              padding-top: 5px;
            }

            .no-print {
              margin: 20px;
            }

            @media print {
              .no-print {
                display: none;
              }

              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>

        <body>
          <div class="page">
            <div class="header">
              <div>
                <p class="company">Baustelle App</p>
                <p class="subtitle">Profesionalni mjesečni izvod radnih sati</p>
              </div>

              <div class="doc-title">
                <h1>PREGLED SATI</h1>
                <p>${safeText(monthLabel)} ${year}</p>
              </div>
            </div>

            <div class="info-grid">
              <div class="info-box">
                <div class="info-label">Radnik</div>
                <div class="info-value">${safeText(workerLabel)}</div>
              </div>

              <div class="info-box">
                <div class="info-label">Mjesec / godina</div>
                <div class="info-value">${safeText(monthLabel)} ${year}</div>
              </div>

              <div class="info-box">
                <div class="info-label">Fond radnih sati</div>
                <div class="info-value">${normaSati.toFixed(1)} h</div>
              </div>

              <div class="info-box">
                <div class="info-label">Odrađeno sati</div>
                <div class="info-value">${ukupnoSati.toFixed(1)} h</div>
              </div>

              <div class="info-box">
                <div class="info-label">Razlika</div>
                <div class="info-value ${
                  saldo >= 0 ? "positive" : "negative"
                }">${saldo >= 0 ? "+" : ""}${saldo.toFixed(1)} h</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 4%;">#</th>
                  <th style="width: 12%;">Datum</th>
                  <th style="width: 13%;">Ime</th>
                  <th style="width: 10%;">Početak</th>
                  <th style="width: 8%;">Pauza</th>
                  <th style="width: 10%;">Kraj</th>
                  <th style="width: 10%;">Ukupno</th>
                  <th style="width: 23%;">Lokacija</th>
                  <th style="width: 10%;">Tip</th>
                </tr>
              </thead>

              <tbody>
                ${
                  rowsHtml ||
                  `<tr><td colspan="9" style="text-align:center; padding:20px;">Nema unesenih sati za ovaj mjesec.</td></tr>`
                }
              </tbody>
            </table>

            <div class="footer">
              <div>Izvoz napravio: ${safeText(workerName)}</div>
              <div>Datum izvoda: ${safeText(formatDate(today))}</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Browser je blokirao otvaranje PDF prozora.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
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
  const brojRadnikaZaNormu = selectedWorker === "ALL" ? RADNICI.length : 1;
  const normaSati = radniDani * SATI_PO_DANU * brojRadnikaZaNormu;
  const saldo = ukupnoSati - normaSati;

  const godisnjiPravoDani =
    selectedWorker === "ALL"
      ? GODISNJI_DANI_PO_RADNIKU * RADNICI.length
      : GODISNJI_DANI_PO_RADNIKU;

  const godisnjiIskoristenoGodina = godisnjiGodinaUnosi.length;
  const godisnjiOstatakGodina = godisnjiPravoDani - godisnjiIskoristenoGodina;

  return (
    <main style={mainStyle}>
      <Link href="/dashboard" style={backLinkStyle}>
        ← {t.back}
      </Link>

      <h1 style={titleStyle}>{t.title}</h1>

      <p style={{ color: "#aaa", marginBottom: "30px" }}>
        {t.loggedIn}: {workerName}
      </p>

      <div style={filterBoxStyle}>
        <div>
          <label>{t.worker}</label>
          <select
            value={selectedWorker}
            onChange={(e) => setSelectedWorker(e.target.value)}
            style={selectStyle}
            disabled={!isAdmin}
          >
            {isAdmin && <option value="ALL">{t.allWorkers}</option>}
            {isAdmin ? (
              RADNICI.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))
            ) : (
              <option value={workerName}>{workerName}</option>
            )}
          </select>
        </div>

        <div>
          <label>{t.year}</label>
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
          <label>{t.month}</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            style={selectStyle}
          >
            {months.map((m: string, index: number) => (
              <option key={m} value={index + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isAdmin && (
        <div style={absenceBoxStyle}>
          <h2 style={{ marginTop: 0 }}>+ {t.addAbsence}</h2>

          <div style={absenceGridStyle}>
            <div>
              <label>{t.worker}</label>
              <select
                value={absenceWorker}
                onChange={(e) => setAbsenceWorker(e.target.value)}
                style={selectStyle}
              >
                {RADNICI.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>{t.absenceType}</label>
              <select
                value={absenceType}
                onChange={(e) => setAbsenceType(e.target.value)}
                style={selectStyle}
              >
                <option value="GODISNJI">{t.vacation}</option>
                <option value="BOLOVANJE">{t.sick}</option>
                <option value="PRAZNIK">{t.holiday}</option>
              </select>
            </div>

            <div>
              <label>{t.fromDate}</label>
              <input
                type="date"
                value={absenceFrom}
                onChange={(e) => setAbsenceFrom(e.target.value)}
                style={selectStyle}
              />
            </div>

            <div>
              <label>{t.toDate}</label>
              <input
                type="date"
                value={absenceTo}
                onChange={(e) => setAbsenceTo(e.target.value)}
                style={selectStyle}
              />
            </div>
          </div>

          <button onClick={saveAbsence} style={absenceButtonStyle}>
            {t.saveAbsence}
          </button>
        </div>
      )}

      <div style={summaryGridStyle}>
        <div style={summaryBoxStyle}>
          <p>{t.totalHours}</p>
          <h2>{ukupnoSati.toFixed(1)} h</h2>
        </div>

        <div style={summaryBoxStyle}>
          <p>{t.targetHours}</p>
          <h2>{normaSati.toFixed(1)} h</h2>
          <small>
            {radniDani} {t.workdays} × 8.5 h
            {selectedWorker === "ALL"
              ? ` × ${RADNICI.length} ${t.workers}`
              : ""}
          </small>
        </div>

        <div style={summaryBoxStyle}>
          <p>{t.balance}</p>
          <h2 style={{ color: saldo >= 0 ? "#22c55e" : "#ef4444" }}>
            {saldo >= 0 ? "+" : ""}
            {saldo.toFixed(1)} h
          </h2>
        </div>

        <div style={summaryBoxStyle}>
          <p>{t.sick}</p>
          <h2>
            {bolovanjeDani} {t.days}
          </h2>
        </div>

        <div style={summaryBoxStyle}>
          <p>{t.vacation}</p>
          <h2>
            {godisnjiDani} {t.days}
          </h2>
        </div>

        <div style={summaryBoxStyle}>
          <p>{t.holiday}</p>
          <h2>
            {praznikDani} {t.days}
          </h2>
        </div>

        <div style={summaryBoxStyle}>
          <p>{t.vacationRight}</p>
          <h2>
            {godisnjiPravoDani} {t.days}
          </h2>
        </div>

        <div style={summaryBoxStyle}>
          <p>{t.vacationUsedYear}</p>
          <h2>
            {godisnjiIskoristenoGodina} {t.days}
          </h2>
        </div>

        <div style={summaryBoxStyle}>
          <p>{t.vacationRestYear}</p>
          <h2
            style={{
              color: godisnjiOstatakGodina >= 0 ? "#22c55e" : "#ef4444",
            }}
          >
            {godisnjiOstatakGodina} {t.days}
          </h2>
        </div>
      </div>

      <div style={listBoxStyle}>
        <div style={listHeaderStyle}>
          <h2>{t.entries}</h2>

          {isAdmin && (
            <button onClick={downloadPDF} style={downloadButtonStyle}>
              {t.download}
            </button>
          )}
        </div>

        {unosi.length === 0 && <p style={{ color: "#999" }}>{t.noEntries}</p>}

        {unosi.length > 0 && (
          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Datum</th>
                  <th style={thStyle}>Ime</th>
                  <th style={thStyle}>Početak</th>
                  <th style={thStyle}>Pauza</th>
                  <th style={thStyle}>Kraj</th>
                  <th style={thStyle}>Ukupno</th>
                  <th style={thStyle}>Lokacija</th>
                  <th style={thStyle}>Tip</th>
                </tr>
              </thead>

              <tbody>
                {unosi.map((u) => (
                  <tr key={u.id} style={trStyle}>
                    <td style={tdStyle}>{formatDate(u.datum)}</td>
                    <td style={tdStyle}>
                      <strong>{u.radnik}</strong>
                    </td>
                    <td style={tdStyle}>{u.pocetak || "-"}</td>
                    <td style={tdStyle}>{u.pauza ?? "0"}</td>
                    <td style={tdStyle}>{u.kraj || "-"}</td>
                    <td style={tdStrongStyle}>
                      {Number(u.ukupno_sati || u.sati || 0).toFixed(1)} h
                    </td>
                    <td style={tdStyle}>{u.baustelle_lokacija || "-"}</td>
                    <td style={tdStyle}>{u.tip_unosa || "RAD"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "20px",
  marginBottom: "30px",
};

const absenceBoxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  marginBottom: "30px",
  border: "1px solid #333",
};

const absenceGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "20px",
  marginBottom: "20px",
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

const absenceButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "12px",
  padding: "14px 24px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
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

const tableWrapperStyle: any = {
  width: "100%",
  overflowX: "auto",
};

const tableStyle: any = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "900px",
};

const thStyle: any = {
  background: "#000",
  color: "#fff",
  padding: "14px",
  textAlign: "left",
  borderBottom: "1px solid #333",
  fontSize: "15px",
};

const trStyle: any = {
  borderBottom: "1px solid #333",
};

const tdStyle: any = {
  padding: "14px",
  color: "#ddd",
  fontSize: "15px",
};

const tdStrongStyle: any = {
  padding: "14px",
  color: "#fff",
  fontSize: "15px",
  fontWeight: "bold",
};