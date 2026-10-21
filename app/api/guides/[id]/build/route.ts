import { randomUUID } from "node:crypto";
import { buildGuide } from "@/lib/ai/buildGuide";
import type { Step } from "@/lib/ai/schema";
import { frameKey, removeGuideFiles, requireEditor } from "@/lib/guides";
import { BUCKET, supabaseAdmin } from "@/lib/supabase/server";

// Confirmed within every Vercel plan with Fluid Compute (spec.md > Where It Runs).
export const maxDuration = 120;

export async function POST(request: Request, ctx: RouteContext<"/api/guides/[id]/build">) {
  const { id } = await ctx.params;
  const check = await requireEditor(request, id);
  if (!check.ok) return check.response;
  const { guide } = check;

  // One successful build per guide: never pay twice for the same frames.
  if (guide.steps.length) return Response.json({ ok: true });

  const storage = supabaseAdmin().storage.from(BUCKET);
  let frames: string[];
  try {
    frames = await Promise.all(
      Array.from({ length: guide.frame_count }, async (_, n) => {
        const { data, error } = await storage.download(frameKey(id, n));
        if (error || !data) throw new Error(`frame ${n}: ${error?.message}`);
        return Buffer.from(await data.arrayBuffer()).toString("base64");
      }),
    );
  } catch (err) {
    console.error("[build] frames missing", (err as Error).message);
    return Response.json({ error: "frames_missing" }, { status: 409 });
  }

  const result = await buildGuide(frames, guide.title);
  console.info("[build] result", { id, ok: result.ok, attempts: result.attempts, error: result.ok ? undefined : result.error });
  if (!result.ok) return Response.json({ error: result.error }, { status: result.error === "no_steps" ? 422 : 502 });

  const steps: Step[] = result.guide.steps.map((s) => ({
    id: randomUUID(),
    imagePath: frameKey(id, s.frameIndex),
    instruction: s.instruction,
    spokenInstruction: s.spokenInstruction,
    target: s.target,
    confidence: s.confidence,
  }));

  const { error } = await supabaseAdmin()
    .from("guides")
    .update({ steps, title: result.guide.title || guide.title, sensitive_warning: result.guide.sensitiveWarning })
    .eq("id", id);
  if (error) {
    console.error("[build] save failed", error.message);
    return Response.json({ error: "server_error" }, { status: 500 });
  }

  // Frames no step uses don't need to stay online.
  await removeGuideFiles(id, [...new Set(steps.map((s) => s.imagePath))]).catch((err: Error) =>
    console.warn("[build] cleanup failed", err.message),
  );

  return Response.json({ ok: true });
}
