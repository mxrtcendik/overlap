import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError, readJson } from "@/lib/http";
import { saveVote } from "@/lib/polls";
import { allowWrite } from "@/lib/rate";
import { isToken } from "@/lib/tokens";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isToken(id)) return jsonError("This poll does not exist.", 404);
  try {
    const db = await getDb();
    if (!(await allowWrite(db, request, "vote"))) {
      return jsonError("Too many saves. Wait a little and try again.", 429);
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
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(JSON.stringify({ event: "vote_failed", message: error instanceof Error ? error.message : "error" }));
    return jsonError("Could not save. Try again.", 500);
  }
}
