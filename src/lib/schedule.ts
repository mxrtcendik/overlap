import { wallDate, wallParts, zonedToUtc } from "./format";

export function buildSlots(dates: string[], startMin: number, endMin: number, timeZone: string): string[] {
  const slots = new Set<string>();
  for (const date of [...dates].sort()) {
    for (let minute = startMin; minute < endMin; minute += 30) {
      slots.add(new Date(zonedToUtc(date, minute, timeZone)).toISOString());
    }
  }
  return [...slots].sort();
}

export function inferSchedule(slots: string[], timeZone: string): { dates: string[]; start: number; end: number } {
  const byDate = new Map<string, number[]>();
  for (const iso of slots) {
    const parts = wallParts(Date.parse(iso), timeZone);
    const key = wallDate(parts);
    const list = byDate.get(key) ?? [];
    list.push(parts.hour * 60 + parts.minute);
    byDate.set(key, list);
  }
  let start = 24 * 60;
  let end = 0;
  for (const minutes of byDate.values()) {
    start = Math.min(start, ...minutes);
    end = Math.max(end, ...minutes.map((minute) => minute + 30));
  }
  start = Math.floor(start / 30) * 30;
  end = Math.ceil(end / 30) * 30;
  if (end > 24 * 60) end = 24 * 60;
  if (end - start > 12 * 60) end = start + 12 * 60;
  if (end <= start) end = Math.min(24 * 60, start + 30);
  return { dates: [...byDate.keys()].sort(), start, end };
}
