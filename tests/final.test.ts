import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rangeLabel } from "../src/lib/sentence";
import { parseFinal } from "../src/lib/slots";

const at = (hour: number, minute = 0) => Date.UTC(2030, 0, 7, hour, minute);
const slots = [at(9), at(9, 30), at(10), at(11)].map((ms) => new Date(ms).toISOString());
const iso = (ms: number) => new Date(ms).toISOString();

describe("parseFinal", () => {
  it("clears with null", () => {
    assert.deepEqual(parseFinal(slots, null), { ok: true, final: null });
  });

  it("accepts an unbroken stretch of the poll's slots", () => {
    assert.deepEqual(parseFinal(slots, { start: iso(at(9)), end: iso(at(10, 30)) }), {
      ok: true,
      final: { start: at(9), end: at(10, 30) },
    });
  });

  it("rejects a stretch that crosses a gap", () => {
    assert.equal(parseFinal(slots, { start: iso(at(10)), end: iso(at(11, 30)) }).ok, false);
  });

  it("rejects times that are not on the poll, empty ranges and bad input", () => {
    assert.equal(parseFinal(slots, { start: iso(at(8)), end: iso(at(9)) }).ok, false);
    assert.equal(parseFinal(slots, { start: iso(at(9)), end: iso(at(9)) }).ok, false);
    assert.equal(parseFinal(slots, { start: iso(at(9)), end: iso(at(9, 10)) }).ok, false);
    assert.equal(parseFinal(slots, { start: "soon", end: "later" }).ok, false);
    assert.equal(parseFinal(slots, "9am").ok, false);
  });
});

describe("rangeLabel", () => {
  it("keeps one period when both ends share it", () => {
    assert.deepEqual(rangeLabel(at(14), at(15), "UTC"), { day: "Mon, Jan 7", time: "2:00–3:00 PM" });
  });

  it("names both periods across noon", () => {
    assert.equal(rangeLabel(at(11, 30), at(12, 30), "UTC").time, "11:30 AM–12:30 PM");
  });

  it("treats a range ending at midnight as one day", () => {
    assert.deepEqual(rangeLabel(at(23, 30), at(24), "UTC"), { day: "Mon, Jan 7", time: "11:30 PM–12:00 AM" });
  });

  it("names both days when a range crosses midnight", () => {
    assert.equal(rangeLabel(at(23), at(25), "UTC").time, "11:00 PM – Tue, Jan 8, 1:00 AM");
  });
});
