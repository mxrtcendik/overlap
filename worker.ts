// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { default as nextHandler } from "./.open-next/worker.js";
import { isSameOrigin, livePollId } from "./src/lib/live";
import { purgeExpired } from "./src/lib/purge";

export { PollRoom } from "./src/lib/poll-room";

const next = nextHandler as ExportedHandler<CloudflareEnv>;

async function openLive(request: Request, env: CloudflareEnv, pollId: string): Promise<Response> {
  if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
    return new Response("Expected a WebSocket.", { status: 426 });
  }
  if (!isSameOrigin(request.url, request.headers.get("Origin"))) {
    return new Response("Forbidden.", { status: 403 });
  }
  const live = await env.DB.prepare("SELECT 1 FROM polls WHERE id = ? AND delete_at > ?")
    .bind(pollId, Date.now())
    .first();
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
    ctx.waitUntil(
      purgeExpired(env.DB).then((removed) => console.log(JSON.stringify({ event: "purge", ...removed }))),
    );
  },
} satisfies ExportedHandler<CloudflareEnv>;
