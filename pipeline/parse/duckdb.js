// pipeline/parse/duckdb.js
//
// Thin wrapper around the DuckDB CLI binary at .bin/duckdb (the spike used the
// CLI, not a node package — see docs/PARSER_NOTES.md "Re-running this spike").
// We shell out and read JSON rows back. DuckDB does the heavy lifting for both
// CSV (read_csv) and JSON (read_json_auto); see parsers/csv.js and parsers/json.js.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DUCKDB_BIN = resolve(__dirname, '..', '..', '.bin', 'duckdb');

// Cleveland Clinic decompresses to 1.5 GB; big JSON files run hundreds of MB.
// Give DuckDB a generous buffer and timeout, configurable per call.
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_BUFFER_BYTES = 512 * 1024 * 1024;

export function duckdbAvailable() {
  return existsSync(DUCKDB_BIN);
}

/**
 * Run a SQL statement and return its rows as parsed JSON objects.
 * Uses `duckdb -json -c "<sql>"`. For large result sets, prefer a query that
 * AGGREGATES inside DuckDB (counts, coverage) rather than returning every row.
 *
 * @param {string} sql
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs]
 * @returns {Array<object>}
 */
export function duckdbQuery(sql, opts = {}) {
  if (!duckdbAvailable()) {
    throw new Error(`DuckDB binary not found at ${DUCKDB_BIN}. It is gitignored; restore it before parsing.`);
  }
  // Help the multi-GB outliers: drop result ordering (big memory savings on
  // large aggregations) and give DuckDB a disk temp dir to spill into.
  const init = "SET preserve_insertion_order=false; SET temp_directory='/tmp/ohc-duckdb-spill';";
  const result = spawnSync(DUCKDB_BIN, ['-json', '-c', `${init} ${sql}`], {
    encoding: 'utf8',
    timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxBuffer: opts.maxBuffer ?? MAX_BUFFER_BYTES,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`DuckDB exited ${result.status}: ${result.stderr || '(no stderr)'}`);
  }
  const out = (result.stdout || '').trim();
  if (!out) return [];
  try {
    return JSON.parse(out);
  } catch {
    // DuckDB occasionally prints a warning line to stdout ahead of the JSON
    // (e.g. syntax deprecations). The -json result is a single array/object;
    // recover it from the first structural bracket.
    const start = out.search(/[[{]/);
    if (start > 0) return JSON.parse(out.slice(start));
    throw new Error(`DuckDB returned non-JSON output: ${out.slice(0, 200)}`);
  }
}
