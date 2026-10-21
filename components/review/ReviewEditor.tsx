"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { candidateEditKeys, forgetEditKey, saveEditKey } from "@/lib/editKeyClient";
import type { Target } from "@/lib/ai/schema";
import type { PublicGuide, StepWithUrl } from "@/lib/guides";
import { Button, buttonClass } from "@/components/ui/Button";
import { StepCard } from "./StepCard";
import { SensitiveBanner } from "./SensitiveBanner";

type Load =
  | { state: "loading" }
  | { state: "forbidden" }
  | { state: "missing" }
  | { state: "deleted" }
  | { state: "ready"; guide: PublicGuide };

type Save = { state: "idle" } | { state: "saving" } | { state: "saved" } | { state: "failed" };

export function ReviewEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [steps, setSteps] = useState<StepWithUrl[]>([]);
  const [dirty, setDirty] = useState(false);
  const [save, setSave] = useState<Save>({ state: "idle" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [key, setKey] = useState("");

  useEffect(() => {
    // Try the link's key, then the saved one; remember whichever the server accepts.
    (async () => {
      for (const candidate of [...candidateEditKeys(id), ""]) {
        const res = await fetch(`/api/guides/${id}`, { headers: { "x-edit-key": candidate } }).catch(() => null);
        if (!res) return setLoad({ state: "missing" });
        if (res.status === 403) continue;
        if (!res.ok) return setLoad({ state: "missing" });
        saveEditKey(id, candidate);
        setKey(candidate);
        const guide = (await res.json()) as PublicGuide;
        setSteps(guide.steps);
        return setLoad({ state: "ready", guide });
      }
      setLoad({ state: "forbidden" });
    })();
  }, [id]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (load.state === "loading") return <p className="text-xl text-muted">Loading your guide…</p>;
  if (load.state === "forbidden")
    return (
      <Notice title="This link can't edit this guide." body="Only the person who made it can make changes, from the link they got when it was created." />
    );
  if (load.state === "missing") return <Notice title="We can't find this guide." body="It may have been deleted." />;
  if (load.state === "deleted")
    return <Notice title="Guide deleted" body="The guide and all its screenshots are gone. Its link no longer works." />;

  const { guide } = load;
  const isLive = guide.status === "published";
  const emptyText = steps.some((s) => !s.instruction.trim());
  const blocked = steps.length === 0 ? "Keep at least one step." : emptyText ? "Every step needs a few words." : null;

  function update(stepId: string, change: Partial<StepWithUrl>) {
    setSteps((current) => current.map((s) => (s.id === stepId ? { ...s, ...change } : s)));
    setDirty(true);
    setSave({ state: "idle" });
  }

  function removeStep(stepId: string) {
    setSteps((current) => current.filter((s) => s.id !== stepId));
    setDirty(true);
    setSave({ state: "idle" });
  }

  async function publish() {
    if (blocked || load.state !== "ready") return;
    setSave({ state: "saving" });
    const body = steps.map(({ url: _url, ...step }) => step); // eslint-disable-line @typescript-eslint/no-unused-vars
    const res = await fetch(`/api/guides/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json", "x-edit-key": key },
      body: JSON.stringify({ steps: body, publish: true }),
    }).catch(() => null);
    if (!res?.ok) return setSave({ state: "failed" });
    setDirty(false);
    if (!isLive) return router.push(`/g/${id}/share`); // first publish: straight to sharing
    setSave({ state: "saved" });
  }

  async function deleteGuide() {
    setDeleting(true);
    const res = await fetch(`/api/guides/${id}`, {
      method: "DELETE",
      headers: { "x-edit-key": key },
    }).catch(() => null);
    setDeleting(false);
    if (!res?.ok) return setSave({ state: "failed" });
    forgetEditKey(id);
    setDirty(false);
    setLoad({ state: "deleted" });
  }

  return (
    <div className="flex flex-col gap-6 pb-36">
      <header className="flex flex-col gap-2">
        <p className="font-display text-xl text-accent">{isLive ? "Your guide is live" : "Check your guide"}</p>
        <h1 className="text-3xl">{guide.title}</h1>
        <p className="text-lg text-muted">
          Read each step as if you were your parent. Move a circle if it&apos;s off, fix any words, and remove steps you
          don&apos;t need.
        </p>
      </header>

      {guide.sensitiveWarning && <SensitiveBanner />}

      <ol className="flex flex-col gap-6">
        {steps.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            number={i + 1}
            onMove={(target: Target) => update(step.id, { target })}
            onText={(text) => update(step.id, { instruction: text, spokenInstruction: text })}
            onDelete={() => removeStep(step.id)}
          />
        ))}
      </ol>
      {steps.length === 0 && <p className="rounded-3xl bg-surface p-6 text-lg">All the steps are gone.</p>}

      <section className="mt-6 flex flex-col gap-3 rounded-3xl border-2 border-line p-5">
        <h2 className="text-xl">Delete this guide</h2>
        <p className="text-base text-muted">Removes the guide and every screenshot. Its link will stop working.</p>
        {confirmDelete ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={deleteGuide} disabled={deleting}>
              {deleting ? "Deleting…" : "Yes, delete everything"}
            </Button>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Keep my guide
            </Button>
          </div>
        ) : (
          <Button variant="secondary" className="self-start" onClick={() => setConfirmDelete(true)}>
            Delete this guide
          </Button>
        )}
      </section>

      {/* Sticky save bar: always within thumb reach on a phone. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-cream/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-xl flex-col gap-2">
          <p className="min-h-6 text-center text-base" aria-live="polite">
            {blocked ? (
              <span className="text-accent">{blocked}</span>
            ) : save.state === "failed" ? (
              <span className="text-accent">That didn&apos;t save. Check your connection and try again.</span>
            ) : save.state === "saved" ? (
              <span className="font-bold text-sage">✓ Saved — your changes are live.</span>
            ) : dirty ? (
              <span className="text-muted">You have unsaved changes.</span>
            ) : null}
          </p>
          <div className="flex gap-2">
            <Button className="flex-[2]" onClick={publish} disabled={!!blocked || save.state === "saving" || (isLive && !dirty)}>
              {save.state === "saving" ? "Saving…" : isLive ? "Save changes" : "Publish"}
            </Button>
            {isLive && (
              <Link href={`/g/${id}/share`} className={buttonClass("secondary", "flex-1")}>
                Share
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-surface p-7 text-center shadow-sm">
      <h1 className="text-3xl">{title}</h1>
      <p className="text-lg text-muted">{body}</p>
      <Link href="/" className={buttonClass("primary")}>
        Make a new guide
      </Link>
    </div>
  );
}
