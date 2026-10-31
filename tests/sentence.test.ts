import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { overlapSentence, type Vote } from "../src/lib/sentence";

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
    assert.equal(overlapSentence({ slots: [four], votes: [], timeZone: zone }), "No one has answered.");
  });

  it("names the only person", () => {
    assert.equal(
      overlapSentence({ slots: [four, fourThirty], votes: [{ name: "Ada", slots: [four] }], timeZone: zone }),
      "Only Ada so far.",
    );
  });

  it("states a full overlap as a range", () => {
    assert.equal(
      overlapSentence({
        slots: [four, fourThirty],
        votes: votes([[four, fourThirty], [four, fourThirty], [four, fourThirty], [four, fourThirty]]),
        timeZone: zone,
      }),
      "Tue 4:00–5:00 works for 4 people.",
    );
  });

  it("says when the best time is short of everyone", () => {
    assert.equal(
      overlapSentence({
        slots: [four, fourThirty],
        votes: votes([[four], [four], [four], []]),
        timeZone: zone,
      }),
      "No time works for everyone. Tue 4:00 works for 3 of 4.",
    );
  });

  it("uses a range when the partial overlap is longer than one slot", () => {
    assert.equal(
      overlapSentence({
        slots: [four, fourThirty],
        votes: votes([
          [four, fourThirty],
          [four, fourThirty],
          [four, fourThirty],
          [],
        ]),
        timeZone: zone,
      }),
      "No time works for everyone. Tue 4:00–5:00 works for 3 of 4.",
    );
  });

  it("prefers the highest count, then the longest run, then the earliest run", () => {
    assert.equal(
      overlapSentence({
        slots: [four, six, sixThirty],
        votes: votes([
          [four, six, sixThirty],
          [four, six, sixThirty],
          [four],
          [],
        ]),
        timeZone: zone,
      }),
      "No time works for everyone. Tue 4:00 works for 3 of 4.",
    );

    assert.equal(
      overlapSentence({
        slots: [four, fourThirty, six],
        votes: votes(
          [
            [four, fourThirty, six],
            [four, fourThirty, six],
          ],
          ["Ada", "Bea"],
        ),
        timeZone: zone,
      }),
      "Tue 4:00–5:00 works for 2 people.",
    );

    assert.equal(
      overlapSentence({
        slots: [four, six],
        votes: votes(
          [
            [four, six],
            [four, six],
          ],
          ["Ada", "Bea"],
        ),
        timeZone: zone,
      }),
      "Tue 4:00 works for 2 people.",
    );
  });

  it("includes the date when a weekday repeats", () => {
    const nextTuesday = "2026-01-13T16:00:00.000Z";
    assert.equal(
      overlapSentence({
        slots: [four, nextTuesday],
        votes: votes(
          [
            [four, nextTuesday],
            [four, nextTuesday],
          ],
          ["Ada", "Bea"],
        ),
        timeZone: zone,
      }),
      "Tue, Jan 6, 4:00 works for 2 people.",
    );
  });

  it("names both days when a run crosses midnight", () => {
    const late = "2026-01-07T04:30:00.000Z";
    const midnight = "2026-01-07T05:00:00.000Z";
    assert.equal(
      overlapSentence({
        slots: [late, midnight],
        votes: votes(
          [
            [late, midnight],
            [late, midnight],
          ],
          ["Ada", "Bea"],
        ),
        timeZone: "America/New_York",
      }),
      "Tue 11:30 PM–Wed 12:30 AM works for 2 people.",
    );
  });

  it("says nobody matched when every mark is empty", () => {
    assert.equal(
      overlapSentence({
        slots: [four],
        votes: votes([[], []], ["Ada", "Bea"]),
        timeZone: zone,
      }),
      "No time works for everyone.",
    );
  });
});
