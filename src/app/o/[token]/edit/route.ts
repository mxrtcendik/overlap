import { NextResponse } from "next/server";
import { announceChange } from "@/lib/announce";
import { getDb } from "@/lib/db";
import { jsonError, readJson } from "@/lib/http";
import { deleteOwned, updateFinal, updateSlots, updateTitle } from "@/lib/polls";
import { allowWrite } from "@/lib/rate";
import { isToken } from "@/lib/tokens";

type Params = { params: Promise<{ token: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { token } = await params;
  if (!isToken(token)) return jsonError("This poll doesn’t exist.", 404);
  try {
    const db = await getDb();
    if (!(await allowWrite(db, request, "owner"))) {
      return jsonError("You’re saving too quickly. Try again in a few minutes.", 429);
    }
    const body = await readJson(request);
    if (!body || typeof body !== "object") return jsonError("That change couldn’t be saved.", 400);
    const record = body as { title?: unknown; slots?: unknown; final?: unknown };
    if ("final" in record) {
      const result = await updateFinal(token, record.final);
      if (!result.ok) return jsonError(result.error, result.status);
      await announceChange(result.id);
      return NextResponse.json({ ok: true });
    }
    if ("slots" in record) {
      const result = await updateSlots(token, record.slots);
      if (!result.ok) return jsonError(result.error, result.status);
      await announceChange(result.id);
      return NextResponse.json({ ok: true });
    }
    if ("title" in record) {
      const result = await updateTitle(token, record.title);
      if (!result.ok) return jsonError(result.error, result.status);
      await announceChange(result.id);
      return NextResponse.json({ ok: true });
    }
    return jsonError("That change couldn’t be saved.", 400);
  } catch (error) {
    console.error(JSON.stringify({ event: "owner_update_failed", message: error instanceof Error ? error.message : "error" }));
    return jsonError("Something went wrong while saving. Try again.", 500);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { token } = await params;
  if (!isToken(token)) return jsonError("This poll doesn’t exist.", 404);
  try {
    const db = await getDb();
    if (!(await allowWrite(db, request, "owner"))) {
      return jsonError("You’re saving too quickly. Try again in a few minutes.", 429);
    }
    const result = await deleteOwned(token);
    if (!result.ok) return jsonError(result.error, result.status);
    await announceChange(result.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(JSON.stringify({ event: "owner_delete_failed", message: error instanceof Error ? error.message : "error" }));
    return jsonError("Something went wrong while deleting the poll. Try again.", 500);
  }
}
