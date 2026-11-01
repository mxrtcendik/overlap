import "server-only";
import { sql } from "drizzle-orm";
import { rateBuckets } from "@/db/schema";
import { RATE_LIMITS } from "./constants";
import type { Database } from "./db";
import { sha256 } from "./tokens";

type Action = keyof typeof RATE_LIMITS;

export function clientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "local";
  return "local";
}

export async function allowWrite(db: Database, request: Request, action: Action): Promise<boolean> {
  const { max, windowSec } = RATE_LIMITS[action];
  const now = Date.now();
  const windowId = Math.floor(now / (windowSec * 1000));
  const id = await sha256(`${action}:${windowId}:${clientIp(request)}`);
  const row = await db
    .insert(rateBuckets)
    .values({ id, hits: 1, expiresAt: (windowId + 1) * windowSec * 1000 })
    .onConflictDoUpdate({ target: rateBuckets.id, set: { hits: sql`${rateBuckets.hits} + 1` } })
    .returning({ hits: rateBuckets.hits })
    .get();
  return (row?.hits ?? 1) <= max;
}
