import Link from "next/link";
import { ForgetMissingPoll } from "@/components/my-polls";
import { Shell } from "@/components/shell";

export default function NotFound() {
  return (
    <Shell>
      <ForgetMissingPoll />
      <h1 className="text-[1.75rem] leading-9 tracking-[-0.02em] text-balance">This poll doesn’t exist.</h1>
      <p className="mt-4 text-muted">It may have been deleted, or it expired 30 days after its last day.</p>
      <Link href="/" className="btn mt-8">
        Create a poll
      </Link>
    </Shell>
  );
}
