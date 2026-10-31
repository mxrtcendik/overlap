"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { slotsIn } from "@/lib/availability";
import { useTimeZone } from "@/lib/browser";
import { MAX_NAME } from "@/lib/constants";
import { overlapSentence } from "@/lib/sentence";
import type { PollView as PollViewData } from "@/lib/types";
import { Availability } from "./availability";
import { FinalTime } from "./final-time";
import { SentenceBlock, Status } from "./poll-summary";

export function PollView({ poll }: { poll: PollViewData }) {
  const [voters, setVoters] = useState(poll.voters);
  const you = voters.find((voter) => voter.yours) ?? null;
  const [name, setName] = useState(you?.name ?? "");
  const [selected, setSelected] = useState<string[]>(you?.slots ?? []);
  const [saved, setSaved] = useState(Boolean(you));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const timeZone = useTimeZone();
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

  const sentence = timeZone
    ? overlapSentence({
        slots: poll.slots,
        votes: voters.map((voter) => ({ name: voter.name, slots: voter.slots })),
        timeZone,
      })
    : "";

  function applyYou(nextName: string, nextSlots: string[]) {
    setVoters((current) => {
      if (current.some((voter) => voter.yours)) {
        return current.map((voter) => (voter.yours ? { ...voter, name: nextName, slots: nextSlots } : voter));
      }
      return [...current, { name: nextName, slots: nextSlots, yours: true }];
    });
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
        if (!nextName) throw new Error("Enter a name.");
        setNameValue(nextName);
        const response = await fetch(`/p/${poll.id}/vote`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: nextName, slots: nextSlots }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(data.error || "Could not save.");
        applyYou(nextName, nextSlots);
        setSaved(true);
        setError(null);
      }
    } catch (caught) {
      queued.current = null;
      setError(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      inflight.current = false;
      setPending(false);
      if (queued.current) void flush();
    }
  }

  function change(next: string[]) {
    if (poll.closed) return;
    if (saved && !nameRef.current.trim()) {
      setError("Enter a name.");
      return;
    }
    selectedRef.current = next;
    setSelected(next);
    if (saved) {
      queued.current = next;
      setVoters((people) => people.map((voter) => (voter.yours ? { ...voter, slots: next } : voter)));
      void flush();
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (poll.closed) return;
    queued.current = selectedRef.current;
    void flush();
  }

  const nameChanged = Boolean(you) && name.trim() !== you?.name;

  return (
    <>
      <h1 className="text-[1.75rem] leading-9 tracking-[-0.02em] text-balance">{poll.title}</h1>
      {poll.final ? <FinalTime pollId={poll.id} title={poll.title} final={poll.final} /> : null}
      <SentenceBlock sentence={sentence} timeZone={timeZone} closed={poll.closed} />

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
              {saved ? "Save name" : "Save"}
            </button>
          ) : null}
          {pending ? <Status state="saving" /> : null}
          {!pending && saved && !error ? <Status state="saved" /> : null}
        </form>
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
