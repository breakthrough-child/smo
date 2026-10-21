import Link from "next/link";

export default function GuideNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <div aria-hidden className="grid h-24 w-24 place-items-center rounded-full bg-coral-soft text-5xl">🧭</div>
      <h1 className="text-[34px]">We can&apos;t find this guide.</h1>
      <p className="text-[22px] text-muted">Ask the person who sent it for a new link.</p>
      <Link href="/" className="text-lg text-muted underline decoration-coral underline-offset-4">
        What is Show Me Once?
      </Link>
    </main>
  );
}
