"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const ADMINI = ["Hido", "Steffi", "Admin"];

const translations: any = {
  de: {
    title: "Autos",
    back: "← Zurück",
    chooseCar: "Auto auswählen",
    selectCar: "Auto wählen",
    save: "Speichern",
    todayCars: "Heutige Autoverteilung",
    parking: "Parking / Frei",
    info: "Auto Informationen",
    history: "Fahrhistorie",
    addCar: "Auto hinzufügen",
    edit: "Bearbeiten",
    delete: "Löschen",
    name: "Auto Name",
    plate: "Kennzeichen",
    registration: "Registrierung gültig bis",
    warning: "Registrierung läuft bald ab!",
    noCars: "Keine Autos vorhanden.",
    noHistory: "Keine Historie vorhanden.",
    cancel: "Abbrechen",
    alreadyTaken: "Dieses Auto ist heute bereits vergeben.",
    saved: "Auto wurde gespeichert.",
    enterName: "Bitte Auto Name eingeben.",
  },
  ba: {
    title: "Auta",
    back: "← Nazad",
    chooseCar: "Odaberi auto",
    selectCar: "Izaberi auto",
    save: "Spremi",
    todayCars: "Današnja raspodjela auta",
    parking: "Parking / Slobodna auta",
    info: "Informacije o autima",
    history: "Historija vožnje",
    addCar: "Dodaj auto",
    edit: "Uredi",
    delete: "Obriši",
    name: "Ime auta",
    plate: "Tablice",
    registration: "Registracija važi do",
    warning: "Registracija uskoro ističe!",
    noCars: "Nema auta.",
    noHistory: "Nema historije.",
    cancel: "Odustani",
    alreadyTaken: "Ovo auto je danas već zauzeto.",
    saved: "Auto je spremljeno.",
    enterName: "Upiši ime auta.",
  },
  uz: {
    title: "Mashinalar",
    back: "← Orqaga",
    chooseCar: "Mashina tanlash",
    selectCar: "Mashina tanlang",
    save: "Saqlash",
    todayCars: "Bugungi mashina taqsimoti",
    parking: "Parking / Bo‘sh mashinalar",
    info: "Mashina ma’lumotlari",
    history: "Haydash tarixi",
    addCar: "Mashina qo‘shish",
    edit: "Tahrirlash",
    delete: "O‘chirish",
    name: "Mashina nomi",
    plate: "Raqam",
    registration: "Ro‘yxatdan o‘tish muddati",
    warning: "Ro‘yxatdan o‘tish muddati tugayapti!",
    noCars: "Mashina yo‘q.",
    noHistory: "Tarix yo‘q.",
    cancel: "Bekor qilish",
    alreadyTaken: "Bu mashina bugun band.",
    saved: "Mashina saqlandi.",
    enterName: "Mashina nomini yozing.",
  },
  en: {
    title: "Cars",
    back: "← Back",
    chooseCar: "Choose car",
    selectCar: "Select car",
    save: "Save",
    todayCars: "Today car assignments",
    parking: "Parking / Free cars",
    info: "Car information",
    history: "Driving history",
    addCar: "Add car",
    edit: "Edit",
    delete: "Delete",
    name: "Car name",
    plate: "Plate",
    registration: "Registration valid until",
    warning: "Registration expires soon!",
    noCars: "No cars.",
    noHistory: "No history.",
    cancel: "Cancel",
    alreadyTaken: "This car is already taken today.",
    saved: "Car saved.",
    enterName: "Enter car name.",
  },
};

