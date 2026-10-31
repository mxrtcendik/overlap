import "server-only";
import { cache } from "react";
import { MAX_NAME, MAX_TITLE, MAX_VOTERS, RETAIN_MS, SLOT_MS } from "./constants";
import { getDb } from "./db";
import { parseSlots } from "./slots";
import { cleanText } from "./text";
import { isToken, randomToken, sha256 } from "./tokens";
import type { PollView, VoterView } from "./types";

export type { PollView, VoterView };

export type StoredVoter = { id: string; name: string; slots: string[] };

export type StoredPoll = {
  id: string;
  title: string;
  slots: string[];
  closed: boolean;
  voters: StoredVoter[];
};

type PollRow = {
  id: string;
  title: string;
  slots: string;
  closes_at: number;
  delete_at: number;
};

type Failure = { ok: false; status: number; error: string };

const NOT_FOUND: Failure = { ok: false, status: 404, error: "This poll does not exist." };

const ownerHash = (token: string) => sha256(token);

const INSERT_MARKS = `INSERT INTO marks (voter_id, slot)
  SELECT ?, value FROM json_each(?)
  WHERE EXISTS (SELECT 1 FROM voters WHERE id = ?)`;

export function toPollView(poll: StoredPoll, voterId: string | null): PollView {
  return {
    id: poll.id,
    title: poll.title,
    slots: poll.slots,
    closed: poll.closed,
    voters: poll.voters.map((voter) => ({
      name: voter.name,
      slots: voter.slots,
      yours: voterId !== null && voter.id === voterId,
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
    .prepare("SELECT id, title, slots, closes_at, delete_at FROM polls WHERE id = ?")
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
    voters: (voters.results as { id: string; name: string }[]).map((voter) => ({
      id: voter.id,
      name: voter.name,
      slots: marksByVoter.get(voter.id) ?? [],
    })),
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

export async function createPoll(
  titleInput: unknown,
  slotsInput: unknown,
): Promise<{ ok: true; id: string; ownerToken: string } | { ok: false; error: string }> {
  if (typeof titleInput !== "string" || titleInput.trim() === "") {
    return { ok: false, error: "Enter a title." };
  }
  const title = cleanText(titleInput, MAX_TITLE);
  if (!title) return { ok: false, error: "The title can be 80 characters at most." };
  const parsed = parseSlots(slotsInput);
  if (!parsed.ok) return parsed;

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
  if (poll.closed) return { ok: false, status: 403, error: "This poll is closed." };
  if (!body || typeof body !== "object") return { ok: false, status: 400, error: "Enter a name." };

  const nameInput = (body as { name?: unknown }).name;
  if (typeof nameInput !== "string" || nameInput.trim() === "") {
    return { ok: false, status: 400, error: "Enter a name." };
  }
  const name = cleanText(nameInput, MAX_NAME);
  if (!name) return { ok: false, status: 400, error: "A name can be 40 characters at most." };
  const chosen = subset(poll.slots, (body as { slots?: unknown }).slots);
  if (!chosen) return { ok: false, status: 400, error: "Those times are not on this poll." };
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
    return { ok: false, status: 409, error: `This poll already has ${MAX_VOTERS} people.` };
  }
  return { ok: true, voterId: nextId };
}

export async function updateTitle(token: string, titleInput: unknown): Promise<{ ok: true } | Failure> {
  if (typeof titleInput !== "string" || titleInput.trim() === "") {
    return { ok: false, status: 400, error: "Enter a title." };
  }
  const title = cleanText(titleInput, MAX_TITLE);
  if (!title) return { ok: false, status: 400, error: "The title can be 80 characters at most." };
  const db = await getDb();
  const updated = await db
    .prepare("UPDATE polls SET title = ? WHERE owner_hash = ?")
    .bind(title, await ownerHash(token))
    .run();
  if ((updated.meta.changes ?? 0) === 0) return NOT_FOUND;
  return { ok: true };
}

export async function updateSlots(token: string, slotsInput: unknown): Promise<{ ok: true } | Failure> {
  const parsed = parseSlots(slotsInput);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
  const closes = closesAt(parsed.slots);
  const hash = await ownerHash(token);
  const db = await getDb();
  const updated = await db
    .prepare(
      `UPDATE polls
       SET slots = ?, closes_at = ?, delete_at = ?
       WHERE owner_hash = ?
         AND NOT EXISTS (SELECT 1 FROM voters WHERE voters.poll_id = polls.id)`,
    )
    .bind(JSON.stringify(parsed.slots), closes, closes + RETAIN_MS, hash)
    .run();
  if ((updated.meta.changes ?? 0) > 0) return { ok: true };

  const existing = await db.prepare("SELECT 1 FROM polls WHERE owner_hash = ?").bind(hash).first();
  if (!existing) return NOT_FOUND;
  return { ok: false, status: 409, error: "The days are fixed once someone has answered." };
}

export async function deleteOwned(token: string): Promise<{ ok: true } | Failure> {
  const db = await getDb();
  const deleted = await db
    .prepare("DELETE FROM polls WHERE owner_hash = ?")
    .bind(await ownerHash(token))
    .run();
  if ((deleted.meta.changes ?? 0) === 0) return NOT_FOUND;
  return { ok: true };
}
