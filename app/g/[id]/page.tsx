import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Tour } from "@/components/tour/Tour";
import { getPublishedGuide, toPublicGuide } from "@/lib/guides";

export default function TourPage({ params }: PageProps<"/g/[id]">) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-[22px] text-muted">Getting your guide ready…</p>}>
      <TourLoader params={params} />
    </Suspense>
  );
}

async function TourLoader({ params }: { params: PageProps<"/g/[id]">["params"] }) {
  const { id } = await params;
  const guide = await getPublishedGuide(id);
  if (!guide) notFound();
  const { title, steps } = await toPublicGuide(guide);
  return <Tour guideId={id} title={title} steps={steps} />;
}
