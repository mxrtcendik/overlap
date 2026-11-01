import { NextResponse } from "next/server";
import { announceChange } from "@/server/announce";
import { jsonError, readJson } from "@/server/http";
import { removeAnswer, setRequired } from "@/server/polls";
import { allowWrite } from "@/server/rate-limit";
import { isToken } from "@/lib/tokens";

type Params = { params: Promise<{ token: string; ref: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { token, ref } = await params;
  if (!isToken(token)) return jsonError("This poll doesn’t exist.", 404);
  if (!/^[0-9a-f]{16}$/.test(ref)) return jsonError("That answer has been removed.", 404);
  try {
    if (!(await allowWrite(request, "owner"))) {
      return jsonError("You’re saving too quickly. Try again in a minute.", 429);
    }
    const body = (await readJson(request)) as { required?: unknown } | null;
    const result = await setRequired(token, ref, body?.required);
    if (!result.ok) return jsonError(result.error, result.status);
    await announceChange(result.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(JSON.stringify({ event: "answer_update_failed", message: error instanceof Error ? error.message : "error" }));
    return jsonError("Something went wrong while saving. Try again.", 500);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { token, ref } = await params;
  if (!isToken(token)) return jsonError("This poll doesn’t exist.", 404);
  if (!/^[0-9a-f]{16}$/.test(ref)) return jsonError("That answer has already been removed.", 404);
  try {
    if (!(await allowWrite(request, "owner"))) {
      return jsonError("You’re saving too quickly. Try again in a minute.", 429);
    }
    const result = await removeAnswer(token, ref);
    if (!result.ok) return jsonError(result.error, result.status);
    await announceChange(result.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(JSON.stringify({ event: "answer_remove_failed", message: error instanceof Error ? error.message : "error" }));
    return jsonError("Something went wrong while removing the answer. Try again.", 500);
  }
}
