import { SLOT_MS } from "../constants";
import { clockTime, localParts, type Clock } from "../time/format";

/** A reasonable meeting day, in each person's own clock: 08:00 to 21:00. */
export const DAY_START = 8 * 60;
export const DAY_END = 21 * 60;

export type Zoned = { name?: string; zone?: string | null };

/** Whether any part of [start, end) falls outside 08:00–21:00 in the given zone. */
export function outsideDay(start: number, end: number, zone: string): boolean {
  for (let time = start; time < end; time += SLOT_MS) {
    const { hour, minute } = localParts(time, zone);
    const minutes = hour * 60 + minute;
    if (minutes < DAY_START || minutes >= DAY_END) return true;
  }
  return false;
}

/**
 * The people among `people` (indexes into `voters`) for whom [start, end) is
 * early or late. People without a known timezone never count.
 */
export function oddHoursFor(start: number, end: number, voters: Zoned[], people: number[]): number[] {
  return people.filter((index) => {
    const zone = voters[index]?.zone;
    return zone ? outsideDay(start, end, zone) : false;
  });
}

export type OddHour = { name: string; time: string };

/** Names and local start times of the people for whom [start, end) is early or late. */
export function oddHoursLabels(start: number, end: number, voters: Zoned[], people: number[], clock: Clock): OddHour[] {
  return oddHoursFor(start, end, voters, people).map((index) => ({
    name: voters[index].name ?? "Someone",
    time: clockTime(localParts(start, voters[index].zone!), clock),
  }));
}
