// Browser-only: turns a screen recording into at most 24 JPEG frames (spec.md > Frame extraction).
import { THUMB_H, THUMB_W, dropDuplicates, isNearlyBlack, selectFrames } from "./select";

export const MIN_SECONDS = 3;
export const MAX_SECONDS = 90;
export const SAMPLE_EVERY = 0.5;
export const LONG_SIDE = 1280;
export const JPEG_QUALITY = 0.8;

export class VideoUnreadableError extends Error {}
export class VideoTooShortError extends Error {}
export class VideoTooLongError extends Error {}

export type ExtractStats = {
  duration: number;
  width: number;
  height: number;
  sampled: number;
  black: number;
  duplicates: number;
  kept: number;
};

type Sample = { time: number; thumb: Float32Array; blob: Blob };

/** Call from the click handler, before any await, so iOS lets the video paint frames. */
export function createPrimedVideo(file: File): HTMLVideoElement {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.setAttribute("playsinline", "");
  video.src = URL.createObjectURL(file);
  video.play().then(() => video.pause(), () => {});
  return video;
}

export async function extractVideoFrames(
  video: HTMLVideoElement,
  onProgress?: (fraction: number) => void,
): Promise<{ frames: Blob[]; stats: ExtractStats }> {
  try {
    await waitForMetadata(video);
    const { duration, videoWidth: width, videoHeight: height } = video;
    if (duration < MIN_SECONDS) throw new VideoTooShortError();
    if (duration > MAX_SECONDS) throw new VideoTooLongError();

    const scale = Math.min(1, LONG_SIDE / Math.max(width, height));
    const canvas = Object.assign(document.createElement("canvas"), {
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    });
    const ctx = canvas.getContext("2d")!;
    const thumbCanvas = Object.assign(document.createElement("canvas"), { width: THUMB_W, height: THUMB_H });
    const thumbCtx = thumbCanvas.getContext("2d", { willReadFrequently: true })!;

    const times: number[] = [];
    for (let t = 0; t < duration; t += SAMPLE_EVERY) times.push(Math.min(t, duration - 0.05));

    const samples: Sample[] = [];
    let black = 0;
    for (const [i, time] of times.entries()) {
      await seek(video, time);
      thumbCtx.drawImage(video, 0, 0, THUMB_W, THUMB_H);
      const thumb = toGray(thumbCtx.getImageData(0, 0, THUMB_W, THUMB_H).data);
      onProgress?.((i + 1) / times.length);
      if (isNearlyBlack(thumb)) {
        black++;
        continue;
      }
      // Encode only frames that might be kept.
      const prev = samples[samples.length - 1];
      if (prev && dropDuplicates([prev, { thumb }]).length === 1) continue;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      samples.push({ time, thumb, blob: await toJpeg(canvas) });
    }

    if (!samples.length) throw new VideoUnreadableError("every frame was black");
    const chosen = selectFrames(samples);
    return {
      frames: chosen.map((s) => s.blob),
      stats: {
        duration,
        width: canvas.width,
        height: canvas.height,
        sampled: times.length,
        black,
        duplicates: times.length - black - samples.length,
        kept: chosen.length,
      },
    };
  } finally {
    URL.revokeObjectURL(video.src);
  }
}

function waitForMetadata(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = (fn: () => void) => {
      clearTimeout(timer);
      video.onloadedmetadata = video.onerror = null;
      fn();
    };
    const timer = setTimeout(() => done(() => reject(new VideoUnreadableError("no metadata"))), 10_000);
    const check = () =>
      video.videoWidth > 0 && Number.isFinite(video.duration)
        ? done(resolve)
        : done(() => reject(new VideoUnreadableError("no video track")));
    if (video.readyState >= 1) return check();
    video.onloadedmetadata = check;
    video.onerror = () => done(() => reject(new VideoUnreadableError("decode error")));
  });
}

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      video.onseeked = null;
      reject(new VideoUnreadableError("seek timed out"));
    }, 5_000);
    video.onseeked = () => {
      clearTimeout(timer);
      video.onseeked = null;
      resolve();
    };
    video.currentTime = time;
  });
}

function toGray(rgba: Uint8ClampedArray): Float32Array {
  const out = new Float32Array(rgba.length / 4);
  for (let i = 0; i < out.length; i++) {
    out[i] = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) / 255;
  }
  return out;
}

export function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("JPEG encoding failed"))), "image/jpeg", JPEG_QUALITY),
  );
}
