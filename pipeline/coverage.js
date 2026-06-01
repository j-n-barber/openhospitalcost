// pipeline/coverage.js
//
// Single source of truth for the "in-scope" filter and MRF URL coverage
// math. Use everywhere we report or query against the hospital roster
// so coverage numbers stay consistent.
//
// 45 CFR § 180.20 exempts these hospital classes from the federal HPT
// rule. They aren't required to publish MRFs; they shouldn't count
// against our coverage denominator.
//
//   - Veterans Health Administration (VA)
//   - Department of Defense Military Treatment Facilities (DoD)
//   - Indian Health Service (IHS) facilities, including tribally-owned
//
// The first two are easy: hospital_type identifies them directly.
// IHS is harder because CMS doesn't have a single column for it. We
// combine ownership ('Tribal') with name-pattern matching for federal
// IHS / Public Health Service Indian Hospitals.

import pg from 'pg';
import { loadEnv } from '../db/load-env.js';

export const EXEMPT_WHERE_CLAUSE = `
     hospital_type LIKE 'Acute Care - Veterans%'
  OR hospital_type LIKE 'Acute Care - Department of Defense%'
  OR ownership = 'Tribal'
  OR name ILIKE '%INDIAN HOSPITAL%'
  OR name ILIKE '%INDIAN MEDICAL CENTER%'
  OR name ILIKE '%INDIAN HEALTH%'
  OR name ILIKE '%PHS INDIAN%'
  OR name ILIKE 'P H S INDIAN%'
  OR name ILIKE 'IHS %'
  OR name ILIKE '% IHS HOSPITAL%'
`;

export const IN_SCOPE_WHERE_CLAUSE = `NOT (${EXEMPT_WHERE_CLAUSE})`;

export async function coverageReport(client) {
  const rows = (await client.query(`
    SELECT
      hospital_type,
      COUNT(*) AS total,
      COUNT(mrf_file_url) AS with_url,
      ROUND(100.0 * COUNT(mrf_file_url) / COUNT(*), 1) AS pct
    FROM hospitals
    WHERE ${IN_SCOPE_WHERE_CLAUSE}
    GROUP BY hospital_type
    ORDER BY total DESC
  `)).rows;

  const totals = (await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE ${IN_SCOPE_WHERE_CLAUSE}) AS in_scope,
      COUNT(mrf_file_url) FILTER (WHERE ${IN_SCOPE_WHERE_CLAUSE}) AS in_scope_with_url,
      COUNT(*) FILTER (WHERE ${EXEMPT_WHERE_CLAUSE}) AS exempt,
      COUNT(*) AS roster
    FROM hospitals
  `)).rows[0];

  return {
    byType: rows,
    inScope: parseInt(totals.in_scope, 10),
    inScopeWithUrl: parseInt(totals.in_scope_with_url, 10),
    exempt: parseInt(totals.exempt, 10),
    roster: parseInt(totals.roster, 10),
  };
}

export function formatReport(report) {
  const lines = [];
  lines.push('=== Hospital MRF URL coverage ===');
  for (const r of report.byType) {
    lines.push(
      `  ${String(r.with_url).padStart(4)} / ${String(r.total).padEnd(5)} ` +
        `(${String(r.pct).padStart(5)}%)  ${r.hospital_type}`
    );
  }
  const pct = ((100 * report.inScopeWithUrl) / report.inScope).toFixed(1);
  lines.push(
    `  ----- ${report.inScopeWithUrl} / ${report.inScope} (${pct}%) IN-SCOPE TOTAL`
  );
  lines.push('');
  lines.push(
    `  Roster: ${report.roster}, Exempt (VA/DoD/IHS/Tribal): ${report.exempt}, ` +
      `In-scope: ${report.inScope}`
  );
  return lines.join('\n');
}

// CLI entry point: `node pipeline/coverage.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  loadEnv();
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set.');
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const report = await coverageReport(client);
    console.log(formatReport(report));
  } finally {
    await client.end();
  }
}
