"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";

const translations: any = {
  de: {
    back: "Zurück zum Raum",
    title: "Leistung",
    workDuration: "Arbeitsdauer",
    workHours: "Arbeitsstunden",
    productivityHours: "Leistungsstunden",
    difference: "Differenz",
    workHoursText: "Summe aller eingetragenen Arbeitsstunden in diesem Raum",
    productivityHoursText: "Summe aller freien Eingaben mit Einheit h",
    worker: "Mitarbeiter",
    workerMissing: "Angemeldeter Mitarbeiter wurde nicht gefunden",
    selectPosition: "Position auswählen",
    freeInput: "Freie Eingabe",
    manualInput: "manuelle Eingabe",
    backPositions: "Zurück zu den Positionen",
    workName: "Arbeitsbezeichnung",
    format: "Fliesenformat, z.B. 60x120",
    quantity: "Menge",
    add: "Hinzufügen",
    list: "Leistungsliste",
    noEntries: "Noch keine Einträge vorhanden.",
    employee: "Mitarbeiter",
    date: "Datum",
    delete: "Löschen",
    choosePosition: "Position auswählen.",
    loginAgain:
      "Angemeldeter Mitarbeiter wurde nicht gefunden. Bitte erneut anmelden.",
    enterQuantity: "Menge eingeben.",
    enterWorkName: "Arbeitsbezeichnung eingeben.",
    deleteConfirm: "Diesen Eintrag wirklich löschen?",
    loadError: "FEHLER BEIM LADEN DER LEISTUNG: ",
    loadHoursError: "FEHLER BEIM LADEN DER GESAMTSTUNDEN: ",
    saveError: "FEHLER BEIM SPEICHERN DER LEISTUNG: ",
    updateError: "FEHLER BEIM AKTUALISIEREN DER LEISTUNG: ",
    deleteError: "FEHLER BEIM LÖSCHEN DER LEISTUNG: ",
  },
  ba: {
    back: "Nazad na prostoriju",
    title: "Produktivnost",
    workDuration: "Trajanje posla",
    workHours: "Radni sati",
    productivityHours: "Sati u produktivnosti",
    difference: "Razlika",
    workHoursText: "Zbir svih sati dodanih u ovoj prostoriji",
    productivityHoursText: "Zbir svih slobodnih unosa sa jedinicom h",
    worker: "Radnik",
    workerMissing: "Nije pronađen prijavljeni radnik",
    selectPosition: "Odaberi poziciju",
    freeInput: "Slobodno dodavanje",
    manualInput: "ručni unos",
    backPositions: "Nazad na pozicije",
    workName: "Naziv posla",
    format: "Format keramike, npr. 60x120",
    quantity: "Količina",
    add: "Dodaj",
    list: "Lista učinka",
    noEntries: "Još nema unosa.",
    employee: "Radnik",
    date: "Datum",
    delete: "Obriši",
    choosePosition: "Odaberi poziciju.",
    loginAgain: "Nije pronađen prijavljeni radnik. Prijavi se ponovo.",
    enterQuantity: "Unesi količinu.",
    enterWorkName: "Unesi naziv posla.",
    deleteConfirm: "Da li želiš obrisati ovaj unos?",
    loadError: "GREŠKA KOD UČITAVANJA PRODUKTIVNOSTI: ",
    loadHoursError: "GREŠKA KOD UČITAVANJA SATI: ",
    saveError: "GREŠKA KOD SPREMANJA PRODUKTIVNOSTI: ",
    updateError: "GREŠKA KOD AŽURIRANJA PRODUKTIVNOSTI: ",
    deleteError: "GREŠKA KOD BRISANJA PRODUKTIVNOSTI: ",
  },
  uz: {
    back: "Xonaga qaytish",
    title: "Ish unumdorligi",
    workDuration: "Ish davomiyligi",
    workHours: "Ish soatlari",
    productivityHours: "Unumdorlik soatlari",
    difference: "Farq",
    workHoursText: "Ushbu xonaga kiritilgan barcha ish soatlari yig‘indisi",
    productivityHoursText: "h birligidagi barcha erkin kiritilgan soatlar yig‘indisi",
    worker: "Ishchi",
    workerMissing: "Kirish qilgan ishchi topilmadi",
    selectPosition: "Pozitsiyani tanlang",
    freeInput: "Erkin kiritish",
    manualInput: "qo‘lda kiritish",
    backPositions: "Pozitsiyalarga qaytish",
    workName: "Ish nomi",
    format: "Plitka formati, masalan 60x120",
    quantity: "Miqdor",
    add: "Qo‘shish",
    list: "Ishlar ro‘yxati",
    noEntries: "Hozircha yozuvlar yo‘q.",
    employee: "Ishchi",
    date: "Sana",
    delete: "O‘chirish",
    choosePosition: "Pozitsiyani tanlang.",
    loginAgain: "Kirish qilgan ishchi topilmadi. Qayta kiring.",
    enterQuantity: "Miqdorni kiriting.",
    enterWorkName: "Ish nomini kiriting.",
    deleteConfirm: "Ushbu yozuvni o‘chirmoqchimisiz?",
    loadError: "ISH UNUMDORLIGINI YUKLASHDA XATOLIK: ",
    loadHoursError: "SOATLARNI YUKLASHDA XATOLIK: ",
    saveError: "ISH UNUMDORLIGINI SAQLASHDA XATOLIK: ",
    updateError: "ISH UNUMDORLIGINI YANGILASHDA XATOLIK: ",
    deleteError: "ISH UNUMDORLIGINI O‘CHIRISHDA XATOLIK: ",
  },
  en: {
    back: "Back to room",
    title: "Productivity",
    workDuration: "Work duration",
    workHours: "Work hours",
    productivityHours: "Productivity hours",
    difference: "Difference",
    workHoursText: "Sum of all work hours added to this room",
    productivityHoursText: "Sum of all free entries with unit h",
    worker: "Worker",
    workerMissing: "Logged-in worker was not found",
    selectPosition: "Select position",
    freeInput: "Free input",
    manualInput: "manual input",
    backPositions: "Back to positions",
    workName: "Work name",
    format: "Tile format, e.g. 60x120",
    quantity: "Quantity",
    add: "Add",
    list: "Productivity list",
    noEntries: "No entries yet.",
    employee: "Worker",
    date: "Date",
    delete: "Delete",
    choosePosition: "Select position.",
    loginAgain: "Logged-in worker was not found. Please log in again.",
    enterQuantity: "Enter quantity.",
    enterWorkName: "Enter work name.",
    deleteConfirm: "Do you want to delete this entry?",
    loadError: "LOAD PRODUCTIVITY ERROR: ",
    loadHoursError: "LOAD HOURS ERROR: ",
    saveError: "SAVE PRODUCTIVITY ERROR: ",
    updateError: "UPDATE PRODUCTIVITY ERROR: ",
    deleteError: "DELETE PRODUCTIVITY ERROR: ",
  },
};

