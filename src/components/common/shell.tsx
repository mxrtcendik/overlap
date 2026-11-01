import Link from "next/link";
import { ClockToggle } from "./clock-toggle";
import { ThemeToggle } from "./theme-toggle";

function Mark() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3">
      <rect x="0" y="0" width="5" height="5" rx="1" className="fill-line-strong" />
      <rect x="7" y="0" width="5" height="5" rx="1" className="fill-line-strong" />
      <rect x="0" y="7" width="5" height="5" rx="1" className="fill-line-strong" />
      <rect x="7" y="7" width="5" height="5" rx="1" className="fill-accent" />
    </svg>
  );
}

export function Shell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`mx-auto flex min-h-dvh w-full flex-col px-4 py-10 sm:px-6 ${wide ? "max-w-5xl" : "max-w-xl"}`}>
      <header>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium tracking-tight text-foreground transition-opacity hover:opacity-70"
        >
          <Mark />
          overlap
        </Link>
      </header>
      <main className="mt-10 flex-1">{children}</main>
      <footer className="mt-20 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-muted">
        <span>No accounts. Polls are deleted 30 days after their last day.</span>
        <span className="flex items-center gap-5">
          <ThemeToggle />
          <ClockToggle />
        </span>
      </footer>
    </div>
  );
}
