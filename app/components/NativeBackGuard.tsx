"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { readAppLanguage } from "../lib/language";

const warnings = {
  ba: "Imaš nespremljene promjene. Želiš li ih odbaciti i vratiti se nazad?",
  de: "Es gibt ungespeicherte Änderungen. Verwerfen und zurückgehen?",
  en: "You have unsaved changes. Discard them and go back?",
  cz: "Máte neuložené změny. Zahodit je a vrátit se zpět?",
  uz: "Saqlanmagan o‘zgarishlar bor. Bekor qilib orqaga qaytasizmi?",
};

export function confirmUnsavedBack() {
  return window.confirm(warnings[readAppLanguage("ba")]);
}

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function editable(target: EventTarget | null): Field | null {
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return null;
  if (target.disabled || target.closest("[data-native-back-managed]")) return null;
  if (target instanceof HTMLInputElement) {
    if (target.readOnly || ["button", "submit", "reset", "hidden", "password", "search"].includes(target.type)) return null;
    if (["radio", "checkbox"].includes(target.type) && !target.closest("form")) return null;
  }
  if (target instanceof HTMLSelectElement && !target.closest("form")) return null;
  if (target instanceof HTMLTextAreaElement && target.readOnly) return null;
  return target;
}

function value(field: Field) {
  if (field instanceof HTMLInputElement) {
    if (field.type === "checkbox" || field.type === "radio") return String(field.checked);
    if (field.type === "file") return Array.from(field.files || [], f => f.name + ":" + f.size + ":" + f.lastModified).join("|");
  }
  if (field instanceof HTMLSelectElement && field.multiple) return Array.from(field.selectedOptions, o => o.value).join("|");
  return field.value;
}

/** Global conservative fallback for native Back. Explicitly managed editors
 * can supply their own exact dirty state instead of relying on DOM changes. */
export default function NativeBackGuard() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname === "/" || pathname.startsWith("/login")) return;
    const baselines = new Map<Field, string>();
    const dirty = new Set<Field>();
    const remember = (event: Event) => {
      const field = editable(event.target);
      if (field && !baselines.has(field)) baselines.set(field, value(field));
    };
    const changed = (event: Event) => {
      const field = editable(event.target);
      if (!field) return;
      if (!baselines.has(field) || baselines.get(field) !== value(field)) dirty.add(field);
      else dirty.delete(field);
    };
    const onBack = (event: Event) => {
      if (event.defaultPrevented) return;
      const dialog = Array.from(document.querySelectorAll<HTMLDialogElement>("dialog[open]")).pop();
      if (dialog) {
        const cancel = new Event("cancel", { cancelable: true });
        if (dialog.dispatchEvent(cancel)) dialog.close();
        event.preventDefault();
        return;
      }
      const hasEdits = Array.from(dirty).some(field =>
        field.isConnected && (!baselines.has(field) || baselines.get(field) !== value(field)));
      if (hasEdits && !confirmUnsavedBack()) event.preventDefault();
      // Do not clear dirty fields on a button click or failed request.
      // Successful navigation unmounts this route's tracking.
    };
    document.addEventListener("focusin", remember, true);
    document.addEventListener("pointerdown", remember, true);
    document.addEventListener("input", changed, true);
    document.addEventListener("change", changed, true);
    window.addEventListener("solstone-native-back", onBack);
    return () => {
      document.removeEventListener("focusin", remember, true);
      document.removeEventListener("pointerdown", remember, true);
      document.removeEventListener("input", changed, true);
      document.removeEventListener("change", changed, true);
      window.removeEventListener("solstone-native-back", onBack);
    };
  }, [pathname]);
  return null;
}
