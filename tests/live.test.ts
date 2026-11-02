import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EDITING, isSameOrigin, livePollId, parseLiveMessage, presenceMessage, reconnectDelay } from "../src/lib/live";

const id = "AbCdEfGhIjKlMnOpQrStUv";

describe("livePollId", () => {
  it("reads the poll id from the live path", () => {
    assert.equal(livePollId(`/p/${id}/live`), id);
    assert.equal(livePollId(`/p/${id}/live/`), id);
  });

  it("ignores other paths", () => {
    assert.equal(livePollId(`/p/${id}`), null);
    assert.equal(livePollId(`/p/${id}/vote`), null);
    assert.equal(livePollId(`/o/${id}/live`), null);
    assert.equal(livePollId(`/p/${id}/live/extra`), null);
  });

  it("refuses ids that can't be poll ids", () => {
    assert.equal(livePollId("/p/short/live"), null);
    assert.equal(livePollId("/p/has%20space-padding-padding/live"), null);
  });
});

describe("isSameOrigin", () => {
  it("accepts the page's own origin", () => {
    assert.equal(isSameOrigin("https://overlap.example/p/x/live", "https://overlap.example"), true);
    assert.equal(isSameOrigin("http://localhost:8787/p/x/live", "http://localhost:8787"), true);
  });

  it("refuses other origins, ports and missing values", () => {
    assert.equal(isSameOrigin("https://overlap.example/p/x/live", "https://evil.example"), false);
    assert.equal(isSameOrigin("http://localhost:8787/p/x/live", "http://localhost:3000"), false);
    assert.equal(isSameOrigin("https://overlap.example/p/x/live", null), false);
    assert.equal(isSameOrigin("https://overlap.example/p/x/live", "null"), false);
  });
});

describe("reconnectDelay", () => {
  const middle = () => 0.5;

  it("doubles from one second", () => {
    assert.deepEqual([0, 1, 2, 3].map((attempt) => reconnectDelay(attempt, middle)), [1000, 2000, 4000, 8000]);
  });

  it("stops at five minutes", () => {
    assert.equal(reconnectDelay(30, middle), 300_000);
  });

  it("spreads retries by up to a fifth either way", () => {
    assert.equal(reconnectDelay(0, () => 0), 800);
    assert.equal(reconnectDelay(0, () => 1), 1200);
  });
});

describe("parseLiveMessage", () => {
  it("reads the three messages the room sends", () => {
    assert.deepEqual(parseLiveMessage(JSON.stringify({ type: "changed" })), { type: "changed" });
    assert.deepEqual(parseLiveMessage(EDITING), { type: "editing" });
    assert.deepEqual(parseLiveMessage(presenceMessage(3)), { type: "presence", here: 3 });
  });

  it("ignores anything else", () => {
    for (const data of ["pong", "{", JSON.stringify({ type: "presence", here: -1 }), JSON.stringify({ type: "presence", here: 1.5 }), JSON.stringify({ type: "other" }), 42, "x".repeat(300)]) {
      assert.equal(parseLiveMessage(data), null);
    }
  });
});
