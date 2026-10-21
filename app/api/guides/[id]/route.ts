import { z } from "zod";
import { StepSchema } from "@/lib/ai/schema";
import { removeGuideFiles, requireEditor, toPublicGuide } from "@/lib/guides";
import { supabaseAdmin } from "@/lib/supabase/server";

// The full guide for the review screen (edit key required).
export async function GET(request: Request, ctx: RouteContext<"/api/guides/[id]">) {
  const { id } = await ctx.params;
  const check = await requireEditor(request, id);
  if (!check.ok) return check.response;
  return Response.json(await toPublicGuide(check.guide));
}

const SaveBody = z.object({
  steps: z.array(StepSchema).min(1).max(30),
  publish: z.boolean().optional(),
});

// Saves reviewed steps; `publish: true` makes the tour live. Edits to a published guide go live too.
export async function PUT(request: Request, ctx: RouteContext<"/api/guides/[id]">) {
  const { id } = await ctx.params;
  const check = await requireEditor(request, id);
  if (!check.ok) return check.response;
  const { guide } = check;

  const body = SaveBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "bad_request", issues: body.error.issues.length }, { status: 400 });

  // Review can only keep, edit or remove existing steps — never point at other images.
  const known = new Map(guide.steps.map((s) => [s.id, s.imagePath]));
  const forged = body.data.steps.some((s) => known.get(s.id) !== s.imagePath);
  if (forged) return Response.json({ error: "bad_request" }, { status: 400 });

  const steps = body.data.steps.map((s) => ({ ...s, spokenInstruction: s.spokenInstruction || s.instruction }));
  const status = body.data.publish || guide.status === "published" ? "published" : "draft";
  const { error } = await supabaseAdmin().from("guides").update({ steps, status }).eq("id", id);
  if (error) {
    console.error("[save] update failed", error.message);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
  return Response.json({ ok: true, status });
}

// Deletes the guide's screenshots, then the guide itself.
export async function DELETE(request: Request, ctx: RouteContext<"/api/guides/[id]">) {
  const { id } = await ctx.params;
  const check = await requireEditor(request, id);
  if (!check.ok) return check.response;
  try {
    await removeGuideFiles(id);
  } catch (err) {
    console.error("[delete] removing files failed", (err as Error).message);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
  const { error } = await supabaseAdmin().from("guides").delete().eq("id", id);
  if (error) {
    console.error("[delete] row delete failed", error.message);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
