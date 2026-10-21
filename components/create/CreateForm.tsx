"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createPrimedVideo, extractVideoFrames } from "@/lib/frames/extract";
import { buildSteps, createDraft } from "@/lib/createGuide";
import { reviewPath } from "@/lib/editKeyClient";

type Stage = "reading" | "finding" | "writing";

const STAGE_TEXT: Record<Stage, string> = {
  reading: "Reading your video…",
  finding: "Finding the taps…",
  writing: "Writing the steps…",
};

export function CreateForm() {
  const router = useRouter();
  const [task, setTask] = useState("");
  const [video, setVideo] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const writingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(writingTimer.current), []);

  // Dev-only hook so the build can verify extraction on real recordings.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    (window as unknown as Record<string, unknown>).__smoExtract = async (file: File) =>
      (await extractVideoFrames(createPrimedVideo(file))).stats;
  }, []);

  const ready = task.trim().length > 0 && video !== null && stage === null;

  async function makeGuide() {
    if (!video) return;
    const primed = createPrimedVideo(video); // before any await, for iOS
    setError(null);
    setStage("reading");
    try {
      const { frames } = await extractVideoFrames(primed);
      const { id, editKey } = await createDraft(task.trim(), frames);
      setStage("finding");
      writingTimer.current = setTimeout(() => setStage("writing"), 12_000);
      await buildSteps(id, editKey);
      router.push(reviewPath(id, editKey));
    } catch (err) {
      clearTimeout(writingTimer.current);
      setStage(null);
      setError(err instanceof Error ? `${err.constructor.name}: ${err.message}` : "Something went wrong");
    }
  }

  if (stage) {
    return (
      <div className="rounded-3xl bg-surface p-8 text-center shadow-sm" role="status" aria-live="polite">
        <p className="font-display text-2xl">{STAGE_TEXT[stage]}</p>
        <p className="mt-3 text-muted">Please keep this page open.</p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-5 rounded-3xl bg-surface p-6 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) makeGuide();
      }}
    >
      <label className="flex flex-col gap-2">
        <span className="font-bold">What are you showing?</span>
        <input
          className="min-h-14 rounded-2xl border-2 border-line bg-cream px-4 text-xl"
          placeholder="Join the family video call on WhatsApp"
          value={task}
          maxLength={80}
          onChange={(e) => setTask(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-bold">Your screen recording</span>
        <input
          type="file"
          accept="video/*"
          className="text-base file:mr-4 file:min-h-12 file:rounded-xl file:border-0 file:bg-coral-soft file:px-4 file:font-bold file:text-ink"
          onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
        />
      </label>
      {error && <p className="rounded-2xl bg-coral-soft p-4" role="alert">{error}</p>}
      <Button type="submit" disabled={!ready}>Make my guide</Button>
    </form>
  );
}
