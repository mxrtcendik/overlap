export type PollKind = "dates" | "weekly";

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const SHORT_TO_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function weekdayName(short: string): string {
  return WEEKDAY_NAMES[SHORT_TO_INDEX[short] ?? 0];
}

export function weekdayOf(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function referenceWeek(today: string, weekStart: number): string[] {
  const ahead = ((weekStart - weekdayOf(today) + 7) % 7) || 7;
  const first = addDays(today, ahead);
  return Array.from({ length: 7 }, (_, index) => addDays(first, index));
}

export function datesForWeekdays(weekdays: number[], today: string, weekStart: number): string[] {
  const wanted = new Set(weekdays);
  return referenceWeek(today, weekStart).filter((date) => wanted.has(weekdayOf(date)));
}

export const WEEKLY_OPEN_MS = 60 * 24 * 60 * 60 * 1000;

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
