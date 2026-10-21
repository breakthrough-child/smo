import { CreateForm } from "@/components/create/CreateForm";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-4 py-10">
      <header>
        <p className="font-display text-xl text-coral-deep">Show Me Once</p>
        <h1 className="mt-2 text-4xl">Show it once. They&apos;ve got it forever.</h1>
      </header>
      <CreateForm />
    </main>
  );
}
