// pipeline/parse/parsers/json.js
//
// JSON MRF parser. Returns a FileMetrics object (docs/QUALITY_RUBRIC.md § 1.1)
// for pipeline/quality.js scoreFile() to score.
//
// Spike findings this MUST handle (docs/PARSER_NOTES.md § 7):
//   - Shape: a top-level metadata object then a "standard_charge_information"
//     array of records. version lives at top level (all v3 JSON samples = 3.0.0).
//   - Stanford has a UTF-8 BOM at byte 0 — JSON.parse throws on it. Strip BOM
//     (detect-format.stripBom) before any parse.
//   - Files are big (HCA 607 MB, Stanford 155 MB): NEVER JSON.parse the whole
//     file. Use DuckDB read_json_auto (preferred — already a dependency and
//     streams), or stream-json as a fallback.
//   - HCA is a MULTI-LOCATION file: location_name is a 5-element array (one
//     medical center + 4 freestanding ERs). Set metrics.multiLocation=true and
//     either split records per location or tag price_records with sub-location.

import { duckdbQuery } from '../duckdb.js';

/**
 * @param {object} args
 * @param {string} args.path   path to the decompressed, BOM-stripped JSON
 * @param {object} [args.hospital]  roster row for context (ccn, ein, name)
 * @returns {Promise<import('../parse-mrf.js').FileMetrics>}
 */
export async function parseJson({ path, hospital }) {
  void duckdbQuery; void hospital;

  // --- Phase C TODO -------------------------------------------------------
  // 1. Strip BOM to a temp path if detect-format flagged hasBom (DuckDB's
  //    read_json_auto chokes on a leading BOM too).
  // 2. Read top-level version + location_name length:
  //      read_json_auto('${path}', maximum_object_size=...) then SELECT version,
  //      len(location_name). location_name length > 1 -> multiLocation = true.
  // 3. Unnest standard_charge_information and its standard_charges array, then
  //    aggregate the rubric counts in DuckDB (one pass): rowsParsed, withGross,
  //    withDiscountedCash, withNegotiated (payers_information[].standard_charge_dollar
  //    or .standard_charge_algorithm present), withDeidMinMax, withStandardizedCode
  //    (code_information[].type in CPT/HCPCS/MS-DRG/APR-DRG/NDC/RC),
  //    distinctPayers, distinctStandardizedCodes, lastUpdatedOn.
  //    JSON rarely "quarantines" rows the way dirty CSV does, so
  //    rowsTotal === rowsParsed unless a record fails schema validation.
  // 4. Return the FileMetrics shape; parse-mrf.js calls scoreFile().
  throw new Error(`parseJson not implemented — Phase C. See inline spec + PARSER_NOTES.md § 7. Input: ${path}`);
}
