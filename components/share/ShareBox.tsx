"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { reviewPath, storedEditKey } from "@/lib/editKeyClient";
import { defaultMessage, whatsAppUrl } from "@/lib/share";

export function ShareBox({ id, title }: { id: string; title: string }) {
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);

  // The tour link uses whatever address the helper is on (localhost, preview, production).
  useEffect(() => {
    const url = `${window.location.origin}/g/${id}`;
    /* eslint-disable react-hooks/set-state-in-effect -- reading browser-only values once */
    setLink(url);
    setMessage(defaultMessage(title, url));
    setEditKey(storedEditKey(id));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [id, title]);

  async function copy() {
    let ok = await navigator.clipboard?.writeText(link).then(
      () => true,
      () => false,
    );
    if (!ok) {
      // Fallback where the clipboard API is blocked: select the visible link and copy it.
      const input = document.getElementById("tour-link") as HTMLInputElement | null;
      input?.focus();
      input?.select();
      ok = document.execCommand?.("copy") ?? false;
    }
    if (!ok) return; // the link stays selected so it can be copied by hand
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (!link) return <p className="text-xl text-muted">Getting your link ready…</p>;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-3xl bg-surface p-5 shadow-sm">
        <label htmlFor="message" className="text-xl font-bold">
          Your message
        </label>
        <textarea
          id="message"
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="rounded-2xl border-2 border-line bg-cream px-4 py-3 text-lg leading-relaxed"
        />
        <p className="text-base text-muted">Change it however you like. The link always goes with it.</p>
        <a
          href={whatsAppUrl(message, link)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-[#0b7a3e] px-6 text-xl font-bold text-white shadow-md"
        >
          <span aria-hidden>💬</span> Send on WhatsApp
        </a>
      </section>

      <section className="flex flex-col gap-3 rounded-3xl bg-surface p-5 shadow-sm">
        <label htmlFor="tour-link" className="text-xl font-bold">
          Or copy the link
        </label>
        <input
          id="tour-link"
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="min-h-14 rounded-2xl border-2 border-line bg-cream px-4 text-base"
        />
        <button type="button" onClick={copy} className={buttonClass("secondary")} aria-live="polite">
          {copied ? <span className="text-sage">✓ Copied!</span> : "Copy link"}
        </button>
      </section>

      <div className="flex flex-col items-center gap-3 text-lg">
        <Link href={`/g/${id}`} className="font-bold text-accent underline underline-offset-4">
          Try the tour yourself
        </Link>
        {editKey && (
          <Link href={reviewPath(id, editKey)} className="text-muted underline underline-offset-4">
            Back to review
          </Link>
        )}
      </div>
    </div>
  );
}
