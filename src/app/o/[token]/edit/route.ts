import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError, readJson } from "@/lib/http";
import { deleteOwned, updateSlots, updateTitle } from "@/lib/polls";
import { allowWrite } from "@/lib/rate";
import { isToken } from "@/lib/tokens";

type Params = { params: Promise<{ token: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { token } = await params;
  if (!isToken(token)) return jsonError("This poll does not exist.", 404);
  try {
    const db = await getDb();
    if (!(await allowWrite(db, request, "owner"))) {
      return jsonError("Too many saves. Wait a little and try again.", 429);
    }
    const body = await readJson(request);
    if (!body || typeof body !== "object") return jsonError("Could not save.", 400);
    const record = body as { title?: unknown; slots?: unknown };
    if ("slots" in record) {
      const result = await updateSlots(token, record.slots);
      if (!result.ok) return jsonError(result.error, result.status);
      return NextResponse.json({ ok: true });
    }
    if ("title" in record) {
      const result = await updateTitle(token, record.title);
      if (!result.ok) return jsonError(result.error, result.status);
      return NextResponse.json({ ok: true });
    }
    return jsonError("Could not save.", 400);
  } catch (error) {
    console.error(JSON.stringify({ event: "owner_update_failed", message: error instanceof Error ? error.message : "error" }));
    return jsonError("Could not save. Try again.", 500);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { token } = await params;
  if (!isToken(token)) return jsonError("This poll does not exist.", 404);
  try {
    const db = await getDb();
    if (!(await allowWrite(db, request, "owner"))) {
      return jsonError("Too many saves. Wait a little and try again.", 429);
    }
    const result = await deleteOwned(token);
    if (!result.ok) return jsonError(result.error, result.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(JSON.stringify({ event: "owner_delete_failed", message: error instanceof Error ? error.message : "error" }));
    return jsonError("Could not delete the poll. Try again.", 500);
  }
}
