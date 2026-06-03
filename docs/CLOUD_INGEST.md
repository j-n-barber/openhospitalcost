# Cloud ingest — getting bulk ingest off the laptop

_INGEST_RETRO.md item #3. Goal: run ingest uninterrupted, on a schedule, without
tying up a local machine, risking the local disk, or dying on account switches._

## Status: scaffolded, not yet enabled

`.github/workflows/ingest.yml` is added but ships **manual-trigger only** (the
weekly `schedule:` cron is commented out). Nothing runs automatically until you
opt in. The required secrets **already exist** (the Snapshots workflow uses the
same ones): `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.

## To turn it on
1. **Confirm `DATABASE_URL`** (repo → Settings → Secrets → Actions) points at the
   DB you want ingest writing to (prod vs dev branch).
2. **Try a manual run:** Actions → "Ingest (backfill / catch-up)" → Run workflow.
   Start small (`limit: 50`) to confirm it works end-to-end in CI.
3. **Enable the schedule:** uncomment the `schedule:` block in the workflow.

## Why GitHub Actions (and its limits)
Matches our infra default (free tier) and reuses the Snapshots setup. Constraints
to respect — they're why the workflow is parameterized:
- **6-hour job cap** → `--limit` bounds each run (default 800). The `ingest_attempts`
  log makes runs idempotent, so successive runs chew through the backlog.
- **~14 GB runner disk** → fine now: decompress dirs are cleaned per-hospital and
  giant files fail-fast (5-min DuckDB SIGKILL). No R2 by default (`--no-archive`).
- **Tier-2 (Playwright) is off by default** in CI (browser install is heavy). To
  enable, add a `npx playwright install --with-deps chromium` step and drop
  `--no-tier2` from the args.

## Known gap (follow-up)
The cohort selector currently skips **all** already-ingested hospitals (backfill
mode) — it does not yet re-ingest *stale* ones for the monthly freshness model.
A "due for refresh" selector (re-ingest where `parsed_at < now() - 30d`) is the
natural next step before this becomes a true recurring refresh job.

## Heavy-backfill alternative: Railway
For the one-time bulk backfill (thousands of hospitals, Tier-2 on, no 6 h cap),
a Railway one-off job is a better fit than Actions:
- Dockerfile: node 20 + `curl` the DuckDB v1.5.3 linux CLI to `.bin/duckdb` +
  `npx playwright install --with-deps chromium`.
- Command: `npm run migrate:up && npm run ingest:batch -- --tier 3 --limit 5000 --timeout 900 --retry-failed`
- Set the same env vars. Bigger ephemeral disk + no wall-clock cap.

Recommendation: **Actions for the recurring catch-up/refresh** (cheap, hands-off);
**Railway only if** we want a single uninterrupted heavy backfill with Tier-2.
