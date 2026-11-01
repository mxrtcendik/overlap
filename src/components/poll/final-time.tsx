"use client";

import { usePageLocation, usePrefs, useTimeZone } from "@/client/browser";
import { googleCalendarUrl } from "@/lib/calendar/export";
import { rangeLabel } from "@/lib/time/format";
import type { FinalTime as FinalTimeData } from "@/lib/types";

export function FinalTime({
  pollId,
  title,
  final,
  onClear,
  pending = false,
  weekly = false,
}: {
  pollId: string;
  title: string;
  final: FinalTimeData;
  weekly?: boolean;
  onClear?: () => void;
  pending?: boolean;
}) {
  const timeZone = useTimeZone();
  const prefs = usePrefs();
  const location = usePageLocation();
  const start = Date.parse(final.start);
  const end = Date.parse(final.end);
  const label = timeZone && prefs ? rangeLabel(start, end, timeZone, prefs.clock, weekly) : null;
  const publicUrl = location ? `${location.origin}/p/${pollId}` : "";

  return (
    <section aria-labelledby="final-heading" className="mt-6 max-w-2xl border border-line bg-paper p-5 sm:p-6">
      <h2 id="final-heading" className="inline-flex items-center gap-2 text-xs text-muted">
        <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-accent" />
        Final time
      </h2>
      <p className="mt-2 min-h-8 text-xl leading-8 tracking-[-0.01em] text-balance">
        {label ? (
          <>
            {label.day} <span className="text-muted">·</span>{" "}
            <span className="font-mono text-lg tabular-nums">{label.time}</span>
          </>
        ) : null}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <a href={`/p/${pollId}/event.ics`} download className="btn">
          Add to calendar
        </a>
        {publicUrl ? (
          <a
            href={googleCalendarUrl({ title, start, end, url: publicUrl, weekly })}
            target="_blank"
            rel="noopener noreferrer"
            className="link-quiet"
          >
            Google Calendar
          </a>
        ) : null}
        {onClear ? (
          <button type="button" disabled={pending} onClick={onClear} className="link-quiet link-danger ml-auto">
            Clear final time
          </button>
        ) : null}
      </div>
    </section>
  );
}
