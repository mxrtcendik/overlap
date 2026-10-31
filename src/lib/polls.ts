import "server-only";
import { cache } from "react";
import { MAX_NAME, MAX_TITLE, MAX_VOTERS, RETAIN_MS, SLOT_MS } from "./constants";
import { getDb } from "./db";
import { parseFinal, parseSlots } from "./slots";
import { cleanText } from "./text";
import { isToken, randomToken, sha256 } from "./tokens";
import type { FinalTime, PollView, VoterView } from "./types";

export type { FinalTime, PollView, VoterView };

export type StoredVoter = { id: string; ref: string; name: string; slots: string[] };

export type StoredPoll = {
  id: string;
  title: string;
  slots: string[];
  closed: boolean;
  final: FinalTime | null;
  voters: StoredVoter[];
};

type PollRow = {
  id: string;
  title: string;
  slots: string;
  closes_at: number;
  delete_at: number;
  final_start: number | null;
  final_end: number | null;
};

type Failure = { ok: false; status: number; error: string };

const NOT_FOUND: Failure = { ok: false, status: 404, error: "This poll doesn’t exist." };

const ownerHash = (token: string) => sha256(token);

const voterRef = async (voterId: string) => (await sha256(`voter:${voterId}`)).slice(0, 16);

const INSERT_MARKS = `INSERT INTO marks (voter_id, slot)
  SELECT ?, value FROM json_each(?)
  WHERE EXISTS (SELECT 1 FROM voters WHERE id = ?)`;

export function toPollView(poll: StoredPoll, voterId: string | null, options: { refs?: boolean } = {}): PollView {
  return {
    id: poll.id,
    title: poll.title,
    slots: poll.slots,
    closed: poll.closed,
    final: poll.final,
    voters: poll.voters.map((voter) => ({
      name: voter.name,
      slots: voter.slots,
      yours: voterId !== null && voter.id === voterId,
      ...(options.refs ? { ref: voter.ref } : {}),
    })),
  };
}

function parseStoredSlots(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((slot): slot is string => typeof slot === "string") : [];
  } catch {
    return [];
  }
}

export const getPoll = cache(async (id: string): Promise<StoredPoll | null> => {
  if (!isToken(id)) return null;
  const db = await getDb();
  const now = Date.now();
  const poll = await db
    .prepare("SELECT id, title, slots, closes_at, delete_at, final_start, final_end FROM polls WHERE id = ?")
    .bind(id)
    .first<PollRow>();
  if (!poll || poll.delete_at <= now) return null;

  const [voters, marks] = await db.batch([
    db.prepare("SELECT id, name FROM voters WHERE poll_id = ? ORDER BY created_at ASC, id ASC").bind(id),
    db
      .prepare("SELECT marks.voter_id, marks.slot FROM marks JOIN voters ON voters.id = marks.voter_id WHERE voters.poll_id = ?")
      .bind(id),
  ]);

  const marksByVoter = new Map<string, string[]>();
  for (const mark of marks.results as { voter_id: string; slot: string }[]) {
    const list = marksByVoter.get(mark.voter_id) ?? [];
    list.push(mark.slot);
    marksByVoter.set(mark.voter_id, list);
  }

  return {
    id: poll.id,
    title: poll.title,
    slots: parseStoredSlots(poll.slots),
    closed: poll.closes_at <= now,
    final:
      poll.final_start !== null && poll.final_end !== null
        ? { start: new Date(poll.final_start).toISOString(), end: new Date(poll.final_end).toISOString() }
        : null,
    voters: await Promise.all(
      (voters.results as { id: string; name: string }[]).map(async (voter) => ({
        id: voter.id,
        ref: await voterRef(voter.id),
        name: voter.name,
        slots: marksByVoter.get(voter.id) ?? [],
      })),
    ),
  };
});

export const getPollByOwnerToken = cache(async (token: string): Promise<StoredPoll | null> => {
  if (!isToken(token)) return null;
  const db = await getDb();
  const row = await db
    .prepare("SELECT id FROM polls WHERE owner_hash = ?")
    .bind(await ownerHash(token))
    .first<{ id: string }>();
  return row ? getPoll(row.id) : null;
});

function closesAt(slots: string[]): number {
  return Math.max(...slots.map((slot) => Date.parse(slot))) + SLOT_MS;
}

const ALL_PAST = "Those times have already passed. Pick a later day or time.";

