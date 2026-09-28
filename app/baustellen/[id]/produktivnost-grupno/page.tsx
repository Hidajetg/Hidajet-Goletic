"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const translations: any = {
  de: {
    back: "Zurück zur Baustelle",
    title: "Produktivität – Gruppeneingabe",
    subtitle: "Einen Eintrag gleichzeitig in mehrere ausgewählte Räume eintragen",
    worker: "Mitarbeiter",
    workerMissing: "Angemeldeter Mitarbeiter wurde nicht gefunden",
    selectRooms: "Räume auswählen",
    selectedRooms: "Ausgewählte Räume",
    selectAll: "Alle auswählen",
    clearAll: "Auswahl löschen",
    noRooms: "Keine Räume vorhanden.",
    selectPosition: "Position auswählen",
    freeInput: "Freie Eingabe",
    manualInput: "manuelle Eingabe",
    backPositions: "Zurück zu den Positionen",
    workName: "Arbeitsbezeichnung",
    format: "Fliesenformat, z.B. 60x120",
    quantity: "Menge pro ausgewähltem Raum",
    add: "In ausgewählte Räume eintragen",
    saving: "Wird gespeichert...",
    chooseRoom: "Mindestens einen Raum auswählen.",
    choosePosition: "Position auswählen.",
    loginAgain: "Angemeldeter Mitarbeiter wurde nicht gefunden. Bitte erneut anmelden.",
    enterQuantity: "Menge eingeben.",
    enterWorkName: "Arbeitsbezeichnung eingeben.",
    loadRoomsError: "FEHLER BEIM LADEN DER RÄUME: ",
    saveError: "FEHLER BEIM SPEICHERN DER PRODUKTIVITÄT: ",
    saved: "Eintrag wurde in {count} Raum/Räume gespeichert.",
  },
  ba: {
    back: "Nazad na Baustelle",
    title: "Produktivnost – grupni unos",
    subtitle: "Jedan unos dodaj istovremeno u više označenih prostorija",
    worker: "Radnik",
    workerMissing: "Nije pronađen prijavljeni radnik",
    selectRooms: "Označi prostorije",
    selectedRooms: "Označene prostorije",
    selectAll: "Označi sve",
    clearAll: "Poništi sve",
    noRooms: "Nema prostorija.",
    selectPosition: "Odaberi poziciju",
    freeInput: "Slobodno dodavanje",
    manualInput: "ručni unos",
    backPositions: "Nazad na pozicije",
    workName: "Naziv posla",
    format: "Format keramike, npr. 60x120",
    quantity: "Količina po označenoj prostoriji",
    add: "Dodaj u označene prostorije",
    saving: "Spremanje...",
    chooseRoom: "Označi najmanje jednu prostoriju.",
    choosePosition: "Odaberi poziciju.",
    loginAgain: "Nije pronađen prijavljeni radnik. Prijavi se ponovo.",
    enterQuantity: "Unesi količinu.",
    enterWorkName: "Unesi naziv posla.",
    loadRoomsError: "GREŠKA KOD UČITAVANJA PROSTORIJA: ",
    saveError: "GREŠKA KOD SPREMANJA PRODUKTIVNOSTI: ",
    saved: "Unos je dodan u {count} prostorija.",
  },
  uz: {
    back: "Obyektga qaytish",
    title: "Ish unumdorligi – guruhli kiritish",
    subtitle: "Bitta yozuvni bir vaqtning o‘zida bir nechta tanlangan xonaga qo‘shing",
    worker: "Ishchi",
    workerMissing: "Kirish qilgan ishchi topilmadi",
    selectRooms: "Xonalarni tanlang",
    selectedRooms: "Tanlangan xonalar",
    selectAll: "Hammasini tanlash",
    clearAll: "Tanlovni bekor qilish",
    noRooms: "Xonalar yo‘q.",
    selectPosition: "Pozitsiyani tanlang",
    freeInput: "Erkin kiritish",
    manualInput: "qo‘lda kiritish",
    backPositions: "Pozitsiyalarga qaytish",
    workName: "Ish nomi",
    format: "Plitka formati, masalan 60x120",
    quantity: "Har bir tanlangan xona uchun miqdor",
    add: "Tanlangan xonalarga qo‘shish",
    saving: "Saqlanmoqda...",
    chooseRoom: "Kamida bitta xonani tanlang.",
    choosePosition: "Pozitsiyani tanlang.",
    loginAgain: "Kirish qilgan ishchi topilmadi. Qayta kiring.",
    enterQuantity: "Miqdorni kiriting.",
    enterWorkName: "Ish nomini kiriting.",
    loadRoomsError: "XONALARNI YUKLASHDA XATOLIK: ",
    saveError: "ISH UNUMDORLIGINI SAQLASHDA XATOLIK: ",
    saved: "Yozuv {count} ta xonaga qo‘shildi.",
  },
  en: {
    back: "Back to site",
    title: "Productivity – group entry",
    subtitle: "Add one entry to several selected rooms at the same time",
    worker: "Worker",
    workerMissing: "Logged-in worker was not found",
    selectRooms: "Select rooms",
    selectedRooms: "Selected rooms",
    selectAll: "Select all",
    clearAll: "Clear selection",
    noRooms: "No rooms available.",
    selectPosition: "Select position",
    freeInput: "Free input",
    manualInput: "manual input",
    backPositions: "Back to positions",
    workName: "Work name",
    format: "Tile format, e.g. 60x120",
    quantity: "Quantity per selected room",
    add: "Add to selected rooms",
    saving: "Saving...",
    chooseRoom: "Select at least one room.",
    choosePosition: "Select a position.",
    loginAgain: "Logged-in worker was not found. Please log in again.",
    enterQuantity: "Enter quantity.",
    enterWorkName: "Enter work name.",
    loadRoomsError: "LOAD ROOMS ERROR: ",
    saveError: "SAVE PRODUCTIVITY ERROR: ",
    saved: "Entry was added to {count} room(s).",
  },
  cz: {
    back: "Zpět na stavbu",
    title: "Produktivita – hromadný zápis",
    subtitle: "Přidejte jeden záznam současně do více vybraných místností",
    worker: "Pracovník",
    workerMissing: "Přihlášený pracovník nebyl nalezen",
    selectRooms: "Vyberte místnosti",
    selectedRooms: "Vybrané místnosti",
    selectAll: "Vybrat vše",
    clearAll: "Zrušit výběr",
    noRooms: "Nejsou žádné místnosti.",
    selectPosition: "Vyberte pozici",
    freeInput: "Volný zápis",
    manualInput: "ruční zadání",
    backPositions: "Zpět na pozice",
    workName: "Název práce",
    format: "Formát dlaždice, např. 60x120",
    quantity: "Množství pro každou vybranou místnost",
    add: "Přidat do vybraných místností",
    saving: "Ukládání...",
    chooseRoom: "Vyberte alespoň jednu místnost.",
    choosePosition: "Vyberte pozici.",
    loginAgain: "Přihlášený pracovník nebyl nalezen. Přihlaste se znovu.",
    enterQuantity: "Zadejte množství.",
    enterWorkName: "Zadejte název práce.",
    loadRoomsError: "CHYBA NAČTENÍ MÍSTNOSTÍ: ",
    saveError: "CHYBA ULOŽENÍ PRODUKTIVITY: ",
    saved: "Záznam byl přidán do {count} místností.",
  },
};

