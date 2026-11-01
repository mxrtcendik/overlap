import { lte } from "drizzle-orm";
import type { Database } from "../db";
import { polls, rateBuckets } from "../db/schema";

export async function purgeExpired(db: Database, now = Date.now()): Promise<{ polls: number; buckets: number }> {
  const [removedPolls, removedBuckets] = await db.batch([
    db.delete(polls).where(lte(polls.deleteAt, now)),
    db.delete(rateBuckets).where(lte(rateBuckets.expiresAt, now)),
  ]);
  return { polls: removedPolls.meta.changes ?? 0, buckets: removedBuckets.meta.changes ?? 0 };
}
