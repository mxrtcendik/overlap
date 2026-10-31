export type Clock = "h12" | "h23";

export type LocalParts = {
  weekday: string;
  month: string;
  day: string;
  year: string;
  hour: number;
  minute: number;
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
      hourCycle: "h23",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

export function localParts(ms: number, timeZone: string): LocalParts {
  const out: Record<string, string> = {};
  for (const part of formatterFor(timeZone).formatToParts(new Date(ms))) {
    if (part.type !== "literal") out[part.type] = part.value;
  }
  return {
    weekday: out.weekday,
    month: out.month,
    day: out.day,
    year: out.year,
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

export function clockTime(time: { hour: number; minute: number }, clock: Clock, withPeriod = true): string {
  if (clock === "h23") return `${pad(time.hour)}:${pad(time.minute)}`;
  const hour = time.hour % 12 || 12;
  const base = `${hour}:${pad(time.minute)}`;
  return withPeriod ? `${base} ${time.hour < 12 ? "AM" : "PM"}` : base;
}

export function timeRange(from: { hour: number; minute: number }, to: { hour: number; minute: number }, clock: Clock): string {
  const samePeriod = from.hour < 12 === to.hour < 12;
  return `${clockTime(from, clock, clock === "h23" || !samePeriod)}–${clockTime(to, clock)}`;
}

export function sameCalendarDay(a: LocalParts, b: LocalParts): boolean {
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

export function describeRun(startMs: number, endMs: number, timeZone: string, slots: string[], clock: Clock = "h12"): string {
  const start = localParts(startMs, timeZone);
  const end = localParts(endMs, timeZone);
  const withDate = repeatedWeekday(slots, timeZone);
  const lead = (parts: LocalParts) => (withDate ? `${parts.weekday}, ${parts.month} ${parts.day},` : parts.weekday);
  if (sameCalendarDay(start, localParts(endMs - 1, timeZone))) {
    return `${lead(start)} ${timeRange(start, end, clock)}`;
  }
  return `${lead(start)} ${clockTime(start, clock)}–${lead(end)} ${clockTime(end, clock)}`;
}

export function rangeLabel(start: number, end: number, timeZone: string, clock: Clock = "h12"): { day: string; time: string } {
  const from = localParts(start, timeZone);
  const to = localParts(end, timeZone);
  const day = `${from.weekday}, ${from.month} ${from.day}`;
  if (sameCalendarDay(from, localParts(end - 1, timeZone))) return { day, time: timeRange(from, to, clock) };
  return { day, time: `${clockTime(from, clock)} – ${to.weekday}, ${to.month} ${to.day}, ${clockTime(to, clock)}` };
}

export function minutesLabel(minutes: number, clock: Clock): string {
  if (minutes === 24 * 60) return clock === "h23" ? "24:00" : "Midnight";
  return clockTime({ hour: Math.floor(minutes / 60), minute: minutes % 60 }, clock);
}

export function timeZoneLabel(timeZone: string, at = Date.now()): string {
  const offset =
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
      .formatToParts(new Date(at))
      .find((part) => part.type === "timeZoneName")?.value ?? timeZone;
  const city = timeZone.includes("/") && !timeZone.startsWith("Etc/") ? timeZone.split("/").pop()!.replaceAll("_", " ") : null;
  if (!city) return /^GMT([+-]0)?$/.test(offset) ? "UTC" : offset;
  return `${city} time (${offset})`;
}

export function detectClock(locale: string): Clock {
  try {
    const cycle = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hourCycle;
    return cycle === "h11" || cycle === "h12" ? "h12" : "h23";
  } catch {
    return "h12";
  }
}

const SUNDAY_FIRST = new Set(["US", "CA", "MX", "BR", "JP", "KR", "IL", "PH", "TW", "HK", "IN", "ZA", "SA"]);

export function detectWeekStart(locale: string): number {
  try {
    const intl = new Intl.Locale(locale).maximize() as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const firstDay = intl.getWeekInfo?.().firstDay ?? intl.weekInfo?.firstDay;
    if (firstDay) return firstDay % 7;
    return intl.region && SUNDAY_FIRST.has(intl.region) ? 0 : 1;
  } catch {
    return 0;
  }
}
