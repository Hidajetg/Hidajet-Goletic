"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];

const translations: any = {
  de: {
    title: "Autos",
    back: "← Zurück",
    myCar: "Mein Auto",
    takeCar: "Auto übernehmen",
    returnCar: "Auto zurückgeben",
    freeCars: "Freie Autos",
    currentUse: "Aktuelle Nutzung",
    fleet: "Fuhrpark",
    damages: "Schäden / Mängel",
    reportDamage: "Schaden melden",
    damageText: "Schaden beschreiben",
    chooseCar: "Auto wählen",
    send: "Senden",
    history: "Fahrhistorie",
    statistics: "Statistik",
    addCar: "Auto hinzufügen",
    edit: "Bearbeiten",
    delete: "Löschen",
    cancel: "Abbrechen",
    name: "Auto Name",
    plate: "Kennzeichen",
    registration: "Registrierung gültig bis",
    warning: "Registrierung läuft bald ab!",
    noCars: "Keine Autos vorhanden.",
    noFreeCars: "Keine freien Autos.",
    noActive: "Aktuell fährt niemand.",
    noHistory: "Keine Historie vorhanden.",
    noDamages: "Keine Schäden vorhanden.",
    enterName: "Bitte Auto Name eingeben.",
    alreadyTaken: "Dieses Auto ist bereits vergeben.",
    alreadyHaveCar: "Du hast bereits ein Auto. Bitte zuerst zurückgeben.",
    notLoggedIn: "Du bist nicht angemeldet.",
    enterDamage: "Bitte Auto und Beschreibung eingeben.",
    repaired: "Erledigt",
    open: "Offen",
    active: "Aktiv",
    free: "Frei",
    since: "Seit",
    returned: "Zurückgegeben",
    totalTrips: "Fahrten",
    activeDamages: "Offene Schäden",
    sending: "Wird gesendet...",
  },
  ba: {
    title: "Auta",
    back: "← Nazad",
    myCar: "Moje auto",
    takeCar: "Preuzmi auto",
    returnCar: "Vrati auto",
    freeCars: "Slobodna auta",
    currentUse: "Trenutno korištenje",
    fleet: "Vozni park",
    damages: "Kvarovi / šteta",
    reportDamage: "Prijavi kvar",
    damageText: "Opiši kvar",
    chooseCar: "Izaberi auto",
    send: "Pošalji",
    history: "Historija vožnje",
    statistics: "Statistika",
    addCar: "Dodaj auto",
    edit: "Uredi",
    delete: "Obriši",
    cancel: "Odustani",
    name: "Ime auta",
    plate: "Tablice",
    registration: "Registracija važi do",
    warning: "Registracija uskoro ističe!",
    noCars: "Nema auta.",
    noFreeCars: "Nema slobodnih auta.",
    noActive: "Trenutno niko ne vozi.",
    noHistory: "Nema historije.",
    noDamages: "Nema kvarova.",
    enterName: "Upiši ime auta.",
    alreadyTaken: "Ovo auto je već zauzeto.",
    alreadyHaveCar: "Već imaš auto. Prvo ga moraš vratiti.",
    notLoggedIn: "Nisi prijavljen.",
    enterDamage: "Izaberi auto i upiši opis kvara.",
    repaired: "Riješeno",
    open: "Otvoreno",
    active: "Aktivno",
    free: "Slobodno",
    since: "Od",
    returned: "Vraćeno",
    totalTrips: "Vožnje",
    activeDamages: "Otvoreni kvarovi",
    sending: "Šalje se...",
  },
  uz: {
    title: "Mashinalar",
    back: "← Orqaga",
    myCar: "Mening mashinam",
    takeCar: "Mashinani olish",
    returnCar: "Mashinani qaytarish",
    freeCars: "Bo‘sh mashinalar",
    currentUse: "Hozirgi foydalanish",
    fleet: "Avtopark",
    damages: "Nosozliklar",
    reportDamage: "Nosozlik xabar berish",
    damageText: "Nosozlikni yozing",
    chooseCar: "Mashina tanlang",
    send: "Yuborish",
    history: "Haydash tarixi",
    statistics: "Statistika",
    addCar: "Mashina qo‘shish",
    edit: "Tahrirlash",
    delete: "O‘chirish",
    cancel: "Bekor qilish",
    name: "Mashina nomi",
    plate: "Raqam",
    registration: "Ro‘yxatdan o‘tish muddati",
    warning: "Ro‘yxatdan o‘tish muddati tugayapti!",
    noCars: "Mashina yo‘q.",
    noFreeCars: "Bo‘sh mashina yo‘q.",
    noActive: "Hozir hech kim haydamayapti.",
    noHistory: "Tarix yo‘q.",
    noDamages: "Nosozlik yo‘q.",
    enterName: "Mashina nomini yozing.",
    alreadyTaken: "Bu mashina band.",
    alreadyHaveCar: "Sizda allaqachon mashina bor. Avval qaytaring.",
    notLoggedIn: "Siz tizimga kirmagansiz.",
    enterDamage: "Mashina tanlang va nosozlikni yozing.",
    repaired: "Tuzatildi",
    open: "Ochiq",
    active: "Aktiv",
    free: "Bo‘sh",
    since: "Boshlangan vaqt",
    returned: "Qaytarildi",
    totalTrips: "Safarlar",
    activeDamages: "Ochiq nosozliklar",
    sending: "Yuborilmoqda...",
  },
  en: {
    title: "Cars",
    back: "← Back",
    myCar: "My car",
    takeCar: "Take car",
    returnCar: "Return car",
    freeCars: "Free cars",
    currentUse: "Current use",
    fleet: "Fleet",
    damages: "Damages",
    reportDamage: "Report damage",
    damageText: "Describe damage",
    chooseCar: "Choose car",
    send: "Send",
    history: "Driving history",
    statistics: "Statistics",
    addCar: "Add car",
    edit: "Edit",
    delete: "Delete",
    cancel: "Cancel",
    name: "Car name",
    plate: "Plate",
    registration: "Registration valid until",
    warning: "Registration expires soon!",
    noCars: "No cars.",
    noFreeCars: "No free cars.",
    noActive: "Nobody is driving now.",
    noHistory: "No history.",
    noDamages: "No damages.",
    enterName: "Enter car name.",
    alreadyTaken: "This car is already taken.",
    alreadyHaveCar: "You already have a car. Return it first.",
    notLoggedIn: "You are not logged in.",
    enterDamage: "Choose a car and enter damage description.",
    repaired: "Done",
    open: "Open",
    active: "Active",
    free: "Free",
    since: "Since",
    returned: "Returned",
    totalTrips: "Trips",
    activeDamages: "Open damages",
    sending: "Sending...",
  },
};

