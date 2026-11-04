import "server-only";
import { cache } from "react";
import { and, asc, eq, gt, notExists, sql, type SQL } from "drizzle-orm";
import { LEVEL, marks, polls, voters } from "@/db/schema";
import { MAX_NAME, MAX_NOTE, MAX_TITLE, MAX_VOTERS, RETAIN_MS, SLOT_MS } from "../lib/constants";
import { getDb, type Database } from "./db";
import { parseDeadline } from "../lib/poll/deadline";
import { longestRun, parseDuration } from "../lib/poll/duration";
import { parseOptions, type TimeOption } from "../lib/poll/options";
import { parseFinal, parseSlots } from "../lib/poll/slots";
import { cleanText, parseNote } from "../lib/text";
import { readEmail } from "../lib/email";
import { isToken, randomToken, sha256 } from "../lib/tokens";
import type { FinalTime, PollView, VoterView } from "../lib/types";
import { WEEK_MS, WEEKLY_OPEN_MS, type PollKind } from "../lib/time/weekly";
import { isTimeZone } from "../lib/time/format";
import { parsePlace } from "../lib/poll/place";
import { remindedAtFor } from "../lib/poll/reminder";

export type { FinalTime, PollView, VoterView };

export type StoredVoter = {
  id: string;
  ref: string;
  name: string;
  note: string | null;
  required: boolean;
  email: string | null;
  emailZone: string | null;
  remind: boolean;
  zone: string | null;
  slots: string[];
  maybe: string[];
};

export type StoredPoll = {
  id: string;
  title: string;
  slots: string[];
  closed: boolean;
  closesAt: number;
  deadline: number | null;
  kind: PollKind;
  options: TimeOption[] | null;
  zone: string | null;
  duration: number | null;
  notifyEmail: string | null;
  lastEnd: number;
  final: FinalTime | null;
  place: string | null;
  voters: StoredVoter[];
};

type Failure = { ok: false; status: number; error: string };

const NOT_FOUND: Failure = { ok: false, status: 404, error: "This poll doesn’t exist." };

const ownerHash = (token: string) => sha256(token);

const voterRef = async (voterId: string) => (await sha256(`voter:${voterId}`)).slice(0, 16);

function insertMarks(db: Database, voterId: string, level: (typeof LEVEL)[keyof typeof LEVEL], slots: string[]) {
  return db.insert(marks).select(
    sql`SELECT ${voterId}, value, ${level} FROM json_each(${JSON.stringify(slots)})
      WHERE EXISTS (SELECT 1 FROM ${voters} WHERE ${voters.id} = ${voterId})`,
  );
}

export function toPollView(poll: StoredPoll, voterId: string | null, options: { refs?: boolean; owner?: boolean } = {}): PollView {
  return {
    id: poll.id,
    title: poll.title,
    slots: poll.slots,
    closed: poll.closed,
    closesAt: new Date(poll.closesAt).toISOString(),
    deadline: poll.deadline === null ? null : new Date(poll.deadline).toISOString(),
    kind: poll.kind,
    options: poll.options,
    zone: poll.zone,
    duration: poll.duration,
    ...(options.owner ? { notifyEmail: poll.notifyEmail } : {}),
    lastEnd: new Date(poll.lastEnd).toISOString(),
    final: poll.final,
    place: poll.place,
    voters: poll.voters.map((voter) => ({
      name: voter.name,
      note: voter.note,
      required: voter.required,
      zone: voter.zone,
      ...(voterId !== null && voter.id === voterId ? { email: voter.email, remind: voter.remind } : {}),
      slots: voter.slots,
      maybe: voter.maybe,
      yours: voterId !== null && voter.id === voterId,
      ...(options.refs ? { ref: voter.ref } : {}),
    })),
  };
}

