"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const LOGO_URL =
  "https://axpfymarrqjebpwosidr.supabase.co/storage/v1/object/public/pdf-assets/logo.png";

const BACKGROUND_URL =
  "https://axpfymarrqjebpwosidr.supabase.co/storage/v1/object/public/pdf-assets/pozadina.png";

type WorkerRole = "admin" | "worker";

type Worker = {
  id: string | number;
  name: string;
  role: WorkerRole;
  active: boolean;
};

function normalizeRole(value: unknown): WorkerRole {
  const role = String(value || "")
    .trim()
    .toLowerCase();

  if (
    role === "admin" ||
    role === "administrator" ||
    role === "verwaltung"
  ) {
    return "admin";
  }

  return "worker";
}

function normalizeActive(row: any) {
  if (
    row?.active === false ||
    row?.aktiv === false ||
    row?.aktivan === false ||
    row?.is_active === false
  ) {
    return false;
  }

  const status = String(row?.status || "")
    .trim()
    .toLowerCase();

  if (
    status === "inactive" ||
    status === "inaktiv" ||
    status === "deaktiviert" ||
    status === "disabled" ||
    status === "gelöscht" ||
    status === "deleted"
  ) {
    return false;
  }

  return true;
}

function normalizeWorker(row: any): Worker | null {
  const id = row?.id;

  const name = String(
    row?.name ||
      row?.ime ||
      row?.naziv ||
      row?.worker_name ||
      row?.username ||
      "",
  ).trim();

  if (id === null || id === undefined || !name) {
    return null;
  }

  return {
    id,
    name,
    role: normalizeRole(
      row?.role || row?.rolle || row?.tip || row?.user_role,
    ),
    active: normalizeActive(row),
  };
}

function getWorkerPin(row: any) {
  return String(
    row?.pin ||
      row?.code ||
      row?.kod ||
      row?.login_pin ||
      row?.worker_pin ||
      "",
  ).trim();
}

const AUTH_STORAGE_KEYS = [
  "currentWorker",
  "worker",
  "loggedWorker",
  "selectedWorker",
  "currentUser",
  "loggedUser",
  "user",
  "loginUser",
  "baustelle_user",
  "stone_user",
  "app_user",
  "worker_id",
  "worker_name",
  "worker_role",
  "userName",
  "user_name",
  "name",
  "role",
  "userRole",
  "loggedIn",
  "isLoggedIn",
  "authenticated",
];

