import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb, type Database } from "@/db";

export type { Database };

export async function getDb(): Promise<Database> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) throw new Error("D1 binding DB is missing");
  return createDb(env.DB);
}
