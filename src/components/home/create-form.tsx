"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { deviceTimeZone, markCreated, useTimeZone } from "@/client/browser";
import { MAX_TITLE } from "@/lib/constants";
import { expiresAtFor, rememberPoll } from "@/client/my-polls";
import { json, messageOf, request, UserFacingError } from "@/client/request";
import { buildSlots } from "@/lib/time/schedule";
import { CREATE_ACTION } from "@/lib/turnstile";
import { useTurnstile } from "@/client/use-turnstile";
import { WEEKLY_OPEN_MS, type PollKind } from "@/lib/time/weekly";
import { ScheduleFields } from "../common/schedule-fields";

export function CreateForm() {
  const router = useRouter();
  const timeZone = useTimeZone();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<PollKind>("dates");
  const [dates, setDates] = useState<string[]>([]);
  const [start, setStart] = useState(9 * 60);
  const [end, setEnd] = useState(17 * 60);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { container: turnstileRef, getToken, reset: resetTurnstile } = useTurnstile(CREATE_ACTION);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (dates.length === 0) {
      setError("Pick at least one day.");
      return;
    }
    setPending(true);
    setError(null);
    const zone = timeZone ?? deviceTimeZone();
    const slots = buildSlots(dates, start, end, zone);
    try {
      const token = await getToken();
      if (!token) {
        throw new UserFacingError("We couldn’t confirm you’re not a bot. Check your connection and try again.");
      }
      const data = await request<{ id: string; ownerToken: string }>("/api/polls", {
        method: "POST",
        ...json({ title, slots, kind, zone, "cf-turnstile-response": token }),
      });
      const lastEnd = kind === "weekly" ? new Date(Date.now() + WEEKLY_OPEN_MS).toISOString() : undefined;
      rememberPoll({ id: data.id, token: data.ownerToken, title: title.trim(), expiresAt: expiresAtFor(slots, lastEnd) });
      const marked = markCreated(data.ownerToken);
      router.push(`/o/${data.ownerToken}${marked ? "" : "#created"}`);
    } catch (caught) {
      setError(messageOf(caught));
      setPending(false);
      resetTurnstile();
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h2 className="text-[1.75rem] leading-9 tracking-[-0.02em] text-balance">Create a poll</h2>
      <label className="mt-8 block text-sm text-muted">
        Title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={MAX_TITLE}
          required
          placeholder="Team retro"
          className="field mt-1 placeholder:text-muted/60"
        />
      </label>
      <KindSwitch
        value={kind}
        onChange={(next) => {
          setKind(next);
          setDates([]);
          setError(null);
        }}
      />
      <div className="mt-6">
        <ScheduleFields
          weekly={kind === "weekly"}
          dates={dates}
          start={start}
          end={end}
          onDates={setDates}
          onStart={setStart}
          onEnd={setEnd}
        />
      </div>
      {error ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div ref={turnstileRef} className="mt-6 max-w-sm empty:mt-0" />
      <button type="submit" disabled={pending} className="mt-8 btn">
        {pending ? "Creating…" : "Create poll"}
      </button>
    </form>
  );
}

function KindSwitch({ value, onChange }: { value: PollKind; onChange: (kind: PollKind) => void }) {
  const options: { kind: PollKind; label: string }[] = [
    { kind: "dates", label: "Specific dates" },
    { kind: "weekly", label: "Days of the week" },
  ];
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
      <span id="kind-label" className="text-sm text-muted">
        Ask about
      </span>
      <div role="group" aria-labelledby="kind-label" className="inline-flex border border-line">
        {options.map((option) => {
          const on = option.kind === value;
          return (
            <button
              key={option.kind}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(option.kind)}
              className={`px-3 py-1.5 text-sm transition-colors ${
                on ? "bg-paper text-foreground shadow-[inset_0_0_0_1px_var(--foreground)]" : "text-muted hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
