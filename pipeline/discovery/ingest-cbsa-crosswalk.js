// pipeline/discovery/ingest-cbsa-crosswalk.js
//
// Populates the `cbsa` table and hospitals.cbsa_code from the Census CBSA
// population-estimates file (one file gives both the metro population and the
// county->CBSA mapping). See docs/QUALITY_RUBRIC.md § 1.5.
//
// The file has two relevant row kinds (LSAD column):
//   - 'Metropolitan Statistical Area' -> CBSA code, name, POPESTIMATE
//   - 'County or equivalent'          -> CBSA code + "County Name, ST"
//
// Hospitals carry a bare uppercase county ("LOS ANGELES") + lowercase state
// ("ca"); we normalize the Census county name to match (strip the trailing
// County/Parish/Borough/etc and the ", ST" suffix). Exact join on (county, state).
//
// Usage:
//   CBSA_FILE=/path/to/cbsa.csv npm run ingest:cbsa-crosswalk   # local file
//   npm run ingest:cbsa-crosswalk                               # download below

import pg from 'pg';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEnv } from '../../db/load-env.js';
import { duckdbQuery } from '../parse/duckdb.js';

const CBSA_URL =
  'https://www2.census.gov/programs-surveys/popest/datasets/2020-2023/metro/totals/cbsa-est2023-alldata.csv';
const POP_COL = 'POPESTIMATE2023';

async function ensureFile() {
  if (process.env.CBSA_FILE) {
    if (!existsSync(process.env.CBSA_FILE)) throw new Error(`CBSA_FILE not found: ${process.env.CBSA_FILE}`);
    return process.env.CBSA_FILE;
  }
  const dest = join(tmpdir(), 'ohc-cbsa.csv');
  if (existsSync(dest)) return dest;
  console.log(`Downloading Census CBSA file -> ${dest}`);
  const res = await fetch(CBSA_URL);
  if (!res.ok) throw new Error(`CBSA download failed: HTTP ${res.status}`);
  const { writeFile } = await import('node:fs/promises');
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

function q(filePath) {
  return `read_csv('${filePath.replace(/'/g, "''")}', all_varchar=true, ignore_errors=true)`;
}

// Trailing county-equivalent words to strip so "Los Angeles County" -> "LOS ANGELES".
const COUNTY_SUFFIX = `' (County|Parish|Borough|Census Area|Municipality|Municipio|City and Borough|city)$'`;

function readMetros(file) {
  return duckdbQuery(`
    SELECT CBSA AS cbsa_code, NAME AS name, TRY_CAST(${POP_COL} AS INTEGER) AS population
    FROM ${q(file)}
    WHERE LSAD = 'Metropolitan Statistical Area' AND CBSA IS NOT NULL
  `);
}

function readCounties(file) {
  // Emit normalized (county, state) -> cbsa_code for the Postgres join.
  return duckdbQuery(`
    SELECT
      CBSA AS cbsa_code,
      upper(regexp_replace(trim(split_part(NAME, ',', 1)), ${COUNTY_SUFFIX}, '', 'i')) AS county,
      lower(trim(split_part(NAME, ',', 2))) AS state
    FROM ${q(file)}
    WHERE LSAD = 'County or equivalent' AND CBSA IS NOT NULL
  `);
}

async function bulkInsert(client, table, cols, rows, dedupeKey) {
  const seen = new Set();
  let batch = [];
  const flush = async () => {
    if (!batch.length) return;
    const ph = batch
      .map((_, i) => `(${cols.map((__, j) => `$${i * cols.length + j + 1}`).join(', ')})`)
      .join(', ');
    const params = batch.flatMap((r) => cols.map((c) => r[c]));
    await client.query(`INSERT INTO ${table} (${cols.join(', ')}) VALUES ${ph} ON CONFLICT DO NOTHING`, params);
    batch = [];
  };
  for (const r of rows) {
    const key = dedupeKey(r);
    if (key === null || seen.has(key)) continue;
    seen.add(key);
    batch.push(r);
    if (batch.length >= 400) await flush();
  }
  await flush();
}

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set.');
  const file = await ensureFile();

  const metros = readMetros(file);
  const counties = readCounties(file);
  console.log(`Census: ${metros.length} metros, ${counties.length} county rows`);

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    await bulkInsert(client, 'cbsa', ['cbsa_code', 'name', 'population'], metros, (r) => r.cbsa_code);

    // County map -> temp table, then a single set-based UPDATE on (county, state).
    await client.query('CREATE TEMP TABLE county_cbsa (county TEXT, state TEXT, cbsa_code TEXT) ON COMMIT DROP');
    await bulkInsert(
      client, 'county_cbsa', ['county', 'state', 'cbsa_code'], counties,
      (r) => (r.county && r.state ? `${r.county}|${r.state}` : null)
    );
    // Only assign codes that exist in cbsa (we loaded Metropolitan only; counties
    // in Micropolitan areas won't match and stay NULL — intended).
    const upd = await client.query(`
      UPDATE hospitals h SET cbsa_code = c.cbsa_code, updated_at = now()
      FROM county_cbsa c
      WHERE upper(h.county) = c.county AND lower(h.state) = c.state
        AND EXISTS (SELECT 1 FROM cbsa cb WHERE cb.cbsa_code = c.cbsa_code)
    `);
    await client.query('COMMIT');

    const cov = (await client.query(
      'SELECT count(*) total, count(cbsa_code) with_cbsa FROM hospitals'
    )).rows[0];
    console.log(`Matched ${upd.rowCount} hospitals to a metro.`);
    console.log(`Roster CBSA coverage: ${cov.with_cbsa} / ${cov.total} (rest are non-metro/unmatched)`);
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
