// pipeline/discovery/audit-duplicate-data.js
//
// CONTENT-BASED attribution audit (stronger than audit-shared-mrf-urls.js,
// which only compares URLs). It fingerprints every hospital's full price vector
// and finds hospitals whose data is BYTE-IDENTICAL to another's. Identical data
// across hospitals means they carry the same source file — which is only
// correct when each hospital's own MRF URL actually names that hospital (a real
// system publishing one chargemaster per correctly-named facility, e.g. St
// Elizabeth Dearborn/Edgewood/Florence). When a hospital's data is identical to
// another's AND its own URL does NOT name it, that hospital is showing someone
// else's prices (e.g. Providence Alaska whose URL is providence-willamette-falls;
// UNC Hospitals sharing an opaque elevatepfs hash with Universal Behavioral).
//
// Decision rule (per content-identical cluster):
//   keep   : members whose own URL filename names them (selfMatch > 0)
//   remove : members whose own URL does NOT name them (selfMatch == 0)
//   flag   : clusters where ALL members self-name yet data is identical
//            (possible vendor-served-duplicate) -> reported, never auto-removed
//
// The matcher splits camelCase + delimiters and matches tokens EXACTLY, so
// "ChristianHospital" -> {christian} matches "Christian Hospital NE" but NOT
// "Christiana Hospital" (a different hospital).
//
// SCOPE-SAFE: dry-run by default (prints every keep/remove with the matched
// token). --purge performs the deletes (summary by source_file_id + the wrong
// mrf_files row, then nulls the URL to re-queue discovery). Atomic.
//
// Usage:
//   node pipeline/discovery/audit-duplicate-data.js            # dry-run, full detail
//   node pipeline/discovery/audit-duplicate-data.js --purge    # apply removes

import pg from 'pg';
import { loadEnv } from '../../db/load-env.js';

const STOP = new Set([
  'hospital', 'hospitals', 'medical', 'center', 'centre', 'health', 'healthcare',
  'system', 'systems', 'inc', 'llc', 'the', 'of', 'and', 'at', 'for',
  'regional', 'memorial', 'community', 'county', 'general', 'campus', 'llp',
  'standardcharges', 'standard', 'charges', 'charge', 'machinereadable', 'mrf',
  'cdm', 'pricetransparency', 'transparency', 'pricing', 'price', 'file', 'files',
  'download', 'export', 'report', 'reports', 'public', 'documents', 'uploads',
  'hpt', 'json', 'csv', 'xml', 'standardcharge', 'rc', 'main',
  // TLDs / web noise (so a hospital's OWN domain still yields its identity but
  // generic web tokens don't create spurious matches).
  'com', 'org', 'net', 'www', 'edu', 'gov', 'http', 'https', 'media', 'sites',
  'default', 'content', 'dam', 'wp', 'assets', 'globalassets',
]);

// Robust tokenizer: split camelCase first, then non-alphanumeric, lowercase,
// drop stopwords / short / pure-digit tokens. Returns a Set for exact matching.
function tokens(s) {
  if (!s) return new Set();
  let str;
  try { str = decodeURIComponent(String(s)); } catch { str = String(s); }
  return new Set(
    str
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // camelCase -> space
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((t) => t.length >= 3 && !STOP.has(t) && !/^\d+$/.test(t))
  );
}

// Identity tokens a URL exposes for matching a hospital name: the FULL hostname
// (a hospital self-hosted on adventhealth.com / honorhealth.com carries its
// identity in the domain, so we must NOT drop it — TLDs are dropped via STOP),
// plus path + filename + query.
function urlTokens(url) {
  try {
    const u = new URL(url);
    return tokens(`${u.hostname} ${u.pathname} ${u.search}`);
  } catch {
    return tokens(url);
  }
}

function selfMatch(name, slug, url) {
  const hosp = new Set([...tokens(name), ...tokens(slug)]);
  const ut = urlTokens(url);
  const hits = [...hosp].filter((t) => ut.has(t));
  return hits;
}

