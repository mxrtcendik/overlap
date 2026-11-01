import { slotsIn } from "@/lib/poll/availability";
import { SLOT_MS } from "@/lib/constants";
import { ogImage, OG_SIZE, type OgCell } from "@/server/og-image";
import { getPoll } from "@/server/polls";
import { pollDescription } from "@/server/poll-meta";
import { bestTime, tallySlots } from "@/lib/poll/sentence";

export const alt = "An Overlap poll with a grid of who is free when.";
export const size = OG_SIZE;
export const contentType = "image/png";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function Image({ params }: Params) {
  const { id } = await params;
  const poll = await getPoll(id);
  if (!poll) {
    return ogImage({ title: "This poll doesn’t exist", line: "It may have been deleted or expired.", columns: [], people: 0 });
  }

  const tallies = tallySlots(poll.slots, poll.voters);
  const outlined = new Set<string>();
  if (poll.final) {
    for (const slot of slotsIn(poll.slots, Date.parse(poll.final.start), Date.parse(poll.final.end))) outlined.add(slot);
  } else if (poll.voters.length > 1) {
    const run = bestTime(poll.slots, poll.voters);
    if (run) for (const slot of slotsIn(poll.slots, run.start, run.end)) outlined.add(slot);
  }

  const columns: OgCell[][] = [];
  let previous = -Infinity;
  for (const slot of [...poll.slots].sort()) {
    const time = Date.parse(slot);
    if (time - previous !== SLOT_MS) columns.push([]);
    const tally = tallies.get(slot) ?? { yes: 0, maybe: 0 };
    columns[columns.length - 1].push({ count: tally.yes + tally.maybe / 2, outlined: outlined.has(slot) });
    previous = time;
  }

  return ogImage({ title: poll.title, line: pollDescription(poll), columns, people: poll.voters.length });
}
