"use client";

import { useState, type FormEvent } from "react";
import { usePageLocation, usePrefs, useTimeZone } from "@/client/browser";
import { messageOf } from "@/client/request";
import { googleCalendarUrl } from "@/lib/calendar/export";
import { MAX_PLACE, placeLink } from "@/lib/poll/place";
import { rangeLabel } from "@/lib/time/format";
import type { FinalTime as FinalTimeData } from "@/lib/types";
import { appear, button, cn, field, link } from "@/components/ui/styles";

export function FinalTime({
  pollId,
  title,
  final,
  place = null,
  onClear,
  onPlace,
  pending = false,
  weekly = false,
  zone = null,
}: {
  pollId: string;
  title: string;
  final: FinalTimeData;
  place?: string | null;
  weekly?: boolean;
  zone?: string | null;
  onClear?: () => void;
  /** Owner only: save a new place, or null to remove it. */
  onPlace?: (place: string | null) => Promise<void>;
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
      <Place place={place} onPlace={onPlace} />
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <a href={`/p/${pollId}/event.ics`} download className={button()}>
          Add to calendar
        </a>
        {publicUrl ? (
          <a
            href={googleCalendarUrl({ title, start, end, url: publicUrl, weekly, zone, location: place })}
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

function Place({ place, onPlace }: { place: string | null; onPlace?: (place: string | null) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(place ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = place ? placeLink(place) : null;

  async function save(next: string | null) {
    if (!onPlace) return;
    setPending(true);
    setError(null);
    try {
      await onPlace(next);
      setEditing(false);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setPending(false);
    }
  }

  if (editing && onPlace) {
    return (
      <form
        className={cn(appear, "mt-3")}
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void save(value.trim() || null);
        }}
      >
        <label className="block text-[13px] font-medium text-foreground">
          Place or video link
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            maxLength={MAX_PLACE}
            autoFocus
            placeholder="Room 4B, or https://meet.example.com/abc"
            className={cn(field(), "mt-1.5")}
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <button type="submit" disabled={pending} className={button({ variant: "secondary" })}>
            Save place
          </button>
          {place ? (
            <button type="button" disabled={pending} onClick={() => void save(null)} className={link({ tone: "danger" })}>
              Remove
            </button>
          ) : null}
          <button type="button" onClick={() => setEditing(false)} className={link()}>
            Cancel
          </button>
        </div>
        {error ? (
          <p className={cn(appear, "mt-2 text-sm text-danger")} role="alert">
            {error}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <p className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
      {url ? (
        <a href={url.href} target="_blank" rel="noopener noreferrer nofollow" className={link({ tone: "accent" })}>
          Join on {url.hostname.replace(/^www\./, "")}
        </a>
      ) : place ? (
        <span>
          <span className="text-muted">Where: </span>
          {place}
        </span>
      ) : null}
      {onPlace ? (
        <button
          type="button"
          className={link()}
          onClick={() => {
            setValue(place ?? "");
            setEditing(true);
          }}
        >
          {place ? "Change place" : "Add a place or video link"}
        </button>
      ) : null}
    </p>
  );
}
