const FEATURES: { title: string; body: string }[] = [
  {
    title: "Each timezone",
    body: "Times show in each person’s zone and clock. Planning from another city? Switch the zone next to the times.",
  },
  {
    title: "If needed",
    body: "Mark the times that are fine and the ones you’d rather avoid. The answer prefers times nobody has to stretch for.",
  },
  {
    title: "From your calendar",
    body: "Pick an .ics export and your free times are marked. The file never leaves your device.",
  },
  {
    title: "The right length",
    body: "Say how long the meeting is, and the best times are stretches everyone can stay for.",
  },
  {
    title: "People who must be there",
    body: "Mark the key people and the answer only suggests times that include them.",
  },
  {
    title: "Every week",
    body: "Ask about days of the week for things that repeat. The final time becomes a weekly event.",
  },
  {
    title: "A final time",
    body: "Settle on a time and everyone can add it to their calendar, in their own timezone.",
  },
  {
    title: "One link",
    body: "Copy it, show a QR code in the room, or have both links emailed to you. No account either way.",
  },
];

export function Features() {
  return (
    <dl className="mt-8 max-w-3xl border-t border-line">
      {FEATURES.map((feature) => (
        <div
          key={feature.title}
          className="grid gap-1 border-b border-line py-4 sm:grid-cols-[13rem_minmax(0,1fr)] sm:items-baseline sm:gap-8"
        >
          <dt className="font-medium">{feature.title}</dt>
          <dd className="text-sm leading-6 text-pretty text-muted">{feature.body}</dd>
        </div>
      ))}
    </dl>
  );
}
