"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  VideoTooLongError,
  VideoTooShortError,
  VideoUnreadableError,
  createPrimedVideo,
  extractVideoFrames,
} from "@/lib/frames/extract";
import {
  MAX_SCREENSHOTS,
  MIN_SCREENSHOTS,
  ScreenshotUnreadableError,
  screenshotsToFrames,
} from "@/lib/frames/screenshots";
import { CreateError, buildSteps, createDraft, type Draft } from "@/lib/createGuide";
import { reviewPath } from "@/lib/editKeyClient";
import { BuildProgress, CreateErrorScreen, type CreateFailure, type Progress } from "./BuildProgress";

const WRITING_AFTER_MS = 12_000;

type Mode = "video" | "screenshots";
type Phase = { name: "form" } | { name: "working"; progress: Progress } | { name: "failed"; failure: CreateFailure };

function toFailure(err: unknown): CreateFailure {
  if (err instanceof VideoTooShortError) return "too_short";
  if (err instanceof VideoTooLongError) return "too_long";
  if (err instanceof VideoUnreadableError) return "unreadable";
  if (err instanceof ScreenshotUnreadableError) return "bad_screenshot";
  if (err instanceof CreateError) return err.code;
  return "server_error";
}

export function CreateForm() {
  const router = useRouter();
  const [task, setTask] = useState("");
  const [mode, setMode] = useState<Mode>("video");
  const [video, setVideo] = useState<File | null>(null);
  const [shots, setShots] = useState<File[]>([]);
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

  // Thumbnail previews of the screenshots, in the order they'll be used.
  const previews = useMemo(() => shots.map((f) => URL.createObjectURL(f)), [shots]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  const shotsProblem =
    mode === "screenshots" && shots.length > 0 && (shots.length < MIN_SCREENSHOTS || shots.length > MAX_SCREENSHOTS)
      ? shots.length < MIN_SCREENSHOTS
        ? `Please choose at least ${MIN_SCREENSHOTS} screenshots — one for each screen.`
        : `That's ${shots.length} screenshots. Please choose ${MAX_SCREENSHOTS} or fewer.`
      : null;
  const hasInput = mode === "video" ? video !== null : shots.length >= MIN_SCREENSHOTS && !shotsProblem;
  const ready = task.trim().length > 0 && hasInput;

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
    const primed = mode === "video" && video ? createPrimedVideo(video) : null; // before any await, for iOS
    draft.current = null;
    const screenshots = mode === "screenshots";
    setProgress({ stage: "reading", fraction: 0, screenshots });
    try {
      const onRead = (fraction: number) => setProgress({ stage: "reading", fraction, screenshots });
      const frames = primed ? (await extractVideoFrames(primed, onRead)).frames : await screenshotsToFrames(shots, onRead);
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

  function backToForm(nextMode: Mode) {
    // Opening the picker programmatically isn't allowed outside a direct tap on iOS, so just reset the input.
    setMode(nextMode);
    setVideo(null);
    setShots([]);
    setPhase({ name: "form" });
  }

  if (phase.name === "working") return <BuildProgress progress={phase.progress} />;

  if (phase.name === "failed") {
    const f = phase.failure;
    const videoProblem = f === "too_short" || f === "too_long" || f === "unreadable";
    return (
      <CreateErrorScreen
        failure={f}
        onTryAgain={f === "ai_failed" || f === "server_error" ? tryBuildAgain : f === "no_steps" ? () => backToForm(mode) : undefined}
        onChooseVideo={videoProblem ? () => backToForm("video") : f === "bad_screenshot" ? () => backToForm("screenshots") : undefined}
        chooseLabel={f === "bad_screenshot" ? "Choose screenshots again" : undefined}
        onUseScreenshots={videoProblem || (f === "no_steps" && mode === "video") ? () => backToForm("screenshots") : undefined}
      />
    );
  }

  return (
    <form
      id="make"
      className="flex scroll-mt-6 flex-col gap-5 rounded-3xl bg-surface p-6 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) makeGuide();
      }}
    >
      <label className="flex flex-col gap-2">
        <span className="text-lg font-bold">What are you showing?</span>
        <input
          className="min-h-14 rounded-2xl border-2 border-line bg-cream px-4 text-xl"
          placeholder="Join the family video call on WhatsApp"
          value={task}
          maxLength={80}
          onChange={(e) => setTask(e.target.value)}
        />
      </label>

      {mode === "video" ? (
        <label className="flex flex-col gap-2">
          <span className="text-lg font-bold">Your screen recording</span>
          <span className="text-base text-muted">Use your phone&apos;s built-in screen recorder. 3 to 90 seconds.</span>
          <input
            key="video"
            type="file"
            accept="video/*"
            className="text-base file:mr-4 file:min-h-12 file:rounded-xl file:border-0 file:bg-coral-soft file:px-4 file:font-bold file:text-ink"
            onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
          />
        </label>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-2">
            <span className="text-lg font-bold">Your screenshots</span>
            <span className="text-base text-muted">
              One for each screen, {MIN_SCREENSHOTS} to {MAX_SCREENSHOTS}. Pick them in order — first screen first.
            </span>
            <input
              key="screenshots"
              type="file"
              accept="image/*"
              multiple
              className="text-base file:mr-4 file:min-h-12 file:rounded-xl file:border-0 file:bg-coral-soft file:px-4 file:font-bold file:text-ink"
              onChange={(e) => setShots(Array.from(e.target.files ?? []))}
            />
          </label>
          {previews.length > 0 && (
            <ol className="mt-1 flex gap-2 overflow-x-auto pb-2" aria-label="Screenshot order">
              {previews.map((src, i) => (
                <li key={src} className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local previews */}
                  <img src={src} alt={`Screenshot ${i + 1}`} className="h-28 w-auto rounded-xl border border-line" />
                  <span className="absolute top-1 left-1 grid h-7 min-w-7 place-items-center rounded-full bg-coral-deep px-2 text-sm font-bold text-white">
                    {i + 1}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {shotsProblem && (
            <p className="text-base text-accent" role="alert">
              {shotsProblem}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        className="self-start text-base font-bold text-accent underline underline-offset-4"
        onClick={() => backToForm(mode === "video" ? "screenshots" : "video")}
      >
        {mode === "video" ? "Use screenshots instead" : "Use a screen recording instead"}
      </button>

      <p className="rounded-2xl bg-cream p-4 text-base text-muted">
        🔒 Please don&apos;t record passwords, PINs or bank balances.
      </p>
      <Button type="submit" disabled={!ready}>
        Make my guide
      </Button>
    </form>
  );
}
