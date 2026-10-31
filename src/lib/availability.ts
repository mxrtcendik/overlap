import { SLOT_MS } from "./constants";

export type Segment = {
  start: number;
  end: number;
  slots: string[];
  people: number[];
};

export function topSegments(slots: string[], voters: { slots: string[] }[], limit = 3): Segment[] {
  const sets = voters.map((voter) => new Set(voter.slots));
  const ordered = [...slots].sort((a, b) => Date.parse(a) - Date.parse(b));
  const segments: (Segment & { key: string })[] = [];
  let current: (Segment & { key: string }) | null = null;

  for (const slot of ordered) {
    const time = Date.parse(slot);
    const people = sets.flatMap((set, index) => (set.has(slot) ? [index] : []));
    const key = people.join(",");
    if (current && current.key === key && current.end === time) {
      current.end = time + SLOT_MS;
      current.slots.push(slot);
      continue;
    }
    current = { key, start: time, end: time + SLOT_MS, slots: [slot], people };
    segments.push(current);
  }

  return segments
    .filter((segment) => segment.people.length > 0)
    .sort(
      (a, b) =>
        b.people.length - a.people.length || b.end - b.start - (a.end - a.start) || a.start - b.start,
    )
    .slice(0, limit)
    .map(({ start, end, slots: segmentSlots, people }) => ({ start, end, slots: segmentSlots, people }));
}
