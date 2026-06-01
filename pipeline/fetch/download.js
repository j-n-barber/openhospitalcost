// pipeline/fetch/download.js
//
// Tier-1 direct MRF download: stream the response straight to disk so we never
// hold a multi-GB file (Cleveland 1.5 GB, Christiana 788 MB) in memory. Blocked
// hosts (Akamai/Imperva/.ashx) fail here and are left for the Tier-2 Playwright
// fetcher (pipeline/fetch/browser-fetch.js) — see ACQUISITION_STRATEGY.md.

import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const USER_AGENT =
  'OpenHospitalCost-Ingester/1.0 (+https://openhospitalcost.com/about/data; contact: jake@openhospitalcost.com)';

/**
 * Download a URL to destPath, streaming. Throws on non-2xx or timeout.
 * @returns {Promise<{status:number, contentType:string|null, contentDisposition:string|null, finalUrl:string}>}
 */
export async function downloadToFile(url, destPath, { timeoutMs = 180_000 } = {}) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ac.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!res.body) throw new Error('empty response body');
    await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath));
    return {
      status: res.status,
      contentType: res.headers.get('content-type'),
      contentDisposition: res.headers.get('content-disposition'),
      finalUrl: res.url,
    };
  } finally {
    clearTimeout(timer);
  }
}
