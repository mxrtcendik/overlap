import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shiftWeeks, weeksToShift } from "../src/lib/poll/copy";

describe("copying a poll to a new week", () => {
  it("moves a poll that's still ahead by one week", () => {
    assert.equal(weeksToShift(["2026-11-04T09:00:00Z"], Date.parse("2026-11-01T12:00:00Z")), 1);
  });

  it("moves an old poll far enough that its times are ahead again", () => {
    const weeks = weeksToShift(["2026-10-01T09:00:00Z"], Date.parse("2026-11-01T12:00:00Z"));
    assert.equal(weeks, 5);
    assert.ok(Date.parse("2026-10-01T09:00:00Z") + weeks * 7 * 86_400_000 > Date.parse("2026-11-01T12:00:00Z"));
  });

  it("keeps the wall-clock time across a daylight-saving change", () => {
    assert.equal(shiftWeeks("2026-10-26T22:00:00.000Z", 1, "America/New_York"), "2026-11-02T23:00:00.000Z");
  });
});
