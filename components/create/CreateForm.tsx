"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  VideoTooLongError,
  VideoTooShortError,
  VideoUnreadableError,
  createPrimedVideo,
  extractVideoFrames,
} from "@/lib/frames/extract";
import { CreateError, buildSteps, createDraft, type Draft } from "@/lib/createGuide";
import { reviewPath } from "@/lib/editKeyClient";
import { BuildProgress, CreateErrorScreen, type CreateFailure, type Progress } from "./BuildProgress";

const WRITING_AFTER_MS = 12_000;

type Phase = { name: "form" } | { name: "working"; progress: Progress } | { name: "failed"; failure: CreateFailure };

function toFailure(err: unknown): CreateFailure {
  if (err instanceof VideoTooShortError) return "too_short";
  if (err instanceof VideoTooLongError) return "too_long";
  if (err instanceof VideoUnreadableError) return "unreadable";
  if (err instanceof CreateError) return err.code;
  return "server_error";
}

export function CreateForm() {
  const router = useRouter();
  const [task, setTask] = useState("");
  const [video, setVideo] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>({ name: "form" });
  const draft = useRef<Draft | null>(null); // kept so "Try again" re-runs only the build
  const writingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(writingTimer.current), []);

  // Dev-only hook so the build can verify extraction on real recordings.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    (window as unknown as Record<string, unknown>).__smoExtract = async (file: File) =>
      (await extractVideoFrames(createPrimedVideo(file))).stats;
  }, []);

  const ready = task.trim().length > 0 && video !== null;
  const setProgress = (progress: Progress) => setPhase({ name: "working", progress });

  async function build(d: Draft) {
    setProgress({ stage: "finding" });
    clearTimeout(writingTimer.current);
    writingTimer.current = setTimeout(() => setProgress({ stage: "writing" }), WRITING_AFTER_MS);
    await buildSteps(d);
    clearTimeout(writingTimer.current);
    router.push(reviewPath(d.id, d.editKey));
  }

  async function makeGuide() {
    if (!video) return;
    const primed = createPrimedVideo(video); // before any await, for iOS
    draft.current = null;
    setProgress({ stage: "reading", fraction: 0 });
    try {
      const { frames } = await extractVideoFrames(primed, (fraction) => setProgress({ stage: "reading", fraction }));
      draft.current = await createDraft(task.trim(), frames, (done, total) =>
        setProgress({ stage: "uploading", done, total }),
      );
      await build(draft.current);
    } catch (err) {
      fail(err);
    }
  }

  async function tryBuildAgain() {
    if (!draft.current) return makeGuide();
    try {
      await build(draft.current);
    } catch (err) {
      fail(err);
    }
  }

  function fail(err: unknown) {
    clearTimeout(writingTimer.current);
    console.warn("[create] failed", err);
    setPhase({ name: "failed", failure: toFailure(err) });
  }

  function chooseAnotherVideo() {
    // Opening the picker programmatically isn't allowed outside a direct tap on iOS, so just reset the form.
    setVideo(null);
    setPhase({ name: "form" });
  }

  if (phase.name === "working") return <BuildProgress progress={phase.progress} />;

  if (phase.name === "failed") {
    const f = phase.failure;
    const videoProblem = f === "too_short" || f === "too_long" || f === "unreadable";
    return (
      <CreateErrorScreen
        failure={f}
        onTryAgain={f === "ai_failed" || f === "server_error" ? tryBuildAgain : f === "no_steps" ? chooseAnotherVideo : undefined}
        onChooseVideo={videoProblem ? chooseAnotherVideo : undefined}
      />
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
      <p className="rounded-2xl bg-cream p-4 text-base text-muted">
        🔒 Please don&apos;t record passwords, PINs or bank balances.
      </p>
      <Button type="submit" disabled={!ready}>
        Make my guide
      </Button>
    </form>
  );
}
