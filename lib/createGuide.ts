// Browser side of the create pipeline (spec.md > The Core Journey Through the System, steps 3–5).
import { supabaseBrowser } from "./supabase/browser";
import { saveEditKey } from "./editKeyClient";

export type BuildError = "no_steps" | "ai_failed" | "server_error";

export class CreateError extends Error {
  constructor(public code: BuildError) {
    super(code);
  }
}

/** Creates the draft and uploads the frames straight to the private bucket. */
export async function createDraft(title: string, frames: Blob[]): Promise<{ id: string; editKey: string }> {
  const res = await fetch("/api/guides", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title, frameCount: frames.length }),
  });
  if (!res.ok) throw new CreateError("server_error");
  const { id, editKey, uploads } = (await res.json()) as {
    id: string;
    editKey: string;
    uploads: { path: string; token: string }[];
  };
  saveEditKey(id, editKey);

  const storage = supabaseBrowser().storage.from("guides");
  const queue = uploads.map((u, n) => ({ ...u, blob: frames[n] }));
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const { error } = await storage.uploadToSignedUrl(item.path, item.token, item.blob, { contentType: "image/jpeg" });
      if (error) throw new CreateError("server_error");
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return { id, editKey };
}

/** Asks the server to build the steps with Claude. Safe to call again after a failure. */
export async function buildSteps(id: string, editKey: string): Promise<void> {
  const res = await fetch(`/api/guides/${id}/build`, { method: "POST", headers: { "x-edit-key": editKey } });
  if (res.ok) return;
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  throw new CreateError(body.error === "no_steps" ? "no_steps" : body.error === "ai_failed" ? "ai_failed" : "server_error");
}
