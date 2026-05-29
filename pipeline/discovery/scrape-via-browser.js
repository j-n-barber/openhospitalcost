// pipeline/discovery/scrape-via-browser.js
//
// Tier-2 scraper per ACQUISITION_STRATEGY.md: for hospitals whose
// cms-hpt.txt is gated by JS challenges or ASP.NET handlers, fetch
// using Playwright Chromium instead of plain curl.
//
// Reads pipeline/discovery/known-blocked-urls.json (hand-curated list
// of marquee hospitals known to need Tier-2). Fetches each URL via the
// browser, parses cms-hpt content, matches each entry to a hospital
// row by slug+state (with cross-state fallback), updates the DB.
//
// Usage:
//   npm run scrape:via-browser
//
// Setup once:
//   npx playwright install chromium

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from 'pg';
import { loadEnv } from '../../db/load-env.js';
import { slugify } from './slugify.js';
import { fetchViaBrowser, closeBrowser } from '../fetch/browser-fetch.js';

const HOST_RATE_LIMIT_MS = 2_500;

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));

function hostnameOf(url) {
  try { return new URL(url).hostname; } catch { return null; }
}

function parseCmsHpt(text) {
  const blocks = text
    .split(/\n[\s*\-=]*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  const entries = [];
  for (const block of blocks) {
    const entry = {};
    for (const line of block.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z][\w-]*)\s*:\s*(.+?)\s*$/);
      if (!m) continue;
      entry[m[1].trim().toLowerCase()] = m[2].trim();
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
  if (u.endsWith('.ashx')) return 'ashx';
  return null;
}

async function matchHospitalForEntry(client, entry) {
  const targetName = entry['location-name'];
  if (!targetName) return null;
  const targetSlug = slugify(targetName);

  // Cross-state exact slug (no state seed available for browser-fetched URLs)
  const exact = await client.query(
    `SELECT id, ccn, name FROM hospitals WHERE slug = $1 LIMIT 1`,
    [targetSlug]
  );
  if (exact.rows.length) return exact.rows[0];

  const fuzzy = await client.query(
    `SELECT id, ccn, name, similarity(slug, $1) AS sim
     FROM hospitals
     WHERE similarity(slug, $1) > 0.55
     ORDER BY sim DESC
     LIMIT 1`,
    [targetSlug]
  );
  return fuzzy.rows[0] ?? null;
}

class HostThrottle {
  constructor() { this.lastByHost = new Map(); }
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

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set.');
    process.exit(1);
  }

  const knownPath = resolve(__dirname, 'known-blocked-urls.json');
  const known = JSON.parse(readFileSync(knownPath, 'utf8'));
  const urls = known.blocked_roots ?? [];

  console.log(`Processing ${urls.length} blocked URL(s) via Playwright`);

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const throttle = new HostThrottle();

  let totalFetched = 0;
  let totalMatched = 0;

  try {
    for (const entry of urls) {
      const url = entry.url;
      const host = hostnameOf(url);
      await throttle.wait(host);

      console.log(`[${entry.name_hint}] ${url}  (defense: ${entry.defense})`);
      const result = await fetchViaBrowser(url);

      if (!result.ok) {
        console.log(`  ✗ ${result.error}`);
        continue;
      }
      totalFetched++;

      const parsed = parseCmsHpt(result.text);
      console.log(`  parsed ${parsed.length} entry(ies)`);

      for (const cms of parsed) {
        const match = await matchHospitalForEntry(client, cms);
        if (!match) {
          console.log(`    ? no match for "${cms['location-name']}"`);
          continue;
        }
        const fmt = inferFormat(cms['mrf-url']);
        await client.query(
          `UPDATE hospitals
             SET mrf_root_url = $1,
                 mrf_file_url = $2,
                 mrf_format   = COALESCE($3, mrf_format),
                 last_mrf_check_at = now(),
                 updated_at = now()
           WHERE id = $4`,
          [url, cms['mrf-url'], fmt, match.id]
        );
        totalMatched++;
        console.log(`    ✓ ${match.ccn} ${match.name} (${fmt})`);
      }
    }

    console.log('');
    console.log('=== Browser scrape summary ===');
    console.log(`URLs fetched:    ${totalFetched}/${urls.length}`);
    console.log(`Hospitals matched: ${totalMatched}`);
  } finally {
    await client.end();
    await closeBrowser();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
