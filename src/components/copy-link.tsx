"use client";

import { useEffect, useState } from "react";

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

export function CopyLink({
  label,
  note,
  href,
  secret = false,
}: {
  label: string;
  note?: string;
  href: string;
  secret?: boolean;
}) {
  const [state, report] = useCopyState();

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 text-sm">
        {secret ? <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-danger" /> : null}
        {label}
      </div>
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
          <span aria-live="polite">{state === "copied" ? "Copied" : "Copy"}</span>
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
