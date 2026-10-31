import { CreateForm } from "@/components/create-form";
import { Demo } from "@/components/demo";
import { Shell } from "@/components/shell";

const STEPS = [
  {
    title: "Pick days and hours",
    body: "Up to 14 days in 30-minute slots. There is nothing to sign up for.",
  },
  {
    title: "Send the public link",
    body: "People type a name and drag across the times they can do. Each person sees their own timezone.",
  },
  {
    title: "Read the answer",
    body: "The page names the time that works for the most people. A secret link lets you edit or delete the poll.",
  },
];

export default function Home() {
  return (
    <Shell wide>
      <section className="grid items-center gap-12 lg:grid-cols-[1fr_auto] lg:gap-16">
        <div className="max-w-lg">
          <h1 className="text-[2.25rem] leading-[1.15] tracking-[-0.025em] text-balance sm:text-[2.75rem]">
            Pick a few days. Send one link.
          </h1>
          <p className="mt-5 text-lg leading-7 text-muted text-pretty">
            Everyone marks when they are free, in their own timezone. The page tells you which time works, in one
            sentence.
          </p>
          <a href="#new" className="btn mt-8">
            Make a poll
          </a>
        </div>
        <Demo />
      </section>

      <section aria-labelledby="how-heading" className="mt-24 border-t border-line pt-10">
        <h2 id="how-heading" className="text-sm text-muted">
          How it works
        </h2>
        <ol className="mt-6 grid gap-8 sm:grid-cols-3 sm:gap-10">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="font-mono text-xs text-muted tabular-nums">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 font-medium">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted text-pretty">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="new" className="mt-24 max-w-xl scroll-mt-10 border-t border-line pt-10">
        <CreateForm />
      </section>
    </Shell>
  );
}
