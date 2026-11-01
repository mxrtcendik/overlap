import { icsFileName, toIcs } from "@/lib/calendar/export";
import { getPoll } from "@/server/polls";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const poll = await getPoll(id);
  if (!poll?.final) return new Response("This poll has no final time.", { status: 404 });

  const url = `${new URL(request.url).origin}/p/${poll.id}`;
  const start = Date.parse(poll.final.start);
  const body = toIcs({
    uid: `${poll.id}@${new URL(request.url).hostname}`,
    title: poll.title,
    start,
    end: Date.parse(poll.final.end),
    url,
    stamp: Date.now(),
    weekly: poll.kind === "weekly",
    zone: poll.zone,
  });

  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${icsFileName(poll.title)}"`,
      "cache-control": "private, no-store",
    },
  });
}
