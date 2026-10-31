"use client";

import { useMemo, useState } from "react";
import { topSegments, type Segment } from "@/lib/availability";
import { useTimeZone } from "@/lib/browser";
import { SLOT_MS } from "@/lib/constants";
import { describeRun, localParts } from "@/lib/sentence";
import type { VoterView } from "@/lib/types";
import { PollGrid } from "./poll-grid";

type Voter = Pick<VoterView, "name" | "slots" | "yours">;

export function Availability({
  slots,
  voters,
  selected = [],
  readOnly,
  onChange,
}: {
  slots: string[];
  voters: Voter[];
  selected?: string[];
  readOnly: boolean;
  onChange?: (next: string[]) => void;
}) {
  const timeZone = useTimeZone();
  const [inspected, setInspected] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<Set<string> | null>(null);
  const segments = useMemo(() => topSegments(slots, voters), [slots, voters]);

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
      <div className="min-w-0">
        <PollGrid
          slots={slots}
          voters={voters}
          selected={selected}
          readOnly={readOnly}
          highlight={highlight}
          onChange={onChange}
          onInspect={setInspected}
        />
      </div>
      {voters.length > 0 && timeZone ? (
        <aside className="w-full shrink-0 lg:sticky lg:top-8 lg:w-72">
          {inspected ? (
            <SlotDetail iso={inspected} voters={voters} timeZone={timeZone} />
          ) : (
            <BestTimes
              segments={segments}
              slots={slots}
              voters={voters}
              timeZone={timeZone}
              onHighlight={setHighlight}
            />
          )}
          <People voters={voters} onHighlight={setHighlight} />
        </aside>
      ) : null}
    </div>
  );
}

function BestTimes({
  segments,
  slots,
  voters,
  timeZone,
  onHighlight,
}: {
  segments: Segment[];
  slots: string[];
  voters: Voter[];
  timeZone: string;
  onHighlight: (slots: Set<string> | null) => void;
}) {
  return (
    <section aria-labelledby="best-times-heading">
      <h2 id="best-times-heading" className="text-sm text-muted">
        Best times
      </h2>
      <ol className="mt-3 border-t border-line">
        {segments.map((segment) => (
          <li
            key={segment.start}
            className="border-b border-line py-2.5"
            onPointerEnter={() => onHighlight(new Set(segment.slots))}
            onPointerLeave={() => onHighlight(null)}
          >
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm">{describeRun(segment.start, segment.end, timeZone, slots)}</span>
              <span className="font-mono text-xs text-muted tabular-nums">
                {segment.people.length}/{voters.length}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted">
              {segment.people.length === voters.length
                ? "Everyone"
                : segment.people.map((index) => voters[index].name).join(", ")}
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted [@media(hover:none)]:hidden">Hover a slot to see who is free.</p>
    </section>
  );
}

function SlotDetail({ iso, voters, timeZone }: { iso: string; voters: Voter[]; timeZone: string }) {
  const start = Date.parse(iso);
  const from = localParts(start, timeZone);
  const to = localParts(start + SLOT_MS, timeZone);
  const range =
    from.dayPeriod === to.dayPeriod
      ? `${from.hour}:${from.minute}–${to.hour}:${to.minute} ${to.dayPeriod}`
      : `${from.hour}:${from.minute} ${from.dayPeriod}–${to.hour}:${to.minute} ${to.dayPeriod}`;
  const free = voters.filter((voter) => voter.slots.includes(iso));
  const busy = voters.filter((voter) => !voter.slots.includes(iso));

  return (
    <section aria-label="Selected slot">
      <h2 className="text-sm text-muted">
        {from.weekday}, {from.month} {from.day}
      </h2>
      <p className="mt-1 font-mono text-sm tabular-nums">{range}</p>
      <p className="mt-4 text-sm">
        {free.length} of {voters.length} free
      </p>
      <NameList voters={free} free />
      {busy.length > 0 ? (
        <>
          <p className="mt-4 text-xs text-muted">Not free</p>
          <NameList voters={busy} free={false} />
        </>
      ) : null}
    </section>
  );
}

function NameList({ voters, free }: { voters: Voter[]; free: boolean }) {
  return (
    <ul className="mt-2 space-y-1 text-sm">
      {voters.map((voter, index) => (
        <li key={`${voter.name}-${index}`} className={`flex items-center gap-2 ${free ? "" : "text-muted"}`}>
          <span
            aria-hidden="true"
            className={`inline-block size-1.5 rounded-full ${free ? "bg-accent" : "bg-line-strong"}`}
          />
          {voter.name}
          {voter.yours ? <span className="text-muted">· you</span> : null}
        </li>
      ))}
    </ul>
  );
}

function People({ voters, onHighlight }: { voters: Voter[]; onHighlight: (slots: Set<string> | null) => void }) {
  return (
    <section className="mt-8" aria-labelledby="people-heading">
      <h2 id="people-heading" className="text-sm text-muted">
        {voters.length === 1 ? "1 person answered" : `${voters.length} people answered`}
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2 text-sm">
        {voters.map((voter, index) => (
          <li
            key={`${voter.name}-${index}`}
            className="border border-line bg-paper px-2.5 py-1 transition-colors hover:border-line-strong"
            onPointerEnter={() => onHighlight(new Set(voter.slots))}
            onPointerLeave={() => onHighlight(null)}
          >
            {voter.name}
            {voter.yours ? <span className="text-muted"> · you</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
