# MRF Acquisition Strategy

**Status:** Phase A — designed but not implemented. Wire up during Phase B.

**Purpose.** Reliable retrieval of every hospital's Machine-Readable File at scale (~5,000 hospitals). The parser ([docs/PARSER_NOTES.md](PARSER_NOTES.md)) only matters if the file actually lands on disk. Bot defenses on a handful of hospital websites are the biggest blocker to that.

This doc describes how we get the files, in what order to escalate, and the legal/operational posture for each tier.

---

## What we're up against

From the Phase A spike, hospital MRFs sit behind four distinct defense patterns:

| Defense | Examples we hit | What it checks | What defeats it |
|---|---|---|---|
| **JS challenge** | Cloudflare ("Just a moment…"), Imperva/Incapsula | Browser must run JS, set cookies, retry once | Real browser (Playwright) |
| **Behavioral fingerprinting** | Akamai (Mayo Clinic) | TLS fingerprint, header order, prior session | Polite identification + real browser |
| **JS-rendered link** | ASP.NET `.ashx` handlers (Memorial Hermann, Houston Methodist) | Direct URL returns 500; page uses JS to mint a working URL | Real browser, or page-scrape to extract URL |
| **Signed URL rotation** | Azure Blob SAS tokens (HCA, UCHealth) | URL only valid when freshly extracted from page | Re-scrape transparency page each ingestion |

Rough share of hospitals affected (extrapolated from a 5-hospital sample, refine in Phase B): **5–15%**. At 5,000 hospitals, that's 250–750 problem cases.

---

## The four-tier strategy

### Tier 1 — Polite direct fetch (target: 90–95% of hospitals)

This is the default. Every hospital starts here. The discipline is to act like a legitimate data project, not a scraper:

- **Identify ourselves clearly.** User-Agent: `OpenHospitalCost-Ingester/1.0 (+https://openhospitalcost.com/about/data; contact: <email>)`. Spoofing as Chrome looks adversarial; clear identification signals legitimacy and gives the hospital a way to reach us if they have concerns.
- **Respect `robots.txt`.** Federal data mandate does not override site-specific crawler restrictions. In practice MRF paths are explicitly allowed.
- **Rate-limit to ≤1 req/sec per host.** At our scale (one MRF per hospital per refresh tier) this adds zero observable time.
- **Honor `Retry-After`** on 429s; exponential back-off on 5xx.
- **Stable IPs.** Run from one Railway worker so hospitals see consistent origin. Avoids triggering "new IP, lots of requests" rate limits.

Improves direct-curl success from ~85% (naive `curl`) to ~95% in our estimate.

### Tier 2 — Headless browser (target: 4–9% of hospitals)

Playwright running on a dedicated Railway worker. Triggered automatically when Tier 1 fails. Solves Cloudflare, Imperva, Incapsula, and most ASP.NET handler flows because it IS a real browser — there is nothing to detect.

**Implementation sketch:**

```js
// pipeline/fetch/browser.js
import { chromium } from 'playwright';

export async function fetchMrfViaBrowser(hospital) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: 'OpenHospitalCost-Ingester/1.0 (+https://openhospitalcost.com/about/data)',
  });
  const page = await ctx.newPage();
  await page.goto(hospital.mrf_root_url, { waitUntil: 'networkidle' });

  // Wait for any JS challenge to settle.
  await page.waitForTimeout(3000);

  // Hospitals vary — some have a direct download link, some need a click.
  // Use the hospital's documented selector (we maintain per-host scrape configs).
  const fileUrl = await page.evaluate(/* per-host extractor */);
  // ...download via the now-authenticated context, or page.request.get(fileUrl).
  await browser.close();
}
```

**Cost:** ~$5–10/month on Railway for a worker that runs the bot-protected hospitals weekly.

**Do NOT use:**
- Stealth plugins (e.g., `playwright-extra` with stealth) — needed only when actively hiding from anti-bot systems. We are not hiding.
- Residential proxies (Bright Data, Oxylabs, etc.) — appropriate for adversarial scraping. Not appropriate here.
- CAPTCHA-solving services (2Captcha, Anti-Captcha) — same.

Using any of these undermines the legal posture in Tier 4 below.

### Tier 3 — Direct outreach (target: <1% of hospitals)

A handful will block even Playwright (Cloudflare Turnstile + aggressive challenges, or paywalled access portals). For those:

1. The CMS rule requires a contact email in each hospital's `cms-hpt.txt` root locator. Memorial Hermann's, for example, lists `MRFteam@memorialhermann.org`.
2. Send a one-paragraph email:
   > "We're OpenHospitalCost, a national consumer-facing transparency site aggregating publicly-mandated MRF data. Your current MRF URL blocks automated access. Could you provide a stable URL we can pull from, or whitelist our IP (X.X.X.X)? Happy to share more about the project."