export default function AutaPage() {
  const [workerName, setWorkerName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [lang, setLang] = useState("de");

  const [cars, setCars] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedCarId, setSelectedCarId] = useState("");

  const [carName, setCarName] = useState("");
  const [plate, setPlate] = useState("");
  const [registrationUntil, setRegistrationUntil] = useState("");
  const [editingCar, setEditingCar] = useState<any>(null);

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

  async function loadData() {
    const todayDate = today();

    const carsRes = await supabase.from("cars").select("*").order("name");

    if (carsRes.error) {
      alert("Greška kod učitavanja auta: " + carsRes.error.message);
      return;
    }

    setCars(carsRes.data || []);

    const assRes = await supabase
      .from("car_assignments")
      .select("*, cars(*)")
      .eq("assignment_date", todayDate)
      .order("worker_name");

    if (!assRes.error) {
      setAssignments(assRes.data || []);
    }

    const historyRes = await supabase
      .from("car_assignments")
      .select("*, cars(*)")
      .order("assignment_date", { ascending: false })
      .limit(100);

    if (!historyRes.error) {
      setHistory(historyRes.data || []);
    }
  }

  async function assignCar() {
    if (!selectedCarId) return;

    if (!workerName) {
      alert("Nisi prijavljen.");
      return;
    }

    const { error } = await supabase.from("car_assignments").insert({
      car_id: Number(selectedCarId),
      worker_name: workerName,
      assignment_date: today(),
    });

    if (error) {
      alert(t.alreadyTaken + "\n\n" + error.message);
      return;
    }

    setSelectedCarId("");
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
      alert("Greška kod spremanja auta: " + error.message);
      return;
    }

    alert(t.saved);

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
      alert("Greška kod brisanja auta: " + error.message);
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

  function isRegistrationWarning(date: string) {
    if (!date) return false;

    const todayDate = new Date(today());
    const regDate = new Date(date);
    const diff = regDate.getTime() - todayDate.getTime();

    return diff <= 30 * 24 * 60 * 60 * 1000;
  }

  const takenCarIds = assignments.map((a) => a.car_id);
  const freeCars = cars.filter((c) => !takenCarIds.includes(c.id));

  return (
    <main style={mainStyle}>
      <Link href="/dashboard" style={backStyle}>
        {t.back}
      </Link>

      <h1 style={titleStyle}>🚗 {t.title}</h1>

      <section style={boxStyle}>
        <h2>🚘 {t.chooseCar}</h2>

        <select
          value={selectedCarId}
          onChange={(e) => setSelectedCarId(e.target.value)}
          style={inputStyle}
        >
          <option value="">{t.selectCar}</option>

          {freeCars.map((car) => (
            <option key={car.id} value={car.id}>
              {car.name} {car.plate ? `- ${car.plate}` : ""}
            </option>
          ))}
        </select>

        <button onClick={assignCar} style={greenButtonStyle}>
          {t.save}
        </button>
      </section>

      <section style={boxStyle}>
        <h2>✅ {t.todayCars}</h2>

        {assignments.length === 0 ? (
          <p style={{ color: "#aaa" }}>{t.noCars}</p>
        ) : (
          assignments.map((a) => (
            <div key={a.id} style={rowStyle}>
              <strong>{a.worker_name}</strong>
              <span>
                {a.cars?.name} {a.cars?.plate ? `- ${a.cars.plate}` : ""}
              </span>
            </div>
          ))
        )}
      </section>

      <section style={boxStyle}>
        <h2>🅿️ {t.parking}</h2>

        {freeCars.length === 0 ? (
          <p style={{ color: "#aaa" }}>{t.noCars}</p>
        ) : (
          freeCars.map((car) => (
            <div key={car.id} style={rowStyle}>
              <strong>{car.name}</strong>
              <span>{car.plate || ""}</span>
            </div>
          ))
        )}
      </section>

      <section style={boxStyle}>
        <h2>ℹ️ {t.info}</h2>

        {isAdmin && (
          <div style={adminFormStyle}>
            <input
              value={carName}
              onChange={(e) => setCarName(e.target.value)}
              placeholder={t.name}
              style={inputStyle}
            />

            <input
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder={t.plate}
              style={inputStyle}
            />

            <input
              type="date"
              value={registrationUntil}
              onChange={(e) => setRegistrationUntil(e.target.value)}
              style={inputStyle}
            />

            <button onClick={saveCar} style={greenButtonStyle}>
              {editingCar ? t.edit : t.addCar}
            </button>

            {editingCar && (
              <button onClick={cancelEdit} style={grayButtonStyle}>
                {t.cancel}
              </button>
            )}
          </div>
        )}

        {cars.length === 0 ? (
          <p style={{ color: "#aaa" }}>{t.noCars}</p>
        ) : (
          cars.map((car) => (
            <div
              key={car.id}
              style={
                isRegistrationWarning(car.registration_until)
                  ? warningCarStyle
                  : carInfoStyle
              }
            >
              <strong>
                {car.name} {car.plate ? `- ${car.plate}` : ""}
              </strong>

              <p>
                {t.registration}: {car.registration_until || "-"}
              </p>

              {isRegistrationWarning(car.registration_until) && (
                <p style={{ fontWeight: "bold" }}>⚠️ {t.warning}</p>
              )}

              {isAdmin && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => startEdit(car)} style={blueSmallButtonStyle}>
                    {t.edit}
                  </button>

                  <button onClick={() => deleteCar(car.id)} style={redSmallButtonStyle}>
                    {t.delete}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </section>

      {isAdmin && (
        <section style={boxStyle}>
          <h2>📋 {t.history}</h2>

          {history.length === 0 ? (
            <p style={{ color: "#aaa" }}>{t.noHistory}</p>
          ) : (
            history.map((h) => (
              <div key={h.id} style={rowStyle}>
                <strong>{h.assignment_date}</strong>
                <span>
                  {h.worker_name} → {h.cars?.name}{" "}
                  {h.cars?.plate ? `- ${h.cars.plate}` : ""}
                </span>
              </div>
            ))
          )}
        </section>
      )}
    </main>
  );
}

const mainStyle: any = {
  background: "#000",
  minHeight: "100vh",
  color: "white",
  padding: "20px",
};

const backStyle: any = {
  color: "#3b82f6",
  textDecoration: "none",
  fontWeight: "bold",
};

const titleStyle: any = {
  fontSize: "38px",
  color: "#f97316",
  marginTop: "20px",
};

const boxStyle: any = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: "16px",
  padding: "16px",
  marginTop: "18px",
};

const inputStyle: any = {
  width: "100%",
  padding: "13px",
  borderRadius: "10px",
  border: "1px solid #333",
  background: "#000",
  color: "white",
  marginBottom: "10px",
  fontSize: "16px",
};

const greenButtonStyle: any = {
  width: "100%",
  padding: "13px",
  borderRadius: "10px",
  border: "none",
  background: "#16a34a",
  color: "white",
  fontWeight: "bold",
  fontSize: "16px",
  cursor: "pointer",
};

const grayButtonStyle: any = {
  ...greenButtonStyle,
  background: "#555",
  marginTop: "8px",
};

const rowStyle: any = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  background: "#000",
  border: "1px solid #333",
  borderRadius: "12px",
  padding: "12px",
  marginBottom: "8px",
};

const adminFormStyle: any = {
  marginBottom: "16px",
};

const carInfoStyle: any = {
  background: "#000",
  border: "1px solid #333",
  borderRadius: "12px",
  padding: "12px",
  marginBottom: "10px",
};

const warningCarStyle: any = {
  ...carInfoStyle,
  background: "#7f1d1d",
  border: "1px solid #dc2626",
};

const blueSmallButtonStyle: any = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "8px 12px",
  fontWeight: "bold",
  cursor: "pointer",
};

const redSmallButtonStyle: any = {
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "8px 12px",
  fontWeight: "bold",
  cursor: "pointer",
};