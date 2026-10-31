export function cleanText(input: unknown, max: number): string | null {
  if (typeof input !== "string") return null;
  const text = input
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .replace(/\s+/g, " ");
  if (!text || text.length > max) return null;
  return text;
}
