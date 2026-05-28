// db/migrate.js
// Thin wrapper around node-pg-migrate that uses our manual .env loader.
// Usage:
//   npm run migrate:up
//   npm run migrate:down
//   npm run migrate:create -- <migration-name>

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { runner } from 'node-pg-migrate';
import { loadEnv } from './load-env.js';

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, 'migrations');
const direction = process.argv[2];

if (direction === 'create') {
  const name = process.argv[3];
  if (!name) {
    console.error('Usage: npm run migrate:create -- <migration-name>');
    process.exit(1);
  }
  const binary = resolve(
    __dirname, '..', 'node_modules', 'node-pg-migrate', 'bin', 'node-pg-migrate.js'
  );
  const result = spawnSync(
    'node',
    [binary, 'create', name, '-m', migrationsDir, '-j', 'sql'],
    { stdio: 'inherit' }
  );
  process.exit(result.status ?? 0);
}

if (direction !== 'up' && direction !== 'down') {
  console.error('Usage: npm run migrate:up | migrate:down | migrate:create -- <name>');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set. Add it to .env or export it.');
  process.exit(1);
}

await runner({
  databaseUrl: process.env.DATABASE_URL,
  dir: migrationsDir,
  direction,
  migrationsTable: 'pgmigrations',
  count: direction === 'down' ? 1 : Infinity,
  singleTransaction: true,
  verbose: true,
});
