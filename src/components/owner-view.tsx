"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useIsClient, usePageLocation, useTimeZone } from "@/lib/browser";
import { MAX_TITLE } from "@/lib/constants";
import { buildSlots, inferSchedule } from "@/lib/schedule";
import { overlapSentence } from "@/lib/sentence";
import type { PollView } from "@/lib/types";
import { CopyLink } from "./copy-link";
import { Availability } from "./availability";
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
      <SentenceBlock sentence={sentence} timeZone={timeZone} closed={poll.closed} />
      <div className="mt-8">
        <Availability slots={poll.slots} voters={poll.voters} readOnly />
      </div>
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
          <DaysEditor key={poll.slots.join("|")} slots={poll.slots} pending={pending} onSave={onDays} />
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
