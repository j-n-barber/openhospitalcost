// pipeline/parse/parsers/csv.js
//
// CSV MRF parser. Returns a FileMetrics object (docs/QUALITY_RUBRIC.md § 1.1)
// for pipeline/quality.js scoreFile() to score. Verified against the three
// real spike CSVs: Spencer (v2.0.0 wide), CHOP and Cleveland Clinic (v3.0.0 tall).
//
// Spike findings handled (docs/PARSER_NOTES.md §§ 2-5, 8-9):
//   - Preamble is detected RECORD-AWARE, not assumed to be 3 rows. CMS files put
//     2 metadata rows above the column header, but some embed newlines inside a
//     quoted metadata cell (e.g. Holly Hill's hospital_name), so the header sits
//     more than 2 *physical* lines down — and DuckDB's `skip` counts physical
//     lines. We find the header record with csv-parse (quote/newline-aware) and
//     pass its physical-line offset as `skip`.
//   - Column names vary: some files space the pipes ("standard_charge | gross")
//     and/or uppercase them ("STANDARD_CHARGE | GROSS"). All column matching is
//     done on a normalized form (lowercased, pipe-spacing collapsed); SQL still
//     references the actual column name. Absent columns degrade to 0/NULL instead
//     of a binder error.
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

// Normalize a column name for matching: lowercase + collapse whitespace around
// pipes. "STANDARD_CHARGE | GROSS" -> "standard_charge|gross".
export function normPipe(c) {
  return String(c).toLowerCase().replace(/\s*\|\s*/g, '|').trim();
}
// Find the actual (original-cased) column whose normalized form == name.
function pick(cols, name) {
  return cols.find((c) => normPipe(c) === name) || null;
}
// `count(col)` if the column exists, else literal 0 (avoids binder errors).
function countOf(cols, name) {
  const a = pick(cols, name);
  return a ? `count(${sqlIdent(a)})` : '0';
}
// A quoted reference to the column, or the literal NULL (still valid in IS NOT NULL).
function refOf(cols, name) {
  const a = pick(cols, name);
  return a ? sqlIdent(a) : 'NULL';
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

// A header row carries several MRF column names (data rows / metadata rows don't).
function headerScore(cols) {
  let n = 0;
  for (const c of cols) {
    const s = normPipe(c);
    if (
      s === 'description' ||
      s === 'payer_name' ||
      s === 'plan_name' ||
      s === 'billing_class' ||
      /^code\|\d+(\|type)?$/.test(s) ||
      /^standard_charge\|/.test(s)
    ) n++;
  }
  return n;
}

function describeAt(filePath, skip) {
  try {
    return duckdbQuery(
      `DESCRIBE SELECT * FROM read_csv(${sqlStr(filePath)}, skip=${skip}, header=true, all_varchar=true, ignore_errors=true, delim=',')`
    ).map((r) => r.column_name);
  } catch {
    return [];
  }
}

/**
 * Detect the CSV layout without assuming a fixed preamble size.
 *
 * The preamble length varies: the CMS norm is 2 metadata rows above the header,
 * but some files embed newlines inside a quoted metadata cell (Holly Hill's
 * hospital_name/attestation), so the header sits several *physical* lines down.
 * Crucially, DuckDB's `skip` and a JS CSV parser count those embedded newlines
 * differently, so we can't compute skip in JS — instead we probe DuckDB: try
 * skip=0..N, DESCRIBE each, and take the first whose columns look like a real
 * header. This uses DuckDB's own line accounting, so it always aligns with the
 * later read. version/last_updated_on come from the metadata rows (parsed in JS).
 *
 * Returns { skip, cols, format, specVersion, lastUpdatedOn }.
 */
export function detectCsvLayout(filePath) {
  let skip = 2;
  let cols = [];
  for (let s = 0; s <= 12; s++) {
    const c = describeAt(filePath, s);
    if (headerScore(c) >= 2) { skip = s; cols = c; break; }
  }
  if (!cols.length) cols = describeAt(filePath, skip); // fall back to CMS default

  // Metadata (version/last_updated_on): the row whose cells include those names,
  // values on the next row. Quote/newline-aware via csv-parse.
  let specVersion = 'unknown';
  let lastUpdatedOn = null;
  const head = stripBom(readHeadBytes(filePath, PREAMBLE_BYTES)).toString('utf8');
  const rows = parseCsvSync(head, { relax_quotes: true, relax_column_count: true, skip_empty_lines: false, to: 12 });
  for (let i = 0; i < rows.length - 1; i++) {
    const lower = rows[i].map((c) => normPipe(c));
    if (lower.includes('last_updated_on') || lower.includes('version')) {
      const vals = rows[i + 1] ?? [];
      const find = (name) => {
        const idx = lower.indexOf(name);
        return idx === -1 ? null : vals[idx];
      };
      specVersion = (find('version') || 'unknown').toString().trim() || 'unknown';
      lastUpdatedOn = normalizeDate(find('last_updated_on'));
      break;
    }
  }

  const isTall = cols.some((c) => normPipe(c) === 'payer_name');
  return { skip, cols, format: isTall ? 'csv-tall' : 'csv-wide', specVersion, lastUpdatedOn };
}

export function itemHeaderColumns(filePath, skip = 2) {
  const rows = duckdbQuery(
    `DESCRIBE SELECT * FROM read_csv(${sqlStr(filePath)}, skip=${skip}, header=true, all_varchar=true, ignore_errors=true, delim=',')`
  );
  return rows.map((r) => r.column_name);
}

// Build the standardized-code condition across whichever code|N|type columns exist.
function standardizedCodeCondition(cols) {
  const typeList = STANDARDIZED_CODE_TYPES.map((t) => sqlStr(t)).join(', ');
  const parts = cols
    .filter((c) => /^code\|\d+\|type$/.test(normPipe(c)))
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

function readCsv(filePath, skip, withRejects = false) {
  // Force comma delimiter: CMS MRF CSVs are comma-delimited by spec, but the v3
  // "wide" layout is so dense with '|' (hundreds of standard_charge|payer|plan|…
  // columns) that DuckDB's auto-sniffer guesses '|' and shatters every column.
  // See PARSER_NOTES § 13.
  return `read_csv(${sqlStr(filePath)}, skip=${skip}, header=true, all_varchar=true, ignore_errors=true, delim=','${withRejects ? ', store_rejects=true' : ''})`;
}

function buildTallSql(filePath, cols, skip) {
  const codeCond = standardizedCodeCondition(cols);
  const code2 = pick(cols, 'code|2') ? sqlIdent(pick(cols, 'code|2')) : 'NULL';
  const negDollar = refOf(cols, 'standard_charge|negotiated_dollar');
  const negAlgo = refOf(cols, 'standard_charge|negotiated_algorithm');
  const minRef = refOf(cols, 'standard_charge|min');
  const maxRef = refOf(cols, 'standard_charge|max');
  return `SELECT
      count(*) AS "rowsParsed",
      ${countOf(cols, 'standard_charge|gross')} AS "withGross",
      ${countOf(cols, 'standard_charge|discounted_cash')} AS "withDiscountedCash",
      count(CASE WHEN ${negDollar} IS NOT NULL OR ${negAlgo} IS NOT NULL THEN 1 END) AS "withNegotiated",
      count(CASE WHEN ${minRef} IS NOT NULL AND ${maxRef} IS NOT NULL THEN 1 END) AS "withDeidMinMax",
      count(CASE WHEN ${codeCond} THEN 1 END) AS "withStandardizedCode",
      count(DISTINCT ${refOf(cols, 'payer_name')}) AS "distinctPayers",
      count(DISTINCT CASE WHEN ${codeCond} THEN ${code2} END) AS "distinctStandardizedCodes"
    FROM ${readCsv(filePath, skip, true)}`;
}

function buildWideSql(filePath, cols, skip) {
  const codeCond = standardizedCodeCondition(cols);
  // Inlined negotiated columns: standard_charge|<payer>|<plan>|negotiated_(dollar|algorithm)
  const negCols = cols.filter((c) => /^standard_charge\|.+\|.+\|negotiated_(dollar|algorithm)$/.test(normPipe(c)));
  const negCond = negCols.length
    ? negCols.map((c) => `${sqlIdent(c)} IS NOT NULL`).join(' OR ')
    : 'FALSE';
  // Distinct payers = distinct 2nd segment of those column names (whitespace/case folded).
  const payers = new Set(
    negCols.map((c) => normPipe(c).split('|')[1]).filter(Boolean)
  );
  const code2 = pick(cols, 'code|2') ? sqlIdent(pick(cols, 'code|2')) : 'NULL';
  return {
    distinctPayers: payers.size,
    sql: `SELECT
      count(*) AS "rowsParsed",
      ${countOf(cols, 'standard_charge|gross')} AS "withGross",
      ${countOf(cols, 'standard_charge|discounted_cash')} AS "withDiscountedCash",
      count(CASE WHEN ${negCond} THEN 1 END) AS "withNegotiated",
      0 AS "withDeidMinMax",
      count(CASE WHEN ${codeCond} THEN 1 END) AS "withStandardizedCode",
      count(DISTINCT CASE WHEN ${codeCond} THEN ${code2} END) AS "distinctStandardizedCodes"
    FROM ${readCsv(filePath, skip, true)}`,
  };
}

// CMS requires these item-level fields; if none are present we didn't download
// a real MRF (commonly an .aspx/.ashx stub or an HTML error page returned to a
// direct fetch — route to the Tier-2 Playwright fetcher). Fail clearly instead
// of letting a later query throw "standard_charge|gross not found".
function assertLooksLikeMrf(cols, path) {
  const ok = cols.some((c) => {
    const n = normPipe(c);
    return n === 'description' || n === 'code|1' || n === 'standard_charge|gross';
  });
  if (!ok) {
    throw new Error(
      `Not a recognizable CSV MRF (columns: ${cols.slice(0, 6).join(', ') || 'none'}). ` +
      `Likely a blocked/stub download — route ${path} to Tier-2 fetch.`
    );
  }
}

/**
 * @param {object} args
 * @param {string} args.path   path to the decompressed CSV
 * @returns {Promise<import('../parse-mrf.js').FileMetrics>}
 */
export async function parseCsv({ path }) {
  const { skip, cols, format, specVersion, lastUpdatedOn } = detectCsvLayout(path);
  assertLooksLikeMrf(cols, path);

  let agg;
  let distinctPayers;
  if (format === 'csv-tall') {
    agg = readMetrics(path, buildTallSql(path, cols, skip));
    distinctPayers = Number(agg.distinctPayers ?? 0);
  } else {
    const { sql, distinctPayers: dp } = buildWideSql(path, cols, skip);
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
    skip,
    cols,
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
