"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const translations: any = {
  de: {
    back: "Zurück zur Baustelle",
    title: "Produktivität – Gruppeneingabe",
    adminOnly: "Nur Administratoren können die Gruppenproduktivität verwenden.",
    noAccess: "Kein Zugriff",

    rooms: "Räume auswählen",
    selectAll: "Alle auswählen",
    deselectAll: "Alle abwählen",
    selectedRooms: "Ausgewählte Räume",
    noRooms: "Keine Räume vorhanden.",

    worker: "Mitarbeiter",
    workerMissing: "Angemeldeter Mitarbeiter wurde nicht gefunden",

    selectPosition: "Position auswählen",
    freeInput: "Freie Eingabe",
    manualInput: "manuelle Eingabe",
    backPositions: "Zurück zu den Positionen",

    workName: "Arbeitsbezeichnung",
    format: "Fliesenformat, z.B. 60x120",
    quantity: "Menge",

    addSelected: "In ausgewählte Räume eintragen",
    saving: "Wird gespeichert...",

    chooseRoom: "Mindestens einen Raum auswählen.",
    choosePosition: "Position auswählen.",
    loginAgain:
      "Angemeldeter Mitarbeiter wurde nicht gefunden. Bitte erneut anmelden.",
    enterQuantity: "Menge eingeben.",
    enterWorkName: "Arbeitsbezeichnung eingeben.",

    success: "Eintrag wurde erfolgreich gespeichert.",
    saveError: "FEHLER BEIM SPEICHERN: ",
    roomsError: "FEHLER BEIM LADEN DER RÄUME: ",
  },

  ba: {
    back: "Nazad na Baustelle",
    title: "Produktivnost – grupni unos",
    adminOnly: "Grupnu produktivnost može koristiti samo administrator.",
    noAccess: "Nema pristupa",

    rooms: "Odaberi prostorije",
    selectAll: "Označi sve",
    deselectAll: "Poništi sve",
    selectedRooms: "Označene prostorije",
    noRooms: "Nema prostorija.",

    worker: "Radnik",
    workerMissing: "Nije pronađen prijavljeni radnik",

    selectPosition: "Odaberi poziciju",
    freeInput: "Slobodno dodavanje",
    manualInput: "ručni unos",
    backPositions: "Nazad na pozicije",

    workName: "Naziv posla",
    format: "Format keramike, npr. 60x120",
    quantity: "Količina",

    addSelected: "Dodaj u označene prostorije",
    saving: "Spremanje...",

    chooseRoom: "Označi najmanje jednu prostoriju.",
    choosePosition: "Odaberi poziciju.",
    loginAgain: "Nije pronađen prijavljeni radnik. Prijavi se ponovo.",
    enterQuantity: "Unesi količinu.",
    enterWorkName: "Unesi naziv posla.",

    success: "Unos je uspješno dodan.",
    saveError: "GREŠKA KOD SPREMANJA: ",
    roomsError: "GREŠKA KOD UČITAVANJA PROSTORIJA: ",
  },

  en: {
    back: "Back to Site",
    title: "Productivity – group input",
    adminOnly: "Only administrators can use group productivity.",
    noAccess: "Access denied",

    rooms: "Select rooms",
    selectAll: "Select all",
    deselectAll: "Clear all",
    selectedRooms: "Selected rooms",
    noRooms: "No rooms available.",

    worker: "Worker",
    workerMissing: "Logged-in worker was not found",

    selectPosition: "Select position",
    freeInput: "Free input",
    manualInput: "manual input",
    backPositions: "Back to positions",

    workName: "Work name",
    format: "Tile format, e.g. 60x120",
    quantity: "Quantity",

    addSelected: "Add to selected rooms",
    saving: "Saving...",

    chooseRoom: "Select at least one room.",
    choosePosition: "Select position.",
    loginAgain: "Logged-in worker was not found. Please log in again.",
    enterQuantity: "Enter quantity.",
    enterWorkName: "Enter work name.",

    success: "Entry successfully added.",
    saveError: "SAVE ERROR: ",
    roomsError: "ROOM LOAD ERROR: ",
  },

  uz: {
    back: "Obyektga qaytish",
    title: "Unumdorlik – guruhli kiritish",
    adminOnly: "Guruhli unumdorlikdan faqat administrator foydalanishi mumkin.",
    noAccess: "Kirish taqiqlangan",

    rooms: "Xonalarni tanlang",
    selectAll: "Barchasini tanlash",
    deselectAll: "Tanlovni bekor qilish",
    selectedRooms: "Tanlangan xonalar",
    noRooms: "Xonalar yo‘q.",

    worker: "Ishchi",
    workerMissing: "Kirish qilgan ishchi topilmadi",

    selectPosition: "Pozitsiyani tanlang",
    freeInput: "Erkin kiritish",
    manualInput: "qo‘lda kiritish",
    backPositions: "Pozitsiyalarga qaytish",

    workName: "Ish nomi",
    format: "Plitka formati, masalan 60x120",
    quantity: "Miqdor",

    addSelected: "Tanlangan xonalarga qo‘shish",
    saving: "Saqlanmoqda...",

    chooseRoom: "Kamida bitta xonani tanlang.",
    choosePosition: "Pozitsiyani tanlang.",
    loginAgain: "Kirish qilgan ishchi topilmadi. Qayta kiring.",
    enterQuantity: "Miqdorni kiriting.",
    enterWorkName: "Ish nomini kiriting.",

    success: "Ma’lumot muvaffaqiyatli qo‘shildi.",
    saveError: "SAQLASHDA XATO: ",
    roomsError: "XONALARNI YUKLASHDA XATO: ",
  },

  cz: {
    back: "Zpět na stavbu",
    title: "Produktivita – skupinový zápis",
    adminOnly: "Skupinovou produktivitu může používat pouze administrátor.",
    noAccess: "Přístup odepřen",

    rooms: "Vyberte místnosti",
    selectAll: "Vybrat vše",
    deselectAll: "Zrušit výběr",
    selectedRooms: "Vybrané místnosti",
    noRooms: "Nejsou žádné místnosti.",

    worker: "Pracovník",
    workerMissing: "Přihlášený pracovník nebyl nalezen",

    selectPosition: "Vyberte pozici",
    freeInput: "Volný zápis",
    manualInput: "ruční zadání",
    backPositions: "Zpět na pozice",

    workName: "Název práce",
    format: "Formát dlaždice, např. 60x120",
    quantity: "Množství",

    addSelected: "Přidat do vybraných místností",
    saving: "Ukládání...",

    chooseRoom: "Vyberte alespoň jednu místnost.",
    choosePosition: "Vyberte pozici.",
    loginAgain: "Přihlášený pracovník nebyl nalezen. Přihlaste se znovu.",
    enterQuantity: "Zadejte množství.",
    enterWorkName: "Zadejte název práce.",

    success: "Záznam byl úspěšně přidán.",
    saveError: "CHYBA PŘI UKLÁDÁNÍ: ",
    roomsError: "CHYBA PŘI NAČÍTÁNÍ MÍSTNOSTÍ: ",
  },
};

