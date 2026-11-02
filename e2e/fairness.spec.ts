import { test, expect, createPoll, vote } from "./fixtures";

test("says who the best time is late for, from each voter's timezone", async ({ page, request }) => {
  // Slots run 09:00–12:00 UTC tomorrow: 12:00–15:00 in Istanbul, 22:00–01:00 in Auckland.
  const poll = await createPoll(request, { days: [1], from: 9, to: 12 });
  const firstHour = poll.slots.slice(0, 2);
  await vote(poll.id, { name: "Kai", slots: firstHour, zone: "Pacific/Auckland" });
  await vote(poll.id, { name: "Ada", slots: firstHour, zone: "Europe/Istanbul" });

  await page.goto(`/p/${poll.id}`);
  await expect(page.getByText("works for everyone, though it’s 10:00 PM for Kai.")).toBeVisible();
  await expect(page.getByText("It’s 10:00 PM for Kai", { exact: true })).toBeVisible();
});

test("ignores a timezone it doesn't recognise", async ({ request }) => {
  const poll = await createPoll(request, { days: [1], from: 9, to: 12 });
  await vote(poll.id, { name: "Kai", slots: poll.slots.slice(0, 2), zone: "Mars/Olympus_Mons" });
  const page = await request.get(`/p/${poll.id}`);
  expect(page.ok()).toBe(true);
});
