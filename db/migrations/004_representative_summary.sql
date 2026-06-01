-- 004_representative_summary.sql
-- Redefine procedure_hospital_summary to expose a representative price per
-- (hospital, procedure, charge_type) instead of one arbitrary row.
-- Implements docs/QUALITY_RUBRIC.md § 2.1: the median collapses the CDM
-- fan-out and the per-payer spread to a single defensible number, with
-- min/max/payer_count kept for the price range + trust signals.

-- Up Migration

DROP MATERIALIZED VIEW IF EXISTS procedure_hospital_summary;

CREATE MATERIALIZED VIEW procedure_hospital_summary AS
SELECT
  hospital_id,
  procedure_id,
  charge_type,
  count(*)                                                              AS observations,
  count(DISTINCT payer) FILTER (WHERE payer IS NOT NULL)                AS payer_count,
  round(percentile_cont(0.5) WITHIN GROUP (ORDER BY amount)::numeric, 2) AS amount,      -- representative (median)
  min(amount)                                                          AS min_amount,
  max(amount)                                                          AS max_amount,
  max(observed_at)                                                     AS observed_at,
  max(source_file_id::text)::uuid                                      AS source_file_id
FROM price_records
GROUP BY hospital_id, procedure_id, charge_type;

CREATE UNIQUE INDEX idx_pohs_unique
  ON procedure_hospital_summary(hospital_id, procedure_id, charge_type);
CREATE INDEX idx_pohs_procedure ON procedure_hospital_summary(procedure_id, charge_type);

-- Down Migration

-- DROP MATERIALIZED VIEW IF EXISTS procedure_hospital_summary;
-- (recreate the original DISTINCT ON definition from 001 if rolling back)
