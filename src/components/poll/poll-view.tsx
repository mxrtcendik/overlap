"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { slotsIn } from "@/lib/poll/availability";
import { MAX_NAME, MAX_NOTE } from "@/lib/constants";
import { json, messageOf, request, UserFacingError } from "@/client/request";
import type { PollView as PollViewData, VoterView } from "@/lib/types";
import { useLiveUpdates, useRefreshAt } from "@/client/use-live-updates";
import { useTurnstile } from "@/client/use-turnstile";
import { VOTE_ACTION } from "@/lib/turnstile";
import { currentWeek, IDENTITY, projectPoll } from "@/lib/time/week-projection";
import { Availability } from "./availability";
import { CalendarFill } from "./calendar-fill";
import { OptionsView } from "./options-view";
import { deviceTimeZone, useTimeZone } from "@/client/browser";
import { EmailSubscription } from "../common/email-subscription";
import { FinalTime } from "./final-time";
import type { Brush } from "./poll-grid";
import { SentenceBlock, Status } from "./poll-summary";
import { Segmented } from "../ui/segmented";
import { appear, button, card, cn, field, heading, link } from "@/components/ui/styles";
import { PresenceLine } from "./presence";

type Answer = { slots: string[]; maybe: string[] };

const NO_ANSWER: Answer = { slots: [], maybe: [] };

