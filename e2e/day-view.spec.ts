import { createPoll, expect, test, vote } from "./fixtures";

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("long polls show one day at a time, starting on the best day", async ({ page, request }) => {
    const { id, slots } = await createPoll(request, { days: [1, 2, 3, 4, 5, 6, 7, 8], from: 9, to: 11 });
    const perDay = 4;
    await vote(id, { name: "Ada", slots: slots.slice(3 * perDay, 4 * perDay) });
    await vote(id, { name: "Bruno", slots: slots.slice(3 * perDay, 4 * perDay) });

    await page.goto(`/p/${id}`);
    const tabs = page.getByRole("tablist", { name: "Days" }).getByRole("tab");
    await expect(tabs).toHaveCount(8);
    await expect(tabs.nth(3)).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("thead th").filter({ hasNotText: "Time" })).toHaveCount(1);
    await expect(page.locator("tbody .slot").first()).toContainText("2");

    await tabs.nth(0).tap();
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("tbody .slot").first()).not.toContainText("2");

    await page.getByLabel(/^Your name/).fill("Chen");
    await page.locator("tbody .slot").first().tap();
    await page.getByRole("button", { name: "Save answer" }).tap();
    await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  });

  test("short polls keep the full grid", async ({ page, request }) => {
    const { id } = await createPoll(request, { days: [1, 2, 3], from: 9, to: 11 });
    await page.goto(`/p/${id}`);
    await page.locator("tbody .slot").first().waitFor();
    await expect(page.getByRole("tablist", { name: "Days" })).toHaveCount(0);
    await expect(page.locator("thead th").filter({ hasNotText: "Time" })).toHaveCount(3);
  });
});

test("desktop keeps every day side by side", async ({ page, request }) => {
  const { id } = await createPoll(request, { days: [1, 2, 3, 4, 5, 6, 7, 8], from: 9, to: 11 });
  await page.goto(`/p/${id}`);
  await page.locator("tbody .slot").first().waitFor();
  await expect(page.getByRole("tablist", { name: "Days" })).toHaveCount(0);
  await expect(page.locator("thead th").filter({ hasNotText: "Time" })).toHaveCount(8);
});
