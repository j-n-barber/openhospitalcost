// pipeline/parse/normalize.js
//
// Turns a parsed MRF into price_records-shaped rows for the procedures in our
// dictionary (currently 100 CPT codes). The metrics parsers (csv.js/json.js)
// only COUNT; this extracts the actual price points.
//
// Output rows: { cpt, charge_type, payer, plan, amount, methodology }
//   charge_type in ('gross','discounted_cash','negotiated').
//   gross/discounted_cash are per-item (payer/plan NULL); negotiated is per payer.
//
// We SELECT DISTINCT so the tall format's per-payer repetition of gross/cash
// collapses to one row per distinct value, while a CPT that maps to several CDM
// line items with different prices (the fan-out, PARSER_NOTES § 5) keeps each
// distinct price as its own row. The rubric's representative-price pick (§ 2.1)
// happens later at view time, not here.

import { duckdbQuery } from './duckdb.js';

const MAX_OBJECT_SIZE = 1_073_741_824; // matches parsers/json.js

function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}
function sqlIdent(c) {
  return `"${c.replace(/"/g, '""')}"`;
}
function read(path) {
  return `read_csv(${sqlStr(path)}, skip=2, header=true, all_varchar=true, ignore_errors=true)`;
}

// Melt every code|N slot (that exists) into (rid, code), accepting type CPT or
// HCPCS. CPT is HCPCS Level I, and many hospitals (e.g. Cleveland Clinic) label
// 5-digit CPTs as "HCPCS". Our dictionary is 5-digit numeric CPT, so matching
// value + (CPT|HCPCS) is safe — HCPCS Level II codes are alphanumeric and can't
// collide with our numeric codes.
function cptMeltSql(cols) {
  const slots = cols
    .filter((c) => /^code\|\d+$/i.test(c))
    .map((c) => c.split('|')[1]) // the N
    .filter((n) => cols.includes(`code|${n}|type`));
  const parts = slots.map(
    (n) =>
      `SELECT rid, ${sqlIdent(`code|${n}`)} AS cpt FROM data ` +
      `WHERE upper(trim(${sqlIdent(`code|${n}|type`)})) IN ('CPT','HCPCS') AND ${sqlIdent(`code|${n}`)} IS NOT NULL`
  );
  return parts.join('\n      UNION ALL\n      ');
}

function cptInList(cptList) {
  return cptList.map(sqlStr).join(', ');
}

function buildTallSql(path, cols, cptList) {
  const methodology = cols.includes('standard_charge|methodology')
    ? '"standard_charge|methodology"'
    : 'NULL';
  return `
  WITH data AS (SELECT *, row_number() OVER () AS rid FROM ${read(path)}),
  melted AS (${cptMeltSql(cols)}),
  matched AS (
    SELECT rid, min(cpt) AS cpt FROM melted WHERE cpt IN (${cptInList(cptList)}) GROUP BY rid
  ),
  rows AS (SELECT m.cpt, d.* FROM matched m JOIN data d USING (rid))
  SELECT DISTINCT cpt, 'gross' AS charge_type, NULL AS payer, NULL AS plan,
         TRY_CAST("standard_charge|gross" AS DOUBLE) AS amount, NULL AS methodology
    FROM rows WHERE TRY_CAST("standard_charge|gross" AS DOUBLE) IS NOT NULL
  UNION ALL
  SELECT DISTINCT cpt, 'discounted_cash', NULL, NULL,
         TRY_CAST("standard_charge|discounted_cash" AS DOUBLE), NULL
    FROM rows WHERE TRY_CAST("standard_charge|discounted_cash" AS DOUBLE) IS NOT NULL
  UNION ALL
  SELECT DISTINCT cpt, 'negotiated', payer_name, plan_name,
         TRY_CAST("standard_charge|negotiated_dollar" AS DOUBLE), ${methodology}
    FROM rows WHERE TRY_CAST("standard_charge|negotiated_dollar" AS DOUBLE) IS NOT NULL`;
}

function buildWideSql(path, cols, cptList) {
  // Each inlined standard_charge|<payer>|<plan>|negotiated_dollar column -> a row.
  const negCols = cols.filter((c) => /^standard_charge\|.+\|.+\|negotiated_dollar$/i.test(c));
  const negUnions = negCols.map((c) => {
    const parts = c.split('|');
    const payer = parts[1].trim();
    const plan = parts[2].trim();
    return `SELECT DISTINCT cpt, 'negotiated' AS charge_type, ${sqlStr(payer)} AS payer, ${sqlStr(plan)} AS plan,
            TRY_CAST(${sqlIdent(c)} AS DOUBLE) AS amount, NULL AS methodology
       FROM rows WHERE TRY_CAST(${sqlIdent(c)} AS DOUBLE) IS NOT NULL`;
  });
  const negSql = negUnions.length ? '\n  UNION ALL\n  ' + negUnions.join('\n  UNION ALL\n  ') : '';
  return `
  WITH data AS (SELECT *, row_number() OVER () AS rid FROM ${read(path)}),
  melted AS (${cptMeltSql(cols)}),
  matched AS (
    SELECT rid, min(cpt) AS cpt FROM melted WHERE cpt IN (${cptInList(cptList)}) GROUP BY rid
  ),
  rows AS (SELECT m.cpt, d.* FROM matched m JOIN data d USING (rid))
  SELECT DISTINCT cpt, 'gross' AS charge_type, NULL AS payer, NULL AS plan,
         TRY_CAST("standard_charge|gross" AS DOUBLE) AS amount, NULL AS methodology
    FROM rows WHERE TRY_CAST("standard_charge|gross" AS DOUBLE) IS NOT NULL
  UNION ALL
  SELECT DISTINCT cpt, 'discounted_cash', NULL, NULL,
         TRY_CAST("standard_charge|discounted_cash" AS DOUBLE), NULL
    FROM rows WHERE TRY_CAST("standard_charge|discounted_cash" AS DOUBLE) IS NOT NULL${negSql}`;
}

