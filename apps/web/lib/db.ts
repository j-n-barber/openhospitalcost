import { neon } from '@neondatabase/serverless';

// HTTP-based Neon driver — no connection pooling headaches on Vercel serverless.
// Reads DATABASE_URL from .env.local (gitignored; mirrors the repo-root .env).
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set (apps/web/.env.local).');
}

export const sql = neon(process.env.DATABASE_URL);

// The latest mrf_files row per hospital, used everywhere we need a hospital's
// current price file + quality/eligibility.
export const LATEST_FILE_JOIN =
  'JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true';
