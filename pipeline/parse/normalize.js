// pipeline/parse/normalize.js
//
// Turns a parsed MRF into price_records-shaped rows for the procedures in our
// dictionary (currently 100 CPT codes). The metrics parsers (csv.js/json.js)
// only COUNT; this extracts the actual price points.
//
// Output rows: { cpt, charge_type, payer, plan, amount, methodology, billing_class, setting, modifiers }
//   charge_type in ('gross','discounted_cash','negotiated').
//   billing_class (Facility/Professional) + setting (Inpatient/Outpatient) are
//   the keys the summary view uses to isolate the facility price from the
//   professional-component line items collapsed under one CPT. Not all files
//   carry billing_class (e.g. CHOP) — emit NULL when the column is absent.
//
// SELECT DISTINCT keeps each distinct (cpt, class, setting, amount, payer) point
// — preserving the CDM fan-out — while collapsing tall-format per-payer repeats.

import { duckdbQuery } from './duckdb.js';
import { normPipe } from './parsers/csv.js';

const MAX_OBJECT_SIZE = 1_073_741_824; // matches parsers/json.js

function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}
function sqlIdent(c) {
  return `"${c.replace(/"/g, '""')}"`;
}
function read(path, skip = 2) {
  // delim=',' forced for the same reason as parsers/csv.js: pipe-dense wide MRFs
  // fool DuckDB's delimiter sniffer into picking '|'. Must match the detector's
  // read so the resolved column names (code|1, standard_charge|gross, …) bind.
  return `read_csv(${sqlStr(path)}, skip=${skip}, header=true, all_varchar=true, ignore_errors=true, delim=',')`;
}
// Find a column by normalized name (case-insensitive, pipe-spacing collapsed —
// handles "settIng", "STANDARD_CHARGE | GROSS", etc.) and return a quoted
// reference, or NULL if the file doesn't have it.
function colRef(cols, name) {
  const found = cols.find((c) => normPipe(c) === name);
  return found ? sqlIdent(found) : 'NULL';
}

function cptMeltSql(cols) {
  const slots = cols
    .filter((c) => /^code\|\d+$/.test(normPipe(c)))
    .map((c) => ({ n: normPipe(c).split('|')[1], code: c, type: cols.find((t) => normPipe(t) === `code|${normPipe(c).split('|')[1]}|type`) }))
    .filter((s) => s.type);
  const parts = slots.map(
    (s) =>
      `SELECT rid, ${sqlIdent(s.code)} AS cpt FROM data ` +
      `WHERE upper(trim(${sqlIdent(s.type)})) IN ('CPT','HCPCS') AND ${sqlIdent(s.code)} IS NOT NULL`
  );
  return parts.join('\n      UNION ALL\n      ');
}
const cptInList = (cptList) => cptList.map(sqlStr).join(', ');

function buildCsvSql(path, cols, cptList, { wide, skip }) {
  const bc = colRef(cols, 'billing_class');
  const setting = colRef(cols, 'setting');
  const mods = colRef(cols, 'modifiers');
  const meth = colRef(cols, 'standard_charge|methodology');
  const grossRef = colRef(cols, 'standard_charge|gross');
  const cashRef = colRef(cols, 'standard_charge|discounted_cash');
  // common trailing columns for every emitted row (aliased — UNION takes names from the first SELECT)
  const tail = (methodology) => `${methodology} AS methodology, ${bc} AS billing_class, ${setting} AS setting, ${mods} AS modifiers`;

  // gross + discounted_cash are item-level (same in wide & tall). Absent columns
  // resolve to NULL, so the branch simply yields no rows (no binder error).
  const grossCash = `
  SELECT DISTINCT cpt, 'gross' AS charge_type, NULL AS payer, NULL AS plan,
         TRY_CAST(${grossRef} AS DOUBLE) AS amount, ${tail('NULL')}
    FROM rows WHERE TRY_CAST(${grossRef} AS DOUBLE) IS NOT NULL
  UNION ALL
  SELECT DISTINCT cpt, 'discounted_cash', NULL, NULL,
         TRY_CAST(${cashRef} AS DOUBLE), ${tail('NULL')}
    FROM rows WHERE TRY_CAST(${cashRef} AS DOUBLE) IS NOT NULL`;

  let negotiated;
  if (wide) {
    // v2 wide: payers are inlined as standard_charge|<payer>|<plan>|negotiated_dollar
    // (pipes may be spaced/uppercased — match on the normalized name).
    const negCols = cols.filter((c) => /^standard_charge\|.+\|.+\|negotiated_dollar$/.test(normPipe(c)));
    const unions = negCols.map((c) => {
      const [, payer, plan] = normPipe(c).split('|');
      return `SELECT DISTINCT cpt, 'negotiated', ${sqlStr(payer.trim())}, ${sqlStr(plan.trim())},
              TRY_CAST(${sqlIdent(c)} AS DOUBLE), ${tail('NULL')}
         FROM rows WHERE TRY_CAST(${sqlIdent(c)} AS DOUBLE) IS NOT NULL`;
    });
    negotiated = unions.length ? '\n  UNION ALL\n  ' + unions.join('\n  UNION ALL\n  ') : '';
  } else {
    const negDollar = colRef(cols, 'standard_charge|negotiated_dollar');
    negotiated = `
  UNION ALL
  SELECT DISTINCT cpt, 'negotiated', ${colRef(cols, 'payer_name')}, ${colRef(cols, 'plan_name')},
         TRY_CAST(${negDollar} AS DOUBLE), ${tail(meth)}
    FROM rows WHERE TRY_CAST(${negDollar} AS DOUBLE) IS NOT NULL`;
  }

  return `
  WITH data AS (SELECT *, row_number() OVER () AS rid FROM ${read(path, skip)}),
  melted AS (${cptMeltSql(cols)}),
  matched AS (SELECT rid, min(cpt) AS cpt FROM melted WHERE cpt IN (${cptInList(cptList)}) GROUP BY rid),
  rows AS (SELECT m.cpt, d.* FROM matched m JOIN data d USING (rid))
  ${grossCash}${negotiated}`;
}

