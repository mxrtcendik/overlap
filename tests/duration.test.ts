import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { topWindows, windowsOf } from "../src/lib/poll/availability";
import { bestTime, overlapSentence } from "../src/lib/poll/sentence";

const slot = (hour: number, minute = 0) => new Date(Date.UTC(2026, 10, 2, hour, minute)).toISOString();
const slots = [9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5].map((h) => slot(Math.floor(h), (h % 1) * 60));

describe("meeting length", () => {
  const votes = [
    { name: "Ada", slots: slots.slice(0, 6) },
    { name: "Bruno", slots: slots.slice(2, 8) },
    { name: "Chen", slots: slots.slice(3, 5), maybe: slots.slice(5, 7) },
  ];

  it("only counts people free for the whole window", () => {
    const [best] = windowsOf(slots, votes, 90);
    assert.equal(new Date(best.start).toISOString(), slot(10, 30));
    assert.equal(new Date(best.end).toISOString(), slot(12));
    assert.deepEqual(best.people, [0, 1, 2]);
    assert.deepEqual(best.maybe, [2]);
  });

  it("prefers a window with fewer if-needed answers when counts tie", () => {
    const [best] = windowsOf(slots, votes, 60);
    assert.equal(new Date(best.start).toISOString(), slot(10, 30));
    assert.deepEqual(best.maybe, []);
  });

  it("never lists overlapping windows", () => {
    const windows = topWindows(slots, votes, 60, 3);
    for (const a of windows) for (const b of windows) if (a !== b) assert.ok(a.end <= b.start || b.end <= a.start);
  });

  it("skips windows that cross a gap between days", () => {
    const split = [slot(9), slot(9, 30), new Date(Date.UTC(2026, 10, 3, 9)).toISOString()];
    const windows = windowsOf(split, [{ slots: split }], 90);
    assert.equal(windows.length, 0);
  });

  it("feeds the sentence and the best time", () => {
    assert.equal(
      overlapSentence({ slots, votes, timeZone: "UTC", duration: 90 }),
      "Mon 10:30 AM–12:00 PM works for everyone, 1 if needed.",
    );
    assert.deepEqual(bestTime(slots, votes, 60), { start: Date.parse(slot(10, 30)), end: Date.parse(slot(11, 30)), yes: 3, maybe: 0 });
  });

  it("finds nothing when the meeting is longer than anyone's free time", () => {
    assert.equal(bestTime(slots, [{ slots: slots.slice(0, 2) }], 120), null);
  });
});

import { durationLabel, longestRun, parseDuration } from "../src/lib/poll/duration";

describe("parseDuration", () => {
  it("accepts no length or whole half hours within the poll's hours", () => {
    assert.deepEqual(parseDuration(undefined, slots), { ok: true, duration: null });
    assert.deepEqual(parseDuration(null, slots), { ok: true, duration: null });
    assert.deepEqual(parseDuration(90, slots), { ok: true, duration: 90 });
    assert.deepEqual(parseDuration(240, slots), { ok: true, duration: 240 });
  });

  it("refuses odd lengths and ones longer than the hours", () => {
    for (const input of [0, 45, 90.5, "90", -30]) assert.equal(parseDuration(input, slots).ok, false);
    assert.equal(parseDuration(270, slots).ok, false);
  });

  it("measures the longest unbroken stretch", () => {
    assert.equal(longestRun(slots), 240);
  });

  it("names lengths the way people say them", () => {
    assert.equal(durationLabel(30), "30 minutes");
    assert.equal(durationLabel(60), "1 hour");
    assert.equal(durationLabel(150), "2 hours 30 minutes");
  });
});
