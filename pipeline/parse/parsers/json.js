// pipeline/parse/parsers/json.js
//
// JSON MRF parser. Returns a FileMetrics object (docs/QUALITY_RUBRIC.md § 1.1)
// for pipeline/quality.js scoreFile() to score.
//
// Real shape (docs/PARSER_NOTES.md § 7, confirmed against Stanford/HCA samples):
//   { hospital_name, last_updated_on, version, location_name:[...],
//     standard_charge_information:[
//       { description, code_information:[{code,type}],
//         standard_charges:[{ gross_charge, discounted_cash, min, max,
//                             payers_information:[{payer_name, standard_charge_dollar,
//                                                  standard_charge_algorithm}] }] } ] }
//
// Handled: UTF-8 BOM (DuckDB read_json_auto tolerates it; we also detect it
// upstream), big files via read_json_auto (streaming, not JSON.parse), and the
// HCA multi-location case (location_name length > 1 -> metrics.multiLocation).
//
// NOTE: validated against a synthetic complete fixture (test/fixtures). The two
// repo samples are 8 MB truncated downloads, so full-scale numeric validation
// awaits a complete real file — the query shape is the same.

import { duckdbQuery } from '../duckdb.js';
import { STANDARDIZED_CODE_TYPES } from './csv.js';

// The whole MRF is a single JSON object, so this must exceed the file size.
// 1 GiB covers HCA's ~607 MB worst case; 2 GB overflows DuckDB's read buffer
// allocator. A single-object MRF larger than this would need a streaming
// fallback (stream-json) — none seen in the wild yet.
const MAX_OBJECT_SIZE = 1_073_741_824;

function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

// Everything goes through json_extract_string, not typed struct access:
//   - read_json_auto unifies the struct schema across records, so a field
//     missing from one record becomes a JSON `null` literal. json_extract()
//     returns that JSON null (which is NOT SQL NULL), so presence checks must
//     use json_extract_string, which yields a real SQL NULL.
//   - a field present in ZERO records is absent from the inferred struct
//     entirely, which makes typed access (c.field) a hard binder error. JSON
//     paths tolerate that.
function buildJsonSql(filePath) {
  const typeList = STANDARDIZED_CODE_TYPES.map((t) => sqlStr(t)).join(', ');
  return `
  WITH raw AS (
    SELECT
      version AS v,
      last_updated_on AS lu,
      len(location_name) AS nloc,
      to_json(unnest(standard_charge_information)) AS item
    FROM read_json_auto(${sqlStr(filePath)}, maximum_object_size=${MAX_OBJECT_SIZE})
  ),
  perItem AS (
    SELECT v, lu, nloc,
      len(list_filter(from_json(item->'$.code_information', '["json"]'),
          lambda x: upper(trim(json_extract_string(x, '$.type'))) IN (${typeList}))) > 0 AS hasStdCode,
      coalesce(from_json(item->'$.standard_charges', '["json"]'), []::JSON[]) AS charges
    FROM raw
  ),
  flags AS (
    SELECT v, lu, nloc, hasStdCode,
      len(list_filter(charges, lambda c: json_extract_string(c, '$.gross_charge') IS NOT NULL)) > 0 AS hasGross,
      len(list_filter(charges, lambda c: json_extract_string(c, '$.discounted_cash') IS NOT NULL)) > 0 AS hasCash,
      len(list_filter(charges, lambda c: json_extract_string(c, '$.minimum') IS NOT NULL AND json_extract_string(c, '$.maximum') IS NOT NULL)) > 0 AS hasMinMax,
      len(list_filter(charges, lambda c:
        len(list_filter(coalesce(from_json(json_extract(c, '$.payers_information'), '["json"]'), []::JSON[]),
            lambda p: json_extract_string(p, '$.standard_charge_dollar') IS NOT NULL
              OR json_extract_string(p, '$.standard_charge_algorithm') IS NOT NULL)) > 0)) > 0 AS hasNeg
    FROM perItem
  )
  SELECT
    any_value(v) AS "specVersion",
    any_value(lu) AS "lastUpdatedOn",
    max(nloc) AS "nloc",
    count(*) AS "rowsParsed",
    sum(hasGross::INT) AS "withGross",
    sum(hasCash::INT) AS "withDiscountedCash",
    sum(hasNeg::INT) AS "withNegotiated",
    sum(hasMinMax::INT) AS "withDeidMinMax",
    sum(hasStdCode::INT) AS "withStandardizedCode"
  FROM flags`;
}

// Distinct payer names across the whole file (separate pass keeps the main query simple).
function buildPayerSql(filePath) {
  return `
  WITH items AS (
    SELECT to_json(unnest(standard_charge_information)) AS item
    FROM read_json_auto(${sqlStr(filePath)}, maximum_object_size=${MAX_OBJECT_SIZE})
  ),
  charges AS (
    SELECT unnest(coalesce(from_json(item->'$.standard_charges', '["json"]'), []::JSON[])) AS c FROM items
  ),
  payers AS (
    SELECT unnest(coalesce(from_json(json_extract(c, '$.payers_information'), '["json"]'), []::JSON[])) AS p FROM charges
  )
  SELECT count(DISTINCT json_extract_string(p, '$.payer_name')) AS "distinctPayers" FROM payers`;
}

function normalizeDate(raw) {
  if (!raw) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(raw).trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/**
 * @param {object} args
 * @param {string} args.path
 * @param {object} [args.hospital]
 * @returns {Promise<import('../parse-mrf.js').FileMetrics>}
 */
export async function parseJson({ path }) {
  const agg = duckdbQuery(buildJsonSql(path))[0] || {};
  let distinctPayers = 0;
  try {
    distinctPayers = Number(duckdbQuery(buildPayerSql(path))[0]?.distinctPayers ?? 0);
  } catch {
    distinctPayers = 0; // some files omit payers_information entirely
  }

  const rowsParsed = Number(agg.rowsParsed ?? 0);
  return {
    parseStatus: rowsParsed === 0 ? 'failed' : 'ok',
    specVersion: (agg.specVersion || 'unknown').toString().trim() || 'unknown',
    format: 'json',
    rowsTotal: rowsParsed,
    rowsParsed,
    rowsQuarantined: 0, // JSON parses whole-or-nothing; a failure throws above.
    lastUpdatedOn: normalizeDate(agg.lastUpdatedOn),
    withGross: Number(agg.withGross ?? 0),
    withDiscountedCash: Number(agg.withDiscountedCash ?? 0),
    withNegotiated: Number(agg.withNegotiated ?? 0),
    withDeidMinMax: Number(agg.withDeidMinMax ?? 0),
    withStandardizedCode: Number(agg.withStandardizedCode ?? 0),
    distinctPayers,
    distinctStandardizedCodes: 0,
    multiLocation: Number(agg.nloc ?? 1) > 1,
  };
}
