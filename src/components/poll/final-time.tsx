"use client";

import { usePageLocation, usePrefs, useTimeZone } from "@/client/browser";
import { googleCalendarUrl } from "@/lib/calendar/export";
import { rangeLabel } from "@/lib/time/format";
import type { FinalTime as FinalTimeData } from "@/lib/types";
import { button, cn, link } from "@/components/ui/styles";

export function FinalTime({
  pollId,
  title,
  final,
  onClear,
  pending = false,
  weekly = false,
  zone = null,
}: {
  pollId: string;
  title: string;
  final: FinalTimeData;
  weekly?: boolean;
  zone?: string | null;
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
    <section aria-labelledby="final-heading" className="mt-8 max-w-2xl border-l-2 border-accent pl-4">
      <h2 id="final-heading" className="text-sm text-muted">
        Final time
      </h2>
      <p className="mt-2 min-h-8 font-display text-2xl leading-snug text-balance">
        {label ? (
          <>
            {label.day} <span className="text-muted">·</span>{" "}
            <span className="font-mono text-lg tabular-nums">{label.time}</span>
          </>
        ) : null}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <a href={`/p/${pollId}/event.ics`} download className={button()}>
          Add to calendar
        </a>
        {publicUrl ? (
          <a
            href={googleCalendarUrl({ title, start, end, url: publicUrl, weekly, zone })}
            target="_blank"
            rel="noopener noreferrer"
            className={link()}
          >
            Google Calendar
          </a>
        ) : null}
        {onClear ? (
          <button type="button" disabled={pending} onClick={onClear} className={cn(link({ tone: "danger" }), "ml-auto")}>
            Clear final time
          </button>
        ) : null}
      </div>
    </section>
  );
}
