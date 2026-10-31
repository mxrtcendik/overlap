import { connection } from "next/server";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PollView } from "@/components/poll-view";
import { Shell } from "@/components/shell";
import { getPoll, toPollView } from "@/lib/polls";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const poll = await getPoll(id);
  if (!poll) return { title: "overlap" };
  return { title: poll.title };
}

export default async function PublicPollPage({ params }: Params) {
  await connection();
  const { id } = await params;
  const poll = await getPoll(id);
  if (!poll) notFound();
  const jar = await cookies();
  return (
    <Shell wide>
      <PollView poll={toPollView(poll, jar.get("voter")?.value ?? null)} />
    </Shell>
  );
}