const pozicije = [
  {
    key: "BODEN",
    jedinica: "m²",
    label: { de: "Boden verflisen", ba: "Pod", uz: "Pol", en: "Floor", cz: "Podlaha" },
  },
  {
    key: "WAND",
    jedinica: "m²",
    label: { de: "Wand verflisen", ba: "Zid", uz: "Devor", en: "Wall", cz: "Stěna" },
  },
  {
    key: "SOCKEL",
    jedinica: "lfm",
    label: { de: "Sockel", ba: "Sockel / lajsna", uz: "Plintus", en: "Skirting", cz: "Sokl / lišta" },
  },
  {
    key: "STUFENSOCKEL",
    jedinica: "lfm",
    label: { de: "Stufensockel", ba: "Sockel stepenice", uz: "Zina plintusi", en: "Stair skirting", cz: "Schodový sokl" },
  },
  {
    key: "SCHIENE",
    jedinica: "lfm",
    label: { de: "Schiene", ba: "Schiene / lajsna", uz: "Profil", en: "Profile", cz: "Profil / lišta" },
  },
  {
    key: "SILIKON",
    jedinica: "lfm",
    label: { de: "Silikon bis 5 mm", ba: "Silikon do 5 mm", uz: "Silikon 5 mm gacha", en: "Silicone up to 5 mm", cz: "Silikon do 5 mm" },
  },
  {
    key: "ACRYL",
    jedinica: "lfm",
    label: { de: "Acryl bis 5 mm", ba: "Acryl do 5 mm", uz: "Akril 5 mm gacha", en: "Acrylic up to 5 mm", cz: "Akryl do 5 mm" },
  },
  {
    key: "STUFEN",
    jedinica: "lfm",
    label: { de: "Stufen", ba: "Stepenice", uz: "Zinalar", en: "Stairs", cz: "Schody" },
  },
  {
    key: "FREE",
    jedinica: "",
    label: { de: "Freie Eingabe", ba: "Slobodno dodavanje", uz: "Erkin kiritish", en: "Free input", cz: "Volný zápis" },
  },
];

