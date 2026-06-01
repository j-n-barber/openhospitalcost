// pipeline/run-ingest-batch.js
//
// Downloads + ingests the starter cohort (refresh_tier = 1) end to end:
// for each hospital, download mrf_file_url -> temp file -> ingestOne -> delete
// temp. Refreshes procedure_hospital_summary once at the end, logs an
// ingestion_runs row, and reports how many of the cohort are money-page eligible.
//
// Resumable: hospitals that already have an mrf_files row are skipped unless
// --force. A single bad URL never aborts the batch (matches the scraper's
// crash-resilience policy).
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
import { downloadWithFallback, closeBrowserIfOpen } from './fetch/download.js';
import { ingestOne } from './ingest-mrf.js';

function flag(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? (process.argv[i + 1] ?? true) : undefined;
}

async function selectCohort(client, { tier, limit, force }) {
  const skip = force ? '' : 'AND NOT EXISTS (SELECT 1 FROM mrf_files f WHERE f.hospital_id = h.id)';
  const lim = limit ? `LIMIT ${parseInt(limit, 10)}` : '';
  return (await client.query(`
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

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const run = (await client.query(
    `INSERT INTO ingestion_runs (status, run_type) VALUES ('running', 'starter_batch') RETURNING id`
  )).rows[0];

  const stats = { attempted: 0, ingested: 0, failed: 0, skipped: 0, downloadFail: 0, eligible: 0, viaTier2: 0, failures: [] };
  try {
    const cohort = await selectCohort(client, { tier, limit, force });
    console.log(`Cohort: ${cohort.length} hospitals (tier ${tier}${force ? ', force' : ', skip already-ingested'}).`);

    for (const h of cohort) {
      stats.attempted++;
      const tmp = join(tmpdir(), `ohc-mrf-${h.ccn}`);
      try {
        const meta = await downloadWithFallback(h.mrf_file_url, tmp);
        if (meta.tier === 2) stats.viaTier2++;
        const res = await ingestOne(client, {
          ccn: h.ccn, filePath: tmp, url: h.mrf_file_url,
          contentType: meta.contentType, contentDisposition: meta.contentDisposition,
          asOf: new Date().toISOString().slice(0, 10), refresh: false,
        });
        stats.ingested++;
        if (res.score.eligibleForMoneyPages) stats.eligible++;
      } catch (err) {
        const isDownload = /HTTP \d|fetch|aborted|body|timeout/i.test(err.message);
        if (isDownload) stats.downloadFail++; else stats.failed++;
        stats.failures.push({ ccn: h.ccn, name: h.name, error: err.message.slice(0, 140) });
        console.warn(`  ✗ ${h.name} (${h.ccn}): ${err.message.slice(0, 120)}`);
      } finally {
        await unlink(tmp).catch(() => {});
      }
    }

    if (doRefresh && stats.ingested > 0) {
      await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY procedure_hospital_summary');
    }
    await client.query(
      `UPDATE ingestion_runs SET status='completed', ended_at=now(), stats=$2 WHERE id=$1`,
      [run.id, JSON.stringify(stats)]
    );

    console.log(`\nDone. ingested=${stats.ingested} (tier2=${stats.viaTier2}) eligible=${stats.eligible} ` +
      `downloadFail=${stats.downloadFail} parseFail=${stats.failed} of attempted=${stats.attempted}.`);
    if (stats.failures.length) {
      console.log('Failures (route blocked ones to Tier-2 Playwright):');
      for (const f of stats.failures.slice(0, 20)) console.log(`  - ${f.name} (${f.ccn}): ${f.error}`);
    }
  } catch (err) {
    await client.query(
      `UPDATE ingestion_runs SET status='failed', ended_at=now(), stats=$2 WHERE id=$1`,
      [run.id, JSON.stringify({ ...stats, fatal: err.message })]
    ).catch(() => {});
    throw err;
  } finally {
    await closeBrowserIfOpen();
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