async function findPoll(match: SQL): Promise<StoredPoll | null> {
  const db = await getDb();
  const now = Date.now();
  const poll = await db.query.polls.findFirst({
    where: and(match, gt(polls.deleteAt, now)),
    columns: {
      id: true,
      title: true,
      kind: true,
      options: true,
      zone: true,
      duration: true,
      notifyEmail: true,
      slots: true,
      createdAt: true,
      closesAt: true,
      deadline: true,
      finalStart: true,
      finalEnd: true,
      place: true,
    },
    with: {
      voters: {
        columns: { id: true, name: true, note: true, required: true, email: true, emailZone: true, remind: true, zone: true },
        orderBy: [asc(voters.createdAt), asc(voters.id)],
        with: { marks: { columns: { slot: true, level: true } } },
      },
    },
  });
  if (!poll) return null;

  return {
    id: poll.id,
    title: poll.title,
    slots: poll.slots,
    closed: poll.closesAt <= now,
    closesAt: poll.closesAt,
    deadline: poll.deadline,
    kind: poll.kind,
    options: poll.options,
    zone: poll.zone,
    duration: poll.duration,
    notifyEmail: poll.notifyEmail,
    lastEnd: naturalEnd(poll.kind, poll.slots, poll.createdAt, poll.options),
    final:
      poll.finalStart !== null && poll.finalEnd !== null
        ? { start: new Date(poll.finalStart).toISOString(), end: new Date(poll.finalEnd).toISOString() }
        : null,
    place: poll.place,
    voters: await Promise.all(
      poll.voters.map(async (voter) => ({
        id: voter.id,
        ref: await voterRef(voter.id),
        name: voter.name,
        note: voter.note,
        required: voter.required,
        email: voter.email,
        emailZone: voter.emailZone,
        remind: voter.remind,
        zone: voter.zone,
        slots: voter.marks.filter((mark) => mark.level === LEVEL.yes).map((mark) => mark.slot),
        maybe: voter.marks.filter((mark) => mark.level === LEVEL.ifNeeded).map((mark) => mark.slot),
      })),
    ),
  };
}

export const getPoll = cache(async (id: string): Promise<StoredPoll | null> =>
  isToken(id) ? findPoll(eq(polls.id, id)) : null,
);

export const getPollByOwnerToken = cache(async (token: string): Promise<StoredPoll | null> =>
  isToken(token) ? findPoll(eq(polls.ownerHash, await ownerHash(token))) : null,
);

function closesAt(slots: string[]): number {
  return Math.max(...slots.map((slot) => Date.parse(slot))) + SLOT_MS;
}

function naturalEnd(kind: PollKind, slots: string[], createdAt: number, options: TimeOption[] | null = null): number {
  if (kind === "weekly") return createdAt + WEEKLY_OPEN_MS;
  if (kind === "options" && options) return Math.max(...options.map((option) => Date.parse(option.end)));
  return closesAt(slots);
}

function parseZone(input: unknown): string | null {
  return typeof input === "string" && input.length <= 64 && isTimeZone(input) ? input : null;
}

function parseKind(input: unknown): PollKind | null {
  if (input === undefined || input === "dates") return "dates";
  return input === "weekly" || input === "options" ? input : null;
}

function fitsOneWeek(slots: string[]): boolean {
  const times = slots.map((slot) => Date.parse(slot));
  return Math.max(...times) + SLOT_MS - Math.min(...times) <= WEEK_MS;
}

const ALL_PAST = "Those times have already passed. Pick a later day or time.";

export async function createPoll(input: {
  title: unknown;
  slots: unknown;
  kind?: unknown;
  zone?: unknown;
  duration?: unknown;
  options?: unknown;
}): Promise<{ ok: true; id: string; ownerToken: string } | { ok: false; error: string }> {
  const { title: titleInput, slots: slotsInput, kind: kindInput, zone: zoneInput } = input;
  const kind = parseKind(kindInput);
  if (!kind) return { ok: false, error: "That kind of poll doesn’t exist." };
  if (typeof titleInput !== "string" || titleInput.trim() === "") {
    return { ok: false, error: "Enter a title." };
  }
  const title = cleanText(titleInput, MAX_TITLE);
  if (!title) return { ok: false, error: "Titles can be up to 80 characters." };
  let choices: TimeOption[] | null = null;
  let parsed: { ok: true; slots: string[] } | { ok: false; error: string };
  if (kind === "options") {
    const offered = parseOptions(input.options);
    if (!offered.ok) return offered;
    choices = offered.options;
    parsed = { ok: true, slots: choices.map((option) => option.start) };
  } else {
    parsed = parseSlots(slotsInput);
    if (!parsed.ok) return parsed;
    if (closesAt(parsed.slots) <= Date.now()) return { ok: false, error: ALL_PAST };
    if (kind === "weekly" && !fitsOneWeek(parsed.slots)) return { ok: false, error: "A weekly poll covers one week." };
  }
  const length = kind === "options" ? ({ ok: true, duration: null } as const) : parseDuration(input.duration, parsed.slots);
  if (!length.ok) return length;

  const db = await getDb();
  const id = randomToken(16);
  const ownerToken = randomToken(24);
  const now = Date.now();
  const closes = naturalEnd(kind, parsed.slots, now, choices);
  await db.insert(polls).values({
    id,
    ownerHash: await ownerHash(ownerToken),
    title,
    kind,
    options: choices,
    zone: parseZone(zoneInput),
    duration: length.duration,
    slots: parsed.slots,
    createdAt: now,
    closesAt: closes,
    deleteAt: closes + RETAIN_MS,
  });
  return { ok: true, id, ownerToken };
}

