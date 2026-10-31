"use client";

import { useMemo, useState } from "react";
import { topSegments, type Segment } from "@/lib/availability";
import { usePrefs, useTimeZone } from "@/lib/browser";
import { SLOT_MS } from "@/lib/constants";
import { describeRun, rangeLabel, type Clock } from "@/lib/format";
import type { VoterView } from "@/lib/types";
import { PollGrid } from "./poll-grid";

type Voter = Pick<VoterView, "name" | "slots" | "yours">;

export function Availability({
  slots,
  voters,
  selected = [],
  readOnly,
  mode,
  outline,
  selectLabel,
  onChange,
  onPick,
}: {
  slots: string[];
  voters: Voter[];
  selected?: string[];
  readOnly: boolean;
  mode?: "toggle" | "range";
  outline?: { slots: Set<string>; label: string } | null;
  selectLabel?: string;
  onChange?: (next: string[]) => void;
  onPick?: (segment: Segment) => void;
}) {
  const timeZone = useTimeZone();
  const clock = usePrefs()?.clock ?? "h12";
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
          mode={mode}
          outline={outline}
          selectLabel={selectLabel}
          onChange={onChange}
          onInspect={setInspected}
        />
      </div>
      {voters.length > 0 && timeZone ? (
        <aside className="w-full shrink-0 lg:sticky lg:top-8 lg:w-72">
          <div className="grid">
            <div className={`[grid-area:1/1] ${inspected ? "invisible" : ""}`}>
              <BestTimes
                segments={segments}
                slots={slots}
                voters={voters}
                timeZone={timeZone}
                clock={clock}
                onHighlight={setHighlight}
                onPick={onPick}
              />
            </div>
            <div className={`[grid-area:1/1] ${inspected ? "" : "invisible"}`}>
              <SlotDetail iso={inspected ?? slots[0]} voters={voters} timeZone={timeZone} clock={clock} />
            </div>
          </div>
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
  clock,
  onHighlight,
  onPick,
}: {
  segments: Segment[];
  slots: string[];
  voters: Voter[];
  timeZone: string;
  clock: Clock;
  onHighlight: (slots: Set<string> | null) => void;
  onPick?: (segment: Segment) => void;
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
              <span className="text-sm">{describeRun(segment.start, segment.end, timeZone, slots, clock)}</span>
              <span className="font-mono text-xs text-muted tabular-nums">
                {segment.people.length}/{voters.length}
              </span>
            </div>
            <div className="mt-0.5 flex items-baseline justify-between gap-4">
              <p className="truncate text-xs text-muted">
                {segment.people.length === voters.length
                  ? "Everyone"
                  : segment.people.map((index) => voters[index].name).join(", ")}
              </p>
              {onPick ? (
                <button type="button" className="link-quiet shrink-0 text-xs" onClick={() => onPick(segment)}>
                  Pick
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted [@media(hover:none)]:hidden">Hover over a time to see who’s free.</p>
    </section>
  );
}

function SlotDetail({ iso, voters, timeZone, clock }: { iso: string; voters: Voter[]; timeZone: string; clock: Clock }) {
  const start = Date.parse(iso);
  const label = rangeLabel(start, start + SLOT_MS, timeZone, clock);
  const freeCount = voters.filter((voter) => voter.slots.includes(iso)).length;

  return (
    <section aria-label="Selected time">
      <h2 className="text-sm text-muted">{label.day}</h2>
      <p className="mt-1 font-mono text-sm tabular-nums">{label.time}</p>
      <p className="mt-4 text-sm">
        {freeCount} of {voters.length} free
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {voters.map((voter, index) => {
          const free = voter.slots.includes(iso);
          return (
            <li key={`${voter.name}-${index}`} className={`flex items-center gap-2 ${free ? "" : "text-muted"}`}>
              <span
                aria-hidden="true"
                className={`inline-block size-1.5 rounded-full ${free ? "bg-accent" : "bg-line-strong"}`}
              />
              <span className={free ? undefined : "line-through decoration-line-strong"}>{voter.name}</span>
              {voter.yours ? <span className="text-muted">· you</span> : null}
              <span className="sr-only">{free ? "free" : "not free"}</span>
            </li>
          );
        })}
      </ul>
    </section>
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
