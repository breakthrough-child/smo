"use client";

import { useState } from "react";
import { LOW_CONFIDENCE, type Target } from "@/lib/ai/schema";
import type { StepWithUrl } from "@/lib/guides";
import { Button } from "@/components/ui/Button";
import { TargetImage } from "./TargetImage";

export function StepCard({
  step,
  number,
  onMove,
  onText,
  onDelete,
}: {
  step: StepWithUrl;
  number: number;
  onMove: (target: Target) => void;
  onText: (text: string) => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const check = step.confidence < LOW_CONFIDENCE;
  const empty = !step.instruction.trim();
  const textId = `step-text-${step.id}`;

  return (
    <li className={`flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-sm ${check ? "ring-2 ring-coral" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-2xl">Step {number}</h2>
        {check && (
          <span className="rounded-full bg-coral-soft px-3 py-1 text-base font-bold text-accent">Please check this step</span>
        )}
      </div>

      <TargetImage url={step.url} target={step.target} alt={`Screenshot for step ${number}`} onMove={onMove} />
      <p className="text-base text-muted">Circle in the wrong place? Drag it onto the right button.</p>

      <label htmlFor={textId} className="font-bold">
        What to do
      </label>
      <textarea
        id={textId}
        rows={2}
        maxLength={200}
        value={step.instruction}
        onChange={(e) => onText(e.target.value)}
        aria-invalid={empty}
        className={`rounded-2xl border-2 bg-cream px-4 py-3 text-xl leading-snug ${empty ? "border-coral" : "border-line"}`}
      />
      {empty && <p className="text-base text-accent">Every step needs a few words.</p>}

      {confirming ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-coral-soft p-3 sm:flex-row sm:items-center">
          <p className="flex-1 font-bold">Delete step {number}?</p>
          <Button onClick={onDelete}>Yes, delete it</Button>
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            Keep it
          </Button>
        </div>
      ) : (
        <Button variant="quiet" className="self-start px-0" onClick={() => setConfirming(true)}>
          Delete this step
        </Button>
      )}
    </li>
  );
}
