"use client";

import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

export default function NotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioEnabledRef = useRef(false);
  const startedRef = useRef(false);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/notification.mp3");
    audioRef.current.volume = 1;

    function unlockAudio() {
      if (!audioRef.current) return;

      audioRef.current
        .play()
        .then(() => {
          audioRef.current?.pause();
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
          }
          audioEnabledRef.current = true;
        })
        .catch(() => {});
    }

    document.addEventListener("click", unlockAudio, { once: true });
    document.addEventListener("touchstart", unlockAudio, { once: true });

    const oldTitle = document.title;

    function playSound() {
      if (!audioRef.current) return;
      if (!audioEnabledRef.current) return;

      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});

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
        (payload) => {
          if (!startedRef.current) return;

          console.log("Nova informacija:", payload.table, payload.new);
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
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}