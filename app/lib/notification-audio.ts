"use client";

/**
 * A short, original two-note notification signal synthesized locally.
 * No /sounds/*.mp3 asset is required; that file was not in Next.js public/.
 * Browsers and Android WebView permit audio only after a user interaction.
 * This is foreground sound, not an Android background push notification.
 */
let context: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const win = window as Window & { webkitAudioContext?: typeof AudioContext };
  const Ctor = typeof AudioContext !== "undefined" ? AudioContext : win.webkitAudioContext;
  if (!Ctor) return null;
  try {
    context ??= new Ctor();
    return context;
  } catch {
    return null;
  }
}

export function unlockNotificationAudio(): void {
  const audio = getAudioContext();
  if (audio && audio.state === "suspended") {
    void audio.resume().catch(() => {});
  }
}

export function playNotificationTone(): boolean {
  const audio = getAudioContext();
  if (!audio) return false;
  if (audio.state !== "running") {
    unlockNotificationAudio();
    return false;
  }
  try {
    const now = audio.currentTime;
    for (const note of [
      { at: 0, hz: 880, length: 0.13 },
      { at: 0.19, hz: 1174.66, length: 0.20 },
    ]) {
      const oscillator = audio.createOscillator();
      const volume = audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(note.hz, now + note.at);
      volume.gain.setValueAtTime(0.0001, now + note.at);
      volume.gain.exponentialRampToValueAtTime(0.16, now + note.at + 0.025);
      volume.gain.exponentialRampToValueAtTime(0.0001, now + note.at + note.length);
      oscillator.connect(volume);
      volume.connect(audio.destination);
      oscillator.start(now + note.at);
      oscillator.stop(now + note.at + note.length + 0.015);
    }
    return true;
  } catch {
    return false;
  }
}
