import { expect, test, TEST_TOKEN } from "./fixtures";

function at(daysAhead: number, hourUtc: number): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysAhead, hourUtc)).toISOString();
}

test("offers set times, collects yes and if-needed answers, and the owner picks one", async ({ page, browser, request }) => {
  await page.goto("/");
  await page.getByLabel("Title").fill("Team dinner");
  await page.getByRole("button", { name: "Set times" }).click();
  await expect(page.getByText("Times to choose from")).toBeVisible();
  await page.getByRole("button", { name: "Add another time" }).click();
  await expect(page.getByLabel("Day")).toHaveCount(3);
  await page.getByRole("button", { name: "Create poll" }).click();
  await expect(page).toHaveURL(/\/o\//);
  const ownerUrl = page.url();
  const publicUrl = (await page.getByText(/^http:\/\/localhost:\d+\/p\/[\w-]+$/).first().textContent())!.trim();

  for (const [name, answers] of [
    ["Ada", ["Yes", "Yes", "No"]],
    ["Bruno", ["If needed", "Yes", "No"]],
  ] as const) {
    const voter = await (await browser.newContext({ locale: "en-US", timezoneId: "Europe/Istanbul" })).newPage();
    await voter.goto(publicUrl);
    await voter.getByLabel(/^Your name/).fill(name);
    const groups = voter.getByRole("group", { name: /^Your answer for / });
    await expect(groups).toHaveCount(3);
    for (const [index, label] of answers.entries()) {
      await groups.nth(index).getByRole("button", { name: label, exact: true }).click();
    }
    await voter.getByRole("button", { name: "Save answer" }).click();
    await expect(voter.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
    await voter.close();
  }

  await page.goto(ownerUrl);
  await expect(page.locator("p[aria-live=polite]").first()).toContainText("works for everyone.");
  const rows = page.locator("ul li", { hasText: "/2" });
  await expect(rows.nth(1)).toContainText("Best");
  await rows.nth(1).getByRole("button", { name: "Pick" }).click();
  await expect(rows.nth(1)).toContainText("Final time");

  const id = publicUrl.split("/p/")[1];
  const ics = await (await request.get(`/p/${id}/event.ics`)).text();
  expect(ics).toContain("BEGIN:VEVENT");
});

test("the server checks the offered times", async ({ request }) => {
  const post = (options: unknown) =>
    request.post("/api/polls", { data: { title: "Times", kind: "options", options, "cf-turnstile-response": TEST_TOKEN } });

  expect((await post([{ start: at(1, 18), end: at(1, 19) }])).status()).toBe(400);
  expect((await post([{ start: at(1, 18), end: at(1, 17) }, { start: at(2, 18), end: at(2, 19) }])).status()).toBe(400);
  const ok = await post([{ start: at(2, 18), end: at(2, 20) }, { start: at(1, 18), end: at(1, 19) }]);
  expect(ok.ok()).toBe(true);
  const { ownerToken } = await ok.json();

  const wrongFinal = await request.patch(`/o/${ownerToken}/edit`, { data: { final: { start: at(1, 18), end: at(1, 20) } } });
  expect(wrongFinal.status()).toBe(400);
  const rightFinal = await request.patch(`/o/${ownerToken}/edit`, { data: { final: { start: at(1, 18), end: at(1, 19) } } });
  expect(rightFinal.ok()).toBe(true);
});
