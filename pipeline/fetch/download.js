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
  'OpenHospitalCost-Ingester/1.0 (+https://openhospitalcost.com/about/data; contact: contact@openhospitalcost.com)';

async function streamToFile(url, destPath, headers, timeoutMs) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: ac.signal, headers });
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

/**
 * Tier-1 direct download, streaming. Throws on non-2xx or timeout.
 */
export async function downloadToFile(url, destPath, { timeoutMs = 600_000 } = {}) {
  return { ...(await streamToFile(url, destPath, { 'User-Agent': USER_AGENT, Accept: '*/*' }, timeoutMs)), tier: 1 };
}

/**
 * Tier-2 download: harvest challenge cookies via Playwright, then stream the
 * file with those cookies. Playwright is imported lazily so the common Tier-1
 * path never loads it.
 */
export async function downloadViaBrowser(url, destPath, { timeoutMs = 600_000 } = {}) {
  const { getBrowserCookies } = await import('./browser-fetch.js');
  const { cookieHeader, userAgent } = await getBrowserCookies(url);
  const headers = { 'User-Agent': userAgent, Accept: '*/*' };
  if (cookieHeader) headers.Cookie = cookieHeader;
  return { ...(await streamToFile(url, destPath, headers, timeoutMs)), tier: 2 };
}

/**
 * Try Tier-1 direct, fall back to Tier-2 browser-cookie download on failure
 * (403 / JS challenge). Throws with both errors if Tier-2 also fails (→ Tier-3
 * manual). Returns the successful download's meta incl. which `tier` worked.
 */
export async function downloadWithFallback(url, destPath, opts = {}) {
  try {
    return await downloadToFile(url, destPath, opts);
  } catch (e1) {
    try {
      return await downloadViaBrowser(url, destPath, opts);
    } catch (e2) {
      throw new Error(`tier1: ${e1.message}; tier2: ${e2.message}`);
    }
  }
}

export async function closeBrowserIfOpen() {
  try {
    const mod = await import('./browser-fetch.js');
    await mod.closeBrowser();
  } catch {
    // browser was never opened
  }
}
