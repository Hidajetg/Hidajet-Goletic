"use client";

import { useEffect, useRef } from "react";
import { unlockNotificationAudio, playNotificationTone } from "../lib/notification-audio";
import { readAppLanguage, type AppLanguage } from "../lib/language";

type RoomSignal = {
  id: string; lastMessageId: string | null;
  lastSender: string | null; unread: number;
};

const VOICE_MESSAGES: Record<AppLanguage,string> = {
  de:"Neue Nachricht von",ba:"Nova poruka od",uz:"Yangi xabar",
  cz:"Nová zpráva od",en:"New message from",
};
const LOCALES: Record<AppLanguage,string> = {
  de:"de-DE",ba:"bs-BA",uz:"uz-UZ",cz:"cs-CZ",en:"en-GB",
};

/**
 * Notifications while the web app/WebView is running.
 * Never subscribe to public Realtime rows or trust a client-supplied worker ID.
 * The server returns only authorized rooms for the signed PIN cookie.
 */
export default function TeamChatAlerts() {
  const previous = useRef(new Map<string,string>());
  const initialized = useRef(false);

  useEffect(() => {
    let active = true;
    const unlock = () => unlockNotificationAudio();
    document.addEventListener("pointerdown",unlock,{passive:true});

    const announce = (sender: string) => {
      const lang = readAppLanguage("de");
      const phrase = lang === "uz"
        ? sender + ": " + VOICE_MESSAGES.uz
        : VOICE_MESSAGES[lang] + " " + sender;
      if (localStorage.getItem("solstone_chat_sound") !== "false") playNotificationTone();
      if (localStorage.getItem("solstone_chat_voice") === "true" &&
          typeof window.speechSynthesis !== "undefined") {
        const utterance = new SpeechSynthesisUtterance(phrase);
        utterance.lang = LOCALES[lang];
        utterance.rate = 0.95;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
      const oldTitle = document.title;
      document.title = "🔔 Solstone Team Chat";
      setTimeout(() => {
        if (document.title === "🔔 Solstone Team Chat") document.title = oldTitle;
      },5000);
    };

    const poll = async () => {
      if (document.visibilityState !== "visible" ||
          window.location.pathname === "/login" ||
          window.location.pathname === "/login-secure") return;
      try {
        const result = await fetch("/api/team-chat",{
          credentials:"include",cache:"no-store",
        });
        if (!result.ok || !active) return;
        const payload = await result.json();
        const rooms: RoomSignal[] = Array.isArray(payload.rooms) ? payload.rooms : [];
        let newlyArrived: RoomSignal | null = null;

        for (const room of rooms) {
          const old = previous.current.get(room.id);
          if (initialized.current &&
              room.lastMessageId && old !== room.lastMessageId &&
              room.unread > 0 && !newlyArrived) {
            newlyArrived = room;
          }
          previous.current.set(room.id,room.lastMessageId ?? "");
        }
        // Older in-memory rooms are no longer visible after schedule changes.
        const allowed = new Set(rooms.map((room)=>room.id));
        for (const id of previous.current.keys()) {
          if (!allowed.has(id)) previous.current.delete(id);
        }
        initialized.current = true;
        window.dispatchEvent(new CustomEvent("solstone-chat-unread",{
          detail:Number(payload.unread) || 0,
        }));
        if (newlyArrived) announce(newlyArrived.lastSender ?? "Solstone");
      } catch {
        // Chat is not enabled on production yet; do not interrupt existing app.
      }
    };

    const onVisibility = () => { if (active && document.visibilityState === "visible") void poll(); };
    document.addEventListener("visibilitychange",onVisibility);
    void poll();
    const interval = setInterval(() => { if (active) void poll(); },20000);
    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange",onVisibility);
      document.removeEventListener("pointerdown",unlock);
      window.speechSynthesis?.cancel();
    };
  },[]);
  return null;
}
