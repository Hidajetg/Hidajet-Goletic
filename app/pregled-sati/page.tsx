"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const RADNICI = ["Arnes", "Ramiz", "Abror", "Shohruh", "Harun"];
const ADMINI = ["Hido", "Steffi", "Admin"];

const GODISNJI_DANI_PO_RADNIKU = 25;
const SATI_PO_DANU = 8.5;

const PDF_BUCKET = "pdf-assets";
const PDF_LOGO_TOP = "Gore.heic";
const PDF_SIDE_IMAGE = "Strana.heic";
const PDF_MOUNTAIN_BG = "pozadina.png";

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

const germanMonthNames = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

const germanWeekdays = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

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

  function getGermanWeekday(dateString: string) {
    const date = new Date(dateString);
    return germanWeekdays[date.getDay()] || "-";
  }

  function safeText(value: any) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getBaustelleText(u: any) {
    if (u.baustelle_naziv && u.baustelle_naziv !== "-") {
      return u.baustelle_naziv;
    }

    if (u.baustelle_lokacija && u.baustelle_lokacija !== "-") {
      return u.baustelle_lokacija;
    }

    return "-";
  }

  function getStoragePublicUrl(fileName: string) {
    return supabase.storage.from(PDF_BUCKET).getPublicUrl(fileName).data.publicUrl;
  }

  function downloadPDF() {
    if (!isAdmin) {
      alert(t.onlyAdminDownload);
      return;
    }

    const logoTopUrl = getStoragePublicUrl(PDF_LOGO_TOP);
    const sideImageUrl = getStoragePublicUrl(PDF_SIDE_IMAGE);
    const mountainBgUrl = getStoragePublicUrl(PDF_MOUNTAIN_BG);

    const workerLabel =
      selectedWorker === "ALL" ? "Alle Mitarbeiter" : selectedWorker || workerName;

    const monthLabel = germanMonthNames[month - 1];

    const rowsHtml = unosi
      .map((u) => {
        const sati = Number(u.ukupno_sati || u.sati || 0).toFixed(1);
        const baustelleText = getBaustelleText(u);

        return `
          <tr>
            <td>${safeText(formatDate(u.datum))}</td>
            <td>${safeText(getGermanWeekday(u.datum))}</td>
            <td>${safeText(u.radnik || "")}</td>
            <td>${safeText(u.pocetak || "-")}</td>
            <td>${safeText(String(u.pauza ?? "0"))}</td>
            <td>${safeText(u.kraj || "-")}</td>
            <td class="hours-cell">${safeText(sati)} h</td>
            <td>${safeText(baustelleText)}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Arbeitszeitübersicht - ${safeText(workerLabel)} - ${safeText(
      monthLabel
    )} ${year}</title>

          <style>
            @page {
              size: A4 portrait;
              margin: 8mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              background: #ffffff;
              color: #111111;
              font-family: Arial, Helvetica, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .page {
              width: 100%;
              min-height: 100vh;
              position: relative;
              overflow: hidden;
              background: #ffffff;
            }

            .side-strip {
              position: absolute;
              left: 0;
              top: 0;
              bottom: 0;
              width: 44px;
              overflow: hidden;
              background: #111;
            }

            .side-strip img {
              width: 44px;
              height: 100%;
              object-fit: cover;
              object-position: center;
              display: block;
            }

            .content {
              margin-left: 52px;
              position: relative;
              z-index: 2;
            }

            .header {
              height: 128px;
              position: relative;
              overflow: hidden;
              border-bottom: 2px solid #f47b20;
              margin-bottom: 8px;
              background: #fff;
            }

            .mountain-bg {
              position: absolute;
              left: 210px;
              right: 0;
              top: 0;
              height: 128px;
              opacity: 0.95;
              z-index: 1;
            }

            .mountain-bg img {
              width: 100%;
              height: 128px;
              object-fit: cover;
              object-position: center top;
              display: block;
            }

            .mountain-bg::after {
              content: "";
              position: absolute;
              left: 0;
              right: 0;
              top: 0;
              bottom: 0;
              background: linear-gradient(90deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.72) 34%, rgba(255,255,255,0.32) 100%);
            }

            .logo-box {
              position: absolute;
              left: 0;
              top: 18px;
              width: 285px;
              height: 62px;
              z-index: 3;
            }

            .logo-box img {
              width: 100%;
              height: 62px;
              object-fit: contain;
              object-position: left center;
              display: block;
            }

            .title-box {
              position: absolute;
              right: 0;
              top: 22px;
              text-align: right;
              z-index: 3;
            }

            .title-box h1 {
              margin: 0;
              color: #111111;
              font-size: 25px;
              line-height: 1;
              font-weight: 900;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }

            .title-box p {
              margin: 8px 0 0 0;
              color: #111111;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-bottom: 2px solid #f47b20;
              padding-bottom: 6px;
              display: inline-block;
            }

            .summary-grid {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 6px;
              margin-bottom: 8px;
            }

            .summary-box {
              border: 1px solid #d8d8d8;
              border-radius: 5px;
              background: rgba(255,255,255,0.97);
              padding: 5px 6px 6px 6px;
              min-height: 42px;
              border-bottom: 2px solid #f47b20;
            }

            .summary-label {
              color: #333333;
              font-size: 7.4px;
              line-height: 1;
              text-transform: uppercase;
              font-weight: 900;
              letter-spacing: 0.35px;
              margin-bottom: 4px;
            }

            .summary-value {
              color: #111111;
              font-size: 12.6px;
              line-height: 1;
              font-weight: 900;
            }

            .summary-small {
              color: #666666;
              font-size: 7px;
              line-height: 1.15;
              margin-top: 4px;
            }

            .negative {
              color: #e95b16;
            }

            .positive {
              color: #047857;
            }

            .table-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin: 5px 0 5px 0;
            }

            .table-header h2 {
              margin: 0;
              color: #111111;
              font-size: 11px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.4px;
            }

            .period {
              color: #555555;
              font-size: 8px;
              font-weight: 700;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              border: 1px solid #d9d9d9;
            }

            th {
              background: #111111;
              color: #ffffff;
              padding: 6px 4px;
              font-size: 8px;
              line-height: 1.1;
              text-align: left;
              border-right: 1px solid #333333;
              border-bottom: 3px solid #f47b20;
              text-transform: uppercase;
              letter-spacing: 0.2px;
              font-weight: 900;
            }

            td {
              padding: 5px 4px;
              font-size: 8.8px;
              line-height: 1.2;
              border-right: 1px solid #e2e2e2;
              border-bottom: 1px solid #e4e4e4;
              vertical-align: middle;
              word-wrap: break-word;
            }

            tbody tr:nth-child(even) td {
              background: #f7f7f7;
            }

            tbody tr:nth-child(odd) td {
              background: #ffffff;
            }

            .hours-cell {
              font-weight: 900;
              color: #111111;
            }

            .footer {
              margin-top: 8px;
              border-top: 2px solid #111111;
              padding-top: 5px;
              display: flex;
              justify-content: space-between;
              color: #111111;
              font-size: 8px;
              line-height: 1.3;
              font-weight: 700;
            }

            .footer strong {
              color: #f47b20;
              font-weight: 900;
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>

        <body>
          <div class="page">
            <div class="side-strip">
              <img src="${safeText(sideImageUrl)}" />
            </div>

            <div class="content">
              <div class="header">
                <div class="mountain-bg">
                  <img src="${safeText(mountainBgUrl)}" />
                </div>

                <div class="logo-box">
                  <img src="${safeText(logoTopUrl)}" />
                </div>

                <div class="title-box">
                  <h1>Arbeitszeitübersicht</h1>
                  <p>Monatlicher Auszug der Arbeitszeiten</p>
                </div>
              </div>

              <div class="summary-grid">
                <div class="summary-box">
                  <div class="summary-label">Mitarbeiter</div>
                  <div class="summary-value">${safeText(workerLabel)}</div>
                  <div class="summary-small">Gesamtübersicht</div>
                </div>

                <div class="summary-box">
                  <div class="summary-label">Monat / Jahr</div>
                  <div class="summary-value">${safeText(monthLabel)} ${year}</div>
                  <div class="summary-small">Ausgewählter Zeitraum</div>
                </div>

                <div class="summary-box">
                  <div class="summary-label">Fond Arbeitszeiten</div>
                  <div class="summary-value">${normaSati.toFixed(1)} h</div>
                  <div class="summary-small">${radniDani} Arbeitstage × 8.5 h${
      selectedWorker === "ALL" ? ` × ${RADNICI.length}` : ""
    }</div>
                </div>

                <div class="summary-box">
                  <div class="summary-label">Geleistete Stunden</div>
                  <div class="summary-value">${ukupnoSati.toFixed(1)} h</div>
                  <div class="summary-small">Summe im Monat</div>
                </div>

                <div class="summary-box">
                  <div class="summary-label">Differenz</div>
                  <div class="summary-value ${
                    saldo >= 0 ? "positive" : "negative"
                  }">${saldo >= 0 ? "+" : ""}${saldo.toFixed(1)} h</div>
                  <div class="summary-small">Soll / Ist</div>
                </div>
              </div>

              <div class="table-header">
                <h2>Detailübersicht Arbeitszeiten</h2>
                <div class="period">${safeText(workerLabel)} · ${safeText(
      monthLabel
    )} ${year}</div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th style="width: 12%;">Datum</th>
                    <th style="width: 13%;">Wochentag</th>
                    <th style="width: 14%;">Mitarbeiter</th>
                    <th style="width: 12%;">Arbeitsbeginn</th>
                    <th style="width: 10%;">Pausenzeit</th>
                    <th style="width: 12%;">Arbeitsende</th>
                    <th style="width: 12%;">Arbeitsdauer</th>
                    <th style="width: 15%;">Baustelle</th>
                  </tr>
                </thead>

                <tbody>
                  ${
                    rowsHtml ||
                    `<tr><td colspan="8" style="text-align:center; padding:20px;">Für diesen Monat sind keine Arbeitszeiten eingetragen.</td></tr>`
                  }
                </tbody>
              </table>

              <div class="footer">
                <div>
                  <strong>NOCKER & BERNARDI GmbH</strong><br />
                  Fliesen & Naturstein Verkauf
                </div>

                <div style="text-align:right;">
                  Inweg 3<br />
                  A-6170 Zirl
                </div>
              </div>
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
                  <th style={thStyle}>Baustelle</th>
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
                    <td style={tdStyle}>{getBaustelleText(u)}</td>
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