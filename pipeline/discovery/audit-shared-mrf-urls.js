// pipeline/discovery/audit-shared-mrf-urls.js
//
// Data-integrity audit: find MRF file URLs assigned to MORE THAN ONE hospital
// and classify each shared URL, because a single-facility MRF assigned to the
// wrong hospital publishes one hospital's prices on another's page — a
// correctness bug for a transparency site. The CMS-HPT discovery scraper
// fuzzy-matches hospital names to file links, which produced cross-state
// mis-assignments (e.g. AZ hospitals pointed at Cleveland Clinic OH files,
// "Jacksonville Memorial IL" pointed at "Jackson Hospital Miami FL").
//
// Classification (per shared URL):
//   - generic_portal     : the URL carries NO hospital identity (a vendor
//                          landing page like mrf.panaceainc.com/Download.aspx or
//                          cdmpricing.com/<hash>) grabbed for many hospitals. No
//                          hospital "owns" it; it never yields a real MRF.
//   - likely_system_file : EVERY hospital on the URL shares identity tokens with
//                          it (a true multi-facility system file, e.g. Oceans
//                          Behavioral, NY State OMH). Left alone.
//   - misassignment      : SOME hospitals match the URL's identity and some do
//                          NOT. The non-matchers are suspected wrong assignments;
//                          the best-matching hospital is the suspected owner.
//
// SCOPE-SAFE, mirroring refresh-untried-urls.js:
//   - Default is DRY-RUN. Only --apply writes.
//   - --apply performs ONLY the zero-data-loss fix: null the mrf_file_url of
//     generic_portal hospitals that have NO successful parse, so the discovery
//     pass re-finds a real per-hospital URL. It NEVER deletes parsed price data.
//   - Suspected misassignments WITH live parsed data are written to a JSON
//     report (docs/shared-url-audit.json) for human review + a separate purge
//     step — never auto-deleted here, because distinguishing a legit system file
//     from a single-facility mis-assignment is not safe to fully automate.
//
// Usage:
//   node pipeline/discovery/audit-shared-mrf-urls.js                    # dry-run report
//   node pipeline/discovery/audit-shared-mrf-urls.js --apply            # + safe URL cleanup
//   node pipeline/discovery/audit-shared-mrf-urls.js --json             # write JSON report
//   node pipeline/discovery/audit-shared-mrf-urls.js --purge-misassigned
//        # delete the wrong (cross-state, zero-match) hospitals' data derived
//        # from the mis-assigned file (surgical: by source_file_id) and null
//        # their URL to re-queue discovery. High-confidence cross-state only.

import pg from 'pg';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadEnv } from '../../db/load-env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT_PATH = resolve(__dirname, '../../docs/shared-url-audit.json');

// Tokens too common to identify a hospital. Kept distinctive ones (mercy, saint).
const STOP = new Set([
  'hospital', 'hospitals', 'medical', 'center', 'centre', 'health', 'healthcare',
  'system', 'systems', 'inc', 'llc', 'the', 'of', 'and', 'at', 'for', 'a',
  'regional', 'memorial', 'community', 'county', 'general', 'campus', 'llp',
  'standardcharges', 'standard', 'charges', 'charge', 'machinereadable', 'mrf',
  'cdm', 'pricetransparency', 'transparency', 'pricing', 'price', 'file', 'files',
  'download', 'export', 'report', 'reports', 'public', 'documents', 'uploads',
  'cy2022', 'cy2023', 'cy2024', 'cy2025', 'cy2026', '2022', '2023', '2024', '2025', '2026',
]);

function tokenize(s) {
  if (!s) return [];
  return decodeURIComponent(String(s))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length >= 3 && !STOP.has(t) && !/^\d+$/.test(t));
}

// Identity tokens the URL exposes: path + query, minus host/vendor noise.
function urlIdentityTokens(url) {
  try {
    const u = new URL(url);
    // Drop the bare host (vendor brand) but keep host subdomain words that may
    // name the org (e.g. "samaritanhealth" in samaritanhealth.pt.panaceainc.com).
    const sub = u.hostname.split('.').slice(0, -2).join(' ');
    return new Set(tokenize(`${sub} ${u.pathname} ${u.search}`));
  } catch {
    return new Set(tokenize(url));
  }
}

