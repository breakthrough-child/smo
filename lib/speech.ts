// The tour's voice: the browser's built-in speech (spec.md > Tour). Text-only if unavailable.
//
// Mobile quirks handled here:
// - iOS Safari only allows speech that starts inside a tap, so the first speak() must be synchronous.
// - Chrome (Android) silently drops a speak() issued right after cancel(), so we wait a moment after cancelling.
// - Chrome can garbage-collect a queued utterance before it plays, so we keep a reference to it.
// - Speech sometimes never starts (voices still loading); a watchdog retries once.

export const SPEECH_RATE = 0.9;
const AFTER_CANCEL_MS = 80;
const WATCHDOG_MS = 1500;

let current: SpeechSynthesisUtterance | null = null;
let timers: ReturnType<typeof setTimeout>[] = [];

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

/** Starts loading voices early; Android Chrome returns an empty list on the first call. */
export function warmUpVoices(): void {
  if (!speechSupported()) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", () => window.speechSynthesis.getVoices());
}

function englishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.startsWith("en") && v.localService && v.default) ??
    voices.find((v) => v.lang.startsWith("en") && v.localService) ??
    voices.find((v) => v.lang.startsWith("en"))
  );
}

function utterance(text: string, onFail?: () => void): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(text);
  u.rate = SPEECH_RATE;
  const voice = englishVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? "en-US";
  u.onerror = (e) => {
    if (e.error !== "interrupted" && e.error !== "canceled" && current === u) onFail?.();
  };
  return u;
}

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

/** Speaks `text`, cutting off anything already playing. */
export function speak(text: string, onFail?: () => void): void {
  if (!speechSupported()) return onFail?.();
  const synth = window.speechSynthesis;
  clearTimers();

  const busy = synth.speaking || synth.pending;
  if (busy) synth.cancel();
  if (synth.paused) synth.resume();

  const first = utterance(text, onFail);
  let started = false;
  first.onstart = () => {
    started = true;
  };
  current = first;

  const say = (u: SpeechSynthesisUtterance) => {
    if (current === u) synth.speak(u);
  };
  if (busy) timers.push(setTimeout(() => say(first), AFTER_CANCEL_MS));
  else say(first); // synchronous: inside the tap, which unlocks iOS

  timers.push(
    setTimeout(() => {
      if (started || current !== first) return;
      synth.cancel();
      const retry = utterance(text, onFail);
      current = retry;
      timers.push(setTimeout(() => say(retry), AFTER_CANCEL_MS));
    }, WATCHDOG_MS),
  );
}

export function stopSpeaking(): void {
  if (!speechSupported()) return;
  clearTimers();
  current = null;
  window.speechSynthesis.cancel();
}
