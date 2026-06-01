// pipeline/discovery/ingest-pos-beds.js
//
// Populates hospitals.beds from the CMS Provider of Services (POS) file, keyed
// by CCN (POS column PRVDR_NUM == hospitals.ccn — a clean exact join, no name
// matching). CMS Hospital General Information (our roster source) carries no
// bed count, so beds was empty; this fills it.
//
// `beds` is the within-metro volume proxy for starter-200 selection
// (docs/QUALITY_RUBRIC.md § 1.5). We use CRTFD_BED_CNT (certified bed count).
//
// Usage:
//   POS_FILE=/path/to/pos.csv npm run ingest:pos-beds   # use a local file
//   npm run ingest:pos-beds                             # download latest below
//
// The distribution URL embeds the release quarter and rotates; update POS_URL
// from the dataset page when CMS publishes a new quarter:
//   https://data.cms.gov/provider-characteristics/hospitals-and-other-facilities/provider-of-services-file-hospital-non-hospital-facilities

import pg from 'pg';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEnv } from '../../db/load-env.js';
import { duckdbQuery } from '../parse/duckdb.js';

const POS_URL =
  'https://data.cms.gov/sites/default/files/2026-04/8ff9bcf4-032e-4a6f-b1c1-d8f1c2e96885/Hospital_and_other.DATA.Q1_2026.csv';

const HOSPITAL_CATEGORY = '01'; // PRVDR_CTGRY_CD for hospitals

async function ensureFile() {
  if (process.env.POS_FILE) {
    if (!existsSync(process.env.POS_FILE)) throw new Error(`POS_FILE not found: ${process.env.POS_FILE}`);
    return process.env.POS_FILE;
  }
  const dest = join(tmpdir(), 'ohc-pos-hospitals.csv');
  if (existsSync(dest)) return dest;
  console.log(`Downloading POS file -> ${dest}`);
  const res = await fetch(POS_URL);
  if (!res.ok) throw new Error(`POS download failed: HTTP ${res.status}`);
  const { writeFile } = await import('node:fs/promises');
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

function readBeds(filePath) {
  // CRTFD_BED_CNT is text in the file; cast and keep positive counts only.
  return duckdbQuery(`
    SELECT PRVDR_NUM AS ccn, TRY_CAST(CRTFD_BED_CNT AS INTEGER) AS beds
    FROM read_csv('${filePath.replace(/'/g, "''")}', all_varchar=true, ignore_errors=true)
    WHERE PRVDR_CTGRY_CD = '${HOSPITAL_CATEGORY}'
      AND TRY_CAST(CRTFD_BED_CNT AS INTEGER) > 0
      AND PRVDR_NUM IS NOT NULL
  `);
}

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set.');

  const file = await ensureFile();
  const rows = readBeds(file);
  console.log(`POS hospital rows with beds: ${rows.length}`);

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('CREATE TEMP TABLE pos_beds (ccn TEXT PRIMARY KEY, beds INTEGER) ON COMMIT DROP');
    // Bulk insert in batches; dedupe CCNs (POS can list a CCN more than once).
    const seen = new Set();
    const batch = [];
    const flush = async () => {
      if (!batch.length) return;
      const values = batch.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ');
      const params = batch.flatMap((r) => [r.ccn, r.beds]);
      await client.query(`INSERT INTO pos_beds (ccn, beds) VALUES ${values} ON CONFLICT (ccn) DO UPDATE SET beds = GREATEST(pos_beds.beds, EXCLUDED.beds)`, params);
      batch.length = 0;
    };
    for (const r of rows) {
      const ccn = String(r.ccn).trim();
      if (!ccn || seen.has(ccn)) continue;
      seen.add(ccn);
      batch.push({ ccn, beds: r.beds });
      if (batch.length >= 500) await flush();
    }
    await flush();

    const upd = await client.query(`
      UPDATE hospitals h SET beds = p.beds, updated_at = now()
      FROM pos_beds p WHERE h.ccn = p.ccn AND (h.beds IS DISTINCT FROM p.beds)
    `);
    await client.query('COMMIT');

    const cov = (await client.query('SELECT count(*) total, count(beds) with_beds FROM hospitals')).rows[0];
    console.log(`Updated ${upd.rowCount} hospitals.`);
    console.log(`Roster bed coverage: ${cov.with_beds} / ${cov.total}`);
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
