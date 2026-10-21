import type { Target } from "@/lib/ai/schema";

// A screenshot with a coral circle around the target box (positions are 0–1 of the image).
export function TargetImage({ url, target, alt }: { url: string; target: Target; alt: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-black/5">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs, sized by the frame */}
      <img src={url} alt={alt} className="block h-auto w-full" />
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-full"
        style={{
          left: `${target.x * 100}%`,
          top: `${target.y * 100}%`,
          width: `${target.w * 100}%`,
          height: `${target.h * 100}%`,
          boxShadow: "0 0 0 3px #fff, 0 0 0 7px #ef7b5f, 0 0 0 9px #fff",
        }}
      />
    </div>
  );
}
