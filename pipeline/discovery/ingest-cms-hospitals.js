// pipeline/discovery/ingest-cms-hospitals.js
// Downloads the current CMS Hospital General Information dataset and
// upserts every hospital into our `hospitals` table.
//
// Notes:
//   - Resolves the CSV URL dynamically via the CMS metastore API so the
//     script keeps working after CMS rotates the versioned file path
//     (which happens roughly quarterly).
//   - Idempotent: re-running produces 0 inserted / N updated.
//   - refresh_tier is set to 3 (long tail) only on first insert. Later
//     reassignments (e.g., bumping starter-200 hospitals to tier 1) are
//     preserved on subsequent runs.
//   - hospital_type and ownership are stored as the raw CMS string. Bucketing
//     into general / specialty / critical_access happens at query time, not
//     ingest time, to keep the original signal intact.
//   - system_id is left NULL here. Hospital system attribution comes from a
//     separate source (AHA Annual Survey) in a follow-up step.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'csv-parse/sync';
import pg from 'pg';
import { loadEnv } from '../../db/load-env.js';
import { slugify } from './slugify.js';

const METASTORE_URL =
  'https://data.cms.gov/provider-data/api/1/metastore/schemas/dataset/items/xubh-q36u?show-reference-ids=false';
const LOCAL_PATH = '/tmp/cms-hospitals.csv';

loadEnv();

async function resolveCsvUrl() {
  const res = await fetch(METASTORE_URL);
  if (!res.ok) {
    throw new Error(`CMS metastore returned ${res.status} ${res.statusText}`);
  }
  const meta = await res.json();
  const dist = meta?.distribution?.[0]?.data;
  const url = dist?.downloadURL;
  if (!url) {
    throw new Error('Failed to resolve CSV downloadURL from CMS metastore response');
  }
  return { url, modified: meta.modified, released: meta.released };
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  return buf.length;
}

function normalizeRow(r) {
  // CMS sometimes uses empty strings or 'Not Available' for missing values.
  const blank = (v) => {
    if (v === undefined || v === null) return null;
    const t = String(v).trim();
    if (!t || t === 'Not Available') return null;
    return t;
  };

  return {
    ccn: blank(r['Facility ID']),
    name: blank(r['Facility Name']),
    address: blank(r['Address']),
    city: blank(r['City/Town']),
    state: blank(r['State']),
    zip: blank(r['ZIP Code']),
    county: blank(r['County/Parish']),
    hospital_type: blank(r['Hospital Type']),
    ownership: blank(r['Hospital Ownership']),
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set. Add it to .env or export it.');
    process.exit(1);
  }

  console.log('Resolving CMS dataset URL...');
  const { url, modified, released } = await resolveCsvUrl();
  console.log(`  modified=${modified} released=${released}`);

  console.log('Downloading CSV...');
  const bytes = await download(url, LOCAL_PATH);
  console.log(`  ${bytes} bytes → ${LOCAL_PATH}`);

  const csv = readFileSync(LOCAL_PATH, 'utf8');
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  console.log(`Parsed ${records.length} rows`);

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const byState = new Map();
  const byType = new Map();

  try {
    await client.query('BEGIN');

    for (const raw of records) {
      const r = normalizeRow(raw);

      if (!r.ccn || !r.name || !r.state || !r.city) {
        skipped++;
        continue;
      }

      const slug = slugify(r.name);
      const state = r.state.toLowerCase();

      const result = await client.query(
        `INSERT INTO hospitals (
           ccn, name, slug, address_line1, city, state, zip, county,
           hospital_type, ownership, refresh_tier
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 3)
         ON CONFLICT (ccn) DO UPDATE SET
           name = EXCLUDED.name,
           slug = EXCLUDED.slug,
           address_line1 = EXCLUDED.address_line1,
           city = EXCLUDED.city,
           state = EXCLUDED.state,
           zip = EXCLUDED.zip,
           county = EXCLUDED.county,
           hospital_type = EXCLUDED.hospital_type,
           ownership = EXCLUDED.ownership,
           updated_at = now()
         RETURNING (xmax = 0) AS was_inserted`,
        [
          r.ccn,
          r.name,
          slug,
          r.address,
          r.city,
          state,
          r.zip,
          r.county,
          r.hospital_type,
          r.ownership,
        ]
      );

      const wasInserted = result.rows[0].was_inserted;
      if (wasInserted) inserted++;
      else updated++;

      byState.set(state, (byState.get(state) ?? 0) + 1);
      const type = r.hospital_type ?? '(none)';
      byType.set(type, (byType.get(type) ?? 0) + 1);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }

  console.log('');
  console.log('=== Ingest summary ===');
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated:  ${updated}`);
  console.log(`Skipped:  ${skipped}`);
  console.log('');
  console.log('Hospitals by type:');
  for (const [type, n] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${type}`);
  }
  console.log('');
  console.log('Top 10 states by hospital count:');
  const sortedStates = [...byState.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [s, n] of sortedStates) {
    console.log(`  ${s}  ${n}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
