"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { slotsIn } from "@/lib/availability";
import {
  deviceTimeZone,
  dismissCreated,
  useIsClient,
  useJustCreated,
  usePageLocation,
  usePrefs,
  useTimeZone,
} from "@/lib/browser";
import { MAX_TITLE, SLOT_MS } from "@/lib/constants";
import { buildSlots, inferSchedule } from "@/lib/schedule";
import { rangeLabel, type Clock } from "@/lib/format";
import { expiresAtFor, forgetPoll, rememberPoll, useMyPolls } from "@/lib/my-polls";
import { json, messageOf, request } from "@/lib/request";
import { parseFinal } from "@/lib/slots";
import type { PollView, VoterView } from "@/lib/types";
import { useLiveUpdates } from "@/lib/use-live-updates";
import { CopyLink } from "./copy-link";
import { CreatedNotice } from "./created-notice";
import { Availability } from "./availability";
import { FinalTime } from "./final-time";
import { SentenceBlock } from "./poll-summary";
import { ScheduleFields } from "./schedule-fields";

export function OwnerView({ poll, hasResponses }: { poll: PollView; hasResponses: boolean }) {
  const router = useRouter();
  const location = usePageLocation();
  const timeZone = useTimeZone();
  const prefs = usePrefs();
  const [titleDraft, setTitle] = useState<string | null>(null);
  const [savedTitle, setSavedTitle] = useState(poll.title);
  if (savedTitle !== poll.title) {
    setSavedTitle(poll.title);
    setTitle(null);
  }
  const title = titleDraft ?? poll.title;
  const [error, setError] = useState<{ at: "final" | "answers" | "settings"; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleted, setDeleted] = useState(false);
  useLiveUpdates(poll.id, !deleted);
  const justCreated = useJustCreated(location ? (new URL(location.href).pathname.split("/")[2] ?? null) : null);
  const savedOnDevice = useMyPolls().some((saved) => saved.id === poll.id);

  useEffect(() => {
    const token = window.location.pathname.split("/")[2];
    if (token) rememberPoll({ id: poll.id, token, title: poll.title, expiresAt: expiresAtFor(poll.slots) });
  }, [poll.id, poll.title, poll.slots]);
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

  async function send(method: "PATCH" | "DELETE", body?: unknown, route = "edit") {
    const path = `${window.location.pathname.replace(/\/$/, "")}/${route}`;
    await request(path, { method, ...(body === undefined ? {} : json(body)) });
  }

  async function onTitle(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await send("PATCH", { title });
      router.refresh();
    } catch (caught) {
      setError({ at: "settings", message: messageOf(caught) });
    } finally {
      setPending(false);
    }
  }

  async function onDays(dates: string[], start: number, end: number) {
    if (dates.length === 0) {
      setError({ at: "settings", message: "Pick at least one day." });
      return;
    }
    setPending(true);
    setError(null);
    try {
      await send("PATCH", { slots: buildSlots(dates, start, end, timeZone ?? deviceTimeZone()) });
      router.refresh();
    } catch (caught) {
      setError({ at: "settings", message: messageOf(caught) });
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
      setError({ at: "final", message: messageOf(caught) });
    } finally {
      setPending(false);
    }
  }

  async function onRemove(ref: string) {
    setPending(true);
    setError(null);
    try {
      await send("DELETE", undefined, `answers/${ref}`);
      router.refresh();
    } catch (caught) {
      setError({ at: "answers", message: messageOf(caught) });
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    setPending(true);
    setError(null);
    try {
      await send("DELETE");
      forgetPoll({ id: poll.id });
      setDeleted(true);
    } catch (caught) {
      setError({ at: "settings", message: messageOf(caught) });
      setPending(false);
    }
  }

  if (deleted) {
    return (
      <>
        <h1 className="text-[1.75rem] leading-9 tracking-[-0.02em] text-balance">Poll deleted</h1>
        <p className="mt-4">The poll and all its answers are gone. The links no longer work.</p>
      </>
    );
  }

  return (
    <>
      {justCreated && location ? (
        <CreatedNotice
          title={poll.title}
          publicUrl={`${location.origin}/p/${poll.id}`}
          savedOnDevice={savedOnDevice}
          onDone={dismissCreated}
        />
      ) : null}
      <p className="inline-flex items-center gap-2 text-xs text-muted">
        <span className="inline-block size-1.5 rounded-full bg-danger" aria-hidden="true" />
        Owner view. Don’t share this link.
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
      <SentenceBlock
        slots={poll.slots}
        votes={poll.voters}
        closed={poll.closed}
        emptyText="No answers yet. Share the public link to collect them."
      />
      <p className="mt-8 max-w-2xl text-sm text-muted">
        {poll.final ? "To change the final time" : "To set the final time"}, drag down a day on the grid
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
      {error?.at === "final" ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error.message}
        </p>
      ) : null}
      {draft.length > 0 && timeZone && prefs ? (
        <DraftBar
          slots={poll.slots}
          draft={draft}
          timeZone={timeZone}
          clock={prefs.clock}
          pending={pending}
          onConfirm={(final) => void setFinal(final)}
          onCancel={() => setDraft([])}
        />
      ) : null}
      {location ? (
        <section aria-labelledby="links-heading" className="mt-16 border-t border-line pt-10">
          <h2 id="links-heading" className="text-sm text-muted">
            Links
          </h2>
          <CopyLink
            label="Public link"
            note="Share this with everyone you’re asking."
            href={`${location.origin}/p/${poll.id}`}
          />
          <CopyLink
            label="Secret link"
            note="Keep this private. It’s the only way to edit or delete the poll."
            href={location.href}
            secret
          />
        </section>
      ) : null}

      {poll.voters.length > 0 ? (
        <Answers
          voters={poll.voters}
          pending={pending}
          error={error?.at === "answers" ? error.message : null}
          onRemove={(ref) => void onRemove(ref)}
        />
      ) : null}

      <section aria-labelledby="settings-heading" className="mt-16 border-t border-line pt-10">
        <h2 id="settings-heading" className="text-sm text-muted">
          Poll settings
        </h2>
        <form onSubmit={onTitle} className="mt-6 max-w-md">
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

      <div className="mt-10 max-w-xl">
        {hasResponses ? (
          <p className="text-sm text-muted">Days can’t change once people have answered. Removing every answer unlocks them.</p>
        ) : (
          <>
            {poll.final ? <p className="mb-4 text-sm text-muted">Saving new days clears the final time.</p> : null}
            <DaysEditor key={poll.slots.join("|")} slots={poll.slots} pending={pending} onSave={onDays} />
          </>
        )}
      </div>

      {error?.at === "settings" ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error.message}
        </p>
      ) : null}

      <div className="mt-16">
        {confirming ? (
          <div className="appear border-l-2 border-danger pl-4">
            <p>Delete this poll and all its answers? This can’t be undone.</p>
            <div className="mt-3 flex items-center gap-5">
              <button type="button" disabled={pending} onClick={() => void onDelete()} className="btn btn-danger">
                Delete poll
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
      </section>
    </>
  );
}

