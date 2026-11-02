"use client";

import { useState } from "react";
import { usePrefs, useTimeZone } from "@/client/browser";
import { momentLabel, timeZoneLabel, wallDate, wallParts, zonedToUtc } from "@/lib/time/format";
import { appear, button, cn, field, link } from "@/components/ui/styles";

function wallInput(ms: number, timeZone: string): string {
  const parts = wallParts(ms, timeZone);
  return `${wallDate(parts)}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function fromWallInput(value: string, timeZone: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(zonedToUtc(match[1], Number(match[2]) * 60 + Number(match[3]), timeZone)).toISOString();
}

export function VotingControls({
  lastEnd: lastEndIso,
  weekly,
  closed,
  deadline,
  pending,
  error,
  onChange,
}: {
  lastEnd: string;
  weekly: boolean;
  closed: boolean;
  deadline: string | null;
  pending: boolean;
  error: string | null;
  onChange: (deadline: "now" | string | null) => Promise<boolean>;
}) {
  const timeZone = useTimeZone();
  const prefs = usePrefs();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [earliest, setEarliest] = useState("");
  if (!timeZone || !prefs) return <div className="min-h-16" />;

  const lastEnd = Date.parse(lastEndIso);
  const at = deadline === null ? null : Date.parse(deadline);
  const label = (ms: number) => momentLabel(ms, timeZone, prefs.clock);
  const closedEarly = closed && at !== null && at < lastEnd;

  let status: string;
  if (closedEarly) status = `You closed voting ${label(at)}. Answers stay, but nobody can add or change one.`;
  else if (closed) status = weekly ? "Voting has ended." : "Voting ended when the last time on the poll passed.";
  else if (at !== null) status = `Voting closes ${label(at)}.`;
  else if (weekly) status = `Voting is open until ${label(lastEnd)}, two months after the poll was made.`;
  else status = `Voting is open until the last time ends, ${label(lastEnd)}.`;

  async function save(next: "now" | string | null) {
    if (await onChange(next)) setEditing(false);
  }

  return (
    <div className="max-w-xl">
      <p className="text-sm tabular-nums">{status}</p>

      {editing ? (
        <form
          className={cn(appear, "mt-4 flex flex-wrap items-end gap-3")}
          onSubmit={(event) => {
            event.preventDefault();
            const iso = fromWallInput(value, timeZone);
            if (iso) void save(iso);
          }}
        >
          <label className="text-[13px] font-medium text-foreground">
            Close voting at
            <input
              type="datetime-local"
              required
              value={value}
              min={earliest}
              max={wallInput(lastEnd - 60_000, timeZone)}
              onChange={(event) => setValue(event.target.value)}
              className={cn(field(), "mt-1 w-60 tabular-nums")}
            />
          </label>
          <button type="submit" className={button()} disabled={pending || !value}>
            Save deadline
          </button>
          <button type="button" className={cn(link(), "pb-2.5")} onClick={() => setEditing(false)}>
            Cancel
          </button>
          <p className="basis-full text-xs text-muted">In {timeZoneLabel(timeZone)}, like the grid.</p>
        </form>
      ) : closed ? (
        closedEarly ? (
          <div className="mt-3">
            <button type="button" className={button()} disabled={pending} onClick={() => void save(null)}>
              Reopen voting
            </button>
          </div>
        ) : null
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <button type="button" className={button({ variant: "secondary" })} disabled={pending} onClick={() => void save("now")}>
            Close voting now
          </button>
          <button
            type="button"
            className={link()}
            onClick={() => {
              setValue(at !== null ? wallInput(at, timeZone) : "");
              setEarliest(wallInput(Date.now(), timeZone));
              setEditing(true);
            }}
          >
            {at !== null ? "Change deadline" : "Set a deadline"}
          </button>
          {at !== null ? (
            <button type="button" className={link()} disabled={pending} onClick={() => void save(null)}>
              Remove deadline
            </button>
          ) : null}
        </div>
      )}

      {error ? (
        <p className={cn(appear, "mt-3 text-sm text-danger")} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
