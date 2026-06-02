-- 010_form_submissions.sql
-- Backs the on-site contact + correction forms. One table for both kinds:
-- contact messages and price/data corrections. Corrections are the review queue
-- the brief calls for ("user correction form submissions → review-then-ingest");
-- contact messages are kept too so nothing is lost if a notification email fails.
-- The web API (apps/web) inserts here; a Resend email notifies the operator.

-- Up Migration

CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('contact', 'correction')),
  name TEXT,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  page_url TEXT,                 -- correction: the page being corrected
  details JSONB,                 -- correction: { whatWrong, expected, source }
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved', 'spam')),
  email_sent BOOLEAN NOT NULL DEFAULT false,
  user_agent TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triage queue: newest unresolved first.
CREATE INDEX idx_form_submissions_triage ON form_submissions (status, created_at DESC);
-- DB-backed rate limiting checks recent submissions per IP.
CREATE INDEX idx_form_submissions_ip ON form_submissions (ip, created_at DESC);

COMMENT ON TABLE form_submissions IS
  'Contact + correction form submissions. Corrections (kind=correction) are the review-then-ingest queue.';

-- Down Migration

-- DROP TABLE IF EXISTS form_submissions;