function subset(slots: string[], selected: unknown): string[] | null {
  if (!Array.isArray(selected)) return null;
  const allowed = new Set(slots);
  const chosen = new Set<string>();
  for (const slot of selected) {
    if (typeof slot !== "string" || !allowed.has(slot) || chosen.has(slot)) return null;
    chosen.add(slot);
  }
  return [...chosen];
}

export async function saveVote(
  pollId: string,
  voterId: string | null,
  body: unknown,
  allowNewVoter: () => Promise<boolean> = async () => true,
): Promise<{ ok: true; voterId: string; isNew: boolean; poll: StoredPoll; name: string } | Failure> {
  const poll = await getPoll(pollId);
  if (!poll) return NOT_FOUND;
  if (poll.closed) return { ok: false, status: 403, error: "Voting has ended for this poll." };
  if (!body || typeof body !== "object") return { ok: false, status: 400, error: "Enter your name." };

  const nameInput = (body as { name?: unknown }).name;
  if (typeof nameInput !== "string" || nameInput.trim() === "") {
    return { ok: false, status: 400, error: "Enter your name." };
  }
  const name = cleanText(nameInput, MAX_NAME);
  if (!name) return { ok: false, status: 400, error: "Names can be up to 40 characters." };
  const noteResult = parseNote((body as { note?: unknown }).note, MAX_NOTE);
  if (!noteResult.ok) return { ok: false, status: 400, error: `Notes can be up to ${MAX_NOTE} characters.` };
  const note = noteResult.note;
  const zone = parseZone((body as { zone?: unknown }).zone);
  const chosen = subset(poll.slots, (body as { slots?: unknown }).slots);
  const maybeInput = (body as { maybe?: unknown }).maybe;
  const maybe = maybeInput === undefined ? [] : subset(poll.slots, maybeInput);
  if (!chosen || !maybe) return { ok: false, status: 400, error: "Some of those times aren’t on this poll." };
  if (maybe.some((slot) => chosen.includes(slot))) {
    return { ok: false, status: 400, error: "A time can be marked as yes or if needed, not both." };
  }
  const db = await getDb();
  const known = poll.voters.find((voter) => voter.id === voterId) ?? null;

  if (known) {
    await db.batch([
      db.update(voters).set({ name, ...(note === undefined ? {} : { note }), ...(zone ? { zone } : {}) }).where(and(eq(voters.id, known.id), eq(voters.pollId, poll.id))),
      db.delete(marks).where(eq(marks.voterId, known.id)),
      insertMarks(db, known.id, LEVEL.yes, chosen),
      insertMarks(db, known.id, LEVEL.ifNeeded, maybe),
    ]);
    return { ok: true, voterId: known.id, isNew: false, poll, name };
  }

  if (!(await allowNewVoter())) {
    return { ok: false, status: 403, error: "We couldn’t confirm you’re not a bot. Reload the page and try again." };
  }
  const nextId = randomToken(16);
  const [inserted] = await db.batch([
    db.insert(voters).select(
      sql`SELECT ${nextId}, ${poll.id}, ${name}, ${Date.now()}, ${note ?? null}, ${false}, ${null}, ${null}, ${zone}, ${false}
        WHERE (SELECT COUNT(*) FROM ${voters} WHERE ${voters.pollId} = ${poll.id}) < ${MAX_VOTERS}`,
    ),
    insertMarks(db, nextId, LEVEL.yes, chosen),
    insertMarks(db, nextId, LEVEL.ifNeeded, maybe),
  ]);
  if ((inserted.meta.changes ?? 0) === 0) {
    return { ok: false, status: 409, error: `This poll is full. It already has ${MAX_VOTERS} answers.` };
  }
  return { ok: true, voterId: nextId, isNew: true, poll, name };
}

export async function updateNotify(token: string, input: unknown): Promise<Done | Failure> {
  const email = input === null ? null : readEmail(input);
  if (input !== null && !email) return { ok: false, status: 400, error: "Enter one email address." };
  const db = await getDb();
  const updated = await db
    .update(polls)
    .set({ notifyEmail: email })
    .where(eq(polls.ownerHash, await ownerHash(token)))
    .returning({ id: polls.id })
    .get();
  if (!updated) return NOT_FOUND;
  return { ok: true, id: updated.id };
}

