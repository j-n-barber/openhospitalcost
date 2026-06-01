-- 002_mrf_quality_columns.sql
-- Adds quality-scoring columns to mrf_files so the Phase C parser can persist
-- the File Quality Score (FQS) computed by pipeline/quality.js.
-- Spec: docs/QUALITY_RUBRIC.md § 1.

-- Up Migration

ALTER TABLE mrf_files
  ADD COLUMN quality_score SMALLINT,        -- 0-100 FQS; NULL until parsed
  ADD COLUMN quality_metrics JSONB;         -- full scoreFile() output: components, coverage,
                                            -- flags, eligibleForMoneyPages, raw metrics

-- Partial index: starter-200 selection and money-page rendering both filter on
-- "latest file, money-page eligible." Index only scored rows to keep it small.
CREATE INDEX idx_mrf_files_quality
  ON mrf_files (hospital_id, quality_score DESC)
  WHERE quality_score IS NOT NULL;

COMMENT ON COLUMN mrf_files.quality_score IS
  'File Quality Score 0-100 (docs/QUALITY_RUBRIC.md). NULL = not yet parsed.';
COMMENT ON COLUMN mrf_files.quality_metrics IS
  'Full pipeline/quality.js scoreFile() output as JSONB, incl. eligibleForMoneyPages.';

-- Down Migration

-- DROP INDEX IF EXISTS idx_mrf_files_quality;
-- ALTER TABLE mrf_files DROP COLUMN IF EXISTS quality_metrics;
-- ALTER TABLE mrf_files DROP COLUMN IF EXISTS quality_score;
