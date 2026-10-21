import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ShareBox } from "@/components/share/ShareBox";
import { getPublishedGuide } from "@/lib/guides";

export default function SharePage({ params }: PageProps<"/g/[id]/share">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <Suspense fallback={<p className="text-xl text-muted">Getting your link ready…</p>}>
        <ShareLoader params={params} />
      </Suspense>
    </main>
  );
}

async function ShareLoader({ params }: { params: PageProps<"/g/[id]/share">["params"] }) {
  const { id } = await params;
  const guide = await getPublishedGuide(id);
  if (!guide) notFound();
  return (
    <>
      <header className="flex flex-col gap-2">
        <p className="font-display text-xl text-sage">✓ Your guide is ready</p>
        <h1 className="text-3xl">Send it to someone</h1>
        <p className="text-lg text-muted">
          <strong className="text-ink">{guide.title}</strong> · {guide.steps.length} steps
        </p>
      </header>
      <ShareBox id={id} title={guide.title} />
    </>
  );
}
