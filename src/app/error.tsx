"use client";

import { Shell } from "@/components/shell";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <Shell>
      <h1 className="text-[1.75rem] leading-9 tracking-[-0.02em] text-balance">Something went wrong.</h1>
      <p className="mt-4 text-muted">Try again in a moment.</p>
      <button type="button" onClick={reset} className="btn mt-8">
        Try again
      </button>
    </Shell>
  );
}
