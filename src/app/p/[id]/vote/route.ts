import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { announceChange } from "@/lib/announce";
import { getDb } from "@/lib/db";
import { jsonError, readJson } from "@/lib/http";
import { saveVote } from "@/lib/polls";
import { allowWrite } from "@/lib/rate";
import { isToken } from "@/lib/tokens";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isToken(id)) return jsonError("This poll doesn’t exist.", 404);
  try {
    const db = await getDb();
    if (!(await allowWrite(db, request, "vote"))) {
      return jsonError("You’re saving too quickly. Try again in a few minutes.", 429);
    }
    const jar = await cookies();
    const result = await saveVote(id, jar.get("voter")?.value ?? null, await readJson(request));
    if (!result.ok) return jsonError(result.error, result.status);
    jar.set("voter", result.voterId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: `/p/${id}`,
      maxAge: 60 * 60 * 24 * 400,
    });
    await announceChange(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(JSON.stringify({ event: "vote_failed", message: error instanceof Error ? error.message : "error" }));
    return jsonError("Something went wrong while saving. Try again.", 500);
  }
}
