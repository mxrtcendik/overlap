"use client";

import { useMemo } from "react";
import { usePrefs, useTimeZone } from "@/client/browser";
import { momentLabel } from "@/lib/time/format";
import { durationLabel } from "@/lib/poll/duration";
import { optionSummary, type TimeOption } from "@/lib/poll/options";
import { overlapSummary, summaryParts, type Summary, type Vote } from "@/lib/poll/sentence";
import { TimeZoneNote } from "../common/time-zone";

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
  deadline,
  lastEnd,
  weekly = false,
  duration = null,
  options = null,
  emptyText,
}: {
  slots: string[];
  votes: Vote[];
  closed: boolean;
  deadline: string | null;
  lastEnd: string;
  weekly?: boolean;
  duration?: number | null;
  options?: TimeOption[] | null;
  emptyText: string;
}) {
  const timeZone = useTimeZone();
  const prefs = usePrefs();
  const summary =
    timeZone && prefs
      ? options
        ? optionSummary({ options, votes, timeZone, clock: prefs.clock })
        : overlapSummary({ slots, votes, timeZone, clock: prefs.clock, weekly, duration })
      : null;
  const times = useMemo(() => slots.map((slot) => Date.parse(slot)), [slots]);

  return (
    <div className="mt-4">
      <p className="min-h-7 max-w-2xl text-lg leading-7 text-balance" aria-live="polite">
        {summary ? <SummaryText summary={summary} emptyText={emptyText} /> : null}
      </p>
      {duration ? <p className="mt-1 text-sm text-muted">For a meeting of {durationLabel(duration)}.</p> : null}
      <TimeZoneNote lead="Times are shown in" times={times} />
      <VotingStatus closed={closed} deadline={deadline} lastEnd={Date.parse(lastEnd)} weekly={weekly} />
    </div>
  );
}

function VotingStatus({
  closed,
  deadline,
  lastEnd,
  weekly,
}: {
  closed: boolean;
  deadline: string | null;
  lastEnd: number;
  weekly: boolean;
}) {
  const timeZone = useTimeZone();
  const prefs = usePrefs();
  const at = deadline === null ? null : Date.parse(deadline);
  const when = at !== null && timeZone && prefs ? momentLabel(at, timeZone, prefs.clock) : null;
  let text: string | null = null;
  if (closed) {
    text =
      at !== null && at < lastEnd && when
        ? `Voting closed ${when}.`
        : weekly
          ? "Voting has ended."
          : "Voting has ended. The last time on this poll has passed.";
  } else if (when) {
    text = `Voting closes ${when}.`;
  }
  if (!text) return null;
  return <p className="mt-4 inline-block border border-line px-2 py-0.5 text-xs text-muted tabular-nums">{text}</p>;
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
