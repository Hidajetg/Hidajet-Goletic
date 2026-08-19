"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { type AppLanguage, readAppLanguage, localeForLanguage } from "../lib/language";

const ADMINI = ["Hido", "Steffi", "Admin"];
const translations: Record<AppLanguage, Record<string, string>> = {
  de: { back: "← Dashboard", title: "Kalender", logged: "Angemeldet", newPlan: "Neuer Arbeitsplan", date: "Datum", worker: "Mitarbeiter", selectAll: "Alle auswählen", clear: "Auswahl löschen", selected: "Ausgewählt", site: "Baustelle", chooseSite: "Baustelle wählen", note: "Notiz", notePlaceholder: "Notiz...", save: "Speichern", allPlans: "Alle Arbeitspläne", myPlan: "Mein Arbeitsplan", noPlans: "Keine Pläne vorhanden.", place: "Ort", delete: "Löschen", loadError: "Fehler beim Laden des Kalenders", adminAdd: "Nur Admin kann einen Plan hinzufügen.", selectWorker: "Mindestens einen Mitarbeiter auswählen.", selectSiteError: "Baustelle auswählen.", adminDelete: "Nur Admin kann einen Plan löschen.", deleteConfirm: "Plan wirklich löschen?" },
  ba: { back: "← Dashboard", title: "Kalendar", logged: "Prijavljen", newPlan: "Novi radni plan", date: "Datum", worker: "Radnik", selectAll: "Odaberi sve", clear: "Poništi odabir", selected: "Odabrano", site: "Baustelle", chooseSite: "Odaberi Baustelle", note: "Napomena", notePlaceholder: "Napomena...", save: "Sačuvaj", allPlans: "Svi radni planovi", myPlan: "Moj radni plan", noPlans: "Nema planova.", place: "Mjesto", delete: "Obriši", loadError: "Greška kod učitavanja kalendara", adminAdd: "Samo admin može dodavati plan.", selectWorker: "Odaberi najmanje jednog radnika.", selectSiteError: "Odaberi Baustelle.", adminDelete: "Samo admin može brisati plan.", deleteConfirm: "Da li stvarno želiš obrisati plan?" },
  uz: { back: "← Dashboard", title: "Kalendar", logged: "Kirilgan", newPlan: "Yangi ish rejasi", date: "Sana", worker: "Ishchi", selectAll: "Barchasini tanlash", clear: "Tanlovni tozalash", selected: "Tanlangan", site: "Qurilish obyekti", chooseSite: "Obyektni tanlang", note: "Izoh", notePlaceholder: "Izoh...", save: "Saqlash", allPlans: "Barcha ish rejalari", myPlan: "Mening ish rejam", noPlans: "Rejalar yo‘q.", place: "Joy", delete: "O‘chirish", loadError: "Kalendarni yuklashda xato", adminAdd: "Faqat admin reja qo‘sha oladi.", selectWorker: "Kamida bitta ishchini tanlang.", selectSiteError: "Qurilish obyektini tanlang.", adminDelete: "Faqat admin rejani o‘chira oladi.", deleteConfirm: "Rejani o‘chirmoqchimisiz?" },
  cz: { back: "← Dashboard", title: "Kalendář", logged: "Přihlášen", newPlan: "Nový pracovní plán", date: "Datum", worker: "Pracovník", selectAll: "Vybrat všechny", clear: "Zrušit výběr", selected: "Vybráno", site: "Stavba", chooseSite: "Vyberte stavbu", note: "Poznámka", notePlaceholder: "Poznámka...", save: "Uložit", allPlans: "Všechny pracovní plány", myPlan: "Můj pracovní plán", noPlans: "Nejsou žádné plány.", place: "Místo", delete: "Smazat", loadError: "Chyba při načítání kalendáře", adminAdd: "Pouze admin může přidat plán.", selectWorker: "Vyberte alespoň jednoho pracovníka.", selectSiteError: "Vyberte stavbu.", adminDelete: "Pouze admin může mazat plány.", deleteConfirm: "Opravdu chcete plán smazat?" },
  en: { back: "← Dashboard", title: "Calendar", logged: "Logged in", newPlan: "New work plan", date: "Date", worker: "Worker", selectAll: "Select all", clear: "Clear selection", selected: "Selected", site: "Construction site", chooseSite: "Choose construction site", note: "Note", notePlaceholder: "Note...", save: "Save", allPlans: "All work plans", myPlan: "My work plan", noPlans: "No plans available.", place: "Place", delete: "Delete", loadError: "Error loading calendar", adminAdd: "Only an admin can add a plan.", selectWorker: "Select at least one worker.", selectSiteError: "Select a construction site.", adminDelete: "Only an admin can delete a plan.", deleteConfirm: "Do you really want to delete this plan?" },
};