// Reduce to alphanumerics only, for contiguous slug-substring matching that is
// independent of separator style (`_`, `-`, `/`, camelCase).
function alnum(s) {
  if (!s) return '';
  let str; try { str = decodeURIComponent(String(s)); } catch { str = String(s); }
  return str.replace(/([a-z0-9])([A-Z])/g, '$1$2').toLowerCase().replace(/[^a-z0-9]/g, '');
}
// A slug is "identifying" only if it's long enough and multi-word that a
// substring hit is not a coincidence (avoids matching short/generic slugs).
function isIdentifying(slug) {
  const toks = tokens(slug); // distinctive, non-stopword tokens
  return alnum(slug).length >= 14 && toks.size >= 2;
}

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set.');
  const purge = process.argv.includes('--purge');

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
  pool.on('error', () => {});
  try {
    // Fingerprint every hospital's full price vector; keep only dup signatures.
    const { rows } = await pool.query(`
      WITH fp AS (
        SELECT s.hospital_id,
               md5(string_agg(s.procedure_id::text||':'||s.charge_type||':'||s.amount::text,
                              ',' ORDER BY s.procedure_id, s.charge_type, s.amount)) AS sig,
               count(*) AS rows
        FROM procedure_hospital_summary s GROUP BY s.hospital_id
      ),
      dup AS (SELECT sig FROM fp GROUP BY sig HAVING count(*) > 1)
      SELECT fp.sig, fp.rows, h.id, h.ccn, h.name, h.slug, h.state, h.mrf_file_url AS url
      FROM fp JOIN dup USING (sig) JOIN hospitals h ON h.id = fp.hospital_id
      ORDER BY fp.sig, h.state, h.name
    `);

    // Full roster of IDENTIFYING slugs (alnum form) so we can detect when a
    // hospital's URL embeds a DIFFERENT hospital's complete slug (the true owner).
    const roster = (await pool.query(
      `SELECT id, slug, name FROM hospitals WHERE slug IS NOT NULL`
    )).rows
      .map((r) => ({ id: r.id, name: r.name, a: alnum(r.slug), ident: isIdentifying(r.slug) }))
      .filter((r) => r.ident && r.a.length >= 14);

    // Positive-evidence owner ID: does urlAlnum contain a roster slug?
    // Returns { selfOwned, owner|null }. owner = longest OTHER slug contained.
    function classifyMember(m) {
      const urlA = alnum(m.url);
      const ownA = alnum(m.slug);
      const selfOwned = ownA.length >= 10 && urlA.includes(ownA);
      // Member's own identity tokens — used to reject "owner" candidates that are
      // really just this hospital's own parent system (e.g. matching the generic
      // "cleveland-clinic" slug inside "Cleveland Clinic Indian River"'s URL).
      const selfTokens = new Set([...tokens(m.name), ...tokens(m.slug)]);
      let owner = null;
      if (!selfOwned) {
        for (const r of roster) {
          if (r.id === m.id || r.a === ownA) continue;
          if (!urlA.includes(r.a)) continue;
          // Disqualify if every distinctive token of the candidate is already in
          // this hospital's own name (candidate is its parent/system, not a
          // different owner). Requires at least one token NOT shared.
          const cand = tokens(r.name);
          if (cand.size && [...cand].every((t) => selfTokens.has(t))) continue;
          if (!owner || r.a.length > owner.a.length) owner = r;
        }
      }
      return { selfOwned, owner };
    }

    const groups = new Map();
    for (const r of rows) {
      if (!groups.has(r.sig)) groups.set(r.sig, []);
      groups.get(r.sig).push(r);
    }

    const removeList = [];
    let misassignClusters = 0, unattribClusters = 0, selfClusters = 0;
    const tail = (u) => { try { return decodeURIComponent(new URL(u).pathname.split('/').pop() || new URL(u).hostname); } catch { return u; } };
    console.log(`Content-identical clusters: ${groups.size} (covering ${rows.length} hospitals)\n`);

    for (const [sig, members] of groups) {
      const scored = members.map((m) => ({ ...m, ...classifyMember(m) }));
      // REMOVE only with POSITIVE evidence: the URL embeds a DIFFERENT hospital's
      // complete slug (the file belongs to that named hospital, not this one).
      const remove = scored.filter((m) => !m.selfOwned && m.owner);
      const unattributed = scored.filter((m) => !m.selfOwned && !m.owner);
      const self = scored.filter((m) => m.selfOwned);

      let cls;
      if (remove.length) { cls = 'MISASSIGN'; misassignClusters++; }
      else if (unattributed.length === members.length) { cls = 'UNATTRIB-review'; unattribClusters++; }
      else { cls = 'SYSTEM-self-named'; selfClusters++; }

      console.log(`[${cls}] ${sig.slice(0, 10)} (${members.length} hospitals, ${members[0].rows} rows each)`);
      for (const m of self) console.log(`   keep   ${m.state}:${m.name}  (own slug in url)`);
      for (const m of unattributed) console.log(`   ?      ${m.state}:${m.name}  url=${tail(m.url)}  (no slug evidence — left for EIN step)`);
      for (const m of remove) {
        console.log(`   REMOVE ${m.state}:${m.name} (${m.ccn})  -> file belongs to "${m.owner.name}"`);
        removeList.push(m);
      }
      console.log('');
    }

    console.log(`Summary: ${misassignClusters} clusters with positive mis-assignment evidence, ` +
      `${selfClusters} system/self-named, ${unattribClusters} unattributed (need EIN verification).`);
    console.log(`Hospitals to REMOVE (URL names a DIFFERENT hospital): ${removeList.length}\n`);

    if (!purge) {
      console.log('DRY-RUN. Re-run with --purge to apply (removes only positive-evidence mis-assignments).');
      return;
    }

    // --- Purge (atomic): for each wrong hospital, delete summary derived from
    // its (wrong) file by source_file_id, delete that mrf_files row, null URL. ---
    const client = await pool.connect();
    let sDel = 0, fDel = 0, uNull = 0, blocked = 0;
    try {
      await client.query('BEGIN');
      for (const m of removeList) {
        // Record the confirmed-wrong (hospital, url) pair BEFORE nulling, so the
        // discovery matcher never re-assigns it (stops the no-EIN recurrence).
        if (m.url) {
          blocked += (await client.query(
            `INSERT INTO mrf_assignment_blocklist (hospital_id, url, reason)
             VALUES ($1,$2,$3) ON CONFLICT (hospital_id, url) DO NOTHING`,
            [m.id, m.url, `fingerprint audit: file belongs to ${m.owner?.name ?? '?'}`])).rowCount;
        }
        const files = (await client.query(
          `SELECT id FROM mrf_files WHERE hospital_id=$1`, [m.id]
        )).rows.map((r) => r.id);
        if (files.length) {
          sDel += (await client.query(
            `DELETE FROM procedure_hospital_summary WHERE source_file_id = ANY($1::uuid[])`, [files])).rowCount;
          fDel += (await client.query(`DELETE FROM mrf_files WHERE id = ANY($1::uuid[])`, [files])).rowCount;
        }
        uNull += (await client.query(
          `UPDATE hospitals SET mrf_file_url=NULL, mrf_format=NULL, last_mrf_hash=NULL, updated_at=now() WHERE id=$1`,
          [m.id])).rowCount;
      }
      await client.query('COMMIT');
      console.log(`PURGED: ${sDel} summary rows, ${fDel} mrf_files, ${uNull} URLs nulled (re-queued), ${blocked} blocklisted.`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('PURGE ROLLED BACK:', err.message);
      throw err;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });
