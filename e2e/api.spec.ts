import { expect, slotsFor, test, TEST_TOKEN } from "./fixtures";

test("refuses to create a poll without a Turnstile token", async ({ request }) => {
  const response = await request.post("/api/polls", { data: { title: "Bot", slots: slotsFor() } });
  expect(response.status()).toBe(403);
});

test("refuses a weekly poll that spans more than a week", async ({ request }) => {
  const response = await request.post("/api/polls", {
    data: { title: "Too wide", kind: "weekly", slots: slotsFor({ days: [1, 9] }), "cf-turnstile-response": TEST_TOKEN },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).error).toBe("A weekly poll covers one week.");
});

test("sends security headers and keeps polls out of search", async ({ request }) => {
  const home = await request.get("/");
  expect(home.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(home.headers()["x-frame-options"]).toBe("DENY");

  const poll = await request.get("/p/AAAAAAAAAAAAAAAAAAAAAA");
  expect(poll.status()).toBe(404);
  expect(poll.headers()["x-robots-tag"]).toContain("noindex");
});
