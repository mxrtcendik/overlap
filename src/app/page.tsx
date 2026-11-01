import { CreateForm } from "@/components/home/create-form";
import { Demo } from "@/components/home/demo";
import { MyPolls } from "@/components/home/my-polls";
import { Analytics } from "@/components/common/analytics";
import { Shell } from "@/components/common/shell";

const STEPS = [
  {
    title: "Pick days and hours",
    body: "Choose up to 14 days and a window of hours. No sign-up, no app to install.",
  },
  {
    title: "Send the public link",
    body: "Everyone types a name and drags across the times that work. Each person sees their own timezone.",
  },
  {
    title: "Read the answer",
    body: "The page names the time that works for the most people. Set it as the final time and everyone can add it to their calendar.",
  },
];

const FEATURES = [
  {
    title: "Your own timezone",
    body: "Times show in each person’s zone and clock. Planning from another city? Switch the zone next to the times.",
  },
  {
    title: "Can make, or only if needed",
    body: "Mark the times that are fine and the ones you’d rather avoid. The answer prefers times nobody has to stretch for.",
  },
  {
    title: "Filled in from your calendar",
    body: "Pick an .ics export and your free times are marked for you. The file never leaves your device.",
  },
  {
    title: "The right length, the right people",
    body: "Say how long the meeting is and who must be there, and the best times follow both.",
  },
  {
    title: "Every week, not just this one",
    body: "Ask about days of the week for things that repeat. The final time goes into calendars as a weekly event.",
  },
  {
    title: "Into everyone’s calendar",
    body: "Settle on a time and everyone can add it to their calendar, shown in their own timezone.",
  },
];

export default function Home() {
  return (
    <Shell wide>
      <section className="grid items-center gap-12 lg:grid-cols-[1fr_28rem] lg:gap-16">
        <div className="max-w-lg">
          <h1 className="text-[2.25rem] leading-[1.15] tracking-[-0.025em] text-balance sm:text-[2.75rem]">
            Pick a few days. Send one link.
          </h1>
          <p className="mt-5 text-lg leading-7 text-muted text-pretty">
            Everyone marks when they’re free, in their own timezone. The page tells you which time works, in one
            sentence.
          </p>
          <a href="#new" className="btn mt-8">
            Create a poll
          </a>
          <p className="mt-3 text-sm text-muted">Free. No accounts, no ads, nothing to install.</p>
        </div>
        <Demo />
      </section>

      <MyPolls />

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

      <section aria-labelledby="features-heading" className="mt-24 border-t border-line pt-10">
        <h2 id="features-heading" className="text-sm text-muted">
          What it does
        </h2>
        <ul className="mt-6 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <li key={feature.title}>
              <span className="font-mono text-xs text-muted tabular-nums">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 font-medium">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted text-pretty">{feature.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="new" className="mt-24 max-w-xl scroll-mt-10 border-t border-line pt-10">
        <CreateForm />
      </section>
      <Analytics />
    </Shell>
  );
}
