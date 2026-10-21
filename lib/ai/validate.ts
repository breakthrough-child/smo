import type { AiGuide, AiStep } from "./schema";

// Meaning rules a JSON schema can't express (spec.md > AI step builder).
// Hard problems trigger the one retry; soft ones are fixed here and flagged for review.

export type CheckResult = {
  hard: string[];
  softFixes: string[];
  guide: AiGuide;
};

const MAX_WORDS = 12;
const FLAGGED_CONFIDENCE = 0.59;

const CLICK_WORDS: Record<string, string> = {
  click: "tap",
  clicks: "taps",
  clicked: "tapped",
  clicking: "tapping",
};

export function replaceClick(text: string): string {
  return text.replace(/\bclick(s|ed|ing)?\b/gi, (word) => {
    const swap = CLICK_WORDS[word.toLowerCase()];
    return word[0] === word[0].toUpperCase() ? swap[0].toUpperCase() + swap.slice(1) : swap;
  });
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

export function checkGuide(output: AiGuide, frameCount: number): CheckResult {
  const hard: string[] = [];
  const softFixes: string[] = [];
  const steps: AiStep[] = [];

  output.steps.forEach((step, i) => {
    const where = `steps[${i}]`;
    const { x, y, w, h } = step.target;
    const hardBefore = hard.length;

    if (!Number.isInteger(step.frameIndex) || step.frameIndex < 0 || step.frameIndex >= frameCount) {
      hard.push(`${where}.frameIndex is ${step.frameIndex}, but frames are numbered 0 to ${frameCount - 1}.`);
    }
    if (!(w > 0) || !(h > 0)) {
      hard.push(`${where}.target has width ${w} and height ${h}; both must be greater than 0.`);
    } else if (x >= 1 || y >= 1 || x + w <= 0 || y + h <= 0) {
      hard.push(`${where}.target lies entirely outside the frame; x, y, w, h are fractions 0–1 of the frame.`);
    }
    if (!step.instruction.trim()) {
      hard.push(`${where}.instruction is empty.`);
    }
    if (hard.length > hardBefore) return;

    // Soft fixes.
    let target = step.target;
    const x0 = clamp01(x), y0 = clamp01(y);
    const x1 = clamp01(x + w), y1 = clamp01(y + h);
    if (x0 !== x || y0 !== y || x1 !== x + w || y1 !== y + h) {
      target = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      softFixes.push(`${where}: box clamped into the frame`);
    }

    let instruction = step.instruction.trim();
    let spoken = step.spokenInstruction.trim() || instruction;
    const swapped = replaceClick(instruction);
    const swappedSpoken = replaceClick(spoken);
    if (swapped !== instruction || swappedSpoken !== spoken) softFixes.push(`${where}: "click" changed to "tap"`);
    instruction = swapped;
    spoken = swappedSpoken;

    let confidence = clamp01(step.confidence);
    if (confidence !== step.confidence) softFixes.push(`${where}: confidence clamped`);
    if (wordCount(instruction) > MAX_WORDS) {
      confidence = Math.min(confidence, FLAGGED_CONFIDENCE);
      softFixes.push(`${where}: instruction over ${MAX_WORDS} words, flagged for review`);
    }

    steps.push({
      frameIndex: step.frameIndex,
      instruction,
      spokenInstruction: spoken,
      target,
      confidence,
    });
  });

  const sorted = [...steps].sort((a, b) => a.frameIndex - b.frameIndex);
  if (sorted.some((s, i) => s !== steps[i])) softFixes.push("steps sorted by frameIndex");

  return {
    hard,
    softFixes,
    guide: { title: output.title.trim(), sensitiveWarning: output.sensitiveWarning, steps: sorted },
  };
}
