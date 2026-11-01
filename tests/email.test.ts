import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { linksEmail, readEmail } from "../src/lib/email";

describe("readEmail", () => {
  it("accepts ordinary addresses and trims them", () => {
    assert.equal(readEmail(" ada@example.com "), "ada@example.com");
    assert.equal(readEmail("first.last+polls@mail.co.uk"), "first.last+polls@mail.co.uk");
  });

  it("refuses what isn't one address", () => {
    for (const input of ["", "ada", "ada@", "@example.com", "ada@example", "a b@example.com", "a@b.com, c@d.com", "<a@b.com>", 42, null]) {
      assert.equal(readEmail(input), null, String(input));
    }
    assert.equal(readEmail(`${"a".repeat(250)}@example.com`), null);
  });
});

describe("linksEmail", () => {
  const email = linksEmail({
    title: `Retro <script>&"`,
    publicUrl: "https://overlap.example.com/p/abc",
    secretUrl: "https://overlap.example.com/o/secret",
  });

  it("names the poll in the subject", () => {
    assert.equal(email.subject, `Your links for “Retro <script>&"”`);
  });

  it("puts both links in the text", () => {
    assert.match(email.text, /https:\/\/overlap\.example\.com\/p\/abc/);
    assert.match(email.text, /https:\/\/overlap\.example\.com\/o\/secret/);
  });

  it("escapes the title in the HTML", () => {
    assert.ok(email.html.includes("Retro &lt;script&gt;&amp;&quot;"));
    assert.ok(!email.html.includes("<script>"));
  });
});
