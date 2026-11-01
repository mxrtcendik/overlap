export function cleanText(input: unknown, max: number): string | null {
  if (typeof input !== "string") return null;
  const text = input
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .replace(/\s+/g, " ");
  if (!text || text.length > max) return null;
  return text;
}

export function parseNote(input: unknown, max: number): { ok: true; note: string | null | undefined } | { ok: false } {
  if (input === undefined) return { ok: true, note: undefined };
  if (input === null || (typeof input === "string" && input.trim() === "")) return { ok: true, note: null };
  const note = cleanText(input, max);
  return note ? { ok: true, note } : { ok: false };
}
