import { MAX_DAYS, MAX_RANGE_MS, MAX_SLOTS, MAX_SLOTS_PER_DAY, SLOT_MS } from "./constants";

export type SlotResult = { ok: true; slots: string[] } | { ok: false; error: string };

export function parseSlots(input: unknown): SlotResult {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, error: "Pick at least one day." };
  }
  if (input.length > MAX_SLOTS) {
    return { ok: false, error: "That is too many times." };
  }

  const times: number[] = [];
  for (const item of input) {
    if (typeof item !== "string") {
      return { ok: false, error: "Use 30-minute slots." };
    }
    const time = Date.parse(item);
    if (!Number.isFinite(time) || time % (60 * 1000) !== 0) {
      return { ok: false, error: "Use 30-minute slots." };
    }
    times.push(time);
  }

  times.sort((a, b) => a - b);
  for (let i = 1; i < times.length; i++) {
    if (times[i] === times[i - 1]) {
      return { ok: false, error: "Use 30-minute slots." };
    }
    if ((times[i] - times[i - 1]) % SLOT_MS !== 0) {
      return { ok: false, error: "Use 30-minute slots." };
    }
  }

  const groups: number[][] = [[times[0]]];
  for (let i = 1; i < times.length; i++) {
    const gap = times[i] - times[i - 1];
    if (gap === SLOT_MS) groups[groups.length - 1].push(times[i]);
    else groups.push([times[i]]);
  }

  if (groups.length > MAX_DAYS) {
    return { ok: false, error: "Pick 14 days at most." };
  }
  for (const group of groups) {
    const span = group[group.length - 1] - group[0] + SLOT_MS;
    if (group.length > MAX_SLOTS_PER_DAY || span > MAX_RANGE_MS) {
      return { ok: false, error: "The time range can be 12 hours at most." };
    }
  }

  return { ok: true, slots: times.map((time) => new Date(time).toISOString()) };
}

export type FinalResult = { ok: true; final: { start: number; end: number } | null } | { ok: false; error: string };

export function parseFinal(slots: string[], input: unknown): FinalResult {
  if (input === null) return { ok: true, final: null };
  const error = { ok: false as const, error: "Pick one unbroken stretch of this poll's times." };
  if (!input || typeof input !== "object") return error;
  const { start: startInput, end: endInput } = input as { start?: unknown; end?: unknown };
  if (typeof startInput !== "string" || typeof endInput !== "string") return error;
  const start = Date.parse(startInput);
  const end = Date.parse(endInput);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || (end - start) % SLOT_MS !== 0) return error;

  const times = new Set(slots.map((slot) => Date.parse(slot)));
  for (let time = start; time < end; time += SLOT_MS) {
    if (!times.has(time)) return error;
  }
  return { ok: true, final: { start, end } };
}
