import { connection } from "next/server";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PollView } from "@/components/poll/poll-view";
import { Analytics } from "@/components/common/analytics";
import { Shell } from "@/components/common/shell";
import { pollDescription, requestOrigin } from "@/server/poll-meta";
import { getPoll, toPollView } from "@/server/polls";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const poll = await getPoll(id);
  const robots = { index: false, follow: false };
  if (!poll) return { title: "Poll not found", robots };
  const description = pollDescription(poll);
  return {
    metadataBase: await requestOrigin(),
    title: poll.title,
    description,
    robots,
    openGraph: { type: "website", siteName: "Overlap", title: poll.title, description, url: `/p/${poll.id}` },
    twitter: { card: "summary_large_image", title: poll.title, description },
  };
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
      <Analytics />
    </Shell>
  );
}
