-- 011_summary_table_offload.sql
-- Lakehouse offload, step 1: convert procedure_hospital_summary from a
-- materialized view (rebuilt by scanning ALL of price_records) into a regular
-- table that the ingest pipeline upserts per hospital. This decouples the small
-- serving layer (what the site reads) from the bulky raw price detail, which is
-- archived to R2 Parquet. The table is seeded from the current matview, so there
-- is ZERO data loss and the site serves identical numbers.
--
-- After this, price_records becomes transient staging — the pipeline inserts a
-- file's rows, derives the summary, then clears them (see persistMrf). Existing
-- price_records rows are archived to R2 + truncated in a separate pipeline step.

-- Up Migration

CREATE TABLE procedure_hospital_summary_t AS SELECT * FROM procedure_hospital_summary;
DROP MATERIALIZED VIEW procedure_hospital_summary;
ALTER TABLE procedure_hospital_summary_t RENAME TO procedure_hospital_summary;

CREATE UNIQUE INDEX idx_pohs_unique ON procedure_hospital_summary(hospital_id, procedure_id, charge_type);
CREATE INDEX idx_pohs_procedure ON procedure_hospital_summary(procedure_id, charge_type);

COMMENT ON TABLE procedure_hospital_summary IS
  'Per (hospital, procedure, charge_type) representative price. Upserted per hospital at ingest (migration 008 logic). Raw price detail lives in R2 Parquet, not Postgres.';

-- Down Migration
-- DROP TABLE IF EXISTS procedure_hospital_summary;
-- (then recreate the 008 materialized view from price_records)
