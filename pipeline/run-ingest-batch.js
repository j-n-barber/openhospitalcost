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

function flag(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? (process.argv[i + 1] ?? true) : undefined;
}

async function selectCohort(pool, { tier, limit, force }) {
  const skip = force ? '' : 'AND NOT EXISTS (SELECT 1 FROM mrf_files f WHERE f.hospital_id = h.id)';
  const lim = limit ? `LIMIT ${parseInt(limit, 10)}` : '';
  return (await pool.query(`
    SELECT h.id, h.ccn, h.name, h.mrf_file_url
    FROM hospitals h
    WHERE h.refresh_tier = ${parseInt(tier, 10)} AND h.mrf_file_url IS NOT NULL ${skip}
    ORDER BY h.beds DESC NULLS LAST ${lim}
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

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
  // Swallow idle-client errors (Neon drops idle connections); the pool evicts them.
  pool.on('error', () => {});

  const run = (await pool.query(
    `INSERT INTO ingestion_runs (status, run_type) VALUES ('running', 'starter_batch') RETURNING id`
  )).rows[0];

  const stats = { attempted: 0, ingested: 0, failed: 0, downloadFail: 0, eligible: 0, viaTier2: 0, archived: 0, failures: [] };
  try {
    const pidByCpt = await fetchCptMap(pool);
    const cohort = await selectCohort(pool, { tier, limit, force });
    console.log(`Cohort: ${cohort.length} hospitals (tier ${tier}${force ? ', force' : ', skip already-ingested'})` +
      `${noTier2 ? ' [no-tier2]' : ''}${noArchive ? ' [no-archive]' : ''}.`);
    if (!noArchive && !r2Configured()) console.warn('R2 not configured — raw MRFs will NOT be archived (set R2_* in .env).');

    for (const h of cohort) {
      stats.attempted++;
      const tmp = join(tmpdir(), `ohc-mrf-${h.ccn}`);
      try {
        // Long work: no DB connection held. --no-tier2 skips the Playwright fallback.
        const meta = noTier2
          ? await downloadToFile(h.mrf_file_url, tmp)
          : await downloadWithFallback(h.mrf_file_url, tmp);
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
      } catch (err) {
        const isDownload = /HTTP \d|tier1:|tier2:|fetch|aborted|empty response|timeout/i.test(err.message);
        if (isDownload) stats.downloadFail++; else stats.failed++;
        stats.failures.push({ ccn: h.ccn, name: h.name, error: err.message.slice(0, 160) });
        console.warn(`  ✗ ${h.name} (${h.ccn}): ${err.message.slice(0, 140)}`);
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
      console.log('Failures:');
      for (const f of stats.failures) console.log(`  - ${f.name} (${f.ccn}): ${f.error}`);
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
