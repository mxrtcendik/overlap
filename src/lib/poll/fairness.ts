import { SLOT_MS } from "../constants";
import { clockTime, localParts, type Clock } from "../time/format";

export const DAY_START = 8 * 60;
export const DAY_END = 21 * 60;

export type Zoned = { name?: string; zone?: string | null };

export function outsideDay(start: number, end: number, zone: string): boolean {
  for (let time = start; time < end; time += SLOT_MS) {
    const { hour, minute } = localParts(time, zone);
    const minutes = hour * 60 + minute;
    if (minutes < DAY_START || minutes >= DAY_END) return true;
  }
  return false;
}

export function oddHoursFor(start: number, end: number, voters: Zoned[], people: number[]): number[] {
  return people.filter((index) => {
    const zone = voters[index]?.zone;
    return zone ? outsideDay(start, end, zone) : false;
  });
}

export type OddHour = { name: string; time: string };

export function oddHoursLabels(start: number, end: number, voters: Zoned[], people: number[], clock: Clock): OddHour[] {
  return oddHoursFor(start, end, voters, people).map((index) => ({
    name: voters[index].name ?? "Someone",
    time: clockTime(localParts(start, voters[index].zone!), clock),
  }));
}
