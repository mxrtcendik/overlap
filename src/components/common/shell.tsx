import Link from "next/link";
import { PollsMenu } from "@/components/home/my-polls";
import { cn } from "@/components/ui/styles";
import { ClockToggle } from "./clock-toggle";
import { ThemeToggle } from "./theme-toggle";

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className={cn("size-3.5", className)}>
      <rect x="0" y="0" width="5" height="5" className="fill-foreground" />
      <rect x="7" y="0" width="5" height="5" className="fill-foreground" />
      <rect x="0" y="7" width="5" height="5" className="fill-foreground" />
      <rect x="7" y="7" width="5" height="5" className="fill-accent" />
    </svg>
  );
}

export function SiteHeader({ nav = false }: { nav?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2.5 text-[15px] tracking-tight">
          <Mark />
          <span className="font-medium">overlap</span>
        </Link>
        {nav ? (
          <Link href="/#how" className="hidden text-sm text-muted transition-colors hover:text-foreground sm:inline">
            How it works
          </Link>
        ) : null}
        <div className="ml-auto flex items-center gap-5">
          <PollsMenu />
          <Link href="/#new" className="text-sm transition-colors hover:text-muted">
            Create a poll
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs text-muted">No accounts. Polls are deleted 30 days after the last day.</p>
        <div className="flex flex-wrap items-center gap-3">
          <ThemeToggle />
          <ClockToggle />
        </div>
      </div>
    </footer>
  );
}

export function Shell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className={cn("mx-auto w-full flex-1 px-4 pt-10 pb-24 sm:px-6 sm:pt-14", wide ? "max-w-5xl" : "max-w-xl")}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