export async function setVoterEmail(pollId: string, voterId: string | null, input: unknown, zoneInput: unknown): Promise<Done | Failure> {
  const poll = await getPoll(pollId);
  if (!poll) return NOT_FOUND;
  const known = voterId ? poll.voters.find((voter) => voter.id === voterId) : undefined;
  if (!known) return { ok: false, status: 404, error: "Save your answer first." };
  const email = input === null ? null : readEmail(input);
  if (input !== null && !email) return { ok: false, status: 400, error: "Enter one email address." };
  const db = await getDb();
  await db
    .update(voters)
    .set({ email, emailZone: email ? parseZone(zoneInput) : null, remind: email !== null })
    .where(and(eq(voters.id, known.id), eq(voters.pollId, poll.id)));
  return { ok: true, id: poll.id };
}

type Done = { ok: true; id: string };

function matchOption(
  options: TimeOption[],
  input: unknown,
): { ok: true; final: { start: number; end: number } | null } | { ok: false; error: string } {
  if (input === null) return { ok: true, final: null };
  const record = input as { start?: unknown; end?: unknown } | undefined;
  const chosen = options.find(
    (option) =>
      typeof record?.start === "string" &&
      typeof record?.end === "string" &&
      Date.parse(option.start) === Date.parse(record.start) &&
      Date.parse(option.end) === Date.parse(record.end),
  );
  if (!chosen) return { ok: false, error: "Pick one of the times on the poll." };
  return { ok: true, final: { start: Date.parse(chosen.start), end: Date.parse(chosen.end) } };
}

export async function updateOptions(token: string, input: unknown): Promise<Done | Failure> {
  const current = await getPollByOwnerToken(token);
  if (!current) return NOT_FOUND;
  if (current.kind !== "options") return { ok: false, status: 400, error: "This poll doesn’t offer set times." };
  if (current.voters.length > 0) return { ok: false, status: 409, error: "Times can’t change once people have answered." };
  const offered = parseOptions(input);
  if (!offered.ok) return { ok: false, status: 400, error: offered.error };
  const closes = naturalEnd("options", [], 0, offered.options);
  const db = await getDb();
  await db
    .update(polls)
    .set({
      options: offered.options,
      slots: offered.options.map((option) => option.start),
      closesAt: closes,
      deadline: null,
      deleteAt: closes + RETAIN_MS,
      finalStart: null,
      finalEnd: null,
      remindedAt: null,
    })
    .where(and(eq(polls.id, current.id), notExists(db.select({ id: voters.id }).from(voters).where(eq(voters.pollId, polls.id)))));
  return { ok: true, id: current.id };
}

export async function updateDuration(token: string, input: unknown): Promise<Done | Failure> {
  const poll = await getPollByOwnerToken(token);
  if (!poll) return NOT_FOUND;
  const length = parseDuration(input, poll.slots);
  if (!length.ok) return { ok: false, status: 400, error: length.error };
  const db = await getDb();
  await db.update(polls).set({ duration: length.duration }).where(eq(polls.id, poll.id));
  return { ok: true, id: poll.id };
}

export async function updateTitle(token: string, titleInput: unknown): Promise<Done | Failure> {
  if (typeof titleInput !== "string" || titleInput.trim() === "") {
    return { ok: false, status: 400, error: "Enter a title." };
  }
  const title = cleanText(titleInput, MAX_TITLE);
  if (!title) return { ok: false, status: 400, error: "Titles can be up to 80 characters." };
  const db = await getDb();
  const updated = await db
    .update(polls)
    .set({ title })
    .where(eq(polls.ownerHash, await ownerHash(token)))
    .returning({ id: polls.id })
    .get();
  if (!updated) return NOT_FOUND;
  return { ok: true, id: updated.id };
}

export async function updateSlots(token: string, slotsInput: unknown, zoneInput?: unknown): Promise<Done | Failure> {
  const parsed = parseSlots(slotsInput);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
  if (closesAt(parsed.slots) <= Date.now()) return { ok: false, status: 400, error: ALL_PAST };
  const current = await getPollByOwnerToken(token);
  if (!current) return NOT_FOUND;
  if (current.kind === "weekly" && !fitsOneWeek(parsed.slots)) {
    return { ok: false, status: 400, error: "A weekly poll covers one week." };
  }
  const closes = current.kind === "weekly" ? current.lastEnd : closesAt(parsed.slots);
  const hash = await ownerHash(token);
  const db = await getDb();
  const updated = await db
    .update(polls)
    .set({
      slots: parsed.slots,
      closesAt: closes,
      deadline: null,
      zone: parseZone(zoneInput) ?? current.zone,
      duration: current.duration !== null && current.duration <= longestRun(parsed.slots) ? current.duration : null,
      deleteAt: closes + RETAIN_MS,
      finalStart: null,
      finalEnd: null,
      remindedAt: null,
    })
    .where(
      and(
        eq(polls.ownerHash, hash),
        notExists(db.select({ id: voters.id }).from(voters).where(eq(voters.pollId, polls.id))),
      ),
    )
    .returning({ id: polls.id })
    .get();
  if (updated) return { ok: true, id: updated.id };

  const existing = await db.select({ id: polls.id }).from(polls).where(eq(polls.ownerHash, hash)).get();
  if (!existing) return NOT_FOUND;
  return { ok: false, status: 409, error: "Days can’t change once people have answered." };
}

