Overlap is a scheduling poll. You pick a few days and a range of hours, and you get two links. The public link is where each person types a name and marks the slots they can do. The secret link is the only way to edit or delete the poll. If you lose the secret link, ownership is gone. The database keeps only a SHA-256 hash of the secret link, so a copy of the data cannot be used to edit or delete polls.

Creating a poll takes you straight to its secret link, with the public link ready to copy, so a reload or a closed tab cannot lose it. Polls you create or open as owner are also remembered in your browser and listed on the home page. That list never leaves the device.

Each person sees the grid in their own timezone, with a 12- or 24-hour clock and a first day of the week that follow their browser, and a switch in the footer to change the clock. The timezone can be changed next to the times, for example when planning from another city; the choice is kept in the browser and also sets the zone a new poll’s hours are entered in. The offset shown is the one the poll’s own days have, so a poll after a daylight-saving change says GMT-5, not today’s GMT-4. Each time can be marked as one you can make, or one you can make only if needed. The best time is the one the most people can make, and among those, the one the fewest can make only if needed. The page states the overlap in one sentence, such as “Mon 10:00–11:00 AM works for everyone, 2 if needed.” New answers and the owner’s changes appear on every open page without a reload. The poll closes when the last slot has ended, and it is deleted 30 days after that.

On the secret link, the owner can settle on a final time, either one of the best times or any unbroken stretch dragged on the grid. Everyone with the public link then sees it in their own timezone and can add it to a calendar, as an `.ics` file or through Google Calendar. The `.ics` file keeps one event ID per poll, so importing it again after the time changes updates the event instead of adding a second one.

Pasting a public link in a chat shows a preview with the title, how many people answered and a small heatmap of the poll. The preview has no clock times, because it is drawn without knowing the reader's timezone. Poll pages are never indexed by search engines.

## Run it

Install dependencies, apply the local database migrations, and start the app.

```
bun install
bun run db:migrate
bun run dev
```

Open http://localhost:3000. The local database is D1, stored by Wrangler on this machine. `bun run test` checks the slot rules, the overlap sentence, the best-time ranking, the final time, the calendar export and the date and time formatting.

`bun run preview` builds the Worker and runs it locally in workerd, the same runtime as production.

Live updates need a Durable Object, which `next dev` can’t run, so under `bun run dev` open pages check for changes every 20 seconds instead. `bun run preview` has the real thing.

## Database

The schema lives in `src/db/schema.ts` as Drizzle tables, and every query is built with Drizzle, so rows are typed from the schema down to the page. A poll is loaded with its voters and their marks in one statement. Writes that must happen together, such as replacing someone’s answer, run as a D1 batch, which is one transaction.

To change the schema, edit `schema.ts`, run `bun run db:generate` to write the SQL migration into `migrations/`, and apply it with `bun run db:migrate`. Migrations 0001 to 0003 predate Drizzle and were written by hand; `migrations/meta` holds Drizzle’s snapshot of the schema they produce.

## Deploy

Create a D1 database named overlap, put its id in `wrangler.jsonc`, apply the migrations with `--remote`, and run `bun run deploy`. The site lives at https://overlap.cendik.dev, which production builds use for the home page's absolute preview URLs; set `SITE_URL` when building to use another address. Poll pages use the address of each request instead.

Poll creation is checked with Cloudflare Turnstile. Store the widget's secret with `wrangler secret put TURNSTILE_SECRET`, `TURNSTILE_HOSTNAMES` in `wrangler.jsonc` lists the hostnames tokens may come from, comma-separated and without localhost. The site key is in `src/lib/use-turnstile.ts`. Locally, `.dev.vars` holds Cloudflare's public test secret, which the server accepts only in development; copy `.dev.vars.example` to start.

The Worker entry point is `worker.ts`. It serves the Next.js app that OpenNext builds and adds an hourly Cron Trigger that deletes expired polls. Deleting a poll removes its answers through foreign keys.

Each poll has a Durable Object, `PollRoom`, that holds the WebSockets of the pages open on it. After a vote or an owner edit is saved, the route tells the room, and the room sends each page a message that only says “changed”. The page then renders again on the server, so the room never holds poll data and each person still gets their own view. Sockets use the hibernation API, and keepalive pings are answered without waking the object, so an idle poll costs nothing. `worker.ts` accepts a socket only from the site’s own origin and only for a poll that exists. While a socket is down, a visible page checks every 20 seconds and reconnects with backoff. The first deploy creates the Durable Object class from the migration in `wrangler.jsonc`.

Every response carries a Content Security Policy, HSTS in production, and headers that stop the site from being framed or sniffed. Poll routes add `X-Robots-Tag: noindex`.

The Turnstile widget stays invisible unless Cloudflare needs a click to tell a person from a bot, and its script loads only once the create form is on screen, so reading the landing page never contacts Cloudflare. The server checks each token once, for the poll-creation action and the site's own hostname, and refuses anything less, including a failed call to Cloudflare.

## Caps

The title can be 80 characters. A poll can cover 14 days, and the hours on those days can span at most 12 hours. Slots are 30 minutes. A name can be 40 characters. A poll can have 40 names. At least one slot must still be ahead when the poll is created or its days change.

People can remove their own answer until voting ends. The owner can remove any answer at any time; the owner page names answers by a hash of the voter id, because the id itself is the voter’s cookie. The days and hours can change while the poll has no answers. Changing them clears the final time. The title can change until the poll is deleted. Voting stops when the last slot ends. The grid stays visible and becomes read-only. The poll is deleted 30 days after that.

Writes are rate limited per network with Cloudflare's Rate Limiting binding: 5 new polls, 60 vote saves and 30 owner saves a minute. The counters live in Cloudflare, not the database, and are keyed by a hash of the address.