export default function AutaPage() {
  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [lang, setLang] = useState("de");

  const [cars, setCars] = useState<any[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [damages, setDamages] = useState<any[]>([]);
  const [selectedCarId, setSelectedCarId] = useState("");

  const [carName, setCarName] = useState("");
  const [plate, setPlate] = useState("");
  const [registrationUntil, setRegistrationUntil] = useState("");
  const [editingCar, setEditingCar] = useState<any>(null);

  const [damageCarId, setDamageCarId] = useState("");
  const [damageText, setDamageText] = useState("");
  const [damageFile, setDamageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const t = translations[lang] || translations.de;

  useEffect(() => {
    const name = localStorage.getItem("worker_name") || "";
    const savedLang = localStorage.getItem("lang") || "de";

    setWorkerName(name);
    setIsAdmin(ADMINI.includes(name));
    setLang(savedLang);

    loadData();
  }, []);

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  }

  function formatDateTime(value: string) {
    if (!value) return "-";
    return new Date(value).toLocaleString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function isRegistrationWarning(date: string) {
    if (!date) return false;
    const now = new Date();
    const reg = new Date(date);
    const diff = reg.getTime() - now.getTime();
    return diff <= 30 * 24 * 60 * 60 * 1000;
  }

  async function loadData() {
    const carsRes = await supabase.from("cars").select("*").order("name");

    if (carsRes.error) {
      alert("Fehler Autos: " + carsRes.error.message);
      return;
    }

    setCars(carsRes.data || []);

    const activeRes = await supabase
      .from("car_assignments")
      .select("*, cars(*)")
      .eq("is_active", true)
      .order("check_in_at", { ascending: false });

    if (!activeRes.error) setActiveAssignments(activeRes.data || []);

    const historyRes = await supabase
      .from("car_assignments")
      .select("*, cars(*)")
      .order("check_in_at", { ascending: false })
      .limit(200);

    if (!historyRes.error) setHistory(historyRes.data || []);

    const damageRes = await supabase
      .from("car_damages")
      .select("*, cars(*)")
      .order("created_at", { ascending: false });

    if (!damageRes.error) setDamages(damageRes.data || []);
  }

  const myActiveCar = activeAssignments.find((a) => a.worker_name === workerName);
  const takenCarIds = activeAssignments.map((a) => a.car_id);
  const freeCars = cars.filter((car) => !takenCarIds.includes(car.id));

  async function takeCar(carId: number) {
    if (!workerName) {
      alert(t.notLoggedIn);
      return;
    }

    if (myActiveCar) {
      alert(t.alreadyHaveCar);
      return;
    }

    const activeCheck = await supabase
      .from("car_assignments")
      .select("*")
      .eq("car_id", carId)
      .eq("is_active", true);

    if ((activeCheck.data || []).length > 0) {
      alert(t.alreadyTaken);
      loadData();
      return;
    }

    const { error } = await supabase.from("car_assignments").insert({
      car_id: carId,
      worker_name: workerName,
      assignment_date: today(),
      check_in_at: new Date().toISOString(),
      is_active: true,
    });

    if (error) {
      alert(t.alreadyTaken + "\n\n" + error.message);
      return;
    }

    setSelectedCarId("");
    loadData();
  }

  async function returnCar(assignmentId: number) {
    const { error } = await supabase
      .from("car_assignments")
      .update({
        check_out_at: new Date().toISOString(),
        is_active: false,
      })
      .eq("id", assignmentId);

    if (error) {
      alert("Fehler: " + error.message);
      return;
    }

    loadData();
  }

  async function saveCar() {
    if (!carName.trim()) {
      alert(t.enterName);
      return;
    }

    let error: any = null;

    if (editingCar) {
      const res = await supabase
        .from("cars")
        .update({
          name: carName.trim(),
          plate: plate.trim(),
          registration_until: registrationUntil || null,
        })
        .eq("id", editingCar.id);
      error = res.error;
    } else {
      const res = await supabase.from("cars").insert({
        name: carName.trim(),
        plate: plate.trim(),
        registration_until: registrationUntil || null,
      });
      error = res.error;
    }

    if (error) {
      alert("Fehler: " + error.message);
      return;
    }

    setCarName("");
    setPlate("");
    setRegistrationUntil("");
    setEditingCar(null);
    loadData();
  }

  async function deleteCar(id: number) {
    if (!confirm("Auto löschen / obrisati?")) return;

    const { error } = await supabase.from("cars").delete().eq("id", id);

    if (error) {
      alert("Fehler: " + error.message);
      return;
    }

    loadData();
  }

  function startEdit(car: any) {
    setEditingCar(car);
    setCarName(car.name || "");
    setPlate(car.plate || "");
    setRegistrationUntil(car.registration_until || "");
  }

  function cancelEdit() {
    setEditingCar(null);
    setCarName("");
    setPlate("");
    setRegistrationUntil("");
  }

  async function sendDamage() {
    if (!damageCarId || !damageText.trim()) {
      alert(t.enterDamage);
      return;
    }

    setUploading(true);

    let imageUrl = "";
    let storagePath = "";

    if (damageFile) {
      const ext = damageFile.name.split(".").pop();
      storagePath = `${damageCarId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const uploadRes = await supabase.storage
        .from("car-damages")
        .upload(storagePath, damageFile);

      if (uploadRes.error) {
        setUploading(false);
        alert("Fehler Bild: " + uploadRes.error.message);
        return;
      }

      const publicUrl = supabase.storage
        .from("car-damages")
        .getPublicUrl(storagePath);

      imageUrl = publicUrl.data.publicUrl;
    }

    const { error } = await supabase.from("car_damages").insert({
      car_id: Number(damageCarId),
      worker_name: workerName || "Unbekannt",
      description: damageText.trim(),
      image_url: imageUrl || null,
      storage_path: storagePath || null,
      status: "OPEN",
    });

    setUploading(false);

    if (error) {
      alert("Fehler: " + error.message);
      return;
    }

    setDamageCarId("");
    setDamageText("");
    setDamageFile(null);
    loadData();
  }

  async function resolveDamage(id: number) {
    const { error } = await supabase
      .from("car_damages")
      .update({
        status: "DONE",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert("Fehler: " + error.message);
      return;
    }

    loadData();
  }

  async function deleteDamage(damage: any) {
    if (!confirm("Schaden löschen / obrisati?")) return;

    if (damage.storage_path) {
      await supabase.storage.from("car-damages").remove([damage.storage_path]);
    }

    const { error } = await supabase.from("car_damages").delete().eq("id", damage.id);

    if (error) {
      alert("Fehler: " + error.message);
      return;
    }

    loadData();
  }

  function carStatus(car: any) {
    const active = activeAssignments.find((a) => a.car_id === car.id);
    if (active) return `${t.active}: ${active.worker_name}`;
    return t.free;
  }

  function countTripsForCar(carId: number) {
    return history.filter((h) => h.car_id === carId).length;
  }

  function countOpenDamagesForCar(carId: number) {
    return damages.filter((d) => d.car_id === carId && d.status === "OPEN").length;
  }

  return (
    <main style={mainStyle}>
      <Link href="/dashboard" style={backStyle}>
        {t.back}
      </Link>

      <h1 style={titleStyle}>🚗 {t.title}</h1>

      <section style={highlightBoxStyle}>
        <h2>👷 {t.myCar}</h2>

        {myActiveCar ? (
          <>
            <div style={myCarStyle}>
              <strong>
                {myActiveCar.cars?.name}{" "}
                {myActiveCar.cars?.plate ? `- ${myActiveCar.cars.plate}` : ""}
              </strong>
              <p>
                {t.since}: {formatDateTime(myActiveCar.check_in_at)}
              </p>
            </div>

            <button onClick={() => returnCar(myActiveCar.id)} style={redButtonStyle}>
              🔴 {t.returnCar}
            </button>
          </>
        ) : (
          <>
            <p style={{ color: "#aaa" }}>{t.noActive}</p>

            <select
              value={selectedCarId}
              onChange={(e) => setSelectedCarId(e.target.value)}
              style={inputStyle}
            >
              <option value="">{t.chooseCar}</option>
              {freeCars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.name} {car.plate ? `- ${car.plate}` : ""}
                </option>
              ))}
            </select>

            <button
              onClick={() => selectedCarId && takeCar(Number(selectedCarId))}
              style={greenButtonStyle}
            >
              🟢 {t.takeCar}
            </button>
          </>
        )}
      </section>

      <section style={boxStyle}>
        <h2>🟢 {t.freeCars}</h2>

        {freeCars.length === 0 ? (
          <p style={{ color: "#aaa" }}>{t.noFreeCars}</p>
        ) : (
          freeCars.map((car) => (
            <div key={car.id} style={rowStyle}>
              <div>
                <strong>{car.name}</strong>
                <br />
                <span style={{ color: "#aaa" }}>{car.plate || ""}</span>
              </div>

              {!myActiveCar && (
                <button onClick={() => takeCar(car.id)} style={smallGreenButtonStyle}>
                  {t.takeCar}
                </button>
              )}
            </div>
          ))
        )}
      </section>

      <section style={boxStyle}>
        <h2>🔵 {t.currentUse}</h2>

        {activeAssignments.length === 0 ? (
          <p style={{ color: "#aaa" }}>{t.noActive}</p>
        ) : (
          activeAssignments.map((a) => (
            <div key={a.id} style={rowStyle}>
              <div>
                <strong>
                  {a.cars?.name} {a.cars?.plate ? `- ${a.cars.plate}` : ""}
                </strong>
                <br />
                <span style={{ color: "#aaa" }}>
                  {a.worker_name} · {formatDateTime(a.check_in_at)}
                </span>
              </div>

              {(isAdmin || a.worker_name === workerName) && (
                <button onClick={() => returnCar(a.id)} style={smallRedButtonStyle}>
                  {t.returnCar}
                </button>
              )}
            </div>
          ))
        )}
      </section>

      <section style={boxStyle}>
        <h2>🔧 {t.reportDamage}</h2>

        <select
          value={damageCarId}
          onChange={(e) => setDamageCarId(e.target.value)}
          style={inputStyle}
        >
          <option value="">{t.chooseCar}</option>
          {cars.map((car) => (
            <option key={car.id} value={car.id}>
              {car.name} {car.plate ? `- ${car.plate}` : ""}
            </option>
          ))}
        </select>

        <textarea
          value={damageText}
          onChange={(e) => setDamageText(e.target.value)}
          placeholder={t.damageText}
          style={textAreaStyle}
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setDamageFile(e.target.files?.[0] || null)}
          style={inputStyle}
        />

        <button onClick={sendDamage} disabled={uploading} style={orangeButtonStyle}>
          {uploading ? t.sending : t.send}
        </button>
      </section>

      {isAdmin && (
        <>
          <section style={boxStyle}>
            <h2>👨‍💼 {t.fleet}</h2>

            <div style={adminFormStyle}>
              <input value={carName} onChange={(e) => setCarName(e.target.value)} placeholder={t.name} style={inputStyle} />
              <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder={t.plate} style={inputStyle} />
              <input type="date" value={registrationUntil} onChange={(e) => setRegistrationUntil(e.target.value)} style={inputStyle} />

              <button onClick={saveCar} style={greenButtonStyle}>
                {editingCar ? t.edit : t.addCar}
              </button>

              {editingCar && (
                <button onClick={cancelEdit} style={grayButtonStyle}>
                  {t.cancel}
                </button>
              )}
            </div>

            {cars.map((car) => (
              <div key={car.id} style={isRegistrationWarning(car.registration_until) ? warningCarStyle : carInfoStyle}>
                <strong>{car.name} {car.plate ? `- ${car.plate}` : ""}</strong>
                <p>{carStatus(car)}</p>
                <p>{t.registration}: {car.registration_until || "-"}</p>

                {isRegistrationWarning(car.registration_until) && <p style={{ fontWeight: "bold" }}>⚠️ {t.warning}</p>}

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button onClick={() => startEdit(car)} style={blueSmallButtonStyle}>{t.edit}</button>
                  <button onClick={() => deleteCar(car.id)} style={redSmallButtonStyle}>{t.delete}</button>
                </div>
              </div>
            ))}
          </section>

          <section style={boxStyle}>
            <h2>📊 {t.statistics}</h2>

            {cars.map((car) => (
              <div key={car.id} style={statCardStyle}>
                <strong>{car.name} {car.plate ? `- ${car.plate}` : ""}</strong>

                <div style={statGridStyle}>
                  <div>
                    <span style={statNumberStyle}>{countTripsForCar(car.id)}</span>
                    <p>{t.totalTrips}</p>
                  </div>

                  <div>
                    <span style={statNumberStyle}>{countOpenDamagesForCar(car.id)}</span>
                    <p>{t.activeDamages}</p>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section style={boxStyle}>
            <h2>🔧 {t.damages}</h2>

            {damages.length === 0 ? (
              <p style={{ color: "#aaa" }}>{t.noDamages}</p>
            ) : (
              damages.map((d) => (
                <div key={d.id} style={d.status === "OPEN" ? damageOpenStyle : damageDoneStyle}>
                  <strong>{d.cars?.name} {d.cars?.plate ? `- ${d.cars.plate}` : ""}</strong>
                  <p>{d.description}</p>
                  <p style={{ color: "#aaa" }}>{d.worker_name} · {formatDateTime(d.created_at)} · {d.status === "OPEN" ? t.open : t.repaired}</p>

                  {d.image_url && <img src={d.image_url} alt="Schaden" style={damageImageStyle} />}

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {d.status === "OPEN" && (
                      <button onClick={() => resolveDamage(d.id)} style={greenSmallButtonStyle}>
                        {t.repaired}
                      </button>
                    )}

                    <button onClick={() => deleteDamage(d)} style={redSmallButtonStyle}>
                      {t.delete}
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>

          <section style={boxStyle}>
            <h2>📋 {t.history}</h2>

            {history.length === 0 ? (
              <p style={{ color: "#aaa" }}>{t.noHistory}</p>
            ) : (
              history.map((h) => (
                <div key={h.id} style={historyRowStyle}>
                  <strong>{h.cars?.name} {h.cars?.plate ? `- ${h.cars.plate}` : ""}</strong>
                  <p>
                    {h.worker_name}
                    <br />
                    {t.since}: {formatDateTime(h.check_in_at)}
                    <br />
                    {t.returned}: {h.check_out_at ? formatDateTime(h.check_out_at) : t.active}
                  </p>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </main>
  );
}

const mainStyle: any = { background: "#000", minHeight: "100vh", color: "white", padding: "20px" };
const backStyle: any = { color: "#3b82f6", textDecoration: "none", fontWeight: "bold" };
const titleStyle: any = { fontSize: "38px", color: "#f97316", marginTop: "20px" };
const boxStyle: any = { background: "#111", border: "1px solid #333", borderRadius: "16px", padding: "16px", marginTop: "18px" };
const highlightBoxStyle: any = { ...boxStyle, border: "1px solid #f97316" };
const myCarStyle: any = { background: "#052e16", border: "1px solid #16a34a", borderRadius: "14px", padding: "14px", marginBottom: "12px" };
const inputStyle: any = { width: "100%", padding: "13px", borderRadius: "10px", border: "1px solid #333", background: "#000", color: "white", marginBottom: "10px", fontSize: "16px" };
const textAreaStyle: any = { ...inputStyle, minHeight: "110px", resize: "vertical" };
const greenButtonStyle: any = { width: "100%", padding: "13px", borderRadius: "10px", border: "none", background: "#16a34a", color: "white", fontWeight: "bold", fontSize: "16px", cursor: "pointer" };
const redButtonStyle: any = { ...greenButtonStyle, background: "#dc2626" };
const orangeButtonStyle: any = { ...greenButtonStyle, background: "#f97316" };
const grayButtonStyle: any = { ...greenButtonStyle, background: "#555", marginTop: "8px" };
const rowStyle: any = { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", background: "#000", border: "1px solid #333", borderRadius: "12px", padding: "12px", marginBottom: "8px" };
const adminFormStyle: any = { marginBottom: "16px" };
const carInfoStyle: any = { background: "#000", border: "1px solid #333", borderRadius: "12px", padding: "12px", marginBottom: "10px" };
const warningCarStyle: any = { ...carInfoStyle, background: "#7f1d1d", border: "1px solid #dc2626" };
const smallGreenButtonStyle: any = { background: "#16a34a", color: "white", border: "none", borderRadius: "8px", padding: "9px 12px", fontWeight: "bold", cursor: "pointer" };
const smallRedButtonStyle: any = { ...smallGreenButtonStyle, background: "#dc2626" };
const blueSmallButtonStyle: any = { ...smallGreenButtonStyle, background: "#2563eb" };
const redSmallButtonStyle: any = { ...smallGreenButtonStyle, background: "#dc2626" };
const greenSmallButtonStyle: any = { ...smallGreenButtonStyle, background: "#16a34a" };
const statCardStyle: any = { background: "#000", border: "1px solid #333", borderRadius: "12px", padding: "12px", marginBottom: "10px" };
const statGridStyle: any = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" };
const statNumberStyle: any = { fontSize: "28px", fontWeight: "bold", color: "#f97316" };
const damageOpenStyle: any = { background: "#3b1600", border: "1px solid #f97316", borderRadius: "12px", padding: "12px", marginBottom: "10px" };
const damageDoneStyle: any = { background: "#052e16", border: "1px solid #16a34a", borderRadius: "12px", padding: "12px", marginBottom: "10px" };
const damageImageStyle: any = { width: "100%", maxHeight: "260px", objectFit: "cover", borderRadius: "12px", marginBottom: "10px" };
const historyRowStyle: any = { background: "#000", border: "1px solid #333", borderRadius: "12px", padding: "12px", marginBottom: "10px" };