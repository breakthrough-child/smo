import { describe, expect, it } from "vitest";
import { dropDuplicates, isNearlyBlack, selectFrames, thumbDiff } from "@/lib/frames/select";

const flat = (v: number, n = 16) => new Float32Array(n).fill(v);
const frame = (id: number, v: number) => ({ id, thumb: flat(v) });

describe("thumbDiff and isNearlyBlack", () => {
  it("measures mean absolute difference", () => {
    expect(thumbDiff(flat(0.2), flat(0.2))).toBe(0);
    expect(thumbDiff(flat(0), flat(0.5))).toBeCloseTo(0.5);
  });
  it("spots black frames but not dark UI", () => {
    expect(isNearlyBlack(flat(0.01))).toBe(true);
    const darkUi = flat(0.02);
    darkUi[3] = 0.9; // white text on a dark screen
    expect(isNearlyBlack(darkUi)).toBe(false);
  });
});

describe("dropDuplicates", () => {
  it("drops frames that look like the last kept one", () => {
    const frames = [frame(0, 0.5), frame(1, 0.505), frame(2, 0.51), frame(3, 0.8), frame(4, 0.8)];
    expect(dropDuplicates(frames).map((f) => f.id)).toEqual([0, 3]);
  });
  it("compares with the last kept frame, so slow drifts still register", () => {
    const frames = [0.5, 0.51, 0.525, 0.53].map((v, i) => frame(i, v));
    expect(dropDuplicates(frames).map((f) => f.id)).toEqual([0, 2]);
  });
});

describe("selectFrames", () => {
  it("returns everything when under the cap", () => {
    const frames = [frame(0, 0), frame(1, 1)];
    expect(selectFrames(frames, 24)).toBe(frames);
  });

  it("keeps first, last, and the frames just before the biggest changes, in order", () => {
    // Screen values: big jumps happen after frames 2 (0.1→0.9) and 5 (0.9→0.0).
    const values = [0.1, 0.12, 0.1, 0.9, 0.92, 0.9, 0.0, 0.02];
    const frames = values.map((v, i) => frame(i, v));
    expect(selectFrames(frames, 4).map((f) => f.id)).toEqual([0, 2, 5, 7]);
  });

  it("never returns more than the cap", () => {
    const frames = Array.from({ length: 60 }, (_, i) => frame(i, (i * 37) % 11 / 10));
    const chosen = selectFrames(frames, 24);
    expect(chosen).toHaveLength(24);
    expect(chosen[0].id).toBe(0);
    expect(chosen[23].id).toBe(59);
  });
});
