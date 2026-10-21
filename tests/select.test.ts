import { describe, expect, it } from "vitest";
import {
  STATUS_BAR_ROWS,
  THUMB_H,
  THUMB_W,
  changedFraction,
  dropDuplicates,
  isNearlyBlack,
  selectFrames,
} from "@/lib/frames/select";

const N = THUMB_W * THUMB_H;
/** A flat screen, optionally with a rectangle painted a different brightness. */
function screen(base: number, patch?: { row: number; rows: number; value: number }) {
  const t = new Float32Array(N).fill(base);
  if (patch) for (let r = patch.row; r < patch.row + patch.rows; r++) t.fill(patch.value, r * THUMB_W, (r + 1) * THUMB_W);
  return t;
}
const frame = (id: number, thumb: Float32Array, dwell = 1) => ({ id, thumb, dwell });

describe("changedFraction", () => {
  it("is 0 for identical screens and ~1 for a full change", () => {
    expect(changedFraction(screen(0.5), screen(0.5))).toBe(0);
    expect(changedFraction(screen(0.1), screen(0.9))).toBe(1);
  });
  it("ignores the status bar (clock, recording timer)", () => {
    const clockTick = screen(0.5, { row: 0, rows: STATUS_BAR_ROWS, value: 1 });
    expect(changedFraction(screen(0.5), clockTick)).toBe(0);
  });
  it("ignores faint compression noise", () => {
    expect(changedFraction(screen(0.5), screen(0.55))).toBe(0);
  });
});

describe("isNearlyBlack", () => {
  it("spots black frames but not dark UI", () => {
    expect(isNearlyBlack(screen(0.01))).toBe(true);
    expect(isNearlyBlack(screen(0.02, { row: 60, rows: 2, value: 0.9 }))).toBe(false);
  });
});

describe("dropDuplicates", () => {
  it("drops identical frames and counts how long each screen stayed", () => {
    const a = screen(0.3), b = screen(0.8);
    const kept = dropDuplicates([frame(0, a), frame(1, a), frame(2, a), frame(3, b), frame(4, b)]);
    expect(kept.map((f) => [f.id, f.dwell])).toEqual([[0, 3], [3, 2]]);
  });
  it("keeps a small but real change — a highlighted row (~2% of the screen)", () => {
    const list = screen(0.9);
    const highlighted = screen(0.9, { row: 50, rows: 3, value: 0.7 });
    expect(dropDuplicates([frame(0, list), frame(1, highlighted)])).toHaveLength(2);
  });
});

describe("selectFrames", () => {
  it("returns everything when under the cap", () => {
    const frames = [frame(0, screen(0)), frame(1, screen(1))];
    expect(selectFrames(frames, 24)).toBe(frames);
  });

  it("keeps first, last and the settled screens before changes; drops mid-animation frames", () => {
    const list = screen(0.9), slideA = screen(0.6), slideB = screen(0.4), chat = screen(0.1);
    const ticked = screen(0.1, { row: 40, rows: 6, value: 0.9 }); // a small (~5%) but real change
    const frames = [
      frame(0, list, 6),
      frame(1, slideA, 1), // animation
      frame(2, slideB, 1), // animation
      frame(3, chat, 5), // settled screen before the tick
      frame(4, ticked, 4),
      frame(5, list, 3),
    ];
    expect(selectFrames(frames, 4).map((f) => f.id)).toEqual([0, 3, 4, 5]);
  });

  it("never returns more than the cap", () => {
    const frames = Array.from({ length: 60 }, (_, i) => frame(i, screen(((i * 37) % 11) / 10), (i % 5) + 1));
    const chosen = selectFrames(frames, 24);
    expect(chosen).toHaveLength(24);
    expect(chosen[0].id).toBe(0);
    expect(chosen[23].id).toBe(59);
  });
});
