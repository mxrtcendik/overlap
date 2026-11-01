import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { busyTimes, freeSlots } from "../src/lib/calendar/import";

const WINDOW = { start: Date.parse("2026-11-02T00:00:00Z"), end: Date.parse("2026-11-07T00:00:00Z") };

function calendar(...events: string[][]): string {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//test//EN", ...events.flat(), "END:VCALENDAR"].join("\r\n");
}

function event(...lines: string[]): string[] {
  return ["BEGIN:VEVENT", `UID:${Math.random().toString(36).slice(2)}@test`, "DTSTAMP:20261001T000000Z", ...lines, "END:VEVENT"];
}

const iso = (ms: number) => new Date(ms).toISOString();
const spans = (text: string, zone = "UTC") =>
  busyTimes(text, WINDOW, zone).map((span) => `${iso(span.start)}/${iso(span.end)}`);

const NEW_YORK = [
  "BEGIN:VTIMEZONE",
  "TZID:America/New_York",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0400",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0400",
  "TZOFFSETTO:-0500",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

describe("busyTimes: when an event happens", () => {
  it("reads UTC times", () => {
    const text = calendar(event("DTSTART:20261102T100000Z", "DTEND:20261102T110000Z"));
    assert.deepEqual(spans(text), ["2026-11-02T10:00:00.000Z/2026-11-02T11:00:00.000Z"]);
  });

  it("uses a timezone the file defines", () => {
    const text = calendar(NEW_YORK, event("DTSTART;TZID=America/New_York:20261103T090000", "DTEND;TZID=America/New_York:20261103T100000"));
    assert.deepEqual(spans(text), ["2026-11-03T14:00:00.000Z/2026-11-03T15:00:00.000Z"]);
  });

  it("looks up a named zone the file doesn't define", () => {
    const text = calendar(event("DTSTART;TZID=Europe/Istanbul:20261102T150000", "DTEND;TZID=Europe/Istanbul:20261102T160000"));
    assert.deepEqual(spans(text), ["2026-11-02T12:00:00.000Z/2026-11-02T13:00:00.000Z"]);
  });

  it("understands Outlook's Windows zone names", () => {
    const text = calendar(
      event("DTSTART;TZID=Pacific Standard Time:20261102T080000", "DTEND;TZID=Pacific Standard Time:20261102T083000"),
    );
    assert.deepEqual(spans(text), ["2026-11-02T16:00:00.000Z/2026-11-02T16:30:00.000Z"]);
  });

  it("reads floating times in the viewer's zone", () => {
    const text = calendar(event("DTSTART:20261102T090000", "DTEND:20261102T100000"));
    assert.deepEqual(spans(text, "Asia/Tokyo"), ["2026-11-02T00:00:00.000Z/2026-11-02T01:00:00.000Z"]);
  });

  it("takes the length from DURATION when there is no end", () => {
    const text = calendar(event("DTSTART:20261102T100000Z", "DURATION:PT90M"));
    assert.deepEqual(spans(text), ["2026-11-02T10:00:00.000Z/2026-11-02T11:30:00.000Z"]);
  });
});

describe("busyTimes: repeating events", () => {
  it("expands a weekly series, skips excluded dates and follows moved occurrences", () => {
    const uid = "standup@test";
    const text = calendar(
      [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        "DTSTAMP:20261001T000000Z",
        "DTSTART:20261019T130000Z",
        "DTEND:20261019T140000Z",
        "RRULE:FREQ=WEEKLY;BYDAY=MO,WE",
        "EXDATE:20261104T130000Z",
        "END:VEVENT",
      ],
      [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        "DTSTAMP:20261001T000000Z",
        "RECURRENCE-ID:20261102T130000Z",
        "DTSTART:20261102T160000Z",
        "DTEND:20261102T170000Z",
        "END:VEVENT",
      ],
    );
    assert.deepEqual(spans(text), ["2026-11-02T16:00:00.000Z/2026-11-02T17:00:00.000Z"]);
  });

  it("stops a series at its COUNT", () => {
    const text = calendar(event("DTSTART:20261101T100000Z", "DTEND:20261101T110000Z", "RRULE:FREQ=DAILY;COUNT=2"));
    assert.deepEqual(spans(text), ["2026-11-02T10:00:00.000Z/2026-11-02T11:00:00.000Z"]);
  });

  it("drops a cancelled occurrence of a series", () => {
    const uid = "weekly@test";
    const text = calendar(
      ["BEGIN:VEVENT", `UID:${uid}`, "DTSTAMP:20261001T000000Z", "DTSTART:20261026T100000Z", "DTEND:20261026T110000Z", "RRULE:FREQ=WEEKLY", "END:VEVENT"],
      ["BEGIN:VEVENT", `UID:${uid}`, "DTSTAMP:20261001T000000Z", "RECURRENCE-ID:20261102T100000Z", "DTSTART:20261102T100000Z", "DTEND:20261102T110000Z", "STATUS:CANCELLED", "END:VEVENT"],
    );
    assert.deepEqual(spans(text), []);
  });
});

describe("busyTimes: what counts as busy", () => {
  it("skips events marked free or cancelled", () => {
    const text = calendar(
      event("DTSTART:20261102T100000Z", "DTEND:20261102T110000Z", "TRANSP:TRANSPARENT"),
      event("DTSTART:20261102T120000Z", "DTEND:20261102T130000Z", "STATUS:CANCELLED"),
      event("DTSTART:20261102T140000Z", "DTEND:20261102T150000Z", "X-MICROSOFT-CDO-BUSYSTATUS:FREE"),
    );
    assert.deepEqual(spans(text), []);
  });

  it("counts all-day events only when marked busy", () => {
    const text = calendar(
      event("DTSTART;VALUE=DATE:20261103", "DTEND;VALUE=DATE:20261104"),
      event("DTSTART;VALUE=DATE:20261105", "DTEND;VALUE=DATE:20261106", "TRANSP:OPAQUE"),
    );
    assert.deepEqual(spans(text, "Europe/Istanbul"), ["2026-11-04T21:00:00.000Z/2026-11-05T21:00:00.000Z"]);
  });

  it("leaves out events outside the window", () => {
    const text = calendar(
      event("DTSTART:20261030T100000Z", "DTEND:20261030T110000Z"),
      event("DTSTART:20261110T100000Z", "DTEND:20261110T110000Z"),
    );
    assert.deepEqual(spans(text), []);
  });

  it("throws on text that isn't a calendar", () => {
    assert.throws(() => busyTimes("hello", WINDOW, "UTC"));
    assert.throws(() => busyTimes("BEGIN:VCARD\r\nVERSION:4.0\r\nFN:Ada\r\nEND:VCARD", WINDOW, "UTC"));
  });
});

describe("freeSlots", () => {
  const slots = ["09:30", "10:00", "10:30", "11:00"].map((time) => `2026-11-02T${time}:00.000Z`);

  it("keeps only the times no busy stretch touches", () => {
    const busy = [{ start: Date.parse("2026-11-02T10:00:00Z"), end: Date.parse("2026-11-02T11:00:00Z") }];
    assert.deepEqual(freeSlots(slots, busy), [slots[0], slots[3]]);
  });

  it("treats a stretch that only partly covers a time as busy", () => {
    const busy = [{ start: Date.parse("2026-11-02T10:15:00Z"), end: Date.parse("2026-11-02T10:20:00Z") }];
    assert.deepEqual(freeSlots(slots, busy), [slots[0], slots[2], slots[3]]);
  });

  it("frees everything when nothing is busy", () => {
    assert.deepEqual(freeSlots(slots, []), slots);
  });
});
