"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  APP_LANGUAGES,
  type AppLanguage,
  readAppLanguage,
  saveAppLanguage,
} from "../../../lib/language";

const translations: Record<AppLanguage, Record<string, string>> = {
  de: {
    back: "← Zurück",
    title: "Arbeitsstunden",
    totalRoom: "Gesamtstunden in diesem Raum",
    totalSite: "Gesamtstunden auf der Baustelle",
    totalHours: "Gesamtstunden",
    entriesCount: "Anzahl der Einträge",
    noWorkers: "Keine Mitarbeiter",
    workDay: "Arbeitstag",
    vacation: "Urlaub",
    sickLeave: "Krankenstand",
    holiday: "Feiertag",
    start: "Beginn",
    end: "Ende",
    noBreak: "Keine Pause",
    breakLabel: "Pause",
    descriptionPlaceholder:
      "Arbeitsbeschreibung, z.B. WC-Fliesen, Untergrundvorbereitung, Silikonarbeiten...",
    currentEntry: "Aktueller Eintrag",
    save: "Speichern",
    recordedHours: "Erfasste Stunden",
    noHours: "Noch keine Stunden erfasst.",
    date: "Datum",
    type: "Typ",
    description: "Arbeitsbeschreibung",
    total: "Gesamt",
    delete: "Löschen",
    selectWorker: "Mitarbeiter auswählen",
    loadError: "FEHLER BEIM LADEN DER STUNDEN",
    saveError: "FEHLER BEIM SPEICHERN DER STUNDEN",
    deleteConfirm: "Diesen Eintrag wirklich löschen?",
    deleteError: "FEHLER BEIM LÖSCHEN DER STUNDEN",
    language: "Sprache",
  },
  ba: {
    back: "← Nazad",
    title: "Radni sati",
    totalRoom: "Ukupno sati u ovoj prostoriji",
    totalSite: "Ukupno sati na ovoj bausteli",
    totalHours: "Ukupno sati",
    entriesCount: "Broj unosa",
    noWorkers: "Nema radnika",
    workDay: "Radni dan",
    vacation: "Godišnji odmor",
    sickLeave: "Bolovanje",
    holiday: "Praznik",
    start: "Početak",
    end: "Kraj",
    noBreak: "Bez pauze",
    breakLabel: "Pauza",
    descriptionPlaceholder:
      "Opis posla, npr. WC pločice, priprema podloge, silikoniranje...",
    currentEntry: "Trenutni unos",
    save: "Sačuvaj",
    recordedHours: "Upisani sati",
    noHours: "Još nema upisanih sati.",
    date: "Datum",
    type: "Vrsta",
    description: "Opis posla",
    total: "Ukupno",
    delete: "Izbriši",
    selectWorker: "Odaberi radnika",
    loadError: "GREŠKA PRI UČITAVANJU SATI",
    saveError: "GREŠKA PRI ČUVANJU SATI",
    deleteConfirm: "Da li stvarno želiš izbrisati ovaj unos?",
    deleteError: "GREŠKA PRI BRISANJU SATI",
    language: "Jezik",
  },
  uz: {
    back: "← Orqaga",
    title: "Ish soatlari",
    totalRoom: "Bu xonadagi jami soatlar",
    totalSite: "Qurilish obyektidagi jami soatlar",
    totalHours: "Jami soatlar",
    entriesCount: "Yozuvlar soni",
    noWorkers: "Ishchilar yo‘q",
    workDay: "Ish kuni",
    vacation: "Ta’til",
    sickLeave: "Kasallik ta’tili",
    holiday: "Bayram kuni",
    start: "Boshlanish",
    end: "Tugash",
    noBreak: "Tanaffussiz",
    breakLabel: "Tanaffus",
    descriptionPlaceholder:
      "Ish tavsifi, masalan: WC plitka, asos tayyorlash, silikon ishlari...",
    currentEntry: "Joriy yozuv",
    save: "Saqlash",
    recordedHours: "Kiritilgan soatlar",
    noHours: "Hali soatlar kiritilmagan.",
    date: "Sana",
    type: "Turi",
    description: "Ish tavsifi",
    total: "Jami",
    delete: "O‘chirish",
    selectWorker: "Ishchini tanlang",
    loadError: "SOATLARNI YUKLASHDA XATO",
    saveError: "SOATLARNI SAQLASHDA XATO",
    deleteConfirm: "Bu yozuvni o‘chirmoqchimisiz?",
    deleteError: "SOATLARNI O‘CHIRISHDA XATO",
    language: "Til",
  },
  cz: {
    back: "← Zpět",
    title: "Pracovní hodiny",
    totalRoom: "Celkem hodin v této místnosti",
    totalSite: "Celkem hodin na stavbě",
    totalHours: "Celkem hodin",
    entriesCount: "Počet záznamů",
    noWorkers: "Žádní pracovníci",
    workDay: "Pracovní den",
    vacation: "Dovolená",
    sickLeave: "Nemocenská",
    holiday: "Svátek",
    start: "Začátek",
    end: "Konec",
    noBreak: "Bez přestávky",
    breakLabel: "Přestávka",
    descriptionPlaceholder:
      "Popis práce, např. obklady WC, příprava podkladu, silikonování...",
    currentEntry: "Aktuální záznam",
    save: "Uložit",
    recordedHours: "Zadané hodiny",
    noHours: "Zatím nejsou zadány žádné hodiny.",
    date: "Datum",
    type: "Typ",
    description: "Popis práce",
    total: "Celkem",
    delete: "Smazat",
    selectWorker: "Vyberte pracovníka",
    loadError: "CHYBA PŘI NAČÍTÁNÍ HODIN",
    saveError: "CHYBA PŘI UKLÁDÁNÍ HODIN",
    deleteConfirm: "Opravdu chcete tento záznam smazat?",
    deleteError: "CHYBA PŘI MAZÁNÍ HODIN",
    language: "Jazyk",
  },
  en: {
    back: "← Back",
    title: "Working hours",
    totalRoom: "Total hours in this room",
    totalSite: "Total hours on the construction site",
    totalHours: "Total hours",
    entriesCount: "Number of entries",
    noWorkers: "No workers",
    workDay: "Work day",
    vacation: "Vacation",
    sickLeave: "Sick leave",
    holiday: "Public holiday",
    start: "Start",
    end: "End",
    noBreak: "No break",
    breakLabel: "Break",
    descriptionPlaceholder:
      "Work description, e.g. WC tiles, surface preparation, silicone work...",
    currentEntry: "Current entry",
    save: "Save",
    recordedHours: "Recorded hours",
    noHours: "No hours recorded yet.",
    date: "Date",
    type: "Type",
    description: "Work description",
    total: "Total",
    delete: "Delete",
    selectWorker: "Select worker",
    loadError: "ERROR LOADING HOURS",
    saveError: "ERROR SAVING HOURS",
    deleteConfirm: "Do you really want to delete this entry?",
    deleteError: "ERROR DELETING HOURS",
    language: "Language",
  },
};

