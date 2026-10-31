"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { forgetPoll, useMyPolls } from "@/lib/my-polls";

const created = (ms: number) => new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function MyPolls() {
  const polls = useMyPolls();
  const [confirming, setConfirming] = useState<string | null>(null);

  if (polls.length === 0) return null;

  return (
    <section aria-labelledby="my-polls-heading" className="mt-24 border-t border-line pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="my-polls-heading" className="text-sm text-muted">
          Your polls
        </h2>
        <p className="text-xs text-muted">Saved in this browser only.</p>
      </div>
      <ul className="mt-6 border-t border-line">
        {polls.map((poll) => (
          <li
            key={poll.id}
            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line py-3"
          >
            <Link
              href={`/o/${poll.token}`}
              className="min-w-0 truncate underline decoration-transparent underline-offset-4 transition-colors hover:decoration-line-strong"
            >
              {poll.title}
            </Link>
            {confirming === poll.id ? (
              <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-muted">
                <span>You’ll need the secret link to open it again.</span>
                <button
                  type="button"
                  className="link-quiet link-danger text-xs"
                  onClick={() => {
                    forgetPoll({ id: poll.id });
                    setConfirming(null);
                  }}
                >
                  Remove
                </button>
                <button type="button" className="link-quiet text-xs" onClick={() => setConfirming(null)}>
                  Keep
                </button>
              </span>
            ) : (
              <span className="flex items-baseline gap-5 text-xs text-muted">
                <span className="tabular-nums">Created {created(poll.createdAt)}</span>
                <button
                  type="button"
                  className="link-quiet text-xs"
                  aria-label={`Remove ${poll.title} from this browser`}
                  onClick={() => setConfirming(poll.id)}
                >
                  Remove
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ForgetMissingPoll() {
  useEffect(() => {
    const [, kind, key] = window.location.pathname.split("/");
    if (kind === "o" && key) forgetPoll({ token: key });
    if (kind === "p" && key) forgetPoll({ id: key });
  }, []);
  return null;
}
