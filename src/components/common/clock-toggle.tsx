"use client";

import { setClock, usePrefs } from "@/client/browser";
import type { Clock } from "@/lib/time/format";

const OPTIONS: { value: Clock; label: string }[] = [
  { value: "h12", label: "12h" },
  { value: "h23", label: "24h" },
];

export function ClockToggle() {
  const clock = usePrefs()?.clock ?? null;

  return (
    <div role="group" aria-label="Time format" className="inline-flex items-center gap-1 text-xs">
      {OPTIONS.map((option, index) => (
        <span key={option.value} className="inline-flex items-center gap-1">
          {index > 0 ? (
            <span aria-hidden="true" className="text-line-strong">
              /
            </span>
          ) : null}
          <button
            type="button"
            aria-pressed={clock === option.value}
            onClick={() => setClock(option.value)}
            className={`transition-colors ${clock === option.value ? "text-foreground" : "text-muted hover:text-foreground"}`}
          >
            {option.label}
            <span className="sr-only"> clock</span>
          </button>
        </span>
      ))}
    </div>
  );
}
