"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import WorkerAiChat from "../components/WorkerAiChat";
import { type AppLanguage, readAppLanguage } from "../lib/language";

const backLabels: Record<AppLanguage, string> = {
  de: "Zurück zum Dashboard", ba: "Nazad na početnu",
  uz: "Bosh sahifaga qaytish", cz: "Zpět na hlavní stránku",
  en: "Back to dashboard",
};

export default function SolstoneAssistantPage() {
  const [lang, setLang] = useState<AppLanguage>("de");
  useEffect(() => {
    const update = () => setLang(readAppLanguage("de"));
    update();
    window.addEventListener("solstone-language-change", update);
    return () => window.removeEventListener("solstone-language-change", update);
  }, []);

  return (
    <main style={{ minHeight: "100dvh", background: "#101722", color: "#edf4ff",
      padding: "18px 12px 26px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <nav style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/dashboard" style={{ textDecoration: "none", color: "#fdba74",
            padding: "7px 2px", fontWeight: 650 }}>← {backLabels[lang]}</Link>
        </nav>
        <WorkerAiChat mode="page" />
      </div>
    </main>
  );
}
