import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answersCsv, csvCell } from "../src/lib/poll/csv";

describe("csvCell", () => {
  it("quotes commas, quotes and line breaks", () => {
    assert.equal(csvCell("plain"), "plain");
    assert.equal(csvCell("a, b"), '"a, b"');
    assert.equal(csvCell('say "hi"'), '"say ""hi"""');
    assert.equal(csvCell("two\nlines"), '"two\nlines"');
  });

  it("keeps spreadsheets from reading a name as a formula", () => {
    assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
    assert.equal(csvCell("+1"), "'+1");
    assert.equal(csvCell("@sum"), "'@sum");
  });
});

describe("answersCsv", () => {
  const slots = ["2026-11-02T09:00:00.000Z", "2026-11-02T09:30:00.000Z"];
  const voters = [
    { name: "Ada", note: "Remote only", slots: [slots[0]], maybe: [slots[1]] },
    { name: "Bruno", note: null, slots: [slots[0], slots[1]], maybe: [] },
  ];

  it("writes one row per time, in the chosen zone, with each person's answer", () => {
    assert.equal(
      answersCsv({ slots, voters, timeZone: "Europe/Istanbul" }),
      [
        "Date,Start,End,Can make,If needed,Ada (Remote only),Bruno",
        "2026-11-02,12:00,12:30,2,0,yes,yes",
        "2026-11-02,12:30,13:00,1,1,if needed,yes",
        "",
      ].join("\r\n"),
    );
  });

  it("names the weekday on weekly polls", () => {
    const csv = answersCsv({ slots, voters, timeZone: "UTC", weekly: true });
    assert.equal(csv.split("\r\n")[1], "Monday,09:00,09:30,2,0,yes,yes");
  });
});
