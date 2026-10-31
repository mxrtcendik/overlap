import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSlots } from "../src/lib/slots";
import { cleanText } from "../src/lib/text";

function day(offset: number, hour = 15): string {
  return new Date(Date.UTC(2026, 0, 1 + offset, hour, 0, 0)).toISOString();
}

function range(startHour: number, count: number): string[] {
  const start = Date.UTC(2026, 0, 6, startHour, 0, 0);
  return Array.from({ length: count }, (_, index) => new Date(start + index * 30 * 60 * 1000).toISOString());
}

describe("parseSlots", () => {
  it("accepts 14 days of 30-minute slots", () => {
    const slots = Array.from({ length: 14 }, (_, index) => day(index * 2));
    const parsed = parseSlots(slots);
    assert.equal(parsed.ok, true);
  });

  it("accepts a 12 hour range", () => {
    const parsed = parseSlots(range(8, 24));
    assert.equal(parsed.ok, true);
  });

  it("rejects a 15th day", () => {
    const parsed = parseSlots(Array.from({ length: 15 }, (_, index) => day(index * 2)));
    assert.deepEqual(parsed, { ok: false, error: "Pick up to 14 days." });
  });

  it("rejects a range over 12 hours", () => {
    const parsed = parseSlots(range(8, 25));
    assert.deepEqual(parsed, { ok: false, error: "The time window can be up to 12 hours." });
  });

  it("rejects a gap that is not a 30-minute step", () => {
    const parsed = parseSlots(["2026-01-06T15:00:00.000Z", "2026-01-06T15:15:00.000Z"]);
    assert.deepEqual(parsed, { ok: false, error: "Times must fall on the hour or half hour." });
  });

  it("rejects an empty selection", () => {
    assert.deepEqual(parseSlots([]), { ok: false, error: "Pick at least one day." });
  });
});

describe("cleanText", () => {
  it("trims and limits length", () => {
    assert.equal(cleanText("  Ada   Lovelace  ", 40), "Ada Lovelace");
    assert.equal(cleanText("   ", 40), null);
    assert.equal(cleanText("a".repeat(41), 40), null);
    assert.equal(cleanText("a".repeat(80), 80), "a".repeat(80));
  });
});