export default function SatiPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const baustelleId = String(params.id);
  const roomId = searchParams.get("roomId");

  const [lang, setLang] = useState<AppLanguage>("de");
  const [workers, setWorkers] = useState<any[]>([]);
  const [radnik, setRadnik] = useState("");

  const [datum, setDatum] = useState(new Date().toISOString().split("T")[0]);
  const [tipUnosa, setTipUnosa] = useState("RAD");

  const [pocetak, setPocetak] = useState("06:30");
  const [kraj, setKraj] = useState("15:30");
  const [pauza, setPauza] = useState("0.5");
  const [opisPosla, setOpisPosla] = useState("");

  const [sati, setSati] = useState<any[]>([]);

  const t = translations[lang];

  const vremenaPocetak: string[] = [];
  const vremenaKraj: string[] = [];

  for (let h = 6; h <= 19; h++) {
    vremenaPocetak.push(`${String(h).padStart(2, "0")}:00`);
    vremenaPocetak.push(`${String(h).padStart(2, "0")}:30`);
  }

  for (let h = 20; h >= 8; h--) {
    vremenaKraj.push(`${String(h).padStart(2, "0")}:00`);
    vremenaKraj.push(`${String(h).padStart(2, "0")}:30`);
  }

  function changeLanguage(next: AppLanguage) {
    setLang(next);
    saveAppLanguage(next);
  }

  function playNotificationSound() {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 1;
    audio.play().catch(() => {});
  }

  function timeToNumber(time: string) {
    const [h, m] = time.split(":").map(Number);
    return h + m / 60;
  }

  function calcHours() {
    // Godišnji / Urlaub / Vacation / Dovolená uvijek je 8.0 h po danu.
    if (tipUnosa === "GODISNJI") return 8;

    // Bolovanje i praznik ostaju prema postojećoj dnevnoj normi aplikacije.
    if (tipUnosa !== "RAD") return 8.5;

    const total = timeToNumber(kraj) - timeToNumber(pocetak) - Number(pauza);

    if (total < 0) return 0;

    return Number(total.toFixed(2));
  }

  function typeLabel(type: string) {
    if (type === "GODISNJI" || type === "GODIŠNJI") return t.vacation;
    if (type === "BOLOVANJE") return t.sickLeave;
    if (type === "PRAZNIK") return t.holiday;
    return t.workDay;
  }

  const vacationDaysInSummary = new Set<string>();
  const ukupnoSatiProstorije = sati.reduce((total, row) => {
    const type = String(row.tip_unosa || "").toUpperCase();
    const isVacation = type === "GODISNJI" || type === "GODIŠNJI";

    if (isVacation) {
      const key = `${row.radnik || ""}__${row.datum || ""}`;

      // Stari dupli godišnji zapisi za isti dan računaju se samo jednom.
      if (vacationDaysInSummary.has(key)) return total;

      vacationDaysInSummary.add(key);
      return total + 8;
    }

    return total + Number(row.sati ?? row.ukupno_sati ?? 0);
  }, 0);

  async function loadWorkers() {
    const loggedName =
      localStorage.getItem("worker_name") ||
      localStorage.getItem("worker_ime") ||
      localStorage.getItem("worker") ||
      localStorage.getItem("radnik") ||
      localStorage.getItem("ime") ||
      localStorage.getItem("username") ||
      "";

    const loggedRole = localStorage.getItem("worker_role") || "worker";

    if (loggedRole === "worker") {
      setWorkers([{ id: loggedName || "worker", name: loggedName }]);
      setRadnik(loggedName);
      return;
    }

    const { data, error } = await supabase
      .from("workers")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setWorkers([{ id: loggedName || "worker", name: loggedName }]);
      setRadnik(loggedName);
      return;
    }

    const formattedWorkers = (data || []).map((w) => ({
      id: w.id,
      name: w.name || w.ime || w.radnik || "",
    }));

    setWorkers(formattedWorkers);

    if (formattedWorkers.length > 0 && !radnik) {
      setRadnik(formattedWorkers[0].name);
    }
  }

  async function loadHours() {
    let query = supabase
      .from("baustelle_hours")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("datum", { ascending: false });

    if (roomId) {
      query = query.eq("room_id", Number(roomId));
    }

    const { data, error } = await query;

    if (error) {
      alert(t.loadError + ": " + error.message);
      return;
    }

    setSati(data || []);
  }

  async function saveHours() {
    if (!radnik) {
      alert(t.selectWorker);
      return;
    }

    const ukupno = calcHours();

    // Ne dopuštaj dupli godišnji za isti dan i istog radnika.
    if (tipUnosa === "GODISNJI") {
      const { data: existingVacation, error: vacationCheckError } = await supabase
        .from("baustelle_hours")
        .select("id")
        .eq("radnik", radnik)
        .eq("datum", datum)
        .or("tip_unosa.eq.GODISNJI,tip_unosa.eq.GODIŠNJI")
        .limit(1);

      if (vacationCheckError) {
        alert(t.saveError + ": " + vacationCheckError.message);
        return;
      }

      if ((existingVacation || []).length > 0) {
        await loadHours();
        return;
      }
    }

    const { error } = await supabase.from("baustelle_hours").insert([
      {
        baustelle_id: Number(baustelleId),
        room_id: roomId ? Number(roomId) : null,
        radnik,
        datum,
        tip_unosa: tipUnosa,
        pocetak: tipUnosa === "RAD" ? pocetak : null,
        kraj: tipUnosa === "RAD" ? kraj : null,
        pauza: tipUnosa === "RAD" ? Number(pauza) : 0,
        ukupno_sati: ukupno,
        sati: ukupno,
        opis_posla: opisPosla.trim(),
      },
    ]);

    if (error) {
      alert(t.saveError + ": " + error.message);
      return;
    }

    playNotificationSound();

    setOpisPosla("");
    await loadHours();
  }

  async function deleteHours(id: number) {
    const potvrda = confirm(t.deleteConfirm);
    if (!potvrda) return;

    const { error } = await supabase
      .from("baustelle_hours")
      .delete()
      .eq("id", id);

    if (error) {
      alert(t.deleteError + ": " + error.message);
      return;
    }

    await loadHours();
  }

  useEffect(() => {
    setLang(readAppLanguage("de"));
    loadWorkers();
    loadHours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={styles.page}>
      <div style={styles.topRow}>
        <button onClick={() => router.back()} style={styles.backButton}>
          {t.back}
        </button>

        <div style={styles.languageWrap} aria-label={t.language}>
          {APP_LANGUAGES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => changeLanguage(code)}
              style={{
                ...styles.languageButton,
                ...(lang === code ? styles.languageButtonActive : {}),
              }}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <h1 style={styles.title}>{t.title}</h1>

      <section style={styles.summaryBox}>
        <h2 style={styles.summaryTitle}>{roomId ? t.totalRoom : t.totalSite}</h2>

        <div style={styles.summaryGrid}>
          <div>
            <div style={styles.summaryLabel}>{t.totalHours}</div>
            <div style={styles.summaryNumber}>
              {ukupnoSatiProstorije.toFixed(2)} h
            </div>
          </div>

          <div>
            <div style={styles.summaryLabel}>{t.entriesCount}</div>
            <div style={styles.summaryNumber}>{sati.length}</div>
          </div>
        </div>
      </section>

      <section style={styles.box}>
        <select
          value={radnik}
          onChange={(e) => setRadnik(e.target.value)}
          style={styles.input}
        >
          {workers.length === 0 && <option value="">{t.noWorkers}</option>}

          {workers.map((w) => (
            <option key={w.id} value={w.name}>
              {w.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          style={styles.input}
        />

        <select
          value={tipUnosa}
          onChange={(e) => setTipUnosa(e.target.value)}
          style={styles.input}
        >
          <option value="RAD">{t.workDay}</option>
          <option value="GODISNJI">{t.vacation}</option>
          <option value="BOLOVANJE">{t.sickLeave}</option>
          <option value="PRAZNIK">{t.holiday}</option>
        </select>

        {tipUnosa === "RAD" && (
          <>
            <select
              value={pocetak}
              onChange={(e) => setPocetak(e.target.value)}
              style={styles.input}
            >
              {vremenaPocetak.map((v) => (
                <option key={v} value={v}>
                  {t.start}: {v}
                </option>
              ))}
            </select>

            <select
              value={kraj}
              onChange={(e) => setKraj(e.target.value)}
              style={styles.input}
            >
              {vremenaKraj.map((v) => (
                <option key={v} value={v}>
                  {t.end}: {v}
                </option>
              ))}
            </select>

            <select
              value={pauza}
              onChange={(e) => setPauza(e.target.value)}
              style={styles.input}
            >
              <option value="0">{t.noBreak}</option>
              <option value="0.5">{t.breakLabel}: 0.5h</option>
              <option value="1">{t.breakLabel}: 1h</option>
              <option value="1.5">{t.breakLabel}: 1.5h</option>
              <option value="2">{t.breakLabel}: 2h</option>
              <option value="2.5">{t.breakLabel}: 2.5h</option>
            </select>
          </>
        )}

        <textarea
          value={opisPosla}
          onChange={(e) => setOpisPosla(e.target.value)}
          placeholder={t.descriptionPlaceholder}
          style={styles.textarea}
        />

        <div style={styles.totalBox}>
          <div>
            {t.currentEntry}: {calcHours()}h
          </div>
        </div>

        <button onClick={saveHours} style={styles.saveButton}>
          {t.save}
        </button>
      </section>

      <section style={styles.box}>
        <h2>{t.recordedHours}</h2>

        {sati.length === 0 && <p style={styles.emptyText}>{t.noHours}</p>}

        {sati.map((s) => {
          const isVacation =
            String(s.tip_unosa || "").toUpperCase() === "GODISNJI" ||
            String(s.tip_unosa || "").toUpperCase() === "GODIŠNJI";
          const displayHours = isVacation ? 8 : s.ukupno_sati ?? s.sati;

          return (
            <div key={s.id} style={styles.card}>
              <strong>{s.radnik}</strong>

              <div>
                {t.date}: {s.datum}
              </div>
              <div>
                {t.type}: {typeLabel(s.tip_unosa)}
              </div>

              {s.tip_unosa === "RAD" && (
                <div>
                  {s.pocetak} - {s.kraj} |{" "}
                  {Number(s.pauza) === 0
                    ? t.noBreak
                    : `${t.breakLabel}: ${s.pauza}h`}
                </div>
              )}

              {s.opis_posla && (
                <div>
                  {t.description}: {s.opis_posla}
                </div>
              )}

              <div>
                {t.total}: {displayHours}h
              </div>

              <button
                onClick={() => deleteHours(s.id)}
                style={styles.deleteButton}
              >
                {t.delete}
              </button>
            </div>
          );
        })}
      </section>
    </main>
  );
}

const styles: any = {
  page: {
    background: "#000",
    minHeight: "100vh",
    color: "white",
    padding: "30px",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },
  backButton: {
    background: "none",
    border: "none",
    color: "#3b82f6",
    cursor: "pointer",
    fontWeight: "bold",
    padding: 0,
  },
  languageWrap: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
  },
  languageButton: {
    background: "#222",
    color: "white",
    border: "1px solid #333",
    borderRadius: "8px",
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  languageButtonActive: {
    background: "#f97316",
    border: "1px solid #f97316",
  },
  title: {
    fontSize: "60px",
    marginBottom: "30px",
  },
  summaryBox: {
    background: "#111",
    padding: "22px",
    borderRadius: "20px",
    marginBottom: "30px",
    border: "1px solid #222",
  },
  summaryTitle: {
    marginTop: 0,
    marginBottom: "20px",
    color: "#60a5fa",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "18px",
  },
  summaryLabel: {
    color: "#aaa",
    marginBottom: "8px",
  },
  summaryNumber: {
    fontSize: "32px",
    fontWeight: "bold",
  },
  box: {
    background: "#111",
    padding: "20px",
    borderRadius: "20px",
    marginBottom: "30px",
  },
  input: {
    width: "100%",
    padding: "15px",
    marginBottom: "15px",
    background: "#222",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
  },
  textarea: {
    width: "100%",
    minHeight: "120px",
    padding: "15px",
    marginBottom: "15px",
    background: "#222",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    resize: "vertical",
  },
  totalBox: {
    background: "#1f1f1f",
    padding: "18px",
    borderRadius: "12px",
    fontSize: "22px",
    fontWeight: "bold",
    marginBottom: "15px",
  },
  saveButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    padding: "15px 25px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  emptyText: {
    color: "#999",
  },
  card: {
    background: "#222",
    padding: "18px",
    borderRadius: "14px",
    marginTop: "15px",
    display: "grid",
    gap: "8px",
  },
  deleteButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    width: "120px",
  },
};
