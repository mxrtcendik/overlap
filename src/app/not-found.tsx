import Link from "next/link";
import { Shell } from "@/components/shell";

export default function NotFound() {
  return (
    <Shell>
      <h1 className="text-[1.75rem] leading-9 tracking-[-0.02em] text-balance">This poll does not exist.</h1>
      <p className="mt-4 text-muted">It may have been deleted, or it expired 30 days after its last slot.</p>
      <Link href="/" className="btn mt-8">
        Make a new poll
      </Link>
    </Shell>
  );
}
