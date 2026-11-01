import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { currentWeek, IDENTITY, projectPoll, storedRange } from "../src/lib/time/week-projection";
import type { PollView } from "../src/lib/types";

const zone = "America/New_York";
const october = ["2026-10-19T22:00:00.000Z", "2026-10-19T22:30:00.000Z"];

describe("currentWeek", () => {
  it("leaves a reference week that hasn't passed alone", () => {
    assert.equal(currentWeek(october, zone, Date.parse("2026-10-21T12:00:00Z")), IDENTITY);
  });

  it("moves past weeks forward and keeps the wall-clock time across a DST change", () => {
    const week = currentWeek(october, zone, Date.parse("2026-11-04T12:00:00Z"));
    assert.equal(week.toDisplay(october[0]), "2026-11-02T23:00:00.000Z");
    assert.equal(week.toDisplay(october[1]), "2026-11-02T23:30:00.000Z");
    assert.equal(week.toStored("2026-11-02T23:00:00.000Z"), october[0]);
  });
});

describe("projectPoll", () => {
  const poll: PollView = {
    id: "p",
    title: "Run",
    slots: october,
    closed: false,
    closesAt: "2026-12-31T00:00:00.000Z",
    deadline: null,
    kind: "weekly",
    zone,
    duration: null,
    lastEnd: "2026-12-31T00:00:00.000Z",
    final: { start: october[0], end: "2026-10-19T23:00:00.000Z" },
    voters: [{ name: "Ada", note: null, required: false, slots: [october[0]], maybe: [october[1]], yours: false }],
  };
  const week = currentWeek(october, zone, Date.parse("2026-11-04T12:00:00Z"));
  const shown = projectPoll(poll, week);

  it("moves slots, answers and the final time together", () => {
    assert.deepEqual(shown.slots, ["2026-11-02T23:00:00.000Z", "2026-11-02T23:30:00.000Z"]);
    assert.deepEqual(shown.voters[0].maybe, ["2026-11-02T23:30:00.000Z"]);
    assert.deepEqual(shown.final, { start: "2026-11-02T23:00:00.000Z", end: "2026-11-03T00:00:00.000Z" });
  });

  it("maps a picked range back to stored times", () => {
    const range = storedRange({ start: Date.parse("2026-11-02T23:00:00Z"), end: Date.parse("2026-11-03T00:00:00Z") }, week);
    assert.deepEqual(range, { start: Date.parse(october[0]), end: Date.parse("2026-10-19T23:00:00Z") });
  });
});