/**
 * Extract price rows from a CSV MRF. Output columns:
 * cpt, charge_type, payer, plan, amount, methodology, billing_class, setting, modifiers
 */
export function extractCsvPriceRows({ path, format, cols, cptList, skip = 2 }) {
  if (!cptList.length) return [];
  return duckdbQuery(buildCsvSql(path, cols, cptList, { wide: format === 'csv-wide', skip }), { maxBuffer: 512 * 1024 * 1024 });
}

// --- JSON (v3 nested) -------------------------------------------------------
function buildJsonSql(path, cptList) {
  const list = cptList.map(sqlStr).join(', ');
  const read = `read_json_auto(${sqlStr(path)}, maximum_object_size=${MAX_OBJECT_SIZE})`;
  // billing_class/setting/modifiers live on the standard_charge object (ch).
  const chTail = (methodology) =>
    `${methodology} AS methodology, json_extract_string(ch, '$.billing_class') AS billing_class, json_extract_string(ch, '$.setting') AS setting, json_extract_string(ch, '$.modifiers') AS modifiers`;
  return `
  WITH exploded AS (SELECT unnest(standard_charge_information) AS item_struct FROM ${read}),
  items AS (SELECT row_number() OVER () AS iid, to_json(item_struct) AS item FROM exploded),
  melted AS (
    SELECT i.iid, i.item, json_extract_string(code, '$.code') AS cpt
    FROM items i, unnest(from_json(i.item->'$.code_information', '["json"]')) AS t(code)
    WHERE upper(trim(json_extract_string(code, '$.type'))) IN ('CPT','HCPCS')
  ),
  matched AS (SELECT iid, any_value(item) AS item, min(cpt) AS cpt FROM melted WHERE cpt IN (${list}) GROUP BY iid),
  charges AS (SELECT m.cpt, unnest(from_json(m.item->'$.standard_charges', '["json"]')) AS ch FROM matched m)
  SELECT DISTINCT cpt, 'gross' AS charge_type, NULL AS payer, NULL AS plan,
         TRY_CAST(json_extract_string(ch, '$.gross_charge') AS DOUBLE) AS amount, ${chTail('NULL')}
    FROM charges WHERE TRY_CAST(json_extract_string(ch, '$.gross_charge') AS DOUBLE) IS NOT NULL
  UNION ALL
  SELECT DISTINCT cpt, 'discounted_cash', NULL, NULL,
         TRY_CAST(json_extract_string(ch, '$.discounted_cash') AS DOUBLE), ${chTail('NULL')}
    FROM charges WHERE TRY_CAST(json_extract_string(ch, '$.discounted_cash') AS DOUBLE) IS NOT NULL
  UNION ALL
  SELECT DISTINCT cpt, 'negotiated',
         json_extract_string(p, '$.payer_name'), json_extract_string(p, '$.plan_name'),
         TRY_CAST(json_extract_string(p, '$.standard_charge_dollar') AS DOUBLE),
         ${chTail("json_extract_string(p, '$.methodology')")}
    FROM charges, unnest(coalesce(from_json(json_extract(ch, '$.payers_information'), '["json"]'), []::JSON[])) AS t(p)
    WHERE TRY_CAST(json_extract_string(p, '$.standard_charge_dollar') AS DOUBLE) IS NOT NULL`;
}

export function extractJsonPriceRows({ path, cptList }) {
  if (!cptList.length) return [];
  return duckdbQuery(buildJsonSql(path, cptList), { maxBuffer: 512 * 1024 * 1024 });
}
