import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { topSegments, topWindows } from "../src/lib/poll/availability";
import { bestTime, nameList, overlapSentence } from "../src/lib/poll/sentence";

const slot = (hour: number, minute = 0) => new Date(Date.UTC(2026, 10, 2, hour, minute)).toISOString();
const slots = [9, 9.5, 10, 10.5, 11, 11.5].map((h) => slot(Math.floor(h), (h % 1) * 60));

const votes = [
  { name: "Ada", slots: slots.slice(0, 2) },
  { name: "Bruno", slots: slots.slice(0, 2) },
  { name: "Chen", slots: slots.slice(4, 6), required: true },
  { name: "Dilan", slots: slots.slice(3, 6) },
];

describe("people who must be there", () => {
  it("only offers times that include them", () => {
    for (const segment of topSegments(slots, votes)) assert.ok(segment.people.includes(2));
    for (const window of topWindows(slots, votes, 60)) assert.ok(window.people.includes(2));
  });

  it("picks their time over a bigger crowd elsewhere", () => {
    const best = bestTime(slots, votes);
    assert.equal(best?.start, Date.parse(slot(11)));
    assert.equal(best?.end, Date.parse(slot(12)));
  });

  it("says whose time it chose", () => {
    assert.equal(
      overlapSentence({ slots, votes, timeZone: "UTC" }),
      "No time works for everyone yet. Closest that suits Chen: Mon 11:00 AM–12:00 PM, 2 of 4 people.",
    );
  });

  it("says when the required people have nothing in common", () => {
    const clash = votes.map((vote) => (vote.name === "Ada" ? { ...vote, required: true } : vote));
    assert.equal(
      overlapSentence({ slots, votes: clash, timeZone: "UTC" }),
      "Ada and Chen must be there, but they have no time in common yet.",
    );
  });

  it("says when a required person hasn't marked anything", () => {
    const empty = [...votes.filter((vote) => !vote.required), { name: "Elif", slots: [], required: true }];
    assert.equal(overlapSentence({ slots, votes: empty, timeZone: "UTC" }), "Elif must be there but hasn’t marked any times yet.");
  });

  it("joins names the way people write them", () => {
    assert.equal(nameList(["Ada"]), "Ada");
    assert.equal(nameList(["Ada", "Bruno"]), "Ada and Bruno");
    assert.equal(nameList(["Ada", "Bruno", "Chen"]), "Ada, Bruno and Chen");
  });
});
