// pipeline/ingest-mrf.js
//
// Per-hospital MRF ingest job: parse -> score -> persist mrf_files -> normalize
// to price_records -> (optionally) refresh the summary view. This is the
// PROJECT_BRIEF § 5 "per-hospital ingestion job", minus the download stage
// (fetching lives in pipeline/fetch + the discovery scrapers; here we start
// from a file already on disk so it can be validated against the spike samples).
//
// Usage:
//   node pipeline/ingest-mrf.js --ccn 360180 --file /path/to/mrf.csv [--refresh]
//
// --refresh rebuilds procedure_hospital_summary at the end (skip when ingesting
// many hospitals in a loop; refresh once after the batch).

import pg from 'pg';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { loadEnv } from '../db/load-env.js';
import { parseCsv, itemHeaderColumns } from './parse/parsers/csv.js';
import { parseJson } from './parse/parsers/json.js';
import { detectFormat, readHeadBytes } from './parse/detect-format.js';
import { decompress } from './parse/decompress.js';
import { extractCsvPriceRows } from './parse/normalize.js';
import { scoreFile } from './quality.js';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

async function ingestOne(client, opts) {
  try {
    return await ingestOneInner(client, opts);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  }
}

async function ingestOneInner(client, { ccn, filePath, url, asOf, refresh }) {
  const hosp = (await client.query('SELECT id, ccn, name FROM hospitals WHERE ccn = $1', [ccn])).rows[0];
  if (!hosp) throw new Error(`No hospital with ccn=${ccn}`);

  // Detect + decompress to a working file.
  const fmt = detectFormat({ headBytes: readHeadBytes(filePath), url });
  let workingPath = filePath;
  let payload = fmt.payload;
  if (fmt.container !== 'plain') {
    const d = await decompress({ filePath, container: fmt.container });
    workingPath = d.path;
    payload = d.payload && d.payload !== 'unknown' ? d.payload : payload;
  }

  // Parse + score.
  const metrics = payload === 'json'
    ? await parseJson({ path: workingPath })
    : await parseCsv({ path: workingPath });
  const score = scoreFile(metrics, { asOf });

  await client.query('BEGIN');
  // Persist the mrf_files row.
  const fileRow = (await client.query(
    `INSERT INTO mrf_files
       (hospital_id, url, file_hash, file_size_bytes, fetched_at, parsed_at, status,
        record_count, quality_score, quality_metrics)
     VALUES ($1,$2,$3,$4, now(), now(), $5, $6, $7, $8)
     RETURNING id`,
    [
      hosp.id,
      url || `file://${filePath}`,
      sha256(filePath),
      statSync(filePath).size,
      metrics.parseStatus === 'failed' ? 'failed' : 'parsed',
      metrics.rowsParsed,
      score.score,
      JSON.stringify({ ...score, metrics: undefined }),
    ]
  )).rows[0];

  // Normalize -> price_records (CSV only for now; JSON normalizer is next).
  let inserted = 0;
  if (payload !== 'json' && metrics.parseStatus !== 'failed') {
    const cols = itemHeaderColumns(workingPath);
    const procs = (await client.query("SELECT id, code FROM procedures WHERE code_type = 'CPT'")).rows;
    const pidByCpt = new Map(procs.map((p) => [p.code, p.id]));
    const priceRows = extractCsvPriceRows({
      path: workingPath, format: metrics.format, cols, cptList: [...pidByCpt.keys()],
    });

    const effective = metrics.lastUpdatedOn || null;
    let batch = [];
    const N = 8; // params per row; observed_at uses now() literal
    const flush = async () => {
      if (!batch.length) return;
      const ph = batch.map((_, i) => {
        const b = i * N;
        return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7}, now(), $${b + 8})`;
      }).join(', ');
      const params = batch.flatMap((r) => [
        hosp.id, pidByCpt.get(r.cpt), r.charge_type, r.payer, r.plan, r.amount, fileRow.id, effective,
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

  console.log(
    `${hosp.name} (${ccn}): ${metrics.format} | FQS ${score.score} ${score.grade} ` +
    `| money ${score.eligibleForMoneyPages} | price_records +${inserted} | file ${fileRow.id}`
  );

  if (refresh) {
    await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY procedure_hospital_summary');
    console.log('Refreshed procedure_hospital_summary.');
  }
  return { score, inserted };
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
      // Score freshness against the ingest date (today), not the file's own date.
      asOf: arg('asOf') || new Date().toISOString().slice(0, 10),
      refresh: process.argv.includes('--refresh'),
    });
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
