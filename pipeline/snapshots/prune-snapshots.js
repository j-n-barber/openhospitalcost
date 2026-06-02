// pipeline/snapshots/prune-snapshots.js
//
// Snapshot retention: keep weekly Parquet snapshots for 12 months, keep monthly
// snapshots forever (spec: docs/PROJECT_BRIEF.md § 5). This can't be a bucket
// lifecycle rule — both cadences live under snapshots/ and the policy differs by
// cadence — so it's code-driven off the `snapshots` table.
//
// Deletes the R2 object first, then the row, for each weekly snapshot older than
// 12 months. --dry-run reports what would be deleted without touching anything.
//
// Usage:
//   node pipeline/snapshots/prune-snapshots.js --dry-run
//   node pipeline/snapshots/prune-snapshots.js

import pg from 'pg';
import { loadEnv } from '../../db/load-env.js';
import { r2Configured, deleteObject } from '../archive/r2.js';

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set.');
  if (!r2Configured()) throw new Error('R2 not configured. Set R2_* in .env first.');
  const dryRun = process.argv.includes('--dry-run');

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const stale = (await client.query(
      `SELECT id, snapshot_date, r2_key
       FROM snapshots
       WHERE cadence = 'weekly' AND snapshot_date < (current_date - interval '12 months')
       ORDER BY snapshot_date`
    )).rows;

    if (!stale.length) {
      console.log('No weekly snapshots older than 12 months. Nothing to prune.');
      return;
    }
    console.log(`${stale.length} weekly snapshot(s) past the 12-month window${dryRun ? ' (dry run)' : ''}:`);

    let pruned = 0;
    for (const s of stale) {
      if (dryRun) {
        console.log(`  would delete ${s.snapshot_date} → r2://${s.r2_key}`);
        continue;
      }
      try {
        await deleteObject(s.r2_key);
        await client.query('DELETE FROM snapshots WHERE id = $1', [s.id]);
        pruned++;
        console.log(`  ✓ deleted ${s.snapshot_date} (${s.r2_key})`);
      } catch (err) {
        console.warn(`  ✗ ${s.snapshot_date} (${s.r2_key}): ${err.message}`);
      }
    }
    if (!dryRun) console.log(`Pruned ${pruned}/${stale.length} weekly snapshots.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
