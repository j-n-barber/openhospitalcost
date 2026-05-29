# Manual MRF URL — Handoff

**Audience:** Jake, ~15-30 minutes of human work total.
**Goal:** Close the last few stubborn marquee hospitals that automation can't reach.

---

## Why this exists

Our automated discovery pipeline (CMS → TPAFS → DoltHub → cms-hpt scraper → alt-path probe → Playwright Tier-2) gets us to ~85-90% URL coverage. A handful of well-known hospitals sit behind bot defenses that even Playwright doesn't beat — most notably **Mayo Clinic Rochester**, which Akamai blocks at the network layer.

Those hospitals **do** publish their MRFs publicly (the federal HPT rule requires it). We just have to find the URL in a regular browser, hand-pin it once, and our pipeline will treat it as authoritative going forward.

This document is the operator manual for that work.

---

## The mechanism

Two files do the work:

- **`pipeline/discovery/manual-mrf-urls.json`** — the hand-curated list of overrides. Each entry has `ccn`, `mrf_file_url`, `mrf_format`, and `verified: true|false`.
- **`pipeline/discovery/apply-manual-mrf-urls.js`** — applies the verified entries to both Neon branches.

Workflow:
1. Find the URL in a real browser (steps below).
2. Edit the JSON — fill in `mrf_file_url`, set `verified: true`.
3. Run `npm run apply:manual-urls` against each branch.
4. Commit the JSON change.

---

## Current pending entry: Mayo Clinic Rochester (CCN 240010)

**One-shot steps:**

1. Open **https://www.mayoclinic.org/billing-insurance/price-estimates/chargemaster** in Chrome or Safari.
2. Scroll to the **Minnesota** / **Rochester** section.
3. Right-click the link labeled something like *"CMS Price Transparency Machine Readable File"* or *"Standard Charges File"*.
4. Choose **Copy Link Address**.
5. Open `pipeline/discovery/manual-mrf-urls.json`.
6. Find the Mayo entry (CCN `240010`).
7. Paste the URL into `mrf_file_url`.
8. Set the appropriate `mrf_format` (look at the URL's file extension — almost certainly `json`).
9. Flip `verified` to `true`.
10. Save.
11. From the repo root:
    ```sh
    # Apply to production
    npm run apply:manual-urls

    # Apply to dev
    DATABASE_URL="$DATABASE_URL_DEV" npm run apply:manual-urls
    ```
12. Commit:
    ```sh
    git add pipeline/discovery/manual-mrf-urls.json
    git commit -m "Pin Mayo Clinic Rochester MRF URL (manual override)"
    git push
    ```

That's it. Mayo is now part of our roster with a live URL.

---

## Adding more hospitals to the override list

As we discover other unreachable marquee hospitals over time, the pattern is the same:

1. Open the hospital's price transparency page in a real browser.
2. Find the direct download link to their standard charges file.
3. Add an entry to `manual-mrf-urls.json`:

```json
{
  "ccn": "XXXXXX",
  "name_hint": "Human-readable name for our future selves",
  "defense": "What blocks automation (Akamai / Cloudflare Turnstile / geofence / etc.)",
  "source_page": "Hospital's transparency page URL — useful for re-verification",
  "mrf_file_url": "The direct file URL you copied",
  "mrf_format": "json | csv | zip | xml | ashx",
  "verified": true,
  "added": "YYYY-MM-DD"
}
```

4. `npm run apply:manual-urls` against both branches.
5. Commit.

Expect maybe 10-30 of these entries total in v1, all in the marquee tier (top 200 by traffic potential). The long tail of unreached small community hospitals **does not** belong in this file — those get the graceful "data not yet located" page label instead.

---

## Quarterly re-verification

Marquee hospital URLs are stable but not immortal. Once a quarter:

1. For each entry in `manual-mrf-urls.json` where `verified: true`:
2. Click the `source_page` URL.
3. Confirm the file link still resolves and the linked URL matches `mrf_file_url`.
4. If the URL has rotated, update `mrf_file_url` and bump the `added` date.
5. Commit any changes.

A 30-entry file takes about 30 minutes per quarter. Worth scheduling as a recurring calendar reminder.

---

## What to NOT put in this file

- Hospitals where automation works (the scraper updates them daily; manual entries would go stale faster than scraped ones).
- Community / critical-access hospitals where we couldn't find a URL anywhere. Those should surface on the site with a "we have not yet located pricing data for this hospital" label, not a hand-pinned URL we can't verify.
- Hospitals where you're guessing the URL pattern. If you can't open the file in a browser and confirm it's real, don't add it.

---

## Adjacent issue: Akamai

If you're curious why Mayo specifically defeats Playwright when other Akamai-protected hospitals don't: Akamai's Bot Manager has tiered defenses. The baseline (JS challenge + cookie handshake) is what Playwright handles natively. Mayo runs an additional layer that fingerprints the browser environment (canvas hash, WebGL renderer, font list) and rejects headless Chromium specifically.

There are paid solutions (residential proxies, real-browser farms, stealth plugins) that work. We deliberately don't use them — see `docs/ACQUISITION_STRATEGY.md` for the legal posture. For Mayo's ~3 facility entries the manual override approach is correct.

---

## Status as of last update

| Hospital | CCN | Status |
|---|---|---|
| Boston Children's Hospital | 223302 | ✅ Verified (hand-pinned from Phase A spike) |
| Mayo Clinic Hospital Rochester | 240010 | ⏳ Pending — see steps above |
