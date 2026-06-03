// pipeline/run-ingest-batch.js
//
// Downloads + ingests the starter cohort (refresh_tier = 1) end to end:
// for each hospital, download mrf_file_url -> compute (parse/score/normalize,
// no DB) -> check out a pooled connection only for the inserts -> delete temp.
// Refreshes procedure_hospital_summary once at the end, logs an ingestion_runs
// row, and reports money-page eligibility.
//
// Robustness: a pg.Pool (with an 'error' handler) survives Neon idle-connection
// drops — the connection is held only for the short persist, never during the
// multi-minute download or the multi-second DuckDB parse. Resumable (skips
// already-ingested unless --force) and crash-resilient (one bad URL never
// aborts the batch).
//
// Usage:
//   node pipeline/run-ingest-batch.js                 # all tier-1, skip done
//   node pipeline/run-ingest-batch.js --limit 5       # first 5 (testing)
//   node pipeline/run-ingest-batch.js --tier 1 --force
//   node pipeline/run-ingest-batch.js --no-refresh

import pg from 'pg';
import { unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEnv } from '../db/load-env.js';
import { downloadToFile, downloadWithFallback, closeBrowserIfOpen } from './fetch/download.js';
import { computeMrf, persistMrf, fetchCptMap, archiveRawMrf } from './ingest-mrf.js';
import { r2Configured } from './archive/r2.js';
import { classifyFailure } from './fetch/failure-class.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Record an attempt outcome (best-effort: logging must never break ingest).
async function recordAttempt(pool, runId, hospitalId, fields) {
  try {
    await pool.query(
      `INSERT INTO ingest_attempts (hospital_id, run_id, status, failure_class, transient, http_code, bytes, duration_ms, detail)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [hospitalId, runId, fields.status, fields.failureClass ?? null, !!fields.transient,
       fields.httpCode ?? null, fields.bytes ?? null, fields.durationMs ?? null, fields.detail ?? null]
    );
  } catch { /* ignore */ }
}

// Download with bounded retry on transient errors (network blips, 429, 5xx, timeout).
async function downloadWithRetry(fn, { tries = 3 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const { transient } = classifyFailure(err.message);
      if (!transient || attempt === tries) throw err;
      await sleep(2000 * attempt * attempt); // 2s, 8s
    }
  }
  throw lastErr;
}

function flag(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? (process.argv[i + 1] ?? true) : undefined;
}

async function selectCohort(pool, { tier, limit, force, order, retryFailed, refreshStaleDays, failCooldownDays = 14 }) {
  // Skip already-ingested hospitals. Default: skip if ever ingested (backfill).
  // With --refresh-stale N: only skip those whose latest successful parse is
  // NEWER than N days, so stale hospitals get re-ingested (recurring freshness,
  // per the monthly refresh model). never-ingested are always included.
  const skipDone = force ? ''
    : refreshStaleDays != null
      ? `AND NOT EXISTS (SELECT 1 FROM mrf_files f WHERE f.hospital_id = h.id AND f.status = 'parsed' AND f.parsed_at > now() - interval '${parseInt(refreshStaleDays, 10)} days')`
      : 'AND NOT EXISTS (SELECT 1 FROM mrf_files f WHERE f.hospital_id = h.id)';
  // Skip hospitals whose most recent attempt was a PERMANENT failure within the
  // cooldown — this stops re-grinding 404/403/unrecognized/etc. every pass.
  // Transient failures are NOT skipped (they get retried). --retry-failed or
  // --force overrides this (used by targeted Tier-2/discovery passes).
  const skipFailed = (force || retryFailed) ? '' : `AND NOT EXISTS (
    SELECT 1 FROM ingest_attempts a
    WHERE a.hospital_id = h.id AND a.status = 'fail' AND a.transient = false
      AND a.attempted_at > now() - interval '${parseInt(failCooldownDays, 10)} days'
  )`;
  const lim = limit ? `LIMIT ${parseInt(limit, 10)}` : '';
  // Default biggest-first (most-trafficked hospitals). --order asc processes the
  // small-hospital tail first: useful for a recovery run that may be interrupted,
  // since the big top cluster mostly needs separate fixes (discovery/streaming).
  const dir = order === 'asc' ? 'ASC' : 'DESC';
  return (await pool.query(`
    SELECT h.id, h.ccn, h.name, h.mrf_file_url
    FROM hospitals h
    WHERE h.refresh_tier = ${parseInt(tier, 10)} AND h.mrf_file_url IS NOT NULL ${skipDone} ${skipFailed}
    ORDER BY h.beds ${dir} NULLS LAST ${lim}
  `)).rows;
}

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set.');
  const tier = flag('tier') || 1;
  const limit = flag('limit');
  const force = !!flag('force');
  const doRefresh = !flag('no-refresh');
  // Bulk-speed levers (see docs): skip the slow Tier-2 Playwright fallback on
  // download failure, and skip the raw-MRF→R2 archival upload.
  const noTier2 = !!flag('no-tier2');
  const noArchive = !!flag('no-archive');
  // Per-download timeout in seconds (default 600). Lower it for a fast bulk sweep
  // so giant/hung files abort quickly and get deferred to a later patient pass.
  const timeoutMs = (parseInt(flag('timeout'), 10) || 600) * 1000;
  const order = flag('order') === 'asc' ? 'asc' : 'desc';
  // Re-attempt hospitals that previously failed permanently (skips successes only).
  // For targeted retry passes (e.g. Tier-2 on blocked, after a discovery refresh).
  const retryFailed = !!flag('retry-failed');
  // Recurring-freshness mode: also re-ingest hospitals whose latest parse is older
  // than N days (e.g. --refresh-stale 30). Default off (pure backfill).
  const refreshStaleArg = flag('refresh-stale');
  const refreshStaleDays = refreshStaleArg !== undefined ? parseInt(refreshStaleArg, 10) : null;

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
  // Swallow idle-client errors (Neon drops idle connections); the pool evicts them.
  pool.on('error', () => {});

  const run = (await pool.query(
    `INSERT INTO ingestion_runs (status, run_type) VALUES ('running', 'starter_batch') RETURNING id`
  )).rows[0];

  const stats = { attempted: 0, ingested: 0, failed: 0, downloadFail: 0, eligible: 0, viaTier2: 0, archived: 0, failures: [] };
  try {
    const pidByCpt = await fetchCptMap(pool);
    const cohort = await selectCohort(pool, { tier, limit, force, order, retryFailed, refreshStaleDays });
    console.log(`Cohort: ${cohort.length} hospitals (tier ${tier}${force ? ', force' : ', skip already-ingested'}, beds ${order})` +
      `${noTier2 ? ' [no-tier2]' : ''}${noArchive ? ' [no-archive]' : ''}${retryFailed ? ' [retry-failed]' : ''}` +
      `${refreshStaleDays != null ? ` [refresh-stale>${refreshStaleDays}d]` : ''}.`);
    if (!noArchive && !r2Configured()) console.warn('R2 not configured — raw MRFs will NOT be archived (set R2_* in .env).');

    const PARSE_CLASSES = new Set(['parse', 'giant_json', 'oom', 'zip_no_csv', 'unrecognized', 'other']);
    for (const h of cohort) {
      stats.attempted++;
      const tmp = join(tmpdir(), `ohc-mrf-${h.ccn}`);
      const t0 = Date.now();
      try {
        // Long work: no DB connection held. --no-tier2 skips the Playwright fallback.
        // Transient download errors (network/429/5xx/timeout) are retried with backoff.
        const meta = await downloadWithRetry(() => (noTier2
          ? downloadToFile(h.mrf_file_url, tmp, { timeoutMs })
          : downloadWithFallback(h.mrf_file_url, tmp, { timeoutMs })));
        if (meta.tier === 2) stats.viaTier2++;
        const computed = await computeMrf({
          filePath: tmp, url: h.mrf_file_url,
          asOf: new Date().toISOString().slice(0, 10), pidByCpt,
        });

        // Archive the raw MRF to R2 before the (short) DB write (skipped by --no-archive).
        const r2RawKey = noArchive
          ? null
          : await archiveRawMrf({ ccn: h.ccn, filePath: tmp, computed, sourceUrl: h.mrf_file_url });
        if (r2RawKey) stats.archived++;

        // Short work: hold a pooled connection only for the writes.
        const client = await pool.connect();
        try {
          const { fileId, inserted } = await persistMrf(client, {
            hospitalId: h.id, url: h.mrf_file_url, filePath: tmp, computed, pidByCpt, r2RawKey,
          });
          stats.ingested++;
          if (computed.score.eligibleForMoneyPages) stats.eligible++;
          console.log(`  ✓ ${h.name} (${h.ccn}): ${computed.metrics.format} FQS ${computed.score.score} ${computed.score.grade}` +
            `${meta.tier === 2 ? ' [tier2]' : ''}${r2RawKey ? ' [r2]' : ''} +${inserted} (file ${fileId.slice(0, 8)})`);
        } finally {
          client.release();
        }
        await recordAttempt(pool, run.id, h.id, { status: 'ok', bytes: computed.fileSize, durationMs: Date.now() - t0 });
      } catch (err) {
        const cls = classifyFailure(err.message);
        if (PARSE_CLASSES.has(cls.failureClass)) stats.failed++; else stats.downloadFail++;
        stats.failures.push({ ccn: h.ccn, name: h.name, class: cls.failureClass, error: err.message.slice(0, 160) });
        console.warn(`  ✗ ${h.name} (${h.ccn}) [${cls.failureClass}]: ${err.message.slice(0, 130)}`);
        await recordAttempt(pool, run.id, h.id, {
          status: 'fail', failureClass: cls.failureClass, transient: cls.transient,
          httpCode: cls.httpCode, durationMs: Date.now() - t0, detail: err.message.slice(0, 240),
        });
      } finally {
        await unlink(tmp).catch(() => {});
      }
    }

    // procedure_hospital_summary is now a table maintained incrementally per
    // hospital in persistMrf (lakehouse offload) — no end-of-batch refresh.
    void doRefresh;
    await pool.query(
      `UPDATE ingestion_runs SET status='completed', ended_at=now(), stats=$2 WHERE id=$1`,
      [run.id, JSON.stringify(stats)]
    );

    console.log(`\nDone. ingested=${stats.ingested} (tier2=${stats.viaTier2}) archived=${stats.archived} eligible=${stats.eligible} ` +
      `downloadFail=${stats.downloadFail} parseFail=${stats.failed} of attempted=${stats.attempted}.`);
    if (stats.failures.length) {
      const byClass = {};
      for (const f of stats.failures) byClass[f.class || 'other'] = (byClass[f.class || 'other'] || 0) + 1;
      const hist = Object.entries(byClass).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' ');
      console.log(`Failures by class: ${hist}`);
    }
  } catch (err) {
    await pool.query(
      `UPDATE ingestion_runs SET status='failed', ended_at=now(), stats=$2 WHERE id=$1`,
      [run.id, JSON.stringify({ ...stats, fatal: err.message })]
    ).catch(() => {});
    throw err;
  } finally {
    await closeBrowserIfOpen();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
