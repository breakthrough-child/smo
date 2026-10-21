"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { Target } from "@/lib/ai/schema";

const RING = "0 0 0 3px #fff, 0 0 0 7px #ef7b5f, 0 0 0 9px #fff";
const MIN_HANDLE = 48; // px: a comfortable thumb-sized grab area around small targets
const NUDGE = 0.02;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * A screenshot with a coral circle around the target (positions are 0–1 of the image).
 * With `onMove`, the circle can be dragged (mouse or touch) or nudged with the arrow keys.
 */
export function TargetImage({
  url,
  target,
  alt,
  onMove,
}: {
  url: string;
  target: Target;
  alt: string;
  onMove?: (target: Target) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number; w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const move = (x: number, y: number) =>
    onMove?.({ ...target, x: clamp(x, 0, 1 - target.w), y: clamp(y, 0, 1 - target.h) });

  function onPointerDown(e: PointerEvent<HTMLButtonElement>) {
    if (!onMove || !frame.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = frame.current.getBoundingClientRect();
    drag.current = { px: e.clientX, py: e.clientY, x: target.x, y: target.y, w: rect.width, h: rect.height };
    setDragging(true);
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d) return;
    move(d.x + (e.clientX - d.px) / d.w, d.y + (e.clientY - d.py) / d.h);
  }

  function endDrag() {
    drag.current = null;
    setDragging(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const delta = { ArrowLeft: [-NUDGE, 0], ArrowRight: [NUDGE, 0], ArrowUp: [0, -NUDGE], ArrowDown: [0, NUDGE] }[e.key];
    if (!delta) return;
    e.preventDefault();
    move(target.x + delta[0], target.y + delta[1]);
  }

  const box = {
    left: `${target.x * 100}%`,
    top: `${target.y * 100}%`,
    width: `${target.w * 100}%`,
    height: `${target.h * 100}%`,
  };

  return (
    <div ref={frame} className="relative overflow-hidden rounded-2xl border border-line bg-black/5 select-none">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs, sized by the frame */}
      <img src={url} alt={alt} className="block h-auto w-full" draggable={false} />
      {onMove ? (
        <div className="absolute" style={box}>
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-0 rounded-full transition-transform ${dragging ? "scale-110" : ""}`}
            style={{ boxShadow: RING }}
          />
          <button
            type="button"
            aria-label="Move the circle: drag it, or use the arrow keys"
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full touch-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
            style={{ width: `max(100%, ${MIN_HANDLE}px)`, height: `max(100%, ${MIN_HANDLE}px)` }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={onKeyDown}
          />
        </div>
      ) : (
        <div aria-hidden className="pointer-events-none absolute rounded-full" style={{ ...box, boxShadow: RING }} />
      )}
    </div>
  );
}
