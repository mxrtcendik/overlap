export function SentenceBlock({
  sentence,
  timeZone,
  closed,
}: {
  sentence: string;
  timeZone: string | null;
  closed: boolean;
}) {
  return (
    <div className="mt-4">
      <p className="min-h-7 max-w-2xl text-lg leading-7 text-balance" aria-live="polite">
        {sentence}
      </p>
      <p className="mt-2 text-sm text-muted">
        Times are in{" "}
        {timeZone ? <span className="font-mono text-[13px]">{timeZone.replaceAll("_", " ")}</span> : "your timezone"}.
      </p>
      {closed ? (
        <p className="mt-4 inline-block border border-line px-2 py-0.5 text-xs text-muted">This poll is closed.</p>
      ) : null}
    </div>
  );
}

export function Status({ state }: { state: "saving" | "saved" }) {
  return (
    <span className="inline-flex items-center gap-1.5 pb-2.5 text-sm text-muted" role="status">
      <span
        aria-hidden="true"
        className={`inline-block size-1.5 rounded-full ${state === "saved" ? "bg-accent" : "bg-line-strong"}`}
      />
      {state === "saved" ? "Saved" : "Saving"}
    </span>
  );
}
