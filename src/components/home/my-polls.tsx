"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { forgetPoll, useMyPolls } from "@/client/my-polls";
import { appear, cn, link } from "@/components/ui/styles";

const created = (ms: number) => new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function PollsMenu() {
  const polls = useMyPolls();
  const [confirming, setConfirming] = useState<string | null>(null);

  if (polls.length === 0) return null;

  return (
    <Popover.Root>
      <Popover.Trigger className="text-sm text-muted transition-colors hover:text-foreground data-[popup-open]:text-foreground">
        Your polls
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={10} className="z-50">
          <Popover.Popup className="w-80 origin-(--transform-origin) border border-line bg-paper p-3 outline-none transition-[opacity,transform] duration-200 ease-ui data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 motion-reduce:transition-opacity motion-reduce:data-[starting-style]:scale-100 motion-reduce:data-[ending-style]:scale-100">
            <Popover.Title className="px-1 text-xs text-muted">Saved in this browser</Popover.Title>
            <ul className="mt-1 max-h-80 overflow-y-auto">
              {polls.map((poll) => (
                <li key={poll.id} className="border-t border-line px-1 py-2.5 first:border-t-0">
                  <Link href={`/o/${poll.token}`} className="block truncate text-sm hover:underline">
                    {poll.title}
                  </Link>
                  {confirming === poll.id ? (
                    <div className={cn(appear, "mt-2")}>
                      <p className="text-xs leading-5 text-muted">You’ll need the secret link to open it again.</p>
                      <div className="mt-2 flex items-center gap-4">
                        <button
                          type="button"
                          className={cn(link({ tone: "danger" }), "text-xs")}
                          onClick={() => {
                            forgetPoll({ id: poll.id });
                            setConfirming(null);
                          }}
                        >
                          Remove
                        </button>
                        <button type="button" className={cn(link(), "text-xs")} onClick={() => setConfirming(null)}>
                          Keep
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-0.5 flex items-baseline justify-between gap-3">
                      <span className="font-mono text-[11px] text-muted tabular-nums">{created(poll.createdAt)}</span>
                      <button
                        type="button"
                        className={cn(link(), "text-xs")}
                        aria-label={`Remove ${poll.title} from this browser`}
                        onClick={() => setConfirming(poll.id)}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
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
