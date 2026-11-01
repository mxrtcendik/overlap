"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { deviceTimeZone, useTimeZone } from "@/lib/browser";
import { SLOT_MS } from "@/lib/constants";

const MAX_BYTES = 5 * 1024 * 1024;

type Found = { events: number; free: string[] };

export function CalendarFill({
  slots,
  hasAnswer,
  onApply,
}: {
  slots: string[];
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
      const [{ busyTimes, freeSlots }, text] = await Promise.all([import("@/lib/ics"), file.text()]);
      const times = slots.map((slot) => Date.parse(slot));
      const window = { start: Math.min(...times), end: Math.max(...times) + SLOT_MS };
      const busy = busyTimes(text, window, timeZone ?? deviceTimeZone());
      setFound({ events: busy.length, free: freeSlots(slots, busy) });
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
          className="link-quiet decoration-line-strong"
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
        <p className="basis-full text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {found ? (
        <div className="appear basis-full border-l-2 border-line-strong pl-4" role="status">
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
              className="btn"
              disabled={found.free.length === 0}
              onClick={() => {
                onApply(found.free);
                setFound(null);
              }}
            >
              {found.free.length === 0 ? "No free times" : "Mark the free times"}
            </button>
            <button type="button" className="link-quiet" onClick={() => setFound(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