export function PollView({ poll: stored, canEmail = false }: { poll: PollViewData; canEmail?: boolean }) {
  const [now] = useState(() => Date.now());
  const projection = useMemo(
    () => (stored.kind === "weekly" && stored.zone ? currentWeek(stored.slots, stored.zone, now) : IDENTITY),
    [stored.kind, stored.zone, stored.slots, now],
  );
  const poll = useMemo(() => projectPoll(stored, projection), [stored, projection]);
  const presence = useLiveUpdates(poll.id);
  const viewerZone = useTimeZone();
  const weekly = poll.kind === "weekly";
  useRefreshAt(poll.closed ? null : poll.closesAt);
  const [you, setYou] = useState<VoterView | null>(() => poll.voters.find((voter) => voter.yours) ?? null);
  const voters = useMemo(() => {
    if (!you) return poll.voters.filter((voter) => !voter.yours);
    const listed = poll.voters.some((voter) => voter.yours);
    const merged = poll.voters.map((voter) => (voter.yours ? you : voter));
    return listed ? merged : [...merged, you];
  }, [poll.voters, you]);
  const [name, setName] = useState(you?.name ?? "");
  const [note, setNote] = useState(you?.note ?? "");
  const [answer, setAnswer] = useState<Answer>(you ? { slots: you.slots, maybe: you.maybe } : NO_ANSWER);
  const [brush, setBrush] = useState<Brush>("yes");
  const [saved, setSaved] = useState(Boolean(you));
  const savedRef = useRef(Boolean(you));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const nameRef = useRef(you?.name ?? "");
  const noteRef = useRef(you?.note ?? "");
  const answerRef = useRef<Answer>(you ? { slots: you.slots, maybe: you.maybe } : NO_ANSWER);
  const inflight = useRef(false);
  const queued = useRef<Answer | null>(null);
  const { container: turnstileRef, getToken, reset: resetTurnstile } = useTurnstile(VOTE_ACTION);

  function setNameValue(value: string) {
    nameRef.current = value;
    setName(value);
  }

  function setNoteValue(value: string) {
    noteRef.current = value;
    setNote(value);
  }

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

  function applyYou(nextName: string, nextNote: string, next: Answer) {
    setYou((current) => ({
      name: nextName,
      note: nextNote || null,
      required: current?.required ?? false,
      zone: deviceTimeZone(),
      slots: next.slots,
      maybe: next.maybe,
      yours: true,
    }));
  }

  async function flush() {
    if (inflight.current) return;
    inflight.current = true;
    setPending(true);
    try {
      while (queued.current) {
        const next = queued.current;
        const nextName = nameRef.current.trim().replace(/\s+/g, " ");
        const nextNote = noteRef.current.trim().replace(/\s+/g, " ");
        queued.current = null;
        if (!nextName) throw new UserFacingError("Enter your name first.");
        setNameValue(nextName);
        setNoteValue(nextNote);
        const first = !savedRef.current;
        const token = first ? await getToken() : null;
        if (first && !token) {
          throw new UserFacingError("We couldn’t confirm you’re not a bot. Check your connection and try again.");
        }
        try {
          await request(`/p/${poll.id}/vote`, {
            method: "POST",
            ...json({
              name: nextName,
              note: nextNote,
              slots: next.slots.map(projection.toStored),
              maybe: next.maybe.map(projection.toStored),
              zone: deviceTimeZone(),
              "cf-turnstile-response": token ?? undefined,
            }),
          });
        } finally {
          if (first) resetTurnstile();
        }
        savedRef.current = true;
        applyYou(nextName, nextNote, next);
        setSaved(true);
        setError(null);
      }
    } catch (caught) {
      queued.current = null;
      setError(messageOf(caught));
    } finally {
      inflight.current = false;
      setPending(false);
      if (queued.current) void flush();
    }
  }

  function change(slots: string[], maybe: string[]) {
    if (poll.closed) return;
    presence.announceEditing();
    if (saved && !nameRef.current.trim()) {
      setError("Enter your name first.");
      return;
    }
    const next = { slots, maybe };
    answerRef.current = next;
    setAnswer(next);
    if (saved) {
      queued.current = next;
      setYou((current) => (current ? { ...current, ...next } : current));
      void flush();
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (poll.closed) return;
    const current = new Set(poll.slots);
    queued.current = {
      slots: answerRef.current.slots.filter((slot) => current.has(slot)),
      maybe: answerRef.current.maybe.filter((slot) => current.has(slot)),
    };
    void flush();
  }

  async function removeAnswer() {
    if (inflight.current) return;
    inflight.current = true;
    queued.current = null;
    setPending(true);
    setError(null);
    try {
      await request(`/p/${poll.id}/vote`, { method: "DELETE" });
      setYou(null);
      setSaved(false);
      savedRef.current = false;
      answerRef.current = NO_ANSWER;
      setAnswer(NO_ANSWER);
      setConfirmingRemove(false);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      inflight.current = false;
      setPending(false);
    }
  }

  const nameChanged = Boolean(you) && name.trim() !== you?.name;
  const noteChanged = Boolean(you) && note.trim().replace(/\s+/g, " ") !== (you?.note ?? "");

  return (
    <>
      <h1 className={heading.page}>{poll.title}</h1>
      {poll.final ? <FinalTime pollId={poll.id} title={poll.title} final={poll.final} place={poll.place} weekly={weekly} zone={poll.zone} /> : null}
      <SentenceBlock
        slots={poll.slots}
        votes={voters}
        closed={poll.closed}
        deadline={poll.deadline}
        lastEnd={poll.lastEnd}
        weekly={weekly}
        duration={poll.duration}
        options={poll.options}
        emptyText="No answers yet. Be the first."
      />
      <PresenceLine presence={presence} className="mt-3" />

      {poll.closed ? null : (
        <form onSubmit={onSubmit} className="mt-8 flex flex-wrap items-end gap-3">
          <label className="text-[13px] font-medium text-foreground">
            Your name
            <input
              value={name}
              onChange={(event) => setNameValue(event.target.value)}
              maxLength={MAX_NAME}
              required
              autoComplete="name"
              className={cn(field(), "mt-1 w-56")}
            />
          </label>
          <label className="text-[13px] font-medium text-foreground">
            Note <span className="text-muted">(optional)</span>
            <input
              value={note}
              onChange={(event) => setNoteValue(event.target.value)}
              maxLength={MAX_NOTE}
              placeholder="Remote only"
              autoComplete="off"
              className={cn(field(), "mt-1 w-64")}
            />
          </label>
          {!saved || nameChanged || noteChanged ? (
            <button type="submit" className={button()}>
              {!saved ? "Save answer" : nameChanged && noteChanged ? "Save changes" : nameChanged ? "Save name" : "Save note"}
            </button>
          ) : null}
          {pending ? <Status state="saving" /> : null}
          {!pending && saved && !error ? <Status state="saved" /> : null}
        </form>
      )}
      {poll.closed ? null : <div ref={turnstileRef} className="mt-3 max-w-sm empty:mt-0" />}
      {poll.closed ? null : confirmingRemove ? (
        <div className={cn(appear, "mt-4 max-w-xl border-l-2 border-danger pl-4")}>
          <p className="text-sm">Remove your answer? Your name and times are deleted from this poll.</p>
          <div className="mt-3 flex items-center gap-5">
            <button type="button" disabled={pending} onClick={() => void removeAnswer()} className={button({ variant: "danger" })}>
              Remove answer
            </button>
            <button type="button" onClick={() => setConfirmingRemove(false)} className={link()}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-muted">
          {saved ? (
            <>
              <span>Your answer saves as you change it.</span>
              <button
                type="button"
                className={link({ tone: "danger" })}
                onClick={() => setConfirmingRemove(true)}
              >
                Remove my answer
              </button>
            </>
          ) : (
            poll.options
              ? "Enter your name, answer each time, then save your answer."
              : "Enter your name, drag across the times you can make, then save your answer. Your timezone is saved with it, so the best time can avoid your night hours."
          )}
        </p>
      )}
      {error ? (
        <p className={cn(appear, "mt-3 text-sm text-danger")} role="alert">
          {error}
        </p>
      ) : null}
      {canEmail && saved && you && !poll.closed && !poll.final ? (
        <div className="mt-5 max-w-xl">
          <EmailSubscription
            label="Email me the final time"
            current={you.email ?? null}
            activeText={(address) =>
              you.remind
                ? `The final time, and a reminder the day before, will be emailed to ${address}.`
                : `The final time will be emailed to ${address}.`
            }
            hint="Two emails at most: the final time, and a reminder the day before. Your address is deleted with the poll, and the owner never sees it."
            onSave={async (email) => {
              await request(`/p/${poll.id}/notify`, {
                method: "POST",
                ...json({ email, zone: viewerZone ?? deviceTimeZone() }),
              });
              setYou((current) => (current ? { ...current, email, remind: email !== null } : current));
            }}
          />
        </div>
      ) : null}

      {poll.options ? (
        <div className={cn(card, "mt-8 p-4 sm:p-6")}>
          {poll.closed ? null : (
            <div className="mb-4">
              <CalendarFill
                slots={poll.slots}
                options={poll.options}
                hasAnswer={answer.slots.length + answer.maybe.length > 0}
                onApply={(free) => change(free, [])}
              />
            </div>
          )}
          <OptionsView
            options={poll.options}
            voters={voters}
            answer={answer}
            final={poll.final}
            readOnly={poll.closed}
            onChange={change}
          />
        </div>
      ) : (
      <div className={cn(card, "mt-8 p-4 sm:p-6")}>
        {poll.closed ? null : (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
            <BrushSwitch value={brush} onChange={setBrush} />
            <CalendarFill
              slots={poll.slots}
              hasAnswer={answer.slots.length + answer.maybe.length > 0}
              onApply={(free) => change(free, [])}
            />
          </div>
        )}
        <Availability
          slots={poll.slots}
          voters={voters}
          selected={answer.slots}
          maybe={answer.maybe}
          brush={brush}
          readOnly={poll.closed}
          outline={finalOutline}
          weekly={weekly}
          duration={poll.duration}
          onChange={change}
        />
      </div>
      )}
    </>
  );
}

function BrushSwitch({ value, onChange }: { value: Brush; onChange: (brush: Brush) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span id="brush-label" className="text-sm text-muted">
        Mark times as
      </span>
      <Segmented
        aria-labelledby="brush-label"
        value={value}
        onChange={onChange}
        options={[
          { value: "yes", label: <><span aria-hidden="true" className="inline-block size-3 rounded-[2px] bg-current" />Can make</> },
          { value: "maybe", label: <><span aria-hidden="true" className="hatch inline-block size-3 rounded-[2px] border border-current" />If needed</> },
        ]}
      />
    </div>
  );
}
