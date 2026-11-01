import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { linksEmail, readEmail } from "@/lib/email";
import { isToken } from "@/lib/tokens";
import { EMAIL_ACTION } from "@/lib/turnstile";
import { jsonError, readJson } from "@/server/http";
import { getPollByOwnerToken } from "@/server/polls";
import { allowWrite } from "@/server/rate-limit";
import { verifyTurnstile } from "@/server/turnstile";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isToken(token)) return jsonError("This poll doesn’t exist.", 404);
  try {
    if (!(await allowWrite(request, "email"))) {
      return jsonError("That’s a few emails already. Try again in a minute.", 429);
    }
    const body = (await readJson(request)) as { email?: unknown; "cf-turnstile-response"?: unknown } | null;
    const to = readEmail(body?.email);
    if (!to) return jsonError("Enter one email address.", 400);
    if (!(await verifyTurnstile(request, body?.["cf-turnstile-response"], EMAIL_ACTION))) {
      return jsonError("We couldn’t confirm you’re not a bot. Reload the page and try again.", 403);
    }
    const poll = await getPollByOwnerToken(token);
    if (!poll) return jsonError("This poll doesn’t exist.", 404);

    const { env } = await getCloudflareContext({ async: true });
    const mailer = env.EMAIL as SendEmail | undefined;
    const sender = env.EMAIL_FROM as string | undefined;
    if (!mailer || !sender) return jsonError("Email isn’t available right now.", 503);

    const origin = new URL(request.url).origin;
    const message = linksEmail({ title: poll.title, publicUrl: `${origin}/p/${poll.id}`, secretUrl: `${origin}/o/${token}` });
    await mailer.send({ from: { name: "Overlap", email: sender }, to, ...message });
    console.log(JSON.stringify({ event: "links_emailed" }));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(JSON.stringify({ event: "email_failed", message: error instanceof Error ? error.message : "error" }));
    return jsonError("The email couldn’t be sent. Try again.", 500);
  }
}
