import { useEffect, useState, type CSSProperties } from "react";
import { supabase } from "./lib/supabase";

const LOGO_URL =
  "https://axpfymarrqjebpwosidr.supabase.co/storage/v1/object/public/pdf-assets/logo.png";

const BACKGROUND_URL =
  "https://axpfymarrqjebpwosidr.supabase.co/storage/v1/object/public/pdf-assets/pozadina.png";

type Worker = {
  id: number;
  name: string;
  role: string;
  active: boolean;
  auth_user_id: string | null;
};

type Baustelle = {
  id: number | string;
  [key: string]: any;
};

type AppScreen = "dashboard" | "baustellen";

type ErrorDetails = {
  message?: string;
  status?: number;
  code?: string;
  name?: string;
};

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [language, setLanguage] = useState("BA");
  const [screen, setScreen] = useState<AppScreen>("dashboard");

  const [baustellen, setBaustellen] = useState<Baustelle[]>([]);
  const [baustellenLoading, setBaustellenLoading] = useState(false);

  useEffect(() => {
    checkExistingSession();
  }, []);

  function formatError(error: unknown) {
    const details = error as ErrorDetails;

    const message = details?.message || "Nepoznata greška povezivanja.";
    const status = details?.status !== undefined ? String(details.status) : "nema";
    const code = details?.code || "nema";
    const name = details?.name || "nema";

    return [
      `Poruka: ${message}`,
      `Status: ${status}`,
      `Kod: ${code}`,
      `Naziv: ${name}`,
    ].join("\n");
  }

  function readText(item: any, keys: string[], fallback: string) {
    for (const key of keys) {
      const value = item?.[key];

      if (value !== null && value !== undefined && String(value).trim() !== "") {
        return String(value);
      }
    }

    return fallback;
  }

  function isArchivedBaustelle(item: any) {
    const status = readText(item, ["status", "Status", "zustand", "state"], "").toLowerCase();

    const archived =
      item?.archived ??
      item?.is_archived ??
      item?.archiviert ??
      item?.archive ??
      false;

    if (archived === true) return true;

    return (
      status.includes("archiv") ||
      status.includes("geschlossen") ||
      status.includes("closed") ||
      status.includes("abgeschlossen")
    );
  }

  function getBaustelleTitle(site: Baustelle) {
    return readText(
      site,
      ["name", "naziv", "title", "baustelle", "baustelle_name", "projekt", "projekt_name"],
      `Baustelle #${site.id}`
    );
  }

  function getBaustelleLocation(site: Baustelle) {
    return readText(
      site,
      ["ort", "place", "location", "lokacija", "mjesto", "adresse", "address"],
      "Keine Adresse eingetragen"
    );
  }

  function saveWorkerLocally(currentWorker: Worker) {
    localStorage.setItem("worker_id", String(currentWorker.id));
    localStorage.setItem("worker_name", currentWorker.name);
    localStorage.setItem("worker_role", currentWorker.role);
    localStorage.setItem("userName", currentWorker.name);
  }

  function clearLocalWorker() {
    localStorage.removeItem("worker_id");
    localStorage.removeItem("worker_name");
    localStorage.removeItem("worker_role");
    localStorage.removeItem("userName");
  }

  async function loadWorker(authUserId: string): Promise<Worker | null> {
    const { data, error } = await supabase
      .from("workers")
      .select("id, name, role, active, auth_user_id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error) {
      setErrorMessage(
        "Prijava je prošla, ali radnik nije učitan iz tabele workers.\n\n" +
          formatError(error)
      );
      return null;
    }

    if (!data) {
      setErrorMessage(
        "Prijava je prošla, ali ovaj Supabase korisnik nije povezan s radnikom u tabeli workers."
      );
      return null;
    }

    if (!data.active) {
      setErrorMessage("Ovaj korisnički račun je deaktiviran.");
      return null;
    }

    return data as Worker;
  }

  async function checkExistingSession() {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session?.user) {
        clearLocalWorker();
        setWorker(null);
        return;
      }

      const loadedWorker = await loadWorker(session.user.id);

      if (!loadedWorker) {
        await supabase.auth.signOut();
        clearLocalWorker();
        setWorker(null);
        return;
      }

      saveWorkerLocally(loadedWorker);
      setWorker(loadedWorker);
      setScreen("dashboard");
    } catch (error) {
      clearLocalWorker();
      setWorker(null);
      setErrorMessage("Greška kod provjere prijave.\n\n" + formatError(error));
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    setErrorMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage("Unesi e-mail adresu.");
      return;
    }

    if (!password) {
      setErrorMessage("Unesi lozinku.");
      return;
    }

    setLoginLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        const exactError = formatError(error);
        setErrorMessage("Supabase prijava nije uspjela.\n\n" + exactError);
        alert("Supabase greška:\n\n" + exactError);
        return;
      }

      if (!data.user) {
        setErrorMessage("Supabase nije prijavio grešku, ali nije vratio korisnika.");
        return;
      }

      const loadedWorker = await loadWorker(data.user.id);

      if (!loadedWorker) {
        await supabase.auth.signOut();
        clearLocalWorker();
        return;
      }

      saveWorkerLocally(loadedWorker);
      setWorker(loadedWorker);
      setScreen("dashboard");
      setPassword("");
      setShowPassword(false);
      setErrorMessage("");
    } catch (error) {
      const exactError = formatError(error);
      setErrorMessage("Dogodila se neočekivana greška.\n\n" + exactError);
      alert("Neočekivana greška:\n\n" + exactError);
    } finally {
      setLoginLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    clearLocalWorker();
    setWorker(null);
    setEmail("");
    setPassword("");
    setScreen("dashboard");
    setBaustellen([]);
    setErrorMessage("");
  }

  async function openBaustellen() {
    setScreen("baustellen");
    setBaustellenLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("baustellen")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      setErrorMessage("Baustelle nisu učitane.\n\n" + formatError(error));
      setBaustellen([]);
      setBaustellenLoading(false);
      return;
    }

    setBaustellen((data || []).filter((site) => !isArchivedBaustelle(site)) as Baustelle[]);
    setBaustellenLoading(false);
  }

  function notReady(label: string) {
    alert(`${label} povezujemo u sljedećem koraku.`);
  }

  if (loading) {
    return (
      <main style={loadingPageStyle}>
        <div style={loadingBoxStyle}>Učitavanje aplikacije...</div>
      </main>
    );
  }

  if (!worker) {
    return (
      <main style={loginPageStyle}>
        <div style={loginCardStyle}>
          <img src={LOGO_URL} alt="Solstone" style={loginLogoStyle} />

          <p style={loginSubtitleStyle}>Baustellen Management System</p>
          <p style={loginSecureStyle}>Sichere mobile Anmeldung</p>

          <label style={loginLabelStyle}>E-Mail-Adresse</label>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="email"
            placeholder="E-Mail-Adresse eingeben"
            style={loginInputStyle}
            disabled={loginLoading}
          />

          <label style={loginLabelStyle}>Passwort</label>
          <div style={passwordBoxStyle}>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Passwort eingeben"
              style={passwordInputStyle}
              disabled={loginLoading}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !loginLoading) login();
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              style={eyeButtonStyle}
              disabled={loginLoading}
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>

          {errorMessage && (
            <div style={errorBoxStyle}>
              <pre style={errorTextStyle}>{errorMessage}</pre>
            </div>
          )}

          <button
            type="button"
            onClick={login}
            disabled={loginLoading}
            style={loginButtonStyle}
          >
            {loginLoading ? "ANMELDUNG..." : "SICHER ANMELDEN"}
          </button>
        </div>
      </main>
    );
  }

  if (screen === "baustellen") {
    return (
      <main style={dashboardPageStyle}>
        <header style={mobileHeaderStyle}>
          <div>
            <h1 style={titleStyle}>STONE BOUTIQUE</h1>
            <p style={welcomeStyle}>Dobrodošao {worker.name}</p>
          </div>
          <button type="button" onClick={() => setScreen("dashboard")} style={backButtonStyle}>
            Nazad
          </button>
        </header>

        <section style={infoPanelStyle}>
          <h2 style={sectionTitleStyle}>🏗️ Baustelle</h2>

          {baustellenLoading && <p style={mutedTextStyle}>Učitavanje...</p>}

          {!baustellenLoading && baustellen.length === 0 && (
            <p style={mutedTextStyle}>Trenutno nema aktivnih baustela.</p>
          )}

          <div style={siteListStyle}>
            {baustellen.map((site) => (
              <button
                key={String(site.id)}
                type="button"
                onClick={() => notReady(getBaustelleTitle(site))}
                style={siteCardStyle}
              >
                <strong>{getBaustelleTitle(site)}</strong>
                <span style={siteLocationStyle}>{getBaustelleLocation(site)}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={dashboardPageStyle}>
      <header style={mobileHeaderStyle}>
        <div>
          <h1 style={titleStyle}>STONE BOUTIQUE</h1>
          <p style={welcomeStyle}>Dobrodošao {worker.name}</p>
        </div>
      </header>

      <div style={languageRowStyle}>
        {['DE', 'BA', 'UZ', 'EN'].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setLanguage(item)}
            style={{
              ...languageButtonStyle,
              background: language === item ? '#f97316' : '#111827',
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <section style={menuGridStyle}>
        <button type="button" onClick={openBaustellen} style={{ ...menuButtonStyle, background: '#2563eb' }}>
          🏗️ Baustelle
        </button>

        <button type="button" onClick={() => notReady('Moji projekti')} style={{ ...menuButtonStyle, background: '#16a34a' }}>
          👷 Moji projekti
        </button>

        <button type="button" onClick={() => notReady('Projekti')} style={{ ...menuButtonStyle, background: '#f97316' }}>
          📁 Projekti
        </button>

        <button type="button" onClick={() => notReady('Sati')} style={{ ...menuButtonStyle, background: '#2563eb' }}>
          ⏱️ Sati
        </button>

        <button type="button" onClick={() => notReady('Kalendar')} style={{ ...menuButtonStyle, background: '#dc2626' }}>
          🗓️ Kalendar
        </button>

        <button type="button" onClick={() => notReady('Auta')} style={{ ...menuButtonStyle, background: '#2563eb' }}>
          🚗 Auta
        </button>

        <button type="button" onClick={() => notReady('Info')} style={{ ...menuButtonStyle, background: '#2563eb' }}>
          📢 Info
          <span style={smallButtonTextStyle}>0 poruka</span>
        </button>

        <button type="button" onClick={() => notReady('Privatna bilješka')} style={{ ...menuButtonStyle, background: '#2563eb' }}>
          📝 Privatna bilješka
        </button>

        <button type="button" onClick={() => notReady('Naruči materijal')} style={{ ...menuButtonStyle, background: '#2563eb' }}>
          🧱 Naruči materijal
          <span style={smallButtonTextStyle}>0 NEW</span>
        </button>

        <button type="button" onClick={logout} style={{ ...menuButtonStyle, background: '#dc2626' }}>
          🚪 Odjava
        </button>
      </section>

      <section style={infoPanelStyle}>
        <h2 style={sectionTitleStyle}>📢 Info</h2>
        <p style={mutedTextStyle}>Trenutno nema info poruka.</p>
      </section>
    </main>
  );
}

const loadingPageStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#000000',
  color: '#ffffff',
};

const loadingBoxStyle: CSSProperties = {
  padding: '20px',
  borderRadius: '16px',
  background: '#111111',
  border: '1px solid #333333',
  fontWeight: 800,
};

const loginPageStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '22px',
  backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${BACKGROUND_URL})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  color: '#ffffff',
  boxSizing: 'border-box',
};

const loginCardStyle: CSSProperties = {
  width: '100%',
  maxWidth: '430px',
  padding: '24px',
  borderRadius: '22px',
  background: 'rgba(0,0,0,0.67)',
  border: '1px solid #f97316',
  boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
  boxSizing: 'border-box',
};

const loginLogoStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  maxWidth: '280px',
  height: 'auto',
  margin: '0 auto 12px',
};

const loginSubtitleStyle: CSSProperties = {
  margin: '0 0 6px',
  textAlign: 'center',
  fontWeight: 800,
};

const loginSecureStyle: CSSProperties = {
  margin: '0 0 24px',
  textAlign: 'center',
  color: '#22c55e',
  fontWeight: 800,
};

const loginLabelStyle: CSSProperties = {
  display: 'block',
  marginBottom: '8px',
  fontWeight: 800,
};

const loginInputStyle: CSSProperties = {
  width: '100%',
  height: '52px',
  padding: '0 14px',
  marginBottom: '18px',
  border: 'none',
  borderRadius: '13px',
  background: '#ffffff',
  color: '#111111',
  fontSize: '16px',
  boxSizing: 'border-box',
};

const passwordBoxStyle: CSSProperties = {
  position: 'relative',
  marginBottom: '18px',
};

const passwordInputStyle: CSSProperties = {
  ...loginInputStyle,
  marginBottom: 0,
  paddingRight: '54px',
};

const eyeButtonStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  right: '8px',
  transform: 'translateY(-50%)',
  width: '40px',
  height: '40px',
  border: 'none',
  background: 'transparent',
  fontSize: '20px',
};

