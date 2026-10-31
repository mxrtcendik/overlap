import { SLOT_MS } from "./constants";

export type Vote = { name: string; slots: string[] };

export type LocalParts = {
  weekday: string;
  month: string;
  day: string;
  year: string;
  hour: string;
  minute: string;
  dayPeriod: string;
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hourCycle: "h12",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

export function localParts(ms: number, timeZone: string): LocalParts {
  const parts = formatterFor(timeZone).formatToParts(new Date(ms));
  const out: Partial<LocalParts> = {};
  for (const part of parts) {
    if (part.type !== "literal") out[part.type as keyof LocalParts] = part.value;
  }
  return out as LocalParts;
}

function clock(parts: LocalParts, withPeriod: boolean): string {
  const base = `${parts.hour}:${parts.minute}`;
  return withPeriod ? `${base} ${parts.dayPeriod}` : base;
}

function stamp(parts: LocalParts, withDate: boolean): string {
  if (!withDate) return parts.weekday;
  return `${parts.weekday}, ${parts.month} ${parts.day}`;
}

function sameCalendarDay(a: LocalParts, b: LocalParts): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function repeatedWeekday(slots: string[], timeZone: string): boolean {
  const seen = new Map<string, Set<string>>();
  for (const iso of slots) {
    const parts = localParts(Date.parse(iso), timeZone);
    const dates = seen.get(parts.weekday) ?? new Set<string>();
    dates.add(`${parts.year}-${parts.month}-${parts.day}`);
    if (dates.size > 1) return true;
    seen.set(parts.weekday, dates);
  }
  return false;
}

export function describeRun(startMs: number, endMs: number, timeZone: string, slots: string[]): string {
  const start = localParts(startMs, timeZone);
  const end = localParts(endMs, timeZone);
  const withDate = repeatedWeekday(slots, timeZone);
  const oneSlot = endMs - startMs === SLOT_MS;
  const lead = (parts: LocalParts) => (withDate ? `${stamp(parts, true)},` : stamp(parts, false));
  if (oneSlot) return `${lead(start)} ${clock(start, false)}`;

  const samePeriod = start.dayPeriod === end.dayPeriod;
  const showPeriod = !samePeriod;
  if (sameCalendarDay(start, end)) {
    return `${lead(start)} ${clock(start, showPeriod)}–${clock(end, showPeriod)}`;
  }
  return `${lead(start)} ${clock(start, showPeriod)}–${lead(end)} ${clock(end, showPeriod)}`;
}

export function countSlots(slots: string[], votes: { slots: string[] }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const slot of slots) counts.set(slot, 0);
  for (const vote of votes) {
    for (const slot of new Set(vote.slots)) {
      if (counts.has(slot)) counts.set(slot, (counts.get(slot) ?? 0) + 1);
    }
  }
  return counts;
}

export type Run = { start: number; end: number; count: number };

export function bestRun(slots: string[], counts: Map<string, number>): Run | null {
  const times = slots.map((slot) => Date.parse(slot));
  let max = 0;
  for (const slot of slots) max = Math.max(max, counts.get(slot) ?? 0);
  if (max === 0) return null;

  let best: { index: number; length: number; start: number; end: number } | null = null;
  let index = 0;
  while (index < slots.length) {
    if ((counts.get(slots[index]) ?? 0) !== max) {
      index += 1;
      continue;
    }
    let end = index;
    while (
      end + 1 < slots.length &&
      (counts.get(slots[end + 1]) ?? 0) === max &&
      times[end + 1] - times[end] === SLOT_MS
    ) {
      end += 1;
    }
    const length = end - index + 1;
    if (!best || length > best.length || (length === best.length && index < best.index)) {
      best = { index, length, start: times[index], end: times[end] + SLOT_MS };
    }
    index = end + 1;
  }
  if (!best) return null;
  return { start: best.start, end: best.end, count: max };
}

export function overlapSentence(input: { slots: string[]; votes: Vote[]; timeZone: string }): string {
  const people = input.votes.length;
  if (people === 0) return "No one has answered.";
  if (people === 1) return `Only ${input.votes[0].name} so far.`;

  const run = bestRun(input.slots, countSlots(input.slots, input.votes));
  if (!run) return "No time works for everyone.";

  const when = describeRun(run.start, run.end, input.timeZone, input.slots);
  if (run.count === people) {
    const noun = run.count === 1 ? "person" : "people";
    return `${when} works for ${run.count} ${noun}.`;
  }
  return `No time works for everyone. ${when} works for ${run.count} of ${people}.`;
}

export function rangeLabel(start: number, end: number, timeZone: string): { day: string; time: string } {
  const from = localParts(start, timeZone);
  const to = localParts(end, timeZone);
  const day = `${from.weekday}, ${from.month} ${from.day}`;
  if (sameCalendarDay(from, localParts(end - 1, timeZone))) {
    const time =
      from.dayPeriod === to.dayPeriod
        ? `${clock(from, false)}–${clock(to, true)}`
        : `${clock(from, true)}–${clock(to, true)}`;
    return { day, time };
  }
  return { day, time: `${clock(from, true)} – ${to.weekday}, ${to.month} ${to.day}, ${clock(to, true)}` };
}
