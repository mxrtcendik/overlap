import ICAL from "ical.js";
import { SLOT_MS } from "../constants";
import { isTimeZone, zonedToUtc } from "../time/format";

export type Busy = { start: number; end: number };

const MAX_OCCURRENCES = 5000;

const WINDOWS_ZONES: Record<string, string> = {
  "UTC": "UTC",
  "Pacific Standard Time": "America/Los_Angeles",
  "Mountain Standard Time": "America/Denver",
  "Central Standard Time": "America/Chicago",
  "Eastern Standard Time": "America/New_York",
  "GMT Standard Time": "Europe/London",
  "W. Europe Standard Time": "Europe/Berlin",
  "Romance Standard Time": "Europe/Paris",
  "Central Europe Standard Time": "Europe/Budapest",
  "E. Europe Standard Time": "Europe/Bucharest",
  "Turkey Standard Time": "Europe/Istanbul",
  "Russian Standard Time": "Europe/Moscow",
  "India Standard Time": "Asia/Kolkata",
  "China Standard Time": "Asia/Shanghai",
  "Tokyo Standard Time": "Asia/Tokyo",
  "AUS Eastern Standard Time": "Australia/Sydney",
};


function knownZone(tzid: string | null | undefined): string | null {
  if (!tzid) return null;
  const name = WINDOWS_ZONES[tzid] ?? tzid.replace(/^\/+/, "");
  return isTimeZone(name) ? name : null;
}

function toMs(time: ICAL.Time, fallbackZone: string, tzid: string | null): number {
  const zone = time.zone;
  const defined = zone && zone !== ICAL.Timezone.localTimezone && zone.tzid !== "floating";
  if (!time.isDate && defined) return time.toUnixTime() * 1000;
  const wallZone = (!time.isDate && knownZone(tzid)) || fallbackZone;
  const date = `${time.year}-${String(time.month).padStart(2, "0")}-${String(time.day).padStart(2, "0")}`;
  return zonedToUtc(date, time.isDate ? 0 : time.hour * 60 + time.minute, wallZone);
}

function blocks(event: ICAL.Event, allDay: boolean): boolean {
  const component = event.component;
  const status = String(component.getFirstPropertyValue("status") ?? "").toUpperCase();
  if (status === "CANCELLED") return false;
  const outlook = String(component.getFirstPropertyValue("x-microsoft-cdo-busystatus") ?? "").toUpperCase();
  if (outlook === "FREE") return false;
  const transp = String(component.getFirstPropertyValue("transp") ?? "").toUpperCase();
  return allDay ? transp === "OPAQUE" : transp !== "TRANSPARENT";
}

function startZone(event: ICAL.Event): string | null {
  const tzid = event.component.getFirstProperty("dtstart")?.getParameter("tzid");
  return typeof tzid === "string" ? tzid : null;
}

function interval(start: ICAL.Time, end: ICAL.Time | null, fallbackZone: string, tzid: string | null): Busy {
  const from = toMs(start, fallbackZone, tzid);
  const to = end ? toMs(end, fallbackZone, tzid) : from + (start.isDate ? 24 * 60 * 60 * 1000 : 0);
  return { start: from, end: Math.max(from, to) };
}

export function busyTimes(text: string, window: Busy, fallbackZone: string): Busy[] {
  const parsed = ICAL.parse(text);
  const roots = (Array.isArray(parsed[0]) ? parsed : [parsed]) as unknown[];
  const busy: Busy[] = [];

  for (const jcal of roots) {
    const calendar = new ICAL.Component(jcal as unknown[]);
    if (calendar.name !== "vcalendar") throw new Error("not a calendar");
    for (const zone of calendar.getAllSubcomponents("vtimezone")) ICAL.TimezoneService.register(zone);

    const masters = new Map<string, ICAL.Event>();
    const exceptions: ICAL.Event[] = [];
    for (const component of calendar.getAllSubcomponents("vevent")) {
      const event = new ICAL.Event(component);
      if (event.isRecurrenceException()) exceptions.push(event);
      else masters.set(event.uid ?? `no-uid-${masters.size}`, event);
    }
    const orphans: ICAL.Event[] = [];
    for (const exception of exceptions) {
      const master = masters.get(exception.uid);
      if (master) master.relateException(exception);
      else orphans.push(exception);
    }

    for (const event of [...masters.values(), ...orphans]) {
      if (!event.startDate) continue;
      if (!event.isRecurring()) {
        if (!blocks(event, event.startDate.isDate)) continue;
        const span = interval(event.startDate, event.endDate ?? null, fallbackZone, startZone(event));
        if (span.start < window.end && span.end > window.start) busy.push(span);
        continue;
      }
      const occurrences = event.iterator();
      for (let count = 0, next = occurrences.next(); next && count < MAX_OCCURRENCES; count++, next = occurrences.next()) {
        const details = event.getOccurrenceDetails(next);
        const span = interval(details.startDate, details.endDate, fallbackZone, startZone(details.item));
        if (span.start >= window.end) break;
        if (span.end <= window.start) continue;
        if (blocks(details.item, details.startDate.isDate)) busy.push(span);
      }
    }
  }
  return busy.sort((a, b) => a.start - b.start);
}

export function freeSlots(slots: string[], busy: Busy[]): string[] {
  return slots.filter((slot) => {
    const start = Date.parse(slot);
    const end = start + SLOT_MS;
    return !busy.some((span) => span.start < end && span.end > start);
  });
}