function clearOldLoginData() {
  for (const key of AUTH_STORAGE_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}

function saveLoggedUser(worker: Worker) {
  const isAdmin = worker.role === "admin";

  const userObject = {
    id: worker.id,
    worker_id: worker.id,
    name: worker.name,
    worker_name: worker.name,
    role: worker.role,
    active: true,
    is_admin: isAdmin,
    admin: isAdmin,
  };

  const serializedUser = JSON.stringify(userObject);

  const objectKeys = [
    "currentWorker",
    "worker",
    "loggedWorker",
    "selectedWorker",
    "currentUser",
    "loggedUser",
    "user",
    "loginUser",
    "baustelle_user",
    "stone_user",
    "app_user",
  ];

  for (const key of objectKeys) {
    localStorage.setItem(key, serializedUser);
    sessionStorage.setItem(key, serializedUser);
  }

  localStorage.setItem("worker_id", String(worker.id));
  localStorage.setItem("worker_name", worker.name);
  localStorage.setItem("worker_role", worker.role);

  localStorage.setItem("userName", worker.name);
  localStorage.setItem("user_name", worker.name);
  localStorage.setItem("name", worker.name);

  localStorage.setItem("role", worker.role);
  localStorage.setItem("userRole", worker.role);

  localStorage.setItem("loggedIn", "true");
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("authenticated", "true");

  sessionStorage.setItem("worker_id", String(worker.id));
  sessionStorage.setItem("worker_name", worker.name);
  sessionStorage.setItem("worker_role", worker.role);
  sessionStorage.setItem("userName", worker.name);
  sessionStorage.setItem("user_name", worker.name);
  sessionStorage.setItem("name", worker.name);
  sessionStorage.setItem("role", worker.role);
  sessionStorage.setItem("userRole", worker.role);
  sessionStorage.setItem("loggedIn", "true");
  sessionStorage.setItem("isLoggedIn", "true");
  sessionStorage.setItem("authenticated", "true");
}

export default function LoginPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    loadWorkers();
  }, []);

  async function loadWorkers() {
    setLoadingWorkers(true);
    setLoadError("");

    try {
      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      const normalizedWorkers = (data || [])
        .map(normalizeWorker)
        .filter((worker): worker is Worker => Boolean(worker))
        .filter((worker) => worker.active)
        .sort((a, b) => {
          if (a.role !== b.role) {
            return a.role === "worker" ? -1 : 1;
          }

          return a.name.localeCompare(b.name, "de");
        });

      setWorkers(normalizedWorkers);

      const preferredWorker =
        normalizedWorkers.find(
          (worker) => worker.name.toLowerCase() === "hido",
        ) ||
        normalizedWorkers.find((worker) => worker.role === "admin") ||
        normalizedWorkers[0];

      setSelectedWorkerId(
        preferredWorker ? String(preferredWorker.id) : "",
      );
    } catch (error: any) {
      console.error("Fehler beim Laden der Mitarbeiter:", error);

      setWorkers([]);
      setSelectedWorkerId("");
      setLoadError(
        "Die Mitarbeiter konnten nicht geladen werden: " +
          (error?.message || String(error)),
      );
    } finally {
      setLoadingWorkers(false);
    }
  }

  async function login() {
    if (loggingIn || loadingWorkers) return;

    const enteredPin = pin.trim();

    if (!selectedWorkerId) {
      alert("Bitte wählen Sie einen Mitarbeiter aus.");
      return;
    }

    if (!enteredPin) {
      alert("Bitte geben Sie den PIN ein.");
      return;
    }

    const selectedWorker = workers.find(
      (worker) => String(worker.id) === selectedWorkerId,
    );

    if (!selectedWorker) {
      alert(
        "Der ausgewählte Mitarbeiter wurde nicht gefunden. Bitte laden Sie die Seite neu.",
      );
      return;
    }

    setLoggingIn(true);

    try {
      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .eq("id", selectedWorker.id)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        alert("Der Mitarbeiter wurde nicht gefunden.");
        await loadWorkers();
        return;
      }

      const currentWorker = normalizeWorker(data);

      if (!currentWorker || !currentWorker.active) {
        alert(
          "Dieser Mitarbeiter ist deaktiviert und kann sich nicht anmelden.",
        );
        await loadWorkers();
        return;
      }

      const savedPin = getWorkerPin(data);

      if (!savedPin) {
        alert(
          "Für diesen Mitarbeiter wurde noch kein PIN gespeichert.",
        );
        return;
      }

      if (savedPin !== enteredPin) {
        alert("Falscher Name oder PIN.");
        setPin("");
        return;
      }

      clearOldLoginData();
      saveLoggedUser(currentWorker);

      window.location.replace("/dashboard");
    } catch (error: any) {
      console.error("Fehler bei der Anmeldung:", error);

      alert(
        "Die Anmeldung ist fehlgeschlagen: " +
          (error?.message || String(error)),
      );
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <main style={mainStyle}>
      <div style={overlayStyle}>
        <div style={boxStyle}>
          <div style={logoBoxStyle}>
            <img
              src={LOGO_URL}
              alt="Solstone Logo"
              style={logoStyle}
            />

            <p style={systemStyle}>
              Baustellen Management System
            </p>

            <p style={testStyle}>Anmeldung</p>
          </div>

          {loadError && (
            <div style={errorBoxStyle}>
              <p style={errorTextStyle}>{loadError}</p>

              <button
                type="button"
                onClick={loadWorkers}
                style={retryButtonStyle}
              >
                Erneut laden
              </button>
            </div>
          )}

          <label style={labelStyle}>Name</label>

          <select
            value={selectedWorkerId}
            onChange={(event) => {
              setSelectedWorkerId(event.target.value);
              setPin("");
            }}
            style={inputStyle}
            disabled={
              loadingWorkers ||
              loggingIn ||
              workers.length === 0
            }
          >
            {loadingWorkers && (
              <option value="">
                Mitarbeiter werden geladen...
              </option>
            )}

            {!loadingWorkers && workers.length === 0 && (
              <option value="">
                Keine aktiven Mitarbeiter vorhanden
              </option>
            )}

            {workers.map((worker) => (
              <option
                key={String(worker.id)}
                value={String(worker.id)}
              >
                {worker.name}
                {worker.role === "admin"
                  ? " — Administrator"
                  : ""}
              </option>
            ))}
          </select>

          <label style={labelStyle}>PIN</label>

          <div style={pinBoxStyle}>
            <input
              value={pin}
              onChange={(event) =>
                setPin(
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 12),
                )
              }
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              autoComplete="one-time-code"
              style={{
                ...inputStyle,
                marginBottom: 0,
                paddingRight: "55px",
              }}
              placeholder="PIN eingeben"
              disabled={
                loadingWorkers ||
                loggingIn ||
                workers.length === 0
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  login();
                }
              }}
            />

            <button
              type="button"
              onClick={() => setShowPin((current) => !current)}
              style={eyeButtonStyle}
              disabled={loggingIn}
              aria-label={
                showPin ? "PIN ausblenden" : "PIN anzeigen"
              }
            >
              {showPin ? "🙈" : "👁"}
            </button>
          </div>

          <button
            type="button"
            onClick={login}
            style={{
              ...buttonStyle,
              opacity:
                loadingWorkers ||
                loggingIn ||
                workers.length === 0
                  ? 0.6
                  : 1,
              cursor:
                loadingWorkers ||
                loggingIn ||
                workers.length === 0
                  ? "not-allowed"
                  : "pointer",
            }}
            disabled={
              loadingWorkers ||
              loggingIn ||
              workers.length === 0
            }
          >
            {loggingIn
              ? "ANMELDUNG LÄUFT..."
              : loadingWorkers
                ? "MITARBEITER WERDEN GELADEN..."
                : "LOGIN"}
          </button>
        </div>
      </div>
    </main>
  );
}

