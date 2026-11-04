import { CreateForm } from "@/components/home/create-form";
import { Features } from "@/components/home/features";
import { HowItWorks } from "@/components/home/how-it-works";
import { Clocks } from "@/components/home/clocks";
import { Analytics } from "@/components/common/analytics";
import { SiteFooter, SiteHeader } from "@/components/common/shell";
import { button } from "@/components/ui/styles";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader nav />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 pt-16 sm:px-6 sm:pt-24">
          <section className="grid items-start gap-16 lg:grid-cols-[minmax(0,34rem)_17rem] lg:justify-between lg:gap-20">
            <div>
              <h1 className="font-display text-[2.6rem] leading-[1.02] font-medium tracking-[-0.03em] text-balance sm:text-6xl sm:leading-[0.98] lg:text-[4.25rem]">
                Find the time
                <br />
                <span className="font-normal italic">everyone</span> can make.
              </h1>
              <p className="mt-6 max-w-md text-[15px] leading-7 text-pretty text-muted">
                Pick a few days, send one link. People mark the hours that work, each in their own timezone, and the page
                names the overlap.
              </p>
              <div className="mt-8">
                <a href="#new" className={button({ variant: "accent", size: "lg" })}>
                  Create a poll
                </a>
              </div>
              <p className="mt-6 max-w-md text-sm leading-6 text-pretty text-muted">
                No account. Your timezone, and theirs. Deleted 30 days after the last day.
              </p>
            </div>
            <Clocks />
          </section>

          <section id="how" aria-labelledby="how-heading" className="mt-24 scroll-mt-20 border-t border-line pt-12 sm:mt-28">
            <h2 id="how-heading" className="font-display text-3xl font-medium tracking-[-0.02em] sm:text-4xl">
              How it works
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-pretty text-muted">
              You send one link. Everyone answers once, in their own timezone.
            </p>
            <HowItWorks />
          </section>

          <section id="features" aria-labelledby="features-heading" className="mt-24 scroll-mt-20 border-t border-line pt-12 sm:mt-28">
            <h2 id="features-heading" className="font-display text-3xl font-medium tracking-[-0.02em] sm:text-4xl">
              What it handles
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-pretty text-muted">
              The details that usually turn into another thread of messages.
            </p>
            <Features />
          </section>

          <section id="new" aria-label="New poll" className="mt-24 scroll-mt-20 border-t border-line pt-12 sm:mt-28">
            <div className="max-w-xl">
              <CreateForm />
            </div>
          </section>
        </div>
        <div className="h-24 sm:h-32" />
      </main>
      <SiteFooter />
      <Analytics />
    </div>
  );
}
