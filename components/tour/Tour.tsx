"use client";

import { useEffect, useRef, useState } from "react";
import type { Target } from "@/lib/ai/schema";
import { speak, speechSupported, stopSpeaking, warmUpVoices } from "@/lib/speech";
import { Spotlight } from "./Spotlight";

export type TourStep = { id: string; url: string; instruction: string; spokenInstruction: string; target: Target };

type Screen = "start" | number | "done";

const COACH_MS = 2000;
const REFRESH_EVERY_MS = 60_000;

export function Tour({ guideId, title, steps: initialSteps }: { guideId: string; title: string; steps: TourStep[] }) {
  const [steps, setSteps] = useState(initialSteps);
  const [screen, setScreen] = useState<Screen>("start");
  const [voice, setVoice] = useState(true);
  const [coaching, setCoaching] = useState(false);
  const [coachTick, setCoachTick] = useState(0); // restarts the one-off pulse on every miss
  const coachTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastRefresh = useRef(0);

  useEffect(() => {
    // Feature detection has to wait for the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!speechSupported()) setVoice(false);
    else warmUpVoices();
    return () => {
      clearTimeout(coachTimer.current);
      stopSpeaking();
    };
  }, []);

  // Every move happens inside a tap (Start, Next, Back, the circle), so speech stays unlocked on iOS;
  // speak() cancels whatever is still playing first.
  function goTo(next: Screen) {
    clearTimeout(coachTimer.current);
    setCoaching(false);
    setScreen(next);
    if (typeof next === "number" && voice) speak(steps[next].spokenInstruction, () => setVoice(false));
    else stopSpeaking();
  }

  function start() {
    steps.forEach((s) => {
      new Image().src = s.url;
    });
    goTo(0);
  }

  function next() {
    if (typeof screen !== "number") return;
    goTo(screen + 1 < steps.length ? screen + 1 : "done");
  }

  function coach() {
    clearTimeout(coachTimer.current);
    setCoaching(true);
    setCoachTick((t) => t + 1);
    coachTimer.current = setTimeout(() => setCoaching(false), COACH_MS);
  }

  // Signed links last an hour; if one has expired on an open tour, fetch fresh ones.
  async function refreshImages() {
    if (Date.now() - lastRefresh.current < REFRESH_EVERY_MS) return;
    lastRefresh.current = Date.now();
    const res = await fetch(`/api/guides/${guideId}/images`).catch(() => null);
    if (!res?.ok) return;
    const { urls } = (await res.json()) as { urls: Record<string, string> };
    setSteps((current) => current.map((s) => ({ ...s, url: urls[s.id] ?? s.url })));
  }

  if (screen === "start") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-8 px-6 py-10 text-center">
        <p className="font-display text-2xl text-accent">A guide made just for you</p>
        <h1 className="text-[40px] leading-tight">{title}</h1>
        <p className="text-[22px] text-muted">
          {steps.length} easy steps. {voice ? "Turn your sound up — I'll read each one out loud." : "Take your time."}
        </p>
        <button
          type="button"
          onClick={start}
          className="min-h-24 w-full rounded-3xl bg-coral-deep text-[34px] font-bold text-white shadow-lg shadow-coral-deep/25"
        >
          Start
        </button>
      </main>
    );
  }

  if (screen === "done") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-8 px-6 py-10 text-center">
        <div aria-hidden className="grid h-28 w-28 place-items-center rounded-full bg-sage-soft text-6xl text-sage">✓</div>
        <h1 className="text-[44px] text-sage">You did it!</h1>
        <p className="text-[22px] text-muted">You can come back to this guide any time.</p>
        <button
          type="button"
          onClick={() => goTo(0)}
          className="min-h-16 w-full rounded-3xl border-2 border-line bg-surface text-[24px] font-bold"
        >
          Start again
        </button>
      </main>
    );
  }

  const step = steps[screen];
  return (
    <main className="fixed inset-0 flex flex-col bg-[#1c1714] text-white">
      <div className="px-4 pt-3 pb-2">
        <p className="text-[20px] font-bold" aria-live="polite">
          Step {screen + 1} of {steps.length}
        </p>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/20" aria-hidden>
          <div className="h-full rounded-full bg-coral transition-[width]" style={{ width: `${((screen + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      <Spotlight
        key={step.id}
        url={step.url}
        target={step.target}
        instruction={step.instruction}
        coaching={coaching}
        coachTick={coachTick}
        onHit={next}
        onMiss={coach}
        onImageError={refreshImages}
      />

      <div className="flex flex-col gap-3 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {voice && (
          <button
            type="button"
            onClick={() => speak(step.spokenInstruction, () => setVoice(false))}
            className="min-h-14 rounded-2xl text-[22px] font-bold text-white underline decoration-coral underline-offset-4"
          >
            🔊 Hear again
          </button>
        )}
        <div className="flex gap-3">
          {screen > 0 && (
            <button
              type="button"
              onClick={() => goTo(screen - 1)}
              className="min-h-16 flex-1 rounded-2xl bg-white text-[22px] font-bold text-[#2d2622]"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={next}
            className="min-h-16 flex-[2] rounded-2xl bg-coral-deep text-[22px] font-bold text-white"
          >
            Got it, next
          </button>
        </div>
      </div>
    </main>
  );
}
