"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { readEditKey } from "@/lib/editKeyClient";
import { LOW_CONFIDENCE } from "@/lib/ai/schema";
import type { PublicGuide } from "@/lib/guides";
import { TargetImage } from "./TargetImage";

type Load = { state: "loading" } | { state: "forbidden" } | { state: "missing" } | { state: "ready"; guide: PublicGuide };

export function ReviewEditor() {
  const { id } = useParams<{ id: string }>();
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => {
    // Without a key the server answers 403, which shows the can't-edit message.
    const key = readEditKey(id) ?? "";
    fetch(`/api/guides/${id}`, { headers: { "x-edit-key": key } }).then(async (res) => {
      if (res.status === 403) return setLoad({ state: "forbidden" });
      if (!res.ok) return setLoad({ state: "missing" });
      setLoad({ state: "ready", guide: await res.json() });
    });
  }, [id]);

  if (load.state === "loading") return <p className="text-muted">Loading your guide…</p>;
  if (load.state === "forbidden") return <p>This link can&apos;t edit this guide.</p>;
  if (load.state === "missing") return <p>We can&apos;t find this guide.</p>;

  const { guide } = load;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl">{guide.title}</h1>
      <ol className="flex flex-col gap-6">
        {guide.steps.map((step, i) => (
          <li key={step.id} className="rounded-3xl bg-surface p-4 shadow-sm">
            <p className="mb-3 font-display text-xl">
              Step {i + 1}
              {step.confidence < LOW_CONFIDENCE && <span className="ml-3 text-base text-coral-deep">Please check this step</span>}
            </p>
            <TargetImage url={step.url} target={step.target} alt={`Screenshot for step ${i + 1}`} />
            <p className="mt-3 text-xl">{step.instruction}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
