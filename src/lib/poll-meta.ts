import "server-only";
import { headers } from "next/headers";
import type { StoredPoll } from "./polls";

export function pollDescription(poll: Pick<StoredPoll, "final" | "voters">): string {
  if (poll.final) return "The final time is set. Open the poll to add it to your calendar.";
  const count = poll.voters.length;
  if (count === 0) return "Mark when you’re free. No account needed.";
  return `${count} ${count === 1 ? "person has" : "people have"} answered. Add when you’re free.`;
}

export async function requestOrigin(): Promise<URL> {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const proto = list.get("x-forwarded-proto") ?? (local ? "http" : "https");
  return new URL(`${proto}://${host}`);
}
