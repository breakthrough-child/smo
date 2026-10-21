// Browser side of the create pipeline (spec.md > The Core Journey Through the System, steps 3–5).
import { supabaseBrowser } from "./supabase/browser";
import { saveEditKey } from "./editKeyClient";

export type BuildError = "no_steps" | "ai_failed" | "server_error";

export class CreateError extends Error {
  constructor(public code: BuildError) {
    super(code);
  }
}

const PARALLEL_UPLOADS = 4;

export type Draft = { id: string; editKey: string };

/** Creates the draft and uploads the frames straight to the private bucket, 4 at a time. */
export async function createDraft(
  title: string,
  frames: Blob[],
  onUploaded?: (done: number, total: number) => void,
): Promise<Draft> {
  const res = await fetch("/api/guides", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title, frameCount: frames.length }),
  }).catch(() => null);
  if (!res?.ok) throw new CreateError("server_error");
  const { id, editKey, uploads } = (await res.json()) as {
    id: string;
    editKey: string;
    uploads: { path: string; token: string }[];
  };
  saveEditKey(id, editKey);

  const storage = supabaseBrowser().storage.from("guides");
  const upload = async (path: string, token: string, blob: Blob) => {
    const { error } = await storage.uploadToSignedUrl(path, token, blob, { contentType: "image/jpeg", upsert: true });
    return !error;
  };

  let done = 0;
  onUploaded?.(0, frames.length);
  const queue = uploads.map((u, n) => ({ ...u, blob: frames[n] }));
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      // One retry per frame, for flaky mobile connections.
      const ok = (await upload(item.path, item.token, item.blob)) || (await upload(item.path, item.token, item.blob));
      if (!ok) throw new CreateError("server_error");
      onUploaded?.(++done, frames.length);
    }
  };
  await Promise.all(Array.from({ length: PARALLEL_UPLOADS }, worker));
  return { id, editKey };
}

/** Asks the server to build the steps with Claude. Safe to call again after a failure. */
export async function buildSteps({ id, editKey }: Draft): Promise<void> {
  // Dev-only: /?force=ai_failed or /?force=no_steps shows those screens without calling Claude.
  const force = process.env.NODE_ENV === "development" ? new URLSearchParams(window.location.search).get("force") : null;
  const url = `/api/guides/${id}/build${force ? `?force=${encodeURIComponent(force)}` : ""}`;
  const res = await fetch(url, { method: "POST", headers: { "x-edit-key": editKey } }).catch(
    () => null,
  );
  if (res?.ok) return;
  const body = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
  throw new CreateError(body?.error === "no_steps" ? "no_steps" : body?.error === "ai_failed" ? "ai_failed" : "server_error");
}
