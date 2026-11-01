import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDeadline } from "../src/lib/poll/deadline";

const now = Date.parse("2026-11-02T12:00:00Z");
const lastEnd = Date.parse("2026-11-06T17:00:00Z");
const context = { now, lastEnd };

describe("parseDeadline", () => {
  it("closes voting now", () => {
    assert.deepEqual(parseDeadline("now", context), { ok: true, deadline: now, closesAt: now });
  });

  it("sets a deadline that is ahead and before the last time ends", () => {
    const at = "2026-11-04T09:00:00.000Z";
    assert.deepEqual(parseDeadline(at, context), { ok: true, deadline: Date.parse(at), closesAt: Date.parse(at) });
  });

  it("refuses a deadline in the past or at this moment", () => {
    for (const at of ["2026-11-01T09:00:00Z", new Date(now).toISOString()]) {
      const result = parseDeadline(at, context);
      assert.equal(result.ok, false);
      assert.equal(!result.ok && result.status, 400);
    }
  });

  it("refuses a deadline at or after the last time ends", () => {
    for (const at of [new Date(lastEnd).toISOString(), "2026-11-09T09:00:00Z"]) {
      assert.equal(parseDeadline(at, context).ok, false);
    }
  });

  it("refuses what isn't a time", () => {
    for (const input of ["soon", "", 42, {}, undefined, true]) {
      const result = parseDeadline(input, context);
      assert.equal(result.ok, false);
      assert.equal(!result.ok && result.status, 400);
    }
  });

  it("reopens voting until the last time ends", () => {
    assert.deepEqual(parseDeadline(null, context), { ok: true, deadline: null, closesAt: lastEnd });
  });

  it("won't reopen once the last time has passed", () => {
    const result = parseDeadline(null, { now: lastEnd + 1, lastEnd });
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.status, 409);
  });
});
