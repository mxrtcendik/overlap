import { connection } from "next/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OwnerView } from "@/components/owner-view";
import { Shell } from "@/components/shell";
import { getPollByOwnerToken, toPollView } from "@/lib/polls";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token } = await params;
  const poll = await getPollByOwnerToken(token);
  return {
    title: poll?.title ?? "overlap",
    referrer: "no-referrer",
  };
}

export default async function OwnerPage({ params }: Params) {
  await connection();
  const { token } = await params;
  const poll = await getPollByOwnerToken(token);
  if (!poll) notFound();
  return (
    <Shell wide>
      <OwnerView poll={toPollView(poll, null)} hasResponses={poll.voters.length > 0} />
    </Shell>
  );
}
