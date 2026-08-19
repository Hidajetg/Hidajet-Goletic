"use client";

import { useEffect, useState } from "react";
import { type AppLanguage, readAppLanguage } from "../lib/language";

const titles: Record<AppLanguage, string> = {
  de: "Arbeitsstunden",
  ba: "Radni sati",
  uz: "Ish soatlari",
  cz: "Pracovní hodiny",
  en: "Working hours",
};

export default function StundenPage() {
  const [lang, setLang] = useState<AppLanguage>("de");

  useEffect(() => {
    setLang(readAppLanguage("de"));
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <h1 className="text-5xl font-bold">{titles[lang]}</h1>
    </main>
  );
}