function score(hospitalTokens, urlTokens) {
  let n = 0;
  for (const t of hospitalTokens) if (urlTokens.has(t)) n++;
  return n;
}

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set.');
  const apply = process.argv.includes('--apply');
  const purge = process.argv.includes('--purge-misassigned');
  const wantJson = process.argv.includes('--json') || apply || purge;

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
  pool.on('error', () => {});

  try {
    // Every hospital on a URL shared by >1 hospital, with parsed-state flag.
    const { rows } = await pool.query(`
      SELECT h.id, h.ccn, h.name, h.slug, h.state, h.mrf_file_url AS url,
             EXISTS (SELECT 1 FROM mrf_files f WHERE f.hospital_id = h.id AND f.status='parsed') AS parsed
      FROM hospitals h
      WHERE h.mrf_file_url IN (
        SELECT mrf_file_url FROM hospitals WHERE mrf_file_url IS NOT NULL
        GROUP BY mrf_file_url HAVING count(*) > 1
      )
      ORDER BY h.mrf_file_url, h.state, h.name
    `);

    // Group by URL.
    const groups = new Map();
    for (const r of rows) {
      if (!groups.has(r.url)) groups.set(r.url, []);
      groups.get(r.url).push(r);
    }

    const classified = { generic_portal: [], likely_system_file: [], misassignment: [] };
    for (const [url, members] of groups) {
      const urlTokens = urlIdentityTokens(url);
      const scored = members.map((m) => ({
        ...m,
        score: score(new Set([...tokenize(m.name), ...tokenize(m.slug)]), urlTokens),
      }));
      const maxScore = Math.max(...scored.map((s) => s.score));
      const states = new Set(members.map((m) => m.state));
      const owner = scored.find((s) => s.score === maxScore && s.score > 0) || null;
      const entry = { url, states: [...states], members: scored, owner: owner?.ccn ?? null };

      if (maxScore === 0) {
        classified.generic_portal.push(entry); // no hospital identity in URL
      } else if (scored.every((s) => s.score > 0)) {
        classified.likely_system_file.push(entry); // all share identity -> system file
      } else {
        entry.wrong = scored.filter((s) => s.score === 0); // matchless = suspected wrong
        classified.misassignment.push(entry);
      }
    }

    // --- Report -------------------------------------------------------------
    const sum = (arr, f) => arr.reduce((a, e) => a + f(e), 0);
    const parsedIn = (arr) => sum(arr, (e) => e.members.filter((m) => m.parsed).length);
    console.log(`Shared MRF URLs: ${groups.size} (covering ${rows.length} hospitals)\n`);
    console.log(`  generic_portal     : ${classified.generic_portal.length} URLs, ${parsedIn(classified.generic_portal)} parsed`);
    console.log(`  likely_system_file : ${classified.likely_system_file.length} URLs, ${parsedIn(classified.likely_system_file)} parsed (left alone)`);
    console.log(`  misassignment      : ${classified.misassignment.length} URLs, ${parsedIn(classified.misassignment)} parsed\n`);

    const wrongParsed = sum(classified.misassignment, (e) => e.wrong.filter((w) => w.parsed).length);
    console.log(`Suspected WRONG assignments with LIVE parsed data: ${wrongParsed} hospitals`);
    console.log('(these show another hospital\'s prices — candidates for purge + re-discovery)\n');

    console.log('--- Top suspected misassignments (cross-state, parsed) ---');
    const worst = classified.misassignment
      .filter((e) => e.states.length > 1 && e.wrong.some((w) => w.parsed))
      .slice(0, 20);
    for (const e of worst) {
      const ownerM = e.members.find((m) => m.ccn === e.owner);
      console.log(`\n  ${e.url.slice(0, 80)}`);
      console.log(`    owner≈ ${ownerM ? `${ownerM.state}:${ownerM.name}` : '?'}`);
      for (const w of e.wrong) console.log(`    WRONG  ${w.state}:${w.name} (${w.ccn})${w.parsed ? ' [PARSED-live]' : ''}`);
    }

    // --- JSON report for the purge step ------------------------------------
    if (wantJson) {
      const purgeTargets = classified.misassignment.flatMap((e) =>
        e.wrong.filter((w) => w.parsed).map((w) => ({
          ccn: w.ccn, hospital_id: w.id, name: w.name, state: w.state,
          wrong_url: e.url, owner_ccn: e.owner, cross_state: e.states.length > 1,
        }))
      );
      writeFileSync(REPORT_PATH, JSON.stringify({
        generated_for_review: true,
        counts: {
          shared_urls: groups.size,
          generic_portal: classified.generic_portal.length,
          likely_system_file: classified.likely_system_file.length,
          misassignment: classified.misassignment.length,
          wrong_parsed_hospitals: wrongParsed,
        },
        purge_candidates: purgeTargets,
        generic_portal_urls: classified.generic_portal.map((e) => ({
          url: e.url, hospitals: e.members.map((m) => m.ccn), any_parsed: e.members.some((m) => m.parsed),
        })),
      }, null, 2));
      console.log(`\nJSON report -> ${REPORT_PATH}`);
    }

    // --- Purge (only with --purge-misassigned): remove WRONG hospitals' data ---
    // High-confidence subset only: cross-state misassignments whose wrong member
    // has live parsed data. Surgical — deletes summary rows by source_file_id
    // (data derived from the mis-assigned file) and the wrong mrf_files row, then
    // nulls the URL to re-queue discovery. Any other (legit) file for the
    // hospital is untouched. Atomic.
    if (purge) {
      const targets = classified.misassignment
        .filter((e) => e.states.length > 1)
        .flatMap((e) => e.wrong.filter((w) => w.parsed).map((w) => ({ ...w, wrong_url: e.url })));
      console.log(`\nPURGE: ${targets.length} cross-state wrong-assignment hospitals with live data.`);
      const client = await pool.connect();
      let summaryDeleted = 0, filesDeleted = 0, urlsNulled = 0;
      try {
        await client.query('BEGIN');
        for (const t of targets) {
          const files = (await client.query(
            `SELECT id FROM mrf_files WHERE hospital_id=$1 AND url=$2`, [t.id, t.wrong_url]
          )).rows.map((r) => r.id);
          if (files.length) {
            const s = await client.query(
              `DELETE FROM procedure_hospital_summary WHERE source_file_id = ANY($1::uuid[])`, [files]);
            summaryDeleted += s.rowCount;
            const f = await client.query(`DELETE FROM mrf_files WHERE id = ANY($1::uuid[])`, [files]);
            filesDeleted += f.rowCount;
          }
          // Null the URL only if it still points at the wrong file (re-queue discovery).
          const u = await client.query(
            `UPDATE hospitals SET mrf_file_url=NULL, mrf_format=NULL, last_mrf_hash=NULL, updated_at=now()
             WHERE id=$1 AND mrf_file_url=$2`, [t.id, t.wrong_url]);
          urlsNulled += u.rowCount;
          console.log(`  purged ${t.state}:${t.name} (${t.ccn})`);
        }
        await client.query('COMMIT');
        console.log(`\nPURGED: ${summaryDeleted} summary rows, ${filesDeleted} mrf_files, ${urlsNulled} URLs nulled (re-queued).`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('PURGE ROLLED BACK:', err.message);
        throw err;
      } finally {
        client.release();
      }
    }

    // --- Safe write (only with --apply): null never-parsed generic-portal URLs
    if (apply) {
      const toNull = classified.generic_portal
        .flatMap((e) => e.members)
        .filter((m) => !m.parsed) // never delete data; only clear dead URLs
        .map((m) => m.id);
      if (toNull.length) {
        const res = await pool.query(
          `UPDATE hospitals SET mrf_file_url = NULL, mrf_format = NULL, updated_at = now()
           WHERE id = ANY($1::uuid[])`,
          [toNull]
        );
        console.log(`\nAPPLIED: cleared ${res.rowCount} generic-portal URLs (never parsed) -> re-queued for discovery.`);
      } else {
        console.log('\nAPPLIED: no never-parsed generic-portal URLs to clear.');
      }
      console.log('NOTE: suspected misassignments with live parsed data were NOT auto-purged. See JSON report.');
    } else {
      console.log('\nDRY-RUN. Re-run with --apply to clear never-parsed generic-portal URLs (no data deleted).');
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });
