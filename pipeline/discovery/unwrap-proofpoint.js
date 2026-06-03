// pipeline/discovery/unwrap-proofpoint.js
//
// Some hospitals' mrf_file_url is a Proofpoint "URL Defense" v3 wrapper
// (https://urldefense.com/v3/__<encoded>__;<b64>!!...). The real link is encoded
// inside; unwrapped, these point at hospitalpricedisclosure.com, a vendor we
// already parse fine. This decodes them in place so the normal pipeline can fetch
// them, and clears their now-stale failure records so a pass will retry them.
//
// Usage: node pipeline/discovery/unwrap-proofpoint.js [--dry-run]

import pg from 'pg';
import { loadEnv } from '../../db/load-env.js';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Decode a Proofpoint URL Defense v3 wrapped URL. Returns the original URL, or null. */
export function decodeProofpointV3(u) {
  const m = String(u).match(/urldefense\.com\/v3\/__(.+?)__;([^!]*)!!/);
  if (!m) return null;
  const enc = m[2];
  const repl = enc ? Buffer.from(enc.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('latin1') : '';
  let out = '', ri = 0, i = 0;
  const s = m[1];
  while (i < s.length) {
    if (s[i] === '*') {
      if (s[i + 1] === '*') { // run: next char is a base64 index = run length
        const n = B64.indexOf(s[i + 2]);
        out += repl.substr(ri, n); ri += n; i += 3;
      } else { out += repl[ri] ?? ''; ri += 1; i += 1; }
    } else { out += s[i]; i += 1; }
  }
  // Proofpoint collapses the protocol "//" to "/" (https:/host). Restore it.
  return out.replace(/^(https?:)\/(?!\/)/, '$1//');
}

async function main() {
  loadEnv();
  const dryRun = process.argv.includes('--dry-run');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
  pool.on('error', () => {});
  const { rows } = await pool.query(
    `SELECT id, ccn, mrf_file_url FROM hospitals WHERE mrf_file_url LIKE '%urldefense.com%'`
  );
  let updated = 0, undecodable = 0;
  for (const h of rows) {
    const decoded = decodeProofpointV3(h.mrf_file_url);
    if (!decoded || !/^https?:\/\//.test(decoded)) { undecodable++; console.warn(`  ? ${h.ccn}: could not decode`); continue; }
    if (dryRun) { console.log(`  ${h.ccn} -> ${decoded.slice(0, 90)}`); updated++; continue; }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE hospitals SET mrf_file_url = $2 WHERE id = $1', [h.id, decoded]);
      // Drop stale failure records for the old (broken) URL so a pass retries it.
      await client.query("DELETE FROM ingest_attempts WHERE hospital_id = $1 AND status = 'fail'", [h.id]);
      await client.query('COMMIT');
      updated++;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      console.warn(`  ! ${h.ccn}: ${e.message}`);
    } finally {
      client.release();
    }
  }
  console.log(`Proofpoint unwrap: ${updated} updated, ${undecodable} undecodable, of ${rows.length} total${dryRun ? ' (dry-run)' : ''}.`);
  await pool.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