const loginButtonStyle: CSSProperties = {
  width: '100%',
  minHeight: '54px',
  border: 'none',
  borderRadius: '14px',
  background: '#f97316',
  color: '#ffffff',
  fontSize: '17px',
  fontWeight: 900,
};

const dashboardPageStyle: CSSProperties = {
  minHeight: '100vh',
  padding: '18px 14px 28px',
  background: '#000000',
  color: '#ffffff',
  boxSizing: 'border-box',
};

const mobileHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  marginBottom: '12px',
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#f97316',
  fontSize: '28px',
  letterSpacing: '1px',
  fontWeight: 900,
};

const welcomeStyle: CSSProperties = {
  margin: '8px 0 0',
  color: '#ffffff',
  fontSize: '14px',
};

const languageRowStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginBottom: '18px',
};

const languageButtonStyle: CSSProperties = {
  minWidth: '38px',
  minHeight: '34px',
  padding: '6px 10px',
  border: '1px solid #374151',
  borderRadius: '8px',
  color: '#ffffff',
  fontWeight: 900,
};

const menuGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '9px',
  marginBottom: '20px',
};

const menuButtonStyle: CSSProperties = {
  minHeight: '58px',
  padding: '10px 8px',
  border: 'none',
  borderRadius: '10px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 900,
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2px',
  textAlign: 'center',
};

