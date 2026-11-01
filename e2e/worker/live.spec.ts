import { createPoll, expect, test, vote } from "../fixtures";

test("pushes a new answer to an open page over the WebSocket", async ({ page, request }) => {
  const { id, slots } = await createPoll(request);
  const socket = page.waitForEvent("websocket", (ws) => ws.url().endsWith(`/p/${id}/live`));
  await page.goto(`/p/${id}`);
  await socket;
  await expect(page.getByText("No answers yet. Be the first.")).toBeVisible();

  await vote(id, { name: "Ada", slots: slots.slice(0, 2) });

  await expect(page.getByText("Only Ada has answered so far.")).toBeVisible({ timeout: 8_000 });
});

test("refuses sockets for polls that don't exist and from other sites", async ({ request }) => {
  const upgrade = { Connection: "Upgrade", Upgrade: "websocket", "Sec-WebSocket-Version": "13", "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==" };
  const missing = await request.get("/p/AAAAAAAAAAAAAAAAAAAAAA/live", { headers: { ...upgrade, Origin: "http://localhost:8787" } });
  expect(missing.status()).toBe(404);
  const { id } = await createPoll(request);
  const foreign = await request.get(`/p/${id}/live`, { headers: { ...upgrade, Origin: "https://evil.example" } });
  expect(foreign.status()).toBe(403);
});
