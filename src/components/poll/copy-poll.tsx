"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deviceTimeZone, markCreated } from "@/client/browser";
import { expiresAtFor, rememberPoll } from "@/client/my-polls";
import { json, messageOf, request, UserFacingError } from "@/client/request";
import { useTurnstile } from "@/client/use-turnstile";
import { shiftWeeks, weeksToShift } from "@/lib/poll/copy";
import { CREATE_ACTION } from "@/lib/turnstile";
import type { PollView } from "@/lib/types";
import { appear, cn, link } from "@/components/ui/styles";

export function CopyPoll({ poll }: { poll: PollView }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { container: turnstileRef, getToken, reset: resetTurnstile } = useTurnstile(CREATE_ACTION);

  async function copy() {
    setPending(true);
    setError(null);
    try {
      const zone = poll.zone ?? deviceTimeZone();
      const weeks = weeksToShift(poll.options ? poll.options.map((option) => option.start) : poll.slots, Date.now());
      const move = (iso: string) => shiftWeeks(iso, weeks, zone);
      const options = poll.options?.map((option) => ({ start: move(option.start), end: move(option.end) })) ?? null;
      const slots = options ? options.map((option) => option.start) : poll.slots.map(move);
      const token = await getToken();
      if (!token) throw new UserFacingError("We couldn’t confirm you’re not a bot. Check your connection and try again.");
      const data = await request<{ id: string; ownerToken: string }>("/api/polls", {
        method: "POST",
        ...json({
          title: poll.title,
          kind: poll.kind,
          zone,
          duration: poll.duration,
          slots,
          options,
          "cf-turnstile-response": token,
        }),
      });
      const lastEnd = options ? new Date(Math.max(...options.map((option) => Date.parse(option.end)))).toISOString() : undefined;
      rememberPoll({ id: data.id, token: data.ownerToken, title: poll.title, expiresAt: expiresAtFor(slots, lastEnd) });
      const marked = markCreated(data.ownerToken);
      router.push(`/o/${data.ownerToken}${marked ? "" : "#created"}`);
    } catch (caught) {
      setError(messageOf(caught));
      setPending(false);
      resetTurnstile();
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="text-sm text-muted">Start a fresh poll with the same title and hours, a week or more later.</p>
        <button type="button" className={cn(link(), "shrink-0")} disabled={pending} onClick={() => void copy()}>
          {pending ? "Copying…" : "Copy to a new week"}
        </button>
      </div>
      <div ref={turnstileRef} className="mt-3 max-w-sm empty:mt-0" />
      {error ? (
        <p className={cn(appear, "mt-2 text-sm text-danger")} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
