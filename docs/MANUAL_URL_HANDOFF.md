# Manual MRF URL — Handoff

**Audience:** Jake, ~15-30 minutes of human work total.
**Goal:** Close the last few stubborn marquee hospitals that automation can't reach, and flag the PPS-Exempt Cancer Hospital gap that needs a separate data ingest.

---

## Where we stand

Coverage: **~83% of in-scope hospitals** have MRF URLs auto-discovered.

What's already covered automatically (no manual work needed):
- Mayo Clinic Rochester (CCN 240010)
- Cleveland Clinic + all 11 OH facilities
- Johns Hopkins + all 4 facilities
- Massachusetts General + Brigham & Women's
- Mount Sinai (all 5 NY facilities)
- Stanford, UCSF, UCLA, Penn, Duke, UNC, UVA, Yale-New Haven
- NYU Langone, NewYork-Presbyterian, Cedars-Sinai
- Children's hospitals: CHOP, Boston Children's, Texas Children's, Cincinnati, Nationwide, Lurie, Phoenix Children's, Seattle Children's, CHOA, Children's National DC, Children's LA, Cook Children's, Children's Mercy
- All major systems: HCA regional brands, AdventHealth, CommonSpirit, Providence, Kaiser, Mercy, UPMC, MedStar, Intermountain, Banner, Atrium, Sentara, Inova, BSW, Memorial Hermann, Houston Methodist, Texas Health, Ochsner, UT Southwestern, etc.

This is **better than we initially thought** — the previous version of this doc listed Mayo as "pending"; it's actually covered.

---

## What needs manual work

### Tier 3a: Hand-fetch URLs for specific hospitals our automation can't reach

Currently this list is **empty** — every marquee hospital we wanted is covered automatically.

If a marquee hospital surfaces as uncovered in the future, the pattern to add one is documented at the bottom of this doc.

### Tier 3b: Separate ingest for PPS-Exempt Cancer Hospitals (medium-priority gap)

The following famous cancer centers are **not in CMS's standard Hospital General Information dataset**, so they're not in our roster at all. They're classified as "PPS-Exempt Cancer Hospitals" — a separate CMS regulatory category with only ~11 facilities nationwide.

| Hospital | City | Notes |
|---|---|---|
| Memorial Sloan Kettering | New York, NY | The MSK flagship |
| MD Anderson Cancer Center | Houston, TX | Has working cms-hpt at `mdanderson.org/cms-hpt.txt`; we just can't link it to a CCN |
| Dana-Farber Cancer Institute | Boston, MA | |
| Moffitt Cancer Center | Tampa, FL | |
| Roswell Park Comprehensive Cancer Center | Buffalo, NY | |
| Fox Chase Cancer Center | Philadelphia, PA | |
| City of Hope (Duarte) | Duarte, CA | LA-area flagship (we cover their newer Phoenix facility) |
| USC Norris Comprehensive Cancer Center | Los Angeles, CA | |
| Sylvester Comprehensive Cancer Center | Miami, FL | |
| Seattle Cancer Care Alliance | Seattle, WA | |
| (Karmanos Cancer Center, Detroit) | Detroit, MI | ✅ Already covered — exception |

**To fix:** Build a second hospital ingest source that pulls the [PPS-Exempt Cancer Hospital list from CMS](https://www.cms.gov/medicare/payment/prospective-payment-systems/acute-inpatient-pps/pps-exempt-cancer-hospitals). ~10 rows to add. Each then runs through our normal MRF discovery pipeline.

Effort: ~30 minutes of code, ~10 minutes of data entry. Belongs in next Phase B session, not the hand-fetch flow.

### Tier 3c: Coverage math correction — IHS facilities are exempt

The 45 CFR § 180 federal exemption covers VA, DoD, **and Indian Health Service (IHS) facilities**. Our coverage math currently excludes VA and DoD but not IHS. Two IHS hospitals surface in the "uncovered marquee Acute Care" list (Phoenix Indian Medical Center, Choctaw Health Center, plus other Tribal-owned hospitals). They shouldn't count against our coverage.

Fix: add the IHS / Tribal hospital types to the exclusion filter. Trivial — one line in the coverage queries. Effort: 5 minutes whenever.

---

## The mechanism (when a manual entry is actually needed)

Two files do the work:

- **`pipeline/discovery/manual-mrf-urls.json`** — hand-curated list of overrides. Each entry has `ccn`, `mrf_file_url`, `mrf_format`, and `verified: true|false`.
- **`pipeline/discovery/apply-manual-mrf-urls.js`** — applies the verified entries.

Workflow:
1. Find the URL in a real browser.
2. Edit the JSON — fill in `mrf_file_url`, set `verified: true`.
3. Run:
   ```sh
   # Apply to production
   npm run apply:manual-urls

   # Apply to dev
   DATABASE_URL="$DATABASE_URL_DEV" npm run apply:manual-urls
   ```
4. Commit.

The override skeleton:

```json
{
  "ccn": "XXXXXX",
  "name_hint": "Human-readable name",
  "defense": "What blocks automation (Akamai / Cloudflare Turnstile / geofence / etc.)",
  "source_page": "Hospital's transparency page URL — for re-verification",
  "mrf_file_url": "The direct file URL you copied",
  "mrf_format": "json | csv | zip | xml | ashx",
  "verified": true,
  "added": "YYYY-MM-DD"
}
```

---

## What to NOT put in this file

- Hospitals where automation works (the scraper updates them daily; manual entries would go stale faster than scraped ones).
- Community / critical-access hospitals where we couldn't find a URL anywhere. Those should surface on the site with a "data not yet located" label, not a hand-pinned URL we can't verify.
- Hospitals where you're guessing the URL pattern. If you can't open the file in a browser and confirm it's real, don't add it.
- Cancer centers from the PPS-Exempt list above — those need a separate data ingest, not a single override.

---

## Quarterly re-verification

Once a quarter, walk the override list and confirm each `source_page` URL still leads to the same `mrf_file_url`. If anything rotated, update the entry. With the list currently empty, this is a 5-minute calendar reminder.

---

## TL;DR for this handoff

**You don't actually need to do any URL hand-fetching right now.** The automation got everything important. Two real outstanding items:

1. **(Medium)** Build a small `ingest-pps-exempt-cancer-hospitals.js` to add the ~11 cancer centers from CMS's separate dataset. Mostly affects high-traffic SEO terms ("cost of MD Anderson", "Memorial Sloan Kettering pricing").
2. **(Trivial)** Add the IHS / Tribal type filter to our coverage math so we don't count facilities the federal exemption excludes.

Both fit naturally in the next Phase B session.
