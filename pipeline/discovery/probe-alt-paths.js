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
import { einOf } from './match-hospital.js';

const alnum = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const USER_AGENT =
  'OpenHospitalCost-Ingester/1.0 (+https://openhospitalcost.com/about/data; contact: contact@openhospitalcost.com)';
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

// Pick THIS hospital's MRF link from a page that may list several facilities'
// files. Identity-first (EIN, then slug) so a multi-facility transparency page
// can't hand one hospital a sibling's file. If several candidates exist and none
// matches this hospital's identity, refuse to guess (return null) — accuracy
// over coverage.
function extractMrfUrl(html, pageUrl, hospital) {
  const matches = html.match(URL_PATTERN) ?? [];
  const cleaned = matches.map((u) => u.replace(/&amp;/g, '&'));
  const ranked = cleaned.filter((u) => MRF_NAME_HINT.test(u));
  if (ranked.length === 0) return null;

  // 1) URL whose embedded EIN matches the hospital's EIN (authoritative).
  if (hospital.ein) {
    const einHit = ranked.find((u) => einOf(u) === hospital.ein);
    if (einHit) return einHit.trim();
  }
  // 2) URL whose filename contains the hospital's full slug.
  const slugA = alnum(hospital.slug);
  if (slugA.length >= 10) {
    const slugHit = ranked.find((u) => alnum(u).includes(slugA));
    if (slugHit) return slugHit.trim();
  }
  // 3) A single candidate is unambiguous.
  if (ranked.length === 1) return ranked[0].trim();
  // 4) Multiple candidates, no identity match: only safe if exactly one is on
  //    the page's own origin; otherwise ambiguous -> don't guess.
  const pageHost = hostnameOf(pageUrl);
  const sameOrigin = ranked.filter((u) => hostnameOf(u) === pageHost);
  if (sameOrigin.length === 1) return sameOrigin[0].trim();
  return null;
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

    const mrfUrl = extractMrfUrl(result.text, result.finalUrl ?? url, hospital);
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
    SELECT id, ccn, name, state, slug, ein, mrf_root_url
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
