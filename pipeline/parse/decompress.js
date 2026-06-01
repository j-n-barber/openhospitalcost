// pipeline/parse/decompress.js
//
// Decompress a container MRF to a plain file on disk, then the orchestrator
// re-detects the payload (CSV vs JSON) from the decompressed bytes.
//
// Spike context (docs/PARSER_NOTES.md § 6): Cleveland Clinic ships a 51 MB ZIP
// that expands to a 1.5 GB CSV. We must stream, never buffer the whole thing.
// gzip is supported natively by node:zlib; zip needs a streaming unzip.

import { dirname } from 'node:path';

/**
 * @param {object} args
 * @param {string} args.filePath   path to the compressed download
 * @param {'zip'|'gzip'} args.container
 * @param {string} [args.workDir]  where to write the decompressed file (defaults alongside input)
 * @returns {Promise<{path:string, payload:'json'|'csv'|'unknown'}>}
 */
export async function decompress({ filePath, container, workDir }) {
  void workDir; void dirname; // referenced by the Phase C implementation below

  // --- Phase C TODO -------------------------------------------------------
  // gzip:
  //   import { createGunzip } from 'node:zlib';
  //   import { createReadStream, createWriteStream } from 'node:fs';
  //   import { pipeline } from 'node:stream/promises';
  //   await pipeline(createReadStream(filePath), createGunzip(), createWriteStream(outPath));
  //
  // zip (node has no built-in zip reader — add a streaming dep, e.g.
  // `unzipper` or `yauzl`; prefer one that streams entries):
  //   - Open the archive, find the single standardcharges.{csv,json} entry
  //     (HPT ZIPs contain one data file; ignore __MACOSX/ and dotfiles).
  //   - Stream that entry to outPath. Do NOT load 1.5 GB into memory.
  //
  // After writing outPath, re-detect payload from its head bytes via
  // detect-format.readHeadBytes + detectPayloadFromBytes (export it if needed).
  throw new Error(
    `decompress(${container}) not implemented — Phase C. See inline spec + PARSER_NOTES.md § 6. Input: ${filePath}`
  );
}
