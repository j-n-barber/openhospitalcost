# Cloud ingest — getting bulk ingest off the laptop

_INGEST_RETRO.md item #3. Goal: run ingest uninterrupted, on a schedule, without
tying up a local machine, risking the local disk, or dying on account switches._

## Status: scaffolded, not yet enabled

`.github/workflows/ingest.yml` is **live**: smoke-tested green end-to-end
(deps → DuckDB CLI → migrate → ingest), and runs **weekly (Mon 07:00 UTC)** plus
on manual dispatch. Secrets already exist (shared with Snapshots): `DATABASE_URL`,
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.

The weekly run uses fallback defaults (tier 3, limit 800, timeout 300, big-first,
**`--refresh-stale 30`**), so it **no-ops until hospitals are >30 days stale**,
then refreshes ~800/run. Manual dispatch defaults to `refresh_stale: 0` (backfill)
and exposes all inputs.

## Manual run
Actions → "Ingest (backfill / catch-up)" → Run workflow (tune tier/limit/timeout/
order/retry-failed/refresh-stale). To pause the auto-schedule, comment the
`schedule:` block (or disable the workflow in the Actions UI).

## Why GitHub Actions (and its limits)
Matches our infra default (free tier) and reuses the Snapshots setup. Constraints
to respect — they're why the workflow is parameterized:
- **6-hour job cap** → `--limit` bounds each run (default 800). The `ingest_attempts`
  log makes runs idempotent, so successive runs chew through the backlog.
- **~14 GB runner disk** → fine now: decompress dirs are cleaned per-hospital and
  giant files fail-fast (5-min DuckDB SIGKILL). No R2 by default (`--no-archive`).
- **Tier-2 (Playwright) is off by default** (browser install is heavy, and the
  weekly refresh doesn't need it). Toggle it on per-run via the **`use_tier2`**
  input — that conditionally runs `npx playwright install --with-deps chromium`
  and drops `--no-tier2`, so Tier-2's browser-cookie fallback runs in CI. Pair
  with `retry_failed: true` to re-attack already-logged 403/stub failures.
  Caveat: Tier-2 from a datacenter IP may be less effective than from a
  residential IP (some WAFs block cloud ranges regardless of a real browser).

## Recurring refresh
`--refresh-stale N` (workflow input `refresh_stale`) re-ingests hospitals whose
latest parse is older than N days, on top of any never-ingested ones — this is
what makes a scheduled run a true *refresh* rather than a one-time backfill.
- **Backfill phase** (now): leave `refresh_stale: 0` to only pick up new/fixed
  hospitals until coverage plateaus.
- **Steady state**: set `refresh_stale: 30` so each run also refreshes month-old
  data, matching the freshness model. The `ingest_attempts` cooldown still keeps
  it from re-grinding permanent failures.

## Heavy-backfill alternative: Railway
For the one-time bulk backfill (thousands of hospitals, Tier-2 on, no 6 h cap),
a Railway one-off job is a better fit than Actions:
- Dockerfile: node 20 + `curl` the DuckDB v1.5.3 linux CLI to `.bin/duckdb` +
  `npx playwright install --with-deps chromium`.
- Command: `npm run migrate:up && npm run ingest:batch -- --tier 3 --limit 5000 --timeout 900 --retry-failed`
- Set the same env vars. Bigger ephemeral disk + no wall-clock cap.

Recommendation: **Actions for the recurring catch-up/refresh** (cheap, hands-off);
**Railway only if** we want a single uninterrupted heavy backfill with Tier-2.
