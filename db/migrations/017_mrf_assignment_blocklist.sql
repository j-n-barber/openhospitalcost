-- 017_mrf_assignment_blocklist.sql
-- Confirmed-wrong (hospital, url) MRF assignments. When the content-fingerprint
-- audit (audit-duplicate-data.js --purge) removes a mis-assignment, it records
-- the (hospital_id, url) pair here, and the discovery matcher (match-hospital.js)
-- refuses to re-assign that exact pair. This closes the recurrence where a
-- no-EIN portal URL (e.g. clevelandclinic.pt.panaceainc.com/.../indianriver)
-- slips past the EIN veto and gets re-assigned every discovery cycle — the EIN
-- gate can't help without an EIN in the filename, but a pair proven wrong by the
-- post-ingest fingerprint audit never needs to be tried again.
--
-- Note: keyed on (hospital_id, url) — the SAME url is correct for its true owner,
-- only wrong for this hospital. ON DELETE CASCADE so dropped hospitals clean up.

-- Up Migration

CREATE TABLE mrf_assignment_blocklist (
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  reason      TEXT,
  blocked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (hospital_id, url)
);

COMMENT ON TABLE mrf_assignment_blocklist IS
  'Confirmed-wrong (hospital,url) MRF assignments; discovery refuses to re-assign these.';

-- Down Migration

DROP TABLE IF EXISTS mrf_assignment_blocklist;