const smallButtonTextStyle: CSSProperties = {
  fontSize: '10px',
  fontWeight: 900,
  color: '#ffffff',
};

const infoPanelStyle: CSSProperties = {
  padding: '16px',
  borderRadius: '12px',
  background: '#0b0b0b',
  border: '1px solid #2b2b2b',
};

const sectionTitleStyle: CSSProperties = {
  margin: '0 0 14px',
  color: '#f97316',
  fontSize: '18px',
};

const mutedTextStyle: CSSProperties = {
  margin: 0,
  color: '#d1d5db',
  fontSize: '14px',
};

const errorBoxStyle: CSSProperties = {
  padding: '12px',
  marginBottom: '16px',
  borderRadius: '12px',
  border: '1px solid #ef4444',
  background: '#7f1d1d',
  color: '#ffffff',
};

const errorTextStyle: CSSProperties = {
  margin: 0,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  fontFamily: 'Arial, sans-serif',
  fontSize: '13px',
};

const backButtonStyle: CSSProperties = {
  minHeight: '40px',
  padding: '9px 13px',
  border: 'none',
  borderRadius: '10px',
  background: '#2563eb',
  color: '#ffffff',
  fontWeight: 900,
};

const siteListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const siteCardStyle: CSSProperties = {
  width: '100%',
  padding: '14px',
  border: '1px solid #2b2b2b',
  borderRadius: '12px',
  background: '#111111',
  color: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '6px',
  textAlign: 'left',
};

const siteLocationStyle: CSSProperties = {
  color: '#d1d5db',
  fontSize: '13px',
};

export default App;
