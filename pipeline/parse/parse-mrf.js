// pipeline/parse/parse-mrf.js
//
// Phase C MRF parse orchestrator. Given a downloaded file + its HTTP response
// metadata, it: detects format -> decompresses if needed -> routes to the CSV
// or JSON parser -> scores the resulting metrics with pipeline/quality.js.
//
// The control flow here is complete; the format-specific parsing (csv.js,
// json.js) and decompression (decompress.js) are Phase C stubs that throw with
// an inline implementation spec. Fetching is a separate stage (see
// pipeline/fetch/ + ACQUISITION_STRATEGY.md tiers); this module starts from a
// file already on disk.

import { scoreFile, normalizeFileMetrics } from '../quality.js';
import { detectFormat, readHeadBytes } from './detect-format.js';
import { decompress } from './decompress.js';
import { parseCsv } from './parsers/csv.js';
import { parseJson } from './parsers/json.js';

/**
 * @typedef {object} FileMetrics  (docs/QUALITY_RUBRIC.md § 1.1)
 * @property {'ok'|'partial'|'failed'} parseStatus
 * @property {string} specVersion
 * @property {'csv-tall'|'csv-wide'|'json'} format
 * @property {number} rowsTotal
 * @property {number} rowsParsed
 * @property {number} rowsQuarantined
 * @property {string|null} lastUpdatedOn
 * @property {number} withGross
 * @property {number} withDiscountedCash
 * @property {number} withNegotiated
 * @property {number} withDeidMinMax
 * @property {number} withStandardizedCode
 * @property {number} distinctPayers
 * @property {number} distinctStandardizedCodes
 * @property {boolean} multiLocation
 */

/**
 * Parse one MRF file and score it.
 *
 * @param {object} args
 * @param {string} args.filePath              path to the downloaded file on disk
 * @param {string} [args.contentType]         HTTP Content-Type from the download
 * @param {string} [args.contentDisposition]  HTTP Content-Disposition from the download
 * @param {string} [args.url]                 source URL (for logging + extension hints)
 * @param {string} [args.asOf]                ISO date to score freshness against (ingest date)
 * @param {object} [args.hospital]            roster row (ccn, ein, name) for parser context
 * @returns {Promise<{format:object, metrics:FileMetrics, score:object}>}
 */
export async function parseMrf({ filePath, contentType, contentDisposition, url, asOf, hospital }) {
  const headBytes = readHeadBytes(filePath);
  const format = detectFormat({ headBytes, contentType, contentDisposition, url });

  let workingPath = filePath;
  let payload = format.payload;

  if (format.container !== 'plain') {
    const decompressed = await decompress({ filePath, container: format.container });
    workingPath = decompressed.path;
    if (decompressed.payload && decompressed.payload !== 'unknown') {
      payload = decompressed.payload;
    }
  }

  let metrics;
  if (payload === 'json') {
    metrics = await parseJson({ path: workingPath, hospital });
  } else if (payload === 'csv') {
    metrics = await parseCsv({ path: workingPath, hospital });
  } else {
    // Unrecognized payload: record a failed parse so the rubric gates it to 0/F
    // and the hospital routes to acquisition escalation, rather than throwing.
    metrics = normalizeFileMetrics({ parseStatus: 'failed', specVersion: 'unknown' });
  }

  const score = scoreFile(metrics, { asOf });
  return { format, metrics, score };
}