function Answers({
  voters,
  pending,
  error,
  onRemove,
}: {
  voters: VoterView[];
  pending: boolean;
  error: string | null;
  onRemove: (ref: string) => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <section aria-labelledby="answers-heading" className="mt-16 border-t border-line pt-10">
      <h2 id="answers-heading" className="text-sm text-muted">
        Answers
      </h2>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Remove an answer that’s a duplicate or doesn’t belong. The person can still answer again.
      </p>
      <ul className="mt-5 max-w-xl border-t border-line">
        {voters.map((voter, index) => {
          const ref = voter.ref;
          const times = voter.slots.length + voter.maybe.length;
          return (
            <li key={ref ?? index} className="border-b border-line py-2.5">
              {ref && confirming === ref ? (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <p className="text-sm">Remove {voter.name}’s answer?</p>
                  <button type="button" disabled={pending} onClick={() => onRemove(ref)} className="btn btn-danger">
                    Remove
                  </button>
                  <button type="button" onClick={() => setConfirming(null)} className="link-quiet">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-baseline justify-between gap-4">
                  <span className="min-w-0 truncate text-sm">{voter.name}</span>
                  <span className="flex shrink-0 items-baseline gap-5">
                    <span className="font-mono text-xs text-muted tabular-nums">
                      {times === 0 ? "No times" : times === 1 ? "1 time" : `${times} times`}
                    </span>
                    {ref ? (
                      <button
                        type="button"
                        className="link-quiet link-danger"
                        aria-label={`Remove ${voter.name}’s answer`}
                        onClick={() => setConfirming(ref)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function DraftBar({
  slots,
  draft,
  timeZone,
  clock,
  pending,
  onConfirm,
  onCancel,
}: {
  slots: string[];
  draft: string[];
  timeZone: string;
  clock: Clock;
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
  const label = rangeLabel(range.start, range.end, timeZone, clock);

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
  const timeZone = useTimeZone();
  const [draft, setDraft] = useState<{ dates: string[]; start: number; end: number } | null>(null);
  if (!client || !timeZone) return <div className="min-h-40" />;
  const schedule = draft ?? inferSchedule(slots, timeZone);

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
