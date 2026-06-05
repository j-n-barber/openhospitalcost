// scripts/analytics-rollup.js
//
// Keeps the analytics tables bounded so storage never grows without limit:
//   1. Roll up COMPLETED days (everything before today UTC) from analytics_events
//      into analytics_daily (path × day: views + approx visitors). Idempotent.
//   2. Prune raw analytics_events older than RETENTION_DAYS (default 90) — the
//      daily rollup preserves the long-term trend cheaply.
//
// Run daily (see .github/workflows/analytics-rollup.yml). Safe to re-run.

import pg from 'pg';
import { loadEnv } from '../db/load-env.js';

const RETENTION_DAYS = 90;

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set.');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  pool.on('error', () => {});
  try {
    // Roll up all completed days that have raw events, replacing any existing
    // rollup rows for those days (idempotent upsert).
    const up = await pool.query(`
      INSERT INTO analytics_daily (day, path, views, visitors)
      SELECT date_trunc('day', ts)::date AS day, path,
             count(*)::int AS views,
             count(DISTINCT session_id)::int AS visitors
      FROM analytics_events
      WHERE NOT is_bot AND ts < date_trunc('day', now())
      GROUP BY 1, 2
      ON CONFLICT (day, path) DO UPDATE
        SET views = EXCLUDED.views, visitors = EXCLUDED.visitors
    `);
    console.log(`Rolled up ${up.rowCount} (day,path) rows into analytics_daily.`);

    const pruned = await pool.query(
      `DELETE FROM analytics_events WHERE ts < now() - interval '${RETENTION_DAYS} days'`);
    console.log(`Pruned ${pruned.rowCount} raw events older than ${RETENTION_DAYS} days.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });
