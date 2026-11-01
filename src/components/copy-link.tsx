"use client";

import { useEffect, useState } from "react";
import { useCanShare } from "@/lib/browser";

type CopyState = "idle" | "copied" | "failed";

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function useCopyState(): [CopyState, (ok: boolean) => void] {
  const [state, setState] = useState<CopyState>("idle");
  useEffect(() => {
    if (state !== "copied") return;
    const timer = window.setTimeout(() => setState("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [state]);
  return [state, (ok) => setState(ok ? "copied" : "failed")];
}

export function CopyLabel({ idle, copied }: { idle: string; copied: boolean }) {
  return (
    <span className="copy-label grid" data-copied={copied}>
      <span className="copy-idle col-start-1 row-start-1" aria-hidden={copied}>
        {idle}
      </span>
      <span
        className="copy-done col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5"
        aria-hidden="true"
      >
        <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M2.5 6.5 5 9l4.5-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Copied
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </span>
  );
}

export function ShareBar({ title, href }: { title: string; href: string }) {
  const [state, report] = useCopyState();
  const canShare = useCanShare();

  return (
    <div className="mt-6 max-w-2xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-line py-3">
        <span className="text-sm text-muted">Public link</span>
        <a
          href={href}
          className="min-w-0 flex-1 basis-48 truncate font-mono text-[13px] underline decoration-transparent underline-offset-4 transition-colors hover:decoration-line-strong"
        >
          {href.replace(/^https?:\/\//, "")}
        </a>
        <span className="flex items-center gap-4">
          {canShare ? (
            <button
              type="button"
              className="link-quiet"
              onClick={() => void navigator.share({ title, text: `When can you make “${title}”?`, url: href }).catch(() => {})}
            >
              Share…
            </button>
          ) : null}
          <button type="button" className="btn" onClick={async () => report(await copyText(href))}>
            <CopyLabel idle="Copy link" copied={state === "copied"} />
          </button>
        </span>
      </div>
      {state === "failed" ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          Your browser blocked copying. Select the link and copy it yourself.
        </p>
      ) : null}
    </div>
  );
}

export function CopyLink({
  label,
  note,
  href,
  secret = false,
}: {
  label?: string;
  note?: string;
  href: string;
  secret?: boolean;
}) {
  const [state, report] = useCopyState();

  return (
    <div className="mt-6">
      {label ? (
        <div className="flex items-center gap-2 text-sm">
          {secret ? <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-danger" /> : null}
          {label}
        </div>
      ) : null}
      {note ? <p className="mt-0.5 text-sm text-muted">{note}</p> : null}
      <div className="mt-1.5 flex items-start gap-4">
        <a
          href={href}
          referrerPolicy="no-referrer"
          className="min-w-0 font-mono text-[13px] leading-6 break-all underline decoration-line underline-offset-4 transition-colors hover:decoration-foreground"
        >
          {href}
        </a>
        <button type="button" className="link-quiet shrink-0 leading-6" onClick={async () => report(await copyText(href))}>
          <CopyLabel idle="Copy" copied={state === "copied"} />
        </button>
      </div>
      {state === "failed" ? (
        <p className="mt-1 text-sm text-danger" role="alert">
          Your browser blocked copying. Select the link and copy it yourself.
        </p>
      ) : null}
    </div>
  );
}
