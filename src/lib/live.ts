import { isToken } from "./tokens";

export const CHANGED = JSON.stringify({ type: "changed" });

/** Sent by a page while its visitor drags on the grid; relayed to the other pages. */
export const EDITING = JSON.stringify({ type: "editing" });
export const EDITING_EVERY_MS = 2_500;
export const EDITING_SHOWN_MS = 4_000;

export function presenceMessage(here: number): string {
  return JSON.stringify({ type: "presence", here });
}

export type LiveMessage = { type: "changed" } | { type: "editing" } | { type: "presence"; here: number };

/** Reads a message from the room. Anything unexpected is ignored. */
export function parseLiveMessage(data: unknown): LiveMessage | null {
  if (typeof data !== "string" || data.length > 200) return null;
  try {
    const value = JSON.parse(data) as { type?: unknown; here?: unknown };
    if (value.type === "changed" || value.type === "editing") return { type: value.type };
    if (value.type === "presence" && Number.isInteger(value.here) && (value.here as number) >= 0) {
      return { type: "presence", here: value.here as number };
    }
  } catch {}
  return null;
}

export const PING = "ping";
export const PONG = "pong";
export const PING_EVERY_MS = 30_000;
export const SILENT_LIMIT_MS = 75_000;

export const POLL_EVERY_MS = 20_000;
export const REFRESH_DEBOUNCE_MS = 250;
export const STALE_AFTER_HIDDEN_MS = 60_000;

export const MAX_SOCKETS = 200;

export function livePollId(pathname: string): string | null {
  const match = /^\/p\/([^/]+)\/live\/?$/.exec(pathname);
  return match && isToken(match[1]) ? match[1] : null;
}

export function isSameOrigin(requestUrl: string, origin: string | null): boolean {
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(requestUrl).host;
  } catch {
    return false;
  }
}

export function reconnectDelay(attempt: number, random = Math.random): number {
  const base = Math.min(1000 * 2 ** Math.max(0, attempt), 300_000);
  return Math.round(base * (0.8 + random() * 0.4));
}
