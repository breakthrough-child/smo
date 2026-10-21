import { getPublishedGuide, signStepUrls } from "@/lib/guides";

// Fresh signed screenshot links for an open tour (published guides only).
export async function GET(_request: Request, ctx: RouteContext<"/api/guides/[id]/images">) {
  const { id } = await ctx.params;
  const guide = await getPublishedGuide(id);
  if (!guide) return Response.json({ error: "not_found" }, { status: 404 });
  const steps = await signStepUrls(guide.steps);
  return Response.json(
    { urls: Object.fromEntries(steps.map((s) => [s.id, s.url])) },
    { headers: { "cache-control": "no-store" } },
  );
}
