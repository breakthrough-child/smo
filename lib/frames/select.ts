// Pure frame-selection logic (spec.md > Frame extraction). No DOM, so it's unit-tested.

export type Thumb = ArrayLike<number>; // grayscale values 0–1, same length for every frame

export const THUMB_W = 32;
export const THUMB_H = 64;
export const DUP_THRESHOLD = 0.02;
export const MAX_FRAMES = 24;

/** Mean absolute difference between two thumbnails, 0 (identical) to 1. */
export function thumbDiff(a: Thumb, b: Thumb): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

/** Almost entirely black — e.g. an unpainted iOS Safari frame. */
export function isNearlyBlack(t: Thumb): boolean {
  let sum = 0;
  let max = 0;
  for (let i = 0; i < t.length; i++) {
    sum += t[i];
    if (t[i] > max) max = t[i];
  }
  return sum / t.length < 0.03 && max < 0.12;
}

/** Drops each frame that looks the same as the last frame kept. */
export function dropDuplicates<T extends { thumb: Thumb }>(frames: T[], threshold = DUP_THRESHOLD): T[] {
  const kept: T[] = [];
  for (const f of frames) {
    const last = kept[kept.length - 1];
    if (!last || thumbDiff(last.thumb, f.thumb) >= threshold) kept.push(f);
  }
  return kept;
}

/**
 * Caps the frames at `max`. Always keeps the first and last; fills the rest with
 * the frames just before the largest screen changes (where taps happen).
 * Returns frames in their original order.
 */
export function selectFrames<T extends { thumb: Thumb }>(frames: T[], max = MAX_FRAMES): T[] {
  if (frames.length <= max) return frames;
  const last = frames.length - 1;
  const ranked = frames
    .slice(1, last)
    .map((f, i) => ({ index: i + 1, change: thumbDiff(f.thumb, frames[i + 2].thumb) }))
    .sort((a, b) => b.change - a.change || a.index - b.index)
    .slice(0, max - 2)
    .map((r) => r.index);
  const keep = new Set([0, last, ...ranked]);
  return frames.filter((_, i) => keep.has(i));
}
