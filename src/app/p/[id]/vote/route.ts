import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { announceChange } from "@/server/announce";
import { jsonError, readJson } from "@/server/http";
import { deleteOwnVote, saveVote } from "@/server/polls";
import { allowWrite } from "@/server/rate-limit";
import { verifyTurnstile } from "@/server/turnstile";
import { VOTE_ACTION } from "@/lib/turnstile";
import { newAnswerEmail } from "@/lib/email";
import { sendLater } from "@/server/mail";
import { isToken } from "@/lib/tokens";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isToken(id)) return jsonError("This poll doesn’t exist.", 404);
  try {
    if (!(await allowWrite(request, "vote"))) {
      return jsonError("You’re saving too quickly. Try again in a minute.", 429);
    }
    const jar = await cookies();
    const body = await readJson(request);
    const token = body && typeof body === "object" ? (body as { "cf-turnstile-response"?: unknown })["cf-turnstile-response"] : undefined;
    const result = await saveVote(id, jar.get("voter")?.value ?? null, body, () => verifyTurnstile(request, token, VOTE_ACTION));
    if (!result.ok) return jsonError(result.error, result.status);
    jar.set("voter", result.voterId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: `/p/${id}`,
      maxAge: 60 * 60 * 24 * 400,
    });
    await announceChange(id);
    if (result.isNew && result.poll.notifyEmail) {
      const publicUrl = `${new URL(request.url).origin}/p/${id}`;
      const message = newAnswerEmail({ title: result.poll.title, name: result.name, count: result.poll.voters.length + 1, publicUrl });
      await sendLater([{ to: result.poll.notifyEmail, ...message }], "answer_emailed");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(JSON.stringify({ event: "vote_failed", message: error instanceof Error ? error.message : "error" }));
    return jsonError("Something went wrong while saving. Try again.", 500);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isToken(id)) return jsonError("This poll doesn’t exist.", 404);
  try {
    if (!(await allowWrite(request, "vote"))) {
      return jsonError("You’re saving too quickly. Try again in a minute.", 429);
    }
    const jar = await cookies();
    const result = await deleteOwnVote(id, jar.get("voter")?.value ?? null);
    if (!result.ok) return jsonError(result.error, result.status);
    jar.set("voter", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: `/p/${id}`,
      maxAge: 0,
    });
    await announceChange(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(JSON.stringify({ event: "vote_delete_failed", message: error instanceof Error ? error.message : "error" }));
    return jsonError("Something went wrong while removing your answer. Try again.", 500);
  }
}
