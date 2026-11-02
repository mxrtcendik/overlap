"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { deviceTimeZone, useTimeZone } from "@/client/browser";
import { SLOT_MS } from "@/lib/constants";
import { appear, button, cn, link } from "@/components/ui/styles";

const MAX_BYTES = 5 * 1024 * 1024;

type Found = { events: number; free: string[] };

export function CalendarFill({
  slots,
  options,
  hasAnswer,
  onApply,
}: {
  slots: string[];
  options?: { start: string; end: string }[] | null;
  hasAnswer: boolean;
  onApply: (free: string[]) => void;
}) {
  const timeZone = useTimeZone();
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [reading, setReading] = useState(false);
  const [found, setFound] = useState<Found | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFound(null);
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("That file is too large to be a calendar export.");
      return;
    }
    setReading(true);
    try {
      const [{ busyTimes, freeSlots }, text] = await Promise.all([import("@/lib/calendar/import"), file.text()]);
      const ranges = options ?? slots.map((slot) => ({ start: slot, end: new Date(Date.parse(slot) + SLOT_MS).toISOString() }));
      const window = {
        start: Math.min(...ranges.map((range) => Date.parse(range.start))),
        end: Math.max(...ranges.map((range) => Date.parse(range.end))),
      };
      const busy = busyTimes(text, window, timeZone ?? deviceTimeZone());
      const free = options
        ? options
            .filter((option) => !busy.some((span) => span.start < Date.parse(option.end) && span.end > Date.parse(option.start)))
            .map((option) => option.start)
        : freeSlots(slots, busy);
      setFound({ events: busy.length, free });
    } catch {
      setError("That file doesn’t look like a calendar. Export an .ics file from your calendar app and try again.");
    } finally {
      setReading(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <button
          type="button"
          className={link()}
          aria-describedby={hintId}
          disabled={reading}
          onClick={() => input.current?.click()}
        >
          {reading ? "Reading your calendar…" : "Fill in from your calendar"}
        </button>
        <span id={hintId} className="text-xs text-muted">
          .ics file, read on this device
        </span>
        <input ref={input} type="file" accept=".ics,text/calendar" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={onFile} />
      </div>

      {error ? (
        <p className={cn(appear, "basis-full text-sm text-danger")} role="alert">
          {error}
        </p>
      ) : null}

      {found ? (
        <div className={cn(appear, "basis-full border-l-2 border-line-strong pl-4")} role="status">
          <p className="text-sm">
            {found.events === 0
              ? "Your calendar has nothing on these days, so every time looks free."
              : `${found.events === 1 ? "1 event from your calendar falls" : `${found.events} events from your calendar fall`} on these days. You look free for ${found.free.length} of ${slots.length} times.`}
          </p>
          <p className="mt-1 text-xs text-muted">
            {hasAnswer ? "This replaces the times you’ve marked. " : ""}
            The file stays on this device.
          </p>
          <div className="mt-3 flex items-center gap-5">
            <button
              type="button"
              className={button()}
              disabled={found.free.length === 0}
              onClick={() => {
                onApply(found.free);
                setFound(null);
              }}
            >
              {found.free.length === 0 ? "No free times" : "Mark the free times"}
            </button>
            <button type="button" className={link()} onClick={() => setFound(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
