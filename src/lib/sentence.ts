import { MAX_VOTERS, SLOT_MS } from "./constants";
import { describeRun, type Clock } from "./format";

export type Marks = { slots: string[]; maybe?: string[] };
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
  return { start: best.start, end: best.end, score: max };
}

export type BestTime = { start: number; end: number; yes: number; maybe: number };

export function bestTime(slots: string[], votes: Marks[]): BestTime | null {
  const tallies = tallySlots(slots, votes);
  const scores = new Map([...tallies].map(([slot, tally]) => [slot, slotScore(tally)]));
  const run = bestRun(slots, scores);
  if (!run) return null;
  const first = slots.find((slot) => Date.parse(slot) === run.start);
  const tally = (first && tallies.get(first)) || { yes: 0, maybe: 0 };
  return { start: run.start, end: run.end, yes: tally.yes, maybe: tally.maybe };
}

export type Summary =
  | { kind: "empty" }
  | { kind: "one"; name: string }
  | { kind: "unmarked" }
  | { kind: "all"; when: string; maybe: number }
  | { kind: "some"; when: string; count: number; people: number; maybe: number };

export function overlapSummary(input: { slots: string[]; votes: Vote[]; timeZone: string; clock?: Clock }): Summary {
  const people = input.votes.length;
  if (people === 0) return { kind: "empty" };
  if (people === 1) return { kind: "one", name: input.votes[0].name };

  const best = bestTime(input.slots, input.votes);
  if (!best) return { kind: "unmarked" };

  const when = describeRun(best.start, best.end, input.timeZone, input.slots, input.clock);
  const count = best.yes + best.maybe;
  if (count === people) return { kind: "all", when, maybe: best.maybe };
  return { kind: "some", when, count, people, maybe: best.maybe };
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
      return { before: "", when: summary.when, after: ` works for everyone${ifNeeded(summary.maybe)}.` };
    case "some":
      return {
        before: "No time works for everyone yet. Closest: ",
        when: summary.when,
        after: `, ${summary.count} of ${summary.people} people${ifNeeded(summary.maybe)}.`,
      };
  }
}

const ifNeeded = (maybe: number) => (maybe > 0 ? `, ${maybe} if needed` : "");

export function overlapSentence(input: { slots: string[]; votes: Vote[]; timeZone: string; clock?: Clock }): string {
  const { before, when, after } = summaryParts(overlapSummary(input));
  return `${before}${when ?? ""}${after}`;
}
