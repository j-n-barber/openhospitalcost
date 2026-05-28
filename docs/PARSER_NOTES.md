# MRF Parser Feasibility Notes

**Date:** 2026-05-27
**Status:** Phase A spike complete. Real parser to be built in Phase C.

**Method.** Picked 5 hospitals across format / vendor / size variance. Downloaded each MRF directly via curl (no auth). Probed with DuckDB to find quirks that would break a naive parser. Findings below.

---

## Sample coverage

| # | Hospital | CCN / EIN | Format | Spec ver. | File size | Origin | Acquisition notes |
|---|---|---|---|---|---|---|---|
| 1 | Spencer Municipal Hospital (Iowa CAH) | 426005883 | CSV (wide) | 2.0.0 | 4 MB | Self-hosted | `cms-hpt.txt` → direct .csv. UA-permissive. |
| 2 | Children's Hospital of Philadelphia | 231352166 | CSV (tall) | 3.0.0 | 62 MB | Self-hosted | `cms-hpt.txt` → direct .csv. UA-permissive. |
| 3 | Cleveland Clinic Main Campus | 340714585 | **ZIP → CSV (tall)** | 3.0.0 | 51 MB → 1.5 GB | Panacea-hosted | `cms-hpt.txt` lists a Panacea CDN URL; downloads a ZIP. |
| 4 | HCA Houston Healthcare Medical Center | 821635538 | JSON | 3.0.0 | 607 MB | Azure Blob (SAS-signed) | URL on hospital page includes SAS query token; raw URL returns 409. |
| 5 | Stanford Health Care | 946174066 | JSON | 3.0.0 | 155 MB | Self-hosted | Has UTF-8 BOM. |

**Skipped during spike** (data-acquisition challenges, not parser issues):

- **Mayo Clinic Rochester** — Akamai bot detection on chargemaster page; needs a real browser or signed access. Defer to Phase B browser-driven fetch.
- **Memorial Hermann TMC** — `.ashx` URL returns ASP.NET 500 to direct curl; the source page uses JS to deliver the file. Similar to Mayo.
- **Boston Children's Longwood** — Imperva/Incapsula challenge on the file URL.

---

## The big findings

### 1. The CMS spec is v3.0.0 now, not v2.x

The brief assumed v2.x. Four of five samples are **v3.0.0** (Stanford, HCA, CHOP, Cleveland Clinic). Only Spencer (a small CAH) is still on v2.0.0. The parser must handle both. Schema differences between v2 and v3 are non-trivial — column names diverge, code-pairing structure differs.

### 2. CSV files have a 3-row header preamble

This will trip up every standard CSV parser. The structure is:

- **Row 1**: hospital-level metadata column names (`hospital_name`, `last_updated_on`, `version`, `location_name`, `hospital_address`, `license_number|XX`, ...) **plus the multi-paragraph attestation text as a single column header**.
- **Row 2**: the hospital-level values for row 1's columns.
- **Row 3**: the actual per-item header (`description`, `code|1`, `code|1|type`, ...).
- **Row 4+**: the data.

DuckDB usage that worked: `read_csv(..., skip=2, header=true, all_varchar=true)`.

The attestation text in row 1 is up to ~600 characters and is itself a CSV column header — meaning many parsers will think the file has a malformed schema.

### 3. Wide vs. tall format split

- **Spencer (v2.0.0)** is **wide format**: one row per item, with payer columns inlined like `standard_charge|Medicare|PPO|negotiated_dollar`, `standard_charge|IA Medicaid|PPO|negotiated_dollar`, etc. ~200+ columns. The payer set is encoded in column names.
- **CHOP, Cleveland Clinic, HCA, Stanford (v3.0.0)** are **tall format**: one row per (item × payer), with `payer_name` and `plan_name` columns. Row counts balloon proportionally.

Row counts confirm: Spencer 6K rows wide; CHOP 300K rows tall; **Cleveland Clinic 4.17 M rows tall** for a single hospital.

The parser needs two modes, picked from `version` in row 2.

### 4. CSV files routinely violate CSV-spec strict parsing

