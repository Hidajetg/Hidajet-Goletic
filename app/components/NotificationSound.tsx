"use client";

import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { playNotificationTone, unlockNotificationTone } from "../lib/notification-tone";

/**
 * Foreground info alerts only. Never listen to all public-table INSERTs:
 * those events are unrelated to this worker and can produce false alarms.
 */
export default function NotificationSound() {
  useEffect(() => {
    let active = true;
    let subscribed = false;
    let readyTimer: ReturnType<typeof setTimeout> | undefined;
    const unlock = () => { void unlockNotificationTone(); };
    document.addEventListener("pointerdown", unlock, { passive: true });

    const channel = supabase
      .channel("solstone-info-notifications")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "info_messages",
      }, (payload) => {
        if (!active || !subscribed || document.visibilityState !== "visible") return;
        const info = payload.new as Record<string, unknown>;
        const workerId = window.localStorage.getItem("worker_id");
        if (!workerId) return;
        // The event is only a hint to play a chime, not authorization to show data.
        const addressedToWorker =
          info.visible_to_all === true ||
          String(info.target_worker_id ?? "") === workerId;
        if (!addressedToWorker || String(info.sender_id ?? "") === workerId) return;
        if (window.localStorage.getItem("solstone_chat_sound") === "false") return;
        playNotificationTone();
      })
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        if (readyTimer) clearTimeout(readyTimer);
        readyTimer = setTimeout(() => { subscribed = true; }, 1500);
      });

    return () => {
      active = false;
      if (readyTimer) clearTimeout(readyTimer);
      document.removeEventListener("pointerdown", unlock);
      void supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
