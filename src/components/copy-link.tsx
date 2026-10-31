"use client";

import { useState } from "react";

export function CopyLink({ label, href }: { label: string; href: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-5">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 flex items-start gap-4">
        <a
          href={href}
          referrerPolicy="no-referrer"
          className="min-w-0 font-mono text-[13px] leading-6 break-all underline decoration-line underline-offset-4 transition-colors hover:decoration-foreground"
        >
          {href}
        </a>
        <button
          type="button"
          className="link-quiet shrink-0 leading-6"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(href);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
}
