import { icsFileName, toIcs } from "@/lib/calendar";
import { getPoll } from "@/lib/polls";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const poll = await getPoll(id);
  if (!poll?.final) return new Response("This poll has no final time.", { status: 404 });

  const url = `${new URL(request.url).origin}/p/${poll.id}`;
  const start = Date.parse(poll.final.start);
  const body = toIcs({
    uid: `${poll.id}@overlap.cendik.dev`,
    title: poll.title,
    start,
    end: Date.parse(poll.final.end),
    url,
    stamp: Date.now(),
  });

  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${icsFileName(poll.title)}"`,
      "cache-control": "private, no-store",
    },
  });
}
