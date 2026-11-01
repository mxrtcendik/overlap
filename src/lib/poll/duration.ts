import { SLOT_MS } from "../constants";

const STEP = SLOT_MS / 60_000;

export function longestRun(slots: string[]): number {
  const times = slots.map((slot) => Date.parse(slot)).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let index = 0; index < times.length; index++) {
    run = index > 0 && times[index] - times[index - 1] === SLOT_MS ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best * STEP;
}

export type DurationResult = { ok: true; duration: number | null } | { ok: false; error: string };

export function parseDuration(input: unknown, slots: string[]): DurationResult {
  if (input === undefined || input === null) return { ok: true, duration: null };
  if (typeof input !== "number" || !Number.isInteger(input) || input < STEP || input % STEP !== 0) {
    return { ok: false, error: "Pick a meeting length in half hours." };
  }
  if (input > longestRun(slots)) return { ok: false, error: "That’s longer than the hours on the poll." };
  return { ok: true, duration: input };
}

export function durationLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const parts = [];
  if (hours > 0) parts.push(hours === 1 ? "1 hour" : `${hours} hours`);
  if (rest > 0) parts.push(`${rest} minutes`);
  return parts.join(" ");
}

export function durationOptions(maxMinutes: number): number[] {
  const options: number[] = [];
  for (let minutes = STEP; minutes <= Math.min(maxMinutes, 12 * 60); minutes += STEP) options.push(minutes);
  return options;
}
