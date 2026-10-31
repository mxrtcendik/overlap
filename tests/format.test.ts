import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clockTime, detectClock, detectWeekStart, minutesLabel, rangeLabel, timeZoneLabel } from "../src/lib/format";

const at = (hour: number, minute = 0) => Date.UTC(2030, 0, 7, hour, minute);

describe("clock", () => {
  it("formats 12- and 24-hour times", () => {
    assert.equal(clockTime({ hour: 0, minute: 0 }, "h12"), "12:00 AM");
    assert.equal(clockTime({ hour: 12, minute: 30 }, "h12"), "12:30 PM");
    assert.equal(clockTime({ hour: 9, minute: 5 }, "h23"), "09:05");
  });

  it("labels the hour pickers, with midnight at the end of the day", () => {
    assert.equal(minutesLabel(9 * 60, "h12"), "9:00 AM");
    assert.equal(minutesLabel(24 * 60, "h12"), "Midnight");
    assert.equal(minutesLabel(17 * 60 + 30, "h23"), "17:30");
    assert.equal(minutesLabel(24 * 60, "h23"), "24:00");
  });

  it("follows the locale", () => {
    assert.equal(detectClock("en-US"), "h12");
    assert.equal(detectClock("en-GB"), "h23");
    assert.equal(detectClock("tr-TR"), "h23");
  });
});

describe("first day of the week", () => {
  it("follows the locale", () => {
    assert.equal(detectWeekStart("en-US"), 0);
    assert.equal(detectWeekStart("en-GB"), 1);
    assert.equal(detectWeekStart("tr-TR"), 1);
  });
});

describe("rangeLabel", () => {
  it("keeps one period when both ends share it", () => {
    assert.deepEqual(rangeLabel(at(14), at(15), "UTC"), { day: "Mon, Jan 7", time: "2:00–3:00 PM" });
  });

  it("names both periods across noon", () => {
    assert.equal(rangeLabel(at(11, 30), at(12, 30), "UTC").time, "11:30 AM–12:30 PM");
  });

  it("uses the 24-hour clock when asked", () => {
    assert.equal(rangeLabel(at(14), at(15, 30), "UTC", "h23").time, "14:00–15:30");
  });

  it("treats a range ending at midnight as one day", () => {
    assert.deepEqual(rangeLabel(at(23, 30), at(24), "UTC"), { day: "Mon, Jan 7", time: "11:30 PM–12:00 AM" });
  });

  it("names both days when a range crosses midnight", () => {
    assert.equal(rangeLabel(at(23), at(25), "UTC").time, "11:00 PM – Tue, Jan 8, 1:00 AM");
  });
});

describe("timeZoneLabel", () => {
  it("names the city and offset", () => {
    assert.equal(timeZoneLabel("Europe/Istanbul"), "Istanbul time (GMT+3)");
    assert.equal(timeZoneLabel("America/Argentina/Buenos_Aires"), "Buenos Aires time (GMT-3)");
  });

  it("shows only the offset for zones without a city", () => {
    assert.equal(timeZoneLabel("UTC"), "UTC");
    assert.equal(timeZoneLabel("Etc/GMT-5"), "GMT+5");
  });
});
