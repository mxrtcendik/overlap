import { createPoll, expect, test } from "./fixtures";

test("the theme switch overrides the system and survives a reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const light = await background();

  await page.getByRole("group", { name: "Theme" }).getByRole("button", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await background()).not.toBe(light);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("group", { name: "Theme" }).getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("group", { name: "Theme" }).getByRole("button", { name: "Auto" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
  expect(await background()).toBe(light);
});

test("the owner can show a QR code for the public link", async ({ page, request }) => {
  const { id, ownerToken } = await createPoll(request);
  await page.goto(`/o/${ownerToken}`);
  await page.locator("tbody .slot").first().waitFor();
  await page.getByRole("button", { name: "QR code" }).click();
  const code = page.getByRole("img", { name: /^QR code for http:\/\/localhost:\d+\/p\// });
  await expect(code).toBeVisible();
  expect(await code.getAttribute("aria-label")).toContain(`/p/${id}`);
  expect((await code.locator("path").getAttribute("d"))?.length).toBeGreaterThan(200);
});

test("copies a poll to a new week", async ({ page, request }) => {
  const { ownerToken } = await createPoll(request, { title: "Weekly sync", days: [1, 2], from: 9, to: 11 });
  await page.goto(`/o/${ownerToken}`);
  await page.locator("tbody .slot").first().waitFor();
  const firstBefore = await page.locator("tbody .slot").first().getAttribute("aria-label");

  await page.getByRole("button", { name: "Copy to a new week" }).click();
  await expect(page).not.toHaveURL(new RegExp(`/o/${ownerToken}$`));
  await expect(page).toHaveURL(/\/o\/[\w-]+/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Weekly sync");
  await page.locator("tbody .slot").first().waitFor();
  const firstAfter = await page.locator("tbody .slot").first().getAttribute("aria-label");
  expect(firstAfter).not.toBe(firstBefore);
  expect(firstAfter?.split(",")[0]).toBe(firstBefore?.split(",")[0]);
});
