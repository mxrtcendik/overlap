import { NextResponse } from "next/server";

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

const MAX_BODY = 64_000;

export async function readJson(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (!/^application\/json\b/i.test(type)) return null;
  const length = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > MAX_BODY) return null;
  try {
    const text = await request.text();
    return text.length > MAX_BODY ? null : JSON.parse(text);
  } catch {
    return null;
  }
}
