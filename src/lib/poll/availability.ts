import { SLOT_MS } from "../constants";

export type Segment = {
  start: number;
  end: number;
  slots: string[];
  people: number[];
  maybe: number[];
};

export function topSegments(
  slots: string[],
  voters: { slots: string[]; maybe?: string[] }[],
  limit = 3,
  duration: number | null = null,
): Segment[] {
  if (duration) return topWindows(slots, voters, duration, limit);
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

export function windowsOf(slots: string[], voters: { slots: string[]; maybe?: string[] }[], minutes: number): Segment[] {
  const size = Math.round(minutes / (SLOT_MS / 60_000));
  const ordered = [...slots].sort((a, b) => Date.parse(a) - Date.parse(b));
  const times = ordered.map((slot) => Date.parse(slot));
  const yes = voters.map((voter) => new Set(voter.slots));
  const maybe = voters.map((voter) => new Set(voter.maybe ?? []));
  const windows: Segment[] = [];
  for (let first = 0; first + size <= ordered.length; first++) {
    const last = first + size - 1;
    if (times[last] - times[first] !== (size - 1) * SLOT_MS) continue;
    const span = ordered.slice(first, last + 1);
    const people: number[] = [];
    const soft: number[] = [];
    voters.forEach((_, index) => {
      if (!span.every((slot) => yes[index].has(slot) || maybe[index].has(slot))) return;
      people.push(index);
      if (span.some((slot) => !yes[index].has(slot))) soft.push(index);
    });
    if (people.length > 0) windows.push({ start: times[first], end: times[last] + SLOT_MS, slots: span, people, maybe: soft });
  }
  return windows.sort(
    (a, b) => b.people.length - a.people.length || a.maybe.length - b.maybe.length || a.start - b.start,
  );
}

export function topWindows(
  slots: string[],
  voters: { slots: string[]; maybe?: string[] }[],
  minutes: number,
  limit = 3,
): Segment[] {
  const picked: Segment[] = [];
  for (const window of windowsOf(slots, voters, minutes)) {
    if (picked.some((other) => window.start < other.end && other.start < window.end)) continue;
    picked.push(window);
    if (picked.length === limit) break;
  }
  return picked;
}
