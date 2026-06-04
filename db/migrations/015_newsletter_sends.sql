-- 015_newsletter_sends.sql
-- Tracks which subscriber received which monthly edition, so the sender is
-- idempotent (safe to re-run) and can drain a list larger than the daily send
-- cap across multiple runs without ever double-sending. edition_key is the
-- year-month string, e.g. '2026-06'.

-- Up Migration

CREATE TABLE newsletter_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_key TEXT NOT NULL,
  email TEXT NOT NULL,
  resend_id TEXT,                 -- Resend message id, when available
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (edition_key, email)     -- one send per subscriber per edition
);

CREATE INDEX idx_newsletter_sends_edition ON newsletter_sends (edition_key, sent_at DESC);

COMMENT ON TABLE newsletter_sends IS
  'One row per (edition, subscriber) delivered. Makes the monthly sender idempotent and resumable under the daily send cap.';

-- Down Migration

-- DROP TABLE IF EXISTS newsletter_sends;
