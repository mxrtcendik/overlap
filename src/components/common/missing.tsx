import Link from "next/link";
import { Shell } from "./shell";
import { button, cn, heading } from "@/components/ui/styles";

function EmptyMark() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className="size-9">
      <rect x="0" y="0" width="5" height="5" className="fill-line-strong" />
      <rect x="7" y="0" width="5" height="5" className="fill-line-strong" />
      <rect x="0" y="7" width="5" height="5" className="fill-line-strong" />
      <rect
        x="7.25"
        y="7.25"
        width="4.5"
        height="4.5"
        className="fill-none stroke-line-strong"
        strokeWidth="0.5"
        strokeDasharray="1 0.75"
      />
    </svg>
  );
}

export function Missing({
  title,
  children,
  action = { href: "/", label: "Go to the home page" },
}: {
  title: string;
  children: React.ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <Shell>
      <EmptyMark />
      <p className="mt-8 font-mono text-xs text-muted tabular-nums">404</p>
      <h1 className={cn(heading.page, "mt-3")}>{title}</h1>
      <div className="mt-4 max-w-md space-y-3 text-muted">{children}</div>
      <Link href={action.href} className={cn(button(), "mt-8")}>
        {action.label}
      </Link>
    </Shell>
  );
}
