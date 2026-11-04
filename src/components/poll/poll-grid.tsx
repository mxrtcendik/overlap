"use client";

import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { usePrefs, useTimeZone } from "@/client/browser";
import { SLOT_MS } from "@/lib/constants";
import { clockTime, localParts, type Clock } from "@/lib/time/format";
import { bestTime, tallySlots, type Marks } from "@/lib/poll/sentence";
import { weekdayName } from "@/lib/time/weekly";
import { appear, cn, link } from "@/components/ui/styles";

function marksEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index++) if (a[index] !== b[index]) return false;
  return true;
}

const SLOT = cn(
  "relative block h-8 w-10 rounded-[2px] border border-line bg-paper",
  "transition-[background-color,border-color,opacity] duration-200 motion-reduce:transition-none",
  "data-[wide=true]:w-full data-[dim=true]:opacity-30",
  "data-[filled=true]:heat data-[filled=true]:border-transparent",
  "data-[best=true]:border-transparent data-[best=true]:shadow-[inset_0_0_0_1.5px_var(--foreground),inset_0_0_0_2.5px_var(--paper)]",
);

const SLOT_BUTTON = cn(SLOT, "not-aria-disabled:cursor-pointer not-aria-disabled:touch-none pointer-fine:not-aria-disabled:hover:border-line-strong");

const SLOT_FILL = cn(
  "pointer-events-none absolute inset-[3px] scale-[0.92] rounded-[2px] bg-foreground opacity-0",
  "transition-[scale,opacity] duration-150 ease-ui motion-reduce:transition-none",
  "data-[on=true]:scale-100 data-[on=true]:opacity-100",
  "data-[on=maybe]:hatch-soft data-[on=maybe]:scale-100 data-[on=maybe]:opacity-100 data-[on=maybe]:shadow-[inset_0_0_0_1.5px_var(--foreground)]",
);

type Pos = { c: number; r: number };

export type Brush = "yes" | "maybe";

type Column = { key: string; weekday: string; month: string; day: string };
type Row = { key: number; label: string; labeled: boolean };

type Layout = {
  columns: Column[];
  rows: Row[];
  grid: (string | undefined)[][];
  first: Pos;
};

