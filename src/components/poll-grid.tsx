"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { usePrefs, useTimeZone } from "@/lib/browser";
import { SLOT_MS } from "@/lib/constants";
import { clockTime, localParts, type Clock } from "@/lib/format";
import { bestRun, countSlots } from "@/lib/sentence";

type Pos = { c: number; r: number };

type Column = { key: string; weekday: string; month: string; day: string };
type Row = { key: number; label: string; labeled: boolean };

type Layout = {
  columns: Column[];
  rows: Row[];
  grid: (string | undefined)[][];
  first: Pos;
};

function heatOf(count: number, people: number): number {
  if (count === 0) return 0;
  return Math.round(16 + (count / people) * 84);
}

function buildLayout(slots: string[], timeZone: string, clock: Clock): Layout {
  const localized = slots
    .map((iso) => {
      const time = Date.parse(iso);
      const parts = localParts(time, timeZone);
      return { iso, time, parts, minutes: parts.hour * 60 + parts.minute, dateKey: `${parts.year}-${parts.month}-${parts.day}` };
    })
    .sort((a, b) => a.time - b.time);

  const columns: Column[] = [];
  const columnIndex = new Map<string, number>();
  for (const slot of localized) {
    if (columnIndex.has(slot.dateKey)) continue;
    columnIndex.set(slot.dateKey, columns.length);
    columns.push({ key: slot.dateKey, weekday: slot.parts.weekday, month: slot.parts.month, day: slot.parts.day });
  }

  const labels = new Map<number, string>();
  for (const slot of localized) {
    if (!labels.has(slot.minutes)) labels.set(slot.minutes, clockTime(slot.parts, clock));
  }
  const rows: Row[] = [...labels.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([key, label], index) => ({ key, label, labeled: index === 0 || key % 60 === 0 }));
  const rowIndex = new Map(rows.map((row, index) => [row.key, index]));

  const grid: (string | undefined)[][] = columns.map(() => new Array<string | undefined>(rows.length));
  for (const slot of localized) {
    grid[columnIndex.get(slot.dateKey)!][rowIndex.get(slot.minutes)!] = slot.iso;
  }

  const firstIso = localized[0]?.iso;
  let first: Pos = { c: 0, r: 0 };
  grid.forEach((column, c) =>
    column.forEach((iso, r) => {
      if (iso === firstIso) first = { c, r };
    }),
  );

  return { columns, rows, grid, first };
}

const KEYS: Record<string, Pos> = {
  ArrowUp: { c: 0, r: -1 },
  ArrowDown: { c: 0, r: 1 },
  ArrowLeft: { c: -1, r: 0 },
  ArrowRight: { c: 1, r: 0 },
};

