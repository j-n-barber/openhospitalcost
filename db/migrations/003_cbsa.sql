-- 003_cbsa.sql
-- Metro (CBSA) reference table + hospitals.cbsa_code, for starter-200 metro
-- grouping (docs/QUALITY_RUBRIC.md § 1.5). Populated from the Census CBSA
-- population-estimates file by pipeline/discovery/ingest-cbsa-crosswalk.js.

-- Up Migration

CREATE TABLE cbsa (
  cbsa_code  TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  population INTEGER
);

ALTER TABLE hospitals ADD COLUMN cbsa_code TEXT REFERENCES cbsa(cbsa_code);
CREATE INDEX idx_hospitals_cbsa ON hospitals(cbsa_code);

COMMENT ON TABLE cbsa IS 'Census Core Based Statistical Areas (metros). population = POPESTIMATE (latest vintage).';
COMMENT ON COLUMN hospitals.cbsa_code IS 'Metro the hospital sits in, via county+state -> Census delineation. NULL = non-metro/unmatched.';

-- Down Migration

-- DROP INDEX IF EXISTS idx_hospitals_cbsa;
-- ALTER TABLE hospitals DROP COLUMN IF EXISTS cbsa_code;
-- DROP TABLE IF EXISTS cbsa;