DuckDB with `strict_mode=true` (default) failed on 2 of 3 CSV samples:

- **CHOP** dies at line 1942 with `Invalid unicode (byte sequence mismatch)` — the file is not valid UTF-8. We must read with `all_varchar=true` and either `encoding='Latin-1'` or `ignore_errors=true`, then quarantine the dropped rows.
- **Cleveland Clinic** dies at line 31,906 with `Value with unterminated quote` — the source has bare `""` inside quoted strings (e.g., `"SELF-ADHER BAND W>=3"" <5""/YD"`) which violates RFC 4180. Must read with `strict_mode=false`.

Spencer was clean. So clean parsing is the minority case.

### 5. Code-pairing: CDM is always the primary key

In every CSV sample, `code|1` is the hospital's internal **CDM** (chargemaster) code, and `code|2` (and sometimes `code|3`) carries the standardized code (CPT, HCPCS, APR-DRG, MS-DRG, RC). This means **a single CPT can map to many CDM rows** at one hospital. The normalizer must:

- Group price rows by `(hospital_id, standardized_code)`, not by `CDM`.
- Choose a representative row per group (lowest gross? specific setting?), or aggregate.

Example from Spencer for CPT 99213:

| description | code\|1 (CDM) | code\|2 (CPT) | gross | cash |
|---|---|---|---|---|
| Est Patient Level 3 Wound Care | 200078 | 99213 | $225.80 | $169.35 |
| Est Patient Level 3 Low Comp | 9202808 | 99213 | $135.00 | $101.25 |
| Est Patient Level 3 Low Comp | 9980054 | 99213 | $135.00 | $101.25 |

Three CDM rows for CPT 99213, two of them duplicates. Pick the most common / lowest non-niche row as the "price."

### 6. ZIP-compressed MRFs are real

Cleveland Clinic ships a 51 MB ZIP that decompresses to **1.5 GB CSV**. The MRF URL returned `Content-Disposition: attachment; filename=...standardcharges.zip`. The download pipeline needs to:

- Inspect `Content-Type` / `Content-Disposition` before deciding parser.
- Unzip on the fly (DuckDB doesn't read ZIP directly; we need a stream-unzip step).

### 7. JSON files use a top-level metadata object then an array

Both v3 JSON samples start with:

```json
{"hospital_name":"...","last_updated_on":"...","version":"3.0.0","location_name":[...],"hospital_address":[...],"license_information":{...},"type_2_npi":[...],"attestation":{...},"standard_charge_information":[ ...records... ]}
```

Notable:

- **Stanford has a UTF-8 BOM** (`﻿`) at byte 0. `JSON.parse` in Node will throw on this; need to strip BOM before parsing.
- **HCA represents a hospital cluster in one file**: `location_name` is a 5-element array (Medical Center + 4 freestanding ERs), each with its own address. The parser must split records by location, or attach a default location. This breaks the "one MRF = one hospital" assumption in the brief.
- Large JSON files (HCA 607 MB, Stanford 155 MB) cannot be `JSON.parse`'d in memory. We need streaming JSON (e.g., `stream-json` package, or DuckDB's `read_json_auto`).

### 8. Boolean encoding as `"TRUE"`/`"FALSE"` strings

In all CSVs the attestation truth column is the string `TRUE`, not a typed boolean. Normalize during ingest.

### 9. Field naming inconsistencies

- Spencer's column 6 is named `license_number|CA` even though the hospital is in **Iowa** (`license_number = 210037H|IA`). The state suffix on the header doesn't match the state in the value. The header is informational only; trust the value.
- CHOP's NPI column contains **pipe-delimited list of NPIs in one cell** (`1215921457|1134321748|1013627215|1245940600`), not a CSV column per NPI.
- Cleveland Clinic uses `as_of_date` AND `last_updated_on` separately; other hospitals use only one. The parser should prefer `as_of_date` when present.

### 10. Wildly different scales

| Hospital | Rows (after ignore_errors) | Distinct payers |
|---|---|---|
| Spencer | 5,939 | ~20 (in wide column names) |
| CHOP | 300,182 | 44 |
| Cleveland Clinic | 4,173,264 | 62 |

