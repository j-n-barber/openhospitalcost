-- 006_summary_facility_pref.sql
-- Rebuild procedure_hospital_summary so the representative price isolates the
-- FACILITY (outpatient-preferred) line items from professional/component rows
-- collapsed under one CPT — fixing the "$67 MRI" (QUALITY_RUBRIC § 2.1).
--
-- Two changes vs 004:
--   1. Only the hospital's LATEST mrf_files row feeds the view, so a re-ingest
--      (with billing_class populated) supersedes old rows automatically, and we
--      show current prices rather than appended history.
--   2. Per (hospital, procedure, charge_type) pick the best available tier:
--      facility+outpatient > facility > any (graceful fallback for files that
--      don't label billing_class, e.g. CHOP). Aggregate median + min/max over it.

-- Up Migration

DROP MATERIALIZED VIEW IF EXISTS procedure_hospital_summary;

CREATE MATERIALIZED VIEW procedure_hospital_summary AS
WITH latest AS (
  SELECT DISTINCT ON (hospital_id) hospital_id, id AS file_id
  FROM mrf_files ORDER BY hospital_id, parsed_at DESC
),
pr AS (
  SELECT
    p.hospital_id, p.procedure_id, p.charge_type, p.payer, p.amount,
    p.source_file_id, p.observed_at,
    CASE
      WHEN lower(p.billing_class) = 'facility' AND lower(p.setting) LIKE 'out%' THEN 1
      WHEN lower(p.billing_class) = 'facility' THEN 2
      ELSE 3
    END AS pref
  FROM price_records p
  JOIN latest l ON l.file_id = p.source_file_id
),
ranked AS (
  SELECT *, min(pref) OVER (PARTITION BY hospital_id, procedure_id, charge_type) AS best
  FROM pr
)
SELECT
  hospital_id,
  procedure_id,
  charge_type,
  count(*)::int                                                          AS observations,
  count(DISTINCT payer)::int                                             AS payer_count,
  round(percentile_cont(0.5) WITHIN GROUP (ORDER BY amount)::numeric, 2) AS amount,       -- representative median (facility-preferred)
  round(min(amount)::numeric, 2)                                         AS min_amount,
  round(max(amount)::numeric, 2)                                         AS max_amount,
  max(observed_at)                                                       AS observed_at,
  (array_agg(source_file_id))[1]                                         AS source_file_id,
  CASE min(pref) WHEN 1 THEN 'facility_outpatient' WHEN 2 THEN 'facility' ELSE 'all' END AS basis
FROM ranked
WHERE pref = best
GROUP BY hospital_id, procedure_id, charge_type;

CREATE UNIQUE INDEX idx_pohs_unique ON procedure_hospital_summary(hospital_id, procedure_id, charge_type);
CREATE INDEX idx_pohs_procedure ON procedure_hospital_summary(procedure_id, charge_type);

-- Down Migration

-- DROP MATERIALIZED VIEW IF EXISTS procedure_hospital_summary;
-- (recreate the 004 definition to roll back)
