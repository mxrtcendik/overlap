"use client";

import { Shell } from "@/components/common/shell";
import { button, cn, heading } from "@/components/ui/styles";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <Shell>
      <h1 className={heading.page}>Something went wrong.</h1>
      <p className="mt-4 text-muted">Try again in a moment.</p>
      <button type="button" onClick={reset} className={cn(button(), "mt-8")}>
        Try again
      </button>
    </Shell>
  );
}
