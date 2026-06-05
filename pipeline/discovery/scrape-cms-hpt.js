// pipeline/discovery/scrape-cms-hpt.js
//
// Fetches and parses each hospital's CMS root-locator file (`cms-hpt.txt`)
// per Tier-1 of the acquisition strategy (docs/ACQUISITION_STRATEGY.md).
//
// Input: hospitals with `mrf_root_url IS NOT NULL`. For the Phase B
// bootstrap we seed mrf_root_url from data/known-root-urls.json before
// running this script.
//
// For each fetched root locator, we parse out one or more (location-name,
// mrf-url, contact-email) blocks and update the matching hospital row(s).
// If the locator lists multiple hospitals (e.g., Memorial Hermann's file
// lists 14), we match each entry.
//
// MATCHING (see matchHospitalForEntry): the file URL's EIN is authoritative
// (CMS names files `<EIN>_<facility>_standardcharges`). Priority is exact-slug
// → EIN-exact → cross-slug → fuzzy, and EVERY path is EIN-gated: a name match
// against a hospital whose known EIN differs from the file's is rejected, so a
// look-alike name can no longer steal another hospital's file. (Earlier the
// loose >0.4 trigram fallback caused exactly that — see DATA_INTEGRITY_DUPLICATES.md.)
//
// Flags:
//   --dry-run    report proposed assignments (with evidence) without writing
//   --self-test  run deterministic matcher checks against real rows, then exit
//
// Output columns populated on hospitals: mrf_root_url, mrf_file_url,
// mrf_format, last_mrf_check_at.
//
// Politeness:
//   - User-Agent identifies us and links to a data-policy page.
//   - One request per host with at least 1.1 s between requests.
//   - Honor Retry-After on 429; exponential back-off on 5xx; up to 3 tries.
//   - Hospitals whose root locator returned a definitive 4xx (other than 429)
//     get an acquisition_notes entry but their mrf_root_url stays set so
//     they can be picked up later by the Tier-2 Playwright worker.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from 'pg';
import { loadEnv } from '../../db/load-env.js';
import { einOf, matchHospitalForEntry } from './match-hospital.js';

const USER_AGENT =
  'OpenHospitalCost-Ingester/1.0 (+https://openhospitalcost.com/about/data; contact: contact@openhospitalcost.com)';
const FETCH_TIMEOUT_MS = 20_000;
const HOST_RATE_LIMIT_MS = 1_100;
const MAX_ATTEMPTS = 3;

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));

function hostnameOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const DRY_RUN = process.argv.includes('--dry-run');

function parseCmsHpt(text) {
  // Format is paragraph-separated blocks of `key: value` lines.
  // Blank lines (or runs of stars/dashes used as visual dividers) separate blocks.
  const blocks = text
    .split(/\n[\s*\-=]*\n/) // blank line, with optional asterisk/dash decoration
    .map((b) => b.trim())
    .filter(Boolean);

  const entries = [];
  for (const block of blocks) {
    const entry = {};
    for (const line of block.split(/\r?\n/)) {
      // Some files use Title Case keys, some kebab. Normalize.
      const m = line.match(/^\s*([A-Za-z][\w-]*)\s*:\s*(.+?)\s*$/);
      if (!m) continue;
      const key = m[1].trim().toLowerCase();
      const value = m[2].trim();
      entry[key] = value;
    }
    if (entry['mrf-url']) entries.push(entry);
  }
  return entries;
}

function inferFormat(url) {
  const u = url.toLowerCase().split(/[?#]/)[0];
  if (u.endsWith('.zip')) return 'zip';
  if (u.endsWith('.json')) return 'json';
  if (u.endsWith('.csv')) return 'csv';
  if (u.endsWith('.xml')) return 'xml';
  if (u.endsWith('.ashx')) return 'ashx'; // ASP.NET handler — confirm format on download
  // Some hospitals use extension-less URLs (e.g., Geisinger). Mark unknown.
  return 'unknown';
}

async function fetchPolite(url) {
  let lastErr;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/plain, text/*, */*',
        },
        signal: ctl.signal,
        redirect: 'follow',
      });
      clearTimeout(t);

      if (res.ok) {
        return { ok: true, status: res.status, text: await res.text() };
      }

      if (res.status === 429) {
        const ra = res.headers.get('retry-after');
        const wait = ra ? parseInt(ra, 10) * 1000 : 2 ** i * 1000;
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      if (res.status >= 500) {
        await new Promise((r) => setTimeout(r, 2 ** i * 1000));
        continue;
      }

      // 4xx other than 429 — definitive, don't retry
      return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    } catch (err) {
      clearTimeout(t);
      lastErr = err;
      if (i === MAX_ATTEMPTS - 1) break;
      await new Promise((r) => setTimeout(r, 2 ** i * 1000));
    }
  }
  return { ok: false, error: lastErr?.message ?? 'exhausted retries' };
}