export function PollGrid({
  slots,
  voters,
  selected,
  readOnly,
  highlight = null,
  mode = "toggle",
  outline = null,
  selectLabel = "You",
  onChange,
  onInspect,
}: {
  slots: string[];
  voters: { slots: string[] }[];
  selected: string[];
  readOnly: boolean;
  highlight?: Set<string> | null;
  mode?: "toggle" | "range";
  outline?: { slots: Set<string>; label: string } | null;
  selectLabel?: string;
  onChange?: (next: string[]) => void;
  onInspect?: (iso: string | null) => void;
}) {
  const timeZone = useTimeZone();
  const clock = usePrefs()?.clock ?? null;
  const layout = useMemo(
    () => (timeZone && clock ? buildLayout(slots, timeZone, clock) : null),
    [slots, timeZone, clock],
  );
  const [active, setActive] = useState<Pos | null>(null);
  const [drag, setDrag] = useState<{ anchor: Pos; current: Pos; add: boolean } | null>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const preview = useMemo(() => {
    if (!drag || !layout) return null;
    const next = mode === "range" ? new Set<string>() : new Set(selected);
    const [c0, c1] = mode === "range" ? [drag.anchor.c, drag.anchor.c] : [drag.anchor.c, drag.current.c].sort((a, b) => a - b);
    const [r0, r1] = [drag.anchor.r, drag.current.r].sort((a, b) => a - b);
    for (let c = c0; c <= c1; c++) {
      for (let r = r0; r <= r1; r++) {
        const iso = layout.grid[c][r];
        if (!iso) continue;
        if (drag.add) next.add(iso);
        else next.delete(iso);
      }
    }
    return next;
  }, [drag, layout, selected, mode]);

  useEffect(() => {
    if (!drag) return;
    const commit = () => {
      if (preview) onChange?.(slots.filter((slot) => preview.has(slot)));
      setDrag(null);
    };
    const cancel = () => setDrag(null);
    window.addEventListener("pointerup", commit);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointerup", commit);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [drag, preview, onChange, slots]);

  if (!timeZone || !layout) return <div className="min-h-40" />;

  const counts = countSlots(slots, voters);
  const people = Math.max(voters.length, 1);

  const best = new Set<string>(outline?.slots);
  const outlineLabel = outline?.label ?? "Best time";
  const run = !outline && voters.length > 1 ? bestRun(slots, counts) : null;
  if (run) {
    for (const slot of slots) {
      const time = Date.parse(slot);
      if (time >= run.start && time + SLOT_MS <= run.end) best.add(slot);
    }
  }

  const shown = preview ?? selectedSet;
  const focusPos = active ?? layout.first;

  function onPointerDown(event: PointerEvent<HTMLButtonElement>, pos: Pos, iso: string) {
    if (readOnly || (event.pointerType === "mouse" && event.button !== 0)) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setActive(pos);
    setDrag({ anchor: pos, current: pos, add: mode === "range" || !selectedSet.has(iso) });
  }

  function onPointerEnter(pos: Pos, iso: string) {
    onInspect?.(iso);
    setDrag((current) =>
      current && (current.current.c !== pos.c || current.current.r !== pos.r) ? { ...current, current: pos } : current,
    );
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, pos: Pos) {
    const step = KEYS[event.key];
    if (!step || !layout) return;
    event.preventDefault();
    let { c, r } = pos;
    for (;;) {
      c += step.c;
      r += step.r;
      if (c < 0 || r < 0 || c >= layout.columns.length || r >= layout.rows.length) return;
      const iso = layout.grid[c][r];
      if (iso) {
        cellRefs.current.get(iso)?.focus();
        return;
      }
    }
  }

  return (
    <div>
      <div
        className="overflow-x-auto pb-1"
        onPointerLeave={() => onInspect?.(null)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onInspect?.(null);
        }}
      >
        <table className="border-separate border-spacing-1 select-none">
          <caption className="sr-only">
            Availability. Times are in your timezone. Use the arrow keys to move between times
            {readOnly ? "." : " and Space to mark one."}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-20 bg-background">
                <span className="sr-only">Time</span>
              </th>
              {layout.columns.map((column) => (
                <th key={column.key} scope="col" className="px-1 pb-2 text-center text-xs font-normal">
                  <div className="text-muted">{column.weekday}</div>
                  <div className="mt-0.5 font-mono tabular-nums">
                    {column.month} {column.day}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {layout.rows.map((row, r) => (
              <tr key={row.key}>
                <th
                  scope="row"
                  className="sticky left-0 z-20 bg-background pr-3 text-right align-top font-mono text-[11px] leading-8 font-normal whitespace-nowrap text-muted tabular-nums"
                >
                  <span className={row.labeled ? undefined : "sr-only"}>{row.label}</span>
                </th>
                {layout.columns.map((column, c) => {
                  const iso = layout.grid[c][r];
                  if (!iso) return <td key={column.key} className="h-8 w-10" />;
                  const pos = { c, r };
                  const count = counts.get(iso) ?? 0;
                  const heat = heatOf(count, people);
                  const on = shown.has(iso);
                  const ink = on ? "text-background" : heat >= 58 ? "text-on-accent" : "text-foreground";
                  const isBest = best.has(iso);
                  return (
                    <td key={column.key} className="p-0">
                      <button
                        ref={(node) => {
                          if (node) cellRefs.current.set(iso, node);
                          else cellRefs.current.delete(iso);
                        }}
                        type="button"
                        tabIndex={focusPos.c === c && focusPos.r === r ? 0 : -1}
                        aria-disabled={readOnly || undefined}
                        aria-pressed={readOnly ? undefined : on}
                        aria-label={`${column.weekday}, ${column.month} ${column.day}, ${row.label}. ${count} of ${voters.length} free${isBest ? `, ${outlineLabel.toLowerCase()}` : ""}.`}
                        onPointerDown={(event) => onPointerDown(event, pos, iso)}
                        onPointerEnter={() => onPointerEnter(pos, iso)}
                        onFocus={() => {
                          setActive(pos);
                          onInspect?.(iso);
                        }}
                        onKeyDown={(event) => onKeyDown(event, pos)}
                        onClick={(event) => {
                          if (readOnly || event.detail !== 0) return;
                          if (mode === "range") onChange?.([iso]);
                          else
                            onChange?.(
                              on
                                ? selected.filter((slot) => slot !== iso)
                                : slots.filter((slot) => slot === iso || selectedSet.has(slot)),
                            );
                        }}
                        className="slot"
                        data-best={isBest ? "true" : undefined}
                        data-dim={highlight && !highlight.has(iso) ? "true" : undefined}
                        style={{ "--heat": `${heat}%` } as React.CSSProperties}
                      >
                        <span className="slot-fill" data-on={on ? "true" : "false"} />
                        {count > 0 ? (
                          <span className={`relative z-10 font-mono text-[10px] font-medium tabular-nums ${ink}`}>
                            {count}
                          </span>
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Legend selectLabel={readOnly ? null : selectLabel} outlineLabel={best.size > 0 ? outlineLabel : null} />
    </div>
  );
}

function Legend({ selectLabel, outlineLabel }: { selectLabel: string | null; outlineLabel: string | null }) {
  const steps = [16, 44, 72, 100];
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted" aria-hidden="true">
      <span className="inline-flex items-center gap-2">
        Fewer
        <span className="inline-flex gap-0.5">
          {steps.map((heat) => (
            <span key={heat} className="slot h-3 w-4" style={{ "--heat": `${heat}%` } as React.CSSProperties} />
          ))}
        </span>
        More
      </span>
      {selectLabel ? (
        <span className="inline-flex items-center gap-2">
          <span className="inline-block size-3 rounded-[2px] bg-foreground" />
          {selectLabel}
        </span>
      ) : null}
      {outlineLabel ? (
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-4 border border-foreground bg-paper" />
          {outlineLabel}
        </span>
      ) : null}
    </div>
  );
}
