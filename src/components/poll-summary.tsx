"use client";

import { useMemo } from "react";
import { usePrefs, useTimeZone } from "@/lib/browser";
import { overlapSummary, summaryParts, type Summary, type Vote } from "@/lib/sentence";
import { TimeZoneNote } from "./time-zone";

export function SummaryText({ summary, emptyText }: { summary: Summary; emptyText?: string }) {
  if (summary.kind === "empty" && emptyText) return <>{emptyText}</>;
  const { before, when, after } = summaryParts(summary);
  return (
    <>
      {before}
      {when ? <strong className="font-medium">{when}</strong> : null}
      {after}
    </>
  );
}

export function SentenceBlock({
  slots,
  votes,
  closed,
  emptyText,
}: {
  slots: string[];
  votes: Vote[];
  closed: boolean;
  emptyText: string;
}) {
  const timeZone = useTimeZone();
  const prefs = usePrefs();
  const summary = timeZone && prefs ? overlapSummary({ slots, votes, timeZone, clock: prefs.clock }) : null;
  const times = useMemo(() => slots.map((slot) => Date.parse(slot)), [slots]);

  return (
    <div className="mt-4">
      <p className="min-h-7 max-w-2xl text-lg leading-7 text-balance" aria-live="polite">
        {summary ? <SummaryText summary={summary} emptyText={emptyText} /> : null}
      </p>
      <TimeZoneNote lead="Times are shown in" times={times} />
      {closed ? (
        <p className="mt-4 inline-block border border-line px-2 py-0.5 text-xs text-muted">
          Voting has ended. The last time on this poll has passed.
        </p>
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
      {state === "saved" ? "Saved" : "Saving…"}
    </span>
  );
}