export default function GrupnaProduktivnostPage() {
  const params = useParams();
  const baustelleId = String(params.id);

  const [lang, setLang] = useState("ba");
  const [radnik, setRadnik] = useState("");
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);
  const [aktivnaPozicija, setAktivnaPozicija] = useState<any | null>(null);
  const [kolicina, setKolicina] = useState("");
  const [format, setFormat] = useState("");
  const [slobodniNaziv, setSlobodniNaziv] = useState("");
  const [slobodnaJedinica, setSlobodnaJedinica] = useState("h");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const t = translations[lang] || translations.ba;

  const selectedRooms = useMemo(
    () => rooms.filter((room) => selectedRoomIds.includes(Number(room.id))),
    [rooms, selectedRoomIds]
  );

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
    loadRooms(savedLang);
  }, []);

  async function loadRooms(currentLang = "ba") {
    setLoading(true);

    const { data, error } = await supabase
      .from("prostorije")
      .select("*")
      .eq("baustelle_id", Number(baustelleId))
      .order("id", { ascending: true });

    if (error) {
      const currentT = translations[currentLang] || translations.ba;
      alert(currentT.loadRoomsError + error.message);
      setRooms([]);
      setLoading(false);
      return;
    }

    setRooms(data || []);
    setLoading(false);
  }

  function playNotificationSound() {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 1;
    audio.play().catch(() => {});
  }

  function roomName(room: any) {
    return room.naziv || room.name || `#${room.id}`;
  }

  function toggleRoom(roomId: number) {
    setSelectedRoomIds((current) =>
      current.includes(roomId)
        ? current.filter((id) => id !== roomId)
        : [...current, roomId]
    );
  }

  function selectAllRooms() {
    setSelectedRoomIds(rooms.map((room) => Number(room.id)));
  }

  function clearRooms() {
    setSelectedRoomIds([]);
  }

  function labelPozicije(p: any) {
    return p.label?.[lang] || p.label?.ba || p.key;
  }

  function isFreePosition(p: any) {
    return p.key === "FREE";
  }

  function resetPositionForm() {
    setAktivnaPozicija(null);
    setKolicina("");
    setFormat("");
    setSlobodniNaziv("");
    setSlobodnaJedinica("h");
  }

  function parseQuantity(value: string) {
    return Number(String(value).trim().replace(",", "."));
  }

  async function dodajUOznaceneProstorije() {
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

    const quantityNumber = parseQuantity(kolicina);

    if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
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

    const datum = new Date().toISOString().split("T")[0];

    const payload = selectedRoomIds.map((roomId) => ({
      baustelle_id: Number(baustelleId),
      room_id: Number(roomId),
      datum,
      radnik,
      pozicija: nazivZaSpremanje,
      kolicina: quantityNumber,
      jedinica: jedinicaZaSpremanje,
      napomena,
    }));

    setSaving(true);

    const { error } = await supabase.from("produktivnost").insert(payload);

    setSaving(false);

    if (error) {
      alert(t.saveError + error.message);
      return;
    }

    playNotificationSound();

    const successText = String(t.saved).replace(
      "{count}",
      String(selectedRoomIds.length)
    );

    alert(successText);

    resetPositionForm();
    setSelectedRoomIds([]);
  }

  return (
    <main style={styles.page}>
      <Link href={`/baustellen/${baustelleId}`} style={styles.backLink}>
        ← {t.back}
      </Link>

      <h1 style={styles.title}>{t.title}</h1>
      <p style={styles.pageSubtitle}>{t.subtitle}</p>

      <section style={styles.box}>
        <h2 style={styles.subtitle}>{t.worker}</h2>
        <input value={radnik || t.workerMissing} readOnly style={styles.input} />
      </section>

      <section style={styles.box}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.subtitle}>{t.selectRooms}</h2>
            <div style={styles.selectionCount}>
              {t.selectedRooms}: {selectedRoomIds.length}
            </div>
          </div>

          <div style={styles.smallButtonRow}>
            <button
              onClick={selectAllRooms}
              disabled={rooms.length === 0}
              style={styles.selectAllButton}
            >
              ✓ {t.selectAll}
            </button>
            <button onClick={clearRooms} style={styles.clearButton}>
              × {t.clearAll}
            </button>
          </div>
        </div>

        {loading ? (
          <p style={styles.emptyText}>...</p>
        ) : rooms.length === 0 ? (
          <p style={styles.emptyText}>{t.noRooms}</p>
        ) : (
          <div style={styles.roomGrid}>
            {rooms.map((room) => {
              const id = Number(room.id);
              const checked = selectedRoomIds.includes(id);

              return (
                <label
                  key={room.id}
                  style={{
                    ...styles.roomCard,
                    ...(checked ? styles.roomCardSelected : {}),
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRoom(id)}
                    style={styles.checkbox}
                  />
                  <span>{roomName(room)}</span>
                </label>
              );
            })}
          </div>
        )}

        {selectedRooms.length > 0 && (
          <div style={styles.selectedPreview}>
            {selectedRooms.map((room) => (
              <span key={room.id} style={styles.selectedBadge}>
                ✓ {roomName(room)}
              </span>
            ))}
          </div>
        )}
      </section>

      {!aktivnaPozicija && (
        <section style={styles.box}>
          <h2 style={styles.subtitle}>{t.selectPosition}</h2>

          <div style={styles.grid}>
            {pozicije.map((p) => (
              <button
                key={p.key}
                onClick={() => setAktivnaPozicija(p)}
                style={isFreePosition(p) ? styles.freeButton : styles.positionButton}
              >
                <strong>{labelPozicije(p)}</strong>
                <span style={styles.unitText}>{p.jedinica || t.manualInput}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {aktivnaPozicija && (
        <section style={styles.box}>
          <button onClick={resetPositionForm} style={styles.backButton}>
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

          {(aktivnaPozicija.key === "BODEN" || aktivnaPozicija.key === "WAND") && (
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
            inputMode="decimal"
            style={styles.input}
          />

          <button
            onClick={dodajUOznaceneProstorije}
            disabled={saving}
            style={{
              ...styles.saveButton,
              ...(saving ? styles.disabledButton : {}),
            }}
          >
            {saving
              ? t.saving
              : `✓ ${t.add} (${selectedRoomIds.length})`}
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
  },
  title: {
    fontSize: "48px",
    fontWeight: "bold",
    marginTop: "25px",
    marginBottom: "8px",
  },
  pageSubtitle: {
    color: "#9ca3af",
    marginBottom: "30px",
    fontSize: "17px",
  },
  box: {
    background: "#111",
    padding: "20px",
    borderRadius: "20px",
    marginBottom: "25px",
    border: "1px solid #222",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "18px",
  },
  subtitle: {
    marginTop: 0,
    marginBottom: "12px",
  },
  selectionCount: {
    color: "#60a5fa",
    fontWeight: "bold",
  },
  smallButtonRow: {
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
    cursor: "pointer",
    fontWeight: "bold",
  },
  clearButton: {
    background: "#374151",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  roomGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
    gap: "12px",
  },
  roomCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "#222",
    border: "1px solid #333",
    borderRadius: "14px",
    padding: "16px",
    cursor: "pointer",
    fontWeight: "bold",
    minHeight: "56px",
  },
  roomCardSelected: {
    background: "#0f766e",
    border: "1px solid #14b8a6",
  },
  checkbox: {
    width: "22px",
    height: "22px",
    accentColor: "#14b8a6",
    cursor: "pointer",
  },
  selectedPreview: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "18px",
    paddingTop: "18px",
    borderTop: "1px solid #2a2a2a",
  },
  selectedBadge: {
    background: "#064e3b",
    border: "1px solid #0f766e",
    borderRadius: "999px",
    padding: "8px 12px",
    fontSize: "14px",
  },
  input: {
    width: "100%",
    padding: "16px",
    marginBottom: "15px",
    borderRadius: "10px",
    border: "1px solid #333",
    background: "#222",
    color: "white",
    fontSize: "16px",
    boxSizing: "border-box",
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
    width: "100%",
    background: "#16a34a",
    color: "white",
    padding: "18px 25px",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "17px",
  },
  disabledButton: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  emptyText: {
    color: "#999",
  },
};
