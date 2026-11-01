import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { optionSummary, parseOptions, rankOptions } from "../src/lib/poll/options";
import { summaryParts } from "../src/lib/poll/sentence";

const now = Date.parse("2026-11-01T12:00:00Z");
const at = (day: number, hour: number) => new Date(Date.UTC(2026, 10, day, hour)).toISOString();
const options = [
  { start: at(3, 18), end: at(3, 20) },
  { start: at(5, 19), end: at(5, 21) },
  { start: at(6, 17), end: at(6, 18) },
];

describe("parseOptions", () => {
  it("accepts two to twenty future times and sorts them", () => {
    const result = parseOptions([options[1], options[0]], now);
    assert.deepEqual(result, { ok: true, options: [options[0], options[1]] });
  });

  it("refuses too few, overlapping starts, odd minutes and backwards times", () => {
    assert.equal(parseOptions([options[0]], now).ok, false);
    assert.equal(parseOptions([options[0], { ...options[0] }], now).ok, false);
    assert.equal(parseOptions([options[0], { start: "2026-11-04T18:15:00Z", end: at(4, 19) }], now).ok, false);
    assert.equal(parseOptions([options[0], { start: at(4, 19), end: at(4, 18) }], now).ok, false);
    assert.equal(parseOptions([options[0], { start: at(4, 0), end: at(4, 13) }], now).ok, false);
    assert.equal(parseOptions(Array.from({ length: 21 }, (_, i) => ({ start: at(7, i % 24), end: at(7, (i % 24) + 1) })), now).ok, false);
  });

  it("refuses times that have all passed", () => {
    assert.equal(parseOptions([{ start: at(1, 8), end: at(1, 9) }, { start: at(1, 9), end: at(1, 10) }], now).ok, false);
  });
});

describe("ranking options", () => {
  const votes = [
    { name: "Ada", slots: [options[0].start, options[1].start] },
    { name: "Bruno", slots: [options[1].start], maybe: [options[0].start] },
    { name: "Chen", slots: [options[2].start], maybe: [options[1].start] },
  ];

  it("prefers the most people, then the fewest if-needed answers", () => {
    const ranked = rankOptions(options, votes);
    assert.equal(ranked[0].option.start, options[1].start);
    assert.deepEqual(ranked[0].yes, [0, 1]);
    assert.deepEqual(ranked[0].maybe, [2]);
  });

  it("follows the people who must be there", () => {
    const withChen = votes.map((vote) => (vote.name === "Chen" ? { ...vote, required: true } : vote));
    assert.ok(rankOptions(options, withChen).every((result) => result.yes.includes(2) || result.maybe.includes(2)));
  });

  it("sums it up in one sentence", () => {
    const summary = optionSummary({ options, votes, timeZone: "UTC" });
    const { before, when, after } = summaryParts(summary);
    assert.equal(`${before}${when}${after}`, "Thu, Nov 5, 7:00–9:00 PM works for everyone, 1 if needed.");
  });
});
