-- 014_unsubscribe_token.sql
-- One-click unsubscribe support for newsletter sends. Each subscriber gets a
-- stable, unguessable token used in the List-Unsubscribe header and the visible
-- unsubscribe link. Unsubscribing flips email_subscribers.status to
-- 'unsubscribed'; our batch sender filters on status = 'subscribed', so Neon is
-- the authoritative suppression list (no dependency on the ESP).

-- Up Migration

ALTER TABLE email_subscribers
  ADD COLUMN unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX idx_email_subscribers_unsub_token
  ON email_subscribers (unsubscribe_token);

-- Down Migration

-- DROP INDEX IF EXISTS idx_email_subscribers_unsub_token;
-- ALTER TABLE email_subscribers DROP COLUMN IF EXISTS unsubscribe_token;
