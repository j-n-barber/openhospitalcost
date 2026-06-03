# Ingest Retrospective & Optimization Plan

_Written 2026-06-03 after the bulk coverage push (110 → ~1,000+ hospitals). Will be
refined with complete failure data once the current passes finish._

## What we shipped / learned (incidents → systemic lessons)

| Incident | Root cause | Lesson |
|---|---|---|
| Disk full (ENOSPC), overnight run died | decompressed MRF temp dirs (4–6 GB ea) never cleaned | every temp artifact needs guaranteed cleanup (try/finally) |
| 28-min stall on one hospital | 911 MB JSON; DuckDB unnest hung; `spawnSync` timeout used SIGTERM, which DuckDB traps | external processes need **SIGKILL** + bounded time/disk |
| Runs never reached most hospitals | cohort is `beds DESC`; runs died/were-killed in the hard top cluster | process by **expected yield**, not just size; isolate hard work |
| Background runs kept dying | tied to the interactive Claude session (killed on account switch) | long jobs must run **detached / off-session** |
| "Vendor format" red herring | most "remaining" were unreached small hospitals, not format failures | **measure before theorizing**; small-first proved it (59% vs 0%) |

## Failure data (from this run's logs — 2,048 ✗ / 735 ✓)

> ⚠️ The 2,048 failures are inflated by **re-grinding**: every restart re-attempts
> all prior failures (we don't record outcomes), so the same hospital is counted
> many times. That duplication is itself the #1 efficiency problem.

| Count | Bucket | Disposition |
|---|---|---|
| 243 | unrecognized / stub CSV | mix of blocked-stub (→Tier-2) + header-detection gaps — **investigate** |
| 155 | 404 dead URL | discovery URL refresh |
| 100 | 403 bot-blocked | Tier-2 (some crackable, some hard) |
| 64 | zip w/o csv/json (xlsx) | **add .xlsx support** |
| 31 | fetch failed (DNS/TLS/conn) | **transient → retry** |
| ~17 | CSV "quote not closed" | parser robustness (lenient read / ignore_errors) |
| 14 | parse binder error | partly fixed (version); rest = format edge cases |
| 7 | giant >1 GB JSON | **streaming parser** |
| 7 | DuckDB OOM (12.7 GB) | streaming / memory cap |
| 7 | download timeout | patient pass / longer budget |
| ~16 | HTTP 429/500/503/504 | **transient → retry w/ backoff** |

## The costly patterns (efficiency + cost)

1. **Re-grinding known failures.** No per-attempt record → every pass re-downloads
   and re-parses hundreds of permanent failures. Wastes bandwidth, time, and (in
   cloud) compute. This is the single biggest waste.
2. **No retry for transient failures.** ~47+ failures (fetch-failed, 429/5xx) are
   almost certainly recoverable, but we either lose them or blindly re-grind them.
3. **Local-machine fragility.** Runs tie up the Mac, die on account switches, and
   risk filling the local disk. Bandwidth is the home connection.
4. **One linear strategy for heterogeneous work.** Simple, large, blocked, dead-URL,
   and non-CMS-format hospitals all go through the same path at the same time.
5. **Log-grep observability.** Retros require parsing logs; no persisted metrics.

## Recommendations (prioritized by ROI)

### Foundational (small effort, compounding payoff)
1. **Record per-attempt outcomes** — table `ingest_attempts(hospital_id, ts, status,
   reason, http_code, bytes, ms)`. Enables: skip permanent failures, retry transient
   ones with backoff, bucket failures for targeted fixes, and data-driven cohort
   selection. *Collapses the re-grinding waste.*
2. **Retry-with-backoff** for transient classes (fetch-failed, 429, 5xx, timeout),
   bounded (e.g. 3 tries). Pairs with #1.

### Architectural (medium effort, removes whole problem classes)
3. **Move bulk ingest off the laptop** → Railway worker or GitHub Actions on a
   schedule (matches the monthly per-hospital freshness model). Uninterrupted,
   ephemeral disk (no leak risk), better bandwidth, no account-switch deaths.
   Aligns with our infra defaults (Railway / GH Actions). Cost: GH Actions free
   tier or a small Railway job — far cheaper than the engineer-time spent babysitting.
4. **Difficulty-aware routing** (driven by #1's data): simple→fast Tier-1; large→
   patient long-timeout; blocked→Tier-2; dead-URL→discovery; non-CMS→vendor parser.
   Replaces the single linear sweep; each class runs on its own cadence.

### Coverage unlocks (each a self-contained task, sized by bucket)
5. `.xlsx` parser (64) · streaming JSON parser (7 giant + 7 OOM — and the marquee
   names) · CSV lenient-quote handling (17) · 404 discovery refresh (155) ·
   investigate the 243 stub/unrecognized bucket · Proofpoint URL unwrap (39) ·
   cdmpricing SPA file-URL extraction (62).

### Observability (small)
6. Persist per-run stats + a failure-reason histogram to `ingestion_runs` so the
   next retro is a query, not a log-grep.

## Suggested sequence
1 → 2 (foundation: stop wasting work, recover transients) →
3 (get it off the laptop / scheduled) → 4 (routing) →
5 coverage unlocks in bucket-size order (xlsx, streaming JSON, discovery, …).

The current detached fast-sweep + chained patient pass keep banking coverage in the
meantime; none of the above blocks them.