function heatOf(yes: number, maybe: number, people: number): number {
  const weight = yes + maybe / 2;
  if (weight === 0) return 0;
  return Math.round(16 + (weight / people) * 84);
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

const NARROW = "(max-width: 639px)";
const DAY_VIEW_AFTER = 5;

function subscribeNarrow(onChange: () => void) {
  const query = window.matchMedia(NARROW);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useNarrow(): boolean {
  return useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW).matches, () => false);
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
  maybe = EMPTY,
  brush = "yes",
  readOnly,
  highlight = null,
  mode = "toggle",
  outline = null,
  selectLabel = "You",
  weekly = false,
  duration = null,
  dayView = true,
  fill = false,
  onChange,
  onInspect,
}: {
  slots: string[];
  voters: Marks[];
  selected: string[];
  maybe?: string[];
  brush?: Brush;
  readOnly: boolean;
  highlight?: Set<string> | null;
  mode?: "toggle" | "range";
  outline?: { slots: Set<string>; label: string } | null;
  selectLabel?: string;
  weekly?: boolean;
  duration?: number | null;
  dayView?: boolean;
  fill?: boolean;
  onChange?: (next: string[], nextMaybe: string[]) => void;
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
  const beforeStroke = useRef<{ yes: string[]; maybe: string[] } | null>(null);
  const ownChange = useRef(false);
  const [undo, setUndo] = useState<{ yes: string[]; maybe: string[] } | null>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [moreRight, setMoreRight] = useState(false);
  const narrow = useNarrow();
  const [pickedDay, setPickedDay] = useState<number | null>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const measure = () => setMoreRight(scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft > 1);
    const resize = new ResizeObserver(measure);
    resize.observe(scroller);
    if (scroller.firstElementChild) resize.observe(scroller.firstElementChild);
    scroller.addEventListener("scroll", measure, { passive: true });
    return () => {
      resize.disconnect();
      scroller.removeEventListener("scroll", measure);
    };
  }, [layout]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const maybeSet = useMemo(() => new Set(maybe), [maybe]);
  const markKey = `${selected.join("\n")}\n${maybe.join("\n")}`;

  useEffect(() => {
    if (ownChange.current) {
      ownChange.current = false;
      return;
    }
    setUndo(null);
  }, [markKey]);
  const levelOf = (iso: string): Brush | null => (selectedSet.has(iso) ? "yes" : maybeSet.has(iso) ? "maybe" : null);

  function rememberStroke() {
    beforeStroke.current = { yes: [...selected], maybe: [...maybe] };
  }

  function keepUndo(nextYes: string[], nextMaybe: string[]) {
    const before = beforeStroke.current;
    beforeStroke.current = null;
    if (!before || (marksEqual(before.yes, nextYes) && marksEqual(before.maybe, nextMaybe))) return;
    setUndo(before);
  }

  const preview = useMemo(() => {
    if (!drag || !layout) return null;
    const yes = mode === "range" ? new Set<string>() : new Set(selected);
    const ifNeeded = mode === "range" ? new Set<string>() : new Set(maybe);
    const target = mode === "toggle" && brush === "maybe" ? ifNeeded : yes;
    const other = target === yes ? ifNeeded : yes;
    const [c0, c1] = mode === "range" ? [drag.anchor.c, drag.anchor.c] : [drag.anchor.c, drag.current.c].sort((a, b) => a - b);
    const [r0, r1] = [drag.anchor.r, drag.current.r].sort((a, b) => a - b);
    for (let c = c0; c <= c1; c++) {
      for (let r = r0; r <= r1; r++) {
        const iso = layout.grid[c][r];
        if (!iso) continue;
        if (drag.add) {
          target.add(iso);
          other.delete(iso);
        } else {
          target.delete(iso);
        }
      }
    }
    return { yes, maybe: ifNeeded };
  }, [drag, layout, selected, maybe, mode, brush]);

  useEffect(() => {
    if (!drag) return;
    const commit = () => {
      if (preview) {
        const nextYes = slots.filter((slot) => preview.yes.has(slot));
        const nextMaybe = slots.filter((slot) => preview.maybe.has(slot));
        keepUndo(nextYes, nextMaybe);
        ownChange.current = true;
        onChange?.(nextYes, nextMaybe);
      } else {
        beforeStroke.current = null;
      }
      setDrag(null);
    };
    const cancel = () => {
      beforeStroke.current = null;
      setDrag(null);
    };
    window.addEventListener("pointerup", commit);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointerup", commit);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [drag, preview, onChange, slots]);

  const undoFromKeyboard = useEffectEvent(() => undoLast());
  const canUndo = !readOnly && undo !== null;
  useEffect(() => {
    if (!canUndo) return;
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey || event.key.toLowerCase() !== "z") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      undoFromKeyboard();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canUndo]);

  if (!timeZone || !layout) return <div className="min-h-40" />;

  const tallies = tallySlots(slots, voters);
  const people = Math.max(voters.length, 1);

  const best = new Set<string>(outline?.slots);
  const outlineLabel = outline?.label ?? "Best time";
  const run = !outline && voters.length > 1 ? bestTime(slots, voters, duration) : null;
  if (run) {
    for (const slot of slots) {
      const time = Date.parse(slot);
      if (time >= run.start && time + SLOT_MS <= run.end) best.add(slot);
    }
  }

  const dayMode = dayView && narrow && layout.columns.length > DAY_VIEW_AFTER;
  const stretch = dayMode || fill;
  const bestDay = run ? layout.grid.findIndex((column) => column.some((iso) => iso && Date.parse(iso) === run.start)) : -1;
  const day = Math.min(pickedDay ?? (bestDay >= 0 ? bestDay : 0), layout.columns.length - 1);
  const visible = dayMode ? [day] : layout.columns.map((_, index) => index);
  const dayHeat = layout.grid.map((column) =>
    Math.max(
      0,
      ...column.map((iso) => {
        if (!iso) return 0;
        const tally = tallies.get(iso) ?? { yes: 0, maybe: 0 };
        return heatOf(tally.yes, tally.maybe, people);
      }),
    ),
  );

  const shownYes = preview?.yes ?? selectedSet;
  const shownMaybe = preview?.maybe ?? maybeSet;
  const showMaybeKey = !readOnly && mode === "toggle" && (brush === "maybe" || shownMaybe.size > 0);
  const focusPos = active ?? layout.first;

  function onPointerDown(event: PointerEvent<HTMLButtonElement>, pos: Pos, iso: string) {
    if (readOnly || (event.pointerType === "mouse" && event.button !== 0)) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setActive(pos);
    rememberStroke();
    setDrag({ anchor: pos, current: pos, add: mode === "range" || levelOf(iso) !== brush });
  }

  function toggleOne(iso: string) {
    rememberStroke();
    if (mode === "range") {
      ownChange.current = true;
      keepUndo([iso], []);
      onChange?.([iso], []);
      return;
    }
    const yes = new Set(selected);
    const ifNeeded = new Set(maybe);
    const [target, other] = brush === "maybe" ? [ifNeeded, yes] : [yes, ifNeeded];
    if (target.has(iso)) target.delete(iso);
    else {
      target.add(iso);
      other.delete(iso);
    }
    const nextYes = slots.filter((slot) => yes.has(slot));
    const nextMaybe = slots.filter((slot) => ifNeeded.has(slot));
    ownChange.current = true;
    keepUndo(nextYes, nextMaybe);
    onChange?.(nextYes, nextMaybe);
  }

  function undoLast() {
    if (!undo || drag) return;
    const previous = undo;
    setUndo(null);
    ownChange.current = true;
    onChange?.(previous.yes, previous.maybe);
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
    if (dayMode && step.c !== 0) {
      const next = pos.c + step.c;
      if (next < 0 || next >= layout.columns.length) return;
      setPickedDay(next);
      const iso = layout.grid[next][pos.r] ?? layout.grid[next].find(Boolean);
      if (iso) requestAnimationFrame(() => cellRefs.current.get(iso)?.focus());
      return;
    }
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
      {dayMode ? (
        <div role="tablist" aria-label="Days" className="-mx-1 mb-3 flex gap-1 overflow-x-auto px-1 pb-1">
          {layout.columns.map((column, c) => (
            <button
              key={column.key}
              type="button"
              role="tab"
              aria-selected={c === day}
              aria-label={weekly ? weekdayName(column.weekday) : `${column.weekday}, ${column.month} ${column.day}`}
              onClick={() => setPickedDay(c)}
              className={`min-w-12 shrink-0 border px-2 pt-1.5 pb-1 text-center text-xs transition-colors ${
                c === day ? "border-foreground bg-paper text-foreground" : "border-line text-muted"
              }`}
            >
              <span className="block">{column.weekday}</span>
              {weekly ? null : <span className="block font-medium tabular-nums text-foreground">{column.day}</span>}
              <span
                aria-hidden="true"
                className="mt-1.5 block h-0.5"
                style={{ background: `color-mix(in oklab, var(--accent) ${dayHeat[c]}%, var(--line))` }}
              />
            </button>
          ))}
        </div>
      ) : null}
      <div
        ref={scrollerRef}
        className="overflow-x-auto pb-1 data-[more-right=true]:[mask-image:linear-gradient(to_right,#000_calc(100%-3rem),transparent)]"
        data-more-right={moreRight ? "true" : undefined}
        onPointerLeave={() => onInspect?.(null)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onInspect?.(null);
        }}
      >
        <table className={`border-separate border-spacing-1 select-none ${stretch ? "w-full" : ""}`}>
          <caption className="sr-only">
            Availability. Times are in your timezone. Use the arrow keys to move between times
            {readOnly ? "." : " and Space to mark one."}
          </caption>
          <thead className={dayMode ? "sr-only" : undefined}>
            <tr>
              <th scope="col" className="sticky left-0 z-20 w-px bg-paper">
                <span className="sr-only">Time</span>
              </th>
              {visible.map((c) => {
                const column = layout.columns[c];
                const newMonth = c === 0 || dayMode || layout.columns[c - 1].month !== column.month;
                return (
                  <th key={column.key} scope="col" className="px-1 pb-2 text-center text-xs font-normal">
                    {weekly ? (
                      <div className="font-medium">{column.weekday}</div>
                    ) : (
                      <>
                        <div className={`h-4 whitespace-nowrap ${newMonth ? "text-foreground" : ""}`}>
                          <span className={newMonth ? undefined : "sr-only"}>{column.month}</span>
                        </div>
                        <div className="mt-0.5 text-muted">{column.weekday}</div>
                        <div className="mt-0.5 font-medium tabular-nums">{column.day}</div>
                      </>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {layout.rows.map((row, r) => (
              <tr key={row.key}>
                <th
                  scope="row"
                  className={`sticky left-0 z-20 bg-paper pr-3 text-right align-top text-xs leading-8 font-normal w-px whitespace-nowrap text-muted tabular-nums`}
                >
                  <span className={row.labeled ? undefined : "sr-only"}>{row.label}</span>
                </th>
                {visible.map((c) => {
                  const column = layout.columns[c];
                  const iso = layout.grid[c][r];
                  if (!iso) return <td key={column.key} className={`h-8 ${stretch ? "" : "w-10"}`} />;
                  const pos = { c, r };
                  const tally = tallies.get(iso) ?? { yes: 0, maybe: 0 };
                  const count = tally.yes + tally.maybe;
                  const heat = heatOf(tally.yes, tally.maybe, people);
                  const on: Brush | null = shownYes.has(iso) ? "yes" : shownMaybe.has(iso) ? "maybe" : null;
                  const ink =
                    on === "yes"
                      ? "text-background"
                      : on === "maybe"
                        ? "text-foreground"
                        : heat >= 70
                          ? "text-[var(--heat-ink-strong)]"
                          : "text-[var(--heat-ink)]";
                  const isBest = best.has(iso);
                  const free = `${count} of ${voters.length} free${tally.maybe > 0 ? `, ${tally.maybe} if needed` : ""}`;
                  const yours = on === "maybe" ? ", yours if needed" : "";
                  return (
                    <td key={column.key} className={`p-0 ${dayMode ? "w-full" : ""}`}>
                      <button
                        ref={(node) => {
                          if (node) cellRefs.current.set(iso, node);
                          else cellRefs.current.delete(iso);
                        }}
                        type="button"
                        tabIndex={focusPos.c === c && focusPos.r === r ? 0 : -1}
                        aria-disabled={readOnly || undefined}
                        aria-pressed={readOnly ? undefined : on === "maybe" ? "mixed" : on === "yes"}
                        aria-label={`${weekly ? weekdayName(column.weekday) : `${column.weekday}, ${column.month} ${column.day}`}, ${row.label}. ${free}${isBest ? `, ${outlineLabel.toLowerCase()}` : ""}${yours}.`}
                        onPointerDown={(event) => onPointerDown(event, pos, iso)}
                        onPointerEnter={() => onPointerEnter(pos, iso)}
                        onFocus={() => {
                          setActive(pos);
                          onInspect?.(iso);
                        }}
                        onKeyDown={(event) => onKeyDown(event, pos)}
                        onClick={(event) => {
                          if (readOnly || event.detail !== 0) return;
                          toggleOne(iso);
                        }}
                        className={cn("slot", SLOT_BUTTON)}
                        data-wide={stretch ? "true" : undefined}
                        data-filled={heat > 0 ? "true" : undefined}
                        data-best={isBest ? "true" : undefined}
                        data-dim={highlight && !highlight.has(iso) ? "true" : undefined}
                        style={{ "--heat": `${heat}%` } as React.CSSProperties}
                      >
                        <span className={SLOT_FILL} data-on={on === "yes" ? "true" : on === "maybe" ? "maybe" : "false"} />
                        {count > 0 ? (
                          <span
                            className={`relative z-10 text-[11px] font-medium tabular-nums ${ink} ${
                              on === "maybe" ? "rounded-[2px] bg-paper px-[3px] leading-[14px]" : ""
                            }`}
                          >
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
      <Legend
        selectLabel={readOnly ? null : selectLabel}
        maybeLabel={showMaybeKey ? "You, if needed" : null}
        outlineLabel={best.size > 0 ? outlineLabel : null}
      />
      {!readOnly && undo ? (
        <p className="mt-3">
          <button type="button" className={cn(link(), appear)} onClick={undoLast} aria-keyshortcuts="Control+Z Meta+Z">
            Undo last mark
          </button>
          <span className="ml-2 text-xs text-muted" aria-hidden="true">
            {/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘Z" : "Ctrl+Z"}
          </span>
        </p>
      ) : null}
    </div>
  );
}

const EMPTY: string[] = [];

function Legend({
  selectLabel,
  maybeLabel,
  outlineLabel,
}: {
  selectLabel: string | null;
  maybeLabel: string | null;
  outlineLabel: string | null;
}) {
  const steps = [16, 44, 72, 100];
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted" aria-hidden="true">
      <span className="inline-flex items-center gap-2">
        Fewer
        <span className="inline-flex gap-0.5">
          {steps.map((heat) => (
            <span
              key={heat}
              className={cn(SLOT, "h-3 w-4 rounded-[2px]")}
              data-filled="true"
              style={{ "--heat": `${heat}%` } as React.CSSProperties}
            />
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
      {maybeLabel ? (
        <span className="inline-flex items-center gap-2">
          <span className="hatch inline-block size-3 rounded-[2px] border border-foreground" />
          {maybeLabel}
        </span>
      ) : null}
      {outlineLabel ? (
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-4 rounded-[2px] bg-paper shadow-[inset_0_0_0_1.5px_var(--foreground)]" />
          {outlineLabel}
        </span>
      ) : null}
    </div>
  );
}
