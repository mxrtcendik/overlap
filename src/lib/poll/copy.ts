import { wallDate, wallParts, zonedToUtc } from "../time/format";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function weeksToShift(times: string[], now: number): number {
  const first = Math.min(...times.map((time) => Date.parse(time)));
  return Math.max(1, Math.floor((now - first) / WEEK_MS) + 1);
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function shiftWeeks(iso: string, weeks: number, zone: string): string {
  const parts = wallParts(Date.parse(iso), zone);
  return new Date(zonedToUtc(addDays(wallDate(parts), weeks * 7), parts.hour * 60 + parts.minute, zone)).toISOString();
}
