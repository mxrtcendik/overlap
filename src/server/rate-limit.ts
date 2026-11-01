import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sha256 } from "../lib/tokens";

const LIMITERS = {
  create: "CREATE_LIMITER",
  vote: "VOTE_LIMITER",
  owner: "OWNER_LIMITER",
} as const;

type Action = keyof typeof LIMITERS;

export function clientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "local";
  return "local";
}

export async function allowWrite(request: Request, action: Action): Promise<boolean> {
  const { env } = await getCloudflareContext({ async: true });
  const limiter = env[LIMITERS[action]] as RateLimit | undefined;
  if (!limiter) {
    console.error(JSON.stringify({ event: "rate_limiter_missing", action }));
    return true;
  }
  const { success } = await limiter.limit({ key: await sha256(`${action}:${clientIp(request)}`) });
  return success;
}
