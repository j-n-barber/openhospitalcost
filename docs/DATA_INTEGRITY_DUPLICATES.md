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

## Remaining exposure

After the 28-purge, the content audit still flags ~228 hospitals in duplicate
clusters: a mix of (a) legit multi-facility system files (St Elizabeth,
AdventHealth, Providence, Hospital Menonita) where each facility's own URL names
it — acceptable, and (b) genuine mis-assignments needing the EIN verification
above. Re-run `node pipeline/discovery/audit-duplicate-data.js` for the live list.