export async function updateDeadline(token: string, input: unknown): Promise<Done | Failure> {
  const poll = await getPollByOwnerToken(token);
  if (!poll) return NOT_FOUND;
  const parsed = parseDeadline(input, { now: Date.now(), lastEnd: poll.lastEnd });
  if (!parsed.ok) return parsed;
  const db = await getDb();
  await db.update(polls).set({ deadline: parsed.deadline, closesAt: parsed.closesAt }).where(eq(polls.id, poll.id));
  return { ok: true, id: poll.id };
}

export async function updateFinal(
  token: string,
  input: unknown,
): Promise<(Done & { poll: StoredPoll; final: { start: number; end: number } | null }) | Failure> {
  const poll = await getPollByOwnerToken(token);
  if (!poll) return NOT_FOUND;
  const parsed = poll.options ? matchOption(poll.options, input) : parseFinal(poll.slots, input);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
  const db = await getDb();
  await db
    .update(polls)
    .set({
      finalStart: parsed.final?.start ?? null,
      finalEnd: parsed.final?.end ?? null,
      remindedAt: remindedAtFor(parsed.final ?? null, Date.now()),
    })
    .where(eq(polls.id, poll.id));
  return { ok: true, id: poll.id, poll, final: parsed.final ?? null };
}

export async function updatePlace(token: string, input: unknown): Promise<Done | Failure> {
  const poll = await getPollByOwnerToken(token);
  if (!poll) return NOT_FOUND;
  const parsed = parsePlace(input);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
  const db = await getDb();
  await db.update(polls).set({ place: parsed.place }).where(eq(polls.id, poll.id));
  return { ok: true, id: poll.id };
}

export async function deleteOwned(token: string): Promise<Done | Failure> {
  const db = await getDb();
  const deleted = await db
    .delete(polls)
    .where(eq(polls.ownerHash, await ownerHash(token)))
    .returning({ id: polls.id })
    .get();
  if (!deleted) return NOT_FOUND;
  return { ok: true, id: deleted.id };
}

export async function deleteOwnVote(pollId: string, voterId: string | null): Promise<Done | Failure> {
  const poll = await getPoll(pollId);
  if (!poll) return NOT_FOUND;
  if (poll.closed) return { ok: false, status: 403, error: "Voting has ended, so answers can’t change." };
  const known = voterId ? poll.voters.find((voter) => voter.id === voterId) : undefined;
  if (!known) return { ok: false, status: 404, error: "There’s no answer from you on this poll." };
  await deleteVoter(known.id, poll.id);
  return { ok: true, id: poll.id };
}

export async function removeAnswer(token: string, ref: string): Promise<Done | Failure> {
  const poll = await getPollByOwnerToken(token);
  if (!poll) return NOT_FOUND;
  const voter = poll.voters.find((candidate) => candidate.ref === ref);
  if (!voter) return { ok: false, status: 404, error: "That answer has already been removed." };
  await deleteVoter(voter.id, poll.id);
  return { ok: true, id: poll.id };
}

export async function setRequired(token: string, ref: string, input: unknown): Promise<Done | Failure> {
  if (typeof input !== "boolean") return { ok: false, status: 400, error: "That change couldn’t be saved." };
  const poll = await getPollByOwnerToken(token);
  if (!poll) return NOT_FOUND;
  const voter = poll.voters.find((candidate) => candidate.ref === ref);
  if (!voter) return { ok: false, status: 404, error: "That answer has been removed." };
  const db = await getDb();
  await db.update(voters).set({ required: input }).where(and(eq(voters.id, voter.id), eq(voters.pollId, poll.id)));
  return { ok: true, id: poll.id };
}

async function deleteVoter(voterId: string, pollId: string): Promise<void> {
  const db = await getDb();
  await db.delete(voters).where(and(eq(voters.id, voterId), eq(voters.pollId, pollId)));
}
