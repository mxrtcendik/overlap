export const REMIND_BEFORE = 24 * 60 * 60 * 1000;

export function remindedAtFor(final: { start: number } | null, now: number): number | null {
  if (!final) return null;
  return final.start - now <= REMIND_BEFORE ? now : null;
}
