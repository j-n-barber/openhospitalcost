// db/seeds/load-procedures.js
// Idempotent loader for the canonical procedure dictionary.
// Reads data/procedures.json and upserts into procedures + procedure_aliases.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from 'pg';
import { loadEnv } from '../load-env.js';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

async function main() {
  loadEnv();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set. Add it to .env or export it.');
    process.exit(1);
  }

  const dictPath = resolve(repoRoot, 'data', 'procedures.json');
  const dict = JSON.parse(readFileSync(dictPath, 'utf8'));
  const procedures = dict.procedures;

  const client = new Client({ connectionString });
  await client.connect();

  let inserted = 0;
  let updated = 0;
  let aliasesInserted = 0;

  try {
    await client.query('BEGIN');

    for (const p of procedures) {
      const result = await client.query(
        `INSERT INTO procedures
           (code, code_type, name, slug, description, category, shoppable_service, search_priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (code, code_type) DO UPDATE SET
           name = EXCLUDED.name,
           slug = EXCLUDED.slug,
           description = EXCLUDED.description,
           category = EXCLUDED.category,
           shoppable_service = EXCLUDED.shoppable_service,
           search_priority = EXCLUDED.search_priority,
           updated_at = now()
         RETURNING id, (xmax = 0) AS was_inserted`,
        [
          p.code,
          p.code_type,
          p.name,
          p.slug,
          p.description ?? null,
          p.category ?? null,
          p.shoppable_service ?? false,
          p.search_priority ?? 0,
        ]
      );
      const { id, was_inserted } = result.rows[0];
      if (was_inserted) inserted++; else updated++;

      // Aliases: replace-all for this procedure to keep idempotent.
      await client.query('DELETE FROM procedure_aliases WHERE procedure_id = $1', [id]);
      for (const alias of p.aliases ?? []) {
        await client.query(
          `INSERT INTO procedure_aliases (procedure_id, alias, source) VALUES ($1, $2, $3)`,
          [id, alias, p.source ?? null]
        );
        aliasesInserted++;
      }
    }

    await client.query('COMMIT');
    console.log(`procedures: ${inserted} inserted, ${updated} updated`);
    console.log(`aliases: ${aliasesInserted} loaded`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