Cleveland Clinic alone has more price records than the entire starter-200 cohort might have if we used Spencer as the average. Estimating storage and `price_records` index sizes requires assuming hospitals scale like Cleveland Clinic, not like Spencer.

---

## Parser design implications

The Phase C parser must, at minimum:

1. **Detect format from URL content-type AND first bytes** (don't trust file extension — see Cleveland Clinic ZIP, Memorial Hermann `.ashx`).
2. **Auto-unzip** when content-type is `application/zip` or `Content-Disposition` filename ends `.zip`.
3. **Strip UTF-8 BOM** before any JSON or CSV parse.
4. **Read CSVs with `skip=2, strict_mode=false, ignore_errors=true, all_varchar=true`** then cast types per column after dropping unusable rows.
5. **Branch on `version` value (row 2 of CSV / top-level of JSON)**: v2.0.0 = wide, v3.0.0 = tall.
6. **Stream JSON parse** for files over ~100 MB. DuckDB `read_json_auto` or `stream-json` package.
7. **Treat `code|1` as CDM** and pull standardized code from `code|2`/`code|3`/`code|4`. Group by standardized code, not CDM, when materializing `procedure_hospital_summary`.
8. **Multi-location MRF detection**: if `location_name` is an array of >1 entries, this file represents a hospital cluster. Either split rows per location at parse time, or treat the hospital_id as a cluster identifier and tag price_records with sub-location.
9. **Emit a quality score** per file: % expected fields populated, presence of negotiated rates, presence of cash price, row count, error-row count. Rubric needs to be defined in Phase B before parser is built.
10. **Quarantine failed rows** to `parse_warnings` in `mrf_files` instead of failing the whole file.

---

## Quality-scoring rubric (sketch — to refine in Phase B)

Per-file score components (sum to 100):

- 20 pts: file is parseable end-to-end (modulo `ignore_errors`)
- 20 pts: `version` is 2.0.0 or 3.0.0 (vs. legacy / unrecognized)
- 15 pts: gross charges present in ≥90% of rows
- 15 pts: discounted cash price present in ≥90% of rows
- 15 pts: ≥3 distinct payers represented
- 10 pts: standardized code (CPT/HCPCS/MS-DRG/APR-DRG) on ≥80% of rows
- 5 pts: `last_updated_on` within the last 12 months

A hospital scoring < 50 should not appear in money pages; only on the hospital landing as "MRF posted but data incomplete — last updated [date]."

---

## Next decisions (Phase B inputs)

- **Approach to bot-blocked sites (Mayo, Memorial Hermann, Boston Children's, etc.):** See [ACQUISITION_STRATEGY.md](ACQUISITION_STRATEGY.md) for the full 4-tier escalation. Short version: Tier 1 polite direct fetch handles ~95%, Tier 2 Playwright on Railway handles the remaining 4–9%, Tier 3 direct outreach handles the long tail, Tier 4 is CMS complaint for truly non-compliant hospitals.
- **JSON streaming library:** `stream-json` for Node, or use DuckDB's `read_json_auto` and treat the parser as SQL-only. DuckDB is faster and already a dependency. Recommendation: DuckDB.
- **Where the SAS token comes from:** HCA's blob URL requires a SAS token that we extracted from the HTML of the hospital's transparency page. The page-scrape → URL-extract → file-fetch pipeline needs to handle this generically. Plan a generic "discover MRF URL" stage that re-runs against each hospital's transparency page weekly to refresh signed URLs.
- **Sample retention:** All five sample files stay in `pipeline/parse/samples/` (gitignored). Re-download via the URLs at the top of this doc if anything is lost.

---

## Re-running this spike

```sh
# (URLs may rotate; check cms-hpt.txt at each host if a download fails)
curl -sL -o pipeline/parse/samples/spencer-hospital_standardcharges.csv \
  "https://www.spencerhospital.org/webres/File/426005883_Spencer-Municipal-Hospital_standard_charges.csv"
# ... see /tmp/mrf_urls.txt from the spike session for the full list

# Probe
.bin/duckdb < /tmp/probe2.sql
```
