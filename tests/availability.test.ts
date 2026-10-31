import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { topSegments } from "../src/lib/availability";

const at = (hour: number, minute = 0) => new Date(Date.UTC(2030, 0, 7, hour, minute)).toISOString();
const slots = [at(9), at(9, 30), at(10), at(10, 30), at(11), at(11, 30)];

describe("topSegments", () => {
  it("returns nothing when no one has answered", () => {
    assert.deepEqual(topSegments(slots, []), []);
  });

  it("merges neighbouring slots with the same people", () => {
    const [best] = topSegments(slots, [{ slots: [at(9), at(9, 30), at(10)] }, { slots: [at(9), at(9, 30)] }]);
    assert.deepEqual(best.slots, [at(9), at(9, 30)]);
    assert.deepEqual(best.people, [0, 1]);
  });

  it("splits a stretch when the people change, even if the count does not", () => {
    const segments = topSegments(slots, [{ slots: [at(9), at(9, 30)] }, { slots: [at(10), at(10, 30)] }]);
    assert.equal(segments.length, 2);
    assert.deepEqual(
      segments.map((segment) => segment.people),
      [[0], [1]],
    );
  });

  it("ranks by people, then length, then the earliest start", () => {
    const voters = [
      { slots: [at(9), at(11), at(11, 30)] },
      { slots: [at(9), at(10), at(10, 30), at(11), at(11, 30)] },
    ];
    const segments = topSegments(slots, voters);
    assert.deepEqual(segments[0].slots, [at(11), at(11, 30)]);
    assert.deepEqual(segments[1].slots, [at(9)]);
    assert.deepEqual(segments[2].slots, [at(10), at(10, 30)]);
  });

  it("does not join slots across a gap in time", () => {
    const gapped = [at(9), at(10)];
    const segments = topSegments(gapped, [{ slots: gapped }]);
    assert.equal(segments.length, 2);
  });

  it("respects the limit", () => {
    const voters = [{ slots: [at(9)] }, { slots: [at(10)] }, { slots: [at(11)] }];
    assert.equal(topSegments(slots, voters, 2).length, 2);
  });
});
