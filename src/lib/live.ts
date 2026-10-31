import { isToken } from "./tokens";

export const CHANGED = JSON.stringify({ type: "changed" });

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
