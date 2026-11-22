/**
 * Short original chime generated locally with Web Audio.
 * Unlike the previous /sounds/notification.mp3 reference, this does not
 * depend on an asset that is absent from the repository.
 * Mobile browsers require an initial user gesture to unlock the AudioContext.
 */
let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const BrowserAudioContext =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!BrowserAudioContext) return null;
  if (!context || context.state === "closed") {
    context = new BrowserAudioContext();
  }
  return context;
}

export async function unlockNotificationTone(): Promise<boolean> {
  try {
    const audio = audioContext();
    if (!audio) return false;
    if (audio.state !== "running") await audio.resume();
    return audio.state === "running";
  } catch {
    return false;
  }
}

export function playNotificationTone(): boolean {
  const audio = context;
  if (!audio || audio.state !== "running") return false;
  try {
    const start = audio.currentTime + 0.005;
    for (const [i, frequency] of [784, 1047].entries()) {
      const time = start + i * 0.155;
      const oscillator = audio.createOscillator();
      const volume = audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, time);
      volume.gain.setValueAtTime(0.001, time);
      volume.gain.exponentialRampToValueAtTime(0.14, time + 0.02);
      volume.gain.exponentialRampToValueAtTime(0.001, time + 0.23);
      oscillator.connect(volume);
      volume.connect(audio.destination);
      oscillator.start(time);
      oscillator.stop(time + 0.24);
    }
    return true;
  } catch {
    return false;
  }
}
