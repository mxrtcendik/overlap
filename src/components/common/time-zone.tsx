"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { deviceTimeZone, setTimeZone, useTimeZone, useTimeZoneChosen } from "@/client/browser";
import { timeZoneLabel, timeZoneLabelFor } from "@/lib/time/format";

function cityOf(zone: string): string {
  return zone.split("/").pop()!.replaceAll("_", " ");
}

function offsetOf(zone: string, at: number): string {
  const label = timeZoneLabel(zone, at);
  return label.match(/\(([^)]*)\)$/)?.[1] ?? label;
}

function zoneGroups(current: string, at: number): { region: string; zones: { value: string; label: string }[] }[] {
  const supported = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  const all = new Set([...supported, current, deviceTimeZone(), "UTC"]);
  const groups = new Map<string, { value: string; label: string }[]>();
  for (const zone of all) {
    const region = zone.includes("/") && !zone.startsWith("Etc/") ? zone.split("/")[0] : "Other";
    const list = groups.get(region) ?? [];
    list.push({ value: zone, label: region === "Other" ? timeZoneLabel(zone, at) : `${cityOf(zone)} · ${offsetOf(zone, at)}` });
    groups.set(region, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)))
    .map(([region, zones]) => ({ region, zones: zones.sort((a, b) => a.label.localeCompare(b.label)) }));
}

export function TimeZoneNote({ lead, times = [] }: { lead: string; times?: number[] }) {
  const timeZone = useTimeZone();
  const chosen = useTimeZoneChosen();
  const [open, setOpen] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const [now] = useState(() => Date.now());
  const at = times.length > 0 ? Math.min(...times) : now;

  useEffect(() => {
    if (open) selectRef.current?.focus();
  }, [open]);

  const groups = useMemo(
    () => (open && timeZone ? zoneGroups(timeZone, at) : []),
    [open, timeZone, at],
  );

  if (!timeZone) return <p className="mt-2 text-sm text-muted"> </p>;

  const label = timeZoneLabelFor(timeZone, times.length > 0 ? times : [now]);
  const device = deviceTimeZone();

  return (
    <div className="mt-2 text-sm text-muted">
      <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span>
          {lead} {label}.
        </span>
        {open ? null : (
          <button
            type="button"
            className="link-quiet decoration-line-strong hover:decoration-current"
            aria-expanded={false}
            onClick={() => setOpen(true)}
          >
            Change
          </button>
        )}
      </p>
      {open ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <label htmlFor="time-zone" className="sr-only">
            Timezone
          </label>
          <select
            id="time-zone"
            ref={selectRef}
            value={chosen ? timeZone : ""}
            onChange={(event) => setTimeZone(event.target.value || null)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
            className="field w-auto max-w-full py-1.5 text-sm"
          >
            <option value="">Your timezone · {timeZoneLabel(device, at)}</option>
            {groups.map((group) => (
              <optgroup key={group.region} label={group.region}>
                {group.zones.map((zone) => (
                  <option key={zone.value} value={zone.value}>
                    {zone.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button type="button" className="link-quiet" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      ) : null}
    </div>
  );
}
