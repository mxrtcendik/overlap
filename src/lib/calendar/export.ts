import { wallParts } from "../time/format";

export type CalendarEvent = {
  uid: string;
  title: string;
  start: number;
  end: number;
  url: string;
  stamp: number;
  weekly?: boolean;
  zone?: string | null;
};

export function utcStamp(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function wallStamp(ms: number, zone: string): string {
  const parts = wallParts(ms, zone);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${parts.year}${pad(parts.month)}${pad(parts.day)}T${pad(parts.hour)}${pad(parts.minute)}00`;
}

export function escapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (octets + size > limit) {
      parts.push(current);
      current = "";
      octets = 0;
    }
    current += char;
    octets += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function toIcs(event: CalendarEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Overlap//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${utcStamp(event.stamp)}`,
    ...(event.weekly && event.zone
      ? [`DTSTART;TZID=${event.zone}:${wallStamp(event.start, event.zone)}`, `DTEND;TZID=${event.zone}:${wallStamp(event.end, event.zone)}`]
      : [`DTSTART:${utcStamp(event.start)}`, `DTEND:${utcStamp(event.end)}`]),
    ...(event.weekly ? ["RRULE:FREQ=WEEKLY"] : []),
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(`Picked with Overlap: ${event.url}`)}`,
    `URL:${event.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(event: Pick<CalendarEvent, "title" | "start" | "end" | "url" | "weekly" | "zone">): string {
  const zone = event.weekly ? event.zone : null;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: zone
      ? `${wallStamp(event.start, zone)}/${wallStamp(event.end, zone)}`
      : `${utcStamp(event.start)}/${utcStamp(event.end)}`,
    details: `Picked with Overlap: ${event.url}`,
  });
  if (zone) params.set("ctz", zone);
  if (event.weekly) params.set("recur", "RRULE:FREQ=WEEKLY");
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function icsFileName(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "event"}.ics`;
}
