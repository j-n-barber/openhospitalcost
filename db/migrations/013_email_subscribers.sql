-- 013_email_subscribers.sql
-- Backs the on-site newsletter signup. Neon is the source of truth for the list;
-- each subscriber is best-effort mirrored into a Resend audience (resend_contact_id
-- records the sync). Keeping our own copy means we never lose the list if Resend
-- changes, and lets us export/segment without API calls. Double opt-in can be
-- layered on later via the status column without a schema change.

-- Up Migration

CREATE TABLE email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  source TEXT,                    -- where they signed up (reports, faq, footer, ...)
  status TEXT NOT NULL DEFAULT 'subscribed'
    CHECK (status IN ('subscribed', 'unsubscribed', 'bounced')),
  resend_contact_id TEXT,        -- id returned when added to the Resend audience
  resend_synced BOOLEAN NOT NULL DEFAULT false,
  user_agent TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Most recent signups first, for an operator dashboard / export.
CREATE INDEX idx_email_subscribers_created ON email_subscribers (created_at DESC);
-- DB-backed rate limiting checks recent signups per IP.
CREATE INDEX idx_email_subscribers_ip ON email_subscribers (ip, created_at DESC);

COMMENT ON TABLE email_subscribers IS
  'Newsletter signups. Source of truth for the list; mirrored best-effort into a Resend audience.';

-- Down Migration

-- DROP TABLE IF EXISTS email_subscribers;
