import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isToken } from "@/lib/tokens";
import { jsonError, readJson } from "@/server/http";
import { setVoterEmail } from "@/server/polls";
import { allowWrite } from "@/server/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isToken(id)) return jsonError("This poll doesn’t exist.", 404);
  try {
    if (!(await allowWrite(request, "email"))) {
      return jsonError("That’s a few changes already. Try again in a minute.", 429);
    }
    const body = (await readJson(request)) as { email?: unknown; zone?: unknown } | null;
    const jar = await cookies();
    const result = await setVoterEmail(id, jar.get("voter")?.value ?? null, body?.email, body?.zone);
    if (!result.ok) return jsonError(result.error, result.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(JSON.stringify({ event: "notify_failed", message: error instanceof Error ? error.message : "error" }));
    return jsonError("Something went wrong while saving. Try again.", 500);
  }
}
