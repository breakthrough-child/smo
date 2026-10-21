// The tour's voice: the browser's built-in speech (spec.md > Tour). Text-only if unavailable.

export const SPEECH_RATE = 0.9;

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function englishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.startsWith("en") && v.localService && v.default) ??
    voices.find((v) => v.lang.startsWith("en") && v.localService) ??
    voices.find((v) => v.lang.startsWith("en"))
  );
}

/** Speaks `text`, cutting off anything already playing. Call from a tap the first time (iOS). */
export function speak(text: string, onFail?: () => void): void {
  if (!speechSupported()) return onFail?.();
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = SPEECH_RATE;
  const voice = englishVoice();
  if (voice) utterance.voice = voice;
  else utterance.lang = "en-US";
  utterance.onerror = (e) => {
    if (e.error !== "interrupted" && e.error !== "canceled") onFail?.();
  };
  synth.speak(utterance);
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}
