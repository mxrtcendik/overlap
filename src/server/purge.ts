import { lte } from "drizzle-orm";
import type { Database } from "../db";
import { polls } from "../db/schema";

export async function purgeExpired(db: Database, now = Date.now()): Promise<{ polls: number }> {
  const removed = await db.delete(polls).where(lte(polls.deleteAt, now));
  return { polls: removed.meta.changes ?? 0 };
}
