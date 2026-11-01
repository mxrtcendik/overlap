"use client";

import { useMemo, useState } from "react";
import { topSegments, type Segment } from "@/lib/poll/availability";
import { usePrefs, useTimeZone } from "@/client/browser";
import { SLOT_MS } from "@/lib/constants";
import { describeRun, rangeLabel, type Clock } from "@/lib/time/format";
import type { VoterView } from "@/lib/types";
import { PollGrid, type Brush } from "./poll-grid";

type Voter = Pick<VoterView, "name" | "slots" | "maybe" | "yours"> & { note?: string | null; required?: boolean };

export function Availability({
  slots,
  voters,
  selected = [],
  maybe,
  brush,
  readOnly,
  mode,
  outline,
  selectLabel,
  weekly = false,
  duration = null,
  onChange,
  onPick,
}: {
  slots: string[];
  voters: Voter[];
  selected?: string[];
  maybe?: string[];
  brush?: Brush;
  readOnly: boolean;
  mode?: "toggle" | "range";
  outline?: { slots: Set<string>; label: string } | null;
  selectLabel?: string;
  weekly?: boolean;
  duration?: number | null;
  onChange?: (next: string[], nextMaybe: string[]) => void;
  onPick?: (segment: Segment) => void;
}) {
  const timeZone = useTimeZone();
  const clock = usePrefs()?.clock ?? "h12";
  const [inspected, setInspected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<Set<string> | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const pinnedVoter = pinned === null ? undefined : voters[pinned];
  const highlight = useMemo(
    () => hovered ?? (pinnedVoter ? new Set([...pinnedVoter.slots, ...pinnedVoter.maybe]) : null),
    [hovered, pinnedVoter],
  );
  const segments = useMemo(() => topSegments(slots, voters, 3, duration), [slots, voters, duration]);

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
      <div className="min-w-0">
        <PollGrid
          slots={slots}
          voters={voters}
          selected={selected}
          maybe={maybe}
          brush={brush}
          readOnly={readOnly}
          highlight={highlight}
          mode={mode}
          outline={outline}
          selectLabel={selectLabel}
          weekly={weekly}
          duration={duration}
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
                weekly={weekly}
                slots={slots}
                voters={voters}
                timeZone={timeZone}
                clock={clock}
                onHighlight={setHovered}
                onPick={onPick}
              />
            </div>
            <div className={`[grid-area:1/1] ${inspected ? "" : "invisible"}`}>
              <SlotDetail iso={inspected ?? slots[0]} voters={voters} timeZone={timeZone} clock={clock} weekly={weekly} />
            </div>
          </div>
          <People
            voters={voters}
            pinned={pinnedVoter ? pinned : null}
            onHighlight={setHovered}
            onPin={(index) => setPinned((current) => (current === index ? null : index))}
          />
        </aside>
      ) : null}
    </div>
  );
}

function BestTimes({
  segments,
  weekly,
  slots,
  voters,
  timeZone,
  clock,
  onHighlight,
  onPick,
}: {
  segments: Segment[];
  weekly: boolean;
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
              <span className="text-sm">{describeRun(segment.start, segment.end, timeZone, slots, clock, weekly)}</span>
              <span className="font-mono text-xs text-muted tabular-nums">
                {segment.people.length}/{voters.length}
              </span>
            </div>
            <div className="mt-0.5 flex items-baseline justify-between gap-4">
              <p className="truncate text-xs text-muted">{whoLine(segment, voters)}</p>
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

function whoLine(segment: Segment, voters: Voter[]): string {
  const maybe = new Set(segment.maybe);
  const firm = segment.people.filter((index) => !maybe.has(index)).map((index) => voters[index].name);
  const soft = segment.maybe.map((index) => voters[index].name);
  const everyone = segment.people.length === voters.length;
  if (soft.length === 0) return everyone ? "Everyone" : firm.join(", ");
  if (firm.length === 0) return `If needed: ${soft.join(", ")}`;
  return `${everyone ? "Everyone" : firm.join(", ")} · if needed: ${soft.join(", ")}`;
}

function SlotDetail({
  iso,
  voters,
  timeZone,
  clock,
  weekly,
}: {
  iso: string;
  voters: Voter[];
  timeZone: string;
  clock: Clock;
  weekly: boolean;
}) {
  const start = Date.parse(iso);
  const label = rangeLabel(start, start + SLOT_MS, timeZone, clock, weekly);
  const levelOf = (voter: Voter) => (voter.slots.includes(iso) ? "yes" : voter.maybe.includes(iso) ? "maybe" : null);
  const freeCount = voters.filter((voter) => levelOf(voter) !== null).length;
  const maybeCount = voters.filter((voter) => levelOf(voter) === "maybe").length;

  return (
    <section aria-label="Selected time">
      <h2 className="text-sm text-muted">{label.day}</h2>
      <p className="mt-1 font-mono text-sm tabular-nums">{label.time}</p>
      <p className="mt-4 text-sm">
        {freeCount} of {voters.length} free
        {maybeCount > 0 ? <span className="text-muted">, {maybeCount} if needed</span> : null}
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {voters.map((voter, index) => {
          const level = levelOf(voter);
          return (
            <li key={`${voter.name}-${index}`} className={`flex items-center gap-2 ${level ? "" : "text-muted"}`}>
              <span
                aria-hidden="true"
                className={`inline-block size-1.5 rounded-full ${
                  level === "yes" ? "bg-accent" : level === "maybe" ? "border border-accent" : "bg-line-strong"
                }`}
              />
              <span className={level ? undefined : "line-through decoration-line-strong"}>{voter.name}</span>
              {level === "maybe" ? <span className="text-muted">if needed</span> : null}
              {voter.yours ? <span className="text-muted">· you</span> : null}
              {voter.note ? <span className="min-w-0 truncate text-xs text-muted">· {voter.note}</span> : null}
              <span className="sr-only">{level === "yes" ? "free" : level === "maybe" ? "" : "not free"}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function People({
  voters,
  pinned,
  onHighlight,
  onPin,
}: {
  voters: Voter[];
  pinned: number | null;
  onHighlight: (slots: Set<string> | null) => void;
  onPin: (index: number) => void;
}) {
  return (
    <section className="mt-8" aria-labelledby="people-heading">
      <h2 id="people-heading" className="text-sm text-muted">
        {voters.length === 1 ? "1 person answered" : `${voters.length} people answered`}
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2 text-sm">
        {voters.map((voter, index) => {
          const show = () => onHighlight(new Set([...voter.slots, ...voter.maybe]));
          const on = pinned === index;
          return (
            <li key={`${voter.name}-${index}`}>
              <button
                type="button"
                aria-pressed={on}
                aria-label={`${voter.name}${voter.yours ? ", you" : ""}${voter.note ? `, “${voter.note}”` : ""}. Show their times on the grid.`}
                className={`border bg-paper px-2.5 py-1 transition-[border-color,box-shadow] duration-[var(--quick)] ${
                  on
                    ? "border-foreground shadow-[inset_0_0_0_0.5px_var(--foreground)]"
                    : "border-line hover:border-line-strong"
                }`}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") show();
                }}
                onPointerLeave={() => onHighlight(null)}
                onFocus={(event) => {
                  if (event.currentTarget.matches(":focus-visible")) show();
                }}
                onBlur={() => onHighlight(null)}
                onClick={() => {
                  onHighlight(null);
                  onPin(index);
                }}
              >
                {voter.name}
                {voter.yours ? <span className="text-muted"> · you</span> : null}
                {voter.required ? <span className="text-muted"> · required</span> : null}
                {voter.note ? <span className="text-muted"> · {voter.note}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