3. Most hospitals respond positively — they have a compliance officer whose job is making the data accessible.

Expect 20–50 emails over the first year for a 5,000-hospital roster. Track in a `hospital_outreach` table:

```sql
-- Add in Phase B migration 003_outreach.sql
CREATE TABLE hospital_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  contact_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  response_at TIMESTAMPTZ,
  resolution TEXT,                  -- 'stable_url_provided' | 'ip_whitelisted' | 'declined' | 'no_response'
  notes TEXT
);
```

### Tier 4 — CMS compliance complaint (rare)

If a hospital systematically blocks AND ignores outreach, they're arguably violating 45 CFR § 180. File a complaint at https://www.cms.gov/medicare/regulations-guidance/legislation/hospital-price-transparency/complaints.

CMS has started enforcing — fines ranged $32K–$300K in 2025, and enforcement of the updated rule begins April 2026. Slow but real. Surface the hospital on our site as "data temporarily unavailable — compliance status pending" rather than stale data.

---

## Schema additions (Phase B)

```sql
-- Migration 002_acquisition.sql
ALTER TABLE hospitals ADD COLUMN acquisition_method TEXT NOT NULL DEFAULT 'direct';
-- 'direct' | 'browser' | 'outreach' | 'blocked'

ALTER TABLE hospitals ADD COLUMN acquisition_notes TEXT;
ALTER TABLE hospitals ADD COLUMN last_acquisition_failure_at TIMESTAMPTZ;
ALTER TABLE hospitals ADD COLUMN last_acquisition_failure_reason TEXT;
```

---

## Cron escalation logic

```
Daily light poll (Tier 1, all hospitals)
  └─ on failure ─→ mark for weekly Tier 2 retry; record reason

Weekly browser batch (Tier 2, ~250–750 hospitals)
  └─ on 2nd consecutive failure ─→ create hospital_outreach row, surface to dashboard

Manual outreach queue (Tier 3, ~20–50/yr)
  └─ no response in 30 days ─→ mark hospital 'blocked', surface compliance issue on site
                              └─ optionally file CMS complaint (Tier 4)
```

Hospitals on `acquisition_method = 'browser'` get a 10-point penalty in their quality score (browser fetches are slower, more failure-prone, and we want to surface direct-fetch hospitals first when ranking).

---

## Legal posture

**Public mandated data is a strong defense.** *hiQ Labs v. LinkedIn* (9th Cir. 2022) established that scraping publicly-available data is not "unauthorized access" under CFAA. Federally-mandated transparency data is even clearer — the hospital is *required* to publish it under 45 CFR § 180. A hospital blocking automated access to a federally-mandated public file is the legally-suspect party, not the consumer.

**Two operational rules to keep that posture:**

1. **Never click "I agree" on access wrappers.** Some hospitals front their MRF with a terms-of-service click-through. Accepting binds us to terms that may contradict our use case. Either Playwright passes through it as a passive document consumer, or we escalate to outreach.
2. **Stay polite.** Identifying ourselves, rate-limiting, and respecting robots.txt removes any "abusive use" argument. Stealth tooling and residential proxies make the conversation much harder if a hospital ever complains.

**To-do in Phase B:** Bundle a 30-minute scraping-posture review into the existing AMA/CPT legal consult. Likely $200–400 incremental cost.

---

## Cost summary

| Component | Cost |
|---|---|
| Tier 1 worker (Railway, runs daily poll + Tier 1 fetches) | $5/month |
| Tier 2 worker (Railway, Playwright weekly batch) | $5–10/month |
| Tier 3 outreach tracking (Postgres rows, your time) | $0 |
| Tier 4 complaints (CMS form, your time) | $0 |
| Legal review of scraping posture (one-time, Phase B) | $200–400 |
| **Total incremental ongoing cost** | **$10–15/month** |

Well within the brief's $50/month build-phase budget and $250/month at-revenue-scale ceiling.

---

## Open Phase B decisions

- **Playwright vs. Puppeteer.** Playwright is the modern choice and handles browser fingerprinting slightly better out of the box. Recommend Playwright.
- **One Railway worker for both tiers, or separate workers.** Separate keeps failure isolated; same worker is simpler. Recommend separate from day one — cron schedules are different and we want independent scaling.
- **Per-host extractor configs.** Bot-protected hospitals will need a small JSON config file each describing how to extract the MRF URL from their page. Recommend keeping these in `pipeline/discovery/extractors/<ccn>.json` so they're versioned alongside code.
- **When to write the Playwright worker.** Two options: (a) write it preemptively in Phase B so 4–9% of hospitals don't fall out of the starter-200 cohort; (b) write it after Phase C ingestion proves direct fetch works for the bulk. Recommend (a) — the starter-200 includes some bot-protected hospitals (Mayo, Boston Children's, Memorial Hermann), and skipping them would leave visible gaps on launch.
