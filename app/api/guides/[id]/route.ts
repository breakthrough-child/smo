import { requireEditor, toPublicGuide } from "@/lib/guides";

// The full guide for the review screen (edit key required).
export async function GET(request: Request, ctx: RouteContext<"/api/guides/[id]">) {
  const { id } = await ctx.params;
  const check = await requireEditor(request, id);
  if (!check.ok) return check.response;
  return Response.json(await toPublicGuide(check.guide));
}