export async function createPoll(
  titleInput: unknown,
  slotsInput: unknown,
): Promise<{ ok: true; id: string; ownerToken: string } | { ok: false; error: string }> {
  if (typeof titleInput !== "string" || titleInput.trim() === "") {
    return { ok: false, error: "Enter a title." };
  }
  const title = cleanText(titleInput, MAX_TITLE);
  if (!title) return { ok: false, error: "Titles can be up to 80 characters." };
  const parsed = parseSlots(slotsInput);
  if (!parsed.ok) return parsed;
  if (closesAt(parsed.slots) <= Date.now()) return { ok: false, error: ALL_PAST };

  const db = await getDb();
  const id = randomToken(16);
  const ownerToken = randomToken(24);
  const now = Date.now();
  const closes = closesAt(parsed.slots);
  await db
    .prepare(
      `INSERT INTO polls (id, owner_hash, title, slots, created_at, closes_at, delete_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, await ownerHash(ownerToken), title, JSON.stringify(parsed.slots), now, closes, closes + RETAIN_MS)
    .run();
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
): Promise<{ ok: true; voterId: string } | Failure> {
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
  const chosen = subset(poll.slots, (body as { slots?: unknown }).slots);
  if (!chosen) return { ok: false, status: 400, error: "Some of those times aren’t on this poll." };
  const chosenJson = JSON.stringify(chosen);

  const db = await getDb();
  const known = poll.voters.find((voter) => voter.id === voterId) ?? null;

  if (known) {
    await db.batch([
      db.prepare("UPDATE voters SET name = ? WHERE id = ? AND poll_id = ?").bind(name, known.id, poll.id),
      db.prepare("DELETE FROM marks WHERE voter_id = ?").bind(known.id),
      db.prepare(INSERT_MARKS).bind(known.id, chosenJson, known.id),
    ]);
    return { ok: true, voterId: known.id };
  }

  const nextId = randomToken(16);
  const [inserted] = await db.batch([
    db
      .prepare(
        `INSERT INTO voters (id, poll_id, name, created_at)
         SELECT ?, ?, ?, ?
         WHERE (SELECT COUNT(*) FROM voters WHERE poll_id = ?) < ?`,
      )
      .bind(nextId, poll.id, name, Date.now(), poll.id, MAX_VOTERS),
    db.prepare(INSERT_MARKS).bind(nextId, chosenJson, nextId),
  ]);
  if ((inserted.meta.changes ?? 0) === 0) {
    return { ok: false, status: 409, error: `This poll is full. It already has ${MAX_VOTERS} answers.` };
  }
  return { ok: true, voterId: nextId };
}

type Done = { ok: true; id: string };

export async function updateTitle(token: string, titleInput: unknown): Promise<Done | Failure> {
  if (typeof titleInput !== "string" || titleInput.trim() === "") {
    return { ok: false, status: 400, error: "Enter a title." };
  }
  const title = cleanText(titleInput, MAX_TITLE);
  if (!title) return { ok: false, status: 400, error: "Titles can be up to 80 characters." };
  const db = await getDb();
  const updated = await db
    .prepare("UPDATE polls SET title = ? WHERE owner_hash = ? RETURNING id")
    .bind(title, await ownerHash(token))
    .first<{ id: string }>();
  if (!updated) return NOT_FOUND;
  return { ok: true, id: updated.id };
}

export async function updateSlots(token: string, slotsInput: unknown): Promise<Done | Failure> {
  const parsed = parseSlots(slotsInput);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
  const closes = closesAt(parsed.slots);
  if (closes <= Date.now()) return { ok: false, status: 400, error: ALL_PAST };
  const hash = await ownerHash(token);
  const db = await getDb();
  const updated = await db
    .prepare(
      `UPDATE polls
       SET slots = ?, closes_at = ?, delete_at = ?, final_start = NULL, final_end = NULL
       WHERE owner_hash = ?
         AND NOT EXISTS (SELECT 1 FROM voters WHERE voters.poll_id = polls.id)
       RETURNING id`,
    )
    .bind(JSON.stringify(parsed.slots), closes, closes + RETAIN_MS, hash)
    .first<{ id: string }>();
  if (updated) return { ok: true, id: updated.id };

  const existing = await db.prepare("SELECT 1 FROM polls WHERE owner_hash = ?").bind(hash).first();
  if (!existing) return NOT_FOUND;
  return { ok: false, status: 409, error: "Days can’t change once people have answered." };
}

export async function updateFinal(token: string, input: unknown): Promise<Done | Failure> {
  const poll = await getPollByOwnerToken(token);
  if (!poll) return NOT_FOUND;
  const parsed = parseFinal(poll.slots, input);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
  const db = await getDb();
  await db
    .prepare("UPDATE polls SET final_start = ?, final_end = ? WHERE id = ?")
    .bind(parsed.final?.start ?? null, parsed.final?.end ?? null, poll.id)
    .run();
  return { ok: true, id: poll.id };
}

export async function deleteOwned(token: string): Promise<Done | Failure> {
  const db = await getDb();
  const deleted = await db
    .prepare("DELETE FROM polls WHERE owner_hash = ? RETURNING id")
    .bind(await ownerHash(token))
    .first<{ id: string }>();
  if (!deleted) return NOT_FOUND;
  return { ok: true, id: deleted.id };
}

export async function deleteOwnVote(pollId: string, voterId: string | null): Promise<Done | Failure> {
  const poll = await getPoll(pollId);
  if (!poll) return NOT_FOUND;
  if (poll.closed) return { ok: false, status: 403, error: "Voting has ended, so answers can’t change." };
  const known = voterId ? poll.voters.find((voter) => voter.id === voterId) : undefined;
  if (!known) return { ok: false, status: 404, error: "There’s no answer from you on this poll." };
  await (await getDb()).prepare("DELETE FROM voters WHERE id = ? AND poll_id = ?").bind(known.id, poll.id).run();
  return { ok: true, id: poll.id };
}

export async function removeAnswer(token: string, ref: string): Promise<Done | Failure> {
  const poll = await getPollByOwnerToken(token);
  if (!poll) return NOT_FOUND;
  const voter = poll.voters.find((candidate) => candidate.ref === ref);
  if (!voter) return { ok: false, status: 404, error: "That answer has already been removed." };
  await (await getDb()).prepare("DELETE FROM voters WHERE id = ? AND poll_id = ?").bind(voter.id, poll.id).run();
  return { ok: true, id: poll.id };
}