const pozicije = [
  {
    key: "BODEN",
    jedinica: "m²",
    label: {
      de: "Boden verfliesen",
      ba: "Pod",
      uz: "Pol",
      en: "Floor",
      cz: "Podlaha",
    },
  },

  {
    key: "WAND",
    jedinica: "m²",
    label: {
      de: "Wand verfliesen",
      ba: "Zid",
      uz: "Devor",
      en: "Wall",
      cz: "Stěna",
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
      cz: "Sokl / lišta",
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
      cz: "Schodový sokl",
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
      cz: "Profil / lišta",
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
      cz: "Silikon do 5 mm",
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
      cz: "Akryl do 5 mm",
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
      cz: "Schody",
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
      cz: "Volný zápis",
    },
  },
];

export default function ProduktivnostGrupnoPage() {
  const params = useParams();

  const baustelleId = String(params.id);

  const [lang, setLang] = useState("ba");

  const [workerRole, setWorkerRole] = useState("");
  const [roleLoaded, setRoleLoaded] = useState(false);

  const [radnik, setRadnik] = useState("");

  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);

  const [aktivnaPozicija, setAktivnaPozicija] = useState<any | null>(null);

  const [kolicina, setKolicina] = useState("");
  const [format, setFormat] = useState("");

  const [slobodniNaziv, setSlobodniNaziv] = useState("");
  const [slobodnaJedinica, setSlobodnaJedinica] = useState("h");

  const [saving, setSaving] = useState(false);

  const t = translations[lang] || translations.ba;

  const isAdmin = workerRole === "admin";

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") || "ba";
    setLang(savedLang);

    const role = localStorage.getItem("worker_role") || "worker";
    setWorkerRole(role);

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

    setRoleLoaded(true);

    if (role === "admin") {
      loadRooms();
    }
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

  async function loadRooms() {
    const { data, error } = await supabase
      .from("prostorije")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("id", { ascending: true });

    if (error) {
      alert((translations[lang] || translations.ba).roomsError + error.message);
      return;
    }

    setRooms(data || []);
  }

  function toggleRoom(roomId: number) {
    setSelectedRoomIds((current) => {
      if (current.includes(roomId)) {
        return current.filter((id) => id !== roomId);
      }

      return [...current, roomId];
    });
  }

  function oznaciSve() {
    setSelectedRoomIds(rooms.map((room) => Number(room.id)));
  }

  function ponistiSve() {
    setSelectedRoomIds([]);
  }

  function resetForm() {
    setAktivnaPozicija(null);

    setKolicina("");

    setFormat("");

    setSlobodniNaziv("");

    setSlobodnaJedinica("h");
  }

  async function dodajProduktivnostUOdabrane() {
    /*
      DODATNA PROVJERA:
      čak i ako radnik nekako otvori URL,
      funkcija neće napraviti unos.
    */
    if (!isAdmin) {
      alert(t.adminOnly);
      return;
    }

    if (selectedRoomIds.length === 0) {
      alert(t.chooseRoom);
      return;
    }

    if (!aktivnaPozicija) {
      alert(t.choosePosition);
      return;
    }

    if (!radnik) {
      alert(t.loginAgain);
      return;
    }

    const brojKolicina = Number(
      String(kolicina).replace(",", ".")
    );

    if (!kolicina || Number.isNaN(brojKolicina) || brojKolicina <= 0) {
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
      (aktivnaPozicija.key === "BODEN" ||
        aktivnaPozicija.key === "WAND") &&
      format.trim()
    ) {
      napomena = `Format: ${format.trim()}`;
    }

    const datum = new Date().toISOString().split("T")[0];

    const payload = selectedRoomIds.map((roomId) => ({
      baustelle_id: Number(baustelleId),

      room_id: Number(roomId),

      datum,

      radnik,

      pozicija: nazivZaSpremanje,

      kolicina: brojKolicina,

      jedinica: jedinicaZaSpremanje,

      napomena,
    }));

    setSaving(true);

    const { error } = await supabase
      .from("produktivnost")
      .insert(payload);

    setSaving(false);

    if (error) {
      alert(t.saveError + error.message);
      return;
    }

    playNotificationSound();

    alert(
      `${t.success}\n\n${t.selectedRooms}: ${selectedRoomIds.length}`
    );

    resetForm();

    /*
      PROSTORIJE OSTAJU OZNAČENE.

      Ovo je praktično ako želiš odmah dodati
      još jednu poziciju istim prostorijama.

      Ako želiš da se poslije svakog unosa
      poništi izbor prostorija, uključi:

      setSelectedRoomIds([]);
    */
  }

  /*
    Dok browser još nije pročitao worker_role,
    ne pokazujemo sadržaj.
  */
  if (!roleLoaded) {
    return (
      <main style={styles.page}>
        <div style={styles.loadingBox}>Učitavanje...</div>
      </main>
    );
  }

  /*
    RADNIK NEMA PRISTUP.
  */
  if (!isAdmin) {
    return (
      <main style={styles.page}>
        <Link
          href={`/baustellen/${baustelleId}`}
          style={styles.backLink}
        >
          ← {t.back}
        </Link>

        <div style={styles.noAccessBox}>
          <div style={styles.noAccessIcon}>⛔</div>

          <h1 style={styles.noAccessTitle}>{t.noAccess}</h1>

          <p style={styles.noAccessText}>{t.adminOnly}</p>

          <Link
            href={`/baustellen/${baustelleId}`}
            style={styles.returnButton}
          >
            ← {t.back}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <Link
        href={`/baustellen/${baustelleId}`}
        style={styles.backLink}
      >
        ← {t.back}
      </Link>

      <h1 style={styles.title}>📊 {t.title}</h1>

      {/* ADMIN */}

      <section style={styles.adminBox}>
        <div style={styles.adminBadge}>ADMIN</div>

        <div>
          <div style={styles.workerLabel}>{t.worker}</div>

          <div style={styles.workerName}>
            {radnik || t.workerMissing}
          </div>
        </div>
      </section>

      {/* PROSTORIJE */}

      <section style={styles.box}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.subtitle}>{t.rooms}</h2>

            <div style={styles.selectedCount}>
              {t.selectedRooms}: {selectedRoomIds.length}
            </div>
          </div>

          <div style={styles.roomActionButtons}>
            <button
              type="button"
              onClick={oznaciSve}
              disabled={rooms.length === 0}
              style={styles.selectAllButton}
            >
              ✓ {t.selectAll}
            </button>

            <button
              type="button"
              onClick={ponistiSve}
              disabled={selectedRoomIds.length === 0}
              style={styles.clearButton}
            >
              ✕ {t.deselectAll}
            </button>
          </div>
        </div>

        {rooms.length === 0 ? (
          <p style={styles.emptyText}>{t.noRooms}</p>
        ) : (
          <div style={styles.roomsGrid}>
            {rooms.map((room) => {
              const roomId = Number(room.id);

              const selected = selectedRoomIds.includes(roomId);

              return (
                <button
                  type="button"
                  key={room.id}
                  onClick={() => toggleRoom(roomId)}
                  style={{
                    ...styles.roomButton,

                    ...(selected
                      ? styles.roomButtonSelected
                      : styles.roomButtonNotSelected),
                  }}
                >
                  <div style={styles.checkbox}>
                    {selected ? "✓" : ""}
                  </div>

                  <div style={styles.roomName}>
                    {room.naziv || room.name || `Raum ${room.id}`}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* POZICIJE */}

      {!aktivnaPozicija && (
        <section style={styles.box}>
          <h2 style={styles.subtitle}>{t.selectPosition}</h2>

          <div style={styles.positionGrid}>
            {pozicije.map((p) => (
              <button
                type="button"
                key={p.key}
                onClick={() => setAktivnaPozicija(p)}
                style={
                  isFreePosition(p)
                    ? styles.freeButton
                    : styles.positionButton
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

      {/* UNOS */}

      {aktivnaPozicija && (
        <section style={styles.box}>
          <button
            type="button"
            onClick={resetForm}
            style={styles.backPositionButton}
          >
            ← {t.backPositions}
          </button>

          <h2 style={styles.groupTitle}>
            {labelPozicije(aktivnaPozicija)}
          </h2>

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
            step="0.01"
            min="0"
            style={styles.input}
          />

          <div style={styles.summaryBox}>
            <div>
              <span style={styles.summaryLabel}>
                {t.selectedRooms}:
              </span>

              <strong style={styles.summaryNumber}>
                {selectedRoomIds.length}
              </strong>
            </div>

            <div>
              <span style={styles.summaryLabel}>
                {t.quantity}:
              </span>

              <strong>
                {kolicina || "0"}{" "}
                {isFreePosition(aktivnaPozicija)
                  ? slobodnaJedinica
                  : aktivnaPozicija.jedinica}
              </strong>
            </div>
          </div>

          <button
            type="button"
            onClick={dodajProduktivnostUOdabrane}
            disabled={saving}
            style={{
              ...styles.saveButton,

              opacity: saving ? 0.6 : 1,

              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? `⏳ ${t.saving}` : `✓ ${t.addSelected}`}
          </button>
        </section>
      )}
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

    fontSize: "17px",
  },

  title: {
    fontSize: "48px",

    fontWeight: "bold",

    marginTop: "25px",

    marginBottom: "30px",
  },

  loadingBox: {
    background: "#111",

    borderRadius: "16px",

    padding: "30px",
  },

  noAccessBox: {
    background: "#111",

    border: "1px solid #dc2626",

    borderRadius: "20px",

    marginTop: "35px",

    padding: "40px",

    maxWidth: "700px",

    textAlign: "center",
  },

  noAccessIcon: {
    fontSize: "60px",

    marginBottom: "15px",
  },

  noAccessTitle: {
    color: "#ef4444",

    fontSize: "34px",

    marginBottom: "15px",
  },

  noAccessText: {
    color: "#d1d5db",

    fontSize: "18px",

    marginBottom: "30px",
  },

  returnButton: {
    display: "inline-flex",

    background: "#2563eb",

    color: "white",

    padding: "14px 20px",

    borderRadius: "12px",

    textDecoration: "none",

    fontWeight: "bold",
  },

  adminBox: {
    background: "#111",

    borderRadius: "20px",

    border: "1px solid #222",

    padding: "20px",

    marginBottom: "25px",

    display: "flex",

    alignItems: "center",

    gap: "18px",
  },

  adminBadge: {
    background: "#7c3aed",

    padding: "10px 16px",

    borderRadius: "10px",

    fontWeight: "bold",
  },

  workerLabel: {
    color: "#9ca3af",

    fontSize: "14px",
  },

  workerName: {
    fontSize: "20px",

    fontWeight: "bold",

    marginTop: "3px",
  },

  box: {
    background: "#111",

    borderRadius: "20px",

    border: "1px solid #222",

    padding: "22px",

    marginBottom: "25px",
  },

  sectionHeader: {
    display: "flex",

    justifyContent: "space-between",

    alignItems: "center",

    gap: "15px",

    flexWrap: "wrap",

    marginBottom: "20px",
  },

  subtitle: {
    margin: 0,

    fontSize: "24px",
  },

  selectedCount: {
    color: "#60a5fa",

    marginTop: "8px",

    fontWeight: "bold",
  },

  roomActionButtons: {
    display: "flex",

    gap: "10px",

    flexWrap: "wrap",
  },

  selectAllButton: {
    background: "#2563eb",

    color: "white",

    border: "none",

    borderRadius: "10px",

    padding: "12px 16px",

    fontWeight: "bold",

    cursor: "pointer",
  },

  clearButton: {
    background: "#374151",

    color: "white",

    border: "none",

    borderRadius: "10px",

    padding: "12px 16px",

    fontWeight: "bold",

    cursor: "pointer",
  },

  roomsGrid: {
    display: "grid",

    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",

    gap: "12px",
  },

  roomButton: {
    minHeight: "72px",

    borderRadius: "14px",

    padding: "14px",

    display: "flex",

    alignItems: "center",

    gap: "12px",

    color: "white",

    textAlign: "left",

    fontWeight: "bold",

    cursor: "pointer",
  },

  roomButtonSelected: {
    background: "#065f46",

    border: "2px solid #10b981",
  },

  roomButtonNotSelected: {
    background: "#222",

    border: "2px solid #333",
  },

  checkbox: {
    width: "28px",

    height: "28px",

    borderRadius: "7px",

    border: "2px solid #6b7280",

    display: "flex",

    justifyContent: "center",

    alignItems: "center",

    flexShrink: 0,

    background: "#111",

    color: "#22c55e",

    fontSize: "18px",
  },

  roomName: {
    fontSize: "16px",
  },

  positionGrid: {
    display: "grid",

    gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",

    gap: "15px",

    marginTop: "20px",
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

    fontSize: "14px",
  },

  backPositionButton: {
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

    fontSize: "30px",
  },

  input: {
    width: "100%",

    boxSizing: "border-box",

    padding: "16px",

    marginBottom: "15px",

    borderRadius: "10px",

    border: "1px solid #333",

    background: "#222",

    color: "white",

    fontSize: "16px",
  },

  summaryBox: {
    background: "#1f1f1f",

    border: "1px solid #333",

    borderRadius: "14px",

    padding: "18px",

    marginTop: "5px",

    marginBottom: "20px",

    display: "flex",

    gap: "30px",

    flexWrap: "wrap",
  },

  summaryLabel: {
    color: "#9ca3af",

    marginRight: "8px",
  },

  summaryNumber: {
    color: "#22c55e",

    fontSize: "20px",
  },

  saveButton: {
    width: "100%",

    background: "#16a34a",

    color: "white",

    border: "none",

    borderRadius: "12px",

    padding: "18px",

    fontWeight: "bold",

    fontSize: "18px",
  },

  emptyText: {
    color: "#9ca3af",
  },
};