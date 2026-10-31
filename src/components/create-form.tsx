"use client";

import { useState, type FormEvent } from "react";
import { MAX_TITLE } from "@/lib/constants";
import { buildSlots } from "@/lib/schedule";
import { CopyLink } from "./copy-link";
import { ScheduleFields } from "./schedule-fields";

export function CreateForm() {
  const [title, setTitle] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [start, setStart] = useState(9 * 60);
  const [end, setEnd] = useState(17 * 60);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [links, setLinks] = useState<{ publicUrl: string; secretUrl: string } | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (dates.length === 0) {
      setError("Pick at least one day.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/polls", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, slots: buildSlots(dates, start, end) }),
      });
      const data = (await response.json()) as { error?: string; id?: string; ownerToken?: string };
      if (!response.ok || !data.id || !data.ownerToken) {
        throw new Error(data.error || "Could not create the poll.");
      }
      const origin = window.location.origin;
      setLinks({
        publicUrl: `${origin}/p/${data.id}`,
        secretUrl: `${origin}/o/${data.ownerToken}`,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the poll.");
    } finally {
      setPending(false);
    }
  }

  if (links) {
    return (
      <>
        <h1 className="text-[1.75rem] leading-9 tracking-[-0.02em] text-balance">Save both links</h1>
        <p className="mt-4 text-sm leading-6">
          This screen shows them together once. Anyone with the public link can answer. The secret link is the only way
          to edit or delete the poll. If you lose it, you cannot get it back.
        </p>
        <CopyLink label="Public link" href={links.publicUrl} />
        <CopyLink label="Secret link" href={links.secretUrl} />
        <button
          type="button"
          className="mt-10 link-quiet"
          onClick={() => {
            setLinks(null);
            setTitle("");
            setDates([]);
          }}
        >
          Make another poll
        </button>
      </>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <h1 className="text-[1.75rem] leading-9 tracking-[-0.02em] text-balance">New poll</h1>
      <label className="mt-8 block text-sm text-muted">
        Title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={MAX_TITLE}
          required
          className="field mt-1"
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
      <button type="submit" disabled={pending} className="mt-8 btn">
        {pending ? "Creating" : "Create poll"}
      </button>
    </form>
  );
}
