import { allowWrite } from "@/lib/rate";
import { createPoll } from "@/lib/polls";
import { getDb } from "@/lib/db";
import { jsonError, readJson } from "@/lib/http";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const db = await getDb();
    if (!(await allowWrite(db, request, "create"))) {
      return jsonError("Too many new polls. Wait a little and try again.", 429);
    }
    const body = await readJson(request);
    if (!body || typeof body !== "object") return jsonError("Enter a title.", 400);
    const record = body as { title?: unknown; slots?: unknown };
    const result = await createPoll(record.title, record.slots);
    if (!result.ok) return jsonError(result.error, 400);
    return NextResponse.json({ id: result.id, ownerToken: result.ownerToken });
  } catch (error) {
    console.error(JSON.stringify({ event: "create_failed", message: error instanceof Error ? error.message : "error" }));
    return jsonError("Could not create the poll. Try again.", 500);
  }
}
