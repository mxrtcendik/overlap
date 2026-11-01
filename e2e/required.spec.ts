import { createPoll, expect, test, vote } from "./fixtures";

test("the owner marks someone who must be there, and the best time follows them", async ({ page, request }) => {
  const { id, ownerToken, slots } = await createPoll(request, { days: [1], from: 9, to: 12 });
  await vote(id, { name: "Ada", slots: slots.slice(0, 2) });
  await vote(id, { name: "Bruno", slots: slots.slice(0, 2) });
  await vote(id, { name: "Chen", slots: slots.slice(4, 6) });

  await page.goto(`/p/${id}`);
  const sentence = page.locator("p[aria-live=polite]").first();
  await expect(sentence).toContainText("12:00–1:00 PM, 2 of 3 people.");

  const owner = await page.context().newPage();
  await owner.goto(`/o/${ownerToken}`);
  await owner.locator("tbody .slot").first().waitFor();
  const answers = owner.locator("section", { has: owner.getByRole("heading", { name: "Answers" }) });
  const saved = owner.waitForResponse((response) => response.url().includes("/answers/") && response.request().method() === "PATCH");
  await answers.locator("li", { hasText: "Chen" }).getByLabel("Must be there").check();
  expect((await saved).ok()).toBe(true);

  await page.reload();
  await expect(sentence).toHaveText(/^No time works for everyone yet\. Closest that suits Chen: .*2:00–3:00 PM, 1 of 3 people\.$/);
  await expect(page.getByRole("button", { name: /^Chen\./ })).toContainText("required");
});

test("refuses a required flag that isn't true or false", async ({ request }) => {
  const { id, ownerToken, slots } = await createPoll(request);
  await vote(id, { name: "Ada", slots: slots.slice(0, 1) });
  const page = await request.get(`/o/${ownerToken}`);
  const ref = /answers\/([0-9a-f]{16})/.exec(await page.text())?.[1] ?? (await refFromOwnerPage(request, ownerToken));
  const response = await request.patch(`/o/${ownerToken}/answers/${ref}`, { data: { required: "yes" } });
  expect(response.status()).toBe(400);
});

async function refFromOwnerPage(request: import("@playwright/test").APIRequestContext, token: string): Promise<string> {
  const html = await (await request.get(`/o/${token}`)).text();
  const match = /\\"ref\\":\\"([0-9a-f]{16})\\"/.exec(html) ?? /"ref":"([0-9a-f]{16})"/.exec(html);
  if (!match) throw new Error("no answer ref on the owner page");
  return match[1];
}
