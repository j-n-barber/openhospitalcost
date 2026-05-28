// pipeline/discovery/geocode-hospitals.js
// Geocodes hospitals via the U.S. Census Geocoder batch endpoint.
// Free, no API key required, max 10,000 addresses per batch.
//
// Idempotent: only geocodes hospitals where latitude/longitude is still NULL.
// Re-runnable to retry hospitals that didn't match on previous runs.
//
// Census documentation:
//   https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.pdf
//
// Response field order (no header row, comma-delimited):
//   0 Unique ID
//   1 Input Address
//   2 Match Status (Match / No_Match / Tie)
//   3 Match Type (Exact / Non_Exact)
//   4 Matched Address
//   5 Coordinates ("longitude,latitude" — x,y order)
//   6 TIGER Line ID
//   7 Side (L / R)

import { writeFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import pg from 'pg';
import { loadEnv } from '../../db/load-env.js';

const CENSUS_URL = 'https://geocoding.geo.census.gov/geocoder/locations/addressbatch';
const BENCHMARK = 'Public_AR_Current';
const BATCH_SIZE = 10000;
const TIMEOUT_MS = 10 * 60 * 1000; // Census batches can take several minutes

loadEnv();

function csvEscape(v) {
  const s = String(v ?? '').replace(/"/g, '').replace(/[\r\n]+/g, ' ').trim();
  return `"${s}"`;
}

async function geocodeBatch(rows, batchIndex, batchTotal) {
  const csv = rows
    .map((r) =>
      [r.id, r.address_line1, r.city, r.state.toUpperCase(), r.zip || '']
        .map(csvEscape)
        .join(',')
    )
    .join('\n');

  writeFileSync(`/tmp/census-input-${batchIndex}.csv`, csv);
  console.log(`  Batch ${batchIndex + 1}/${batchTotal}: ${rows.length} addresses, POSTing...`);

  const form = new FormData();
  form.append('addressFile', new Blob([csv], { type: 'text/csv' }), 'input.csv');
  form.append('benchmark', BENCHMARK);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(CENSUS_URL, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }

  if (!res.ok) {
    throw new Error(`Census returned ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  writeFileSync(`/tmp/census-output-${batchIndex}.csv`, text);
  console.log(`  Batch ${batchIndex + 1}: response ${text.length} bytes`);

  // Census responses have variable column counts: Match rows have 8
  // columns, No_Match rows have 3 (no Match Type / Matched Address /
  // Coordinates / TIGER ID / Side). Allow variable lengths.
  const records = parse(text, {
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  });
  return records;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set.');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const { rows } = await client.query(`
    SELECT id, ccn, address_line1, city, state, zip
    FROM hospitals
    WHERE (latitude IS NULL OR longitude IS NULL)
      AND address_line1 IS NOT NULL
      AND city IS NOT NULL
      AND state IS NOT NULL
    ORDER BY ccn
  `);

  console.log(`${rows.length} hospitals need geocoding`);
  if (rows.length === 0) {
    console.log('Nothing to do.');
    await client.end();
    return;
  }

  const batches = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    batches.push(rows.slice(i, i + BATCH_SIZE));
  }

  let totalMatched = 0;
  let totalNoMatch = 0;
  let totalTie = 0;
  let totalEmptyCoords = 0;

  for (let bi = 0; bi < batches.length; bi++) {
    const records = await geocodeBatch(batches[bi], bi, batches.length);

    await client.query('BEGIN');
    try {
      for (const rec of records) {
        const [id, , status, , , coords] = rec;
        if (status === 'Match') {
          if (!coords) {
            totalEmptyCoords++;
            continue;
          }
          const [lngStr, latStr] = coords.split(',');
          const lng = parseFloat(lngStr);
          const lat = parseFloat(latStr);
          if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
            totalEmptyCoords++;
            continue;
          }
          await client.query(
            `UPDATE hospitals SET latitude = $1, longitude = $2, updated_at = now()
             WHERE id = $3`,
            [lat, lng, id]
          );
          totalMatched++;
        } else if (status === 'No_Match') {
          totalNoMatch++;
        } else if (status === 'Tie') {
          totalTie++;
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  console.log('');
  console.log('=== Geocoding summary ===');
  console.log(`Matched (coords saved): ${totalMatched}`);
  console.log(`No match:               ${totalNoMatch}`);
  console.log(`Tie (ambiguous):        ${totalTie}`);
  console.log(`Match w/ empty coords:  ${totalEmptyCoords}`);
  console.log(`Match rate:             ${((totalMatched / rows.length) * 100).toFixed(1)}%`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
