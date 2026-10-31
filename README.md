Overlap is a scheduling poll. You pick a few days and a range of hours, and you get two links. The public link is where each person types a name and marks the slots they can do. The secret link is the only way to edit or delete the poll. If you lose the secret link, ownership is gone. The database keeps only a SHA-256 hash of the secret link, so a copy of the data cannot be used to edit or delete polls.

Each person sees the grid in their own timezone. The page states the overlap in one sentence. A reload shows new answers. The poll closes when the last slot has ended, and it is deleted 30 days after that.

## Run it

Install dependencies, apply the local database migrations, and start the app.

```
npm install
npx wrangler d1 migrations apply overlap --local
npm run dev
```

Open http://localhost:3000. The local database is D1, stored by Wrangler on this machine. `npm test` checks the slot rules and the overlap sentence.

To deploy, create a D1 database named overlap, put its id in `wrangler.jsonc`, apply the migrations with `--remote`, and run `npm run deploy`.

The Worker entry point is `worker.ts`. It serves the Next.js app that OpenNext builds and adds an hourly Cron Trigger that deletes expired polls and old rate-limit counters. Deleting a poll removes its answers through foreign keys.

## Caps

The title can be 80 characters. A poll can cover 14 days, and the hours on those days can span at most 12 hours. Slots are 30 minutes. A name can be 40 characters. A poll can have 40 names.

The days and hours can change until the first answer. The title can change until the poll is deleted. Voting stops when the last slot ends. The grid stays visible and becomes read-only. The poll is deleted 30 days after that.

Writes are rate limited per network: 30 new polls per hour, 120 vote saves per 10 minutes, and 60 owner saves per 10 minutes.
