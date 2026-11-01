"use client";

import { useMemo, useState } from "react";
import { usePrefs, useTimeZone, useToday } from "@/client/browser";
import { MAX_DAYS } from "@/lib/constants";
import { minutesLabel, zonedToUtc } from "@/lib/time/format";
import { datesForWeekdays, WEEKDAY_NAMES, weekdayOf } from "@/lib/time/weekly";
import { TimeZoneNote } from "./time-zone";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

const MONTHS_AHEAD = 6;

function initialOffset(today: string | null, dates: string[]): number {
  if (!today || dates.length === 0) return 0;
  const months =
    (Number(dates[0].slice(0, 4)) - Number(today.slice(0, 4))) * 12 +
    (Number(dates[0].slice(5, 7)) - Number(today.slice(5, 7)));
  return Math.min(Math.max(months, 0), MONTHS_AHEAD - 1);
}

function shortDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function startOptions(): number[] {
  const options: number[] = [];
  for (let minute = 0; minute <= 23 * 60 + 30; minute += 30) options.push(minute);
  return options;
}

function endOptions(start: number): number[] {
  const options: number[] = [];
  const max = Math.min(24 * 60, start + 12 * 60);
  for (let minute = start + 30; minute <= max; minute += 30) options.push(minute);
  return options;
}

