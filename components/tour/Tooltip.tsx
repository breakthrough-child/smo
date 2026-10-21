// The big instruction bubble: below the target when it's in the top half, above otherwise.
const GAP = 22;
const EDGE = 12;
const MAX_W = 460;

export function Tooltip({
  stage,
  anchor,
  text,
  coaching,
}: {
  stage: { w: number; h: number };
  anchor: { x: number; top: number; bottom: number };
  text: string;
  coaching: boolean;
}) {
  const width = Math.min(stage.w - EDGE * 2, MAX_W);
  const left = Math.min(Math.max(anchor.x - width / 2, EDGE), stage.w - width - EDGE);
  const below = (anchor.top + anchor.bottom) / 2 < stage.h / 2;
  const position = below
    ? { top: Math.min(anchor.bottom + GAP, stage.h - EDGE - 120) }
    : { bottom: Math.min(stage.h - anchor.top + GAP, stage.h - EDGE - 120) };

  return (
    <div
      className="fade-in pointer-events-none absolute rounded-3xl bg-white px-5 py-4 text-[#2d2622] shadow-2xl"
      style={{ left, width, ...position }}
      aria-live="polite"
    >
      <p className="text-[26px] leading-snug font-bold">{text}</p>
      {coaching && <p className="mt-2 text-[22px] font-bold text-[#b9472a]">Tap the glowing circle.</p>}
    </div>
  );
}