const mainStyle: any = {
  minHeight: "100vh",
  color: "white",
  backgroundImage: `url(${BACKGROUND_URL})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

const overlayStyle: any = {
  minHeight: "100vh",
  background: "rgba(0,0,0,0.28)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "30px",
};

const boxStyle: any = {
  background: "rgba(0,0,0,0.28)",
  padding: "35px",
  borderRadius: "24px",
  width: "100%",
  maxWidth: "520px",
  border: "1px solid rgba(249,115,22,0.85)",
  boxShadow: "0 0 50px rgba(0,0,0,0.55)",
  backdropFilter: "blur(3px)",
  WebkitBackdropFilter: "blur(3px)",
};

const logoBoxStyle: any = {
  textAlign: "center",
  marginBottom: "35px",
  paddingBottom: "25px",
  borderBottom: "1px solid rgba(255,255,255,0.18)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const logoStyle: any = {
  display: "block",
  width: "100%",
  maxWidth: "360px",
  height: "auto",
  margin: "0 auto 16px auto",
};

const systemStyle: any = {
  fontSize: "18px",
  margin: "8px 0 4px 0",
  color: "#fff",
  fontWeight: "bold",
  textShadow: "0 2px 8px rgba(0,0,0,0.9)",
};

const testStyle: any = {
  fontSize: "15px",
  margin: 0,
  color: "#22c55e",
  fontWeight: "bold",
  textShadow: "0 2px 8px rgba(0,0,0,0.9)",
};

const labelStyle: any = {
  display: "block",
  fontWeight: "bold",
  color: "#fff",
  textShadow: "0 2px 8px rgba(0,0,0,0.9)",
};

const inputStyle: any = {
  width: "100%",
  boxSizing: "border-box",
  padding: "15px",
  marginTop: "8px",
  marginBottom: "20px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.5)",
  background: "rgba(255,255,255,0.88)",
  color: "#000",
  fontSize: "18px",
  outline: "none",
};

const pinBoxStyle: any = {
  position: "relative",
  marginBottom: "20px",
};

const eyeButtonStyle: any = {
  position: "absolute",
  right: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  background: "transparent",
  border: "none",
  color: "#111",
  cursor: "pointer",
  fontSize: "20px",
};

const buttonStyle: any = {
  width: "100%",
  padding: "16px",
  background: "#f97316",
  color: "white",
  border: "none",
  borderRadius: "14px",
  fontSize: "20px",
  fontWeight: "bold",
  marginTop: "10px",
};

const errorBoxStyle: any = {
  background: "rgba(220,38,38,0.85)",
  border: "1px solid rgba(255,255,255,0.35)",
  borderRadius: "12px",
  padding: "14px",
  marginBottom: "20px",
};

const errorTextStyle: any = {
  color: "#fff",
  margin: "0 0 10px 0",
  lineHeight: 1.4,
};

const retryButtonStyle: any = {
  background: "#fff",
  color: "#991b1b",
  border: "none",
  borderRadius: "8px",
  padding: "9px 14px",
  fontWeight: "bold",
  cursor: "pointer",
};