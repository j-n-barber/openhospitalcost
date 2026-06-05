# Data-integrity: duplicate / mis-assigned MRF data

_Audit date: 2026-06-04. Tools: `pipeline/discovery/audit-shared-mrf-urls.js` (URL-based), `pipeline/discovery/audit-duplicate-data.js` (content-fingerprint based)._

## Problem

The CMS-HPT discovery scraper matches hospital names → MRF file links by **fuzzy
name similarity**. This mis-assigns single-facility MRFs to the wrong hospital,
publishing one hospital's prices on another's page. A content fingerprint (md5
of each hospital's full `(procedure, charge_type, amount)` vector) found:

- **256 hospitals across 103 clusters carry byte-identical price vectors** — their
  data is not uniquely theirs.
- Root causes observed: surname collisions (Phelps County MO ↔ Phelps Memorial
  NE; Christiana DE ↔ Christian MO), "Regional/Memorial" collisions, and a large
  **vendor-template batch where independent California hospitals were assigned
  Kaiser Permanente files (EIN 941105628)** — Kaiser's regional `*-medical-center`
  files spread onto Colorado River, Hi-Desert, Mark Twain, NorthBay, St
  Bernardine, etc.

## What was corrected (high-confidence only)

**28 cross-state mis-assignments purged** (`audit-shared-mrf-urls.js
--purge-misassigned`): cases where the URL explicitly names a *different* hospital
in a *different state* (Hialeah FL←Cleveland Clinic OH, MUSC SC←Bon Secours VA,
Ballad VA↔TN cluster, AK hospitals←Providence CA/WA/TX). Surgical delete by
`source_file_id` + URL nulled for re-discovery. 5,732 summary rows removed.
Verified: wrong hospitals cleared, true owners intact.

## Methodology: why fuzzy tokens were rejected for a strict-slug rule

A first attempt classified by fuzzy token overlap ("does the hospital's own URL
name it"). Validation showed it was **not reliable** — errors both directions:
`HONOR HEALTH JOHN C. LINCOLN` (a real HonorHealth hospital) would be wrongly
deleted; Kaiser's city-named files (`san-marcos`, `redwood-city`) coincidentally
matched victim hospitals' city tokens so mis-assignments were wrongly kept.
Geographic tokens are legitimate in many hospital names, so they can be neither
trusted nor blanket-excluded.

The reliable rule used instead (`audit-duplicate-data.js`): within a
content-identical cluster, **REMOVE a hospital only when its URL contains a
DIFFERENT roster hospital's COMPLETE slug** (≥14 alnum chars, ≥2 distinctive
tokens) — positive evidence the file belongs to that named hospital. Guards:
(a) if the URL contains the hospital's own slug → it's self-owned, keep;
(b) disqualify an "owner" candidate whose tokens are all a subset of this
hospital's own name (its parent system, e.g. the generic `cleveland-clinic` slug
inside "Cleveland Clinic Indian River"'s URL — fixed a false positive).
Hospitals with no slug evidence are left UNATTRIBUTED (not deleted) for the EIN
step. This removed **22 additional positive-evidence mis-assignments**
(Wilkes←Sentara, Eastern State←U Kentucky, Providence Alaska←Willamette,
Methodist TX←Fremont NE, …); 58 remain unattributed pending EIN verification.

## Reliable fix (recommended next step)

1. **Populate `hospitals.ein`** (currently null) from CMS / NPPES. The MRF
   filename embeds the publisher EIN (`<EIN>_<facility>_standardcharges`), which
   is an *authoritative* identity — exact, not fuzzy.
2. **Verify each assignment**: a hospital's assigned file EIN must match the
   hospital's EIN (or a known parent-system EIN). Mismatch ⇒ mis-assignment ⇒
   purge + re-discover.
3. **Fix the root cause**: change discovery to match on EIN / exact slug, not
   fuzzy name (see the scope-safe pattern already in `refresh-untried-urls.js`).
4. **Do not resume broad ingest** until discovery matching is fixed — re-running
   would re-create the same mis-assignments for hospitals still holding wrong URLs.

## EIN verification + the reliability ceiling

`verify-attribution.js` populated `hospitals.ein` (was 0) for **1,490** OK_self
hospitals from CMS filename EINs, then used that map to check opaque-URL hospitals
by EIN. Result: 1,630 OK_self, 90 slug-MISASSIGNED, 77 EIN_MISASSIGNED, 2,518
unverifiable.

**Key finding — irreducible ambiguity.** Neither slug nor EIN can fully separate a
legitimate multi-facility system from a mis-assignment, because a system EIN is
shared by sibling facilities whose names don't reveal the system (e.g. EIN
741152597 covers all Memorial Hermann hospitals; Cape Coral Hospital *is* Lee
Health, EIN 992646504). The EIN_MISASSIGNED bucket therefore mixes real
cross-entity errors (Albany←ECU, Hartford←Bridgeport, UH Cleveland←MetroHealth)
with same-system false positives (Memorial Hermann ×5, Mount Carmel ×3, CHI,
Methodist San Antonio). **It is review-only; do not auto-purge it.**

Reliable resolution requires authoritative external data: a curated EIN→system
map (so sibling facilities are recognized) and/or fixing discovery to match each
hospital to its own file at the source. The 50 already purged were the
cross-entity cases that survive this ambiguity (URL names a different *named*
hospital in a different state/system).

## Extraction methodology — verified (2026-06-04)

Separate from attribution: the representative-price aggregation
(`ingest-mrf.js refreshSummaryFromStage`) is sound — a facility-outpatient→
facility→all preference tier, median/min/max within the best tier, $1–$1M junk
filter. Deterministic. Sanity pass: 0 nulls/negatives/bad-types/min>max across
393k rows. The forced `delim=','` change was empirically confirmed **non-regressive**
(8 already-parsed CSVs re-tested: forced-comma columns identical to auto-sniff in
every comparable case). Caveat: ~50% of negotiated prices fall to the blended
"all" basis where no facility-outpatient line exists — exposed via the `basis`
column, a precision (not correctness) limitation.

## Root-cause fix validated at scale (2026-06-04)

Full `scrape-cms-hpt.js --dry-run` over all 1,812 locators (1,439 reachable, no
writes): **3,354 hospitals would be assigned** — 79% by strong evidence
(slug_state 1,485, ein_unique 871, slug_cross 257, ein_slug 42), 699 fuzzy
(overwhelmingly a hospital's own-domain single-facility locator, where fuzzy is
safe). **83 mis-assignments were prevented by the EIN veto** — and they are
exactly the historical failure patterns: HCA HealthONE (Sky Ridge, Rocky
Mountain Children's) under EIN 841321373, a batch of Intermountain Health
facilities under EIN 942854057, St Luke's Miners Campus, and the Kaiser
collision (`santa-rosa-medical-center` rejected, EIN 680045270 ≠ Kaiser
941105628). The no-overwrite guard correctly preserved already-self-correct
assignments. Conclusion: the EIN-gated matcher prevents the duplicate-data bug
automatically; a real discovery run is safe to (re)assign the null-URL backlog.

## Remaining exposure

After the 28-purge, the content audit still flags ~228 hospitals in duplicate
clusters: a mix of (a) legit multi-facility system files (St Elizabeth,
AdventHealth, Providence, Hospital Menonita) where each facility's own URL names
it — acceptable, and (b) genuine mis-assignments needing the EIN verification
above. Re-run `node pipeline/discovery/audit-duplicate-data.js` for the live list.
