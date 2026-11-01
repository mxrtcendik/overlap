import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeText, foldLine, googleCalendarUrl, icsFileName, toIcs, utcStamp } from "../src/lib/calendar/export";

const event = {
  uid: "abc@overlap.cendik.dev",
  title: "Design review; launch, v2",
  start: Date.UTC(2026, 10, 4, 11, 0),
  end: Date.UTC(2026, 10, 4, 12, 0),
  url: "https://overlap.example/p/abc",
  stamp: Date.UTC(2026, 9, 31, 9, 15, 30),
};

describe("calendar export", () => {
  it("formats UTC timestamps without separators", () => {
    assert.equal(utcStamp(event.start), "20261104T110000Z");
  });

  it("escapes text values", () => {
    assert.equal(escapeText("a\\b;c,d\ne"), "a\\\\b\\;c\\,d\\ne");
  });

  it("folds lines at 75 octets without splitting characters", () => {
    const folded = foldLine("SUMMARY:" + "é".repeat(60));
    const encoder = new TextEncoder();
    for (const line of folded.split("\r\n")) assert.ok(encoder.encode(line).length <= 75);
    assert.equal(folded.replace(/\r\n /g, ""), "SUMMARY:" + "é".repeat(60));
  });

  it("builds a calendar with CRLF line endings", () => {
    const ics = toIcs(event);
    assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
    assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
    assert.ok(!/[^\r]\n/.test(ics), "every newline is CRLF");
    assert.ok(ics.includes("DTSTART:20261104T110000Z\r\n"));
    assert.ok(ics.includes("DTEND:20261104T120000Z\r\n"));
    assert.ok(ics.includes("SUMMARY:Design review\\; launch\\, v2\r\n"));
  });

  it("links to Google Calendar with the same times", () => {
    const url = new URL(googleCalendarUrl(event));
    assert.equal(url.hostname, "calendar.google.com");
    assert.equal(url.searchParams.get("dates"), "20261104T110000Z/20261104T120000Z");
    assert.equal(url.searchParams.get("text"), event.title);
  });

  it("makes a safe file name", () => {
    assert.equal(icsFileName("Café: Q4 review!"), "cafe-q4-review.ics");
    assert.equal(icsFileName("???"), "event.ics");
  });
});

describe("weekly events keep their wall-clock time", () => {
  const weekly = { uid: "w@overlap.cendik.dev", title: "Run", start: Date.parse("2026-10-19T22:00:00Z"), end: Date.parse("2026-10-19T23:00:00Z"), url: "https://overlap.cendik.dev/p/w", stamp: 0, weekly: true, zone: "America/New_York" };

  it("writes local times with a TZID and a weekly rule", () => {
    const ics = toIcs(weekly);
    assert.ok(ics.includes("DTSTART;TZID=America/New_York:20261019T180000"));
    assert.ok(ics.includes("DTEND;TZID=America/New_York:20261019T190000"));
    assert.ok(ics.includes("RRULE:FREQ=WEEKLY"));
  });

  it("gives Google the zone and local times", () => {
    const url = new URL(googleCalendarUrl(weekly));
    assert.equal(url.searchParams.get("dates"), "20261019T180000/20261019T190000");
    assert.equal(url.searchParams.get("ctz"), "America/New_York");
    assert.equal(url.searchParams.get("recur"), "RRULE:FREQ=WEEKLY");
  });
});
