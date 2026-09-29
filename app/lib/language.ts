export type AppLanguage = "de" | "ba" | "uz" | "cz" | "en";

export const APP_LANGUAGES: AppLanguage[] = ["de", "ba", "uz", "cz", "en"];

export function normalizeAppLanguage(value: unknown): AppLanguage {
  const lang = String(value || "").trim().toLowerCase();

  if (lang === "de" || lang === "de-de" || lang === "de-at") return "de";
  if (lang === "ba" || lang === "bs" || lang === "bs-ba" || lang === "bosanski") return "ba";
  if (lang === "uz" || lang === "uz-uz" || lang === "uzbek") return "uz";
  if (lang === "cz" || lang === "cs" || lang === "cs-cz" || lang === "czech") return "cz";
  if (lang === "en" || lang === "en-gb" || lang === "en-us" || lang === "english") return "en";

  return "de";
}

export function readAppLanguage(fallback: AppLanguage = "de"): AppLanguage {
  if (typeof window === "undefined") return fallback;

  const raw =
    localStorage.getItem("appLanguage") ||
    localStorage.getItem("lang") ||
    localStorage.getItem("language") ||
    localStorage.getItem("worker_language") ||
    localStorage.getItem("selectedLanguage");

  if (!raw) return fallback;
  return normalizeAppLanguage(raw);
}

export function saveAppLanguage(lang: AppLanguage) {
  if (typeof window === "undefined") return;

  localStorage.setItem("appLanguage", lang);
  localStorage.setItem("lang", lang);
  localStorage.setItem("language", lang);
  localStorage.setItem("worker_language", lang);
  localStorage.setItem("selectedLanguage", lang);
}

export function localeForLanguage(lang: AppLanguage) {
  if (lang === "ba") return "bs-BA";
  if (lang === "uz") return "uz-UZ";
  if (lang === "cz") return "cs-CZ";
  if (lang === "en") return "en-GB";
  return "de-AT";
}
