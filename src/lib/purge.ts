export async function purgeExpired(db: D1Database, now = Date.now()): Promise<{ polls: number; buckets: number }> {
  const [polls, buckets] = await db.batch([
    db.prepare("DELETE FROM polls WHERE delete_at <= ?").bind(now),
    db.prepare("DELETE FROM rate_buckets WHERE expires_at <= ?").bind(now),
  ]);
  return { polls: polls.meta.changes ?? 0, buckets: buckets.meta.changes ?? 0 };
}
