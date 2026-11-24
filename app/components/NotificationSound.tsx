"use client";

import { useEffect, useRef } from "react";
import { unlockNotificationAudio, playNotificationTone } from "../lib/notification-audio";
import { supabase } from "../lib/supabase";

export default function NotificationSound() {
  const startedRef = useRef(false);

  useEffect(() => {
    const unlockAudio = () => unlockNotificationAudio();
    document.addEventListener("pointerdown", unlockAudio, { passive: true });

    const oldTitle = document.title;

    function playSound() {
      if (!playNotificationTone()) return;

      document.title = "🔔 Nova informacija!";
      setTimeout(() => {
        document.title = oldTitle;
      }, 5000);
    }

    const channel = supabase
      .channel("global-app-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
        },
        () => {
          if (!startedRef.current) return;

          // Do not log potentially confidential row data.
          playSound();
        }
      )
      .subscribe((status) => {
        console.log("Notification channel:", status);

        if (status === "SUBSCRIBED") {
          setTimeout(() => {
            startedRef.current = true;
          }, 1500);
        }
      });

    return () => {
      document.removeEventListener("pointerdown", unlockAudio);
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}