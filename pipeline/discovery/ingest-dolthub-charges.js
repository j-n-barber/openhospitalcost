// pipeline/discovery/ingest-dolthub-charges.js
//
// Bootstrap from dolthub/standard-charge-files (CC-BY-SA-4.0). This dataset
// is sourced from CMS hospital enrollment data and contains 7,231 hospitals
// with: ccn, organization_name, homepage URL, and standard_charge_file_url.
//
// Coverage in their dataset (as of probe 2026-05-28):
//   - 7,143 / 7,231 rows have a homepage URL
//   - 4,205 / 7,231 rows have a standard_charge_file_url
//
// This pass populates our hospitals table where currently NULL:
//   - mrf_file_url ← standard_charge_file_url (direct MRF download URL)
//   - mrf_root_url ← <homepage>/cms-hpt.txt (we then re-run scrape:cms-hpt
//     to harvest fresh URLs from these root locators)
//
// Never overwrites existing values — preserves what scrape:cms-hpt
// produced from live fetches.
//
// API: https://www.dolthub.com/api/v1alpha1/dolthub/standard-charge-files/main?q=<SQL>
// Pagination: 1000 rows per response (LIMIT/OFFSET), status="RowLimit" when capped.

import pg from 'pg';
import { loadEnv } from '../../db/load-env.js';

const API_BASE =
  'https://www.dolthub.com/api/v1alpha1/dolthub/standard-charge-files/main';
const PAGE_SIZE = 1000;

loadEnv();

function deriveRootUrl(homepage) {
  if (!homepage) return null;
  try {
    const u = new URL(homepage);
    if (!u.protocol.startsWith('http')) return null;
    return `${u.protocol}//${u.host}/cms-hpt.txt`;
  } catch {
    return null;
  }
}

function inferFormat(url) {
  if (!url) return null;
  const u = url.toLowerCase().split(/[?#]/)[0];
  if (u.endsWith('.zip')) return 'zip';
  if (u.endsWith('.json')) return 'json';
  if (u.endsWith('.csv')) return 'csv';
  if (u.endsWith('.xml')) return 'xml';
  if (u.endsWith('.ashx')) return 'ashx';
  if (u.endsWith('.pdf')) return 'pdf'; // not a valid MRF; flag for triage
  return null;
}

async function fetchPage(offset) {
  const sql = `SELECT ccn, organization_name, homepage, standard_charge_file_url FROM hospitals WHERE ccn IS NOT NULL AND ccn != '' ORDER BY ccn LIMIT ${PAGE_SIZE} OFFSET ${offset}`;
  const url = `${API_BASE}?q=${encodeURIComponent(sql)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`dolthub API: ${res.status} ${res.statusText}`);
  const j = await res.json();
  if (j.query_execution_status === 'Error') {
    throw new Error(`dolthub API error: ${j.query_execution_message}`);
  }
  return j.rows ?? [];
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set.');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let offset = 0;
  let totalSeen = 0;
  let fileUrlSet = 0;
  let rootUrlSet = 0;
  let notInRoster = 0;
  let pdfFiltered = 0;

  console.log('Paginating dolthub/standard-charge-files...');

  try {
    await client.query('BEGIN');

    while (true) {
      const rows = await fetchPage(offset);
      if (rows.length === 0) break;
      console.log(`  offset=${offset} → ${rows.length} rows`);

      for (const r of rows) {
        totalSeen++;
        const ccn = (r.ccn ?? '').trim();
        if (!ccn) continue;

        const exists = await client.query(
          `SELECT id, mrf_file_url, mrf_root_url FROM hospitals WHERE ccn = $1`,
          [ccn]
        );
        if (exists.rows.length === 0) {
          notInRoster++;
          continue;
        }
        const h = exists.rows[0];

        // mrf_file_url ← standard_charge_file_url (only if NULL)
        const candidateFileUrl = (r.standard_charge_file_url ?? '').trim();
        if (candidateFileUrl && !h.mrf_file_url) {
          const fmt = inferFormat(candidateFileUrl);
          if (fmt === 'pdf') {
            pdfFiltered++;
          } else {
            await client.query(
              `UPDATE hospitals
                 SET mrf_file_url = $1,
                     mrf_format   = COALESCE(mrf_format, $2),
                     updated_at   = now()
               WHERE id = $3`,
              [candidateFileUrl, fmt, h.id]
            );
            fileUrlSet++;
          }
        }

        // mrf_root_url ← <homepage>/cms-hpt.txt (only if NULL)
        const candidateRoot = deriveRootUrl(r.homepage);
        if (candidateRoot && !h.mrf_root_url) {
          await client.query(
            `UPDATE hospitals
               SET mrf_root_url = $1, updated_at = now()
             WHERE id = $2`,
            [candidateRoot, h.id]
          );
          rootUrlSet++;
        }
      }

      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }

  console.log('');
  console.log('=== DoltHub ingest summary ===');
  console.log(`Rows seen:                ${totalSeen}`);
  console.log(`mrf_file_url newly set:   ${fileUrlSet}`);
  console.log(`mrf_root_url newly set:   ${rootUrlSet}`);
  console.log(`CCN not in our roster:    ${notInRoster}`);
  console.log(`PDF URLs filtered out:    ${pdfFiltered}  (not valid MRFs)`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
