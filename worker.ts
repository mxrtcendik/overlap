// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { default as nextHandler } from "./.open-next/worker.js";
import { purgeExpired } from "./src/lib/purge";

export default {
  fetch: (nextHandler as ExportedHandler<CloudflareEnv>).fetch,

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      purgeExpired(env.DB).then((removed) => console.log(JSON.stringify({ event: "purge", ...removed }))),
    );
  },
} satisfies ExportedHandler<CloudflareEnv>;
