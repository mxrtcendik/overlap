"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { slotsIn } from "@/lib/availability";
import { MAX_NAME } from "@/lib/constants";
import { json, messageOf, request, UserFacingError } from "@/lib/request";
import type { PollView as PollViewData, VoterView } from "@/lib/types";
import { useLiveUpdates } from "@/lib/use-live-updates";
import { Availability } from "./availability";
import { FinalTime } from "./final-time";
import { SentenceBlock, Status } from "./poll-summary";

export function PollView({ poll }: { poll: PollViewData }) {
  useLiveUpdates(poll.id);
  const [you, setYou] = useState<VoterView | null>(() => poll.voters.find((voter) => voter.yours) ?? null);
  const voters = useMemo(() => {
    if (!you) return poll.voters.filter((voter) => !voter.yours);
    const listed = poll.voters.some((voter) => voter.yours);
    const merged = poll.voters.map((voter) => (voter.yours ? you : voter));
    return listed ? merged : [...merged, you];
  }, [poll.voters, you]);
  const [name, setName] = useState(you?.name ?? "");
  const [selected, setSelected] = useState<string[]>(you?.slots ?? []);
  const [saved, setSaved] = useState(Boolean(you));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const nameRef = useRef(you?.name ?? "");
  const selectedRef = useRef<string[]>(you?.slots ?? []);
  const inflight = useRef(false);
  const queued = useRef<string[] | null>(null);

  function setNameValue(value: string) {
    nameRef.current = value;
    setName(value);
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

  function applyYou(nextName: string, nextSlots: string[]) {
    setYou({ name: nextName, slots: nextSlots, yours: true });
  }

  async function flush() {
    if (inflight.current) return;
    inflight.current = true;
    setPending(true);
    try {
      while (queued.current) {
        const nextSlots = queued.current;
        const nextName = nameRef.current.trim().replace(/\s+/g, " ");
        queued.current = null;
        if (!nextName) throw new UserFacingError("Enter your name first.");
        setNameValue(nextName);
        await request(`/p/${poll.id}/vote`, { method: "POST", ...json({ name: nextName, slots: nextSlots }) });
        applyYou(nextName, nextSlots);
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

  function change(next: string[]) {
    if (poll.closed) return;
    if (saved && !nameRef.current.trim()) {
      setError("Enter your name first.");
      return;
    }
    selectedRef.current = next;
    setSelected(next);
    if (saved) {
      queued.current = next;
      setYou((current) => (current ? { ...current, slots: next } : current));
      void flush();
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (poll.closed) return;
    const current = new Set(poll.slots);
    queued.current = selectedRef.current.filter((slot) => current.has(slot));
    void flush();
  }

  const nameChanged = Boolean(you) && name.trim() !== you?.name;

  return (
    <>
      <h1 className="text-[1.75rem] leading-9 tracking-[-0.02em] text-balance">{poll.title}</h1>
      {poll.final ? <FinalTime pollId={poll.id} title={poll.title} final={poll.final} /> : null}
      <SentenceBlock
        slots={poll.slots}
        votes={voters}
        closed={poll.closed}
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
          {!saved || nameChanged ? (
            <button type="submit" className="btn">
              {saved ? "Save name" : "Save answer"}
            </button>
          ) : null}
          {pending ? <Status state="saving" /> : null}
          {!pending && saved && !error ? <Status state="saved" /> : null}
        </form>
      )}
      {poll.closed ? null : (
        <p className="mt-3 text-sm text-muted">
          {saved
            ? "Your answer saves as you change it."
            : "Enter your name, drag across the times you can make, then save your answer."}
        </p>
      )}
      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-8">
        <Availability
          slots={poll.slots}
          voters={voters}
          selected={selected}
          readOnly={poll.closed}
          outline={finalOutline}
          onChange={change}
        />
      </div>
    </>
  );
}
