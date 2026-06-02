-- 008_summary_min_dollar.sql
-- Raise the price floor from > 0 to >= $1. Sub-dollar amounts ($0.01–$0.99) are
-- artifacts — percentage-of-charge / algorithm entries mis-stored as dollars —
-- never a real gross/cash/negotiated charge for a CPT procedure. They were
-- surfacing as "$0"/"<$1" range-lows on the money pages. Same view as 007 with
-- the floor changed.

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
  WHERE p.amount >= 1
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
  round(percentile_cont(0.5) WITHIN GROUP (ORDER BY amount)::numeric, 2) AS amount,
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
-- DROP MATERIALIZED VIEW IF EXISTS procedure_hospital_summary; (recreate 007 to roll back)
