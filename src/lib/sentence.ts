import { SLOT_MS } from "./constants";
import { describeRun, type Clock } from "./format";

export type Vote = { name: string; slots: string[] };

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

export type Summary =
  | { kind: "empty" }
  | { kind: "one"; name: string }
  | { kind: "unmarked" }
  | { kind: "all"; when: string }
  | { kind: "some"; when: string; count: number; people: number };

export function overlapSummary(input: { slots: string[]; votes: Vote[]; timeZone: string; clock?: Clock }): Summary {
  const people = input.votes.length;
  if (people === 0) return { kind: "empty" };
  if (people === 1) return { kind: "one", name: input.votes[0].name };

  const run = bestRun(input.slots, countSlots(input.slots, input.votes));
  if (!run) return { kind: "unmarked" };

  const when = describeRun(run.start, run.end, input.timeZone, input.slots, input.clock);
  if (run.count === people) return { kind: "all", when };
  return { kind: "some", when, count: run.count, people };
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
      return { before: "", when: summary.when, after: " works for everyone." };
    case "some":
      return {
        before: "No time works for everyone yet. Closest: ",
        when: summary.when,
        after: `, ${summary.count} of ${summary.people} people.`,
      };
  }
}

export function overlapSentence(input: { slots: string[]; votes: Vote[]; timeZone: string; clock?: Clock }): string {
  const { before, when, after } = summaryParts(overlapSummary(input));
  return `${before}${when ?? ""}${after}`;
}
