"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { slotsIn } from "@/lib/availability";
import { useIsClient, usePageLocation, useTimeZone } from "@/lib/browser";
import { MAX_TITLE, SLOT_MS } from "@/lib/constants";
import { buildSlots, inferSchedule } from "@/lib/schedule";
import { overlapSentence, rangeLabel } from "@/lib/sentence";
import { parseFinal } from "@/lib/slots";
import type { PollView } from "@/lib/types";
import { CopyLink } from "./copy-link";
import { Availability } from "./availability";
import { FinalTime } from "./final-time";
import { SentenceBlock } from "./poll-summary";
import { ScheduleFields } from "./schedule-fields";

export function OwnerView({ poll, hasResponses }: { poll: PollView; hasResponses: boolean }) {
  const router = useRouter();
  const location = usePageLocation();
  const timeZone = useTimeZone();
  const [title, setTitle] = useState(poll.title);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);

  const finalOutline = useMemo(
    () =>
      poll.final
        ? {
            slots: new Set(slotsIn(poll.slots, Date.parse(poll.final.start), Date.parse(poll.final.end))),
            label: "Final time",
          }
        : null,
    [poll.final, poll.slots],
  );

  const sentence = timeZone
    ? overlapSentence({
        slots: poll.slots,
        votes: poll.voters.map((voter) => ({ name: voter.name, slots: voter.slots })),
        timeZone,
      })
    : "";

  async function send(method: "PATCH" | "DELETE", body?: unknown) {
    const path = `${window.location.pathname.replace(/\/$/, "")}/edit`;
    const response = await fetch(path, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(data.error || "Could not save.");
  }

  async function onTitle(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await send("PATCH", { title });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setPending(false);
    }
  }

  async function onDays(dates: string[], start: number, end: number) {
    if (dates.length === 0) {
      setError("Pick at least one day.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await send("PATCH", { slots: buildSlots(dates, start, end) });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setPending(false);
    }
  }

  async function setFinal(final: { start: number; end: number } | null) {
    setPending(true);
    setError(null);
    try {
      await send("PATCH", {
        final: final ? { start: new Date(final.start).toISOString(), end: new Date(final.end).toISOString() } : null,
      });
      setDraft([]);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    setPending(true);
    setError(null);
    try {
      await send("DELETE");
      setDeleted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the poll.");
      setPending(false);
    }
  }

  if (deleted) {
    return (
      <>
        <h1 className="text-[1.75rem] leading-9 tracking-[-0.02em] text-balance">Poll deleted</h1>
        <p className="mt-4">The poll and every answer are gone.</p>
      </>
    );
  }

  return (
    <>
      <p className="inline-flex items-center gap-2 text-xs text-muted">
        <span className="inline-block size-1.5 rounded-full bg-danger" aria-hidden="true" />
        Secret link. Only you should have it.
      </p>
      <h1 className="mt-3 text-[1.75rem] leading-9 tracking-[-0.02em] text-balance">{poll.title}</h1>
      {poll.final ? (
        <FinalTime
          pollId={poll.id}
          title={poll.title}
          final={poll.final}
          pending={pending}
          onClear={() => void setFinal(null)}
        />
      ) : null}
      <SentenceBlock sentence={sentence} timeZone={timeZone} closed={poll.closed} />
      <p className="mt-8 max-w-2xl text-sm text-muted">
        {poll.final ? "To change the final time" : "To set the final time"}, drag down one day on the grid
        {poll.voters.length > 1 ? " or pick one of the best times" : ""}. Everyone with the public link will see it.
      </p>
      <div className="mt-6">
        <Availability
          slots={poll.slots}
          voters={poll.voters}
          readOnly={false}
          mode="range"
          selected={draft}
          selectLabel="Your pick"
          outline={finalOutline}
          onChange={setDraft}
          onPick={(segment) => void setFinal({ start: segment.start, end: segment.end })}
        />
      </div>
      {draft.length > 0 && timeZone ? (
        <DraftBar
          slots={poll.slots}
          draft={draft}
          timeZone={timeZone}
          pending={pending}
          onConfirm={(final) => void setFinal(final)}
          onCancel={() => setDraft([])}
        />
      ) : null}
      {location ? <CopyLink label="Public link" href={`${location.origin}/p/${poll.id}`} /> : null}
      {location ? <CopyLink label="Secret link" href={location.href} /> : null}

      <form onSubmit={onTitle} className="mt-10 max-w-md">
        <label className="block text-sm text-muted">
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={MAX_TITLE}
            required
            className="field mt-1"
          />
        </label>
        <button type="submit" disabled={pending} className="mt-3 btn">
          Save title
        </button>
      </form>

      <div className="mt-10">
        {hasResponses ? (
          <p className="text-sm text-muted">The days are fixed once someone has answered.</p>
        ) : (
          <>
            {poll.final ? <p className="mb-4 text-sm text-muted">Saving new days clears the final time.</p> : null}
            <DaysEditor key={poll.slots.join("|")} slots={poll.slots} pending={pending} onSave={onDays} />
          </>
        )}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-16">
        {confirming ? (
          <div className="border-l-2 border-danger pl-4">
            <p>Delete this poll and every answer. This cannot be undone.</p>
            <div className="mt-3 flex items-center gap-5">
              <button type="button" disabled={pending} onClick={() => void onDelete()} className="btn btn-danger">
                Delete it
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="link-quiet">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="link-quiet link-danger">
            Delete poll
          </button>
        )}
      </div>
    </>
  );
}

function DraftBar({
  slots,
  draft,
  timeZone,
  pending,
  onConfirm,
  onCancel,
}: {
  slots: string[];
  draft: string[];
  timeZone: string;
  pending: boolean;
  onConfirm: (final: { start: number; end: number }) => void;
  onCancel: () => void;
}) {
  const times = draft.map((slot) => Date.parse(slot)).sort((a, b) => a - b);
  const range = { start: times[0], end: times[times.length - 1] + SLOT_MS };
  const valid = parseFinal(slots, {
    start: new Date(range.start).toISOString(),
    end: new Date(range.end).toISOString(),
  });
  const label = rangeLabel(range.start, range.end, timeZone);

  return (
    <div className="sticky bottom-0 z-30 -mx-4 mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line bg-background px-4 py-3 sm:mx-0 sm:px-0">
      <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-foreground" />
      <p className="text-sm">
        {label.day} <span className="text-muted">·</span>{" "}
        <span className="font-mono tabular-nums">{label.time}</span>
      </p>
      {valid.ok ? (
        <button type="button" className="btn" disabled={pending} onClick={() => onConfirm(range)}>
          Set as final time
        </button>
      ) : (
        <p className="text-sm text-danger">{valid.error}</p>
      )}
      <button type="button" className="link-quiet" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

function DaysEditor({
  slots,
  pending,
  onSave,
}: {
  slots: string[];
  pending: boolean;
  onSave: (dates: string[], start: number, end: number) => Promise<void>;
}) {
  const client = useIsClient();
  const [draft, setDraft] = useState<{ dates: string[]; start: number; end: number } | null>(null);
  if (!client) return <div className="min-h-40" />;
  const schedule = draft ?? inferSchedule(slots);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSave(schedule.dates, schedule.start, schedule.end);
      }}
    >
      <ScheduleFields
        dates={schedule.dates}
        start={schedule.start}
        end={schedule.end}
        onDates={(dates) => setDraft((current) => ({ ...(current ?? schedule), dates }))}
        onStart={(start) => setDraft((current) => ({ ...(current ?? schedule), start }))}
        onEnd={(end) => setDraft((current) => ({ ...(current ?? schedule), end }))}
      />
      <button type="submit" disabled={pending} className="mt-6 btn">
        Save days
      </button>
    </form>
  );
}
