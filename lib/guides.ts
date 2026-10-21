import "server-only";
import { z } from "zod";
import { BUCKET, supabaseAdmin } from "./supabase/server";
import { verifyEditKey } from "./editKey";
import type { Step } from "./ai/schema";

export type GuideRow = {
  id: string;
  title: string;
  steps: Step[];
  edit_token_hash: string;
  status: "draft" | "published";
  sensitive_warning: boolean;
  frame_count: number;
  created_at: string;
};

export type StepWithUrl = Step & { url: string };

// What the browser receives: never the hash.
export type PublicGuide = {
  id: string;
  title: string;
  status: GuideRow["status"];
  sensitiveWarning: boolean;
  steps: StepWithUrl[];
};

export const SIGNED_URL_SECONDS = 60 * 60; // at least 1 hour (spec.md > Decisions)

export const frameKey = (guideId: string, n: number) => `${guideId}/frame-${n}.jpg`;

const isUuid = (id: string) => z.string().uuid().safeParse(id).success;

export async function getGuide(id: string): Promise<GuideRow | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await supabaseAdmin().from("guides").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`guides select failed: ${error.message}`);
  return data as GuideRow | null;
}

export async function getPublishedGuide(id: string): Promise<GuideRow | null> {
  const guide = await getGuide(id);
  return guide?.status === "published" ? guide : null;
}

export async function signStepUrls(steps: Step[]): Promise<StepWithUrl[]> {
  if (!steps.length) return [];
  const paths = steps.map((s) => s.imagePath);
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error || !data) throw new Error(`signing failed: ${error?.message}`);
  const byPath = new Map(data.map((d) => [d.path, d.signedUrl]));
  return steps.map((s) => ({ ...s, url: byPath.get(s.imagePath) ?? "" }));
}

export async function toPublicGuide(guide: GuideRow): Promise<PublicGuide> {
  return {
    id: guide.id,
    title: guide.title,
    status: guide.status,
    sensitiveWarning: guide.sensitive_warning,
    steps: await signStepUrls(guide.steps),
  };
}

export type EditorCheck =
  | { ok: true; guide: GuideRow }
  | { ok: false; response: Response };

// Loads the guide and checks the x-edit-key header against the stored hash.
export async function requireEditor(request: Request, id: string): Promise<EditorCheck> {
  const guide = await getGuide(id);
  if (!guide) return { ok: false, response: Response.json({ error: "not_found" }, { status: 404 }) };
  if (!verifyEditKey(request.headers.get("x-edit-key"), guide.edit_token_hash)) {
    return { ok: false, response: Response.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { ok: true, guide };
}

export async function removeGuideFiles(guideId: string, keep: string[] = []): Promise<void> {
  const storage = supabaseAdmin().storage.from(BUCKET);
  const { data, error } = await storage.list(guideId, { limit: 100 });
  if (error) throw new Error(`listing files failed: ${error.message}`);
  const paths = (data ?? []).map((f) => `${guideId}/${f.name}`).filter((p) => !keep.includes(p));
  if (!paths.length) return;
  const removed = await storage.remove(paths);
  if (removed.error) throw new Error(`removing files failed: ${removed.error.message}`);
}
