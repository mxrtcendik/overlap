import { test as base, expect, request as playwrightRequest, type APIRequestContext } from "@playwright/test";

export const TEST_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
export const ZONE = "Europe/Istanbul";

function randomIp(): string {
  const part = () => Math.floor(Math.random() * 250) + 1;
  return `10.${part()}.${part()}.${part()}`;
}

export const test = base.extend({
  extraHTTPHeaders: async ({}, provide) => {
    await provide({ "x-forwarded-for": randomIp() });
  },
});

export { expect };

type PollOptions = {
  title?: string;
  days?: number[];
  from?: number;
  to?: number;
  kind?: "dates" | "weekly";
  duration?: number;
};

export function slotsFor({ days = [1, 2], from = 9, to = 12 }: PollOptions = {}): string[] {
  const now = new Date();
  const slots: string[] = [];
  for (const offset of days) {
    for (let minute = from * 60; minute < to * 60; minute += 30) {
      slots.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset, 0, minute)).toISOString());
    }
  }
  return slots;
}

export async function createPoll(
  request: APIRequestContext,
  options: PollOptions = {},
): Promise<{ id: string; ownerToken: string; slots: string[] }> {
  const slots = slotsFor(options);
  const response = await request.post("/api/polls", {
    data: {
      title: options.title ?? "Team sync",
      slots,
      kind: options.kind,
      duration: options.duration,
      "cf-turnstile-response": TEST_TOKEN,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return { ...(await response.json()), slots };
}

export async function vote(
  pollId: string,
  answer: { name: string; slots: string[]; maybe?: string[]; note?: string },
): Promise<void> {
  const voter = await playwrightRequest.newContext({
    baseURL: `http://localhost:${process.env.E2E_PORT ?? (process.env.E2E_TARGET === "worker" ? 8787 : 3000)}`,
    extraHTTPHeaders: { "x-forwarded-for": randomIp() },
  });
  const response = await voter.post(`/p/${pollId}/vote`, { data: { ...answer, "cf-turnstile-response": TEST_TOKEN } });
  expect(response.ok(), await response.text()).toBe(true);
  await voter.dispose();
}

export function dayLabel(offset: number): string {
  return new Date(Date.now() + offset * 86_400_000).toLocaleDateString("en-US", {
    timeZone: ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
