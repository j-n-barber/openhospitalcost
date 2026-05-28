-- 001_initial_schema.sql
-- Source: docs/PROJECT_BRIEF.md Section 4

-- Up Migration

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Reference data --------------------------------------------------------

CREATE TABLE hospital_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_system_id UUID REFERENCES hospital_systems(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ccn TEXT NOT NULL UNIQUE,
  npi TEXT,
  ein TEXT,
  name TEXT NOT NULL,
  dba_name TEXT,
  slug TEXT NOT NULL,
  system_id UUID REFERENCES hospital_systems(id),
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state CHAR(2) NOT NULL,
  zip TEXT,
  county TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  hospital_type TEXT,
  ownership TEXT,
  beds INTEGER,
  teaching_status BOOLEAN,
  mrf_root_url TEXT,
  mrf_file_url TEXT,
  mrf_format TEXT,
  last_mrf_check_at TIMESTAMPTZ,
  last_mrf_update_at TIMESTAMPTZ,
  last_mrf_hash TEXT,
  refresh_tier SMALLINT NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hospitals_state_city ON hospitals(state, city);
CREATE INDEX idx_hospitals_slug ON hospitals(slug);
CREATE INDEX idx_hospitals_refresh_tier ON hospitals(refresh_tier);

CREATE TABLE procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  code_type TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT,
  shoppable_service BOOLEAN NOT NULL DEFAULT false,
  search_priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(code, code_type)
);

CREATE INDEX idx_procedures_slug ON procedures(slug);
CREATE INDEX idx_procedures_shoppable ON procedures(shoppable_service) WHERE shoppable_service = true;

CREATE TABLE procedure_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_procedure_aliases_alias ON procedure_aliases(lower(alias));
CREATE INDEX idx_procedure_aliases_trgm ON procedure_aliases USING GIN (alias gin_trgm_ops);

-- Operational tables ----------------------------------------------------

CREATE TABLE mrf_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  url TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  file_size_bytes BIGINT,
  fetched_at TIMESTAMPTZ NOT NULL,
  parsed_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  error TEXT,
  record_count INTEGER,
  parse_warnings JSONB
);

CREATE INDEX idx_mrf_files_hospital ON mrf_files(hospital_id, fetched_at DESC);
CREATE INDEX idx_mrf_files_hash ON mrf_files(file_hash);

CREATE TABLE ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  run_type TEXT NOT NULL,
  stats JSONB
);

-- Price data (append-only) ----------------------------------------------

CREATE TABLE price_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  procedure_id UUID NOT NULL REFERENCES procedures(id),
  charge_type TEXT NOT NULL,
  payer TEXT,
  plan TEXT,
  amount NUMERIC(12,2) NOT NULL,
  methodology TEXT,
  modifiers TEXT,
  billing_class TEXT,
  source_file_id UUID NOT NULL REFERENCES mrf_files(id),
  observed_at TIMESTAMPTZ NOT NULL,
  effective_date DATE,
  raw_record JSONB
);

CREATE INDEX idx_price_records_lookup
  ON price_records(hospital_id, procedure_id, charge_type, observed_at DESC);
CREATE INDEX idx_price_records_procedure
  ON price_records(procedure_id, observed_at DESC);
CREATE INDEX idx_price_records_source ON price_records(source_file_id);

-- Materialized current view ---------------------------------------------

CREATE MATERIALIZED VIEW procedure_hospital_summary AS
SELECT DISTINCT ON (hospital_id, procedure_id, charge_type)
  hospital_id,
  procedure_id,
  charge_type,
  amount,
  payer,
  plan,
  source_file_id,
  observed_at
FROM price_records
ORDER BY hospital_id, procedure_id, charge_type, observed_at DESC;

CREATE UNIQUE INDEX idx_pohs_unique
  ON procedure_hospital_summary(hospital_id, procedure_id, charge_type);

-- User corrections ------------------------------------------------------

CREATE TABLE user_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id),
  procedure_id UUID REFERENCES procedures(id),
  reporter_email TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

-- URL redirects ---------------------------------------------------------

CREATE TABLE url_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path TEXT NOT NULL UNIQUE,
  to_path TEXT NOT NULL,
  status_code SMALLINT NOT NULL DEFAULT 301,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Down Migration

-- DROP MATERIALIZED VIEW IF EXISTS procedure_hospital_summary;
-- DROP TABLE IF EXISTS url_redirects;
-- DROP TABLE IF EXISTS user_corrections;
-- DROP TABLE IF EXISTS price_records;
-- DROP TABLE IF EXISTS ingestion_runs;
-- DROP TABLE IF EXISTS mrf_files;
-- DROP TABLE IF EXISTS procedure_aliases;
-- DROP TABLE IF EXISTS procedures;
-- DROP TABLE IF EXISTS hospitals;
-- DROP TABLE IF EXISTS hospital_systems;