export default function KalendarPage() {
  const [lang, setLang] = useState<AppLanguage>("de");
  const t = translations[lang];

  const [datum, setDatum] = useState(new Date().toISOString().split("T")[0]);

  const [currentUser, setCurrentUser] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [baustelleId, setBaustelleId] = useState("");
  const [napomena, setNapomena] = useState("");

  const [workers, setWorkers] = useState<any[]>([]);
  const [baustellen, setBaustellen] = useState<any[]>([]);
  const [planovi, setPlanovi] = useState<any[]>([]);

  useEffect(() => {
    setLang(readAppLanguage("de"));
    const name = localStorage.getItem("worker_name") || "";
    const adminStatus = ADMINI.includes(name);

    setCurrentUser(name);
    setIsAdmin(adminStatus);

    if (!adminStatus) {
      setSelectedWorkers([name]);
    }

    loadData(name, adminStatus);
  }, []);

  function playNotificationSound() {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 1;
    audio.play().catch(() => {});
  }

  async function loadData(name: string, adminStatus: boolean) {
    const workersRes = await supabase.from("workers").select("*").order("name");

    const activeWorkers = (workersRes.data || []).filter(
      (w: any) => w.role !== "admin"
    );

    setWorkers(activeWorkers);

    const baustellenRes = await supabase
      .from("baustellen")
      .select("*")
      .eq("status", "Aktiv")
      .order("naziv");

    setBaustellen(baustellenRes.data || []);

    await cleanupOldPlans();
    await loadPlans(name, adminStatus);
  }

  async function cleanupOldPlans() {
    const now = new Date();

    const { data } = await supabase.from("work_calendar").select("*");

    const oldPlans = (data || []).filter((p: any) => {
      if (!p.datum) return false;

      const expiry = new Date(`${p.datum}T15:00:00`);
      expiry.setDate(expiry.getDate() + 1);

      return expiry < now;
    });

    if (oldPlans.length === 0) return;

    const oldIds = oldPlans.map((p: any) => p.id);

    await supabase.from("work_calendar").delete().in("id", oldIds);
  }

  async function loadPlans(name = currentUser, adminStatus = isAdmin) {
    let query = supabase
      .from("work_calendar")
      .select(
        `
        *,
        baustellen (
          naziv,
          lokacija
        )
      `
      )
      .order("datum", { ascending: true });

    if (!adminStatus && name) {
      query = query.eq("worker_name", name);
    }

    const { data, error } = await query;

    if (error) {
      alert(t.loadError + ": " + error.message);
      return;
    }

    setPlanovi(data || []);
  }

  function toggleWorker(name: string) {
    if (selectedWorkers.includes(name)) {
      setSelectedWorkers(selectedWorkers.filter((w) => w !== name));
    } else {
      setSelectedWorkers([...selectedWorkers, name]);
    }
  }

  function selectAllWorkers() {
    const allNames = workers.map((w: any) => w.name);
    setSelectedWorkers(allNames);
  }

  function clearWorkers() {
    setSelectedWorkers([]);
  }

  async function savePlan() {
    if (!isAdmin) {
      alert(t.adminAdd);
      return;
    }

    if (selectedWorkers.length === 0) {
      alert(t.selectWorker);
      return;
    }

    if (!baustelleId) {
      alert(t.selectSiteError);
      return;
    }

    const rows = selectedWorkers.map((worker) => ({
      datum,
      worker_name: worker,
      baustelle_id: Number(baustelleId),
      napomena: napomena.trim(),
    }));

    const { error } = await supabase.from("work_calendar").insert(rows);

    if (error) {
      alert(error.message);
      return;
    }

    playNotificationSound();

    setSelectedWorkers([]);
    setBaustelleId("");
    setNapomena("");

    await cleanupOldPlans();
    await loadPlans(currentUser, isAdmin);
  }

  async function deletePlan(id: number) {
    if (!isAdmin) {
      alert(t.adminDelete);
      return;
    }

    const potvrda = confirm(t.deleteConfirm);

    if (!potvrda) return;

    const { error } = await supabase.from("work_calendar").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadPlans(currentUser, isAdmin);
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString(localeForLanguage(lang), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <main style={mainStyle}>
      <Link href="/dashboard" style={backLinkStyle}>
        {t.back}
      </Link>

      <h1 style={titleStyle}>{t.title}</h1>

      <p style={{ color: "#aaa", marginBottom: "30px" }}>
        {t.logged}: {currentUser}
      </p>

      {isAdmin && (
        <div style={boxStyle}>
          <h2>{t.newPlan}</h2>

          <label style={labelStyle}>{t.date}</label>
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>{t.worker}</label>

          <div style={smallButtonRowStyle}>
            <button onClick={selectAllWorkers} style={smallButtonStyle}>
              {t.selectAll}
            </button>

            <button onClick={clearWorkers} style={smallRedButtonStyle}>
              {t.clear}
            </button>
          </div>

          <div style={workersGridStyle}>
            {workers.map((w) => (
              <label key={w.id} style={workerCheckStyle}>
                <input
                  type="checkbox"
                  checked={selectedWorkers.includes(w.name)}
                  onChange={() => toggleWorker(w.name)}
                  style={{ transform: "scale(1.2)" }}
                />
                <span>{w.name}</span>
              </label>
            ))}
          </div>

          <p style={{ color: "#aaa", marginTop: "10px" }}>
            {t.selected}: {selectedWorkers.length}
          </p>

          <label style={labelStyle}>{t.site}</label>
          <select
            value={baustelleId}
            onChange={(e) => setBaustelleId(e.target.value)}
            style={inputStyle}
          >
            <option value="">{t.chooseSite}</option>

            {baustellen.map((b) => (
              <option key={b.id} value={b.id}>
                {b.naziv} {b.lokacija ? `- ${b.lokacija}` : ""}
              </option>
            ))}
          </select>

          <label style={labelStyle}>{t.note}</label>
          <textarea
            placeholder={t.notePlaceholder}
            value={napomena}
            onChange={(e) => setNapomena(e.target.value)}
            style={textareaStyle}
          />

          <button onClick={savePlan} style={saveButtonStyle}>
            {t.save}
          </button>
        </div>
      )}

      <div style={boxStyle}>
        <h2>{isAdmin ? t.allPlans : t.myPlan}</h2>

        {planovi.length === 0 && (
          <p style={{ color: "#aaa" }}>{t.noPlans}</p>
        )}

        {planovi.map((p) => (
          <div key={p.id} style={planCardStyle}>
            <div>
              <strong style={{ color: "#f97316" }}>{formatDate(p.datum)}</strong>

              <p>
                <strong>{t.worker}:</strong> {p.worker_name}
              </p>

              <p>
                <strong>{t.site}:</strong> {p.baustellen?.naziv || "-"}
              </p>

              {p.baustellen?.lokacija && (
                <p>
                  <strong>{t.place}:</strong> {p.baustellen.lokacija}
                </p>
              )}

              {p.napomena && (
                <p>
                  <strong>{t.note}:</strong> {p.napomena}
                </p>
              )}
            </div>

            {isAdmin && (
              <button onClick={() => deletePlan(p.id)} style={deleteButtonStyle}>
                {t.delete}
              </button>
            )}
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

const boxStyle: any = {
  background: "#111",
  padding: "25px",
  borderRadius: "20px",
  marginBottom: "30px",
};

const labelStyle: any = {
  display: "block",
  marginBottom: "8px",
  color: "#ccc",
  fontWeight: "bold",
};

const inputStyle: any = {
  width: "100%",
  padding: "15px",
  marginBottom: "15px",
  borderRadius: "10px",
  border: "none",
  background: "#222",
  color: "white",
};

const textareaStyle: any = {
  width: "100%",
  minHeight: "120px",
  padding: "15px",
  borderRadius: "10px",
  border: "none",
  background: "#222",
  color: "white",
  marginBottom: "15px",
};

const saveButtonStyle: any = {
  background: "#16a34a",
  color: "white",
  border: "none",
  padding: "15px 25px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const planCardStyle: any = {
  background: "#222",
  padding: "20px",
  borderRadius: "15px",
  marginBottom: "15px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
};

const deleteButtonStyle: any = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "10px 20px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const workersGridStyle: any = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
  marginBottom: "10px",
};

const workerCheckStyle: any = {
  background: "#222",
  padding: "14px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  cursor: "pointer",
  fontWeight: "bold",
};

const smallButtonRowStyle: any = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  marginBottom: "15px",
};

const smallButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
};

const smallRedButtonStyle: any = {
  ...smallButtonStyle,
  background: "#dc2626",
};