import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { timeZoneLabelFor, zonedToUtc } from "../src/lib/time/format";
import { buildSlots, inferSchedule } from "../src/lib/time/schedule";

const iso = (ms: number) => new Date(ms).toISOString();

describe("zonedToUtc", () => {
  it("reads a wall time in the given zone", () => {
    assert.equal(iso(zonedToUtc("2030-01-07", 9 * 60, "Europe/Istanbul")), "2030-01-07T06:00:00.000Z");
    assert.equal(iso(zonedToUtc("2030-01-07", 9 * 60, "UTC")), "2030-01-07T09:00:00.000Z");
    assert.equal(iso(zonedToUtc("2030-01-07", 9 * 60 + 30, "Asia/Kolkata")), "2030-01-07T04:00:00.000Z");
  });

  it("follows daylight saving on each side of the change", () => {
    assert.equal(iso(zonedToUtc("2026-10-31", 9 * 60, "America/New_York")), "2026-10-31T13:00:00.000Z");
    assert.equal(iso(zonedToUtc("2026-11-02", 9 * 60, "America/New_York")), "2026-11-02T14:00:00.000Z");
  });

  it("moves a time skipped by the spring change forward", () => {
    assert.equal(iso(zonedToUtc("2026-03-08", 2 * 60 + 30, "America/New_York")), "2026-03-08T07:30:00.000Z");
  });

  it("takes the first of a time that happens twice", () => {
    assert.equal(iso(zonedToUtc("2026-11-01", 90, "America/New_York")), "2026-11-01T05:30:00.000Z");
  });

  it("handles midnight at the end of the day", () => {
    assert.equal(iso(zonedToUtc("2030-01-07", 24 * 60, "Europe/Istanbul")), "2030-01-07T21:00:00.000Z");
  });
});

describe("buildSlots and inferSchedule", () => {
  it("build half hours in the chosen zone and read them back", () => {
    const slots = buildSlots(["2030-01-08", "2030-01-07"], 9 * 60, 10 * 60, "Asia/Tokyo");
    assert.deepEqual(slots, [
      "2030-01-07T00:00:00.000Z",
      "2030-01-07T00:30:00.000Z",
      "2030-01-08T00:00:00.000Z",
      "2030-01-08T00:30:00.000Z",
    ]);
    assert.deepEqual(inferSchedule(slots, "Asia/Tokyo"), { dates: ["2030-01-07", "2030-01-08"], start: 9 * 60, end: 10 * 60 });
  });

  it("read the same slots as different days and hours in another zone", () => {
    const slots = buildSlots(["2030-01-07"], 9 * 60, 10 * 60, "Asia/Tokyo");
    assert.deepEqual(inferSchedule(slots, "America/Los_Angeles"), { dates: ["2030-01-06"], start: 16 * 60, end: 17 * 60 });
  });

  it("never repeat a slot across the spring change", () => {
    const slots = buildSlots(["2026-03-08"], 60, 4 * 60, "America/New_York");
    assert.equal(new Set(slots).size, slots.length);
    assert.deepEqual(slots, [
      "2026-03-08T06:00:00.000Z",
      "2026-03-08T06:30:00.000Z",
      "2026-03-08T07:00:00.000Z",
      "2026-03-08T07:30:00.000Z",
    ]);
  });
});

describe("timeZoneLabelFor", () => {
  it("uses the offset the poll's times have, not today's", () => {
    const november = [Date.UTC(2026, 10, 2, 14)];
    assert.equal(timeZoneLabelFor("America/New_York", november), "New York time (GMT-5)");
  });

  it("leaves the offset out when it changes during the poll", () => {
    assert.equal(
      timeZoneLabelFor("America/New_York", [Date.UTC(2026, 9, 31, 14), Date.UTC(2026, 10, 2, 14)]),
      "New York time",
    );
  });
});
