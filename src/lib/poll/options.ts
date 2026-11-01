import { SLOT_MS } from "../constants";
import type { Clock } from "../time/format";
import { rangeLabel } from "../time/format";
import type { Summary, Vote } from "./sentence";

export type TimeOption = { start: string; end: string };

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 20;
const MAX_OPTION_MS = 12 * 60 * 60 * 1000;
const MAX_AHEAD_MS = 366 * 24 * 60 * 60 * 1000;

export type OptionsResult = { ok: true; options: TimeOption[] } | { ok: false; error: string };

export function parseOptions(input: unknown, now = Date.now()): OptionsResult {
  if (!Array.isArray(input) || input.length < MIN_OPTIONS) return { ok: false, error: `Add at least ${MIN_OPTIONS} times.` };
  if (input.length > MAX_OPTIONS) return { ok: false, error: `A poll can offer up to ${MAX_OPTIONS} times.` };
  const options: { start: number; end: number }[] = [];
  for (const item of input) {
    const record = item as { start?: unknown; end?: unknown } | null;
    const start = typeof record?.start === "string" ? Date.parse(record.start) : NaN;
    const end = typeof record?.end === "string" ? Date.parse(record.end) : NaN;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start % SLOT_MS !== 0 || end % SLOT_MS !== 0) {
      return { ok: false, error: "Times must start and end on the hour or half hour." };
    }
    if (end <= start) return { ok: false, error: "Each time has to end after it starts." };
    if (end - start > MAX_OPTION_MS) return { ok: false, error: "Each time can be up to 12 hours long." };
    if (start > now + MAX_AHEAD_MS) return { ok: false, error: "Pick times within the next year." };
    options.push({ start, end });
  }
  options.sort((a, b) => a.start - b.start);
  if (options.some((option, index) => index > 0 && option.start === options[index - 1].start)) {
    return { ok: false, error: "Two of the times start at the same moment." };
  }
  if (options.every((option) => option.end <= now)) {
    return { ok: false, error: "Those times have already passed. Pick a later day or time." };
  }
  return { ok: true, options: options.map(({ start, end }) => ({ start: new Date(start).toISOString(), end: new Date(end).toISOString() })) };
}

export type OptionResult = { option: TimeOption; yes: number[]; maybe: number[] };

export function optionResults(options: TimeOption[], votes: { slots: string[]; maybe?: string[] }[]): OptionResult[] {
  return options.map((option) => ({
    option,
    yes: votes.flatMap((vote, index) => (vote.slots.includes(option.start) ? [index] : [])),
    maybe: votes.flatMap((vote, index) => (!vote.slots.includes(option.start) && (vote.maybe ?? []).includes(option.start) ? [index] : [])),
  }));
}

export function rankOptions(options: TimeOption[], votes: (Vote | { slots: string[]; maybe?: string[]; required?: boolean })[]): OptionResult[] {
  const required = votes.flatMap((vote, index) => (vote.required ? [index] : []));
  return optionResults(options, votes)
    .filter((result) => required.every((index) => result.yes.includes(index) || result.maybe.includes(index)))
    .filter((result) => result.yes.length + result.maybe.length > 0)
    .sort(
      (a, b) =>
        b.yes.length + b.maybe.length - (a.yes.length + a.maybe.length) ||
        a.maybe.length - b.maybe.length ||
        Date.parse(a.option.start) - Date.parse(b.option.start),
    );
}

export function optionLabel(option: TimeOption, timeZone: string, clock: Clock = "h12"): string {
  const label = rangeLabel(Date.parse(option.start), Date.parse(option.end), timeZone, clock);
  return `${label.day}, ${label.time}`;
}

export function optionSummary(input: { options: TimeOption[]; votes: Vote[]; timeZone: string; clock?: Clock }): Summary {
  const people = input.votes.length;
  if (people === 0) return { kind: "empty" };
  if (people === 1) return { kind: "one", name: input.votes[0].name };
  const [best] = rankOptions(input.options, input.votes);
  const required = input.votes.filter((vote) => vote.required).map((vote) => vote.name);
  if (!best) return required.length > 0 ? { kind: "clash", required } : { kind: "unmarked" };
  const when = optionLabel(best.option, input.timeZone, input.clock);
  const count = best.yes.length + best.maybe.length;
  if (count === people) return { kind: "all", when, maybe: best.maybe.length };
  return { kind: "some", when, count, people, maybe: best.maybe.length, required };
}
