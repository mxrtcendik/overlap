import { relations, sql } from "drizzle-orm";
import { check, index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const polls = sqliteTable(
  "polls",
  {
    id: text("id").primaryKey(),
    ownerHash: text("owner_hash").notNull().unique(),
    title: text("title").notNull(),
    kind: text("kind").$type<"dates" | "weekly" | "options">().notNull().default("dates"),
    options: text("options", { mode: "json" }).$type<{ start: string; end: string }[]>(),
    zone: text("zone"),
    duration: integer("duration"),
    notifyEmail: text("notify_email"),
    slots: text("slots", { mode: "json" }).notNull().$type<string[]>(),
    createdAt: integer("created_at").notNull(),
    closesAt: integer("closes_at").notNull(),
    deadline: integer("deadline"),
    deleteAt: integer("delete_at").notNull(),
    finalStart: integer("final_start"),
    finalEnd: integer("final_end"),
    place: text("place"),
    remindedAt: integer("reminded_at"),
  },
  (table) => [index("polls_delete_at").on(table.deleteAt)],
);

export const voters = sqliteTable(
  "voters",
  {
    id: text("id").primaryKey(),
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: integer("created_at").notNull(),
    note: text("note"),
    required: integer("required", { mode: "boolean" }).notNull().default(false),
    email: text("email"),
    emailZone: text("email_zone"),
    zone: text("zone"),
    remind: integer("remind", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [index("voters_poll_id").on(table.pollId, table.createdAt)],
);

export const LEVEL = { ifNeeded: 1, yes: 2 } as const;

export const marks = sqliteTable(
  "marks",
  {
    voterId: text("voter_id")
      .notNull()
      .references(() => voters.id, { onDelete: "cascade" }),
    slot: text("slot").notNull(),
    level: integer("level").$type<(typeof LEVEL)[keyof typeof LEVEL]>().notNull().default(LEVEL.yes),
  },
  (table) => [
    primaryKey({ columns: [table.voterId, table.slot] }),
    check("marks_level", sql`${table.level} IN (1, 2)`),
  ],
);

export const pollsRelations = relations(polls, ({ many }) => ({ voters: many(voters) }));

export const votersRelations = relations(voters, ({ one, many }) => ({
  poll: one(polls, { fields: [voters.pollId], references: [polls.id] }),
  marks: many(marks),
}));

export const marksRelations = relations(marks, ({ one }) => ({
  voter: one(voters, { fields: [marks.voterId], references: [voters.id] }),
}));
