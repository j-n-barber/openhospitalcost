// pipeline/parse/parsers/csv.js
//
// CSV MRF parser. Returns a FileMetrics object (docs/QUALITY_RUBRIC.md § 1.1)
// for pipeline/quality.js scoreFile() to score.
//
// Spike findings this MUST handle (docs/PARSER_NOTES.md §§ 2-5, 8-9):
//   - 3-row header preamble: row1 = hospital-meta col names + the multi-hundred-
//     char attestation as a column header; row2 = hospital-meta values;
//     row3 = the real per-item header; row4+ = data.
//     DuckDB read: skip=2, header=true, all_varchar=true.
//   - Dirty CSVs are the MAJORITY: CHOP has invalid UTF-8 (~line 1942),
//     Cleveland Clinic has unterminated quotes (~line 31,906). Read with
//     strict_mode=false, ignore_errors=true, then count dropped rows as
//     rowsQuarantined and persist them to mrf_files.parse_warnings.
//   - Branch on the `version` value in row2: 2.0.0 = WIDE (payers inlined in
//     column names like standard_charge|<payer>|<plan>|negotiated_dollar),
//     3.0.0 = TALL (payer_name / plan_name columns, one row per item × payer).
//   - code|1 is the CDM (internal) code; the standardized code (CPT/HCPCS/DRG/
//     NDC/RC) is in code|2 (and sometimes code|3, code|4). Count
//     withStandardizedCode off code|2+, NOT code|1.
//   - Booleans are the strings "TRUE"/"FALSE"; the license_number|<XX> state
//     suffix is informational only (trust the value, not the header).

import { duckdbQuery } from '../duckdb.js';

/**
 * @param {object} args
 * @param {string} args.path   path to the decompressed CSV
 * @param {object} [args.hospital]  roster row for context (ccn, ein, name)
 * @returns {Promise<import('../parse-mrf.js').FileMetrics>}
 */
export async function parseCsv({ path, hospital }) {
  void duckdbQuery; void hospital;

  // --- Phase C TODO -------------------------------------------------------
  // 1. Read row2 to get `version` -> pick wide vs tall mode.
  //      duckdbQuery(`SELECT * FROM read_csv('${path}', skip=1, header=false,
  //                   all_varchar=true, ignore_errors=true) LIMIT 1`)
  // 2. Build a single aggregate query (skip=2) that returns the counts the
  //    rubric needs in ONE pass — do NOT pull every row into Node:
  //      rowsTotal/rowsParsed (via ignore_errors delta), withGross,
  //      withDiscountedCash, withNegotiated, withDeidMinMax,
  //      withStandardizedCode (code|2+ non-null), distinctPayers,
  //      distinctStandardizedCodes, lastUpdatedOn (prefer as_of_date).
  //    Wide vs tall changes how withNegotiated / distinctPayers are computed
  //    (inlined columns vs payer_name rows) — two query templates.
  // 3. rowsQuarantined = rowsTotal_strict - rowsParsed_lenient; capture the
  //    rejects table for parse_warnings.
  // 4. Return the FileMetrics shape; parse-mrf.js calls scoreFile().
  throw new Error(`parseCsv not implemented — Phase C. See inline spec + PARSER_NOTES.md §§ 2-5. Input: ${path}`);
}
