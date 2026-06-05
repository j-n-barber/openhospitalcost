// scripts/vercel-analytics.js
//
// Pull Vercel Web Analytics for openhospitalcost and print a readable summary
// (totals, top pages, referrers, countries, devices) over a time window — so we
// can analyze traffic, plan, and review trends without the dashboard.
//
// WHY this shape: Vercel exposes NO official public REST API for *aggregated*
// Web Analytics (only event Drains, which need a Pro plan, and Speed Insights
// ingestion). This hits the same internal dashboard API the Analytics tab uses,
// authenticated with a personal token. It works on any plan but is unofficial,
// so if Vercel changes the endpoint this may need a path tweak (see SETUP).
//
// SETUP (one time):
//   1. Create a token at https://vercel.com/account/tokens (scope: your team).
//   2. Add to .env:   VERCEL_TOKEN=xxxxxxxx
//   3. Run:           npm run analytics            (default: last 7 days)
//                     node scripts/vercel-analytics.js --days 30
//                     node scripts/vercel-analytics.js --probe   (diagnose endpoint)
//
// If a call 404s, run with --probe: it tries the known endpoint variants and
// reports which responds, so the BASE/paths below can be corrected quickly.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadEnv } from '../db/load-env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? (process.argv[i + 1] ?? true) : def;
}

function loadProjectIds() {
  const p = JSON.parse(readFileSync(resolve(__dirname, '../.vercel/project.json'), 'utf8'));
  return { projectId: p.projectId, teamId: p.orgId };
}

// Internal dashboard API. `filter` selects the breakdown dimension.
const BASE = 'https://vercel.com/api/web-analytics';

async function apiGet(path, params, token) {
  const url = new URL(`${BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${path} :: ${text.slice(0, 160)}`);
    err.status = res.status;
    throw err;
  }
  try { return JSON.parse(text); } catch { return text; }
}

// Try candidate endpoints so a first run self-diagnoses the correct path.
async function probe(common, token) {
  const candidates = [
    ['web-analytics/timeseries', 'timeseries'],
    ['web-analytics/stats/path', 'stats/path'],
    ['web-analytics/stats', 'stats'],
    ['web/insights/timeseries', 'web/insights/timeseries'], // older path family
  ];
  console.log('Probing candidate analytics endpoints…\n');
  for (const [label, path] of candidates) {
    const full = path.startsWith('web/') ? `https://vercel.com/api/${path}` : `${BASE}/${path.replace('web-analytics/', '')}`;
    try {
      const url = new URL(full);
      for (const [k, v] of Object.entries(common)) if (v != null) url.searchParams.set(k, String(v));
      url.searchParams.set('filter', 'path');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      console.log(`  ${res.ok ? '✓' : '✗'} ${res.status}  ${label}`);
    } catch (e) {
      console.log(`  ✗ ERR  ${label}  (${e.message})`);
    }
  }
  console.log('\nUse the first ✓ path to set BASE / endpoint names if the summary below fails.');
}

function topList(rows, keyField = 'key', valField = 'total', n = 12) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => ({ key: r[keyField] ?? r.path ?? r.referrer ?? r.country ?? r.value ?? r.name, val: r[valField] ?? r.total ?? r.count ?? r.devices ?? r.visitors }))
    .filter((r) => r.key != null)
    .slice(0, n);
}

async function main() {
  loadEnv();
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.error('VERCEL_TOKEN not set. Add it to .env (create at https://vercel.com/account/tokens).');
    process.exit(1);
  }
  const { projectId, teamId } = loadProjectIds();
  const days = parseInt(arg('days', '7'), 10);
  const environment = arg('env', 'production');
  // Epoch ms window. (Avoids Date.now()? — this is a CLI, real wall-clock is fine here.)
  const to = Date.now();
  const from = to - days * 24 * 60 * 60 * 1000;
  const common = { projectId, teamId, environment, from, to };

  if (arg('probe', false)) return probe(common, token);

  console.log(`OpenHospitalCost — Vercel Web Analytics, last ${days} day(s) [${environment}]\n`);

  // Totals (timeseries) + breakdowns. Each call guarded so one failure doesn't
  // sink the rest; a failing call prints how to diagnose.
  const breakdowns = [
    ['Top pages', 'path'],
    ['Top referrers', 'referrer'],
    ['Top countries', 'country'],
    ['Devices', 'device'],
    ['OS', 'os'],
    ['Browsers', 'browser'],
  ];

  try {
    const ts = await apiGet('timeseries', { ...common, filter: 'path' }, token);
    const series = ts?.data ?? ts ?? [];
    const views = series.reduce?.((a, p) => a + (p.total ?? p.views ?? 0), 0);
    const visitors = series.reduce?.((a, p) => a + (p.devices ?? p.visitors ?? 0), 0);
    console.log(`  Page views: ${views ?? '?'}   Visitors: ${visitors ?? '?'}\n`);
  } catch (e) {
    console.log(`  (totals unavailable: ${e.message})`);
    if (e.status === 404) console.log('  → run with --probe to find the correct endpoint.\n');
  }

  for (const [label, filter] of breakdowns) {
    try {
      const r = await apiGet('stats', { ...common, filter, limit: 12 }, token);
      const rows = r?.data ?? r ?? [];
      console.log(`${label}:`);
      for (const item of topList(rows)) console.log(`  ${String(item.val).padStart(7)}  ${item.key}`);
      console.log('');
    } catch (e) {
      console.log(`${label}: (unavailable — ${e.message})\n`);
    }
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });
