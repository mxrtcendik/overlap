"use client";

import { Segmented } from "../ui/segmented";
import { setClock, usePrefs } from "@/client/browser";
import type { Clock } from "@/lib/time/format";

const OPTIONS: { value: Clock; label: string }[] = [
  { value: "h12", label: "12h" },
  { value: "h23", label: "24h" },
];

export function ClockToggle({ label = "Time format" }: { label?: string }) {
  const clock = usePrefs()?.clock ?? null;

  return (
    <Segmented
      aria-label={label}
      size="sm"
      value={clock}
      onChange={setClock}
      options={OPTIONS.map((option) => ({ value: option.value, label: (
          <>
            {option.label}
            <span className="sr-only"> clock</span>
          </>
        ) }))}
    />
  );
}
