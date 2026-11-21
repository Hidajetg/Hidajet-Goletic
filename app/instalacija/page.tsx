"use client";

import Link from "next/link";
import { useState } from "react";

type Lang = "de" | "ba" | "uz" | "cz" | "en";
type Copy = {
  title: string; subtitle: string; android: string; iphone: string; web: string;
  androidSteps: string[]; iphoneSteps: string[]; webSteps: string[];
  note: string; security: string; open: string; intro: string;
};

const words: Record<Lang, Copy> = {
  de: {
    title: "Solstone installieren", subtitle: "Ein Programm. Dieselben Daten auf Handy und Computer.",
    intro: "Diese Seite kannst du als Link per WhatsApp weitergeben. Bitte verwende nur die offizielle Solstone-Adresse.",
    android: "Android – APK vom Administrator", iphone: "iPhone – über Safari", web: "Web – im Browser",
    androidSteps: [
      "Erhalte die von der Firma freigegebene, signierte Solstone-APK per WhatsApp.",
      "Öffne die Datei auf deinem Android-Gerät und bestätige die Installation für diese Quelle, falls Android danach fragt.",
      "Melde dich mit deinem eigenen Solstone-Zugang an. Spätere APK-Versionen werden über die bestehende App installiert, nicht als neue App.",
    ],
    iphoneSteps: [
      "Öffne diese Solstone-Webseite in Safari auf dem iPhone.",
      "Tippe auf Teilen und wähle „Zum Home-Bildschirm“.",
      "Aktiviere „Als Web-App öffnen“, wenn angeboten, und tippe auf „Hinzufügen“.",
      "Starte Solstone über das neue Symbol. Änderungen an der Webseite werden ohne neue Installation geladen.",
    ],
    webSteps: ["Öffne Solstone im Browser.", "Melde dich mit deinem eigenen Solstone-Zugang an."],
    note: "Hinweis: Auf dem iPhone ist das zunächst eine Web-App auf dem Home-Bildschirm, keine native IPA. Eine spätere native iOS-Version benötigt Apple-Signierung.",
    security: "Keine APK unbekannter Absender installieren. Fotos, Passwörter und Zugangscodes nicht über WhatsApp verschicken.",
    open: "Solstone öffnen", 
  },
  ba: {
    title: "Instalacija Solstone aplikacije", subtitle: "Jedan program. Isti podaci na telefonu i računaru.",
    intro: "Ovu stranicu administrator može poslati radniku kao link preko WhatsAppa. Koristi samo službenu Solstone adresu.",
    android: "Android – APK od administratora", iphone: "iPhone – preko Safarija", web: "Web – preko preglednika",
    androidSteps: [
      "Od administratora primi službeni, potpisani Solstone APK preko WhatsAppa.",
      "Otvori APK na Android telefonu i potvrdi dozvolu za instalaciju iz tog izvora ako Android to zatraži.",
      "Prijavi se svojim Solstone računom. Naredne APK verzije instaliraju se preko postojeće aplikacije, ne kao nova aplikacija.",
    ],
    iphoneSteps: [
      "Otvori ovu Solstone web-stranicu u Safariju na iPhoneu.",
      "Dodirni Podijeli (Share), zatim Dodaj na početni ekran (Add to Home Screen).",
      "Ako se pojavi, uključi Otvori kao web-aplikaciju (Open as Web App) i dodirni Dodaj.",
      "Pokreni Solstone preko nove ikone. Promjene na webu stižu bez ponovne instalacije.",
    ],
    webSteps: ["Otvori Solstone na računaru u pregledniku.", "Prijavi se svojim Solstone računom."],
    note: "Napomena: iPhone za početak koristi web-aplikaciju na početnom ekranu, a ne instalirani IPA. Za zasebnu iOS verziju kasnije treba Apple potpisivanje.",
    security: "Ne instaliraj APK od nepoznatog pošiljaoca. Ne šalji lozinke, PIN-ove ili privatne fotografije preko WhatsAppa.",
    open: "Otvori Solstone",
  },
  uz: {
    title: "Solstone o‘rnatish", subtitle: "Bitta dastur. Telefon va kompyuterda bir xil ma’lumotlar.",
    intro: "Administrator ushbu sahifa havolasini WhatsApp orqali yuborishi mumkin. Faqat rasmiy Solstone manzilidan foydalaning.",
    android: "Android – administratordan APK", iphone: "iPhone – Safari orqali", web: "Veb – brauzer orqali",
    androidSteps: [
      "Administrator yuborgan rasmiy, imzolangan Solstone APK faylini oling.",
      "Android telefonida APK-ni oching va so‘ralsa ushbu manbadan o‘rnatishga ruxsat bering.",
      "Solstone hisobingiz bilan kiring. Keyingi imzolangan versiyalar mavjud ilova ustiga yangilanadi.",
    ],
    iphoneSteps: [
      "Solstone veb-sahifasini iPhone Safari brauzerida oching.",
      "Share tugmasini, keyin Add to Home Screen variantini tanlang.",
      "Agar ko‘rinsa Open as Web App funksiyasini yoqing va Add ni bosing.",
      "Yangi belgidan Solstone-ni oching. Veb yangilanishlari qayta o‘rnatishni talab qilmaydi.",
    ],
    webSteps: ["Solstone-ni brauzerda oching.", "O‘z hisobingiz bilan kiring."],
    note: "iPhone uchun hozircha bosh ekrandagi veb-ilova ishlatiladi, mahalliy IPA emas. Keyingi iOS versiyasi uchun Apple imzosi kerak.",
    security: "Noma’lum yuboruvchidan APK o‘rnatmang. Parol va PIN kodlaringizni WhatsApp orqali yubormang.",
    open: "Solstone-ni ochish",
  },
  cz: {
    title: "Instalace Solstone", subtitle: "Jedna aplikace. Stejná data v telefonu i počítači.",
    intro: "Správce může tento odkaz poslat pracovníkům přes WhatsApp. Používejte pouze oficiální adresu Solstone.",
    android: "Android – APK od správce", iphone: "iPhone – přes Safari", web: "Web – v prohlížeči",
    androidSteps: [
      "Převezměte oficiální podepsaný APK od správce přes WhatsApp.",
      "Otevřete soubor v Androidu a podle potřeby povolte instalaci z tohoto zdroje.",
      "Přihlaste se do Solstone. Další podepsané verze se nainstalují přes stávající aplikaci.",
    ],
    iphoneSteps: [
      "Otevřete web Solstone v Safari na iPhonu.",
      "Klepněte na Sdílet a zvolte Přidat na plochu.",
      "Pokud je tato volba dostupná, aktivujte Otevřít jako webovou aplikaci a klepněte na Přidat.",
      "Spusťte Solstone z nové ikony. Webové aktualizace se projeví bez přeinstalace.",
    ],
    webSteps: ["Otevřete Solstone v prohlížeči.", "Přihlaste se svým účtem."],
    note: "Na iPhonu jde zatím o webovou aplikaci na ploše, nikoli nativní IPA. Pro budoucí verzi iOS bude nutné podepisování Apple.",
    security: "Neinstalujte APK od neznámých osob. Neposílejte hesla ani PINy přes WhatsApp.",
    open: "Otevřít Solstone",
  },
  en: {
    title: "Install Solstone", subtitle: "One application. The same data on your phone and computer.",
    intro: "An administrator can share this page via WhatsApp. Use only the official Solstone address.",
    android: "Android – APK from your admin", iphone: "iPhone – using Safari", web: "Web – in your browser",
    androidSteps: [
      "Receive the official, signed Solstone APK from your administrator via WhatsApp.",
      "Open the APK on Android and allow installation from that source if Android asks.",
      "Sign in with your Solstone account. Future signed versions install as updates over the existing app.",
    ],
    iphoneSteps: [
      "Open this Solstone website in Safari on your iPhone.",
      "Tap Share and choose Add to Home Screen.",
      "Enable Open as Web App if shown, then tap Add.",
      "Launch Solstone from its new icon. Website updates appear without reinstalling.",
    ],
    webSteps: ["Open Solstone in a web browser.", "Sign in with your Solstone account."],
    note: "On iPhone, this is initially a Home Screen web app, not a native IPA. A native iOS build later requires Apple signing.",
    security: "Never install an APK from an unknown sender. Do not send passwords, PINs, or private photos through WhatsApp.",
    open: "Open Solstone",
  },
};

