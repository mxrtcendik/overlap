"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MAX_TITLE } from "@/lib/constants";
import { json, messageOf, request } from "@/lib/request";
import { buildSlots } from "@/lib/schedule";
import { CopyLink, copyText, useCopyState } from "./copy-link";
import { ScheduleFields } from "./schedule-fields";

export function CreateForm() {
  const [title, setTitle] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [start, setStart] = useState(9 * 60);
  const [end, setEnd] = useState(17 * 60);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [links, setLinks] = useState<{ title: string; publicUrl: string; secretUrl: string } | null>(null);
  const linksHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (links) linksHeading.current?.focus();
  }, [links]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (dates.length === 0) {
      setError("Pick at least one day.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const data = await request<{ id: string; ownerToken: string }>("/api/polls", {
        method: "POST",
        ...json({ title, slots: buildSlots(dates, start, end) }),
      });
      const origin = window.location.origin;
      setLinks({
        title: title.trim(),
        publicUrl: `${origin}/p/${data.id}`,
        secretUrl: `${origin}/o/${data.ownerToken}`,
      });
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setPending(false);
    }
  }

  if (links) {
    return (
      <SavedLinks
        links={links}
        headingRef={linksHeading}
        onAnother={() => {
          setLinks(null);
          setTitle("");
          setDates([]);
        }}
      />
    );
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
      <button type="submit" disabled={pending} className="mt-8 btn">
        {pending ? "Creating…" : "Create poll"}
      </button>
    </form>
  );
}

function SavedLinks({
  links,
  headingRef,
  onAnother,
}: {
  links: { title: string; publicUrl: string; secretUrl: string };
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onAnother: () => void;
}) {
  const [state, report] = useCopyState();

  return (
    <>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="scroll-mt-10 text-[1.75rem] leading-9 tracking-[-0.02em] text-balance outline-none"
      >
        Save both links
      </h2>
      <p className="mt-4 leading-7">You’ll only see this once. Save both links now.</p>
      <CopyLink label="Public link" note="Share this with everyone you’re asking." href={links.publicUrl} />
      <CopyLink
        label="Secret link"
        note="Keep this private. It’s the only way to edit or delete the poll, and it can’t be recovered."
        href={links.secretUrl}
        secret
      />
      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="button"
          className="btn"
          onClick={async () =>
            report(
              await copyText(`${links.title}\n\nPublic link: ${links.publicUrl}\nSecret link (keep private): ${links.secretUrl}`),
            )
          }
        >
          <span aria-live="polite">{state === "copied" ? "Copied both" : "Copy both links"}</span>
        </button>
        <a href={links.secretUrl} referrerPolicy="no-referrer" className="link-quiet">
          Open the owner view
        </a>
        <button type="button" className="link-quiet" onClick={onAnother}>
          Create another poll
        </button>
      </div>
      {state === "failed" ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          Your browser blocked copying. Select each link and copy it yourself.
        </p>
      ) : null}
    </>
  );
}
