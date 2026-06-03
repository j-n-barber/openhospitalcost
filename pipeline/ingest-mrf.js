// pipeline/ingest-mrf.js
//
// Per-hospital MRF ingest, split so the long no-DB work (detect → decompress →
// parse → score → normalize) runs WITHOUT holding a database connection, and
// only the brief writes hold one. This matters under Neon: a connection left
// idle through a multi-minute download or an 80 s DuckDB parse gets dropped,
// and an unhandled drop crashes the process (see run-ingest-batch.js, which
// keeps the connection in a pool and checks one out only for persistMrf).
//
//   computeMrf()  -> no DB; returns metrics, score, priceRows, file hash/size
//   persistMrf()  -> short transaction: mrf_files + price_records
//   ingestOne()   -> CLI convenience that wires DB lookups around the two
//
// Usage:
//   node pipeline/ingest-mrf.js --ccn 360180 --file /path/to/mrf.csv [--refresh]

import pg from 'pg';
import { createHash } from 'node:crypto';
import { createReadStream, statSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { loadEnv } from '../db/load-env.js';
import { parseCsv } from './parse/parsers/csv.js';
import { parseJson } from './parse/parsers/json.js';
import { detectFormat, readHeadBytes } from './parse/detect-format.js';
import { decompress } from './parse/decompress.js';
import { extractCsvPriceRows, extractJsonPriceRows } from './parse/normalize.js';
import { scoreFile } from './quality.js';
import { r2Configured, rawKey, objectExists, uploadFile } from './archive/r2.js';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
// Stream the hash — readFileSync throws on files > 2 GB (Node Buffer limit),
// and several MRFs exceed that (Cleveland-class, plus 2–5 GB outliers).
async function sha256(path) {
  const hash = createHash('sha256');
  await pipeline(createReadStream(path), hash);
  return hash.digest('hex');
}

export async function fetchCptMap(client) {
  const procs = (await client.query("SELECT id, code FROM procedures WHERE code_type = 'CPT'")).rows;
  return new Map(procs.map((p) => [p.code, p.id]));
}

/**
 * Detect/decompress/parse/score/normalize a file. NO database access — pass the
 * CPT dictionary in so normalization is self-contained. Safe to run while no
 * connection is held.
 */
export async function computeMrf({ filePath, url, asOf, pidByCpt }) {
  const fmt = detectFormat({ headBytes: readHeadBytes(filePath), url });
  let workingPath = filePath;
  let payload = fmt.payload;
  let decompressDir = null;
  if (fmt.container !== 'plain') {
    const d = await decompress({ filePath, container: fmt.container });
    workingPath = d.path;
    decompressDir = dirname(d.path); // ohc-mrf-ohc-mrf-<ccn>/ — clean it after parsing
    payload = d.payload && d.payload !== 'unknown' ? d.payload : payload;
  }

  try {
    const metrics = payload === 'json'
      ? await parseJson({ path: workingPath })
      : await parseCsv({ path: workingPath });
    const score = scoreFile(metrics, { asOf });

    let priceRows = [];
    if (metrics.parseStatus !== 'failed') {
      const cptList = [...pidByCpt.keys()];
      priceRows = payload === 'json'
        ? extractJsonPriceRows({ path: workingPath, cptList })
        : extractCsvPriceRows({ path: workingPath, format: metrics.format, cols: metrics.cols, skip: metrics.skip, cptList });
    }

    return {
      payload, metrics, score, priceRows,
      fileHash: await sha256(filePath), fileSize: statSync(filePath).size,
      effectiveDate: metrics.lastUpdatedOn || null,
    };
  } finally {
    // Remove the decompressed temp dir (can be GBs, e.g. Cleveland's 1.5 GB) so
    // bulk runs don't fill the local disk. The original download is cleaned by
    // the caller's finally; this is the extracted copy.
    if (decompressDir) {
      try { rmSync(decompressDir, { recursive: true, force: true }); } catch { /* best effort */ }
    }
    // Clear DuckDB's spill dir too: a SIGKILL'd giant-JSON parse can leave GBs of
    // spill behind, which would otherwise accumulate and refill the disk.
    try { rmSync('/tmp/ohc-duckdb-spill', { recursive: true, force: true }); } catch { /* best effort */ }
  }
}

/**
 * Archive the raw MRF to R2 (raw/<ccn>/<date>/<hash>.<ext>), streaming so GB
 * files never buffer in memory. Returns the object key, or null when R2 is not
 * configured or the upload fails — archival must never block ingest. Skips the
 * upload if an object with the same content-hash key already exists (re-run /
 * unchanged file). Runs OUTSIDE the DB transaction; the key is handed to
 * persistMrf to record.
 */
export async function archiveRawMrf({ ccn, filePath, computed, sourceUrl }) {
  if (!r2Configured()) return null;
  const key = rawKey({
    ccn,
    fetchedAt: new Date(),
    hash: computed.fileHash,
    sourceUrl,
    payload: computed.payload,
  });
  try {
    if (await objectExists(key)) return key; // identical bytes already archived
    const contentType = computed.payload === 'json' ? 'application/json'
      : computed.payload === 'csv' ? 'text/csv'
      : 'application/octet-stream';
    await uploadFile({ key, filePath, contentType });
    return key;
  } catch (err) {
    console.warn(`  ! R2 archive failed for ${ccn} (${key}): ${err.message}`);
    return null;
  }
}

// Derive procedure_hospital_summary rows for one file from the _stage TEMP table
// and replace the hospital's existing summary. This is the migration-008
// representative-price logic (facility-preferred tier → ≥$1 → median/min/max/
// payer_count), so the numbers are identical to the old matview. Raw detail does
// NOT persist in Postgres — _stage is a per-transaction TEMP table (ON COMMIT
// DROP), so the live price_records table is never written and there is zero
// bloat. The raw rows live in R2 (lakehouse offload).
async function refreshSummaryFromStage(client, { hospitalId }) {
  await client.query('DELETE FROM procedure_hospital_summary WHERE hospital_id = $1', [hospitalId]);
  await client.query(
    `INSERT INTO procedure_hospital_summary
       (hospital_id, procedure_id, charge_type, observations, payer_count, amount, min_amount, max_amount, observed_at, source_file_id, basis)
     WITH pr AS (
       SELECT hospital_id, procedure_id, charge_type, payer, amount, source_file_id, observed_at,
         CASE WHEN lower(billing_class) = 'facility' AND lower(setting) LIKE 'out%' THEN 1
              WHEN lower(billing_class) = 'facility' THEN 2 ELSE 3 END AS pref
       FROM _stage
       WHERE amount >= 1
     ),
     ranked AS (
       SELECT *, min(pref) OVER (PARTITION BY hospital_id, procedure_id, charge_type) AS best FROM pr
     )
     SELECT hospital_id, procedure_id, charge_type,
       count(*)::int, count(DISTINCT payer)::int,
       round(percentile_cont(0.5) WITHIN GROUP (ORDER BY amount)::numeric, 2),
       round(min(amount)::numeric, 2), round(max(amount)::numeric, 2),
       max(observed_at), (array_agg(source_file_id))[1],
       CASE min(pref) WHEN 1 THEN 'facility_outpatient' WHEN 2 THEN 'facility' ELSE 'all' END
     FROM ranked WHERE pref = best
     GROUP BY hospital_id, procedure_id, charge_type`
  );
}

/**
 * Persist a computeMrf() result in one short transaction. Stages the price rows,
 * derives the hospital's summary from them, archives nothing here (raw MRF was
 * already streamed to R2 by archiveRawMrf), then clears the staged rows so
 * Postgres holds only the summary. `r2RawKey` is recorded on the mrf_files row.
 */
export async function persistMrf(client, { hospitalId, url, filePath, computed, pidByCpt, r2RawKey = null }) {
  const { metrics, score, priceRows, fileHash, fileSize, effectiveDate } = computed;
  try {
    await client.query('BEGIN');
    const fileRow = (await client.query(
      `INSERT INTO mrf_files
         (hospital_id, url, file_hash, file_size_bytes, fetched_at, parsed_at, status,
          record_count, quality_score, quality_metrics,
          r2_raw_key, r2_raw_uploaded_at, r2_raw_expires_at)
       VALUES ($1,$2,$3,$4, now(), now(), $5, $6, $7, $8,
          $9,
          CASE WHEN $9::text IS NULL THEN NULL ELSE now() END,
          CASE WHEN $9::text IS NULL THEN NULL ELSE now() + interval '30 days' END)
       RETURNING id`,
      [
        hospitalId,
        url || `file://${filePath}`,
        fileHash,
        fileSize,
        metrics.parseStatus === 'failed' ? 'failed' : 'parsed',
        metrics.rowsParsed,
        score.score,
        JSON.stringify({ ...score, metrics: undefined }),
        r2RawKey,
      ]
    )).rows[0];

    let inserted = 0;
    if (metrics.parseStatus !== 'failed') {
      // Stage this file's rows in a per-transaction TEMP table (auto-dropped on
      // commit) so the live price_records table is never written — no bloat.
      await client.query('CREATE TEMP TABLE _stage (LIKE price_records INCLUDING DEFAULTS) ON COMMIT DROP');
      let batch = [];
      const N = 12; // params per row; observed_at uses now() literal
      const flush = async () => {
        if (!batch.length) return;
        const ph = batch.map((_, i) => {
          const b = i * N;
          return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},$${b + 11}, now(), $${b + 12})`;
        }).join(', ');
        const params = batch.flatMap((r) => [
          hospitalId, pidByCpt.get(r.cpt), r.charge_type, r.payer ?? null, r.plan ?? null, r.amount,
          r.methodology ?? null, r.billing_class ?? null, r.setting ?? null, r.modifiers ?? null, fileRow.id, effectiveDate,
        ]);
        await client.query(
          `INSERT INTO _stage
             (hospital_id, procedure_id, charge_type, payer, plan, amount, methodology, billing_class, setting, modifiers, source_file_id, observed_at, effective_date)
           VALUES ${ph}`,
          params
        );
        inserted += batch.length;
        batch = [];
      };
      for (const r of priceRows) {
        if (!pidByCpt.has(r.cpt) || r.amount == null) continue;
        batch.push(r);
        if (batch.length >= 500) await flush();
      }
      await flush();
      // Derive the summary from the staged rows; the TEMP table drops on commit.
      await refreshSummaryFromStage(client, { hospitalId });
    }
    await client.query('COMMIT');
    return { fileId: fileRow.id, inserted };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  }
}

/** CLI/single-file convenience: looks up the hospital + CPT map, then compute+persist. */
export async function ingestOne(client, { ccn, filePath, url, asOf, refresh }) {
  const hosp = (await client.query('SELECT id, ccn, name FROM hospitals WHERE ccn = $1', [ccn])).rows[0];
  if (!hosp) throw new Error(`No hospital with ccn=${ccn}`);
  const pidByCpt = await fetchCptMap(client);
  const computed = await computeMrf({ filePath, url, asOf, pidByCpt });
  const r2RawKey = await archiveRawMrf({ ccn, filePath, computed, sourceUrl: url });
  const { fileId, inserted } = await persistMrf(client, { hospitalId: hosp.id, url, filePath, computed, pidByCpt, r2RawKey });

  console.log(
    `${hosp.name} (${ccn}): ${computed.metrics.format} | FQS ${computed.score.score} ${computed.score.grade} ` +
    `| money ${computed.score.eligibleForMoneyPages} | price_records +${inserted} | file ${fileId}` +
    `${r2RawKey ? ` | r2 ${r2RawKey}` : ''}`
  );
  // procedure_hospital_summary is maintained incrementally by persistMrf now
  // (it's a table, not a matview) — no refresh needed. `refresh` kept for CLI compat.
  void refresh;
  return { score: computed.score, inserted };
}

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set.');
  const ccn = arg('ccn');
  const filePath = arg('file');
  if (!ccn || !filePath) throw new Error('Usage: --ccn <ccn> --file <path> [--refresh]');

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await ingestOne(client, {
      ccn, filePath, url: arg('url'),
      asOf: arg('asOf') || new Date().toISOString().slice(0, 10),
      refresh: process.argv.includes('--refresh'),
    });
  } finally {
    await client.end();
  }
}

// Only run as a CLI when invoked directly — not when imported.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
