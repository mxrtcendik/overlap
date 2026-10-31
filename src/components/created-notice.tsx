"use client";

import { useEffect, useRef } from "react";
import { useCanShare } from "@/lib/browser";
import { copyText, useCopyState } from "./copy-link";

export function CreatedNotice({
  title,
  publicUrl,
  savedOnDevice,
  onDone,
}: {
  title: string;
  publicUrl: string;
  savedOnDevice: boolean;
  onDone: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [state, report] = useCopyState();
  const canShare = useCanShare();

  useEffect(() => {
    heading.current?.focus();
    if (window.location.hash === "#created") {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  }, []);

  return (
    <section aria-labelledby="created-heading" className="mb-12 border border-line bg-paper p-5 sm:p-6">
      <h2
        id="created-heading"
        ref={heading}
        tabIndex={-1}
        className="inline-flex items-center gap-2 text-xs text-muted outline-none"
      >
        <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-accent" />
        Poll created
      </h2>
      <p className="mt-2 text-xl leading-8 tracking-[-0.01em] text-balance">
        Send the public link to everyone you’re asking.
      </p>
      <p className="mt-3 font-mono text-[13px] leading-6 break-all">{publicUrl}</p>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button type="button" className="btn" onClick={async () => report(await copyText(publicUrl))}>
          <span aria-live="polite">{state === "copied" ? "Copied" : "Copy public link"}</span>
        </button>
        {canShare ? (
          <button
            type="button"
            className="link-quiet"
            onClick={() => void navigator.share({ title, text: `When can you make “${title}”?`, url: publicUrl }).catch(() => {})}
          >
            Share…
          </button>
        ) : null}
        <button type="button" className="link-quiet ml-auto" onClick={onDone}>
          Done
        </button>
      </div>
      {state === "failed" ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          Your browser blocked copying. Select the link and copy it yourself.
        </p>
      ) : null}
      <p className="mt-5 flex gap-2 border-t border-line pt-4 text-sm leading-6 text-muted">
        <span aria-hidden="true" className="mt-2.5 inline-block size-1.5 shrink-0 rounded-full bg-danger" />
        <span>
          This page is your secret link. Bookmark it: it’s the only way to edit or delete the poll
          {savedOnDevice ? ", and it’s also saved in this browser." : "."}
        </span>
      </p>
    </section>
  );
}
