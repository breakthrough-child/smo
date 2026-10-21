import { describe, expect, it } from "vitest";
import { checkGuide, replaceClick } from "@/lib/ai/validate";
import type { AiGuide, AiStep } from "@/lib/ai/schema";

// Fixture outputs that are valid in *shape* but break the *meaning* rules.
const step = (over: Partial<AiStep> = {}): AiStep => ({
  frameIndex: 1,
  instruction: "Tap the green phone button at the top",
  spokenInstruction: "Now tap the green phone button at the top.",
  target: { x: 0.8, y: 0.05, w: 0.1, h: 0.05 },
  confidence: 0.9,
  ...over,
});
const guide = (steps: AiStep[]): AiGuide => ({ title: "Join the call", steps, sensitiveWarning: false });

describe("checkGuide — hard rules (trigger the retry)", () => {
  it("passes a good guide untouched", () => {
    const r = checkGuide(guide([step()]), 5);
    expect(r.hard).toEqual([]);
    expect(r.softFixes).toEqual([]);
    expect(r.guide.steps[0]).toEqual(step());
  });

  it("rejects a frameIndex that doesn't exist", () => {
    expect(checkGuide(guide([step({ frameIndex: 5 })]), 5).hard[0]).toMatch(/frameIndex is 5.*0 to 4/);
    expect(checkGuide(guide([step({ frameIndex: -1 })]), 5).hard).toHaveLength(1);
  });

  it("rejects an empty or negative box", () => {
    expect(checkGuide(guide([step({ target: { x: 0.1, y: 0.1, w: 0, h: 0.1 } })]), 5).hard).toHaveLength(1);
  });

  it("rejects a box entirely outside the frame (e.g. pixel coordinates)", () => {
    expect(checkGuide(guide([step({ target: { x: 420, y: 80, w: 60, h: 40 } })]), 5).hard[0]).toMatch(/outside/);
  });

  it("rejects an empty instruction", () => {
    expect(checkGuide(guide([step({ instruction: "  " })]), 5).hard[0]).toMatch(/empty/);
  });

  it("reports every broken step, not just the first", () => {
    const r = checkGuide(guide([step({ frameIndex: 9 }), step({ instruction: "" })]), 5);
    expect(r.hard).toHaveLength(2);
  });
});

describe("checkGuide — soft rules (fixed and flagged, never fail)", () => {
  it("swaps click for tap, keeping capitals", () => {
    const r = checkGuide(guide([step({ instruction: "Click the blue Send button", spokenInstruction: "Then click it." })]), 5);
    expect(r.hard).toEqual([]);
    expect(r.guide.steps[0].instruction).toBe("Tap the blue Send button");
    expect(r.guide.steps[0].spokenInstruction).toBe("Then tap it.");
    expect(replaceClick("clicking, clicked, clicks")).toBe("tapping, tapped, taps");
  });

  it("keeps over-length text but drops confidence below 0.6", () => {
    const long = "Tap the small round green button with the phone icon near the very top right";
    const r = checkGuide(guide([step({ instruction: long, confidence: 0.95 })]), 5);
    expect(r.hard).toEqual([]);
    expect(r.guide.steps[0].instruction).toBe(long);
    expect(r.guide.steps[0].confidence).toBeLessThan(0.6);
  });

  it("clamps a box that pokes out of the frame", () => {
    const r = checkGuide(guide([step({ target: { x: 0.9, y: -0.02, w: 0.2, h: 0.1 } })]), 5);
    expect(r.hard).toEqual([]);
    const t = r.guide.steps[0].target;
    expect(t.x + t.w).toBeCloseTo(1);
    expect(t.y).toBe(0);
    expect(t.h).toBeCloseTo(0.08);
  });

  it("clamps confidence and sorts steps by frame", () => {
    const r = checkGuide(guide([step({ frameIndex: 3, confidence: 1.4 }), step({ frameIndex: 1 })]), 5);
    expect(r.guide.steps.map((s) => s.frameIndex)).toEqual([1, 3]);
    expect(r.guide.steps[1].confidence).toBe(1);
  });

  it("falls back to the instruction when the spoken version is empty", () => {
    const r = checkGuide(guide([step({ spokenInstruction: "" })]), 5);
    expect(r.guide.steps[0].spokenInstruction).toBe(step().instruction);
  });

  it("returns an empty guide for 'no taps found' without hard errors", () => {
    const r = checkGuide(guide([]), 5);
    expect(r.hard).toEqual([]);
    expect(r.guide.steps).toEqual([]);
  });
});
