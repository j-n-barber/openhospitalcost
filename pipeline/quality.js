// pipeline/quality.js
//
// Single source of truth for MRF quality scoring. The Phase C parser emits a
// FileMetrics object per file and calls scoreFile(); the materialized-view
// builder calls scoreProcedureCompleteness() per (hospital, procedure).
//
// Spec: docs/QUALITY_RUBRIC.md. If this file and the doc disagree, this file
// wins and the doc is the bug.
//
// Pure scoring functions take NO dependencies and NO clock — the caller passes
// `asOf` so a re-run over the same file produces the same score (Date.now() is
// deliberately never read here). The CLI at the bottom connects to the DB to
// print a grade distribution, mirroring coverage.js.

import pg from 'pg';
import { loadEnv } from '../db/load-env.js';

// ---------------------------------------------------------------------------
// Constants (mirror docs/QUALITY_RUBRIC.md § 1.3)
// ---------------------------------------------------------------------------

export const FILE_SCORE_WEIGHTS = Object.freeze({
  parseIntegrity: 20,
  specVersion: 10,
  standardizedCode: 20,
  discountedCash: 15,
  negotiated: 15,
  gross: 10,
  payerBreadth: 5,
  freshness: 5,
});

// Coverage targets: hitting the target earns full weight; partial earns pro rata.
export const COVERAGE_TARGETS = Object.freeze({
  standardizedCode: 0.8,
  discountedCash: 0.9,
  negotiated: 0.9,
  gross: 0.9,
});

export const GRADE_BANDS = Object.freeze([
  { grade: 'A', min: 85 },
  { grade: 'B', min: 70 },
  { grade: 'C', min: 55 },
  { grade: 'D', min: 40 },
  { grade: 'F', min: 0 },
]);

// Money-page eligibility thresholds (§ 1.4).
export const MONEY_PAGE_MIN_FQS = 55;
export const MONEY_PAGE_MIN_CODE_COVERAGE = 0.5;

// Procedure-row eligibility (§ 2).
export const PROCEDURE_ROW_MIN_PCS = 40;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ratio(numerator, denominator) {
  if (!denominator || denominator <= 0) return 0;
  return Math.max(0, Math.min(1, numerator / denominator));
}

// Scaled-to-target credit: full weight at/above target, pro rata below.
function scaledCredit(coverage, target, weight) {
  if (target <= 0) return weight;
  return Math.min(1, coverage / target) * weight;
}

function monthsBetween(fromISO, asOfISO) {
  if (!fromISO || !asOfISO) return null;
  const from = Date.parse(fromISO);
  const asOf = Date.parse(asOfISO);
  if (Number.isNaN(from) || Number.isNaN(asOf)) return null;
  return (asOf - from) / MS_PER_DAY / 30.4375;
}

export function gradeFor(score) {
  for (const band of GRADE_BANDS) {
    if (score >= band.min) return band.grade;
  }
  return 'F';
}

// Fill a partial metrics object with safe defaults so the parser can pass
// whatever it has without scoreFile() throwing on undefined.
export function normalizeFileMetrics(m = {}) {
  return {
    parseStatus: m.parseStatus ?? 'failed',
    specVersion: m.specVersion ?? 'unknown',
    format: m.format ?? null,
    rowsTotal: m.rowsTotal ?? 0,
    rowsParsed: m.rowsParsed ?? 0,
    rowsQuarantined: m.rowsQuarantined ?? Math.max(0, (m.rowsTotal ?? 0) - (m.rowsParsed ?? 0)),
    lastUpdatedOn: m.lastUpdatedOn ?? null,
    withGross: m.withGross ?? 0,
    withDiscountedCash: m.withDiscountedCash ?? 0,
    withNegotiated: m.withNegotiated ?? 0,
    withDeidMinMax: m.withDeidMinMax ?? 0,
    withStandardizedCode: m.withStandardizedCode ?? 0,
    distinctPayers: m.distinctPayers ?? 0,
    distinctStandardizedCodes: m.distinctStandardizedCodes ?? 0,
    multiLocation: m.multiLocation ?? false,
  };
}

// ---------------------------------------------------------------------------
// File Quality Score (§ 1)
// ---------------------------------------------------------------------------

/**
 * Score one parsed MRF file.
 * @param {object} rawMetrics  FileMetrics (see docs/QUALITY_RUBRIC.md § 1.1)
 * @param {object} [opts]
 * @param {string} [opts.asOf]  ISO date the score is computed "as of" (ingest date).
 *                              Defaults to lastUpdatedOn so freshness is a no-op when omitted.
 * @returns {{score:number, grade:string, eligibleForMoneyPages:boolean,
 *            components:object, coverage:object, flags:string[], metrics:object}}
 */