class HostThrottle {
  constructor() {
    this.lastByHost = new Map();
  }
  async wait(host) {
    if (!host) return;
    const now = Date.now();
    const last = this.lastByHost.get(host) ?? 0;
    const elapsed = now - last;
    if (elapsed < HOST_RATE_LIMIT_MS) {
      await new Promise((r) => setTimeout(r, HOST_RATE_LIMIT_MS - elapsed));
    }
    this.lastByHost.set(host, Date.now());
  }
}

async function seedRootUrls(client) {
  const path = resolve(__dirname, 'known-root-urls.json');
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let updated = 0;
  for (const r of data.roots) {
    const result = await client.query(
      `UPDATE hospitals
         SET mrf_root_url = $1, updated_at = now()
       WHERE ccn = $2 AND (mrf_root_url IS DISTINCT FROM $1)
       RETURNING ccn`,
      [r.url, r.ccn]
    );
    if (result.rowCount > 0) updated++;
  }
  console.log(`Seeded mrf_root_url on ${updated} hospital(s)`);
}

async function processOneRoot(client, url, seedHospitals, throttle) {
  const host = hostnameOf(url);
  await throttle.wait(host);

  // Use the first seed hospital's state for the initial name-match lookups;
  // the matcher will still find cross-state hospitals via the unconstrained
  // fallback if needed. Almost all hospital-level cms-hpt files list
  // intra-state facilities. System-level URLs pass an empty seed list, in
  // which case the matcher works across all states from the start.
  const sourceHospital = seedHospitals[0] ?? null;
  const label = sourceHospital
    ? `[${seedHospitals.length} seed(s)]`
    : '[system-level]';
  console.log(`${label} ${url}`);

  const result = await fetchPolite(url);

  if (!result.ok) {
    console.log(`  ✗ ${result.error}`);
    await client.query(
      `UPDATE hospitals SET last_mrf_check_at = now() WHERE mrf_root_url = $1`,
      [url]
    );
    return { fetched: false, matched: 0 };
  }

  const entries = parseCmsHpt(result.text);
  console.log(`  parsed ${entries.length} entry(ies)`);

  let matchedCount = 0;
  for (const entry of entries) {
    const match = await matchHospitalForEntry(client, entry, sourceHospital);
    if (!match) {
      console.log(`    ? no match for "${entry['location-name']}"`);
      continue;
    }
    const fmt = inferFormat(entry['mrf-url']);

    // Safety: never overwrite a hospital's already self-correct assignment with a
    // weaker fuzzy match. If the hospital's current URL already names it (own slug
    // in the URL) or carries its own EIN, a fuzzy entry must not clobber it.
    if (match._via === 'fuzzy') {
      const cur = (await client.query(
        `SELECT slug, ein, mrf_file_url FROM hospitals WHERE id = $1`, [match.id]
      )).rows[0];
      const urlA = (cur?.mrf_file_url || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const slugA = (cur?.slug || '').replace(/[^a-z0-9]/g, '');
      const selfCorrect = (slugA.length >= 10 && urlA.includes(slugA)) ||
        (cur?.ein && einOf(cur.mrf_file_url) === cur.ein);
      if (selfCorrect) {
        console.log(`    ⊘ keep ${match.ccn} ${match.name} (already self-correct; fuzzy entry skipped)`);
        continue;
      }
    }

    if (DRY_RUN) {
      console.log(`    ~ would set ${match.ccn} ${match.name} (${fmt}) [${match._via}]`);
      matchedCount++;
      continue;
    }
    await client.query(
      `UPDATE hospitals
         SET mrf_root_url = $1,
             mrf_file_url = $2,
             mrf_format   = $3,
             last_mrf_check_at = now(),
             updated_at = now()
       WHERE id = $4`,
      [url, entry['mrf-url'], fmt, match.id]
    );
    matchedCount++;
    console.log(`    ✓ ${match.ccn} ${match.name} (${fmt}) [${match._via}]`);
  }

  return { fetched: true, matched: matchedCount };
}

// Deterministic checks of the matcher decision logic against real DB rows.
// Validates: (T0) a hospital's own file routes to itself; (T1) an owner's file
// routes to the owner even when processed under a look-alike's state — not the
// look-alike; (T2) a fuzzy-only match against a different EIN's entity is vetoed.
async function runSelfTest(client) {
  const bySlug = async (slug) =>
    (await client.query(`SELECT id, ccn, name, slug, state, ein FROM hospitals WHERE slug = $1 LIMIT 1`, [slug])).rows[0];
  const fileUrl = (h) => `https://selftest.example/${h.ein}-${h.slug}_standardcharges.csv`;
  let pass = 0, fail = 0, skip = 0;
  const check = (name, cond, detail) => {
    if (cond === null) { skip++; console.log(`  SKIP ${name} (${detail})`); }
    else if (cond) { pass++; console.log(`  PASS ${name}`); }
    else { fail++; console.log(`  FAIL ${name} — ${detail}`); }
  };

  const owner = await bySlug('bridgeport-hospital');   // OK_self owner, ein known
  const lookalike = await bySlug('hartford-hospital'); // same-state look-alike

  if (!owner || !owner.ein) {
    check('T0/T1', null, 'bridgeport-hospital missing or has no EIN');
  } else {
    // T0: owner's own file -> owner
    const t0 = await matchHospitalForEntry(client,
      { 'location-name': owner.name, 'mrf-url': fileUrl(owner) }, owner);
    check('T0 self-routes', t0?.id === owner.id, `got ${t0?.ccn} via ${t0?._via}`);

    if (lookalike) {
      // T1: owner's file, processed under the look-alike's state -> still owner
      const t1 = await matchHospitalForEntry(client,
        { 'location-name': owner.name, 'mrf-url': fileUrl(owner) }, lookalike);
      check('T1 owner-not-lookalike', t1?.id === owner.id && t1?.id !== lookalike.id,
        `got ${t1?.ccn} via ${t1?._via} (expected ${owner.ccn})`);

      // T2: a name that only FUZZY-matches the look-alike, but the file's EIN
      // belongs to the owner -> must be vetoed (not assigned to the look-alike).
      const t2 = await matchHospitalForEntry(client,
        { 'location-name': `${lookalike.name} Annex`, 'mrf-url': fileUrl(owner) }, lookalike);
      check('T2 fuzzy-veto', t2?.id !== lookalike.id,
        `got ${t2?.ccn} via ${t2?._via} (must not be ${lookalike.ccn})`);
    } else {
      check('T1/T2', null, 'hartford-hospital not found');
    }
  }

  console.log(`\nSelf-test: ${pass} passed, ${fail} failed, ${skip} skipped.`);
  return fail === 0;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set.');
    process.exit(1);
  }

  // pg.Pool auto-reconnects when Neon's pooler drops idle connections.
  // The scraper's long-running session was crashing with "Connection
  // terminated unexpectedly" after ~600 URLs against a single pg.Client.
  const client = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  // The pool emits 'error' when a connection in its pool drops while idle.
  // Without a handler, the process crashes. Swallow it — the next query
  // gets a fresh connection from the pool.
  client.on('error', (err) => {
    console.error(`[pool] connection error (recoverable): ${err.message}`);
  });

  if (process.argv.includes('--self-test')) {
    try {
      const ok = await runSelfTest(client);
      process.exitCode = ok ? 0 : 1;
    } finally {
      await client.end();
    }
    return;
  }

  try {
    await seedRootUrls(client);

    const { rows } = await client.query(
      `SELECT id, ccn, name, state, mrf_root_url
       FROM hospitals
       WHERE mrf_root_url IS NOT NULL
         AND (last_mrf_check_at IS NULL OR last_mrf_check_at < now() - interval '6 hours')
       ORDER BY mrf_root_url, ccn`
    );

    // Dedupe: many hospitals (e.g., all 11 Cleveland Clinic facilities) share
    // the same root URL. Fetch each URL once and update every affected hospital.
    const byUrl = new Map();
    for (const h of rows) {
      if (!byUrl.has(h.mrf_root_url)) byUrl.set(h.mrf_root_url, []);
      byUrl.get(h.mrf_root_url).push(h);
    }

    // Add system-level URLs (no DB seed; matched by name across all states).
    const knownPath = resolve(__dirname, 'known-root-urls.json');
    const known = JSON.parse(readFileSync(knownPath, 'utf8'));
    for (const sys of known.system_roots ?? []) {
      if (!byUrl.has(sys.url)) byUrl.set(sys.url, []);
    }

    // --limit N: process only the first N root URLs (bounded validation runs).
    const limFlag = process.argv.indexOf('--limit');
    const limit = limFlag !== -1 ? parseInt(process.argv[limFlag + 1], 10) : null;
    let work = [...byUrl.entries()];
    if (limit) work = work.slice(0, limit);

    console.log(
      `Processing ${work.length}${limit ? `/${byUrl.size}` : ''} unique root URL(s) across ${rows.length} hospital row(s)` +
      `${DRY_RUN ? ' [DRY-RUN]' : ''}`
    );
    const throttle = new HostThrottle();

    let totalFetched = 0;
    let totalMatched = 0;
    let totalErrors = 0;
    for (const [url, seeds] of work) {
      try {
        const r = await processOneRoot(client, url, seeds, throttle);
        if (r.fetched) totalFetched++;
        totalMatched += r.matched;
      } catch (err) {
        // Most commonly: 'Connection terminated unexpectedly' from Neon's
        // pooler dropping a connection mid-query. Skip this URL, let the
        // pool hand out a fresh connection for the next iteration.
        console.error(`  [skip] ${url}: ${err.message}`);
        totalErrors++;
      }
    }

    console.log('');
    console.log('=== Scrape summary ===');
    console.log(`Unique root URLs: ${byUrl.size}`);
    console.log(`URLs fetched:     ${totalFetched}`);
    console.log(`URLs errored:     ${totalErrors}`);
    console.log(`Hospitals matched + file URL stored: ${totalMatched}`);
  } finally {
    await client.end();
  }
}

// Resume-friendly: skip hospitals whose last_mrf_check_at is recent.
// If a prior partial run already touched a URL within the last 6 hours,
// don't re-fetch it on resume.
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
