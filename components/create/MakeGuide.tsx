"use client";

import { useState } from "react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { CreateForm } from "./CreateForm";

// A published guide to show visitors. Set in the environment so it can be swapped without code changes;
// the button is hidden when it's missing or isn't a guide ID. NEXT_PUBLIC_ values are fixed at build time.
const DEMO_GUIDE_ID = process.env.NEXT_PUBLIC_DEMO_GUIDE_ID?.trim();
const demoId = DEMO_GUIDE_ID && /^[0-9a-f-]{36}$/i.test(DEMO_GUIDE_ID) ? DEMO_GUIDE_ID : null;
// Set NEXT_PUBLIC_CREATION_PAUSED=true to show a "paused" notice (e.g. while AI credit is out).
const creationPaused = process.env.NEXT_PUBLIC_CREATION_PAUSED?.trim().toLowerCase() === "true";

/** The landing page's big buttons; "Make a guide" reveals the create form in place (prd.md > Screens and Layout). */
export function MakeGuide() {
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <div className="fade-in">
        <CreateForm />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {creationPaused && (
        <p role="status" className="flex gap-3 rounded-2xl bg-coral-soft px-4 py-3 text-lg leading-snug">
          <span aria-hidden>🌙</span>
          <span>New guides are paused for a few days — tap See an example guide to try a real one.</span>
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-20 w-full flex-1 rounded-3xl bg-coral-deep text-[28px] font-bold text-white shadow-lg shadow-coral-deep/25 transition hover:brightness-110"
        >
          Make a guide
        </button>
        {demoId && (
          <Link href={`/g/${demoId}`} className={buttonClass("secondary", "min-h-20 flex-1 rounded-3xl text-[22px]")}>
            See an example guide
          </Link>
        )}
      </div>
    </div>
  );
}
