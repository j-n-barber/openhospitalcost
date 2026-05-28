// pipeline/discovery/ingest-tpafs-links.js
//
// Bootstraps `hospitals.mrf_file_url` from the TPAFS open-data CSV at
// https://github.com/TPAFS/transparency-data. CCN is the join key. CC-BY-SA-4.0.
//
// Caveats:
//   - The TPAFS dataset was last refreshed around 2022 (per their entry_date
//     column). Many of these URLs will be stale by now. Phase C must
//     re-validate each URL (HEAD probe) before downloading, and fall back to
//     re-scraping the hospital's cms-hpt.txt when the direct URL 404s.
//   - We never overwrite a hospital that already has mrf_file_url set —
//     a freshly-scraped URL (from scrape-cms-hpt.js) is authoritative over
//     this stale dataset.
//   - file_format from TPAFS sometimes disagrees with what the URL implies.
//     Prefer the file extension inferred from the URL.
//
// Goal: take us from ~69 hospitals with mrf_file_url to ~4,000+ in one shot.

import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import pg from 'pg';
import { loadEnv } from '../../db/load-env.js';

const TPAFS_CSV_URL =
  'https://raw.githubusercontent.com/TPAFS/transparency-data/main/price_transparency/hospitals/machine_readable_links.csv';
const LOCAL_PATH = '/tmp/tpafs-links.csv';

loadEnv();

function inferFormat(url) {
  if (!url) return null;
  const u = url.toLowerCase().split(/[?#]/)[0];
  if (u.endsWith('.zip')) return 'zip';
  if (u.endsWith('.json')) return 'json';
  if (u.endsWith('.csv')) return 'csv';
  if (u.endsWith('.xml')) return 'xml';
  if (u.endsWith('.ashx')) return 'ashx';
  return null;
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  return buf.length;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set.');
    process.exit(1);
  }

  console.log(`Downloading TPAFS dataset...`);
  const bytes = await download(TPAFS_CSV_URL, LOCAL_PATH);
  console.log(`  ${bytes} bytes → ${LOCAL_PATH}`);

  const csv = readFileSync(LOCAL_PATH, 'utf8');
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
  });
  console.log(`Parsed ${records.length} rows from TPAFS`);

  // Collapse to one entry per CCN, keeping the row with the most recent
  // last_updated_date / entry_date and a non-empty URL.
  const byCcn = new Map();
  for (const r of records) {
    const ccn = (r['ccn'] ?? '').trim();
    const url = (r['machine_readable_url'] ?? '').trim();
    if (!ccn || !url) continue;
    const existing = byCcn.get(ccn);
    const score =
      (r['last_updated_date'] ?? '') + '|' + (r['entry_date'] ?? '');
    if (!existing || score > existing.score) {
      byCcn.set(ccn, { row: r, score });
    }
  }
  console.log(`${byCcn.size} unique CCNs with at least one URL`);

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let updated = 0;
  let alreadyHadUrl = 0;
  let notInRoster = 0;
  const byType = new Map();
  const byState = new Map();

  try {
    await client.query('BEGIN');

    for (const [ccn, { row }] of byCcn) {
      const url = row['machine_readable_url'].trim();
      const fmtFromUrl = inferFormat(url);
      const fmtFromTpafs = (row['file_format'] ?? '').toLowerCase().trim() || null;
      const fmt = fmtFromUrl ?? fmtFromTpafs ?? null;

      const result = await client.query(
        `UPDATE hospitals
           SET mrf_file_url = $1,
               mrf_format   = COALESCE(mrf_format, $2),
               updated_at   = now()
         WHERE ccn = $3
           AND mrf_file_url IS NULL
         RETURNING hospital_type, state`,
        [url, fmt, ccn]
      );

      if (result.rowCount === 0) {
        // Either not in our roster, or already had mrf_file_url
        const exists = await client.query(
          `SELECT mrf_file_url FROM hospitals WHERE ccn = $1`,
          [ccn]
        );
        if (exists.rows.length === 0) notInRoster++;
        else alreadyHadUrl++;
      } else {
        const hr = result.rows[0];
        updated++;
        byType.set(hr.hospital_type, (byType.get(hr.hospital_type) ?? 0) + 1);
        byState.set(hr.state, (byState.get(hr.state) ?? 0) + 1);
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }

  console.log('');
  console.log('=== TPAFS ingest summary ===');
  console.log(`URLs in TPAFS:              ${byCcn.size}`);
  console.log(`Hospitals updated:          ${updated}`);
  console.log(`Hospitals that already had a URL (untouched): ${alreadyHadUrl}`);
  console.log(`TPAFS CCNs not in our roster: ${notInRoster}`);
  console.log('');
  console.log('Updates by hospital type:');
  for (const [type, n] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${type ?? '(none)'}`);
  }
  console.log('');
  console.log('Top 10 states by new URLs:');
  const sortedStates = [...byState.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [s, n] of sortedStates) {
    console.log(`  ${s}  ${n}`);
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
