import { SLOT_MS } from "./constants";

export type Segment = {
  start: number;
  end: number;
  slots: string[];
  people: number[];
  maybe: number[];
};

export function topSegments(slots: string[], voters: { slots: string[]; maybe?: string[] }[], limit = 3): Segment[] {
  const sets = voters.map((voter) => new Set(voter.slots));
  const maybeSets = voters.map((voter) => new Set(voter.maybe ?? []));
  const ordered = [...slots].sort((a, b) => Date.parse(a) - Date.parse(b));
  const segments: (Segment & { key: string })[] = [];
  let current: (Segment & { key: string }) | null = null;

  for (const slot of ordered) {
    const time = Date.parse(slot);
    const people = sets.flatMap((set, index) => (set.has(slot) || maybeSets[index].has(slot) ? [index] : []));
    const maybe = people.filter((index) => !sets[index].has(slot));
    const key = `${people.join(",")}|${maybe.join(",")}`;
    if (current && current.key === key && current.end === time) {
      current.end = time + SLOT_MS;
      current.slots.push(slot);
      continue;
    }
    current = { key, start: time, end: time + SLOT_MS, slots: [slot], people, maybe };
    segments.push(current);
  }

  return segments
    .filter((segment) => segment.people.length > 0)
    .sort(
      (a, b) =>
        b.people.length - a.people.length ||
        a.maybe.length - b.maybe.length ||
        b.end - b.start - (a.end - a.start) ||
        a.start - b.start,
    )
    .slice(0, limit)
    .map(({ start, end, slots: segmentSlots, people, maybe }) => ({ start, end, slots: segmentSlots, people, maybe }));
}

export function slotsIn(slots: string[], start: number, end: number): string[] {
  return slots.filter((slot) => {
    const time = Date.parse(slot);
    return time >= start && time < end;
  });
}
