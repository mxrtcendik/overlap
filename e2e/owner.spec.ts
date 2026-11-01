import { createPoll, expect, test, TEST_TOKEN, vote } from "./fixtures";

test("picks a final time that voters can add to a calendar", async ({ page, request }) => {
  const { id, ownerToken, slots } = await createPoll(request);
  await vote(id, { name: "Ada", slots: slots.slice(0, 4) });
  await vote(id, { name: "Bruno", slots: slots.slice(2, 6) });

  await page.goto(`/o/${ownerToken}`);
  await page.getByRole("button", { name: "Pick" }).first().click();

  const final = page.locator("section", { has: page.getByRole("heading", { name: "Final time" }) });
  await expect(final).toContainText("1:00–2:00 PM");

  const ics = await request.get(`/p/${id}/event.ics`);
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  expect(await ics.text()).toContain("BEGIN:VEVENT");

  await page.goto(`/p/${id}`);
  await expect(page.getByRole("link", { name: "Google Calendar" })).toHaveAttribute("href", /calendar\.google\.com/);
});

test("closes voting and reopens it", async ({ page, browser, request }) => {
  const { id, ownerToken, slots } = await createPoll(request);
  await page.goto(`/o/${ownerToken}`);
  const voting = page.locator("section", { has: page.getByRole("heading", { name: "Voting" }) });

  await voting.getByRole("button", { name: "Close voting now" }).click();
  await expect(voting).toContainText("You closed voting");

  const refused = await request.post(`/p/${id}/vote`, { data: { name: "Late", slots: [slots[0]], "cf-turnstile-response": TEST_TOKEN } });
  expect(refused.status()).toBe(403);

  const voter = await (await browser.newContext({ locale: "en-US", timezoneId: "Europe/Istanbul" })).newPage();
  await voter.goto(`/p/${id}`);
  await expect(voter.getByText(/^Voting closed /)).toBeVisible();
  await expect(voter.getByLabel(/^Your name/)).toHaveCount(0);

  await voting.getByRole("button", { name: "Reopen voting" }).click();
  await expect(voting).toContainText("Voting is open until the last time ends");
  const accepted = await request.post(`/p/${id}/vote`, { data: { name: "Back", slots: [slots[0]], "cf-turnstile-response": TEST_TOKEN } });
  expect(accepted.ok()).toBe(true);
});

test("removes someone's answer from the owner page", async ({ page, request }) => {
  const { id, ownerToken, slots } = await createPoll(request);
  await vote(id, { name: "Spam", slots: slots.slice(0, 2) });

  await page.goto(`/o/${ownerToken}`);
  const answers = page.locator("section", { has: page.getByRole("heading", { name: "Answers" }) });
  await answers.getByRole("button", { name: "Remove Spam’s answer" }).click();
  await answers.getByRole("button", { name: "Remove", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Answers" })).toHaveCount(0);
});

test("emails both links to the owner", async ({ page, request }) => {
  const { ownerToken } = await createPoll(request);
  await page.goto(`/o/${ownerToken}`);
  const secret = page.locator("section", { has: page.getByRole("heading", { name: "Secret link" }) });

  await secret.getByLabel("Email me both links").fill("owner@example.com");
  await secret.getByRole("button", { name: "Send" }).click();

  await expect(secret.getByText("Sent to owner@example.com. We didn’t keep the address.")).toBeVisible();
});

test("refuses link emails without a token or a valid address", async ({ request }) => {
  const { ownerToken } = await createPoll(request);
  const noToken = await request.post(`/o/${ownerToken}/email`, { data: { email: "owner@example.com" } });
  expect(noToken.status()).toBe(403);
  const badAddress = await request.post(`/o/${ownerToken}/email`, {
    data: { email: "not an address", "cf-turnstile-response": TEST_TOKEN },
  });
  expect(badAddress.status()).toBe(400);
});

test("downloads the answers as a CSV in the owner's timezone", async ({ page, request }) => {
  const { id, ownerToken, slots } = await createPoll(request, { days: [1], from: 9, to: 10 });
  await vote(id, { name: "Ada", slots: [slots[0]], maybe: [slots[1]], note: "Remote only" });

  await page.goto(`/o/${ownerToken}`);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download as CSV" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("team-sync.csv");
  const csv = await (await import("node:fs/promises")).readFile(await file.path(), "utf8");
  const lines = csv.trim().split("\r\n");
  expect(lines[0]).toBe("Date,Start,End,Can make,If needed,Ada (Remote only)");
  expect(lines[1]).toMatch(/^\d{4}-\d{2}-\d{2},12:00,12:30,1,0,yes$/);
  expect(lines[2]).toMatch(/,12:30,13:00,0,1,if needed$/);
});
