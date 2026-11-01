import { dayLabel, expect, test } from "./fixtures";

test("creates a poll from the home page and lands on the secret link", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Title").fill("Quarterly planning");
  await page.getByRole("button", { name: dayLabel(1), exact: true }).click();
  await page.getByRole("button", { name: dayLabel(2), exact: true }).click();
  await expect(page.getByText(/^2 days:/)).toBeVisible();

  await page.getByRole("button", { name: "Create poll" }).click();

  await expect(page).toHaveURL(/\/o\/[\w-]+$/);
  await expect(page.getByRole("heading", { name: "Poll created" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quarterly planning");
  await expect(page.getByText(/^http:\/\/localhost:\d+\/p\/[\w-]+$/).first()).toBeVisible();
});

test("creates a weekly poll that asks about days of the week", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Title").fill("Running club");
  await page.getByRole("button", { name: "Days of the week" }).click();
  for (const day of ["Monday", "Wednesday", "Friday"]) {
    await page.getByRole("button", { name: day, exact: true }).click();
  }
  await expect(page.getByText("Every Monday, Wednesday, Friday")).toBeVisible();
  await page.getByLabel(/^From/).selectOption({ label: "6:00 PM" });
  await page.getByLabel(/^To/).selectOption({ label: "8:00 PM" });

  await page.getByRole("button", { name: "Create poll" }).click();

  await expect(page).toHaveURL(/\/o\//);
  await expect(page.locator("thead th").filter({ hasNotText: "Time" })).toHaveText(["Mon", "Wed", "Fri"]);
  await expect(page.getByText(/two months after the poll was made/)).toBeVisible();
});

test("asks for at least one day", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Title").fill("No days");
  await page.getByRole("button", { name: "Create poll" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Pick at least one day." })).toBeVisible();
});
