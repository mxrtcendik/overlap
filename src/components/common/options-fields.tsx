"use client";

import { usePrefs, useTimeZone, useToday } from "@/client/browser";
import { MAX_OPTIONS } from "@/lib/poll/options";
import { minutesLabel, zonedToUtc } from "@/lib/time/format";
import { TimeZoneNote } from "./time-zone";
import { cn, field, link, selectChrome } from "@/components/ui/styles";

export type OptionDraft = { date: string; start: number; end: number };

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function defaultOptions(today: string): OptionDraft[] {
  return [1, 2].map((offset) => ({ date: addDays(today, offset), start: 18 * 60, end: 19 * 60 }));
}

export function toOptions(drafts: OptionDraft[], timeZone: string) {
  return drafts.map((draft) => ({
    start: new Date(zonedToUtc(draft.date, draft.start, timeZone)).toISOString(),
    end: new Date(zonedToUtc(draft.date, draft.end, timeZone)).toISOString(),
  }));
}

const STARTS = Array.from({ length: 48 }, (_, index) => index * 30);

export function OptionsFields({ drafts, onChange }: { drafts: OptionDraft[]; onChange: (drafts: OptionDraft[]) => void }) {
  const clock = usePrefs()?.clock ?? "h12";
  const today = useToday();
  const timeZone = useTimeZone();
  const times = timeZone ? drafts.map((draft) => zonedToUtc(draft.date, draft.start, timeZone)) : [];

  function update(index: number, change: Partial<OptionDraft>) {
    onChange(
      drafts.map((draft, at) => {
        if (at !== index) return draft;
        const next = { ...draft, ...change };
        if (next.end <= next.start) next.end = Math.min(24 * 60, next.start + 60);
        return next;
      }),
    );
  }

  return (
    <fieldset>
      <legend className="text-sm text-muted">Times to choose from</legend>
      <p className="mt-2 text-sm text-muted">Offer a few specific times. Everyone answers yes, if needed or no to each.</p>
      <ol className="mt-4 space-y-3">
        {drafts.map((draft, index) => (
          <li key={index} className="flex flex-wrap items-end gap-3">
            <label className="text-[13px] font-medium text-foreground">
              Day
              <input
                type="date"
                required
                min={today ?? undefined}
                value={draft.date}
                onChange={(event) => update(index, { date: event.target.value })}
                className={cn(field({ size: "select" }), "mt-1.5")}
              />
            </label>
            <label className="text-[13px] font-medium text-foreground">
              From
              <select
                className={cn(field({ size: "select" }), selectChrome, "mt-1.5")}
                value={draft.start}
                onChange={(event) => update(index, { start: Number(event.target.value) })}
              >
                {STARTS.map((minute) => (
                  <option key={minute} value={minute}>
                    {minutesLabel(minute, clock)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[13px] font-medium text-foreground">
              To
              <select
                className={cn(field({ size: "select" }), selectChrome, "mt-1.5")}
                value={draft.end}
                onChange={(event) => update(index, { end: Number(event.target.value) })}
              >
                {STARTS.map((minute) => minute + 30)
                  .filter((minute) => minute > draft.start && minute - draft.start <= 12 * 60)
                  .map((minute) => (
                    <option key={minute} value={minute}>
                      {minutesLabel(minute, clock)}
                    </option>
                  ))}
              </select>
            </label>
            {drafts.length > 2 ? (
              <button
                type="button"
                className={cn(link({ tone: "danger" }), "pb-2.5")}
                aria-label={`Remove time ${index + 1}`}
                onClick={() => onChange(drafts.filter((_, at) => at !== index))}
              >
                Remove
              </button>
            ) : null}
          </li>
        ))}
      </ol>
      {drafts.length < MAX_OPTIONS ? (
        <button
          type="button"
          className={cn(link(), "mt-4")}
          onClick={() => {
            const last = drafts[drafts.length - 1];
            onChange([...drafts, last ? { ...last, date: addDays(last.date, 1) } : { date: today ?? "", start: 18 * 60, end: 19 * 60 }]);
          }}
        >
          Add another time
        </button>
      ) : null}
      <TimeZoneNote lead="Times are in" times={times} />
    </fieldset>
  );
}
