import { Button } from "@/components/ui/Button";

export type Progress =
  | { stage: "reading"; fraction: number }
  | { stage: "uploading"; done: number; total: number }
  | { stage: "finding" }
  | { stage: "writing" };

export type CreateFailure = "too_short" | "too_long" | "unreadable" | "ai_failed" | "no_steps" | "server_error";

const STAGES = ["reading", "uploading", "finding", "writing"] as const;

function stageText(p: Progress): string {
  switch (p.stage) {
    case "reading":
      return "Reading your video…";
    case "uploading":
      return p.total ? `Uploading ${Math.max(p.done, 1)} of ${p.total}…` : "Uploading…";
    case "finding":
      return "Finding the taps…";
    case "writing":
      return "Writing the steps…";
  }
}

export function BuildProgress({ progress }: { progress: Progress }) {
  const index = STAGES.indexOf(progress.stage);
  const fraction =
    progress.stage === "reading" ? progress.fraction : progress.stage === "uploading" && progress.total ? progress.done / progress.total : 0;
  return (
    <div className="fade-in flex flex-col items-center gap-6 rounded-3xl bg-surface p-8 text-center shadow-sm" role="status" aria-live="polite">
      <div aria-hidden className="flex gap-2">
        {STAGES.map((s, i) => (
          <span key={s} className={`h-3 w-10 rounded-full ${i <= index ? "bg-coral" : "bg-line"}`} />
        ))}
      </div>
      <p className="font-display text-2xl">{stageText(progress)}</p>
      {(progress.stage === "reading" || progress.stage === "uploading") && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-line" aria-hidden>
          <div className="h-full rounded-full bg-coral transition-[width]" style={{ width: `${Math.round(fraction * 100)}%` }} />
        </div>
      )}
      <p className="text-muted">Please keep this page open.</p>
    </div>
  );
}

const MESSAGES: Record<CreateFailure, { title: string; body: string }> = {
  too_short: {
    title: "That recording is too short",
    body: "That recording is too short — try recording the whole task.",
  },
  too_long: {
    title: "Shorter is clearer!",
    body: "Shorter is clearer! Record just this one task, under 90 seconds.",
  },
  unreadable: {
    title: "This video won't open in your browser",
    body: "No problem — take screenshots of each step and upload those instead.",
  },
  ai_failed: {
    title: "Something went wrong building your guide",
    body: "Your recording is saved, so you don't need to pick it again. Let's give it another go.",
  },
  no_steps: {
    title: "I couldn't spot any taps in this one",
    body: "Try recording again a little more slowly, pausing for a second on each screen before you tap — or upload screenshots of each step instead.",
  },
  server_error: {
    title: "We couldn't save your guide",
    body: "It might be the connection. Check you're online, then try again.",
  },
};

export function CreateErrorScreen({
  failure,
  onTryAgain,
  onChooseVideo,
  onUseScreenshots,
}: {
  failure: CreateFailure;
  onTryAgain?: () => void;
  onChooseVideo?: () => void;
  onUseScreenshots?: () => void;
}) {
  const { title, body } = MESSAGES[failure];
  return (
    <div className="fade-in flex flex-col gap-5 rounded-3xl bg-surface p-7 shadow-sm" role="alert">
      <h2 className="text-2xl">{title}</h2>
      <p className="text-lg">{body}</p>
      {failure === "unreadable" && (
        <p className="rounded-2xl bg-coral-soft p-4 text-base">
          <strong>On an iPhone?</strong> Go to <strong>Settings → Camera → Formats</strong>, choose{" "}
          <strong>Most Compatible</strong>, then record again. Or use screenshots.
        </p>
      )}
      <div className="flex flex-col gap-3">
        {onTryAgain && <Button onClick={onTryAgain}>Try again</Button>}
        {onChooseVideo && (
          <Button variant={onTryAgain ? "secondary" : "primary"} onClick={onChooseVideo}>
            Choose another video
          </Button>
        )}
        {onUseScreenshots && (
          <Button variant="secondary" onClick={onUseScreenshots}>
            Use screenshots instead
          </Button>
        )}
      </div>
    </div>
  );
}
