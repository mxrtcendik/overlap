"use client";

import { useMemo, useState } from "react";
import { useTimeZone, useToday } from "@/lib/browser";
import { buildSlots } from "@/lib/schedule";
import { overlapSentence } from "@/lib/sentence";
import { PollGrid } from "./poll-grid";

const START = 9 * 60;
const END = 13 * 60;
const DAYS = 4;

const PEOPLE: { name: string; free: [day: number, from: number, to: number][] }[] = [
  { name: "Mina", free: [[0, 0, 4], [1, 2, 8], [2, 0, 6]] },
  { name: "Jonas", free: [[1, 3, 6], [2, 2, 8], [3, 0, 3]] },
  { name: "Priya", free: [[0, 2, 5], [2, 3, 7], [3, 4, 8]] },
  { name: "Theo", free: [[0, 0, 2], [1, 4, 8], [2, 4, 6]] },
];

function nextWeekdays(today: string, count: number): string[] {
  const [year, month, day] = today.split("-").map(Number);
  const cursor = new Date(year, month - 1, day);
  const dates: string[] = [];
  while (dates.length < count) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getDay() === 0 || cursor.getDay() === 6) continue;
    dates.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`,
    );
  }
  return dates;
}

export function Demo() {
  const today = useToday();
  const timeZone = useTimeZone();
  const [mine, setMine] = useState<string[]>([]);

  const demo = useMemo(() => {
    if (!today) return null;
    const dates = nextWeekdays(today, DAYS);
    const perDay = (END - START) / 30;
    const slots = buildSlots(dates, START, END);
    const voters = PEOPLE.map((person) => ({
      name: person.name,
      slots: person.free.flatMap(([day, from, to]) => slots.slice(day * perDay + from, day * perDay + to)),
    }));
    return { slots, voters };
  }, [today]);

  const voters = useMemo(
    () => (demo ? (mine.length > 0 ? [...demo.voters, { name: "You", slots: mine }] : demo.voters) : []),
    [demo, mine],
  );

  if (!demo || !timeZone) return <div className="h-[30rem] w-full max-w-md" aria-hidden="true" />;

  return (
    <figure className="w-full max-w-md border border-line p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium">Team retro</p>
        <p className="text-xs text-muted">Example</p>
      </div>
      <p className="mt-2 min-h-12 text-sm leading-6 text-balance" aria-live="polite">
        {overlapSentence({ slots: demo.slots, votes: voters, timeZone })}
      </p>
      <div className="mt-4">
        <PollGrid slots={demo.slots} voters={voters} selected={mine} readOnly={false} onChange={setMine} />
      </div>
      <figcaption className="mt-4 flex items-baseline justify-between gap-4 text-xs text-muted">
        <span>Drag across the grid to add yourself. Nothing here is saved.</span>
        {mine.length > 0 ? (
          <button type="button" className="link-quiet shrink-0 text-xs" onClick={() => setMine([])}>
            Reset
          </button>
        ) : null}
      </figcaption>
    </figure>
  );
}
