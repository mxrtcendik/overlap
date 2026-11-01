import { createPoll, expect, test, TEST_TOKEN, vote } from "./fixtures";

test("ranks by the meeting length, and the owner can change it", async ({ page, request }) => {
  const { id, ownerToken, slots } = await createPoll(request, { days: [1], from: 9, to: 12, duration: 60 });
  await vote(id, { name: "Ada", slots: slots.slice(0, 4) });
  await vote(id, { name: "Bruno", slots: slots.slice(2, 6) });

  await page.goto(`/p/${id}`);
  await expect(page.locator("p[aria-live=polite]").first()).toHaveText("Mon 1:00–2:00 PM works for everyone.".replace("Mon", await weekday(page)));
  await expect(page.getByText("For a meeting of 1 hour.")).toBeVisible();

  await page.goto(`/o/${ownerToken}`);
  await page.getByLabel("Meeting length").selectOption({ label: "2 hours" });
  await expect(page.getByText("For a meeting of 2 hours.")).toBeVisible();
  await expect(page.locator("p[aria-live=polite]").first()).toContainText("No time works for everyone yet. Closest:");
});

test("refuses a length longer than the poll's hours", async ({ request }) => {
  const now = new Date();
  const day = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 9);
  const slots = [0, 1, 2, 3].map((index) => new Date(day + index * 1_800_000).toISOString());
  const response = await request.post("/api/polls", {
    data: { title: "Short", slots, duration: 150, "cf-turnstile-response": TEST_TOKEN },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).error).toBe("That’s longer than the hours on the poll.");
});

async function weekday(page: import("@playwright/test").Page): Promise<string> {
  return page.evaluate(() =>
    new Date(Date.now() + 86_400_000).toLocaleDateString("en-US", { timeZone: "Europe/Istanbul", weekday: "short" }),
  );
}
