// pipeline/discovery/apply-manual-mrf-urls.js
//
// Tier-3 final pass per ACQUISITION_STRATEGY.md: applies hand-curated
// MRF URLs from pipeline/discovery/manual-mrf-urls.json to hospitals
// that automation couldn't reach.
//
// Idempotent. Overwrites whatever mrf_file_url the automation left in
// place (since we're explicitly telling the system that the manual
// value is authoritative). Skips entries where verified=false (still
// being researched).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from 'pg';
import { loadEnv } from '../../db/load-env.js';

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set.');
    process.exit(1);
  }

  const path = resolve(__dirname, 'manual-mrf-urls.json');
  const doc = JSON.parse(readFileSync(path, 'utf8'));
  const overrides = (doc.overrides ?? []).filter((o) => o.verified);

  console.log(`${overrides.length} verified override(s) to apply`);

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let applied = 0;
  let unknown = 0;

  try {
    for (const o of overrides) {
      const result = await client.query(
        `UPDATE hospitals
           SET mrf_file_url = $1,
               mrf_format   = $2,
               last_mrf_check_at = now(),
               updated_at   = now()
         WHERE ccn = $3
         RETURNING ccn, name`,
        [o.mrf_file_url, o.mrf_format, o.ccn]
      );
      if (result.rowCount === 0) {
        console.log(`  ? ${o.ccn} not in roster — ${o.name_hint}`);
        unknown++;
      } else {
        console.log(`  ✓ ${o.ccn} ${result.rows[0].name}`);
        applied++;
      }
    }
  } finally {
    await client.end();
  }

  console.log('');
  console.log('=== Manual override summary ===');
  console.log(`Applied:           ${applied}`);
  console.log(`Not in roster:     ${unknown}`);
  console.log(`Unverified (skipped): ${doc.overrides.length - applied - unknown}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
