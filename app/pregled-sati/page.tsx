"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const RADNICI = ["Arnes", "Ramiz", "Abror", "Shohruh", "Harun"];
const ADMINI = ["Hido", "Steffi", "Admin"];

const GODISNJI_DANI_PO_RADNIKU = 25;
const SATI_PO_DANU = 8.5;

const translations: any = {
  de: {
    back: "Zurück zum Dashboard",
    title: "Stundenübersicht",
    loggedIn: "Angemeldet",
    worker: "Mitarbeiter",
    allWorkers: "Alle Mitarbeiter",
    year: "Jahr",
    month: "Monat",
    totalHours: "Gesamtstunden",
    targetHours: "Sollstunden",
    balance: "Saldo",
    sick: "Krankenstand",
    vacation: "Urlaub",
    holiday: "Feiertag",
    entries: "Einträge im Monat",
    download: "CSV herunterladen",
    noEntries: "Keine Stundeneinträge für diesen Monat.",
    workdays: "Arbeitstage",
    workers: "Mitarbeiter",
    days: "Tage",
    location: "Ort",
    addAbsence: "Urlaub / Krankenstand / Feiertag hinzufügen",
    absenceType: "Art",
    fromDate: "Von Datum",
    toDate: "Bis Datum",
    saveAbsence: "Speichern",
    vacationRight: "Urlaubsanspruch",
    vacationUsedYear: "Genutzt im Jahr",
    vacationRestYear: "Rest im Jahr",
    selectWorker: "Mitarbeiter auswählen",
    selectType: "Art auswählen",
    enterDate: "Datum auswählen",
    dateWrong: "Bis Datum darf nicht vor Von Datum liegen.",
    onlyAdmin: "Nur Admin kann Urlaub, Krankenstand oder Feiertag eintragen.",
    absenceSaved: "Eintrag gespeichert.",
  },
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
    balance: "Saldo",
    sick: "Bolovanje",
    vacation: "Godišnji odmor",
    holiday: "Praznik",
    entries: "Unosi u mjesecu",
    download: "Preuzmi CSV",
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
    absenceSaved: "Odsustvo je sačuvano.",
  },
  uz: {
    back: "Dashboardga qaytish",
    title: "Ish soatlari",
    loggedIn: "Kirish",
    worker: "Ishchi",
    allWorkers: "Barcha ishchilar",
    year: "Yil",
    month: "Oy",
    totalHours: "Jami soatlar",
    targetHours: "Norma soatlar",
    balance: "Balans",
    sick: "Kasallik",
    vacation: "Ta’til",
    holiday: "Bayram",
    entries: "Oy yozuvlari",
    download: "CSV yuklab olish",
    noEntries: "Bu oy uchun yozuvlar yo‘q.",
    workdays: "ish kuni",
    workers: "ishchi",
    days: "kun",
    location: "Manzil",
    addAbsence: "Ta’til / kasallik / bayram qo‘shish",
    absenceType: "Turi",
    fromDate: "Boshlanish sanasi",
    toDate: "Tugash sanasi",
    saveAbsence: "Saqlash",
    vacationRight: "Ta’til huquqi",
    vacationUsedYear: "Yilda ishlatilgan",
    vacationRestYear: "Yilda qolgan",
    selectWorker: "Ishchini tanlang",
    selectType: "Turini tanlang",
    enterDate: "Sanani tanlang",
    dateWrong: "Tugash sanasi boshlanish sanasidan oldin bo‘lishi mumkin emas.",
    onlyAdmin: "Faqat admin ta’til, kasallik yoki bayram qo‘sha oladi.",
    absenceSaved: "Yozuv saqlandi.",
  },
  en: {
    back: "Back to Dashboard",
    title: "Hours Overview",
    loggedIn: "Logged in",
    worker: "Worker",
    allWorkers: "All Workers",
    year: "Year",
    month: "Month",
    totalHours: "Total Hours",
    targetHours: "Target Hours",
    balance: "Balance",
    sick: "Sick Leave",
    vacation: "Vacation",
    holiday: "Holiday",
    entries: "Monthly Entries",
    download: "Download CSV",
    noEntries: "No hour entries for this month.",
    workdays: "workdays",
    workers: "workers",
    days: "days",
    location: "Location",
    addAbsence: "Add vacation / sick leave / holiday",
    absenceType: "Type",
    fromDate: "From date",
    toDate: "To date",
    saveAbsence: "Save absence",
    vacationRight: "Vacation entitlement",
    vacationUsedYear: "Used this year",
    vacationRestYear: "Remaining this year",
    selectWorker: "Select worker",
    selectType: "Select type",
    enterDate: "Select date",
    dateWrong: "To date cannot be before from date.",
    onlyAdmin: "Only admin can add vacation, sick leave or holiday.",
    absenceSaved: "Absence saved.",
  },
};

const monthNames: any = {
  de: [
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
  ],
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
  uz: [
    "Yanvar",
    "Fevral",
    "Mart",
    "Aprel",
    "May",
    "Iyun",
    "Iyul",
    "Avgust",
    "Sentabr",
    "Oktabr",
    "Noyabr",
    "Dekabr",
  ],
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
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

  function downloadCSV() {
    const rows = [
      [
        "Datum",
        t.worker,
        "Tip",
        "Baustelle",
        t.location,
        "Pocetak",
        "Kraj",
        "Pauza",
        "Sati",
      ],
      ...unosi.map((u) => [
        u.datum,
        u.radnik || "",
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
    a.download = `pregled-sati-${selectedWorker}-${year}-${String(
      month
    ).padStart(2, "0")}.csv`;

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

          <button onClick={downloadCSV} style={downloadButtonStyle}>
            {t.download}
          </button>
        </div>

        {unosi.length === 0 && <p style={{ color: "#999" }}>{t.noEntries}</p>}

        {unosi.map((u) => (
          <div key={u.id} style={rowStyle}>
            <div>
              <strong>{formatDate(u.datum)}</strong>

              <p style={{ margin: "6px 0 0 0", color: "#f97316" }}>
                {t.worker}: <strong>{u.radnik}</strong>
              </p>

              <p style={{ margin: "6px 0 0 0", color: "#aaa" }}>
                {u.tip_unosa || "RAD"}
              </p>

              <p style={{ margin: "6px 0 0 0" }}>
                Baustelle: <strong>{u.baustelle_naziv}</strong>
              </p>

              <p style={{ margin: "6px 0 0 0", color: "#aaa" }}>
                {t.location}: {u.baustelle_lokacija}
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