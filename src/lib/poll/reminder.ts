/** How long before the final time the reminder goes out. The cron runs hourly, so it lands 23–24 hours ahead. */
export const REMIND_BEFORE = 24 * 60 * 60 * 1000;

/**
 * What `reminded_at` should be right after the owner sets or clears the final time.
 * A final time less than a day away needs no reminder: the final-time email has just gone out.
 */
export function remindedAtFor(final: { start: number } | null, now: number): number | null {
  if (!final) return null;
  return final.start - now <= REMIND_BEFORE ? now : null;
}
