// pipeline/discovery/ingest-pps-exempt-cancer-hospitals.js
//
// Adds the 11 PPS-Exempt Cancer Hospitals (PCHs) to our roster.
// These famous cancer-only centers (MD Anderson, MSK, Dana-Farber,
// Moffitt, etc.) are NOT in the standard CMS Hospital General
// Information dataset — they're regulated under a separate CMS
// classification ("PPS-Exempt") and live on their own data feed.
//
// Source: data.cms.gov dataset `iy27-wz37` (PCH HCAHPS Patient
// Survey - Hospital). Same column schema as Hospital General Info.
//
// Stores hospital_type = 'PPS-Exempt Cancer Hospital' so we can
// distinguish them in coverage reports. After this ingest, the
// scrape:cms-hpt step will finally be able to match MD Anderson's
// already-known cms-hpt URL (mdanderson.org/cms-hpt.txt) to a roster
// row, plus pick up any of these whose URLs are in our other sources.

import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import pg from 'pg';
import { loadEnv } from '../../db/load-env.js';
import { slugify } from './slugify.js';

const METASTORE_URL =
  'https://data.cms.gov/provider-data/api/1/metastore/schemas/dataset/items/iy27-wz37?show-reference-ids=false';
const LOCAL_PATH = '/tmp/pch.csv';

loadEnv();

async function resolveCsvUrl() {
  const res = await fetch(METASTORE_URL);
  if (!res.ok) throw new Error(`metastore ${res.status} ${res.statusText}`);
  const meta = await res.json();
  const url = meta?.distribution?.[0]?.data?.downloadURL;
  if (!url) throw new Error('no downloadURL on PCH metastore');
  return { url, modified: meta.modified };
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  return buf.length;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set.');
    process.exit(1);
  }

  console.log('Resolving PCH dataset URL...');
  const { url, modified } = await resolveCsvUrl();
  console.log(`  modified=${modified}`);
  await download(url, LOCAL_PATH);

  const csv = readFileSync(LOCAL_PATH, 'utf8');
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
  });

  // The dataset has multiple rows per facility (one per HCAHPS measure).
  // Collapse to one row per Facility ID.
  const byCcn = new Map();
  for (const r of records) {
    const ccn = (r['Facility ID'] ?? '').trim();
    if (!ccn || byCcn.has(ccn)) continue;
    byCcn.set(ccn, {
      ccn,
      name: (r['Facility Name'] ?? '').trim(),
      address: (r['Address'] ?? '').trim() || null,
      city: (r['City/Town'] ?? '').trim(),
      state: (r['State'] ?? '').trim().toLowerCase(),
      zip: (r['ZIP Code'] ?? '').trim() || null,
      county: (r['County/Parish'] ?? '').trim() || null,
    });
  }

  console.log(`${byCcn.size} unique PCH facilities`);

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let inserted = 0;
  let updated = 0;
  try {
    await client.query('BEGIN');

    for (const h of byCcn.values()) {
      if (!h.name || !h.state || !h.city) continue;
      const slug = slugify(h.name);

      const result = await client.query(
        `INSERT INTO hospitals (
           ccn, name, slug, address_line1, city, state, zip, county,
           hospital_type, ownership, refresh_tier
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PPS-Exempt Cancer Hospital',
                   'Voluntary non-profit - Private', 1)
         ON CONFLICT (ccn) DO UPDATE SET
           name = EXCLUDED.name,
           slug = EXCLUDED.slug,
           address_line1 = EXCLUDED.address_line1,
           city = EXCLUDED.city,
           state = EXCLUDED.state,
           zip = EXCLUDED.zip,
           county = EXCLUDED.county,
           hospital_type = EXCLUDED.hospital_type,
           updated_at = now()
         RETURNING (xmax = 0) AS was_inserted`,
        [h.ccn, h.name, slug, h.address, h.city, h.state, h.zip, h.county]
      );
      if (result.rows[0].was_inserted) inserted++;
      else updated++;
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }

  console.log('');
  console.log('=== PCH ingest summary ===');
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated:  ${updated}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
