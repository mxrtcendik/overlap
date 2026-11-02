"use client";

import { useEffect, useRef } from "react";
import { useCanShare } from "@/client/browser";
import { copyText, CopyLabel, useCopyState } from "./copy-link";
import { EmailLinks } from "./email-links";
import { appear, arrive, button, cn, link } from "@/components/ui/styles";

export function CreatedNotice({
  title,
  publicUrl,
  savedOnDevice,
  canEmail,
  onDone,
}: {
  title: string;
  publicUrl: string;
  savedOnDevice: boolean;
  canEmail: boolean;
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
    <section aria-labelledby="created-heading" className={cn(arrive, "mb-12 border-y border-line py-6")}>
      <h2
        id="created-heading"
        ref={heading}
        tabIndex={-1}
        className="text-sm text-muted outline-none"
      >
        Poll created
      </h2>
      <p className="mt-2 font-display text-2xl leading-snug text-balance">
        Send the public link to everyone you’re asking.
      </p>
      <p className="mt-3 font-mono text-[13px] leading-6 break-all">{publicUrl}</p>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button type="button" className={button()} onClick={async () => report(await copyText(publicUrl))}>
          <CopyLabel idle="Copy public link" copied={state === "copied"} />
        </button>
        {canShare ? (
          <button
            type="button"
            className={link()}
            onClick={() => void navigator.share({ title, text: `When can you make “${title}”?`, url: publicUrl }).catch(() => {})}
          >
            Share…
          </button>
        ) : null}
        <button type="button" className={cn(link(), "ml-auto")} onClick={onDone}>
          Done
        </button>
      </div>
      {state === "failed" ? (
        <p className={cn(appear, "mt-3 text-sm text-danger")} role="alert">
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
      {canEmail ? <EmailLinks className="mt-4" /> : null}
    </section>
  );
}
