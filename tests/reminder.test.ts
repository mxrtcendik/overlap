import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, it } from "node:test";
import { Database as Sqlite } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import type { Database } from "../src/db";
import * as schema from "../src/db/schema";
import { finalTimeEmail, reminderEmail } from "../src/lib/email";
import { REMIND_BEFORE, remindedAtFor } from "../src/lib/poll/reminder";
import { sendReminders } from "../src/server/reminders";

const HOUR = 60 * 60 * 1000;
const now = Date.UTC(2030, 0, 7, 9, 17);

describe("remindedAtFor", () => {
  it("leaves the reminder pending when the final time is more than a day away", () => {
    assert.equal(remindedAtFor({ start: now + REMIND_BEFORE + HOUR }, now), null);
  });

  it("marks it done when the final time is a day away or less, since the final-time email just went out", () => {
    assert.equal(remindedAtFor({ start: now + 3 * HOUR }, now), now);
    assert.equal(remindedAtFor({ start: now + REMIND_BEFORE }, now), now);
  });

  it("resets when the final time is cleared", () => {
    assert.equal(remindedAtFor(null, now), null);
  });
});

describe("reminderEmail", () => {
  const email = reminderEmail({
    title: `Retro <b>`,
    day: "Tue, Jan 8",
    time: "9:00 – 10:00 AM",
    pollUrl: "https://overlap.example.com/p/abc",
    place: "Room 4",
  });

  it("names the poll and the day", () => {
    assert.equal(email.subject, "Reminder: “Retro <b>” is Tue, Jan 8");
    assert.match(email.text, /Tue, Jan 8, 9:00 – 10:00 AM/);
    assert.match(email.text, /Where: Room 4/);
    assert.match(email.text, /last email/);
  });

  it("escapes the title in the HTML", () => {
    assert.ok(email.html.includes("Retro &lt;b&gt;"));
    assert.ok(!email.html.includes("<b>"));
  });
});

describe("finalTimeEmail", () => {
  const base = { title: "Retro", day: "Tue, Jan 8", time: "9:00 AM", pollUrl: "https://overlap.example.com/p/abc" };

  it("mentions the reminder only to people who agreed to one", () => {
    assert.match(finalTimeEmail({ ...base, remind: true }).text, /One reminder follows the day before/);
    assert.doesNotMatch(finalTimeEmail(base).text, /reminder/i);
  });
});

describe("sendReminders", () => {
  let db: Database;
  let sent: { to: string; subject: string; text: string }[];
  const mailer = {
    send: async (message: unknown) => {
      sent.push(message as { to: string; subject: string; text: string });
      return { messageId: "test" };
    },
  } as unknown as { send: SendEmail["send"] };
  const mail = () => ({ mailer, sender: "links@overlap.example.com", origin: "https://overlap.example.com/" });

  function addPoll(id: string, fields: Partial<typeof schema.polls.$inferInsert> = {}) {
    const start = fields.finalStart === undefined ? now + 20 * HOUR : fields.finalStart;
    return db.insert(schema.polls).values({
      id,
      ownerHash: `hash-${id}`,
      title: `Poll ${id}`,
      slots: [],
      createdAt: now - 48 * HOUR,
      closesAt: now + 48 * HOUR,
      deleteAt: now + 30 * 24 * HOUR,
      finalStart: start,
      finalEnd: start === null ? null : start + HOUR,
      ...fields,
    });
  }

  function addVoter(id: string, pollId: string, fields: Partial<typeof schema.voters.$inferInsert> = {}) {
    return db.insert(schema.voters).values({ id, pollId, name: id, createdAt: now, ...fields });
  }

  beforeEach(() => {
    const sqlite = new Sqlite(":memory:");
    const dir = fileURLToPath(new URL("../migrations/", import.meta.url));
    for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) {
      for (const statement of readFileSync(dir + file, "utf8").split("--> statement-breakpoint")) {
        if (statement.trim()) sqlite.exec(statement);
      }
    }
    db = drizzle(sqlite, { schema }) as unknown as Database;
    sent = [];
  });

  it("emails voters who agreed, in their own timezone, and only once", async () => {
    await addPoll("soon");
    await addVoter("ada", "soon", { email: "ada@example.com", emailZone: "Europe/Istanbul", remind: true });
    await addVoter("old", "soon", { email: "old@example.com", remind: false });
    await addVoter("anon", "soon");

    assert.deepEqual(await sendReminders(db, mail(), now), { polls: 1, sent: 1, failed: 0 });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, "ada@example.com");
    assert.match(sent[0].text, /https:\/\/overlap\.example\.com\/p\/soon/);
    assert.match(sent[0].text, /8:17/, "05:17 UTC is 08:17 in Istanbul");

    assert.deepEqual(await sendReminders(db, mail(), now + HOUR), { polls: 0, sent: 0, failed: 0 });
    assert.equal(sent.length, 1);
  });

  it("skips polls that are too far off, already past, weekly, deleted or already reminded", async () => {
    await addPoll("far", { finalStart: now + REMIND_BEFORE + HOUR });
    await addPoll("past", { finalStart: now - HOUR });
    await addPoll("weekly", { kind: "weekly" });
    await addPoll("gone", { deleteAt: now - 1 });
    await addPoll("done", { remindedAt: now - HOUR });
    await addPoll("open", { finalStart: null });
    for (const id of ["far", "past", "weekly", "gone", "done", "open"]) {
      await addVoter(`v-${id}`, id, { email: `${id}@example.com`, remind: true });
    }

    assert.deepEqual(await sendReminders(db, mail(), now), { polls: 0, sent: 0, failed: 0 });
    assert.equal(sent.length, 0);
  });

  it("does nothing without a mailer or a site address", async () => {
    await addPoll("soon");
    await addVoter("ada", "soon", { email: "ada@example.com", remind: true });
    assert.equal((await sendReminders(db, { ...mail(), origin: undefined }, now)).polls, 0);
    assert.equal((await sendReminders(db, { ...mail(), mailer: undefined }, now)).polls, 0);
    assert.equal((await sendReminders(db, mail(), now)).sent, 1);
  });
});
