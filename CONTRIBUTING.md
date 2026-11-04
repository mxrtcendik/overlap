# Contributing

Thanks for taking a look. Bug reports, fixes and small improvements are all welcome.

For anything bigger than a bug fix, please open an issue first so we can agree on the idea before you spend time on it. Overlap tries to stay small: no accounts, one public link, one secret link.

## Setup

You'll need [Bun](https://bun.sh).

```sh
git clone https://github.com/mxrtcendik/overlap.git
cd overlap
bun install
cp .dev.vars.example .dev.vars
bun run db:migrate
bun run dev
```

The README explains the rest: how the Worker, D1 and the live room fit together, and what each script does.

## Before you open a pull request

- `bun run check` passes (typecheck, lint, unit tests).
- `bun run test:e2e` passes if you touched the UI. Run `bunx playwright install chromium` once first.
- If you changed `src/db/schema.ts`, add a migration with `bun run db:generate` and commit it.
- If you changed how something looks on purpose, update the screenshot baselines with `bunx playwright test e2e/visual.spec.ts --update-snapshots`. CI keeps its own Linux set, which I'll regenerate after merging.
- Keep pull requests to one change, with a short commit message that says what it does.

## Code style

- Tailwind utilities only. Shared variants go in `src/components/ui/styles.ts`.
- Code in `src/server` runs only on the Worker, `src/client` only in the browser, and `src/lib` is plain logic that both can use. New logic in `src/lib` should come with a unit test in `tests/`.
- Copy is short and plain: "Can make", not "Available ✓".

## Reporting a security issue

Please don't open a public issue. See [SECURITY.md](SECURITY.md).
