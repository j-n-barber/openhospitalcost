// pipeline/parse/parsers/csv.js
//
// CSV MRF parser. Returns a FileMetrics object (docs/QUALITY_RUBRIC.md § 1.1)
// for pipeline/quality.js scoreFile() to score. Verified against the three
// real spike CSVs: Spencer (v2.0.0 wide), CHOP and Cleveland Clinic (v3.0.0 tall).
//
// Spike findings handled (docs/PARSER_NOTES.md §§ 2-5, 8-9):
//   - 3-row header preamble -> DuckDB skip=2, header=true, all_varchar=true.
//   - Dirty CSVs are the norm: strict_mode=false + ignore_errors=true, with
//     store_rejects=true to count quarantined rows for the rubric.
//   - WIDE (v2): payers inlined as standard_charge|<payer>|<plan>|negotiated_*
//     columns. TALL (v3): payer_name/plan_name rows. We detect mode by the
//     presence of a payer_name column, not by version string (more robust).
//   - Standardized code can live in ANY code|N|type slot (CHOP puts APR-DRG in
//     code|1). We scan every code|N|type for a recognized national code system.

import { parse as parseCsvSync } from 'csv-parse/sync';
import { readHeadBytes, stripBom } from '../detect-format.js';
import { duckdbQuery } from '../duckdb.js';

// National code systems we can map to procedures.json. CDM / LOCAL / null are
// the hospital's internal codes and do NOT count toward standardized coverage.
export const STANDARDIZED_CODE_TYPES = ['CPT', 'HCPCS', 'MS-DRG', 'APR-DRG', 'DRG', 'APC', 'EAPG'];

const PREAMBLE_BYTES = 131072; // enough for the long attestation cell + 200+ wide column names

function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}
function sqlIdent(col) {
  return `"${col.replace(/"/g, '""')}"`;
}

// M/D/YYYY (Spencer) or ISO -> YYYY-MM-DD. Returns null if unparseable.
function normalizeDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) {
    const mm = m[1].padStart(2, '0');
    const dd = m[2].padStart(2, '0');
    return `${m[3]}-${mm}-${dd}`;
  }
  return null;
}

// Parse the 3-row preamble (row1 = meta header names, row2 = meta values) to
// extract version + last_updated_on without fighting DuckDB's auto column names.
function readPreamble(filePath) {
  const head = stripBom(readHeadBytes(filePath, PREAMBLE_BYTES)).toString('utf8');
  const records = parseCsvSync(head, {
    relax_quotes: true,
    relax_column_count: true,
    skip_empty_lines: true,
    to: 2,
  });
  const headerRow = records[0] || [];
  const valueRow = records[1] || [];
  const find = (name) => {
    const idx = headerRow.findIndex((h) => String(h).trim().toLowerCase() === name);
    return idx === -1 ? null : valueRow[idx];
  };
  return {
    specVersion: (find('version') || 'unknown').toString().trim() || 'unknown',
    lastUpdatedOn: normalizeDate(find('last_updated_on')),
  };
}

export function itemHeaderColumns(filePath) {
  const rows = duckdbQuery(
    `DESCRIBE SELECT * FROM read_csv(${sqlStr(filePath)}, skip=2, header=true, all_varchar=true, ignore_errors=true)`
  );
  return rows.map((r) => r.column_name);
}

// Build the standardized-code condition across whichever code|N|type columns exist.
function standardizedCodeCondition(cols) {
  const typeList = STANDARDIZED_CODE_TYPES.map((t) => sqlStr(t)).join(', ');
  const parts = cols
    .filter((c) => /^code\|\d+\|type$/i.test(c))
    .map((c) => `upper(trim(${sqlIdent(c)})) IN (${typeList})`);
  return parts.length ? parts.join(' OR ') : 'FALSE';
}

function readMetrics(filePath, sql) {
  const combined =
    `CREATE TEMP TABLE _m AS ${sql.replace(/;$/, '')} ;` +
    `SELECT (SELECT count(DISTINCT line) FROM reject_errors) AS "rowsQuarantined", * FROM _m;`;
  const rows = duckdbQuery(combined);
  return rows[0] || {};
}

