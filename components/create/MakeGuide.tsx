"use client";

import { useState } from "react";
import { CreateForm } from "./CreateForm";

/** The landing page's big button; reveals the create form in place (prd.md > Screens and Layout). */
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
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="min-h-20 w-full rounded-3xl bg-coral-deep text-[28px] font-bold text-white shadow-lg shadow-coral-deep/25 transition hover:brightness-110"
    >
      Make a guide
    </button>
  );
}
