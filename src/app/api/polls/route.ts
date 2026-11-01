import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/server/http";
import { createPoll } from "@/server/polls";
import { allowWrite } from "@/server/rate-limit";
import { verifyTurnstile } from "@/server/turnstile";
import { CREATE_ACTION } from "@/lib/turnstile";

export async function POST(request: Request) {
  try {
    if (!(await allowWrite(request, "create"))) {
      return jsonError("You’re creating polls too quickly. Try again in a minute.", 429);
    }
    const body = await readJson(request);
    if (!body || typeof body !== "object") return jsonError("Enter a title.", 400);
    const record = body as { title?: unknown; slots?: unknown; kind?: unknown; zone?: unknown; "cf-turnstile-response"?: unknown };
    if (!(await verifyTurnstile(request, record["cf-turnstile-response"], CREATE_ACTION))) {
      return jsonError("We couldn’t confirm you’re not a bot. Reload the page and try again.", 403);
    }
    const result = await createPoll(record.title, record.slots, record.kind, record.zone);
    if (!result.ok) return jsonError(result.error, 400);
    return NextResponse.json({ id: result.id, ownerToken: result.ownerToken });
  } catch (error) {
    console.error(JSON.stringify({ event: "create_failed", message: error instanceof Error ? error.message : "error" }));
    return jsonError("Something went wrong while creating the poll. Try again.", 500);
  }
}
