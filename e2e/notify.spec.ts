import { createPoll, expect, test, vote } from "./fixtures";

test("the owner asks to hear about new answers, and can stop", async ({ page, request }) => {
  const { ownerToken } = await createPoll(request);
  await page.goto(`/o/${ownerToken}`);
  await page.locator("tbody .slot").first().waitFor();

  await page.getByLabel("Email me when someone answers").fill("owner@example.com");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("New answers are emailed to owner@example.com.")).toBeVisible();

  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByLabel("Email me when someone answers")).toBeVisible();
});

test("a voter asks for the final time, and the owner never sees the address", async ({ page, request }) => {
  const { id, ownerToken, slots } = await createPoll(request);
  await page.goto(`/p/${id}`);
  await page.getByLabel(/^Your name/).fill("Ada");
  await page.locator("tbody .slot").first().click();
  await page.getByRole("button", { name: "Save answer" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();

  await page.getByLabel("Email me the final time").fill("ada@example.com");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("The final time will be emailed to ada@example.com.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("The final time will be emailed to ada@example.com.")).toBeVisible();

  const owner = await (await request.get(`/o/${ownerToken}`)).text();
  expect(owner).not.toContain("ada@example.com");
  await vote(id, { name: "Bruno", slots: [slots[0]] });
  const other = await (await request.get(`/p/${id}`)).text();
  expect(other).not.toContain("ada@example.com");
});

test("asking for the final time needs a saved answer and a real address", async ({ request }) => {
  const { id } = await createPoll(request);
  const anonymous = await request.post(`/p/${id}/notify`, { data: { email: "x@example.com" } });
  expect(anonymous.status()).toBe(404);
});
