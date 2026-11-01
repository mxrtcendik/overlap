import { createPoll, expect, test, vote } from "./fixtures";

test("answers with a name and a note, then edits and removes the answer", async ({ page, request }) => {
  const { id } = await createPoll(request);
  await page.goto(`/p/${id}`);

  await page.getByLabel(/^Your name/).fill("Ada");
  await page.getByLabel(/^Note/).fill("Remote only");
  await page.locator(".slot").first().click();
  await page.getByRole("button", { name: "Save answer" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Ada, you, “Remote only”/ })).toBeVisible();

  await page.getByLabel(/^Note/).fill("Remote, after 10");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("button", { name: "Save note" })).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(/^Note/)).toHaveValue("Remote, after 10");

  await page.getByRole("button", { name: "Remove my answer" }).click();
  await page.getByRole("button", { name: "Remove answer" }).click();
  await expect(page.getByLabel(/^Your name/)).toHaveValue("Ada");
  await expect(page.getByRole("button", { name: "Save answer" })).toBeVisible();
  await expect(page.getByText("No answers yet. Be the first.")).toBeVisible();

  await page.locator(".slot").nth(1).click();
  await page.getByRole("button", { name: "Save answer" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
});

test("names the time that works for everyone", async ({ page, request }) => {
  const { id, slots } = await createPoll(request);
  await vote(id, { name: "Ada", slots: slots.slice(0, 4) });
  await vote(id, { name: "Bruno", slots: slots.slice(2, 6) });

  await page.goto(`/p/${id}`);

  await expect(page.locator("p[aria-live=polite]").first()).toHaveText(/1:00–2:00 PM works for everyone\./);
  await expect(page.getByRole("heading", { name: "2 people answered" })).toBeVisible();
});

test("fills in free times from a calendar file", async ({ page, request }) => {
  const { id, slots } = await createPoll(request, { days: [1], from: 9, to: 12 });
  const stamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//e2e//EN",
    "BEGIN:VEVENT",
    "UID:meeting@e2e",
    "DTSTAMP:20260101T000000Z",
    `DTSTART:${stamp(slots[2])}`,
    `DTEND:${stamp(slots[4])}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  await page.goto(`/p/${id}`);
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Fill in from your calendar" }).click();
  await (await chooser).setFiles({ name: "work.ics", mimeType: "text/calendar", buffer: Buffer.from(ics) });

  await expect(page.getByText("1 event from your calendar falls on these days. You look free for 4 of 6 times.")).toBeVisible();
  await page.getByRole("button", { name: "Mark the free times" }).click();
  await expect(page.locator('.slot[aria-pressed="true"]')).toHaveCount(4);
});
