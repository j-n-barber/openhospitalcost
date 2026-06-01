// pipeline/select-starter-200.js
//
// Selects the starter-200 cohort and tags it refresh_tier = 1, per the recipe
// in docs/QUALITY_RUBRIC.md § 1.5:
//   1. Rank metros (CBSA) by population; take the top 50 that have an eligible
//      hospital.
//   2. Within each metro, filter to in-scope hospitals that have a discovered
//      MRF URL (pre-ingest compliance proxy), rank by beds DESC, take the top 4.
//   3. Cap at 200, tag refresh_tier = 1.
//
// NOTE on staging: the rubric's hard filter is `eligibleForMoneyPages` (a
// parsed-file signal). Pre-ingest we don't have parsed files yet, so we use
// "has an MRF URL" as the compliance proxy here and CONFIRM eligibility after
// the cohort's MRFs are downloaded and scored. This matches the brief's order
// (select 200 -> ingest those 200 -> finalize).
//
// Usage:
//   npm run select:starter-200            # apply (sets refresh_tier)
//   DRY_RUN=1 npm run select:starter-200  # preview only, no writes

import pg from 'pg';
import { loadEnv } from '../db/load-env.js';
import { IN_SCOPE_WHERE_CLAUSE } from './coverage.js';

const PER_METRO = 4;
const COHORT_SIZE = 200;
const TOP_METROS = 50;

const SELECT_SQL = `
  WITH eligible AS (
    SELECT * FROM hospitals h
    WHERE h.cbsa_code IS NOT NULL
      AND h.mrf_file_url IS NOT NULL
      AND (${IN_SCOPE_WHERE_CLAUSE})
  ),
  top_metros AS (
    SELECT cb.cbsa_code, cb.name, cb.population,
           row_number() OVER (ORDER BY cb.population DESC NULLS LAST) AS metro_rank
    FROM cbsa cb
    WHERE cb.cbsa_code IN (SELECT DISTINCT cbsa_code FROM eligible)
    ORDER BY cb.population DESC NULLS LAST
    LIMIT ${TOP_METROS}
  ),
  ranked AS (
    SELECT e.id, e.ccn, e.name, e.beds, m.cbsa_code, m.name AS metro, m.population, m.metro_rank,
           row_number() OVER (PARTITION BY e.cbsa_code ORDER BY e.beds DESC NULLS LAST, e.ccn) AS within_metro_rank
    FROM eligible e JOIN top_metros m ON e.cbsa_code = m.cbsa_code
  )
  SELECT * FROM ranked
  WHERE within_metro_rank <= ${PER_METRO}
  ORDER BY metro_rank, within_metro_rank
  LIMIT ${COHORT_SIZE}
`;

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set.');
  const dryRun = !!process.env.DRY_RUN;

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const picked = (await client.query(SELECT_SQL)).rows;
    console.log(`Selected ${picked.length} hospitals across ${new Set(picked.map((r) => r.cbsa_code)).size} metros.`);
    console.log('\nTop of cohort:');
    for (const r of picked.slice(0, 8)) {
      console.log(`  #${r.metro_rank} ${r.metro} | ${r.name} (${r.beds ?? '?'} beds)`);
    }
    if (picked.length < COHORT_SIZE) {
      console.log(`\nNote: ${picked.length} < ${COHORT_SIZE}. Some top metros have < ${PER_METRO} eligible hospitals; raise PER_METRO or TOP_METROS to backfill.`);
    }

    if (dryRun) {
      console.log('\nDRY_RUN — no changes written.');
      return;
    }

    const ids = picked.map((r) => r.id);
    await client.query('BEGIN');
    // Demote any prior tier-1 not in the new cohort, then promote the cohort.
    await client.query(
      `UPDATE hospitals SET refresh_tier = 3, updated_at = now() WHERE refresh_tier = 1 AND NOT (id = ANY($1::uuid[]))`,
      [ids]
    );
    const promoted = await client.query(
      `UPDATE hospitals SET refresh_tier = 1, updated_at = now() WHERE id = ANY($1::uuid[]) AND refresh_tier IS DISTINCT FROM 1`,
      [ids]
    );
    await client.query('COMMIT');
    const tier1 = (await client.query('SELECT count(*) n FROM hospitals WHERE refresh_tier = 1')).rows[0].n;
    console.log(`\nPromoted ${promoted.rowCount} hospitals. Total refresh_tier = 1: ${tier1}.`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