const pozicije = [
  {
    key: "BODEN",
    jedinica: "m²",
    label: {
      de: "Boden",
      ba: "Pod",
      uz: "Pol",
      en: "Floor",
    },
  },
  {
    key: "WAND",
    jedinica: "m²",
    label: {
      de: "Wand",
      ba: "Zid",
      uz: "Devor",
      en: "Wall",
    },
  },
  {
    key: "SOCKEL",
    jedinica: "lfm",
    label: {
      de: "Sockel",
      ba: "Sockel / lajsna",
      uz: "Plintus",
      en: "Skirting",
    },
  },
  {
    key: "STUFENSOCKEL",
    jedinica: "lfm",
    label: {
      de: "Stufensockel",
      ba: "Sockel stepenice",
      uz: "Zina plintusi",
      en: "Stair skirting",
    },
  },
  {
    key: "SCHIENE",
    jedinica: "lfm",
    label: {
      de: "Schiene",
      ba: "Schiene / lajsna",
      uz: "Profil",
      en: "Profile",
    },
  },
  {
    key: "SILIKON",
    jedinica: "lfm",
    label: {
      de: "Silikon bis 5 mm",
      ba: "Silikon do 5 mm",
      uz: "Silikon 5 mm gacha",
      en: "Silicone up to 5 mm",
    },
  },
  {
    key: "ACRYL",
    jedinica: "lfm",
    label: {
      de: "Acryl bis 5 mm",
      ba: "Acryl do 5 mm",
      uz: "Akril 5 mm gacha",
      en: "Acrylic up to 5 mm",
    },
  },
  {
    key: "STUFEN",
    jedinica: "lfm",
    label: {
      de: "Stufen",
      ba: "Stepenice",
      uz: "Zinalar",
      en: "Stairs",
    },
  },
  {
    key: "FREE",
    jedinica: "",
    label: {
      de: "Freie Eingabe",
      ba: "Slobodno dodavanje",
      uz: "Erkin kiritish",
      en: "Free input",
    },
  },
];

