import { test, expect, createPoll } from "./fixtures";

test("the owner adds a call link to the final time, and everyone gets it", async ({ page, request }) => {
  const poll = await createPoll(request);
  const final = { start: poll.slots[0], end: new Date(Date.parse(poll.slots[1]) + 30 * 60_000).toISOString() };
  expect((await request.patch(`/o/${poll.ownerToken}/edit`, { data: { final } })).ok()).toBe(true);

  await page.goto(`/o/${poll.ownerToken}`);
  await page.getByRole("button", { name: "Add a place or video link" }).click();
  await page.getByLabel("Place or video link").fill("https://meet.example.com/team-sync");
  await page.getByRole("button", { name: "Save place" }).click();
  await expect(page.getByRole("link", { name: "Join on meet.example.com" })).toBeVisible();

  await page.goto(`/p/${poll.id}`);
  const join = page.getByRole("link", { name: "Join on meet.example.com" });
  await expect(join).toHaveAttribute("href", "https://meet.example.com/team-sync");
  await expect(join).toHaveAttribute("rel", /noopener/);
  const ics = await (await request.get(`/p/${poll.id}/event.ics`)).text();
  expect(ics).toContain("LOCATION:https://meet.example.com/team-sync");
});

test("plain text places show as text, not links", async ({ page, request }) => {
  const poll = await createPoll(request);
  await request.patch(`/o/${poll.ownerToken}/edit`, { data: { final: { start: poll.slots[0], end: poll.slots[1] } } });
  await request.patch(`/o/${poll.ownerToken}/edit`, { data: { place: "javascript:alert(1)" } });
  await page.goto(`/p/${poll.id}`);
  await expect(page.getByText("javascript:alert(1)")).toBeVisible();
  await expect(page.getByRole("link", { name: /Join on/ })).toHaveCount(0);
});
