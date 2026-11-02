import { test, expect, createPoll } from "./fixtures";

test("Ctrl+Z runs Undo last mark", async ({ page, request }) => {
  const poll = await createPoll(request);
  await page.goto(`/p/${poll.id}`);
  const cells = page.locator("tbody .slot");
  const marked = page.locator('tbody .slot[aria-pressed="true"]');

  await cells.nth(0).click();
  await cells.nth(1).click();
  await expect(marked).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Undo last mark" })).toHaveAttribute("aria-keyshortcuts", "Control+Z Meta+Z");

  await page.locator("body").press("Control+z");
  await expect(marked).toHaveCount(1);
  await expect(cells.nth(1)).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Undo last mark" })).toHaveCount(0);
});

test("leaves Ctrl+Z alone while typing in a field", async ({ page, request }) => {
  const poll = await createPoll(request);
  await page.goto(`/p/${poll.id}`);
  await page.locator("tbody .slot").first().click();
  const name = page.getByLabel(/^Your name/);
  await name.fill("Ada");
  await name.press("Control+z");
  await expect(page.locator('tbody .slot[aria-pressed="true"]')).toHaveCount(1);
});