export function scoreFile(rawMetrics, opts = {}) {
  const m = normalizeFileMetrics(rawMetrics);
  const asOf = opts.asOf ?? m.lastUpdatedOn ?? null;
  const flags = [];

  const coverage = {
    standardizedCode: ratio(m.withStandardizedCode, m.rowsParsed),
    discountedCash: ratio(m.withDiscountedCash, m.rowsParsed),
    negotiated: ratio(m.withNegotiated, m.rowsParsed),
    gross: ratio(m.withGross, m.rowsParsed),
    parseIntegrity: ratio(m.rowsParsed, m.rowsTotal),
  };

  // Gate: unparseable or empty → score 0, ineligible.
  if (m.parseStatus === 'failed' || m.rowsParsed === 0) {
    flags.push(m.parseStatus === 'failed' ? 'parse-failed' : 'no-rows');
    return {
      score: 0,
      grade: 'F',
      eligibleForMoneyPages: false,
      components: {},
      coverage,
      flags,
      metrics: m,
    };
  }

  const specPts =
    m.specVersion === '3.0.0' ? FILE_SCORE_WEIGHTS.specVersion
      : m.specVersion === '2.0.0' ? 8
        : 0;
  if (specPts === 0) flags.push(`unrecognized-spec:${m.specVersion}`);

  let payerBreadthPts;
  if (m.distinctPayers >= 5) payerBreadthPts = 5;
  else if (m.distinctPayers >= 3) payerBreadthPts = 3;
  else if (m.distinctPayers >= 1) payerBreadthPts = 1;
  else payerBreadthPts = 0;

  const ageMonths = monthsBetween(m.lastUpdatedOn, asOf);
  let freshnessPts;
  if (ageMonths === null) freshnessPts = 0;
  else if (ageMonths <= 6) freshnessPts = 5;
  else if (ageMonths <= 12) freshnessPts = 4;
  else if (ageMonths <= 18) freshnessPts = 2;
  else freshnessPts = 0;
  if (ageMonths === null) flags.push('no-last-updated-date');
  else if (ageMonths > 12) flags.push('stale-over-12mo');

  if (m.multiLocation) flags.push('multi-location-file');
  if (m.parseStatus === 'partial') flags.push('rows-quarantined');

  const components = {
    parseIntegrity: FILE_SCORE_WEIGHTS.parseIntegrity * coverage.parseIntegrity,
    specVersion: specPts,
    standardizedCode: scaledCredit(coverage.standardizedCode, COVERAGE_TARGETS.standardizedCode, FILE_SCORE_WEIGHTS.standardizedCode),
    discountedCash: scaledCredit(coverage.discountedCash, COVERAGE_TARGETS.discountedCash, FILE_SCORE_WEIGHTS.discountedCash),
    negotiated: scaledCredit(coverage.negotiated, COVERAGE_TARGETS.negotiated, FILE_SCORE_WEIGHTS.negotiated),
    gross: scaledCredit(coverage.gross, COVERAGE_TARGETS.gross, FILE_SCORE_WEIGHTS.gross),
    payerBreadth: payerBreadthPts,
    freshness: freshnessPts,
  };

  const score = Math.round(
    Object.values(components).reduce((sum, pts) => sum + pts, 0)
  );

  const eligibleForMoneyPages =
    score >= MONEY_PAGE_MIN_FQS &&
    coverage.standardizedCode >= MONEY_PAGE_MIN_CODE_COVERAGE &&
    (m.withDiscountedCash > 0 || m.withNegotiated > 0);

  return {
    score,
    grade: gradeFor(score),
    eligibleForMoneyPages,
    components,
    coverage,
    flags,
    metrics: m,
  };
}

// ---------------------------------------------------------------------------
// Procedure Completeness Score (§ 2)
// ---------------------------------------------------------------------------

/**
 * Score one (hospital, procedure) pair for ranking + per-row money-page eligibility.
 * @param {object} rec
 * @param {boolean} rec.hasDiscountedCash
 * @param {boolean} rec.hasNegotiated
 * @param {boolean} rec.hasGross
 * @param {number}  rec.distinctPayers
 * @param {boolean} rec.fileFresh         parent file ≤ 12 months old
 * @returns {{score:number, eligibleAsRow:boolean}}
 */
export function scoreProcedureCompleteness(rec = {}) {
  let score = 0;
  if (rec.hasDiscountedCash) score += 30;
  if (rec.hasNegotiated) score += 30;
  if (rec.hasGross) score += 15;
  score += Math.min(1, (rec.distinctPayers ?? 0) / 5) * 20;
  if (rec.fileFresh) score += 5;
  score = Math.round(score);
  return { score, eligibleAsRow: score >= PROCEDURE_ROW_MIN_PCS };
}

// ---------------------------------------------------------------------------
// CLI: quality distribution across parsed files (mirrors coverage.js)
// ---------------------------------------------------------------------------

export async function qualityReport(client) {
  const { rows } = await client.query(`
    SELECT
      COUNT(*)                                              AS parsed_files,
      COUNT(*) FILTER (WHERE quality_score >= 85)           AS grade_a,
      COUNT(*) FILTER (WHERE quality_score BETWEEN 70 AND 84) AS grade_b,
      COUNT(*) FILTER (WHERE quality_score BETWEEN 55 AND 69) AS grade_c,
      COUNT(*) FILTER (WHERE quality_score BETWEEN 40 AND 54) AS grade_d,
      COUNT(*) FILTER (WHERE quality_score < 40)            AS grade_f,
      COUNT(*) FILTER (WHERE (quality_metrics->>'eligibleForMoneyPages')::boolean) AS money_page_eligible,
      ROUND(AVG(quality_score), 1)                          AS avg_score
    FROM mrf_files
    WHERE quality_score IS NOT NULL
  `);
  return rows[0];
}

function formatReport(r) {
  const n = Number(r.parsed_files);
  if (n === 0) {
    return [
      '=== MRF quality distribution ===',
      '  No parsed files yet. Run the Phase C ingest, then re-run `npm run quality`.',
      '  (mrf_files.quality_score is populated by the parser via scoreFile().)',
    ].join('\n');
  }
  return [
    '=== MRF quality distribution ===',
    `  A (85-100): ${r.grade_a}`,
    `  B (70-84):  ${r.grade_b}`,
    `  C (55-69):  ${r.grade_c}`,
    `  D (40-54):  ${r.grade_d}`,
    `  F (<40):    ${r.grade_f}`,
    `  -----`,
    `  ${r.money_page_eligible} / ${n} files money-page eligible (avg score ${r.avg_score})`,
  ].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  loadEnv();
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set.');
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const report = await qualityReport(client);
    console.log(formatReport(report));
  } finally {
    await client.end();
  }
}
