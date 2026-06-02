// pipeline/archive/apply-lifecycle.js
//
// One-shot: install the R2 bucket lifecycle rule that expires raw MRFs under
// raw/ after 30 days (they're redownloadable from source, so we don't keep them
// — spec: docs/PROJECT_BRIEF.md § 5 retention). Idempotent: re-running just
// re-puts the same rule. Run once after provisioning R2, and again if the
// retention window changes.
//
// Usage:
//   node pipeline/archive/apply-lifecycle.js            # 30-day raw expiry
//   node pipeline/archive/apply-lifecycle.js --days 30

import { loadEnv } from '../../db/load-env.js';
import { r2Configured, r2Bucket, applyLifecycle } from './r2.js';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  loadEnv();
  if (!r2Configured()) throw new Error('R2 not configured. Set R2_* in .env first.');
  const rawDays = parseInt(arg('days') || '30', 10);
  await applyLifecycle({ rawDays });
  console.log(`Lifecycle applied to bucket "${r2Bucket()}": raw/ objects expire after ${rawDays} days.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
