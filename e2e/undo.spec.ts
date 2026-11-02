import { test, expect, createPoll } from "./fixtures";

test("undoes grid edits with Ctrl+Z and the Undo button", async ({ page, request }) => {
  const poll = await createPoll(request);
  await page.goto(`/p/${poll.id}`);
  const cells = page.locator("tbody .slot");
  await page.getByLabel(/^Your name/).fill("Ada");
  await cells.nth(0).click();
  await page.getByRole("button", { name: "Save answer" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();

  await cells.nth(1).click();
  await cells.nth(2).click();
  await expect(page.locator('tbody .slot[aria-pressed="true"]')).toHaveCount(3);

  await page.locator("body").press("Control+z");
  await expect(page.locator('tbody .slot[aria-pressed="true"]')).toHaveCount(2);
  await expect(cells.nth(2)).toHaveAttribute("aria-pressed", "false");

  const savedUndo = page.waitForResponse((response) => response.url().endsWith("/vote") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator('tbody .slot[aria-pressed="true"]')).toHaveCount(1);

  // Undo saves too: after a reload only the first time is still marked.
  await savedUndo;
  await page.reload();
  await expect(page.locator('tbody .slot[aria-pressed="true"]')).toHaveCount(1);
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