function buildTallSql(filePath, cols) {
  const codeCond = standardizedCodeCondition(cols);
  // code|2 is the primary standardized slot for the distinct-codes estimate.
  const code2 = cols.includes('code|2') ? '"code|2"' : 'NULL';
  return `SELECT
      count(*) AS "rowsParsed",
      count("standard_charge|gross") AS "withGross",
      count("standard_charge|discounted_cash") AS "withDiscountedCash",
      count(CASE WHEN "standard_charge|negotiated_dollar" IS NOT NULL OR "standard_charge|negotiated_algorithm" IS NOT NULL THEN 1 END) AS "withNegotiated",
      count(CASE WHEN "standard_charge|min" IS NOT NULL AND "standard_charge|max" IS NOT NULL THEN 1 END) AS "withDeidMinMax",
      count(CASE WHEN ${codeCond} THEN 1 END) AS "withStandardizedCode",
      count(DISTINCT payer_name) AS "distinctPayers",
      count(DISTINCT CASE WHEN ${codeCond} THEN ${code2} END) AS "distinctStandardizedCodes"
    FROM read_csv(${sqlStr(filePath)}, skip=2, header=true, all_varchar=true, ignore_errors=true, store_rejects=true)`;
}

function buildWideSql(filePath, cols) {
  const codeCond = standardizedCodeCondition(cols);
  // Inlined negotiated columns: standard_charge|<payer>|<plan>|negotiated_(dollar|algorithm)
  const negCols = cols.filter((c) => /^standard_charge\|.+\|.+\|negotiated_(dollar|algorithm)$/i.test(c));
  const negCond = negCols.length
    ? negCols.map((c) => `${sqlIdent(c)} IS NOT NULL`).join(' OR ')
    : 'FALSE';
  // Distinct payers = distinct 2nd segment of those column names (whitespace/case folded).
  const payers = new Set(
    negCols.map((c) => c.split('|')[1].trim().toLowerCase()).filter(Boolean)
  );
  const code2 = cols.includes('code|2') ? '"code|2"' : 'NULL';
  return {
    distinctPayers: payers.size,
    sql: `SELECT
      count(*) AS "rowsParsed",
      count("standard_charge|gross") AS "withGross",
      count("standard_charge|discounted_cash") AS "withDiscountedCash",
      count(CASE WHEN ${negCond} THEN 1 END) AS "withNegotiated",
      0 AS "withDeidMinMax",
      count(CASE WHEN ${codeCond} THEN 1 END) AS "withStandardizedCode",
      count(DISTINCT CASE WHEN ${codeCond} THEN ${code2} END) AS "distinctStandardizedCodes"
    FROM read_csv(${sqlStr(filePath)}, skip=2, header=true, all_varchar=true, ignore_errors=true, store_rejects=true)`,
  };
}

/**
 * @param {object} args
 * @param {string} args.path   path to the decompressed CSV
 * @param {object} [args.hospital]
 * @returns {Promise<import('../parse-mrf.js').FileMetrics>}
 */
export async function parseCsv({ path }) {
  const { specVersion, lastUpdatedOn } = readPreamble(path);
  const cols = itemHeaderColumns(path);
  const isTall = cols.some((c) => c.toLowerCase() === 'payer_name');

  let agg;
  let distinctPayers;
  let format;
  if (isTall) {
    format = 'csv-tall';
    agg = readMetrics(path, buildTallSql(path, cols));
    distinctPayers = Number(agg.distinctPayers ?? 0);
  } else {
    format = 'csv-wide';
    const { sql, distinctPayers: dp } = buildWideSql(path, cols);
    agg = readMetrics(path, sql);
    distinctPayers = dp;
  }

  const rowsParsed = Number(agg.rowsParsed ?? 0);
  const rowsQuarantined = Number(agg.rowsQuarantined ?? 0);
  const parseStatus = rowsParsed === 0 ? 'failed' : rowsQuarantined > 0 ? 'partial' : 'ok';

  return {
    parseStatus,
    specVersion,
    format,
    rowsTotal: rowsParsed + rowsQuarantined,
    rowsParsed,
    rowsQuarantined,
    lastUpdatedOn,
    withGross: Number(agg.withGross ?? 0),
    withDiscountedCash: Number(agg.withDiscountedCash ?? 0),
    withNegotiated: Number(agg.withNegotiated ?? 0),
    withDeidMinMax: Number(agg.withDeidMinMax ?? 0),
    withStandardizedCode: Number(agg.withStandardizedCode ?? 0),
    distinctPayers,
    distinctStandardizedCodes: Number(agg.distinctStandardizedCodes ?? 0),
    multiLocation: false,
  };
}
