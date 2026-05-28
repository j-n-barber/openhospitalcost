# TESS Trademark Search — OpenHospitalCost

**Why.** Per PROJECT_BRIEF.md Section 10, clear OpenHospitalCost in USPTO Classes 35, 42, and 44 before any commercial / branded launch. Domain registration does not require clearance, but going public with branded materials does.

**When.** Originally Phase A "before launch." Run and resolved 2026-05-28: see Results / Disposition sections below.

**Effort:** ~30 minutes of clicking. No login required.

---

## 2026-05-27 pre-screen findings (informal WebSearch, not USPTO)

Run before formal TESS to flag candidates worth particular attention during the searches.

### Active brand to investigate

- **HospitalCost.com** — operational consumer hospital-price-transparency site, 84 hospitals across VA + NC, identical product positioning to OpenHospitalCost. Small competitive footprint today but explicit expansion intent ("More states are coming"). **TESS priority: high but not urgent.** Specifically search the mark "HospitalCost" in Classes 35 and 42. The "Open" prefix likely provides trademark distinction even if HospitalCost is registered (cf. OpenTable / Table, OpenAI / AI, OpenSea / Sea coexistence patterns), but confirm via search.
- **Open Hospital (open-hospital.org)** — open-source EMR/HIMS software, Italian-led, GPL. Different product space but shares the "Open Hospital" prefix. TESS-search the mark "Open Hospital" in Classes 9, 35, 42.

### Decision pending TESS

If "HospitalCost" is a live registered USPTO mark in our classes, three options:

1. **Coexistence** — "Open" prefix is a meaningful trademark distinguisher (cf. Anthropic vs. Anthropic Industries, Open Table vs. Table, etc.). Defensible if HospitalCost's registration is narrow.
2. **Rename** — candidate alternatives: OpenHospitalPrice, OpenMedPrice, OpenCarePrice, PriceClear (if available), HospitalPrice.io.
3. **Coexistence with formal opinion** — request a trademark attorney's clearance opinion ($1.5K–3K). Defensible legal posture if HospitalCost ever challenges us.

---

## How to run the searches

USPTO retired the classic TESS interface in 2023; use the current **TM Search** tool at https://tmsearch.uspto.gov/search/search-information.

### Setup (do once)

1. Open https://tmsearch.uspto.gov/search/search-information
2. Click **Basic Search** in the left nav (avoid the "Expert Search" mode — overkill for our purposes).
3. The "Status" filter defaults to "Live"; for a thorough sweep, also run each search with status set to "All" so you catch dead marks (history matters for clearance).

### Searches to run

Run each row below as one search. Paste the **Search term** verbatim into the search field, set the **Field** if specified, and skim every result. Anything in our classes (35, 42, 44) gets recorded in the tables further down.

| # | Search term | Field | Why |
|---|---|---|---|
| 1 | `OpenHospitalCost` | Word mark | Exact mark check. |
| 2 | `open hospital cost` | Word mark | Spaced variant — TM Search treats spaces as token separators, so this is genuinely different from #1. |
| 3 | `openhospital` | Word mark | Catches `OpenHospital`, `OpenHospitals`, `OpenHospital.io` etc. |
| 4 | `hospitalcost` | Word mark | Catches `HospitalCost`, `HospitalCosts`, etc. |
| 5 | `hospital cost transparency` | Word mark | Adjacent-concept marks in the same space. |
| 6 | `hospital price transparency` | Word mark | Same. |
| 7 | `open price` AND `hospital` | Word mark, Boolean | Naming-family probe. |

For each result you find in Classes 35, 42, or 44, click into the **Mark Detail** page and capture: mark, status (Live / Dead / Pending), owner, classes, registration date, and a one-line note on whether it's a real concern.

---

## Results — 2026-05-28

Jake ran all 7 searches at https://tmsearch.uspto.gov/ across statuses Live + All. The sweep came back clean in our three classes with one adjacent mark worth noting.

### Class 35 (advertising / business services — covers ad-supported content sites)

| Mark | Status | Owner | Notes |
|---|---|---|---|
| Hospital Price Index | live (per Jake's sweep) | — | Adjacent mark; closest hit. Almost certainly the B2B aggregator at hospitalpriceindex.com — we encountered them during the parser spike hosting UCHealth Yampa Valley's MRF. Different audience (B2B platform vs. our consumer site) and different mark structure ("Index" vs. "Cost"). Coexistence highly defensible. |

### Class 42 (software / SaaS — covers the technical product)

| Mark | Status | Owner | Notes |
|---|---|---|---|
| _no hits_ | | | |

### Class 44 (medical services — we don't provide care, but adjacent marks could still create friction)

| Mark | Status | Owner | Notes |
|---|---|---|---|
| _no hits_ | | | |

---

## Disposition

- [x] **Clear** — no conflicting live marks on "OpenHospitalCost" or substantially similar wordmarks in our three classes. Hospital Price Index is the only adjacent mark and is compositionally distinct ("Index" vs. "Cost") and operates in a different audience (B2B aggregator vs. consumer site).

Proceed with branded launch under the "OpenHospitalCost" name. No rename required.

### Conflicts

None active. HospitalCost.com (regional consumer site, 84 hospitals VA+NC) was not found as a registered USPTO mark in this sweep. Worth re-checking before launch if their expansion intent ("more states coming") materializes.

---

## Filing decision

**Status:** Deferred 2026-05-28. Three options on the table:

1. **DIY ITU filing on Class 35 wordmark "OpenHospitalCost" via USPTO TEAS Plus** (~$350, ~1 hour). Locks priority date now; revisit Class 42 when the API tier ships.
2. **Bundle with the Phase B AMA/CPT legal consult.** Lawyer reviews and files; ~$500–1500 incremental cost.
3. **Defer registration to post-launch.** Common-law trademark rights start with use in commerce. Cheapest, exposes us to copycats filing first if we get attention.

To revisit: see [PROJECT_BRIEF.md Decisions Log](PROJECT_BRIEF.md#9-decisions-log).

---

## Reference

- Original brand decision rationale: PROJECT_BRIEF.md Section 9.
- Defensive TLDs (.org, .health) deferred per brief; revisit only if a copycat appears.
- Cost reminder: TM Search is free. Filing a trademark application is ~$350/class — defer until launch revenue justifies it.
