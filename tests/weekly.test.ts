import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { datesForWeekdays, referenceWeek, weekdayName, weekdayOf } from "../src/lib/time/weekly";
import { describeRun, rangeLabel } from "../src/lib/time/format";

describe("referenceWeek", () => {
  it("starts on the next first-day-of-week after today", () => {
    assert.deepEqual(referenceWeek("2026-11-01", 1), [
      "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08",
    ]);
  });

  it("skips to next week when today is the first day, so no time has passed", () => {
    assert.equal(referenceWeek("2026-11-02", 1)[0], "2026-11-09");
  });

  it("follows a Sunday week start", () => {
    assert.equal(referenceWeek("2026-11-04", 0)[0], "2026-11-08");
    assert.equal(weekdayOf(referenceWeek("2026-11-04", 0)[0]), 0);
  });
});

describe("datesForWeekdays", () => {
  it("maps days of the week to the reference week, in order", () => {
    assert.deepEqual(datesForWeekdays([5, 1, 3], "2026-11-01", 1), ["2026-11-02", "2026-11-04", "2026-11-06"]);
  });
});

describe("weekday labels", () => {
  it("names days in full", () => {
    assert.equal(weekdayName("Wed"), "Wednesday");
  });

  const at = (day: number, hour: number) => Date.UTC(2026, 10, day, hour);
  const slots = [at(2, 18), at(9, 18)].map((ms) => new Date(ms).toISOString());

  it("says Mondays in a sentence, without the date even if a weekday repeats", () => {
    assert.equal(describeRun(at(2, 18), at(2, 19), "UTC", slots, "h12", true), "Mondays 6:00–7:00 PM");
  });

  it("says Every Monday for a single stretch", () => {
    assert.deepEqual(rangeLabel(at(2, 18), at(2, 19), "UTC", "h12", true), { day: "Every Monday", time: "6:00–7:00 PM" });
  });

  it("keeps dates for date polls", () => {
    assert.equal(rangeLabel(at(2, 18), at(2, 19), "UTC").day, "Mon, Nov 2");
  });
});
