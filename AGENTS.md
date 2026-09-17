# AGENTS.md

Guidance for coding agents working in this repository.

## Commands

The Make targets are exactly what CI runs (`.github/workflows/test.yml`), so
prefer them:

```bash
make install          # npm clean-install --prefer-offline --cache .npm
make eslint           # lint
make format           # prettier --write .
make test             # build, then run the test suite
make validate-package # npm pack and assert the tarball contents
```

Running the CLI locally — the `--` separator is required to pass flags through
npm:

```bash
npm run dev -- --help    # tsx, straight from TypeScript
npm start -- --help      # from dist/, needs a build first
```

Single test file / single test case:

```bash
npm run build && node --test tests/query.test.js
npm run build && node --test --test-name-pattern "<name>" tests/query.test.js
```

## Architecture

ESM throughout (`"type": "module"`), TypeScript compiled to `dist/` with
`NodeNext` resolution — relative imports must carry the `.js` extension.

`src/cli.ts` is the Commander entry point and the `bin` target. It delegates to
a command module in `src/commands/`, which calls `ensureApiKey` (reads
`src/config.ts`, falls through to `src/auth.ts` when no key is stored), then
`search()` in `src/api.ts`, then renders through `formatResultsText` or
`simplifyOffer` in `src/commands/search.ts`. `src/query.ts` is pure and
I/O-free, which is why it carries most of the test coverage.

Results go to stdout; `--explain` and every warning go to stderr, so `--json`
output stays pipeable.

## Constraints

These are the things that are easy to break without noticing.

- **Tests run against `dist/`.** `tests/*.test.js` import `../dist/*.js`, so a
  stale build silently tests old code. `npm test` runs `npm run build` first for
  exactly this reason — never invoke bare `node --test`.
- **release-please owns the version.** `src/cli.ts` carries
  `.version('0.1.0') // x-release-please-version`; the trailing comment is
  load-bearing and matches `extra-files` in `release-please-config.json`. Never
  hand-edit the version in `package.json`, `src/cli.ts`, or
  `.release-please-manifest.json`.
- **Country validation is a security guard.** The country code is interpolated
  into a hostname, so `getApiBase()` and `extractApiKey()` hard-validate against
  `VALID_COUNTRIES` before building a URL. Do not relax this. Only `at` and `de`
  exist.
- **API keys are country-scoped.** `set-country` deliberately clears `apiKey`
  when the country actually changes, and `search` auto-logs-in using the
  configured country.
- **`login` is scraping, not an account login.** It fetches the public site,
  regex-scans the HTML and boot scripts for an embedded key, and brute-force
  validates candidates against the live search endpoint. It makes real network
  requests, cannot be unit-tested offline, and breaks whenever Marktguru ships a
  new frontend bundle.
- **The key is stored in plaintext** at `~/.marktguru/config.json`. The `config`
  and `login` output truncates it — preserve that.
- **`--retailer` filters client-side** on `advertisers[].name`, which is why
  `runSearch` over-fetches 100 results and rewrites `totalResults` to the
  post-filter count.
- **Two different default limits:** 10 in `src/commands/search.ts`, 20 in the
  `search()` fallback in `src/api.ts`.
- **ESLint covers only `src/` TypeScript** via the `tsconfig-lint.json` project.
  The JS tests are not linted, and a new `.ts` file outside `src/` makes
  type-aware linting fail.
- **Exact dependency versions only** — no `^` or `~`.
- **`make validate-package` asserts a hardcoded file list.** Extend it when a
  new shipped entrypoint is added. It currently omits `dist/commands/*.js` even
  though those ship.

## Release flow

PRs are squash-merged, so the **PR title must be a Conventional Commit** — it
becomes the changelog entry, and `pr-conventional-title.yml` enforces it.
Renovate forces `chore:` for dependency bumps and does not automerge majors.
release-please opens a release PR on every push to `main`; a Monday 09:00 UTC
cron automerges the single PR labeled `autorelease: pending`, so releases go out
weekly rather than per merge. The resulting `v*` tag triggers
`npm publish --provenance` via npm trusted publishing (no `NPM_TOKEN`).

## Keep in sync

`skills/marktguru-grocery-deals/SKILL.md` documents _using_ the CLI for agents
that consume it; `README.md` documents the same surface for humans. Changing a
command or flag means updating both. The directory name has to match the
skill's frontmatter `name`, and the `skills/<name>/SKILL.md` layout is what the
`skills` CLI discovers and installs.
