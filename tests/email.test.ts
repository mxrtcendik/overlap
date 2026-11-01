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

import { finalTimeEmail, newAnswerEmail } from "../src/lib/email";

describe("notification emails", () => {
  it("names who answered and how many have", () => {
    const first = newAnswerEmail({ title: "Retro", name: "Ada", count: 1, publicUrl: "https://overlap.example.com/p/abc" });
    assert.equal(first.subject, "Ada answered “Retro”");
    assert.match(first.text, /That’s the first answer\./);
    const later = newAnswerEmail({ title: "Retro", name: "Bruno", count: 3, publicUrl: "https://overlap.example.com/p/abc" });
    assert.match(later.text, /That’s 3 answers so far\./);
  });

  it("states the final time and escapes the title", () => {
    const email = finalTimeEmail({ title: "<b>Retro</b>", day: "Tue, Nov 3", time: "2:00–3:00 PM", pollUrl: "https://overlap.example.com/p/abc" });
    assert.equal(email.subject, "“<b>Retro</b>” is set for Tue, Nov 3");
    assert.match(email.text, /Tue, Nov 3, 2:00–3:00 PM/);
    assert.ok(email.html.includes("&lt;b&gt;Retro&lt;/b&gt;"));
    assert.ok(!email.html.includes("<b>Retro</b>"));
  });
});
