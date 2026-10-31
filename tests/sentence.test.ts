import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { overlapSentence, overlapSummary, type Vote } from "../src/lib/sentence";

const zone = "UTC";
const four = "2026-01-06T16:00:00.000Z";
const fourThirty = "2026-01-06T16:30:00.000Z";
const six = "2026-01-06T18:00:00.000Z";
const sixThirty = "2026-01-06T18:30:00.000Z";

function votes(marks: string[][], names = ["Ada", "Bea", "Cal", "Dee"]): Vote[] {
  return marks.map((slots, index) => ({ name: names[index] ?? `Person ${index}`, slots }));
}

describe("overlap sentence", () => {
  it("says when nobody has answered", () => {
    assert.equal(overlapSentence({ slots: [four], votes: [], timeZone: zone }), "No answers yet.");
  });

  it("names the only person", () => {
    assert.equal(
      overlapSentence({ slots: [four, fourThirty], votes: [{ name: "Ada", slots: [four] }], timeZone: zone }),
      "Only Ada has answered so far.",
    );
  });

  it("states a full overlap as a range with its period", () => {
    assert.equal(
      overlapSentence({
        slots: [four, fourThirty],
        votes: votes([[four, fourThirty], [four, fourThirty], [four, fourThirty], [four, fourThirty]]),
        timeZone: zone,
      }),
      "Tue 4:00–5:00 PM works for everyone.",
    );
  });

  it("uses the 24-hour clock when asked", () => {
    assert.equal(
      overlapSentence({
        slots: [four, fourThirty],
        votes: votes([[four, fourThirty], [four, fourThirty]], ["Ada", "Bea"]),
        timeZone: zone,
        clock: "h23",
      }),
      "Tue 16:00–17:00 works for everyone.",
    );
  });

  it("shows a single slot as a half-hour range", () => {
    assert.equal(
      overlapSentence({
        slots: [four, fourThirty],
        votes: votes([[four], [four], [four], []]),
        timeZone: zone,
      }),
      "No time works for everyone yet. Closest: Tue 4:00–4:30 PM, 3 of 4 people.",
    );
  });

  it("uses a range when the partial overlap is longer than one slot", () => {
    assert.equal(
      overlapSentence({
        slots: [four, fourThirty],
        votes: votes([[four, fourThirty], [four, fourThirty], [four, fourThirty], []]),
        timeZone: zone,
      }),
      "No time works for everyone yet. Closest: Tue 4:00–5:00 PM, 3 of 4 people.",
    );
  });

  it("prefers the highest count, then the longest run, then the earliest run", () => {
    assert.equal(
      overlapSentence({
        slots: [four, six, sixThirty],
        votes: votes([[four, six, sixThirty], [four, six, sixThirty], [four], []]),
        timeZone: zone,
      }),
      "No time works for everyone yet. Closest: Tue 4:00–4:30 PM, 3 of 4 people.",
    );

    assert.equal(
      overlapSentence({
        slots: [four, fourThirty, six],
        votes: votes([[four, fourThirty, six], [four, fourThirty, six]], ["Ada", "Bea"]),
        timeZone: zone,
      }),
      "Tue 4:00–5:00 PM works for everyone.",
    );

    assert.equal(
      overlapSentence({
        slots: [four, six],
        votes: votes([[four, six], [four, six]], ["Ada", "Bea"]),
        timeZone: zone,
      }),
      "Tue 4:00–4:30 PM works for everyone.",
    );
  });

  it("includes the date when a weekday repeats", () => {
    const nextTuesday = "2026-01-13T16:00:00.000Z";
    assert.equal(
      overlapSentence({
        slots: [four, nextTuesday],
        votes: votes([[four, nextTuesday], [four, nextTuesday]], ["Ada", "Bea"]),
        timeZone: zone,
      }),
      "Tue, Jan 6, 4:00–4:30 PM works for everyone.",
    );
  });

  it("names both days when a run crosses midnight", () => {
    const late = "2026-01-07T04:30:00.000Z";
    const midnight = "2026-01-07T05:00:00.000Z";
    assert.equal(
      overlapSentence({
        slots: [late, midnight],
        votes: votes([[late, midnight], [late, midnight]], ["Ada", "Bea"]),
        timeZone: "America/New_York",
      }),
      "Tue 11:30 PM–Wed 12:30 AM works for everyone.",
    );
  });

  it("keeps a run that ends at midnight on one day", () => {
    const late = "2026-01-07T04:30:00.000Z";
    assert.equal(
      overlapSentence({
        slots: [late],
        votes: votes([[late], [late]], ["Ada", "Bea"]),
        timeZone: "America/New_York",
      }),
      "Tue 11:30 PM–12:00 AM works for everyone.",
    );
  });

  it("says nobody has marked a time when every answer is empty", () => {
    assert.equal(
      overlapSentence({ slots: [four], votes: votes([[], []], ["Ada", "Bea"]), timeZone: zone }),
      "No one has marked a time yet.",
    );
  });

  it("returns the time separately so the page can set it apart", () => {
    const summary = overlapSummary({
      slots: [four, fourThirty],
      votes: votes([[four], [four]], ["Ada", "Bea"]),
      timeZone: zone,
    });
    assert.deepEqual(summary, { kind: "all", when: "Tue 4:00–4:30 PM" });
  });
});
