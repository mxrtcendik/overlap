"use client";

import type { Presence } from "@/client/use-live-updates";
import { appear, cn } from "@/components/ui/styles";

export function PresenceLine({ presence, className }: { presence: Presence; className?: string }) {
  const { here, othersEditing } = presence;
  const others = here === null ? 0 : here - 1;
  if (others <= 0 && !othersEditing) return null;

  return (
    <p className={cn(appear, "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted", className)} aria-live="off">
      {others > 0 ? (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent/60 motion-reduce:hidden" />
            <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
          </span>
          {others === 1 ? "1 other person here" : `${others} other people here`}
        </span>
      ) : null}
      {othersEditing ? <span className={appear}>Someone is marking times…</span> : null}
    </p>
  );
}
