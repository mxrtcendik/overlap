import { SLOT_MS } from "../constants";
import { localParts, wallDate, wallParts } from "../time/format";
import { weekdayName } from "../time/weekly";

type Answer = { name: string; note?: string | null; slots: string[]; maybe: string[] };

export function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const pad = (value: number) => String(value).padStart(2, "0");
const clock = (ms: number, timeZone: string) => {
  const parts = wallParts(ms, timeZone);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
};

export function answersCsv(input: {
  slots: string[];
  voters: Answer[];
  timeZone: string;
  weekly?: boolean;
  ranges?: { start: string; end: string }[] | null;
}): string {
  const { slots, voters, timeZone, weekly = false, ranges } = input;
  const ends = new Map((ranges ?? []).map((range) => [range.start, Date.parse(range.end)]));
  const header = [
    weekly ? "Day" : "Date",
    "Start",
    "End",
    "Can make",
    "If needed",
    ...voters.map((voter) => (voter.note ? `${voter.name} (${voter.note})` : voter.name)),
  ];
  const yes = voters.map((voter) => new Set(voter.slots));
  const maybe = voters.map((voter) => new Set(voter.maybe));
  const rows = slots.map((slot) => {
    const start = Date.parse(slot);
    const marks = voters.map((_, index) => (yes[index].has(slot) ? "yes" : maybe[index].has(slot) ? "if needed" : ""));
    return [
      weekly ? weekdayName(localParts(start, timeZone).weekday) : wallDate(wallParts(start, timeZone)),
      clock(start, timeZone),
      clock(ends.get(slot) ?? start + SLOT_MS, timeZone),
      marks.filter((mark) => mark === "yes").length,
      marks.filter((mark) => mark === "if needed").length,
      ...marks,
    ];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