function Month({
  year,
  month,
  today,
  dates,
  weekStart,
  onToggle,
}: {
  year: number;
  month: number;
  today: string | null;
  dates: string[];
  weekStart: number;
  onToggle: (iso: string) => void;
}) {
  const leading = (new Date(year, month, 1).getDay() - weekStart + 7) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const label = new Date(year, month, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  const weekdays = WEEKDAYS.map((_, index) => WEEKDAYS[(index + weekStart) % 7]);
  const cells: Array<number | null> = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: count }, (_, index) => index + 1),
  ];

  return (
    <div>
      <div className="mb-2 flex h-7 items-center text-sm font-medium" aria-live="polite">
        {label}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((day) => (
          <div key={day} className="py-1 text-xs text-muted">
            {day}
          </div>
        ))}
        {cells.map((day, index) => {
          if (!day) return <div key={`${year}-${month}-empty-${index}`} />;
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const selected = dates.includes(iso);
          const past = today !== null && iso < today;
          const isToday = iso === today;
          return (
            <button
              key={iso}
              type="button"
              disabled={past}
              aria-label={new Date(year, month, day).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
              aria-pressed={selected}
              aria-current={isToday ? "date" : undefined}
              onClick={() => onToggle(iso)}
              className={`h-8 text-sm tabular-nums transition-colors duration-100 ${
                selected ? "bg-foreground text-background" : past ? "text-muted/50" : "hover:bg-line/70"
              } ${isToday && !selected ? "font-medium underline decoration-accent decoration-2 underline-offset-4" : ""}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekdayPicker({
  dates,
  today,
  weekStart,
  onDates,
}: {
  dates: string[];
  today: string | null;
  weekStart: number;
  onDates: (dates: string[]) => void;
}) {
  const picked = new Set(dates.map(weekdayOf));
  const order = Array.from({ length: 7 }, (_, index) => (weekStart + index) % 7);
  return (
    <div role="group" aria-label="Days of the week" className="mt-4 grid max-w-md grid-cols-7 gap-1">
      {order.map((weekday) => {
        const on = picked.has(weekday);
        return (
          <button
            key={weekday}
            type="button"
            aria-pressed={on}
            aria-label={WEEKDAY_NAMES[weekday]}
            disabled={!today}
            onClick={() => {
              const next = new Set(picked);
              if (on) next.delete(weekday);
              else next.add(weekday);
              if (today) onDates(datesForWeekdays([...next], today, weekStart));
            }}
            className={`h-10 border text-sm transition-colors duration-100 ${
              on ? "border-foreground bg-foreground text-background" : "border-line hover:bg-line/70"
            }`}
          >
            {WEEKDAY_NAMES[weekday].slice(0, 3)}
          </button>
        );
      })}
    </div>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d={direction === "left" ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"} />
    </svg>
  );
}

export function ScheduleFields({
  weekly = false,
  dates,
  start,
  end,
  onDates,
  onStart,
  onEnd,
}: {
  weekly?: boolean;
  dates: string[];
  start: number;
  end: number;
  onDates: (dates: string[]) => void;
  onStart: (start: number) => void;
  onEnd: (end: number) => void;
}) {
  const today = useToday();
  const timeZone = useTimeZone();
  const pickedTimes = useMemo(
    () => (timeZone ? dates.map((date) => zonedToUtc(date, start, timeZone)) : []),
    [dates, start, timeZone],
  );
  const prefs = usePrefs();
  const clock = prefs?.clock ?? "h12";
  const weekStart = prefs?.weekStart ?? 0;
  const [message, setMessage] = useState<string | null>(null);
  const [offset, setOffset] = useState(() => initialOffset(today, dates));
  const anchor = today
    ? { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 }
    : null;

  const months = anchor
    ? [offset, offset + 1].map((index) => {
        const date = new Date(anchor.year, anchor.month + index, 1);
        return { year: date.getFullYear(), month: date.getMonth() };
      })
    : [];

  function toggle(iso: string) {
    if (dates.includes(iso)) {
      onDates(dates.filter((date) => date !== iso));
      setMessage(null);
      return;
    }
    if (dates.length >= MAX_DAYS) {
      setMessage(`You can pick up to ${MAX_DAYS} days.`);
      return;
    }
    setMessage(null);
    onDates([...dates, iso].sort());
  }

  function changeStart(next: number) {
    const duration = Math.min(12 * 60, Math.max(30, end - start));
    let nextEnd = next + duration;
    if (nextEnd > 24 * 60) nextEnd = 24 * 60;
    if (nextEnd - next > 12 * 60) nextEnd = next + 12 * 60;
    if (nextEnd <= next) nextEnd = Math.min(24 * 60, next + 30);
    onStart(next);
    onEnd(nextEnd);
  }

  return (
    <fieldset>
      <legend className="text-sm text-muted">Days and hours</legend>
      <p className="mt-2 text-sm text-muted">
        {weekly
          ? "Pick the days of the week, then a time window of up to 12 hours."
          : "Pick up to 14 days, then a time window of up to 12 hours."}
      </p>
      {weekly ? (
        <WeekdayPicker dates={dates} today={today} weekStart={weekStart} onDates={onDates} />
      ) : (
      <div className="relative mt-4 min-h-[17.5rem]">
        <div className="absolute top-0 right-0 z-10 flex gap-1">
          <button
            type="button"
            aria-label="Previous month"
            disabled={offset === 0}
            onClick={() => setOffset((current) => Math.max(0, current - 1))}
            className="month-nav"
          >
            <Chevron direction="left" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            disabled={offset >= MONTHS_AHEAD - 1}
            onClick={() => setOffset((current) => Math.min(MONTHS_AHEAD - 1, current + 1))}
            className="month-nav"
          >
            <Chevron direction="right" />
          </button>
        </div>
        <div className="grid gap-8 sm:grid-cols-2">
          {months.map((month, index) => (
            <div key={`${month.year}-${month.month}`} className={index === 1 ? "hidden sm:block" : undefined}>
              <Month
                year={month.year}
                month={month.month}
                today={today}
                dates={dates}
                weekStart={weekStart}
                onToggle={toggle}
              />
            </div>
          ))}
        </div>
      </div>
      )}
      {message ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {message}
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">
          {dates.length === 0
            ? "No days picked yet."
            : weekly
              ? `Every ${dates.map((date) => WEEKDAY_NAMES[weekdayOf(date)]).join(", ")}`
              : `${dates.length === 1 ? "1 day" : `${dates.length} days`}: ${dates.map(shortDate).join(", ")}`}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-6">
        <label className="text-sm text-muted">
          From
          <select
            className="field mt-1 w-auto py-2 pr-2 pl-2.5"
            value={start}
            onChange={(event) => changeStart(Number(event.target.value))}
          >
            {startOptions().map((minute) => (
              <option key={minute} value={minute}>
                {minutesLabel(minute, clock)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-muted">
          To
          <select
            className="field mt-1 w-auto py-2 pr-2 pl-2.5"
            value={end}
            onChange={(event) => onEnd(Number(event.target.value))}
          >
            {endOptions(start).map((minute) => (
              <option key={minute} value={minute}>
                {minutesLabel(minute, clock)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <TimeZoneNote lead="Hours are in" times={pickedTimes} />
    </fieldset>
  );
}
