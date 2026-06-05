// pipeline/discovery/verify-attribution.js
//
// ROOT-CAUSE verifier for MRF mis-assignment. The CMS price-transparency naming
// convention is `<EIN>_<facility-slug>_standardcharges.<ext>`, so a correctly
// assigned file's URL embeds the hospital's own EIN and slug. This tool checks
// EVERY hospital with a URL (not only those already caught in a duplicate-data
// cluster) and classifies the assignment by POSITIVE slug evidence:
//
//   OK_self      : the URL contains the hospital's OWN slug -> correct.
//   MISASSIGNED  : the URL contains a DIFFERENT roster hospital's complete slug
//                  -> the file belongs to that hospital; this one is wrong.
//   UNATTRIB     : no slug evidence (opaque vendor URL) -> can't verify here.
//
// As a safe, additive byproduct, --apply populates hospitals.ein from the
// filename EIN of OK_self hospitals — building the authoritative EIN map from
// verified-correct assignments, which the discovery scraper should then use to
// match on EIN instead of fuzzy name (preventing recurrence).
//
// This tool does NOT delete data. Purging MISASSIGNED hospitals is done (with
// the same positive-evidence rule) by audit-duplicate-data.js --purge; this
// reports the full-roster MISASSIGNED list for that follow-up.
//
// Usage:
//   node pipeline/discovery/verify-attribution.js            # dry-run report
//   node pipeline/discovery/verify-attribution.js --apply    # + populate hospitals.ein

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
  'com', 'org', 'net', 'www', 'edu', 'gov', 'http', 'https', 'media', 'sites',
  'default', 'content', 'dam', 'wp', 'assets', 'globalassets',
]);

function tokens(s) {
  if (!s) return new Set();
  let str; try { str = decodeURIComponent(String(s)); } catch { str = String(s); }
  return new Set(str.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').split(' ')
    .filter((t) => t.length >= 3 && !STOP.has(t) && !/^\d+$/.test(t)));
}
function alnum(s) {
  if (!s) return '';
  let str; try { str = decodeURIComponent(String(s)); } catch { str = String(s); }
  return str.replace(/([a-z0-9])([A-Z])/g, '$1$2').toLowerCase().replace(/[^a-z0-9]/g, '');
}
function isIdentifying(slug) {
  return alnum(slug).length >= 14 && tokens(slug).size >= 2;
}
// Leading (or first) EIN in the URL's last path segment: NN-NNNNNNN or 9 digits.
function fileEin(url) {
  let base;
  try { base = decodeURIComponent(new URL(url).pathname.split('/').pop() || ''); } catch { base = String(url); }
  const m = base.match(/(\d{2})-?(\d{7})(?!\d)/);
  return m ? m[1] + m[2] : null;
}

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set.');
  const apply = process.argv.includes('--apply');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
  pool.on('error', () => {});
  try {
    const all = (await pool.query(
      `SELECT id, ccn, name, slug, state, ein, mrf_file_url AS url FROM hospitals WHERE slug IS NOT NULL`
    )).rows;
    const withUrl = all.filter((h) => h.url);
    // Identifying roster slugs (>=14 alnum chars, >=2 distinctive tokens).
    const rosterSlugs = all.map((r) => ({ id: r.id, name: r.name, a: alnum(r.slug), ident: isIdentifying(r.slug) }))
      .filter((r) => r.ident && r.a.length >= 14);

    const buckets = { OK_self: [], MISASSIGNED: [], UNATTRIB: [] };
    const einUpdates = [];
    for (const h of withUrl) {
      const urlA = alnum(h.url);
      const ownA = alnum(h.slug);
      const selfTokens = new Set([...tokens(h.name), ...tokens(h.slug)]);
      const selfOwned = ownA.length >= 10 && urlA.includes(ownA);
      let owner = null;
      if (!selfOwned) {
        for (const r of rosterSlugs) {
          if (r.id === h.id || r.a === ownA) continue;
          if (!urlA.includes(r.a)) continue;
          const cand = tokens(r.name);
          if (cand.size && [...cand].every((t) => selfTokens.has(t))) continue; // parent system
          if (!owner || r.a.length > owner.a.length) owner = r;
        }
      }
      const ein = fileEin(h.url);
      if (selfOwned) {
        buckets.OK_self.push(h);
        if (ein && !h.ein) einUpdates.push({ id: h.id, ein });
      } else if (owner) {
        buckets.MISASSIGNED.push({ ...h, ownerName: owner.name });
      } else {
        buckets.UNATTRIB.push(h);
      }
    }

    console.log(`Hospitals with a URL: ${withUrl.length}`);
    console.log(`  OK_self     : ${buckets.OK_self.length}  (URL contains the hospital's own slug)`);
    console.log(`  MISASSIGNED : ${buckets.MISASSIGNED.length}  (URL names a DIFFERENT hospital)`);
    console.log(`  UNATTRIB    : ${buckets.UNATTRIB.length}  (opaque/vendor URL — no slug evidence)`);
    console.log(`  EIN derivable from OK_self URLs: ${einUpdates.length}\n`);

    console.log('--- MISASSIGNED (full roster, positive slug evidence) ---');
    for (const h of buckets.MISASSIGNED.slice(0, 60)) {
      console.log(`  ${h.state}:${h.name} (${h.ccn})  -> file belongs to "${h.ownerName}"`);
    }
    if (buckets.MISASSIGNED.length > 60) console.log(`  ... +${buckets.MISASSIGNED.length - 60} more`);

    if (apply && einUpdates.length) {
      const client = await pool.connect();
      let n = 0;
      try {
        await client.query('BEGIN');
        for (const u of einUpdates) {
          n += (await client.query(`UPDATE hospitals SET ein=$2, updated_at=now() WHERE id=$1 AND ein IS NULL`,
            [u.id, u.ein])).rowCount;
        }
        await client.query('COMMIT');
        console.log(`\nAPPLIED: populated ein for ${n} verified-correct (OK_self) hospitals.`);
      } catch (err) {
        await client.query('ROLLBACK'); console.error('ROLLED BACK:', err.message); throw err;
      } finally { client.release(); }
    } else if (!apply) {
      console.log('\nDRY-RUN. --apply populates hospitals.ein for OK_self hospitals (additive, no deletes).');
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });
