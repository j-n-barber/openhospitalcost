-- 012_ingest_attempts.sql
-- Per-attempt outcome log for the ingest pipeline. Until now only SUCCESSFUL
-- ingests left a trace (an mrf_files row), so every restart re-downloaded and
-- re-parsed hundreds of permanent failures (404/403/unrecognized/...). Recording
-- every attempt lets the cohort selector skip recently-failed hospitals, retry
-- only transient failures, and bucket failures for targeted fixes.
-- See docs/INGEST_RETRO.md.

-- Up Migration
CREATE TABLE IF NOT EXISTS ingest_attempts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id   uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  run_id        uuid REFERENCES ingestion_runs(id) ON DELETE SET NULL,
  attempted_at  timestamptz NOT NULL DEFAULT now(),
  status        text NOT NULL,            -- 'ok' | 'fail'
  failure_class text,                     -- 404_dead, 403_blocked, giant_json, oom,
                                          -- zip_no_csv, unrecognized, parse, timeout,
                                          -- fetch_failed, http_429, http_5xx, other
  transient     boolean NOT NULL DEFAULT false,
  http_code     int,
  bytes         bigint,
  duration_ms   int,
  detail        text
);
CREATE INDEX IF NOT EXISTS ix_ingest_attempts_hospital ON ingest_attempts (hospital_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS ix_ingest_attempts_class ON ingest_attempts (failure_class) WHERE status = 'fail';

-- Down Migration
DROP TABLE IF EXISTS ingest_attempts;
