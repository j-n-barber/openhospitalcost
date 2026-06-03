// pipeline/discovery/refresh-untried-urls.js
//
// Targeted URL recovery for the "untried tail": tier-1 hospitals that have an
// mrf_file_url but no successful mrf_files row (every ingest attempt failed,
// often because the stored file URL went stale / 404). Their CMS root locator
// (cms-hpt.txt) is usually still live and points at the *current* file URL.
//
// Unlike scrape-cms-hpt.js (which refreshes ALL hospitals and matches entries
// across the whole table), this is SCOPE-SAFE in two ways, so it can run
// unattended without risking the working cohort:
//   1. It only ever UPDATEs a hospital that currently has NO successful ingest.
//      It can never regress one of the 123 already-working hospitals.
//   2. It only acts on HIGH-CONFIDENCE matches — a single-entry locator, or an
//      entry whose location-name slug exactly equals this hospital's slug — so
//      it won't attribute another facility's file to this hospital. Ambiguous
//      multi-entry locators are reported, not applied.
//
// Default is DRY-RUN (reports proposed changes). Pass --apply to write.
//
// Usage:
//   node pipeline/discovery/refresh-untried-urls.js            # dry run
//   node pipeline/discovery/refresh-untried-urls.js --apply

import pg from 'pg';
import { loadEnv } from '../../db/load-env.js';
import { slugify } from './slugify.js';

const USER_AGENT =
  'OpenHospitalCost-Ingester/1.0 (+https://openhospitalcost.com/about/data; contact: contact@openhospitalcost.com)';
const FETCH_TIMEOUT_MS = 20_000;
const HOST_RATE_LIMIT_MS = 1_100;

const APPLY = process.argv.includes('--apply');

// --- locator parsing (mirrors scrape-cms-hpt.js) ---------------------------
function parseCmsHpt(text) {
  const blocks = text.split(/\n[\s*\-=]*\n/).map((b) => b.trim()).filter(Boolean);
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
  return 'unknown';
}

function resolveUrl(raw, base) {
  try { return new URL(raw, base).href; } catch { return raw; }
}

async function fetchText(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/plain, text/*, */*' },
      redirect: 'follow',
      signal: ctl.signal,
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, text: await res.text() };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    clearTimeout(t);
  }
}

// Pick the locator entry that confidently belongs to THIS hospital.
function pickEntry(entries, hospital) {
  if (entries.length === 1) return { entry: entries[0], how: 'single-entry' };
  const exact = entries.filter((e) => e['location-name'] && slugify(e['location-name']) === hospital.slug);
  if (exact.length === 1) return { entry: exact[0], how: 'exact-name' };
  return { entry: null, how: entries.length ? 'ambiguous' : 'no-entries' };
}

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set.');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const cohort = (await client.query(`
    SELECT h.id, h.ccn, h.name, h.slug, h.state, h.mrf_file_url AS url, h.mrf_root_url AS root
    FROM hospitals h
    WHERE h.refresh_tier = 1 AND h.mrf_file_url IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM mrf_files f WHERE f.hospital_id = h.id)
    ORDER BY h.beds DESC NULLS LAST`)).rows;

  console.log(`Untried cohort: ${cohort.length}. Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}.\n`);

  const lastByHost = new Map();
  const tally = { changed: 0, sameUrl: 0, noRoot: 0, rootDead: 0, ambiguous: 0, noMatch: 0 };
  const changes = [];

  for (const h of cohort) {
    if (!h.root) { tally.noRoot++; continue; }
    const host = (() => { try { return new URL(h.root).hostname; } catch { return null; } })();
    if (host) {
      const wait = HOST_RATE_LIMIT_MS - (Date.now() - (lastByHost.get(host) ?? 0));
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastByHost.set(host, Date.now());
    }

    const r = await fetchText(h.root);
    if (!r.ok) { tally.rootDead++; continue; }
    const entries = parseCmsHpt(r.text);
    const { entry, how } = pickEntry(entries, h);
    if (!entry) { if (how === 'ambiguous') tally.ambiguous++; else tally.noMatch++; continue; }

    const fresh = resolveUrl(entry['mrf-url'], h.root);
    if (fresh === h.url) { tally.sameUrl++; continue; }

    tally.changed++;
    changes.push({ ccn: h.ccn, name: h.name, how, old: h.url, fresh, fmt: inferFormat(fresh) });
    if (APPLY) {
      await client.query(
        `UPDATE hospitals
           SET mrf_file_url = $1, mrf_format = $2, last_mrf_check_at = now(), updated_at = now()
         WHERE ccn = $3
           AND NOT EXISTS (SELECT 1 FROM mrf_files f WHERE f.hospital_id = hospitals.id)`,
        [fresh, inferFormat(fresh), h.ccn]
      );
    }
  }

  console.log('Proposed URL changes (high-confidence only):');
  for (const c of changes) {
    console.log(`  ${c.ccn} ${c.name.slice(0, 34).padEnd(34)} [${c.how}] ${c.fmt}`);
    console.log(`      old: ${c.old}`);
    console.log(`      new: ${c.fresh}`);
  }
  console.log(`\nSummary: changed=${tally.changed} sameUrl=${tally.sameUrl} ambiguous=${tally.ambiguous} ` +
    `noMatch=${tally.noMatch} rootDead=${tally.rootDead} noRoot=${tally.noRoot}`);
  console.log(APPLY ? '\nApplied. Re-run ingest to pick up refreshed URLs.' : '\nDry run — re-run with --apply to write these changes.');

  await client.end();
}

main().catch((err) => { console.error(err.message); process.exit(1); });
