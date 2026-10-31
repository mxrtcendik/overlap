import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function announceChange(pollId: string): Promise<void> {
  const { env, ctx } = await getCloudflareContext({ async: true });
  const rooms = env.POLL_ROOM as CloudflareEnv["POLL_ROOM"] | undefined;
  if (!rooms) return;
  try {
    const room = rooms.get(rooms.idFromName(pollId));
    ctx.waitUntil(
      room.notify().then(
        () => undefined,
        (error: unknown) => logFailure(error),
      ),
    );
  } catch (error) {
    logFailure(error);
  }
}

function logFailure(error: unknown) {
  console.error(JSON.stringify({ event: "announce_failed", message: error instanceof Error ? error.message : "error" }));
}
