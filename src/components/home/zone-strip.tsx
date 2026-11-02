"use client";

import { usePrefs, useTimeZone } from "@/client/browser";
import { describeRun, localParts, clockTime } from "@/lib/time/format";
import { cn } from "@/components/ui/styles";

const CITIES: { city: string; zone: string }[] = [
  { city: "San Francisco", zone: "America/Los_Angeles" },
  { city: "New York", zone: "America/New_York" },
  { city: "London", zone: "Europe/London" },
  { city: "Berlin", zone: "Europe/Berlin" },
  { city: "Singapore", zone: "Asia/Singapore" },
  { city: "Tokyo", zone: "Asia/Tokyo" },
];

function cityName(zone: string): string {
  const city = zone.split("/").pop() ?? zone;
  return city.replaceAll("_", " ");
}

/** Next 15:00 UTC, so the list shows one shared hour in many clocks. */
function meetingTime(): number {
  const now = new Date();
  const at = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 15);
  return at > now.getTime() ? at : at + 86_400_000;
}

/** The product's answer, in the visitor's zone and clock, with that hour in other cities. */
export function Clocks() {
  const prefs = usePrefs();
  const zone = useTimeZone();
  const at = meetingTime();
  const places = [
    ...(zone ? [{ city: cityName(zone), zone, yours: true }] : []),
    ...CITIES.filter((city) => city.zone !== zone).map((city) => ({ ...city, yours: false })),
  ].slice(0, 6);
  const rows = prefs
    ? places.map((place) => {
        const parts = localParts(at, place.zone);
        return { ...place, hour: parts.hour, time: clockTime(parts, prefs.clock) };
      })
    : null;
  const answer = zone && prefs ? describeRun(at, at + 3_600_000, zone, [], prefs.clock) : null;

  return (
    <aside className="max-w-sm lg:max-w-none lg:self-end" aria-label="What the page answers">
      <p className="font-display min-h-[4.5rem] text-[1.7rem] leading-[1.15] text-balance">
        {answer ? (
          <>
            <em className="font-normal">{answer}</em>
            <br />
            works for everyone.
          </>
        ) : null}
      </p>
      <p className="mt-5 text-sm text-muted">The same hour, on each clock.</p>
      <dl className="mt-3 border-t border-line">
        {(rows ?? places.map((place) => ({ ...place, hour: 12, time: "–" }))).map((row) => (
          <div key={row.zone} className="flex items-baseline justify-between gap-6 border-b border-line py-2">
            <dt className="min-w-0 truncate text-sm text-muted">
              {row.yours ? <span className="text-foreground">You</span> : row.city}
              {row.yours ? ` · ${row.city}` : null}
            </dt>
            <dd
              className={cn(
                "shrink-0 font-mono text-[13px] tabular-nums",
                rows && (row.hour < 8 || row.hour >= 20) ? "text-muted" : "text-foreground",
              )}
            >
              {row.time}
            </dd>
          </div>
        ))}
      </dl>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
        <li className="inline-flex items-center gap-2">
          <span className="inline-block size-3 bg-foreground" />
          Can make
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="hatch inline-block size-3 border border-foreground" />
          If needed
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-block size-3 border border-line bg-paper" />
          Can’t
        </li>
      </ul>
      <p className="mt-3 text-xs text-muted">Follows the clock at the bottom of the page.</p>
    </aside>
  );
}
