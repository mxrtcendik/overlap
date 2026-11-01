import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CREATE_ACTION, judge, parseHostnames, readToken } from "../src/lib/turnstile-check";

const expected = { action: CREATE_ACTION, hostnames: ["overlap.example.com"], allowTestKeys: false };
const pass = { success: true, action: CREATE_ACTION, hostname: "overlap.example.com" };

describe("readToken", () => {
  it("takes a non-empty string up to 2048 characters", () => {
    assert.equal(readToken("abc"), "abc");
    assert.equal(readToken("x".repeat(2048))?.length, 2048);
  });

  it("refuses anything else", () => {
    for (const input of [undefined, null, "", 42, ["abc"], "x".repeat(2049)]) {
      assert.equal(readToken(input), null);
    }
  });
});

describe("judge", () => {
  it("passes a successful result for the right action and hostname", () => {
    assert.equal(judge(pass, expected), true);
  });

  it("fails an unsuccessful result", () => {
    assert.equal(judge({ ...pass, success: false }, expected), false);
    assert.equal(judge({ action: CREATE_ACTION, hostname: "overlap.example.com" }, expected), false);
  });

  it("fails a token minted for another action", () => {
    assert.equal(judge({ ...pass, action: "login" }, expected), false);
    assert.equal(judge({ ...pass, action: undefined }, expected), false);
  });

  it("fails a token from a hostname not on the list", () => {
    assert.equal(judge({ ...pass, hostname: "evil.example.com" }, expected), false);
    assert.equal(judge({ ...pass, hostname: undefined }, expected), false);
    assert.equal(judge(pass, { ...expected, hostnames: [] }), false);
  });

  it("accepts Cloudflare's test keys only when allowed", () => {
    const testing = { success: true, hostname: "example.com", metadata: { result_with_testing_key: true } };
    assert.equal(judge(testing, expected), false);
    assert.equal(judge(testing, { ...expected, allowTestKeys: true }), true);
    assert.equal(judge({ ...testing, success: false }, { ...expected, allowTestKeys: true }), false);
  });
});

describe("parseHostnames", () => {
  it("splits, trims and lowercases a comma-separated list", () => {
    assert.deepEqual(parseHostnames(" Overlap.app, www.overlap.app ,,"), ["overlap.app", "www.overlap.app"]);
  });

  it("is empty when unset", () => {
    assert.deepEqual(parseHostnames(undefined), []);
    assert.deepEqual(parseHostnames(""), []);
  });
});
