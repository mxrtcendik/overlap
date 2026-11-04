import { MAX_VOTERS, SLOT_MS } from "../constants";
import { describeRun, type Clock } from "../time/format";
import { topWindows } from "./availability";
import { oddHoursFor, oddHoursLabels, type OddHour } from "./fairness";

export type Marks = { slots: string[]; maybe?: string[]; required?: boolean; zone?: string | null };
export type Vote = Marks & { name: string };

export type Tally = { yes: number; maybe: number };

export function tallySlots(slots: string[], votes: Marks[]): Map<string, Tally> {
  const tallies = new Map<string, Tally>();
  for (const slot of slots) tallies.set(slot, { yes: 0, maybe: 0 });
  for (const vote of votes) {
    const yes = new Set(vote.slots);
    for (const slot of yes) {
      const tally = tallies.get(slot);
      if (tally) tally.yes += 1;
    }
    for (const slot of new Set(vote.maybe ?? [])) {
      const tally = tallies.get(slot);
      if (tally && !yes.has(slot)) tally.maybe += 1;
    }
  }
  return tallies;
}

export function slotScore(tally: Tally): number {
  return (tally.yes + tally.maybe) * (MAX_VOTERS + 1) + tally.yes;
}

export type Run = { start: number; end: number; score: number };

export function bestRun(
  slots: string[],
  counts: Map<string, number>,
  penalty: (start: number, end: number, first: string) => number = () => 0,
): Run | null {
  const times = slots.map((slot) => Date.parse(slot));
  let max = 0;
  for (const slot of slots) max = Math.max(max, counts.get(slot) ?? 0);
  if (max === 0) return null;

  let best: { index: number; length: number; start: number; end: number; cost: number } | null = null;
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
    const start = times[index];
    const stop = times[end] + SLOT_MS;
    const cost = penalty(start, stop, slots[index]);
    if (
      !best ||
      cost < best.cost ||
      (cost === best.cost && (length > best.length || (length === best.length && index < best.index)))
    ) {
      best = { index, length, start, end: stop, cost };
    }
    index = end + 1;
  }
  if (!best) return null;
  return { start: best.start, end: best.end, score: max };
}

export type BestTime = { start: number; end: number; yes: number; maybe: number; odd: number[] };

export function bestTime(slots: string[], votes: Marks[], duration: number | null = null): BestTime | null {
  if (duration) {
    const [top] = topWindows(slots, votes, duration, 1);
    return top
      ? { start: top.start, end: top.end, yes: top.people.length - top.maybe.length, maybe: top.maybe.length, odd: top.odd }
      : null;
  }
  const tallies = tallySlots(slots, votes);
  const required = votes.filter((vote) => vote.required);
  const fits = (slot: string) => required.every((vote) => vote.slots.includes(slot) || (vote.maybe ?? []).includes(slot));
  const scores = new Map([...tallies].map(([slot, tally]) => [slot, fits(slot) ? slotScore(tally) : 0]));
  const available = (slot: string) =>
    votes.flatMap((vote, index) => (vote.slots.includes(slot) || (vote.maybe ?? []).includes(slot) ? [index] : []));
  const run = bestRun(slots, scores, (start, end, first) => oddHoursFor(start, end, votes, available(first)).length);
  if (!run) return null;
  const first = slots.find((slot) => Date.parse(slot) === run.start);
  const tally = (first && tallies.get(first)) || { yes: 0, maybe: 0 };
  const odd = first ? oddHoursFor(run.start, run.end, votes, available(first)) : [];
  return { start: run.start, end: run.end, yes: tally.yes, maybe: tally.maybe, odd };
}

export type Summary =
  | { kind: "empty" }
  | { kind: "one"; name: string }
  | { kind: "unmarked" }
  | { kind: "all"; when: string; maybe: number; odd?: OddHour[] }
  | { kind: "some"; when: string; count: number; people: number; maybe: number; required: string[]; odd?: OddHour[] }
  | { kind: "clash"; required: string[] };

export function overlapSummary(input: {
  slots: string[];
  votes: Vote[];
  timeZone: string;
  clock?: Clock;
  weekly?: boolean;
  duration?: number | null;
}): Summary {
  const people = input.votes.length;
  if (people === 0) return { kind: "empty" };
  if (people === 1) return { kind: "one", name: input.votes[0].name };

  const best = bestTime(input.slots, input.votes, input.duration ?? null);
  const required = input.votes.filter((vote) => vote.required).map((vote) => vote.name);
  if (!best) return required.length > 0 ? { kind: "clash", required } : { kind: "unmarked" };

  const when = describeRun(best.start, best.end, input.timeZone, input.slots, input.clock, input.weekly);
  const count = best.yes + best.maybe;
  const odd = oddHoursLabels(best.start, best.end, input.votes, best.odd, input.clock ?? "h12");
  const extra = odd.length > 0 ? { odd } : {};
  if (count === people) return { kind: "all", when, maybe: best.maybe, ...extra };
  return { kind: "some", when, count, people, maybe: best.maybe, required, ...extra };
}

export function summaryParts(summary: Summary): { before: string; when: string | null; after: string } {
  switch (summary.kind) {
    case "empty":
      return { before: "No answers yet.", when: null, after: "" };
    case "one":
      return { before: `Only ${summary.name} has answered so far.`, when: null, after: "" };
    case "unmarked":
      return { before: "No one has marked a time yet.", when: null, after: "" };
    case "all":
      return { before: "", when: summary.when, after: ` works for everyone${ifNeeded(summary.maybe)}${oddClause(summary.odd)}.` };
    case "clash":
      return {
        before:
          summary.required.length === 1
            ? `${summary.required[0]} must be there but hasn’t marked any times yet.`
            : `${nameList(summary.required)} must be there, but they have no time in common yet.`,
        when: null,
        after: "",
      };
    case "some":
      return {
        before: summary.required.length
          ? `No time works for everyone yet. Closest that suits ${nameList(summary.required)}: `
          : "No time works for everyone yet. Closest: ",
        when: summary.when,
        after: `, ${summary.count} of ${summary.people} people${ifNeeded(summary.maybe)}${oddClause(summary.odd)}.`,
      };
  }
}

export function nameList(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const ifNeeded = (maybe: number) => (maybe > 0 ? `, ${maybe} if needed` : "");

export function oddClause(odd: OddHour[] = []): string {
  if (odd.length === 0) return "";
  if (odd.length <= 2) return `, though it’s ${nameList(odd.map((item) => `${item.time} for ${item.name}`))}`;
  return `, though it’s early or late for ${nameList(odd.map((item) => item.name))}`;
}

export function overlapSentence(input: Parameters<typeof overlapSummary>[0]): string {
  const { before, when, after } = summaryParts(overlapSummary(input));
  return `${before}${when ?? ""}${after}`;
}
