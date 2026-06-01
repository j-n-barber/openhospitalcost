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
import { createReadStream, statSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { loadEnv } from '../db/load-env.js';
import { parseCsv, itemHeaderColumns } from './parse/parsers/csv.js';
import { parseJson } from './parse/parsers/json.js';
import { detectFormat, readHeadBytes } from './parse/detect-format.js';
import { decompress } from './parse/decompress.js';
import { extractCsvPriceRows, extractJsonPriceRows } from './parse/normalize.js';
import { scoreFile } from './quality.js';

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
  if (fmt.container !== 'plain') {
    const d = await decompress({ filePath, container: fmt.container });
    workingPath = d.path;
    payload = d.payload && d.payload !== 'unknown' ? d.payload : payload;
  }

  const metrics = payload === 'json'
    ? await parseJson({ path: workingPath })
    : await parseCsv({ path: workingPath });
  const score = scoreFile(metrics, { asOf });

  let priceRows = [];
  if (metrics.parseStatus !== 'failed') {
    const cptList = [...pidByCpt.keys()];
    priceRows = payload === 'json'
      ? extractJsonPriceRows({ path: workingPath, cptList })
      : extractCsvPriceRows({ path: workingPath, format: metrics.format, cols: itemHeaderColumns(workingPath), cptList });
  }

  return {
    payload, metrics, score, priceRows,
    fileHash: await sha256(filePath), fileSize: statSync(filePath).size,
    effectiveDate: metrics.lastUpdatedOn || null,
  };
}

/**
 * Persist a computeMrf() result in one short transaction. Holds the connection
 * only for the inserts.
 */
export async function persistMrf(client, { hospitalId, url, filePath, computed, pidByCpt }) {
  const { metrics, score, priceRows, fileHash, fileSize, effectiveDate } = computed;
  try {
    await client.query('BEGIN');
    const fileRow = (await client.query(
      `INSERT INTO mrf_files
         (hospital_id, url, file_hash, file_size_bytes, fetched_at, parsed_at, status,
          record_count, quality_score, quality_metrics)
       VALUES ($1,$2,$3,$4, now(), now(), $5, $6, $7, $8)
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
      ]
    )).rows[0];

    let inserted = 0;
    if (metrics.parseStatus !== 'failed') {
      let batch = [];
      const N = 8; // params per row; observed_at uses now() literal
      const flush = async () => {
        if (!batch.length) return;
        const ph = batch.map((_, i) => {
          const b = i * N;
          return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7}, now(), $${b + 8})`;
        }).join(', ');
        const params = batch.flatMap((r) => [
          hospitalId, pidByCpt.get(r.cpt), r.charge_type, r.payer, r.plan, r.amount, fileRow.id, effectiveDate,
        ]);
        await client.query(
          `INSERT INTO price_records
             (hospital_id, procedure_id, charge_type, payer, plan, amount, source_file_id, observed_at, effective_date)
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
  const { fileId, inserted } = await persistMrf(client, { hospitalId: hosp.id, url, filePath, computed, pidByCpt });

  console.log(
    `${hosp.name} (${ccn}): ${computed.metrics.format} | FQS ${computed.score.score} ${computed.score.grade} ` +
    `| money ${computed.score.eligibleForMoneyPages} | price_records +${inserted} | file ${fileId}`
  );
  if (refresh) {
    await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY procedure_hospital_summary');
    console.log('Refreshed procedure_hospital_summary.');
  }
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
