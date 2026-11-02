import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Shell } from "@/components/common/shell";
import { SegmentedDemo } from "@/components/design/segmented-demo";
import { button, card, cn, field, heading, hint, label, link, selectChrome } from "@/components/ui/styles";

export const metadata: Metadata = {
  title: "Design system",
  description: "The colours, type and components Overlap is built from.",
  robots: { index: false, follow: false },
};

const COLORS: { name: string; className: string; note: string }[] = [
  { name: "background", className: "bg-background", note: "The page" },
  { name: "paper", className: "bg-paper", note: "Cards and fields" },
  { name: "sunken", className: "bg-sunken", note: "Hover and wells" },
  { name: "line", className: "bg-line", note: "Hairlines" },
  { name: "muted", className: "bg-muted", note: "Secondary text" },
  { name: "foreground", className: "bg-foreground", note: "Ink" },
  { name: "accent", className: "bg-accent", note: "The one action" },
  { name: "danger", className: "bg-danger", note: "Destructive" },
];

const HEAT = [0, 16, 44, 72, 100];

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-10" aria-labelledby={`design-${title}`}>
      <div className="grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)]">
        <div>
          <h2 id={`design-${title}`} className={heading.section}>
            {title}
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-muted">{note}</p>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

export default function DesignPage() {
  return (
    <Shell wide>
      <h1 className={heading.page}>Design system</h1>
      <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted">
        Warm paper and ink, hairline borders, and one rust accent kept for the main action and for density on the grid.
        Everything below comes from the theme in <code className="font-mono text-[13px]">globals.css</code> and the
        shared styles in <code className="font-mono text-[13px]">components/ui</code>. Switch the theme at the bottom of
        the page to see the dark set.
      </p>

      <div className="mt-12">
        <Section title="Colour" note="Semantic names only. Each one has a light and a dark value.">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {COLORS.map((color) => (
              <li key={color.name}>
                <span className={cn("block h-14 border border-line", color.className)} />
                <p className="mt-2 font-mono text-xs">{color.name}</p>
                <p className={hint}>{color.note}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Type" note="Newsreader for answers and headings, IBM Plex Sans for the interface, Plex Mono for times.">
          <p className="font-display text-4xl leading-tight font-medium tracking-[-0.02em]">
            <em className="font-normal">Wed 2:00–4:00 PM</em> works for everyone.
          </p>
          <p className="mt-4 text-[15px] leading-7">Pick a few days, send one link. Everyone marks the hours that work.</p>
          <p className="mt-2 font-mono text-[13px] tabular-nums">09:00 · 12:30 · 18:00</p>
        </Section>

        <Section title="Buttons" note="Accent is for the single most important action on a page.">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={button({ variant: "accent" })}>
              Create a poll
            </button>
            <button type="button" className={button()}>
              Save answer
            </button>
            <button type="button" className={button({ variant: "secondary" })}>
              Close voting
            </button>
            <button type="button" className={button({ variant: "ghost" })}>
              How it works
            </button>
            <button type="button" className={button({ variant: "danger" })}>
              Delete poll
            </button>
            <button type="button" disabled className={button()}>
              Saving…
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className={button({ size: "sm" })}>
              Small
            </button>
            <button type="button" className={button({ size: "md" })}>
              Medium
            </button>
            <button type="button" className={button({ size: "lg" })}>
              Large
            </button>
          </div>
        </Section>

        <Section title="Fields" note="Labels above, hints below, nothing inside the field but the value.">
          <div className="grid max-w-md gap-5">
            <label className={label}>
              Your name
              <input className={cn(field(), "mt-1.5")} placeholder="Ada" />
            </label>
            <label className={label}>
              Meeting length
              <select className={cn(field({ size: "select" }), selectChrome, "mt-1.5")} defaultValue="60">
                <option value="">Any length</option>
                <option value="60">1 hour</option>
              </select>
              <span className={cn(hint, "mt-1.5 block font-normal")}>The best times become stretches everyone can stay for.</span>
            </label>
            <label className={label}>
              Disabled
              <input className={cn(field(), "mt-1.5")} disabled value="Days can’t change once people have answered" readOnly />
            </label>
          </div>
        </Section>

        <Section title="Links" note="Quiet by default; the underline arrives on hover.">
          <div className="flex flex-wrap items-center gap-6">
            <a href="#design-Links" className={link()}>
              Change
            </a>
            <a href="#design-Links" className={link({ tone: "accent" })}>
              Join on meet.example.com
            </a>
            <button type="button" className={link({ tone: "danger" })}>
              Remove my answer
            </button>
          </div>
        </Section>

        <Section title="Toggles" note="Base UI toggle groups: arrow keys move between options, the pressed one is filled ink.">
          <SegmentedDemo />
        </Section>

        <Section title="Grid" note="Density goes from paper to rust. Your own marks are ink; hatching means if needed.">
          <div className="flex flex-wrap items-end gap-8">
            <div>
              <p className={hint}>Fewer → more people</p>
              <div className="mt-2 flex gap-1">
                {HEAT.map((heat) => (
                  <span
                    key={heat}
                    className={cn("block h-8 w-10 rounded-[4px] border", heat ? "heat border-transparent" : "border-line bg-paper")}
                    style={{ "--heat": `${heat}%` } as React.CSSProperties}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className={hint}>Yours · if needed · best time</p>
              <div className="mt-2 flex gap-1">
                <span className="relative block h-8 w-10 rounded-[4px] border border-line bg-paper">
                  <span className="absolute inset-[3px] rounded-[2px] bg-foreground" />
                </span>
                <span className="relative block h-8 w-10 rounded-[4px] border border-line bg-paper">
                  <span className="hatch-soft absolute inset-[3px] rounded-[2px] shadow-[inset_0_0_0_1.5px_var(--foreground)]" />
                </span>
                <span
                  className="heat block h-8 w-10 rounded-[4px] shadow-[inset_0_0_0_1.5px_var(--foreground),inset_0_0_0_2.5px_var(--paper)]"
                  style={{ "--heat": "100%" } as React.CSSProperties}
                />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Surfaces" note="Cards are paper with a hairline. No shadows.">
          <div className={cn(card, "max-w-md p-5")}>
            <p className={heading.section}>Voting</p>
            <p className="mt-2 text-sm text-muted">Voting is open until the last time ends.</p>
          </div>
        </Section>
      </div>
    </Shell>
  );
}
