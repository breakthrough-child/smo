// Browser-only: turns 2–15 screenshots into the same frames the video path produces (spec.md > Frame extraction).
import { JPEG_QUALITY, LONG_SIDE } from "./extract";

export const MIN_SCREENSHOTS = 2;
export const MAX_SCREENSHOTS = 15;

export class ScreenshotUnreadableError extends Error {}

/** Resizes each screenshot to at most LONG_SIDE px as JPEG, keeping the order they were picked in. */
export async function screenshotsToFrames(files: File[], onProgress?: (fraction: number) => void): Promise<Blob[]> {
  const frames: Blob[] = [];
  for (const [i, file] of files.entries()) {
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw new ScreenshotUnreadableError(file.name);
    }
    const scale = Math.min(1, LONG_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = Object.assign(document.createElement("canvas"), {
      width: Math.round(bitmap.width * scale),
      height: Math.round(bitmap.height * scale),
    });
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    frames.push(
      await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new ScreenshotUnreadableError(file.name))), "image/jpeg", JPEG_QUALITY),
      ),
    );
    onProgress?.((i + 1) / files.length);
  }
  return frames;
}
