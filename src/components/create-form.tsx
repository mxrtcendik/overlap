"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { deviceTimeZone, markCreated, useTimeZone } from "@/lib/browser";
import { MAX_TITLE } from "@/lib/constants";
import { expiresAtFor, rememberPoll } from "@/lib/my-polls";
import { json, messageOf, request, UserFacingError } from "@/lib/request";
import { buildSlots } from "@/lib/schedule";
import { CREATE_ACTION } from "@/lib/turnstile-check";
import { useTurnstile } from "@/lib/use-turnstile";
import { ScheduleFields } from "./schedule-fields";

export function CreateForm() {
  const router = useRouter();
  const timeZone = useTimeZone();
  const [title, setTitle] = useState("");
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
    const slots = buildSlots(dates, start, end, timeZone ?? deviceTimeZone());
    try {
      const token = await getToken();
      if (!token) {
        throw new UserFacingError("We couldn’t confirm you’re not a bot. Check your connection and try again.");
      }
      const data = await request<{ id: string; ownerToken: string }>("/api/polls", {
        method: "POST",
        ...json({ title, slots, "cf-turnstile-response": token }),
      });
      rememberPoll({ id: data.id, token: data.ownerToken, title: title.trim(), expiresAt: expiresAtFor(slots) });
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
      <div className="mt-8">
        <ScheduleFields dates={dates} start={start} end={end} onDates={setDates} onStart={setStart} onEnd={setEnd} />
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
