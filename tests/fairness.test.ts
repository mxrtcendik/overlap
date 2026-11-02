import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { topSegments, topWindows } from "../src/lib/poll/availability";
import { oddHoursFor, outsideDay } from "../src/lib/poll/fairness";
import { bestTime, oddClause, overlapSentence } from "../src/lib/poll/sentence";

// Monday 2 November 2026, in UTC.
const at = (hour: number, minute = 0) => new Date(Date.UTC(2026, 10, 2, hour, minute)).toISOString();
const range = (from: number, to: number) => {
  const out: string[] = [];
  for (let half = from * 2; half < to * 2; half++) out.push(at(Math.floor(half / 2), (half % 2) * 30));
  return out;
};

describe("outsideDay", () => {
  it("flags any part of the stretch before 08:00 or from 21:00 on", () => {
    // 14:00 UTC is 23:00 in Tokyo and 09:00 in New York.
    assert.equal(outsideDay(Date.parse(at(14)), Date.parse(at(15)), "Asia/Tokyo"), true);
    assert.equal(outsideDay(Date.parse(at(14)), Date.parse(at(15)), "America/New_York"), false);
    // 11:30–12:30 UTC is 20:30–21:30 in Tokyo: the second half is late.
    assert.equal(outsideDay(Date.parse(at(11, 30)), Date.parse(at(12, 30)), "Asia/Tokyo"), true);
  });

  it("ignores people whose timezone isn't known", () => {
    const voters = [{ zone: "Asia/Tokyo" }, { zone: null }, {}];
    assert.deepEqual(oddHoursFor(Date.parse(at(14)), Date.parse(at(15)), voters, [0, 1, 2]), [0]);
  });
});

describe("fair ranking", () => {
  // Two equally good stretches for both people: 06:00–07:00 and 14:00–15:00 UTC.
  // In Tokyo that's 15:00 and 23:00; in Berlin 07:00 and 15:00.
  const slots = [...range(6, 7), ...range(14, 15)];
  const both = { slots };

  it("changes nothing when no timezones are known", () => {
    const best = bestTime(slots, [both, both]);
    assert.equal(best?.start, Date.parse(at(6)));
    assert.deepEqual(best?.odd, []);
  });

  it("prefers the stretch that is early or late for fewer people", () => {
    const votes = [
      { name: "Aiko", zone: "Asia/Tokyo", slots },
      { name: "Ben", zone: "Europe/Berlin", slots },
      { name: "Cleo", zone: "Europe/Berlin", slots },
    ];
    // 06:00 UTC is 07:00 for both Berliners; 14:00 UTC is 23:00 for Aiko only.
    const best = bestTime(slots, votes);
    assert.equal(best?.start, Date.parse(at(14)));
    assert.deepEqual(best?.odd, [0]);
  });

  it("never trades away people for fairness", () => {
    const votes = [
      { name: "Aiko", zone: "Asia/Tokyo", slots },
      { name: "Ben", zone: "Europe/Berlin", slots: range(14, 15) },
    ];
    // Only 14:00 has both, even though it's 23:00 for Aiko.
    assert.equal(bestTime(slots, votes)?.start, Date.parse(at(14)));
  });

  it("breaks ties in the best-times list and in fixed-length windows", () => {
    const votes = [
      { zone: "Asia/Tokyo", slots },
      { zone: "Asia/Tokyo", slots },
    ];
    // For Tokyo, 06:00 UTC is 15:00 (fine) and 14:00 UTC is 23:00 (late).
    const [segment] = topSegments(slots, votes, 1);
    assert.equal(segment.start, Date.parse(at(6)));
    const [window] = topWindows(slots, votes, 60, 1);
    assert.equal(window.start, Date.parse(at(6)));
    assert.deepEqual(window.odd, []);
  });
});

describe("the sentence", () => {
  it("names who the best time is early or late for, in the reader's clock", () => {
    const slots = range(14, 15);
    const votes = [
      { name: "Aiko", zone: "Asia/Tokyo", slots },
      { name: "Ben", zone: "Europe/Berlin", slots },
    ];
    assert.equal(
      overlapSentence({ slots, votes, timeZone: "Europe/Berlin", clock: "h23" }),
      "Mon 15:00–16:00 works for everyone, though it’s 23:00 for Aiko.",
    );
  });

  it("lists two people by time and three or more by name", () => {
    assert.equal(oddClause([]), "");
    assert.equal(
      oddClause([
        { name: "Aiko", time: "11:00 PM" },
        { name: "Ravi", time: "6:30 AM" },
      ]),
      ", though it’s 11:00 PM for Aiko and 6:30 AM for Ravi",
    );
    assert.equal(
      oddClause([
        { name: "Aiko", time: "" },
        { name: "Ravi", time: "" },
        { name: "Mei", time: "" },
      ]),
      ", though it’s early or late for Aiko, Ravi and Mei",
    );
  });
});
