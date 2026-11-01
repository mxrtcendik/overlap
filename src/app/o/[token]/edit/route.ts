import { NextResponse } from "next/server";
import { announceChange } from "@/server/announce";
import { jsonError, readJson } from "@/server/http";
import {
  deleteOwned,
  updateDeadline,
  updateDuration,
  updateFinal,
  updateNotify,
  updateSlots,
  updateTitle,
  type StoredPoll,
} from "@/server/polls";
import { sendLater } from "@/server/mail";
import { finalTimeEmail } from "@/lib/email";
import { icsFileName, toIcs } from "@/lib/calendar/export";
import { rangeLabel } from "@/lib/time/format";
import { allowWrite } from "@/server/rate-limit";
import { isToken } from "@/lib/tokens";

type Params = { params: Promise<{ token: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { token } = await params;
  if (!isToken(token)) return jsonError("This poll doesn’t exist.", 404);
  try {
    if (!(await allowWrite(request, "owner"))) {
      return jsonError("You’re saving too quickly. Try again in a minute.", 429);
    }
    const body = await readJson(request);
    if (!body || typeof body !== "object") return jsonError("That change couldn’t be saved.", 400);
    const record = body as {
      title?: unknown;
      slots?: unknown;
      zone?: unknown;
      final?: unknown;
      deadline?: unknown;
      duration?: unknown;
      notify?: unknown;
    };
    if ("notify" in record) {
      const result = await updateNotify(token, record.notify);
      if (!result.ok) return jsonError(result.error, result.status);
      return NextResponse.json({ ok: true });
    }
    if ("duration" in record) {
      const result = await updateDuration(token, record.duration);
      if (!result.ok) return jsonError(result.error, result.status);
      await announceChange(result.id);
      return NextResponse.json({ ok: true });
    }
    if ("deadline" in record) {
      const result = await updateDeadline(token, record.deadline);
      if (!result.ok) return jsonError(result.error, result.status);
      await announceChange(result.id);
      return NextResponse.json({ ok: true });
    }
    if ("final" in record) {
      const result = await updateFinal(token, record.final);
      if (!result.ok) return jsonError(result.error, result.status);
      await announceChange(result.id);
      if (result.final) await emailFinalTime(request, result.poll, result.final);
      return NextResponse.json({ ok: true });
    }
    if ("slots" in record) {
      const result = await updateSlots(token, record.slots, record.zone);
      if (!result.ok) return jsonError(result.error, result.status);
      await announceChange(result.id);
      return NextResponse.json({ ok: true });
    }
    if ("title" in record) {
      const result = await updateTitle(token, record.title);
      if (!result.ok) return jsonError(result.error, result.status);
      await announceChange(result.id);
      return NextResponse.json({ ok: true });
    }
    return jsonError("That change couldn’t be saved.", 400);
  } catch (error) {
    console.error(JSON.stringify({ event: "owner_update_failed", message: error instanceof Error ? error.message : "error" }));
    return jsonError("Something went wrong while saving. Try again.", 500);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { token } = await params;
  if (!isToken(token)) return jsonError("This poll doesn’t exist.", 404);
  try {
    if (!(await allowWrite(request, "owner"))) {
      return jsonError("You’re saving too quickly. Try again in a minute.", 429);
    }
    const result = await deleteOwned(token);
    if (!result.ok) return jsonError(result.error, result.status);
    await announceChange(result.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(JSON.stringify({ event: "owner_delete_failed", message: error instanceof Error ? error.message : "error" }));
    return jsonError("Something went wrong while deleting the poll. Try again.", 500);
  }
}

async function emailFinalTime(
  request: Request,
  poll: StoredPoll,
  final: { start: number; end: number },
) {
  const url = new URL(request.url);
  const pollUrl = `${url.origin}/p/${poll.id}`;
  const weekly = poll.kind === "weekly";
  const ics = toIcs({
    uid: `${poll.id}@${url.hostname}`,
    title: poll.title,
    start: final.start,
    end: final.end,
    url: pollUrl,
    stamp: Date.now(),
    weekly,
    zone: poll.zone,
  });
  const messages = poll.voters
    .filter((voter) => voter.email)
    .map((voter) => {
      const label = rangeLabel(final.start, final.end, voter.emailZone ?? "UTC", "h12", weekly);
      const zoneNote = voter.emailZone ? "" : " (UTC)";
      return {
        to: voter.email!,
        ...finalTimeEmail({ title: poll.title, day: label.day, time: `${label.time}${zoneNote}`, pollUrl }),
        attachments: [{ filename: icsFileName(poll.title), type: "text/calendar", content: ics }],
      };
    });
  await sendLater(messages, "final_time_emailed");
}
