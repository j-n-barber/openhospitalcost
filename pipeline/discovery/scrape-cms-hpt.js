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
// mrf-url, contact-email) blocks and update the matching hospital row(s)
// by name within state. If the locator lists multiple hospitals (e.g.,
// Memorial Hermann's file lists 14), we attempt to match each entry.
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
import { slugify } from './slugify.js';

const USER_AGENT =
  'OpenHospitalCost-Ingester/1.0 (+https://openhospitalcost.com/about/data; contact: jake@openhospitalcost.com)';
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

async function matchHospitalForEntry(client, entry, sourceHospital) {
  // Try to find the hospital row that best matches the cms-hpt entry's
  // location-name. For hospital-level sources, prefer same-state matches
  // first. For system-level sources (sourceHospital is null) or as a
  // fallback when same-state finds nothing, match across all states.
  const targetName = entry['location-name'];
  if (!targetName) return null;

  const targetSlug = slugify(targetName);
  const state = sourceHospital?.state ?? null;
  const sourceCcn = sourceHospital?.ccn ?? null;

  if (state) {
    // 1) Exact slug match within state
    const exact = await client.query(
      `SELECT id, ccn, name FROM hospitals
       WHERE state = $1 AND slug = $2
       ORDER BY (ccn = $3) DESC -- prefer the seed hospital itself
       LIMIT 1`,
      [state, targetSlug, sourceCcn]
    );
    if (exact.rows.length) return exact.rows[0];

    // 2) Trigram similarity within state (pg_trgm)
    const fuzzy = await client.query(
      `SELECT id, ccn, name, similarity(slug, $2) AS sim
       FROM hospitals
       WHERE state = $1 AND similarity(slug, $2) > 0.4
       ORDER BY sim DESC
       LIMIT 1`,
      [state, targetSlug]
    );
    if (fuzzy.rows.length) return fuzzy.rows[0];
  }

  // 3) Cross-state exact slug — useful for system-level files where the
  //    seed (if any) lives in a different state than the listed facility.
  const exactCross = await client.query(
    `SELECT id, ccn, name FROM hospitals WHERE slug = $1 LIMIT 1`,
    [targetSlug]
  );
  if (exactCross.rows.length) return exactCross.rows[0];

  // 4) Cross-state trigram, with a stricter threshold to avoid false matches
  const fuzzyCross = await client.query(
    `SELECT id, ccn, name, similarity(slug, $1) AS sim
     FROM hospitals
     WHERE similarity(slug, $1) > 0.6
     ORDER BY sim DESC
     LIMIT 1`,
    [targetSlug]
  );
  if (fuzzyCross.rows.length) return fuzzyCross.rows[0];

  return null;
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
    console.log(`    ✓ ${match.ccn} ${match.name} (${fmt})`);
  }

  return { fetched: true, matched: matchedCount };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set.');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await seedRootUrls(client);

    const { rows } = await client.query(
      `SELECT id, ccn, name, state, mrf_root_url
       FROM hospitals
       WHERE mrf_root_url IS NOT NULL
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

    console.log(
      `Processing ${byUrl.size} unique root URL(s) across ${rows.length} hospital row(s)`
    );
    const throttle = new HostThrottle();

    let totalFetched = 0;
    let totalMatched = 0;
    for (const [url, seeds] of byUrl) {
      const r = await processOneRoot(client, url, seeds, throttle);
      if (r.fetched) totalFetched++;
      totalMatched += r.matched;
    }

    console.log('');
    console.log('=== Scrape summary ===');
    console.log(`Unique root URLs: ${byUrl.size}`);
    console.log(`URLs fetched:     ${totalFetched}`);
    console.log(`Hospitals matched + file URL stored: ${totalMatched}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
