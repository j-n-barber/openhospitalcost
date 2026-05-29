// pipeline/discovery/probe-alt-paths.js
//
// Second-pass coverage push: for hospitals where we know the homepage but
// the standard /cms-hpt.txt root locator returned 404, probe common
// alternative paths where hospitals post their price transparency landing
// page. Scrape the HTML for MRF download links matching the CMS naming
// convention.
//
// Input criteria:
//   - mrf_root_url IS NOT NULL (we have a homepage to work from)
//   - mrf_file_url IS NULL     (the main scraper didn't find a URL)
//   - last_mrf_check_at IS NOT NULL (the main scraper already tried)
//
// For each candidate hospital:
//   - Strip /cms-hpt.txt off mrf_root_url to recover the homepage origin
//   - GET origin + each alternative path until we find HTML with an MRF link
//   - Extract MRF download URL via regex
//   - Update hospitals row
//
// Polite Tier-1 etiquette per ACQUISITION_STRATEGY.md.

import pg from 'pg';
import { loadEnv } from '../../db/load-env.js';

const USER_AGENT =
  'OpenHospitalCost-Ingester/1.0 (+https://openhospitalcost.com/about/data; contact: jake@openhospitalcost.com)';
const FETCH_TIMEOUT_MS = 12_000;
const HOST_RATE_LIMIT_MS = 1_100;
const MAX_PATHS_PER_HOSPITAL = 12;

const ALT_PATHS = [
  '/price-transparency',
  '/price-transparency/',
  '/billing/price-transparency',
  '/patient-resources/price-transparency',
  '/standard-charges',
  '/standardcharges',
  '/about/pricing',
  '/about/price-transparency',
  '/financial-information/price-transparency',
  '/billing-and-insurance/price-transparency',
  '/patients-visitors/billing/price-transparency',
  '/transparency',
];

// Match MRF-shaped URLs in fetched HTML. Filter for the CMS filename
// convention (digits-EIN_hospital-name_standardcharges.ext) to avoid
// matching every JSON/CSV asset on the page.
const URL_PATTERN = /https?:\/\/[^"'\s<>]+\.(?:json|csv|zip|xml|ashx)(?:\?[^"'\s<>]*)?/gi;
const MRF_NAME_HINT = /standard[_-]?charges|machine[_-]?readable|cms[_-]?hpt|mrf\b/i;

loadEnv();

function inferFormat(url) {
  const u = url.toLowerCase().split(/[?#]/)[0];
  if (u.endsWith('.zip')) return 'zip';
  if (u.endsWith('.json')) return 'json';
  if (u.endsWith('.csv')) return 'csv';
  if (u.endsWith('.xml')) return 'xml';
  if (u.endsWith('.ashx')) return 'ashx';
  return null;
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function originOf(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

function extractMrfUrl(html, pageUrl) {
  const matches = html.match(URL_PATTERN) ?? [];
  // Decode common HTML entities so &amp; etc don't break URLs
  const cleaned = matches.map((u) => u.replace(/&amp;/g, '&'));
  // Filter to URLs containing CMS-style hints
  const ranked = cleaned.filter((u) => MRF_NAME_HINT.test(u));
  if (ranked.length === 0) return null;
  // Prefer URLs hosted on the same origin as the page we're scraping
  const pageHost = hostnameOf(pageUrl);
  const sameOrigin = ranked.filter((u) => hostnameOf(u) === pageHost);
  return (sameOrigin[0] ?? ranked[0]).trim();
}

async function fetchHtml(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: ctl.signal,
      redirect: 'follow',
    });
    clearTimeout(t);
    if (!res.ok) return { ok: false, status: res.status };
    const ct = (res.headers.get('content-type') ?? '').toLowerCase();
    if (!ct.includes('html')) return { ok: false, status: res.status, error: 'not html' };
    const text = await res.text();
    return { ok: true, text, finalUrl: res.url };
  } catch (err) {
    clearTimeout(t);
    return { ok: false, error: err.message };
  }
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

async function processOne(client, hospital, throttle) {
  // Recover the homepage origin from mrf_root_url which looks like
  // https://www.example.org/cms-hpt.txt
  const origin = originOf(hospital.mrf_root_url);
  if (!origin) return { found: false };
  const host = hostnameOf(origin);

  for (let i = 0; i < ALT_PATHS.length && i < MAX_PATHS_PER_HOSPITAL; i++) {
    const path = ALT_PATHS[i];
    const url = origin + path;
    await throttle.wait(host);

    const result = await fetchHtml(url);
    if (!result.ok) continue;

    const mrfUrl = extractMrfUrl(result.text, result.finalUrl ?? url);
    if (!mrfUrl) continue;

    const fmt = inferFormat(mrfUrl);
    await client.query(
      `UPDATE hospitals
         SET mrf_file_url = $1,
             mrf_format   = COALESCE(mrf_format, $2),
             updated_at   = now()
       WHERE id = $3 AND mrf_file_url IS NULL`,
      [mrfUrl, fmt, hospital.id]
    );
    console.log(`  ✓ ${hospital.ccn} ${hospital.name} ← ${path} ${mrfUrl.slice(0, 60)}…`);
    return { found: true, path, mrfUrl };
  }

  return { found: false };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set.');
    process.exit(1);
  }

  // Use a pool with explicit error handling to survive Neon's
  // idle-connection drops on long-running scrapes (same fix as
  // scrape-cms-hpt.js).
  const client = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  client.on('error', (err) => {
    console.error(`[pool] connection error (recoverable): ${err.message}`);
  });

  const { rows } = await client.query(`
    SELECT id, ccn, name, state, mrf_root_url
    FROM hospitals
    WHERE mrf_root_url IS NOT NULL
      AND mrf_file_url IS NULL
      AND last_mrf_check_at IS NOT NULL
      AND hospital_type NOT LIKE 'Acute Care - Veterans%'
      AND hospital_type NOT LIKE 'Acute Care - Department of Defense%'
    ORDER BY ccn
  `);

  console.log(`${rows.length} hospitals to probe for alternative paths`);
  const throttle = new HostThrottle();

  let found = 0;
  let processed = 0;
  let errored = 0;
  for (const h of rows) {
    try {
      const r = await processOne(client, h, throttle);
      if (r.found) found++;
    } catch (err) {
      // Skip individual hospital failures (network blips, query
      // errors) without killing the whole loop.
      console.error(`  [skip] ${h.ccn}: ${err.message}`);
      errored++;
    }
    processed++;
    if (processed % 50 === 0) {
      console.log(`... ${processed}/${rows.length} processed, ${found} found, ${errored} errored`);
    }
  }

  console.log('');
  console.log('=== Alt-path probe summary ===');
  console.log(`Hospitals probed: ${processed}`);
  console.log(`MRF URLs found:   ${found}`);
  if (processed > 0) {
    console.log(`Hit rate:         ${((found / processed) * 100).toFixed(1)}%`);
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
