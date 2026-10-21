// Pure frame-selection logic (spec.md > Frame extraction). No DOM, so it's unit-tested.

export type Thumb = ArrayLike<number>; // grayscale values 0–1, THUMB_W × THUMB_H, row by row

export const THUMB_W = 64;
export const THUMB_H = 128;
/** Top rows ignored when comparing: the status bar's clock and recording timer tick constantly. */
export const STATUS_BAR_ROWS = Math.round(THUMB_H * 0.06);
/** A pixel counts as changed when its brightness moves more than this. */
export const PIXEL_DELTA = 0.1;
/** Frames are duplicates when less than this share of pixels changed (1% ≈ a ticked box or highlighted row is kept). */
export const DUP_THRESHOLD = 0.01;
/** Any change at least this big counts as a full screen change when choosing frames. */
export const BIG_CHANGE = 0.03;
export const MAX_FRAMES = 24;

/** Share of pixels (below the status bar) that clearly changed between two thumbnails, 0–1. */
export function changedFraction(a: Thumb, b: Thumb): number {
  let changed = 0;
  let total = 0;
  for (let i = STATUS_BAR_ROWS * THUMB_W; i < a.length; i++) {
    total++;
    if (Math.abs(a[i] - b[i]) > PIXEL_DELTA) changed++;
  }
  return total ? changed / total : 0;
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

export function isDuplicate(a: Thumb, b: Thumb, threshold = DUP_THRESHOLD): boolean {
  return changedFraction(a, b) < threshold;
}

/**
 * Drops each frame that looks the same as the last frame kept, counting on the kept
 * frame how many samples it stood for (`dwell`): a screen that stayed put scores higher.
 */
export function dropDuplicates<T extends { thumb: Thumb }>(frames: T[], threshold = DUP_THRESHOLD): (T & { dwell: number })[] {
  const kept: (T & { dwell: number })[] = [];
  for (const f of frames) {
    const last = kept[kept.length - 1];
    if (last && isDuplicate(last.thumb, f.thumb, threshold)) last.dwell++;
    else kept.push({ ...f, dwell: 1 });
  }
  return kept;
}

/**
 * Caps the frames at `max`. Always keeps the first and last; fills the rest with frames
 * just before a real screen change (any change ≥ BIG_CHANGE counts the same, so a ticked
 * box isn't outranked by a page transition), preferring screens that stayed put over
 * half-drawn, mid-animation frames. Returns frames in their original order.
 */
export function selectFrames<T extends { thumb: Thumb; dwell?: number }>(frames: T[], max = MAX_FRAMES): T[] {
  if (frames.length <= max) return frames;
  const last = frames.length - 1;
  const ranked = frames
    .slice(1, last)
    .map((f, i) => {
      const change = Math.min(changedFraction(f.thumb, frames[i + 2].thumb), BIG_CHANGE);
      return { index: i + 1, score: change * 1000 + (f.dwell ?? 1) };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, max - 2)
    .map((r) => r.index);
  const keep = new Set([0, last, ...ranked]);
  return frames.filter((_, i) => keep.has(i));
}
