-- 016_analytics_events.sql
-- First-party, privacy-friendly pageview analytics so we can query traffic
-- directly from Neon (no third-party API). A small client beacon POSTs each
-- pageview to /api/track, which enriches it with Vercel geo + user-agent headers
-- and inserts here. NO PII is stored: session_id is a daily-rotating SHA-256 hash
-- of (ip + user-agent + date) — not reversible to a person and useless across
-- days. analytics_daily is a tiny long-term rollup so history survives pruning of
-- the raw events table.

-- Up Migration

CREATE TABLE analytics_events (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ts            TIMESTAMPTZ NOT NULL DEFAULT now(),
  path          TEXT NOT NULL,
  referrer_host TEXT,            -- external source hostname, 'direct', or 'internal'
  country       TEXT,            -- x-vercel-ip-country (ISO-2)
  region        TEXT,            -- x-vercel-ip-country-region
  device        TEXT,            -- mobile | desktop | tablet
  os            TEXT,
  browser       TEXT,
  session_id    TEXT,            -- daily-rotating hash(ip+ua+date); no PII
  is_bot        BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_analytics_events_ts   ON analytics_events (ts DESC);
CREATE INDEX idx_analytics_events_path ON analytics_events (path) WHERE NOT is_bot;

-- Long-term, cheap rollup (path × day). Populated by a periodic job; raw events
-- can be pruned after ~90 days without losing the trend history.
CREATE TABLE analytics_daily (
  day      DATE NOT NULL,
  path     TEXT NOT NULL,
  views    INTEGER NOT NULL DEFAULT 0,
  visitors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path)
);

COMMENT ON TABLE analytics_events IS 'First-party pageview events (privacy-friendly, no PII). Source: /api/track beacon.';
COMMENT ON TABLE analytics_daily  IS 'Daily path rollup of analytics_events, kept long-term after raw events are pruned.';

-- Down Migration

DROP TABLE IF EXISTS analytics_daily;
DROP TABLE IF EXISTS analytics_events;
