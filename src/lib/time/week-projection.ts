import { SLOT_MS } from "../constants";
import type { PollView } from "../types";
import { wallDate, wallParts, zonedToUtc } from "./format";

const DAY_MS = 86_400_000;

export type WeekProjection = { toDisplay: (iso: string) => string; toStored: (iso: string) => string };

export const IDENTITY: WeekProjection = { toDisplay: (iso) => iso, toStored: (iso) => iso };

function dayNumber(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function currentWeek(slots: string[], zone: string, now: number): WeekProjection {
  if (slots.length === 0) return IDENTITY;
  const first = Math.min(...slots.map((slot) => Date.parse(slot)));
  const weeks = Math.floor((dayNumber(wallDate(wallParts(now, zone))) - dayNumber(wallDate(wallParts(first, zone)))) / 7);
  if (weeks <= 0) return IDENTITY;
  const forward = new Map<string, string>();
  const back = new Map<string, string>();
  for (const slot of slots) {
    const parts = wallParts(Date.parse(slot), zone);
    const date = addDays(wallDate(parts), weeks * 7);
    const shown = new Date(zonedToUtc(date, parts.hour * 60 + parts.minute, zone)).toISOString();
    if (back.has(shown)) return IDENTITY;
    forward.set(slot, shown);
    back.set(shown, slot);
  }
  return { toDisplay: (iso) => forward.get(iso) ?? iso, toStored: (iso) => back.get(iso) ?? iso };
}

const shiftEnd = (end: string, map: (iso: string) => string) =>
  new Date(Date.parse(map(new Date(Date.parse(end) - SLOT_MS).toISOString())) + SLOT_MS).toISOString();

export function projectPoll(poll: PollView, projection: WeekProjection): PollView {
  if (projection === IDENTITY) return poll;
  const show = projection.toDisplay;
  return {
    ...poll,
    slots: poll.slots.map(show),
    voters: poll.voters.map((voter) => ({ ...voter, slots: voter.slots.map(show), maybe: voter.maybe.map(show) })),
    final: poll.final ? { start: show(poll.final.start), end: shiftEnd(poll.final.end, show) } : null,
  };
}

export function storedRange(range: { start: number; end: number }, projection: WeekProjection): { start: number; end: number } {
  const start = Date.parse(projection.toStored(new Date(range.start).toISOString()));
  const end = Date.parse(shiftEnd(new Date(range.end).toISOString(), projection.toStored));
  return { start, end };
}
