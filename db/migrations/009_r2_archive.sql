-- 009_r2_archive.sql
-- R2 archival bookkeeping.
--   1. mrf_files gets columns recording where each raw MRF was archived in R2
--      and when retention is expected to delete it (lifecycle rule, 30 days).
--   2. snapshots table tracks the periodic Parquet exports of price_records
--      (historical archive: weekly for 12 months, monthly forever).
-- Spec: docs/PROJECT_BRIEF.md § 5 (per-hospital ingestion job, retention).

-- Up Migration

ALTER TABLE mrf_files
  ADD COLUMN r2_raw_key TEXT,                 -- object key of the archived raw MRF; NULL = not archived
  ADD COLUMN r2_raw_uploaded_at TIMESTAMPTZ,  -- when the raw bytes were put to R2
  ADD COLUMN r2_raw_expires_at TIMESTAMPTZ;   -- expected lifecycle expiry (uploaded_at + 30d), informational

COMMENT ON COLUMN mrf_files.r2_raw_key IS
  'R2 object key (raw/<ccn>/<date>/<hash>.<ext>) of the archived raw MRF. NULL when R2 was not configured at ingest.';
COMMENT ON COLUMN mrf_files.r2_raw_expires_at IS
  'Expected deletion time per the R2 raw/ lifecycle rule. The rule is authoritative; this column is for visibility.';

CREATE TABLE snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cadence TEXT NOT NULL CHECK (cadence IN ('weekly', 'monthly')),
  snapshot_date DATE NOT NULL,
  r2_key TEXT NOT NULL,
  row_count BIGINT,
  byte_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cadence, snapshot_date)
);

COMMENT ON TABLE snapshots IS
  'Parquet exports of price_records archived to R2. Retention: weekly kept 12 months, monthly kept forever (prune-snapshots.js).';

-- Down Migration

-- DROP TABLE IF EXISTS snapshots;
-- ALTER TABLE mrf_files
--   DROP COLUMN IF EXISTS r2_raw_expires_at,
--   DROP COLUMN IF EXISTS r2_raw_uploaded_at,
--   DROP COLUMN IF EXISTS r2_raw_key;
