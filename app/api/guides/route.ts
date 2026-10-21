import { z } from "zod";
import { generateEditKey, hashEditKey } from "@/lib/editKey";
import { BUCKET, supabaseAdmin } from "@/lib/supabase/server";
import { frameKey } from "@/lib/guides";

const CreateBody = z.object({
  title: z.string().trim().min(1).max(80),
  frameCount: z.number().int().min(1).max(24),
});

// Creates a draft guide and returns one signed upload token per frame.
export async function POST(request: Request) {
  const body = CreateBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "bad_request" }, { status: 400 });

  const editKey = generateEditKey();
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("guides")
    .insert({ title: body.data.title, edit_token_hash: hashEditKey(editKey), frame_count: body.data.frameCount })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[create] insert failed", error?.message);
    return Response.json({ error: "server_error" }, { status: 500 });
  }

  const storage = db.storage.from(BUCKET);
  const uploads = await Promise.all(
    Array.from({ length: body.data.frameCount }, async (_, n) => {
      const path = frameKey(data.id, n);
      const signed = await storage.createSignedUploadUrl(path, { upsert: true }); // a retried frame may overwrite
      if (signed.error) throw new Error(signed.error.message);
      return { path, token: signed.data.token };
    }),
  ).catch((err: Error) => {
    console.error("[create] signing uploads failed", err.message);
    return null;
  });
  if (!uploads) {
    await db.from("guides").delete().eq("id", data.id);
    return Response.json({ error: "server_error" }, { status: 500 });
  }

  return Response.json({ id: data.id, editKey, uploads });
}