function Panel({ title, steps }: { title: string; steps: string[] }) {
  return (
    <section style={{ background: "#1d2c40", border: "1px solid #43566f", borderRadius: 14, padding: 17, marginBottom: 14 }}>
      <h2 style={{ fontSize: 17, margin: "0 0 12px", color: "#fff" }}>{title}</h2>
      <ol style={{ margin: 0, paddingLeft: 21, display: "grid", gap: 11, lineHeight: 1.55, fontSize: 14 }}>
        {steps.map((step, i) => <li key={i}>{step}</li>)}
      </ol>
    </section>
  );
}

export default function SolstoneInstallationPage() {
  const [lang, setLang] = useState<Lang>("ba");
  const t = words[lang];

  return (
    <main style={{ background: "#151f2b", color: "#e5edf8", minHeight: "100dvh", padding: "26px 14px 80px", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ maxWidth: 670, margin: "0 auto" }}>
        <header style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 17 }}>
          <img src="/icon-512.png" width={54} height={54} alt="Solstone" style={{ borderRadius: 11 }} />
          <div>
            <h1 style={{ fontSize: 23, margin: 0, color: "#fff" }}>{t.title}</h1>
            <p style={{ margin: "5px 0 0", color: "#cbd5e1", fontSize: 13 }}>{t.subtitle}</p>
          </div>
        </header>
        <div role="group" aria-label="Language / Jezik" style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 17 }}>
          {(["de","ba","uz","cz","en"] as Lang[]).map(k => (
            <button type="button" key={k} onClick={() => setLang(k)} aria-pressed={lang === k}
              style={{ padding: "8px 11px", background: lang === k ? "#f97316" : "#24354a", color: lang === k ? "#151515" : "#fff", border: "1px solid #52677f", borderRadius: 9, fontWeight: 700 }}>
              {k.toUpperCase()}
            </button>
          ))}
        </div>
        <p style={{ lineHeight: 1.6, fontSize: 14, color: "#cbd5e1" }}>{t.intro}</p>
        <Panel title={t.iphone} steps={t.iphoneSteps} />
        <Panel title={t.android} steps={t.androidSteps} />
        <Panel title={t.web} steps={t.webSteps} />
        <p style={{ color: "#cbd5e1", fontSize: 12, lineHeight: 1.6 }}>{t.note}</p>
        <p style={{ color: "#fdba74", fontSize: 12, lineHeight: 1.6 }}>{t.security}</p>
        <Link href="/login" style={{ display: "block", marginTop: 19, textAlign: "center", background: "#f97316", color: "#111827", padding: "13px 12px", borderRadius: 12, fontWeight: 800, textDecoration: "none" }}>
          {t.open}
        </Link>
      </div>
    </main>
  );
}
