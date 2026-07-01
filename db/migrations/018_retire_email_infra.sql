-- 018_retire_email_infra.sql
-- Retires the newsletter, subscribe, and contact/correction-form backend along
-- with the live product (see docs/CPT_LICENSING.md and the case-study explainer
-- at apps/web/public/explainer.html). Drops the tables that only existed to
-- back that code, now removed from apps/web.

-- Up Migration

DROP TABLE IF EXISTS newsletter_sends;
DROP TABLE IF EXISTS email_subscribers;
DROP TABLE IF EXISTS form_submissions;

-- Down Migration

-- Not restorable — see 010_form_submissions.sql, 013_email_subscribers.sql,
-- 014_unsubscribe_token.sql, and 015_newsletter_sends.sql for the original
-- table definitions if these ever need to be recreated.
