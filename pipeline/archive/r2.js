// pipeline/archive/r2.js
//
// Cloudflare R2 archive client. R2 speaks the S3 API, so we use @aws-sdk with a
// custom endpoint (https://<account>.r2.cloudflarestorage.com) and region 'auto'.
// lib-storage's Upload does multipart streaming, which is essential here: raw
// MRFs run multi-GB (Cleveland 1.5 GB) and must never be buffered in memory.
//
// Object layout in the bucket:
//   raw/<ccn>/<YYYY-MM-DD>/<file_hash>.<ext>     raw MRF, expires after 30 days
//                                                (lifecycle rule, see apply-lifecycle.js)
//   snapshots/<cadence>/<YYYY-MM-DD>/price_records.parquet   historical archive
//
// Everything degrades gracefully: if R2 isn't configured, r2Configured() is
// false and callers skip archival rather than failing ingest.

import { createReadStream } from 'node:fs';
import {
  S3Client,
  HeadObjectCommand,
  DeleteObjectCommand,
  PutBucketLifecycleConfigurationCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

export function r2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
  );
}

export function r2Bucket() {
  return process.env.R2_BUCKET;
}

let _client;
export function r2Client() {
  if (!r2Configured()) {
    throw new Error(
      'R2 not configured: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET in .env.'
    );
  }
  if (!_client) {
    _client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return _client;
}

// ── Key builders ──────────────────────────────────────────────────────────

/** raw/<ccn>/<YYYY-MM-DD>/<hash>.<ext> — hash in the name dedupes re-downloads. */
export function rawKey({ ccn, fetchedAt, hash, sourceUrl, payload }) {
  const date = (fetchedAt instanceof Date ? fetchedAt : new Date(fetchedAt))
    .toISOString()
    .slice(0, 10);
  const ext = extForRaw({ sourceUrl, payload });
  return `raw/${ccn}/${date}/${hash}${ext}`;
}

/** snapshots/<cadence>/<YYYY-MM-DD>/price_records.parquet */
export function snapshotKey({ cadence, date }) {
  return `snapshots/${cadence}/${date}/price_records.parquet`;
}

// Preserve the original container extension so the archived bytes are inspectable
// without DB lookups. Falls back to the parsed payload, then .bin.
function extForRaw({ sourceUrl, payload }) {
  if (sourceUrl) {
    const m = sourceUrl.split('?')[0].match(/\.(zip|gz|json|csv|xlsx?|txt)$/i);
    if (m) return `.${m[1].toLowerCase()}`;
  }
  if (payload === 'json') return '.json';
  if (payload === 'csv') return '.csv';
  return '.bin';
}

// ── Operations ──────────────────────────────────────────────────────────────

/**
 * Stream a local file to R2 via multipart upload. Returns { key, size }.
 * 16 MB parts, up to 4 concurrent — comfortable for GB files without spiking RSS.
 */
export async function uploadFile({ key, filePath, contentType }) {
  const upload = new Upload({
    client: r2Client(),
    params: {
      Bucket: r2Bucket(),
      Key: key,
      Body: createReadStream(filePath),
      ContentType: contentType || 'application/octet-stream',
    },
    queueSize: 4,
    partSize: 16 * 1024 * 1024,
  });
  const res = await upload.done();
  return { key, etag: res.ETag };
}

/** True if an object exists at key. */
export async function objectExists(key) {
  try {
    await r2Client().send(new HeadObjectCommand({ Bucket: r2Bucket(), Key: key }));
    return true;
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') return false;
    throw err;
  }
}

export async function deleteObject(key) {
  await r2Client().send(new DeleteObjectCommand({ Bucket: r2Bucket(), Key: key }));
}

/**
 * Apply the bucket lifecycle: expire everything under raw/ after `rawDays` days.
 * Snapshot retention is code-driven (prune-snapshots.js) because "weekly for 12
 * months, monthly forever" can't be expressed as a single prefix rule.
 */
export async function applyLifecycle({ rawDays = 30 } = {}) {
  await r2Client().send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: r2Bucket(),
      LifecycleConfiguration: {
        Rules: [
          {
            ID: 'expire-raw-mrfs',
            Status: 'Enabled',
            Filter: { Prefix: 'raw/' },
            Expiration: { Days: rawDays },
          },
        ],
      },
    })
  );
  return { rawDays };
}
