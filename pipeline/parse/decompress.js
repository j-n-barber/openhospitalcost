// pipeline/parse/decompress.js
//
// Decompress a container MRF to a plain file on disk, then re-detect the
// payload (CSV vs JSON) from the decompressed bytes.
//
// Spike context (docs/PARSER_NOTES.md § 6): Cleveland Clinic ships a 51 MB ZIP
// that expands to 1.5 GB. We never buffer the payload in memory:
//   - zip: shell out to the system `unzip`, which writes straight to disk
//     (no stdout buffering). Avoids a runtime dependency; `unzip` ships on
//     macOS and is a one-line add on Railway/nixpacks.
//   - gzip: node:zlib streaming (built in, no dependency).

import { spawnSync } from 'node:child_process';
import { createReadStream, createWriteStream, mkdirSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { detectFormat, readHeadBytes } from './detect-format.js';

function reDetectPayload(filePath) {
  const fmt = detectFormat({ headBytes: readHeadBytes(filePath) });
  return fmt.payload;
}

function unzipSingleEntry(filePath, workDir) {
  const list = spawnSync('unzip', ['-Z1', filePath], { encoding: 'utf8' });
  if (list.status !== 0) {
    throw new Error(`unzip listing failed for ${filePath}: ${list.stderr || list.error?.message}`);
  }
  const entries = list.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
  // HPT archives contain one data file; ignore macOS resource forks / dotfiles.
  const entry = entries.find(
    (e) => /\.(csv|json)$/i.test(e) && !e.startsWith('__MACOSX') && !basename(e).startsWith('.')
  );
  if (!entry) {
    throw new Error(`No .csv/.json entry found in ${filePath}. Entries: ${entries.join(', ')}`);
  }
  // -o overwrite, -j junk paths -> lands at workDir/basename(entry).
  const ex = spawnSync('unzip', ['-o', '-j', filePath, entry, '-d', workDir], { encoding: 'utf8' });
  if (ex.status !== 0) {
    throw new Error(`unzip extract failed for ${entry}: ${ex.stderr || ex.error?.message}`);
  }
  return join(workDir, basename(entry));
}

/**
 * @param {object} args
 * @param {string} args.filePath
 * @param {'zip'|'gzip'} args.container
 * @param {string} [args.workDir]  defaults to a per-file temp dir
 * @returns {Promise<{path:string, payload:'json'|'csv'|'unknown'}>}
 */
export async function decompress({ filePath, container, workDir }) {
  const dir = workDir ?? join(tmpdir(), `ohc-mrf-${basename(filePath)}`);
  mkdirSync(dir, { recursive: true });

  let outPath;
  if (container === 'zip') {
    outPath = unzipSingleEntry(filePath, dir);
  } else if (container === 'gzip') {
    outPath = join(dir, basename(filePath).replace(/\.gz$/i, '') || 'mrf.out');
    await pipeline(createReadStream(filePath), createGunzip(), createWriteStream(outPath));
  } else {
    throw new Error(`Unsupported container: ${container}`);
  }

  return { path: outPath, payload: reDetectPayload(outPath) };
}
