"use client";

import { useEffect, useRef, useState } from "react";
import type { Target } from "@/lib/ai/schema";
import { Tooltip } from "./Tooltip";

const MIN_HIT = 56; // px, tap-target minimum (spec.md > Look and Feel)
const RING_PAD = 6; // px of breathing room between the element and the ring
const FALLBACK = { w: 585, h: 1280 }; // a typical portrait frame until the image reports its size

type Size = { w: number; h: number };

export function Spotlight({
  url,
  target,
  instruction,
  coaching,
  coachTick,
  onHit,
  onMiss,
  onImageError,
}: {
  url: string;
  target: Target;
  instruction: string;
  coaching: boolean;
  coachTick: number;
  onHit: () => void;
  onMiss: () => void;
  onImageError: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Size>({ w: 0, h: 0 });
  const [natural, setNatural] = useState<Size>(FALLBACK);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    // Measure once now (observers only fire on painted frames), then follow resizes.
    const { width, height } = el.getBoundingClientRect();
    setStage({ w: width, h: height });
    const observer = new ResizeObserver(([entry]) =>
      setStage({ w: entry.contentRect.width, h: entry.contentRect.height }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fit the screenshot inside the stage (object-contain), then place everything in stage pixels.
  const scale = stage.w ? Math.min(stage.w / natural.w, stage.h / natural.h) : 0;
  const img = { w: natural.w * scale, h: natural.h * scale };
  const imgLeft = (stage.w - img.w) / 2;
  const imgTop = (stage.h - img.h) / 2;

  const ring = {
    left: target.x * img.w - RING_PAD,
    top: target.y * img.h - RING_PAD,
    w: target.w * img.w + RING_PAD * 2,
    h: target.h * img.h + RING_PAD * 2,
  };
  const centerX = imgLeft + ring.left + ring.w / 2;
  const centerY = imgTop + ring.top + ring.h / 2;
  const hit = { w: Math.max(ring.w, MIN_HIT), h: Math.max(ring.h, MIN_HIT) };
  const round = ring.w / ring.h > 2.5 || ring.h / ring.w > 2.5 ? "rounded-2xl" : "rounded-full";

  return (
    <div ref={stageRef} className="relative min-h-0 flex-1 overflow-hidden" onClick={onMiss}>
      {scale > 0 && (
        <>
          <div className="absolute overflow-hidden" style={{ left: imgLeft, top: imgTop, width: img.w, height: img.h }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- signed URL, fitted manually */}
            <img
              src={url}
              alt=""
              className="absolute inset-0 h-full w-full select-none"
              draggable={false}
              onLoad={(e) => {
                const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                if (w && h && (w !== natural.w || h !== natural.h)) setNatural({ w, h });
              }}
              onError={onImageError}
            />
            <div
              key={coachTick}
              aria-hidden
              data-testid="spotlight"
              className={`spot-ring spot-pulse absolute ${round} ${coaching ? "spot-pulse-once" : ""}`}
              style={{ left: ring.left, top: ring.top, width: ring.w, height: ring.h }}
            />
          </div>
          <button
            type="button"
            aria-label={`Tap here: ${instruction}`}
            className="absolute rounded-full"
            style={{ left: centerX - hit.w / 2, top: centerY - hit.h / 2, width: hit.w, height: hit.h }}
            onClick={(e) => {
              e.stopPropagation();
              onHit();
            }}
          />
          <Tooltip
            stage={stage}
            anchor={{ x: centerX, top: imgTop + ring.top, bottom: imgTop + ring.top + ring.h }}
            text={instruction}
            coaching={coaching}
          />
        </>
      )}
    </div>
  );
}
