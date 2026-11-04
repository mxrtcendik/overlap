import { default as nextHandler } from "./.open-next/worker.js";
import { and, eq, gt } from "drizzle-orm";
import { createDb } from "./src/db";
import { polls } from "./src/db/schema";
import { isSameOrigin, livePollId } from "./src/lib/live";
import { purgeExpired } from "./src/server/purge";
import { sendReminders } from "./src/server/reminders";

export { PollRoom } from "./src/server/poll-room";

const next = nextHandler as ExportedHandler<CloudflareEnv>;

async function openLive(request: Request, env: CloudflareEnv, pollId: string): Promise<Response> {
  if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
    return new Response("Expected a WebSocket.", { status: 426 });
  }
  if (!isSameOrigin(request.url, request.headers.get("Origin"))) {
    return new Response("Forbidden.", { status: 403 });
  }
  const live = await createDb(env.DB)
    .select({ id: polls.id })
    .from(polls)
    .where(and(eq(polls.id, pollId), gt(polls.deleteAt, Date.now())))
    .get();
  if (!live) return new Response("This poll doesn’t exist.", { status: 404 });
  return env.POLL_ROOM.get(env.POLL_ROOM.idFromName(pollId)).fetch(request);
}

export default {
  async fetch(request, env, ctx) {
    const pollId = request.method === "GET" ? livePollId(new URL(request.url).pathname) : null;
    if (pollId) return openLive(request, env, pollId);
    return next.fetch!(request, env, ctx);
  },

  async scheduled(_controller, env, ctx) {
    const db = createDb(env.DB);
    ctx.waitUntil(purgeExpired(db).then((removed) => console.log(JSON.stringify({ event: "purge", ...removed }))));
    ctx.waitUntil(
      sendReminders(db, { mailer: env.EMAIL, sender: env.EMAIL_FROM, origin: env.SITE_URL }).then((result) =>
        console.log(JSON.stringify({ event: "reminders", ...result })),
      ),
    );
  },
} satisfies ExportedHandler<CloudflareEnv>;
