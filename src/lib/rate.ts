import "server-only";
import { RATE_LIMITS } from "./constants";
import { sha256 } from "./tokens";

type Action = keyof typeof RATE_LIMITS;

export function clientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "local";
  return "local";
}

export async function allowWrite(db: D1Database, request: Request, action: Action): Promise<boolean> {
  const { max, windowSec } = RATE_LIMITS[action];
  const now = Date.now();
  const windowId = Math.floor(now / (windowSec * 1000));
  const id = await sha256(`${action}:${windowId}:${clientIp(request)}`);
  const row = await db
    .prepare(
      `INSERT INTO rate_buckets (id, hits, expires_at) VALUES (?, 1, ?)
       ON CONFLICT(id) DO UPDATE SET hits = hits + 1
       RETURNING hits`,
    )
    .bind(id, (windowId + 1) * windowSec * 1000)
    .first<{ hits: number }>();
  return (row?.hits ?? 1) <= max;
}