export default function ProduktivnostPage() {
  const params = useParams();

  const baustelleId = String(params.id);
  const roomId = String(params.roomId);

  const [lang, setLang] = useState("ba");

  const [radnik, setRadnik] = useState("");
  const [aktivnaPozicija, setAktivnaPozicija] = useState<any | null>(null);

  const [kolicina, setKolicina] = useState("");
  const [format, setFormat] = useState("");

  const [slobodniNaziv, setSlobodniNaziv] = useState("");
  const [slobodnaJedinica, setSlobodnaJedinica] = useState("h");

  const [unosi, setUnosi] = useState<any[]>([]);
  const [ukupnoSati, setUkupnoSati] = useState(0);

  const t = translations[lang] || translations.ba;

  const ukupnoProduktivnostSati = unosi.reduce((total, row) => {
    if (String(row.jedinica).toLowerCase() === "h") {
      return total + Number(row.kolicina || 0);
    }

    return total;
  }, 0);

  const razlikaSati = ukupnoSati - ukupnoProduktivnostSati;

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") || "ba";
    setLang(savedLang);

    const prijavljeniRadnik =
      localStorage.getItem("worker_name") ||
      localStorage.getItem("worker_ime") ||
      localStorage.getItem("worker") ||
      localStorage.getItem("radnik") ||
      localStorage.getItem("ime") ||
      localStorage.getItem("username") ||
      localStorage.getItem("logged_worker") ||
      localStorage.getItem("loggedWorker") ||
      localStorage.getItem("current_worker") ||
      "";

    setRadnik(prijavljeniRadnik);

    loadProduktivnost();
    loadUkupnoSati();
  }, []);

  function playNotificationSound() {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 1;
    audio.play().catch(() => {});
  }

  function labelPozicije(p: any) {
    return p.label?.[lang] || p.label?.ba || p.key;
  }

  function isFreePosition(p: any) {
    return p.key === "FREE";
  }

  async function loadProduktivnost() {
    const { data, error } = await supabase
      .from("produktivnost")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .eq("room_id", Number(roomId))
      .order("id", { ascending: false });

    if (error) {
      alert(t.loadError + error.message);
      return;
    }

    setUnosi(data || []);
  }

  async function loadUkupnoSati() {
    const { data, error } = await supabase
      .from("baustelle_hours")
      .select("sati, ukupno_sati, room_id, baustelle_id")
      .eq("baustelle_id", Number(baustelleId))
      .eq("room_id", Number(roomId));

    if (error) {
      alert(t.loadHoursError + error.message);
      setUkupnoSati(0);
      return;
    }

    const suma = (data || []).reduce((total, row) => {
      return total + Number(row.sati ?? row.ukupno_sati ?? 0);
    }, 0);

    setUkupnoSati(Number(suma.toFixed(2)));
  }

  async function dodajProduktivnost() {
    if (!aktivnaPozicija) {
      alert(t.choosePosition);
      return;
    }

    if (!radnik) {
      alert(t.loginAgain);
      return;
    }

    if (!kolicina || Number(kolicina) <= 0) {
      alert(t.enterQuantity);
      return;
    }

    let nazivZaSpremanje = labelPozicije(aktivnaPozicija);
    let jedinicaZaSpremanje = aktivnaPozicija.jedinica;
    let napomena = "";

    if (isFreePosition(aktivnaPozicija)) {
      if (!slobodniNaziv.trim()) {
        alert(t.enterWorkName);
        return;
      }

      nazivZaSpremanje = slobodniNaziv.trim();
      jedinicaZaSpremanje = slobodnaJedinica;
    }

    if (
      (aktivnaPozicija.key === "BODEN" || aktivnaPozicija.key === "WAND") &&
      format.trim()
    ) {
      napomena = `Format: ${format.trim()}`;
    }

    const { error } = await supabase.from("produktivnost").insert([
      {
        baustelle_id: Number(baustelleId),
        room_id: Number(roomId),
        datum: new Date().toISOString().split("T")[0],
        radnik,
        pozicija: nazivZaSpremanje,
        kolicina: Number(kolicina),
        jedinica: jedinicaZaSpremanje,
        napomena,
      },
    ]);

    if (error) {
      alert(t.saveError + error.message);
      return;
    }

    playNotificationSound();

    setKolicina("");
    setFormat("");
    setSlobodniNaziv("");
    setSlobodnaJedinica("h");
    setAktivnaPozicija(null);

    await loadProduktivnost();
    await loadUkupnoSati();
  }

  async function promijeniKolicinu(id: number, trenutna: number, promjena: number) {
    const novaKolicina = Number(trenutna) + promjena;

    if (novaKolicina <= 0) {
      await obrisiProduktivnost(id);
      return;
    }

    const { error } = await supabase
      .from("produktivnost")
      .update({ kolicina: novaKolicina })
      .eq("id", id);

    if (error) {
      alert(t.updateError + error.message);
      return;
    }

    await loadProduktivnost();
  }

  async function obrisiProduktivnost(id: number) {
    const potvrda = confirm(t.deleteConfirm);
    if (!potvrda) return;

    const { error } = await supabase
      .from("produktivnost")
      .delete()
      .eq("id", id);

    if (error) {
      alert(t.deleteError + error.message);
      return;
    }

    await loadProduktivnost();
  }

  return (
    <main style={styles.page}>
      <Link
        href={`/baustellen/${baustelleId}/prostorije/${roomId}`}
        style={styles.backLink}
      >
        ← {t.back}
      </Link>

      <h1 style={styles.title}>{t.title}</h1>

      <section style={styles.infoBox}>
        <h2 style={styles.infoTitle}>{t.workDuration}</h2>

        <div style={styles.hoursGrid}>
          <div style={styles.hourCard}>
            <div style={styles.hourLabel}>{t.workHours}</div>
            <div style={styles.infoNumber}>{ukupnoSati.toFixed(2)} h</div>
            <div style={styles.infoSmall}>{t.workHoursText}</div>
          </div>

          <div style={styles.hourCard}>
            <div style={styles.hourLabel}>{t.productivityHours}</div>
            <div style={styles.infoNumber}>
              {ukupnoProduktivnostSati.toFixed(2)} h
            </div>
            <div style={styles.infoSmall}>{t.productivityHoursText}</div>
          </div>

          <div style={styles.hourCard}>
            <div style={styles.hourLabel}>{t.difference}</div>
            <div
              style={{
                ...styles.infoNumber,
                color: razlikaSati === 0 ? "#16a34a" : "#f97316",
              }}
            >
              {razlikaSati.toFixed(2)} h
            </div>
          </div>
        </div>
      </section>

      <section style={styles.box}>
        <h2 style={styles.subtitle}>{t.worker}</h2>

        <input
          value={radnik || t.workerMissing}
          readOnly
          style={styles.input}
        />
      </section>

      {!aktivnaPozicija && (
        <section style={styles.box}>
          <h2 style={styles.subtitle}>{t.selectPosition}</h2>

          <div style={styles.grid}>
            {pozicije.map((p) => (
              <button
                key={p.key}
                onClick={() => setAktivnaPozicija(p)}
                style={
                  isFreePosition(p) ? styles.freeButton : styles.positionButton
                }
              >
                <strong>{labelPozicije(p)}</strong>
                <span style={styles.unitText}>
                  {p.jedinica || t.manualInput}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {aktivnaPozicija && (
        <section style={styles.box}>
          <button
            onClick={() => {
              setAktivnaPozicija(null);
              setKolicina("");
              setFormat("");
              setSlobodniNaziv("");
              setSlobodnaJedinica("h");
            }}
            style={styles.backButton}
          >
            ← {t.backPositions}
          </button>

          <h2 style={styles.groupTitle}>{labelPozicije(aktivnaPozicija)}</h2>

          {isFreePosition(aktivnaPozicija) && (
            <>
              <input
                value={slobodniNaziv}
                onChange={(e) => setSlobodniNaziv(e.target.value)}
                placeholder={t.workName}
                style={styles.input}
              />

              <select
                value={slobodnaJedinica}
                onChange={(e) => setSlobodnaJedinica(e.target.value)}
                style={styles.input}
              >
                <option value="h">h</option>
                <option value="m²">m²</option>
                <option value="lfm">lfm</option>
                <option value="Stk.">Stk.</option>
                <option value="m">m</option>
              </select>
            </>
          )}

          {(aktivnaPozicija.key === "BODEN" ||
            aktivnaPozicija.key === "WAND") && (
            <input
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              placeholder={t.format}
              style={styles.input}
            />
          )}

          <input
            value={kolicina}
            onChange={(e) => setKolicina(e.target.value)}
            placeholder={`${t.quantity} (${
              isFreePosition(aktivnaPozicija)
                ? slobodnaJedinica
                : aktivnaPozicija.jedinica
            })`}
            type="number"
            style={styles.input}
          />

          <button onClick={dodajProduktivnost} style={styles.saveButton}>
            {t.add}
          </button>
        </section>
      )}

      <section style={styles.box}>
        <h2 style={styles.subtitle}>
          {t.list} ({unosi.length})
        </h2>

        {unosi.length === 0 && <p style={styles.emptyText}>{t.noEntries}</p>}

        {unosi.map((u) => (
          <div key={u.id} style={styles.savedCard}>
            <strong>{u.pozicija}</strong>

            <div style={styles.savedQuantity}>
              {u.kolicina} {u.jedinica}
            </div>

            {u.napomena && <div style={styles.note}>{u.napomena}</div>}

            <div style={styles.note}>
              {t.employee}: {u.radnik}
            </div>

            <div style={styles.note}>
              {t.date}: {u.datum}
            </div>

            <div style={styles.buttonRow}>
              <button
                onClick={() => promijeniKolicinu(u.id, u.kolicina, 1)}
                style={styles.plusButton}
              >
                +
              </button>

              <button
                onClick={() => promijeniKolicinu(u.id, u.kolicina, -1)}
                style={styles.minusButton}
              >
                -
              </button>

              <button
                onClick={() => obrisiProduktivnost(u.id)}
                style={styles.deleteButton}
              >
                {t.delete}
              </button>
            </div>
          </div>
        ))}
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
  backLink: {
    color: "#3b82f6",
    textDecoration: "none",
    fontWeight: "bold",
  },
  title: {
    fontSize: "56px",
    fontWeight: "bold",
    marginTop: "25px",
    marginBottom: "30px",
  },
  infoBox: {
    background: "#111",
    padding: "20px",
    borderRadius: "20px",
    marginBottom: "30px",
    border: "1px solid #222",
  },
  infoTitle: {
    margin: 0,
    marginBottom: "18px",
    color: "#60a5fa",
  },
  hoursGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "15px",
  },
  hourCard: {
    background: "#1f1f1f",
    padding: "18px",
    borderRadius: "16px",
    border: "1px solid #333",
  },
  hourLabel: {
    color: "#aaa",
    marginBottom: "8px",
    fontWeight: "bold",
  },
  infoNumber: {
    fontSize: "34px",
    fontWeight: "bold",
    margin: 0,
  },
  infoSmall: {
    color: "#aaa",
    marginTop: "8px",
  },
  box: {
    background: "#111",
    padding: "20px",
    borderRadius: "20px",
    marginBottom: "30px",
  },
  subtitle: {
    marginBottom: "20px",
  },
  input: {
    width: "100%",
    padding: "16px",
    marginBottom: "15px",
    borderRadius: "10px",
    border: "none",
    background: "#222",
    color: "white",
    fontSize: "16px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
    gap: "15px",
  },
  positionButton: {
    background: "#222",
    color: "white",
    border: "1px solid #333",
    borderRadius: "16px",
    padding: "22px",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "18px",
    display: "grid",
    gap: "8px",
  },
  freeButton: {
    background: "#0f766e",
    color: "white",
    border: "1px solid #14b8a6",
    borderRadius: "16px",
    padding: "22px",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "18px",
    display: "grid",
    gap: "8px",
  },
  unitText: {
    color: "#aaa",
    fontSize: "15px",
  },
  backButton: {
    background: "#222",
    color: "#60a5fa",
    border: "1px solid #333",
    padding: "12px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
    marginBottom: "20px",
  },
  groupTitle: {
    color: "#60a5fa",
    marginBottom: "20px",
    fontSize: "32px",
  },
  saveButton: {
    background: "#16a34a",
    color: "white",
    padding: "16px 25px",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px",
  },
  emptyText: {
    color: "#999",
  },
  savedCard: {
    background: "#222",
    padding: "18px",
    borderRadius: "14px",
    marginTop: "15px",
  },
  savedQuantity: {
    marginTop: "10px",
    color: "#ddd",
  },
  note: {
    marginTop: "8px",
    color: "#aaa",
  },
  buttonRow: {
    display: "flex",
    gap: "10px",
    marginTop: "15px",
  },
  plusButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  minusButton: {
    background: "#f59e0b",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  deleteButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px 18px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};