/**
 * Extract price rows from a CSV MRF for the given CPT dictionary.
 * @param {object} args
 * @param {string} args.path
 * @param {'csv-tall'|'csv-wide'} args.format
 * @param {string[]} args.cols       item-header columns (from the parser)
 * @param {string[]} args.cptList    CPT codes in our dictionary
 * @returns {Array<{cpt,charge_type,payer,plan,amount,methodology}>}
 */
export function extractCsvPriceRows({ path, format, cols, cptList }) {
  if (!cptList.length) return [];
  const sql = format === 'csv-wide' ? buildWideSql(path, cols, cptList) : buildTallSql(path, cols, cptList);
  return duckdbQuery(sql, { maxBuffer: 512 * 1024 * 1024 });
}

// --- JSON (v3 nested) -------------------------------------------------------
// Mirrors parsers/json.js: read_json_auto, all leaf access via json_extract_string
// to tolerate unified-schema nulls / absent keys. Matches our CPT dictionary on
// any code_information entry typed CPT or HCPCS (see PARSER_NOTES § 11).
function buildJsonSql(path, cptList) {
  const list = cptList.map(sqlStr).join(', ');
  const read = `read_json_auto(${sqlStr(path)}, maximum_object_size=${MAX_OBJECT_SIZE})`;
  return `
  WITH exploded AS (
    SELECT unnest(standard_charge_information) AS item_struct FROM ${read}
  ),
  items AS (
    -- unnest must finish before row_number(), else the window sees one pre-unnest
    -- row and numbers every item 1 (collapsing them in the GROUP BY below).
    SELECT row_number() OVER () AS iid, to_json(item_struct) AS item FROM exploded
  ),
  melted AS (
    SELECT i.iid, i.item, json_extract_string(code, '$.code') AS cpt
    FROM items i, unnest(from_json(i.item->'$.code_information', '["json"]')) AS t(code)
    WHERE upper(trim(json_extract_string(code, '$.type'))) IN ('CPT','HCPCS')
  ),
  matched AS (
    SELECT iid, any_value(item) AS item, min(cpt) AS cpt
    FROM melted WHERE cpt IN (${list}) GROUP BY iid
  ),
  charges AS (
    SELECT m.cpt, unnest(from_json(m.item->'$.standard_charges', '["json"]')) AS ch FROM matched m
  )
  SELECT DISTINCT cpt, 'gross' AS charge_type, NULL AS payer, NULL AS plan,
         TRY_CAST(json_extract_string(ch, '$.gross_charge') AS DOUBLE) AS amount, NULL AS methodology
    FROM charges WHERE TRY_CAST(json_extract_string(ch, '$.gross_charge') AS DOUBLE) IS NOT NULL
  UNION ALL
  SELECT DISTINCT cpt, 'discounted_cash', NULL, NULL,
         TRY_CAST(json_extract_string(ch, '$.discounted_cash') AS DOUBLE), NULL
    FROM charges WHERE TRY_CAST(json_extract_string(ch, '$.discounted_cash') AS DOUBLE) IS NOT NULL
  UNION ALL
  SELECT DISTINCT cpt, 'negotiated',
         json_extract_string(p, '$.payer_name'), json_extract_string(p, '$.plan_name'),
         TRY_CAST(json_extract_string(p, '$.standard_charge_dollar') AS DOUBLE),
         json_extract_string(p, '$.methodology')
    FROM charges, unnest(coalesce(from_json(json_extract(ch, '$.payers_information'), '["json"]'), []::JSON[])) AS t(p)
    WHERE TRY_CAST(json_extract_string(p, '$.standard_charge_dollar') AS DOUBLE) IS NOT NULL`;
}

/**
 * Extract price rows from a JSON MRF for the given CPT dictionary.
 * @returns {Array<{cpt,charge_type,payer,plan,amount,methodology}>}
 */
export function extractJsonPriceRows({ path, cptList }) {
  if (!cptList.length) return [];
  return duckdbQuery(buildJsonSql(path, cptList), { maxBuffer: 512 * 1024 * 1024 });
}
