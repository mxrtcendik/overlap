# overlap

Find the time everyone can make. Pick a few days, send one link, and see which time works, in everyone's own timezone.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/answer-dark.gif">
  <img alt="A visitor types their name, drags down Thursday on a poll's grid and saves; the best times update" src="docs/screenshots/answer-light.gif">
</picture>

Overlap is a small scheduling poll. You choose some days and a window of hours, share the link, and everyone drags across the times they can make. The page then tells you the answer in one sentence, like *"Tue 11:30 AM–1:00 PM works for everyone"*, shown in each person's own timezone.

There are no accounts. Creating a poll gives you two links: a public one to share, and a secret one that's the only way to edit or delete the poll. You can email both to yourself; the address is used once and never stored.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/home-dark.png">
  <img alt="The landing page: “Find the time everyone can make”, with one hour shown on six city clocks" src="docs/screenshots/home-light.png">
</picture>

## What it does

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/poll-dark.png">
  <img alt="A poll with four answers, the overlap sentence, and who is free at the hovered time" src="docs/screenshots/poll-light.png">
</picture>

- **Timezones done properly.** Everyone sees the grid in their own zone, with their own 12- or 24-hour clock and first day of the week. If you're planning from another city, you can switch the zone next to the times.
- **Fair to every timezone.** Each answer remembers the voter's device timezone. When times are otherwise tied, the one that falls between 08:00 and 21:00 for the most people wins, and the answer says who it's early or late for: *"Wed 3:00–4:00 PM works for everyone, though it's 11:00 PM for Aiko."* Anyone who can see the poll can work out that hour, so the form says the timezone is saved.
- **"If needed" answers.** Mark a time as one you can make, or one you'd rather not but could. The best time is the one most people can make, and among those, the one the fewest only "could".
- **Fill in from your calendar.** Pick an `.ics` export from Google Calendar, Outlook or Apple Calendar and every time it leaves free gets marked. The file is read in the browser and never uploaded.
- **Meeting length.** Say the meeting takes 90 minutes, and the best times are stretches everyone can stay for the whole of it.
- **People who must be there.** The owner can mark someone as required, and the best times only include stretches when they're free.
- **Notes.** A short line next to your name, like "Remote only".
- **Export.** The owner can download every answer as a CSV, with times in their own timezone.
- **Email, only if you ask.** The owner can be told about new answers, and anyone who answered can get the final time with a calendar file attached. Addresses are deleted with the poll, and the owner never sees voters' addresses.
- **Weekly polls.** Ask about days of the week instead of dates when something repeats. The answer then reads "Mondays 6:00–7:00 PM".
- **Set times.** Instead of a grid, offer a few specific times, like "Thursday 7–9 PM", and everyone answers yes, if needed or no to each.
- **A final time.** The owner picks one of the best times, or drags any stretch on the grid. Everyone can add it to their calendar, and re-importing after a change updates the event instead of duplicating it.
- **Live.** New answers and the owner's changes show up on every open page without a reload. The page also says how many other people have it open, and when someone is marking times right now.
- **Deadlines.** The owner can close voting, set a deadline, or reopen it. An open page goes read-only the moment voting closes.
- **Small conveniences.** A QR code for sharing the public link in person, a one-click copy of a poll for a later week, and a light or dark theme that can override the system.
- **Link previews.** Pasting a poll link in a chat shows the title, how many people answered and a small heatmap. Poll pages are never indexed.

Polls delete themselves 30 days after their last time, or three months after a weekly poll was made.

## How it works

```mermaid
flowchart LR
  browser([Browser])
  worker["Cloudflare Worker<br/>Next.js through OpenNext"]
  d1[("D1<br/>polls · voters · marks")]
  room["PollRoom<br/>Durable Object, one per poll"]
  turnstile["Turnstile"]
  cron(["Hourly cron"])

  browser -- "pages, votes" --> worker
  worker -- "Drizzle" --> d1
  worker -- "after each write" --> room
  room -. "“changed” over WebSocket" .-> browser
  worker -- "verify token on create" --> turnstile
  cron -- "delete expired polls" --> worker
```

The whole app runs on a single Cloudflare Worker. A few decisions I'd point out:

- **The secret link is never stored.** The database keeps a SHA-256 hash of it, so a copy of the data can't be used to edit or delete anything. Voters are identified by a cookie, and the owner page refers to answers by a hash of that cookie, never the cookie itself.
- **Live updates carry no data.** After a write, the poll's Durable Object tells open pages "changed", and each page re-renders on the server for its own viewer. Presence works the same way: the room counts its own sockets and relays a bare "editing" signal, throttled per socket, so no names or answers pass through it. Sockets use the hibernation API, so an idle poll costs nothing. If a socket drops, the page checks every 20 seconds until it reconnects.
- **Typed queries with Drizzle.** The schema lives in `src/db/schema.ts`. A poll loads with its voters and their marks in one query, and a vote is saved as one D1 batch, so it's all or nothing. Marks go in through `json_each`, because D1 allows only 100 bound values per statement and a poll can have hundreds of slots.
- **Weekly polls reuse everything.** Their times are stored as one real reference week, so the grid, the ranking and timezone conversion work exactly as for dates. Only the labels change. The poll also remembers its own timezone, so pages show this week's real times and calendar events keep their local time across daylight-saving changes.
- **Abuse protection without accounts.** Creating a poll and answering one for the first time are checked with Turnstile, which stays invisible unless it needs a click and only loads once its form is on screen. Later edits are tied to the voter's cookie, so they skip the check. Writes are rate limited per network with Cloudflare's rate limiter, keyed by a hash of the address.
- **Locked down by default.** Every response has a Content Security Policy, HSTS and anti-framing headers.

