const STEPS: { title: string; body: string }[] = [
  {
    title: "Pick days and hours",
    body: "Choose up to 14 days and a window of hours, or ask about days of the week. A few specific times works too.",
  },
  {
    title: "Send one link",
    body: "Everyone types a name and drags across the times that work, in their own timezone.",
  },
  {
    title: "Read the answer",
    body: "The page names the time that works for the most people. Set it, and everyone can add it to their calendar.",
  },
];

export function HowItWorks() {
  return (
    <ol className="mt-8 max-w-xl border-t border-line">
      {STEPS.map((step, index) => (
        <li key={step.title} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 border-b border-line py-5">
          <span className="pt-0.5 font-mono text-xs text-muted tabular-nums">{String(index + 1).padStart(2, "0")}</span>
          <div>
            <h3 className="font-medium">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-pretty text-muted">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
