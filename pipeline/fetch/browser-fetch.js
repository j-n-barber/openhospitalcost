// pipeline/fetch/browser-fetch.js
//
// Playwright (Chromium) fetch helper. Tier-2 of ACQUISITION_STRATEGY.md
// for hospitals whose cms-hpt.txt or MRF URL is gated by JS challenges
// (Akamai / Cloudflare / Imperva / Incapsula) or by ASP.NET .ashx
// handlers that need a real browser to mint the working link.
//
// Posture (deliberately not adversarial):
//   - No stealth plugins, no residential proxies, no CAPTCHA solvers.
//     We're a legitimate consumer of federally-mandated public data.
//     Playwright passes most JS challenges by virtue of being a real
//     browser; the cases where it fails get escalated to Tier-3 outreach.
//   - Same User-Agent identification as our Tier-1 fetcher.
//   - Per-host rate limit honored at the call-site (see callers).

import { chromium } from 'playwright';

const USER_AGENT =
  'OpenHospitalCost-Ingester/1.0 (+https://openhospitalcost.com/about/data; contact: contact@openhospitalcost.com)';
const NAV_TIMEOUT_MS = 30_000;
const SETTLE_MS = 2_500; // give JS challenges time to complete

let cachedBrowser = null;

async function getBrowser() {
  if (cachedBrowser) return cachedBrowser;
  cachedBrowser = await chromium.launch({ headless: true });
  return cachedBrowser;
}

export async function closeBrowser() {
  if (cachedBrowser) {
    await cachedBrowser.close();
    cachedBrowser = null;
  }
}

/**
 * Tier-2 helper for FILE downloads: drive a real browser to the URL's origin so
 * any Cloudflare/Akamai/Imperva JS challenge sets its clearance cookie, then
 * hand those cookies + UA back so the caller can stream the file with a plain
 * fetch (Playwright's APIResponse buffers in memory — unusable for GB files).
 * Returns { cookieHeader, userAgent }.
 */
export async function getBrowserCookies(url) {
  const browser = await getBrowser();
  const ctx = await browser.newContext({
    userAgent: USER_AGENT,
    extraHTTPHeaders: { Accept: '*/*' },
  });
  try {
    const page = await ctx.newPage();
    try {
      await page.goto(new URL(url).origin, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
      await page.waitForTimeout(SETTLE_MS); // let the challenge handshake settle
    } catch {
      // navigation hiccup is non-fatal — still try whatever cookies we have
    }
    const cookies = await ctx.cookies(url);
    return {
      cookieHeader: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
      userAgent: USER_AGENT,
    };
  } finally {
    await ctx.close();
  }
}

/**
 * Fetch a URL with Playwright. Returns { ok, status, text, finalUrl }
 * or { ok: false, error }. Uses a fresh context per call so cookies
 * from one hospital don't leak to another.
 */
export async function fetchViaBrowser(url, { waitForSelector = null } = {}) {
  const browser = await getBrowser();
  const ctx = await browser.newContext({
    userAgent: USER_AGENT,
    extraHTTPHeaders: { Accept: 'text/plain, text/html, */*' },
  });

  try {
    const page = await ctx.newPage();
    let response;
    try {
      response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: NAV_TIMEOUT_MS,
      });
    } catch (err) {
      return { ok: false, error: `navigation failed: ${err.message}` };
    }

    if (!response) return { ok: false, error: 'no response' };

    const status = response.status();
    if (status >= 400) {
      return { ok: false, status, error: `HTTP ${status}` };
    }

    // Allow any JS challenge / cookie-handshake redirect to settle.
    await page.waitForTimeout(SETTLE_MS);

    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, { timeout: 8000 });
      } catch {
        // selector miss is non-fatal — return body anyway
      }
    }

    // Get the raw body. For cms-hpt.txt the response is plain text;
    // for transparency pages it's HTML. Either way, we want the
    // textContent or full HTML to extract URLs from.
    const ct = response.headers()['content-type'] ?? '';
    const text = ct.includes('html') ? await page.content() : await page.evaluate(() => document.body?.innerText ?? '');

    return {
      ok: true,
      status,
      text,
      contentType: ct,
      finalUrl: page.url(),
    };
  } finally {
    await ctx.close();
  }
}
