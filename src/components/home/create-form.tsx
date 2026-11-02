"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { deviceTimeZone, markCreated, useTimeZone, useToday } from "@/client/browser";
import { MAX_TITLE } from "@/lib/constants";
import { expiresAtFor, rememberPoll } from "@/client/my-polls";
import { json, messageOf, request, UserFacingError } from "@/client/request";
import { buildSlots } from "@/lib/time/schedule";
import { CREATE_ACTION } from "@/lib/turnstile";
import { useTurnstile } from "@/client/use-turnstile";
import { WEEKLY_OPEN_MS, type PollKind } from "@/lib/time/weekly";
import { DurationField } from "../common/duration-field";
import { ScheduleFields } from "../common/schedule-fields";
import { defaultOptions, OptionsFields, toOptions, type OptionDraft } from "../common/options-fields";
import { Segmented } from "../ui/segmented";
import { appear, button, cn, field, label } from "@/components/ui/styles";

export function CreateForm() {
  const router = useRouter();
  const timeZone = useTimeZone();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<PollKind>("dates");
  const [dates, setDates] = useState<string[]>([]);
  const [start, setStart] = useState(9 * 60);
  const [end, setEnd] = useState(17 * 60);
  const [duration, setDuration] = useState<number | null>(null);
  const today = useToday();
  const [drafts, setDrafts] = useState<OptionDraft[] | null>(null);
  const fitting = duration !== null && duration <= end - start ? duration : null;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { container: turnstileRef, getToken, reset: resetTurnstile } = useTurnstile(CREATE_ACTION);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (kind !== "options" && dates.length === 0) {
      setError("Pick at least one day.");
      return;
    }
    setPending(true);
    setError(null);
    const zone = timeZone ?? deviceTimeZone();
    const options = kind === "options" && drafts ? toOptions(drafts, zone) : null;
    const slots = options ? options.map((option) => option.start) : buildSlots(dates, start, end, zone);
    try {
      const token = await getToken();
      if (!token) {
        throw new UserFacingError("We couldn’t confirm you’re not a bot. Check your connection and try again.");
      }
      const data = await request<{ id: string; ownerToken: string }>("/api/polls", {
        method: "POST",
        ...json({ title, slots, kind, zone, duration: fitting, options, "cf-turnstile-response": token }),
      });
      const lastEnd =
        kind === "weekly"
          ? new Date(Date.now() + WEEKLY_OPEN_MS).toISOString()
          : options
            ? new Date(Math.max(...options.map((option) => Date.parse(option.end)))).toISOString()
            : undefined;
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
      <h2 className="font-display text-3xl font-medium tracking-[-0.02em] text-balance sm:text-4xl">Create a poll</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-pretty text-muted">
        Two links, no account. The public one is for everyone. The secret one is the only way to edit the poll.
      </p>
      <label className="mt-6 block text-[13px] font-medium text-foreground">
        Title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={MAX_TITLE}
          required
          placeholder="Team retro"
          className={cn(field(), "mt-1.5")}
        />
      </label>
      <KindSwitch
        value={kind}
        onChange={(next) => {
          setKind(next);
          setDates([]);
          if (next === "options" && !drafts && today) setDrafts(defaultOptions(today));
          setError(null);
        }}
      />
      <div key={kind} className={cn(appear, "mt-6")}>
        {kind === "options" && drafts ? (
          <OptionsFields drafts={drafts} onChange={setDrafts} />
        ) : (
          <>
            <ScheduleFields
              weekly={kind === "weekly"}
              dates={dates}
              start={start}
              end={end}
              onDates={setDates}
              onStart={setStart}
              onEnd={setEnd}
            />
            <div className="mt-6">
              <DurationField value={fitting} max={end - start} onChange={setDuration} />
            </div>
          </>
        )}
      </div>
      {error ? (
        <p className={cn(appear, "mt-4 text-sm text-danger")} role="alert">
          {error}
        </p>
      ) : null}
      <div ref={turnstileRef} className="mt-6 max-w-sm empty:mt-0" />
      <button type="submit" disabled={pending} className={cn(button({ variant: "accent", size: "lg" }), "mt-8 w-full sm:w-auto")}>
        {pending ? "Creating…" : "Create poll"}
      </button>
    </form>
  );
}

function KindSwitch({ value, onChange }: { value: PollKind; onChange: (kind: PollKind) => void }) {
  return (
    <div className="mt-6 flex flex-col gap-2">
      <span id="kind-label" className={label}>
        Ask about
      </span>
      <Segmented
        aria-labelledby="kind-label"
        fill
        value={value}
        onChange={onChange}
        options={[
          { value: "dates", label: "Specific dates" },
          { value: "weekly", label: "Days of the week" },
          { value: "options", label: "Set times" },
        ]}
      />
    </div>
  );
}
