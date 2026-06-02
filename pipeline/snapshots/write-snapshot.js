// pipeline/snapshots/write-snapshot.js
//
// Writes a Parquet snapshot of price_records (joined to hospital + procedure so
// the file is self-describing) and uploads it to R2 for the historical archive
// — this is what powers "↑23% since Jan 2024" and bulk data downloads.
//
// DuckDB does the export: it ATTACHes Neon Postgres directly (postgres scanner)
// and COPYs the joined query straight to Parquet, so no multi-GB result set ever
// passes through Node. The Parquet is uploaded to:
//   snapshots/<cadence>/<YYYY-MM-DD>/price_records.parquet
// and recorded in the `snapshots` table.
//
// Retention is handled by prune-snapshots.js (weekly kept 12 months, monthly
// forever). Cadence is a label only — the caller (GitHub Actions) decides when
// to run weekly vs monthly. Spec: docs/PROJECT_BRIEF.md § 5.
//
// Usage:
//   node pipeline/snapshots/write-snapshot.js --cadence weekly
//   node pipeline/snapshots/write-snapshot.js --cadence monthly --date 2026-06-01

import pg from 'pg';
import { mkdirSync, statSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { loadEnv } from '../../db/load-env.js';
import { duckdbQuery } from '../parse/duckdb.js';
import { r2Configured, snapshotKey, uploadFile } from '../archive/r2.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, 'output'); // gitignored

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

// DuckDB's postgres scanner takes a libpq DSN. Neon's URL carries
// channel_binding=require, which libpq inside DuckDB doesn't accept — strip it;
// sslmode=require already pins TLS.
function duckdbConnString(databaseUrl) {
  return databaseUrl.replace(/[?&]channel_binding=[^&]*/i, '');
}

// Self-describing projection: an analyst can open the Parquet with zero schema
// knowledge. Ordered by hospital+procedure for good Parquet compression/locality.
const SNAPSHOT_SELECT = `
  SELECT
    pr.observed_at, pr.effective_date,
    h.ccn, h.name AS hospital_name, h.state, h.city,
    p.code AS cpt_code, p.name AS procedure_name,
    pr.charge_type, pr.payer, pr.plan, pr.amount,
    pr.methodology, pr.billing_class, pr.setting
  FROM pg.public.price_records pr
  JOIN pg.public.hospitals  h ON h.id = pr.hospital_id
  JOIN pg.public.procedures p ON p.id = pr.procedure_id
  ORDER BY h.ccn, p.code, pr.observed_at`;

/**
 * Export price_records to a local Parquet file via DuckDB→Postgres. Returns the
 * local path. Caller uploads + cleans up.
 */
export function writeParquet({ databaseUrl, outPath }) {
  const dsn = duckdbConnString(databaseUrl).replace(/'/g, "''");
  const escaped = outPath.replace(/'/g, "''");
  const sql = `
    INSTALL postgres; LOAD postgres;
    ATTACH '${dsn}' AS pg (TYPE postgres, READ_ONLY);
    COPY (${SNAPSHOT_SELECT})
      TO '${escaped}' (FORMAT PARQUET, COMPRESSION ZSTD);`;
  // COPY emits no rows; duckdbQuery returns []. A failure throws.
  duckdbQuery(sql, { timeoutMs: 30 * 60 * 1000 });
  return outPath;
}

/** Count rows that will be (or were) snapshotted — for the bookkeeping row. */
function countRows(client) {
  return client.query('SELECT count(*)::bigint AS n FROM price_records').then((r) => r.rows[0].n);
}

export async function writeSnapshot({ client, databaseUrl, cadence, date }) {
  if (!['weekly', 'monthly'].includes(cadence)) {
    throw new Error(`--cadence must be 'weekly' or 'monthly' (got ${cadence ?? 'none'})`);
  }
  if (!r2Configured()) throw new Error('R2 not configured — cannot upload snapshot. Set R2_* in .env.');

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = join(OUTPUT_DIR, `price_records-${cadence}-${date}.parquet`);
  const key = snapshotKey({ cadence, date });

  try {
    const rowCount = await countRows(client);
    console.log(`Exporting ${rowCount} price_records → ${outPath} …`);
    writeParquet({ databaseUrl, outPath });
    const byteSize = statSync(outPath).size;
    console.log(`Parquet written: ${(byteSize / 1e6).toFixed(1)} MB. Uploading to r2://${key} …`);

    await uploadFile({ key, filePath: outPath, contentType: 'application/vnd.apache.parquet' });

    await client.query(
      `INSERT INTO snapshots (cadence, snapshot_date, r2_key, row_count, byte_size)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (cadence, snapshot_date)
       DO UPDATE SET r2_key = EXCLUDED.r2_key, row_count = EXCLUDED.row_count,
                     byte_size = EXCLUDED.byte_size, created_at = now()`,
      [cadence, date, key, rowCount, byteSize]
    );
    console.log(`Snapshot recorded: ${cadence} ${date} (${rowCount} rows, ${(byteSize / 1e6).toFixed(1)} MB).`);
    return { key, rowCount, byteSize };
  } finally {
    rmSync(outPath, { force: true });
  }
}

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set.');
  const cadence = arg('cadence');
  const date = arg('date') || new Date().toISOString().slice(0, 10);

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await writeSnapshot({ client, databaseUrl: process.env.DATABASE_URL, cadence, date });
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