Built with Next.js 16, React 19, Tailwind CSS 4, TypeScript 7, Drizzle ORM, Cloudflare Workers, D1, Durable Objects and Turnstile. Styling is Tailwind utilities only: shared variants live in `src/components/ui/styles.ts` (class-variance-authority), and toggles use Base UI for keyboard and pressed-state handling. Bun runs the installs and the tests.

## Project layout

```
src/
  app/          routes, API handlers and preview images
  components/
    home/       the landing page and the create form
    poll/       the poll page and the owner page
    common/     the site shell and pieces both use
    ui/         shared styles (buttons, fields, links, cards) and the segmented toggle
  server/       runs only on the Worker: queries, rate limits, Turnstile, the live room
  client/       runs only in the browser: hooks, local storage, requests
  lib/          plain logic shared by both, covered by the unit tests
  db/           Drizzle schema
migrations/     SQL migrations, applied by Wrangler
tests/          unit tests (bun test)
e2e/            browser tests (Playwright)
worker.ts       the Worker entry: app, WebSockets and the hourly purge
```

## Running it locally

You'll need [Bun](https://bun.sh).

```sh
bun install
cp .dev.vars.example .dev.vars
bun run db:migrate
bun run dev
```

Then open http://localhost:3000. The database is a local D1 that Wrangler keeps on your machine. `.dev.vars` holds Cloudflare's public Turnstile test key. The server accepts it in development, or when `TURNSTILE_ALLOW_TEST_KEYS=true`, which only `.dev.vars` sets so the local Worker build can be tested. Production never reads that file.

`next dev` can't run Durable Objects, so in dev mode open pages poll for changes every 20 seconds instead. To get the real thing, run `bun run preview`, which builds the Worker and runs it in workerd, the same runtime as production.

| Command | What it does |
| --- | --- |
| `bun run check` | Typecheck, lint and unit tests |
| `bun run test` | Unit tests only |
| `bun run test:e2e` | Browser tests with Playwright, including axe accessibility scans in light and dark mode |
| `bun run test:worker` | Builds the real Worker and checks live updates over WebSockets |
| `bun run db:generate` | Write a migration after changing `src/db/schema.ts` |
| `bun run db:migrate` | Apply migrations to the local database |
| `bun run preview` | Build the Worker and run it locally |

GitHub Actions runs the checks, both builds and the browser tests on every push.

## Deploying

Deployment settings live in two places, so nothing about a particular deployment is hardcoded:

- **Build time**, in `.env.production.local` (copy `.env.example`; it is ignored by git): `SITE_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and, optionally, `NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN`. Without a site key the build falls back to Cloudflare's test key, which the production server refuses, and the build warns about it.
- **Run time**, in `wrangler.jsonc`: the D1 database, `TURNSTILE_HOSTNAMES`, `EMAIL_FROM` and the email binding's allowed sender. The only secret is `TURNSTILE_SECRET`.

Then:

1. Create a D1 database called `overlap` and put its id in `wrangler.jsonc`.
2. Apply the migrations: `bunx wrangler d1 migrations apply overlap --remote`.
3. Store the Turnstile secret: `bunx wrangler secret put TURNSTILE_SECRET`.
4. For link emails, set up Cloudflare Email Sending for your domain and make `EMAIL_FROM` one of its addresses. Without it the email form stays hidden.
5. `bun run deploy`.

Web Analytics is cookieless and only runs on the home page and public poll pages, never on secret links.

## Limits

| | |
| --- | --- |
| Days per poll | 14, or one week for weekly polls |
| Hours per day | up to 12, in 30-minute slots |
| People per poll | 40 |
| Title / name / note | 80 / 40 / 80 characters |
| New polls | 5 a minute per network |
| Link emails | 3 a minute per network |
| Saved answers | 60 a minute per network |

The days and hours can change while nobody has answered yet. People can remove their own answer until voting ends, and the owner can remove any answer at any time.

## How I built this

Overlap was built with help from Claude Code, an AI coding agent. These are my contributions:

- The idea and its limits: no accounts, one public link and one secret link, nothing to install.
- The design: warm paper and ink, hairline borders, Newsreader italics for the answers, and a single rust accent kept for the one action and for density on the grid. I designed the current look by hand after trying and rejecting a few generated directions.
- The stack choices: Bun, Drizzle instead of hand-written SQL, Turnstile and Cloudflare's rate limiter.
- Which features to build and in what order, and the name and domain.

The parts I found most interesting were the ones where a constraint shaped the design: D1's limit on bound values deciding how answers are inserted, Durable Objects that only ever say "changed", and weekly polls stored as a real week so nothing else had to change.

## License

MIT
