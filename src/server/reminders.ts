import { and, eq, gt, inArray, isNotNull, isNull, lte, ne } from "drizzle-orm";
import type { Database } from "../db";
import { polls, voters } from "../db/schema";
import { reminderEmail } from "../lib/email";
import { REMIND_BEFORE } from "../lib/poll/reminder";
import { rangeLabel } from "../lib/time/format";

type Mailer = { send: SendEmail["send"] };

/**
 * Sends the day-before reminder for every poll whose final time is less than a day away.
 * Each poll is claimed (reminded_at set) before anything is sent, so overlapping runs never send twice,
 * and a failed send is logged rather than retried: a late reminder is worse than none.
 */
export async function sendReminders(
  db: Database,
  mail: { mailer: Mailer | undefined; sender: string | undefined; origin: string | undefined },
  now = Date.now(),
): Promise<{ polls: number; sent: number; failed: number }> {
  if (!mail.mailer || !mail.sender || !mail.origin) return { polls: 0, sent: 0, failed: 0 };

  const claimed = await db
    .update(polls)
    .set({ remindedAt: now })
    .where(
      and(
        isNull(polls.remindedAt),
        isNotNull(polls.finalStart),
        gt(polls.finalStart, now),
        lte(polls.finalStart, now + REMIND_BEFORE),
        ne(polls.kind, "weekly"),
        gt(polls.deleteAt, now),
      ),
    )
    .returning({ id: polls.id, title: polls.title, start: polls.finalStart, end: polls.finalEnd, place: polls.place });
  if (claimed.length === 0) return { polls: 0, sent: 0, failed: 0 };

  const recipients = await db
    .select({ pollId: voters.pollId, email: voters.email, zone: voters.emailZone })
    .from(voters)
    .where(and(inArray(voters.pollId, claimed.map((poll) => poll.id)), isNotNull(voters.email), eq(voters.remind, true)));

  const origin = mail.origin.replace(/\/+$/, "");
  const sends = recipients.flatMap((recipient) => {
    const poll = claimed.find((candidate) => candidate.id === recipient.pollId);
    if (!poll || poll.start === null || poll.end === null || !recipient.email) return [];
    const label = rangeLabel(poll.start, poll.end, recipient.zone ?? "UTC", "h12", false);
    const message = reminderEmail({
      title: poll.title,
      day: label.day,
      time: `${label.time}${recipient.zone ? "" : " (UTC)"}`,
      pollUrl: `${origin}/p/${poll.id}`,
      place: poll.place,
    });
    return [mail.mailer!.send({ from: { name: "Overlap", email: mail.sender! }, to: recipient.email, ...message })];
  });
  const results = await Promise.allSettled(sends);
  const failed = results.filter((result) => result.status === "rejected").length;
  return { polls: claimed.length, sent: results.length - failed, failed };
}
