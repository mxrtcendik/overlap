"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { slotsIn } from "@/lib/availability";
import { MAX_NAME, MAX_NOTE } from "@/lib/constants";
import { json, messageOf, request, UserFacingError } from "@/lib/request";
import type { PollView as PollViewData, VoterView } from "@/lib/types";
import { useLiveUpdates, useRefreshAt } from "@/lib/use-live-updates";
import { Availability } from "./availability";
import { CalendarFill } from "./calendar-fill";
import { FinalTime } from "./final-time";
import type { Brush } from "./poll-grid";
import { SentenceBlock, Status } from "./poll-summary";

type Answer = { slots: string[]; maybe: string[] };

const NO_ANSWER: Answer = { slots: [], maybe: [] };

export function PollView({ poll }: { poll: PollViewData }) {
  useLiveUpdates(poll.id);
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
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const nameRef = useRef(you?.name ?? "");
  const noteRef = useRef(you?.note ?? "");
  const answerRef = useRef<Answer>(you ? { slots: you.slots, maybe: you.maybe } : NO_ANSWER);
  const inflight = useRef(false);
  const queued = useRef<Answer | null>(null);

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
    setYou({ name: nextName, note: nextNote || null, slots: next.slots, maybe: next.maybe, yours: true });
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
        await request(`/p/${poll.id}/vote`, {
          method: "POST",
          ...json({ name: nextName, note: nextNote, slots: next.slots, maybe: next.maybe }),
        });
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
      <h1 className="text-[1.75rem] leading-9 tracking-[-0.02em] text-balance">{poll.title}</h1>
      {poll.final ? <FinalTime pollId={poll.id} title={poll.title} final={poll.final} weekly={weekly} /> : null}
      <SentenceBlock
        slots={poll.slots}
        votes={voters}
        closed={poll.closed}
        deadline={poll.deadline}
        lastEnd={poll.lastEnd}
        weekly={weekly}
        emptyText="No answers yet. Be the first."
      />

      {poll.closed ? null : (
        <form onSubmit={onSubmit} className="mt-8 flex flex-wrap items-end gap-3">
          <label className="text-sm text-muted">
            Your name
            <input
              value={name}
              onChange={(event) => setNameValue(event.target.value)}
              maxLength={MAX_NAME}
              required
              autoComplete="name"
              className="field mt-1 w-56"
            />
          </label>
          <label className="text-sm text-muted">
            Note <span className="text-muted/70">(optional)</span>
            <input
              value={note}
              onChange={(event) => setNoteValue(event.target.value)}
              maxLength={MAX_NOTE}
              placeholder="Remote only"
              autoComplete="off"
              className="field mt-1 w-64 placeholder:text-muted/60"
            />
          </label>
          {!saved || nameChanged || noteChanged ? (
            <button type="submit" className="btn">
              {!saved ? "Save answer" : nameChanged && noteChanged ? "Save changes" : nameChanged ? "Save name" : "Save note"}
            </button>
          ) : null}
          {pending ? <Status state="saving" /> : null}
          {!pending && saved && !error ? <Status state="saved" /> : null}
        </form>
      )}
      {poll.closed ? null : confirmingRemove ? (
        <div className="appear mt-4 max-w-xl border-l-2 border-danger pl-4">
          <p className="text-sm">Remove your answer? Your name and times are deleted from this poll.</p>
          <div className="mt-3 flex items-center gap-5">
            <button type="button" disabled={pending} onClick={() => void removeAnswer()} className="btn btn-danger">
              Remove answer
            </button>
            <button type="button" onClick={() => setConfirmingRemove(false)} className="link-quiet">
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
                className="link-quiet link-danger decoration-line-strong hover:decoration-current"
                onClick={() => setConfirmingRemove(true)}
              >
                Remove my answer
              </button>
            </>
          ) : (
            "Enter your name, drag across the times you can make, then save your answer."
          )}
        </p>
      )}
      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-8">
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
          onChange={change}
        />
      </div>
    </>
  );
}

function BrushSwitch({ value, onChange }: { value: Brush; onChange: (brush: Brush) => void }) {
  const options: { brush: Brush; label: string }[] = [
    { brush: "yes", label: "Can make" },
    { brush: "maybe", label: "If needed" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span id="brush-label" className="text-sm text-muted">
        Mark times as
      </span>
      <div role="group" aria-labelledby="brush-label" className="inline-flex border border-line">
        {options.map((option) => {
          const on = option.brush === value;
          return (
            <button
              key={option.brush}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(option.brush)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                on ? "bg-paper text-foreground shadow-[inset_0_0_0_1px_var(--foreground)]" : "text-muted hover:text-foreground"
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-block size-3 rounded-[2px] ${
                  option.brush === "yes" ? "bg-foreground" : "hatch border border-foreground"
                }`}
              />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
