"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePrefs, useReducedMotion, useTimeZone, useToday } from "@/client/browser";
import { DEMO_DAYS, DEMO_END, DEMO_PEOPLE, DEMO_START } from "@/lib/demo-data";
import { buildSlots } from "@/lib/time/schedule";
import { overlapSummary } from "@/lib/poll/sentence";
import { PollGrid } from "../poll/poll-grid";
import { SummaryText } from "../poll/poll-summary";

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

const FIRST_ANSWER_MS = 250;
const NEXT_ANSWER_MS = 450;

export function Demo() {
  const today = useToday();
  const timeZone = useTimeZone();
  const prefs = usePrefs();
  const reducedMotion = useReducedMotion();
  const [mine, setMine] = useState<string[]>([]);
  const [answered, setAnswered] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  const demo = useMemo(() => {
    if (!today || !timeZone) return null;
    const dates = nextWeekdays(today, DEMO_DAYS);
    const perDay = (DEMO_END - DEMO_START) / 30;
    const slots = buildSlots(dates, DEMO_START, DEMO_END, timeZone);
    const voters = DEMO_PEOPLE.map((person) => ({
      name: person.name,
      slots: person.free.flatMap(([day, from, to]) => slots.slice(day * perDay + from, day * perDay + to)),
    }));
    return { slots, voters };
  }, [today, timeZone]);

  const ready = demo !== null && prefs !== null;
  const animate = reducedMotion === false && typeof IntersectionObserver === "function";
  const shown = animate ? answered : DEMO_PEOPLE.length;
  const filling = shown < DEMO_PEOPLE.length;

  useEffect(() => {
    const grid = gridRef.current;
    if (!ready || !animate || !grid) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let count = 0;
    const next = () => {
      count += 1;
      setAnswered((current) => Math.max(current, count));
      if (count < DEMO_PEOPLE.length) timer = setTimeout(next, NEXT_ANSWER_MS);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        timer = setTimeout(next, FIRST_ANSWER_MS);
      },
      { threshold: 0.6 },
    );
    observer.observe(grid);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [ready, animate]);

  const voters = useMemo(() => {
    if (!demo) return [];
    const others = demo.voters.slice(0, shown);
    return mine.length > 0 ? [...others, { name: "You", slots: mine }] : others;
  }, [demo, mine, shown]);

  const stages = useMemo(() => {
    if (!demo || !timeZone || !prefs) return [];
    return demo.voters.map((_, index) =>
      overlapSummary({ slots: demo.slots, votes: demo.voters.slice(0, index + 1), timeZone, clock: prefs.clock }),
    );
  }, [demo, timeZone, prefs]);

  function changeMine(next: string[]) {
    setAnswered(DEMO_PEOPLE.length);
    setMine(next);
  }

  if (!demo || !timeZone || !prefs) return <div className="h-[30rem] w-full max-w-md" aria-hidden="true" />;

  return (
    <figure className="w-full max-w-md border border-line p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium">Team retro</p>
        <p className="text-xs text-muted">Example</p>
      </div>
      <p className="mt-2 grid text-sm leading-6 text-balance">
        {stages.map((summary, index) => (
          <span key={index} aria-hidden="true" className="invisible col-start-1 row-start-1">
            <SummaryText summary={summary} />
          </span>
        ))}
        <span className="col-start-1 row-start-1" aria-live={filling ? "off" : "polite"}>
          <SummaryText summary={overlapSummary({ slots: demo.slots, votes: voters, timeZone, clock: prefs.clock })} />
        </span>
      </p>
      <div ref={gridRef} className="mt-4">
        <PollGrid slots={demo.slots} voters={voters} selected={mine} readOnly={false} dayView={false} onChange={changeMine} />
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
