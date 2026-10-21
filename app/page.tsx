import { MakeGuide } from "@/components/create/MakeGuide";

const STEPS = [
  {
    icon: "📱",
    title: "Show it once",
    body: "Record the task on your phone with the built-in screen recorder, doing it the way you always do.",
  },
  {
    icon: "✨",
    title: "We turn it into steps",
    body: "Each screen becomes a step with a glowing circle on what to tap and simple words. You check it over.",
  },
  {
    icon: "💛",
    title: "They follow along",
    body: "Send the link on WhatsApp. They see their own screens, big and clear, and hear each step read aloud.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-10 px-4 pt-10 pb-16">
      <header className="flex flex-col gap-4">
        <p className="font-display text-xl text-accent">Show Me Once</p>
        <h1 className="text-[42px] leading-[1.08]">Show it once. They&apos;ve got it forever.</h1>
        <p className="text-xl leading-relaxed text-muted">
          For the phone tasks you keep explaining over the phone. Show it once, and your mum, dad or grandparent can
          follow along on their own — as many times as they need.
        </p>
      </header>

      <MakeGuide />

      <section aria-labelledby="how" className="flex flex-col gap-4">
        <h2 id="how" className="text-2xl">
          How it works
        </h2>
        <ol className="flex flex-col gap-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4 rounded-3xl bg-surface p-5 shadow-sm">
              <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-coral-soft text-3xl">
                {step.icon}
              </span>
              <div>
                <h3 className="text-xl">
                  <span className="text-accent">{i + 1}.</span> {step.title}
                </h3>
                <p className="mt-1 text-lg leading-snug text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-center text-base text-muted">
        No accounts. Guides live at a private link, and you can delete one any time.
      </p>
    </main>
  );
}
