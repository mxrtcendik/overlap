import { NextResponse } from "next/server";
import { announceChange } from "@/server/announce";
import { jsonError, readJson } from "@/server/http";
import { deleteOwned, updateDeadline, updateFinal, updateSlots, updateTitle } from "@/server/polls";
import { allowWrite } from "@/server/rate-limit";
import { isToken } from "@/lib/tokens";

type Params = { params: Promise<{ token: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { token } = await params;
  if (!isToken(token)) return jsonError("This poll doesn’t exist.", 404);
  try {
    if (!(await allowWrite(request, "owner"))) {
      return jsonError("You’re saving too quickly. Try again in a minute.", 429);
    }
    const body = await readJson(request);
    if (!body || typeof body !== "object") return jsonError("That change couldn’t be saved.", 400);
    const record = body as { title?: unknown; slots?: unknown; zone?: unknown; final?: unknown; deadline?: unknown };
    if ("deadline" in record) {
      const result = await updateDeadline(token, record.deadline);
      if (!result.ok) return jsonError(result.error, result.status);
      await announceChange(result.id);
      return NextResponse.json({ ok: true });
    }
    if ("final" in record) {
      const result = await updateFinal(token, record.final);
      if (!result.ok) return jsonError(result.error, result.status);
      await announceChange(result.id);
      return NextResponse.json({ ok: true });
    }
    if ("slots" in record) {
      const result = await updateSlots(token, record.slots, record.zone);
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
    if (!(await allowWrite(request, "owner"))) {
      return jsonError("You’re saving too quickly. Try again in a minute.", 429);
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
