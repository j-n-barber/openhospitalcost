// pipeline/parse/detect-format.js
//
// Format detection for downloaded MRFs. The spike (docs/PARSER_NOTES.md §
// "Parser design implications", items 1-3) established that we MUST NOT trust
// the file extension: Cleveland Clinic ships a .zip via Content-Disposition,
// Memorial Hermann serves through a .ashx handler, and several JSON files
// carry a UTF-8 BOM. So detection is magic-bytes-first, headers second,
// extension last.
//
// Pure functions, no I/O — the caller reads the first chunk of the file (see
// readHeadBytes) and the HTTP response meta, and passes them in. This keeps
// detection trivially testable against the sample files.

import { openSync, readSync, closeSync } from 'node:fs';

// Container (compression) magic bytes.
const ZIP_MAGICS = [
  [0x50, 0x4b, 0x03, 0x04], // PK\x03\x04 — normal archive
  [0x50, 0x4b, 0x05, 0x06], // empty archive
  [0x50, 0x4b, 0x07, 0x08], // spanned archive
];
const GZIP_MAGIC = [0x1f, 0x8b];
export const UTF8_BOM = [0xef, 0xbb, 0xbf];

// How many leading bytes the caller should hand us. 64 is plenty to clear a
// BOM + whitespace and see the first structural character.
export const HEAD_BYTE_COUNT = 64;

function startsWith(bytes, magic) {
  if (!bytes || bytes.length < magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic[i]) return false;
  }
  return true;
}

export function hasUtf8Bom(bytes) {
  return startsWith(bytes, UTF8_BOM);
}

/** Strip a leading UTF-8 BOM from a Buffer or string (no-op if absent). */
export function stripBom(input) {
  if (typeof input === 'string') {
    return input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  }
  return hasUtf8Bom(input) ? input.subarray(UTF8_BOM.length) : input;
}

/** Read the first HEAD_BYTE_COUNT bytes of a file as a Buffer (for detection). */
export function readHeadBytes(filePath, n = HEAD_BYTE_COUNT) {
  const fd = openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(n);
    const bytesRead = readSync(fd, buf, 0, n, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    closeSync(fd);
  }
}

function detectContainer(headBytes, contentType, contentDisposition) {
  for (const magic of ZIP_MAGICS) {
    if (startsWith(headBytes, magic)) return { container: 'zip', reason: 'magic-bytes' };
  }
  if (startsWith(headBytes, GZIP_MAGIC)) return { container: 'gzip', reason: 'magic-bytes' };

  const ct = (contentType || '').toLowerCase();
  const cd = (contentDisposition || '').toLowerCase();
  if (ct.includes('zip') || /filename=.*\.zip/.test(cd)) return { container: 'zip', reason: 'http-header' };
  if (ct.includes('gzip') || /filename=.*\.gz/.test(cd)) return { container: 'gzip', reason: 'http-header' };
  return { container: 'plain', reason: 'no-compression-signal' };
}

// First non-BOM, non-whitespace byte tells JSON ({ or [) from CSV.
function detectPayloadFromBytes(headBytes) {
  let bytes = stripBom(headBytes);
  let i = 0;
  while (i < bytes.length && (bytes[i] === 0x20 || bytes[i] === 0x09 || bytes[i] === 0x0a || bytes[i] === 0x0d)) {
    i++;
  }
  const first = bytes[i];
  if (first === 0x7b || first === 0x5b) return 'json'; // { or [
  if (first === undefined) return 'unknown';
  return 'csv';
}

/**
 * Detect the format of a downloaded MRF.
 *
 * @param {object} args
 * @param {Buffer} args.headBytes            first bytes of the file (use readHeadBytes)
 * @param {string} [args.contentType]        HTTP Content-Type
 * @param {string} [args.contentDisposition] HTTP Content-Disposition
 * @param {string} [args.url]                source URL (extension is a last-resort hint only)
 * @returns {{container:'zip'|'gzip'|'plain', payload:'json'|'csv'|'unknown',
 *            hasBom:boolean, containerReason:string, payloadReason:string}}
 *
 * For compressed containers, `payload` is 'unknown' here — it must be
 * re-detected on the decompressed stream (the head bytes are compressed). The
 * caller can pass a filename hint from Content-Disposition to narrow it.
 */
export function detectFormat({ headBytes, contentType, contentDisposition, url } = {}) {
  const { container, reason: containerReason } = detectContainer(headBytes, contentType, contentDisposition);
  const hasBom = hasUtf8Bom(headBytes);

  if (container !== 'plain') {
    // Can't sniff compressed bytes; hint from headers/URL, else defer.
    const ct = (contentType || '').toLowerCase();
    const hint = `${contentDisposition || ''} ${url || ''}`.toLowerCase();
    let payload = 'unknown';
    let payloadReason = 'deferred-until-decompressed';
    if (ct.includes('json') || /\.json(\.|"|$|\?)/.test(hint)) { payload = 'json'; payloadReason = 'header-hint'; }
    else if (ct.includes('csv') || /\.csv(\.|"|$|\?)/.test(hint)) { payload = 'csv'; payloadReason = 'header-hint'; }
    return { container, payload, hasBom, containerReason, payloadReason };
  }

  let payload = detectPayloadFromBytes(headBytes);
  let payloadReason = 'magic-bytes';
  if (payload === 'unknown') {
    const ct = (contentType || '').toLowerCase();
    if (ct.includes('json')) { payload = 'json'; payloadReason = 'http-header'; }
    else if (ct.includes('csv') || ct.includes('text')) { payload = 'csv'; payloadReason = 'http-header'; }
  }
  return { container, payload, hasBom, containerReason, payloadReason };
}
