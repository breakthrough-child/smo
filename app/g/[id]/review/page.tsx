import { Suspense } from "react";
import { ReviewEditor } from "@/components/review/ReviewEditor";

export default function ReviewPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <Suspense fallback={<p className="text-muted">Loading your guide…</p>}>
        <ReviewEditor />
      </Suspense>
    </main>
  );
}
