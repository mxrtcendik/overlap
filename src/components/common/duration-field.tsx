"use client";

import { durationLabel, durationOptions } from "@/lib/poll/duration";
import { cn, field, hint, selectChrome } from "@/components/ui/styles";

export function DurationField({
  value,
  max,
  disabled = false,
  onChange,
}: {
  value: number | null;
  max: number;
  disabled?: boolean;
  onChange: (minutes: number | null) => void;
}) {
  return (
    <label className="block text-[13px] font-medium text-foreground">
      Meeting length
      <select
        className={cn(field({ size: "select" }), selectChrome, "mt-1.5 w-full")}
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
      >
        <option value="">Any length</option>
        {durationOptions(max).map((minutes) => (
          <option key={minutes} value={minutes}>
            {durationLabel(minutes)}
          </option>
        ))}
      </select>
      <span className={cn(hint, "mt-2 block")}>
        The best times are long enough for the whole meeting.
      </span>
    </label>
  );
}
