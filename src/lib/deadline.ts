export type DeadlineResult =
  | { ok: true; deadline: number | null; closesAt: number }
  | { ok: false; status: number; error: string };

export function parseDeadline(input: unknown, context: { now: number; lastEnd: number }): DeadlineResult {
  const { now, lastEnd } = context;
  if (input === null) {
    if (lastEnd <= now) return { ok: false, status: 409, error: "The last time on this poll has passed, so voting can’t reopen." };
    return { ok: true, deadline: null, closesAt: lastEnd };
  }
  if (input === "now") return { ok: true, deadline: now, closesAt: Math.min(now, lastEnd) };
  if (typeof input !== "string") return { ok: false, status: 400, error: "That deadline isn’t a time." };
  const time = Date.parse(input);
  if (!Number.isFinite(time)) return { ok: false, status: 400, error: "That deadline isn’t a time." };
  if (time <= now) return { ok: false, status: 400, error: "Pick a deadline that’s still ahead, or close voting now." };
  if (time >= lastEnd) return { ok: false, status: 400, error: "Pick a deadline before the last time on the poll ends." };
  return { ok: true, deadline: time, closesAt: time };
}
