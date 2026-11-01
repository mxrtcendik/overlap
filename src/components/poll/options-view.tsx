"use client";

import { usePrefs, useTimeZone } from "@/client/browser";
import { nameList } from "@/lib/poll/sentence";
import { optionLabel, optionResults, rankOptions, type TimeOption } from "@/lib/poll/options";

type Voter = { name: string; slots: string[]; maybe: string[]; required?: boolean; yours?: boolean };
type Level = "yes" | "maybe" | "no";

const LEVELS: { level: Level; label: string }[] = [
  { level: "yes", label: "Yes" },
  { level: "maybe", label: "If needed" },
  { level: "no", label: "No" },
];

export function OptionsView({
  options,
  voters,
  answer,
  final,
  readOnly,
  onChange,
  onPick,
}: {
  options: TimeOption[];
  voters: Voter[];
  answer?: { slots: string[]; maybe: string[] };
  final: { start: string; end: string } | null;
  readOnly: boolean;
  onChange?: (slots: string[], maybe: string[]) => void;
  onPick?: (option: TimeOption) => void;
}) {
  const timeZone = useTimeZone();
  const clock = usePrefs()?.clock ?? "h12";
  if (!timeZone) return <div className="min-h-40" />;

  const results = optionResults(options, voters);
  const best = voters.length > 1 ? rankOptions(options, voters)[0]?.option.start : undefined;
  const people = Math.max(voters.length, 1);

  function choose(start: string, level: Level) {
    if (!answer || !onChange) return;
    const yes = answer.slots.filter((slot) => slot !== start);
    const maybe = answer.maybe.filter((slot) => slot !== start);
    if (level === "yes") yes.push(start);
    if (level === "maybe") maybe.push(start);
    onChange(
      options.map((option) => option.start).filter((slot) => yes.includes(slot)),
      options.map((option) => option.start).filter((slot) => maybe.includes(slot)),
    );
  }

  return (
    <ul className="max-w-3xl border-t border-line">
      {results.map(({ option, yes, maybe }) => {
        const count = yes.length + maybe.length;
        const mine: Level = answer?.slots.includes(option.start) ? "yes" : answer?.maybe.includes(option.start) ? "maybe" : "no";
        const isFinal = final !== null && Date.parse(final.start) === Date.parse(option.start) && Date.parse(final.end) === Date.parse(option.end);
        const label = optionLabel(option, timeZone, clock);
        const who = [
          yes.length ? nameList(yes.map((index) => voters[index].name)) : "",
          maybe.length ? `if needed: ${nameList(maybe.map((index) => voters[index].name))}` : "",
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={option.start} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line py-4">
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-2 tabular-nums">
                <span>{label}</span>
                {isFinal ? <span className="text-xs text-accent">Final time</span> : option.start === best ? <span className="text-xs text-muted">Best</span> : null}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span aria-hidden="true" className="block h-1.5 w-32 overflow-hidden rounded-full bg-line">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${(count / people) * 100}%`, background: "var(--accent)" }}
                  />
                </span>
                <span className="font-mono text-xs text-muted tabular-nums">
                  {count}/{voters.length}
                </span>
              </div>
              {who ? <p className="mt-1 text-xs text-muted">{who}</p> : null}
            </div>
            {!readOnly && answer && onChange ? (
              <div role="group" aria-label={`Your answer for ${label}`} className="inline-flex border border-line">
                {LEVELS.map(({ level, label: text }) => (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={mine === level}
                    onClick={() => choose(option.start, level)}
                    className={`px-3 py-1.5 text-sm transition-colors ${
                      mine === level ? "bg-paper text-foreground shadow-[inset_0_0_0_1px_var(--foreground)]" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {text}
                  </button>
                ))}
              </div>
            ) : onPick && !isFinal ? (
              <button type="button" className="link-quiet" onClick={() => onPick(option)}>
                Pick
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
