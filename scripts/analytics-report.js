// scripts/analytics-report.js
//
// Read first-party analytics straight from Neon (analytics_events / analytics_daily)
// and print a readable traffic report — totals, daily trend, top pages, sources,
// countries, devices. This is the supported way to analyze traffic for this site
// (no third-party API, no token): the data lives in our own DB.
//
// Usage:
//   npm run analytics                 # last 7 days
//   node scripts/analytics-report.js --days 30
//   node scripts/analytics-report.js --days 1 --bots   # include bots

import pg from 'pg';
import { loadEnv } from '../db/load-env.js';

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? (process.argv[i + 1] ?? true) : def;
}

function bar(n, max, width = 24) {
  if (!max) return '';
  return '█'.repeat(Math.max(1, Math.round((n / max) * width)));
}

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set.');
  const days = parseInt(arg('days', '7'), 10);
  const includeBots = !!arg('bots', false);
  const botFilter = includeBots ? '' : 'AND NOT is_bot';

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  pool.on('error', () => {});
  const q = (text, params) => pool.query(text, params).then((r) => r.rows);
  const since = `now() - interval '${days} days'`;

  try {
    const has = await q(`SELECT count(*)::int n FROM analytics_events WHERE ts > ${since} ${botFilter}`);
    if (!has[0].n) {
      console.log(`No pageviews in the last ${days} day(s) yet.`);
      console.log('(Tracking starts once the site with /api/track is deployed and gets visitors.)');
      return;
    }

    console.log(`OpenHospitalCost — traffic, last ${days} day(s)${includeBots ? ' [incl. bots]' : ''}\n`);

    const [tot] = await q(
      `SELECT count(*)::int views, count(DISTINCT session_id)::int visitors,
              count(*) FILTER (WHERE is_bot)::int bots
       FROM analytics_events WHERE ts > ${since}`);
    console.log(`  Page views: ${tot.views}    Visitors (approx): ${tot.visitors}    Bot hits filtered: ${tot.bots}\n`);

    const trend = await q(
      `SELECT to_char(date_trunc('day', ts), 'MM-DD') d, count(*)::int v
       FROM analytics_events WHERE ts > ${since} ${botFilter}
       GROUP BY 1 ORDER BY 1`);
    const tmax = Math.max(...trend.map((r) => r.v));
    console.log('Daily views:');
    for (const r of trend) console.log(`  ${r.d}  ${String(r.v).padStart(5)}  ${bar(r.v, tmax)}`);
    console.log('');

    const sections = [
      ['Top pages', `SELECT path key, count(*)::int v FROM analytics_events WHERE ts > ${since} ${botFilter} GROUP BY 1 ORDER BY 2 DESC LIMIT 15`],
      ['Top sources (by session)', `SELECT referrer_host key, count(DISTINCT session_id)::int v FROM analytics_events WHERE ts > ${since} ${botFilter} AND referrer_host <> 'internal' GROUP BY 1 ORDER BY 2 DESC LIMIT 12`],
      ['Top countries', `SELECT coalesce(country,'?') key, count(DISTINCT session_id)::int v FROM analytics_events WHERE ts > ${since} ${botFilter} GROUP BY 1 ORDER BY 2 DESC LIMIT 12`],
      ['Devices', `SELECT device key, count(*)::int v FROM analytics_events WHERE ts > ${since} ${botFilter} GROUP BY 1 ORDER BY 2 DESC`],
      ['Browsers', `SELECT browser key, count(*)::int v FROM analytics_events WHERE ts > ${since} ${botFilter} GROUP BY 1 ORDER BY 2 DESC LIMIT 8`],
    ];
    for (const [title, sql] of sections) {
      const rows = await q(sql);
      const mx = Math.max(...rows.map((r) => r.v));
      console.log(`${title}:`);
      for (const r of rows) console.log(`  ${String(r.v).padStart(6)}  ${bar(r.v, mx, 16)} ${r.key}`);
      console.log('');
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });
