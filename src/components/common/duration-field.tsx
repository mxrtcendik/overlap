"use client";

import { durationLabel, durationOptions } from "@/lib/poll/duration";

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
    <label className="block text-sm text-muted">
      Meeting length
      <select
        className="field mt-1 w-auto py-2 pr-2 pl-2.5"
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
      <span className="mt-1 block text-xs">
        With a length, the best times are stretches everyone can stay for the whole meeting.
      </span>
    </label>
  );
}
