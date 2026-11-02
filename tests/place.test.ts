import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { googleCalendarUrl, toIcs } from "../src/lib/calendar/export";
import { finalTimeEmail } from "../src/lib/email";
import { MAX_PLACE, parsePlace, placeLink } from "../src/lib/poll/place";

describe("parsePlace", () => {
  it("tidies spaces and treats empty as no place", () => {
    assert.deepEqual(parsePlace("  Room   4B \n"), { ok: true, place: "Room 4B" });
    assert.deepEqual(parsePlace(""), { ok: true, place: null });
    assert.deepEqual(parsePlace(null), { ok: true, place: null });
  });

  it("refuses non-text and overly long places", () => {
    assert.equal(parsePlace(42).ok, false);
    assert.equal(parsePlace("x".repeat(MAX_PLACE + 1)).ok, false);
  });
});

describe("placeLink", () => {
  it("only turns http and https addresses into links", () => {
    assert.equal(placeLink("https://meet.example.com/abc")?.hostname, "meet.example.com");
    assert.equal(placeLink("http://example.com")?.protocol, "http:");
    assert.equal(placeLink("javascript:alert(1)"), null);
    assert.equal(placeLink("Room 4B"), null);
    assert.equal(placeLink("https://"), null);
  });
});

describe("the place in calendars and email", () => {
  const event = { uid: "a@b", title: "Retro", start: Date.parse("2026-11-05T13:00:00Z"), end: Date.parse("2026-11-05T14:00:00Z"), url: "https://x.test/p/a", stamp: 0 };

  it("adds LOCATION to the calendar file only when there is a place", () => {
    assert.ok(toIcs({ ...event, location: "Room 4B, Floor 2" }).includes("LOCATION:Room 4B\\, Floor 2\r\n"));
    assert.ok(!toIcs(event).includes("LOCATION"));
  });

  it("passes it to Google Calendar and the final-time email", () => {
    assert.equal(new URL(googleCalendarUrl({ ...event, location: "Room 4B" })).searchParams.get("location"), "Room 4B");
    const email = finalTimeEmail({ title: "Retro", day: "Thu, Nov 5", time: "1:00–2:00 PM", pollUrl: event.url, place: "Room 4B" });
    assert.ok(email.text.includes("Where: Room 4B"));
    assert.ok(!finalTimeEmail({ title: "Retro", day: "Thu", time: "1 PM", pollUrl: event.url }).text.includes("Where:"));
  });
});
