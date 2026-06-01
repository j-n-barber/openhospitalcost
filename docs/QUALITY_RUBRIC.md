# MRF Quality-Scoring Rubric

**Status:** Finalized Phase B deliverable. Supersedes the sketch in [PARSER_NOTES.md](PARSER_NOTES.md) § "Quality-scoring rubric".
**Date:** 2026-06-01
**Authoritative implementation:** [pipeline/quality.js](../pipeline/quality.js) — that module is the single source of truth; this doc is its spec. If the two ever disagree, the code wins and this doc is the bug.

---

## Why this exists

The brief's per-hospital ingestion job (PROJECT_BRIEF.md § 5, step 5) says "validate against expected schema; compute quality score." The re-sequenced plan made the rubric an explicit Phase B deliverable *because parsers must emit the metrics it scores* — you can't bolt scoring on after the parser is written without re-reading every file. This doc defines exactly what the Phase C parser emits and how those metrics become decisions.

Two distinct scores, computed at two different stages:

| Score | Scope | Computed | Stored | Drives |
|---|---|---|---|---|
| **File Quality Score (FQS)** | one `mrf_files` row | at parse time | `mrf_files.quality_score` (+ `quality_metrics` JSONB) | starter-200 selection, whether a hospital is creditable at all, trust-signal copy |
| **Procedure Completeness Score (PCS)** | one `(hospital, procedure)` pair | when materializing `procedure_hospital_summary` | the materialized view | per-row money-page eligibility, ranking ("by data completeness, not price") |

---

## Part 1 — File Quality Score (FQS)

### 1.1 The metrics contract (what the parser MUST emit)

Every parse run produces one `FileMetrics` object. All counts use **`rowsParsed` as the denominator** (rows that survived quarantine), not `rowsTotal`. Coverage fields are raw counts; `quality.js` computes ratios.

```
FileMetrics {
  parseStatus:            'ok' | 'partial' | 'failed'   // 'partial' = some rows quarantined
  specVersion:            '3.0.0' | '2.0.0' | string     // raw value from row-2 / JSON top-level
  format:                 'csv-tall' | 'csv-wide' | 'json'
  rowsTotal:              integer   // rows seen before quarantine
  rowsParsed:             integer   // rows that survived
  rowsQuarantined:        integer   // rowsTotal - rowsParsed (dropped to parse_warnings)
  lastUpdatedOn:          ISO date string | null   // prefer `as_of_date`, fall back to `last_updated_on`
  withGross:              integer   // rows with a gross charge
  withDiscountedCash:     integer   // rows with a discounted cash price
  withNegotiated:         integer   // rows with ≥1 payer-specific negotiated dollar OR algorithm/percentage
  withDeidMinMax:         integer   // rows with de-identified min AND max
  withStandardizedCode:   integer   // rows carrying a CPT/HCPCS/MS-DRG/APR-DRG/NDC/RC code (code|2+)
  distinctPayers:         integer   // distinct payer_name values (tall) or payer columns (wide)
  distinctStandardizedCodes: integer
  multiLocation:          boolean   // location_name array length > 1 (HCA-style cluster file)
}
```

> **Where this comes from:** The spike ([PARSER_NOTES.md](PARSER_NOTES.md) § "The big findings") established that v3.0.0 is tall (one row per item × payer) and v2.0.0 is wide (payers inlined in column names). The parser branches on `specVersion`; in wide mode, "rows with negotiated" counts items whose inlined `standard_charge|<payer>|<plan>|negotiated_dollar` columns are populated, and `distinctPayers` is derived from the column names.

### 1.2 Gate (hard fail)

If **any** of these hold, `FQS = 0`, grade `F`, and the hospital is **not** money-page eligible regardless of other signals:

- `parseStatus === 'failed'`
- `rowsParsed === 0`

A gated file still records its metrics so we can see *why* it failed and route it to the [acquisition escalation tiers](ACQUISITION_STRATEGY.md).

### 1.3 Components (sum to 100)

Each component is `weight × min(1, coverage / target)` unless noted — i.e. hitting the target earns full points, partial coverage earns proportional credit, and there's no bonus for exceeding the target.

| # | Component | Weight | Target / rule |
|---|---|---:|---|
| 1 | **Parse integrity** | 20 | `20 × (rowsParsed / rowsTotal)` — penalizes heavy quarantine (CHOP/Cleveland-style dirty CSVs) |
| 2 | **Recognized spec version** | 10 | `3.0.0` → 10 · `2.0.0` → 8 · anything else → 0 |
| 3 | **Standardized-code coverage** | 20 | target 0.80 of `rowsParsed` carry a CPT/HCPCS/DRG/NDC/RC. *Gateway to our procedure dictionary — weighted highest.* |
| 4 | **Discounted cash price coverage** | 15 | target 0.90 |
| 5 | **Payer-negotiated coverage** | 15 | target 0.90 — the differentiator vs. every competitor |
| 6 | **Gross charge coverage** | 10 | target 0.90 |
| 7 | **Payer breadth** | 5 | `distinctPayers` ≥ 5 → 5 · 3–4 → 3 · 1–2 → 1 · 0 → 0 |
| 8 | **Freshness** | 5 | `lastUpdatedOn` ≤ 6mo → 5 · ≤ 12mo → 4 · ≤ 18mo → 2 · older/missing → 0 |

Freshness is measured against the ingest date passed to the scorer (never `Date.now()` inside the module — the caller supplies `asOf` so scores are reproducible on re-run).

### 1.4 Grades & money-page eligibility

| Grade | FQS | Meaning |
|---|---|---|
| A | 85–100 | Complete, current, multi-payer. Lead with it. |
| B | 70–84 | Solid; minor gaps. |
| C | 55–69 | Usable but incomplete — show with caveats. |
| D | 40–54 | Sparse. Hospital landing only. |
| F | < 40 (or gated) | Not creditable. |

**A hospital's money pages render only if the latest file is `eligibleForMoneyPages`:**

```
FQS ≥ 55  AND  standardizedCodeCoverage ≥ 0.50  AND  (withDiscountedCash > 0 OR withNegotiated > 0)
```

Rationale: a money page needs (a) enough trust, (b) enough rows we can actually map to a procedure, and (c) at least one consumer-facing price. Files that miss this still get a hospital landing page with the honest line: *"MRF posted [date], but the published data is incomplete — we can't show reliable prices yet."* (Trust > coverage; never fabricate.)

### 1.5 How FQS feeds starter-200 selection

Phase C selects the starter cohort as **top 50 metros × top ~4 hospitals by volume, filtered by MRF compliance**. "MRF compliance" = `eligibleForMoneyPages` on a freshly parsed file. Selection order within a metro: volume proxy first, then FQS as the tie-breaker, so the cohort skews toward hospitals with genuinely usable data. The 200 are tagged `hospitals.refresh_tier = 1`.

> **Open decision (Phase C, not blocking this rubric):** "volume" has no column yet. `hospitals.beds` is the available proxy; true discharge volume would need an extra CMS/AHA dataset. Default to `beds` unless we ingest discharge data. Tracked in [PARSER_NOTES.md](PARSER_NOTES.md).

---

## Part 2 — Procedure Completeness Score (PCS)

Computed per `(hospital_id, procedure_id)` when materializing `procedure_hospital_summary`, from the `price_records` for that pair plus the parent file's freshness.

| Component | Points | Rule |
|---|---:|---|
| Discounted cash price present | 30 | any `charge_type = 'discounted_cash'` row |
| ≥1 payer-specific negotiated rate | 30 | any `charge_type = 'negotiated'` row |
| Gross charge present | 15 | any `charge_type = 'gross'` row |
| Payer breadth for this procedure | 20 | `min(1, distinctPayers / 5) × 20` |
| File freshness | 5 | 5 if parent file ≤ 12mo, else 0 |

**Per-row money-page rule:** a `(hospital, procedure)` row appears on a procedure money page only if `PCS ≥ 40` — i.e. it carries at least a cash *or* a negotiated price. Gross-only rows are suppressed from price comparisons (a chargemaster sticker price misleads consumers) but may still surface on the hospital's own page.

**Ranking** on a procedure hub / geographic page: `PCS DESC, then representative_price ASC`. This delivers the brief's "ranked by data completeness, not price" while still letting cheaper-among-complete win the tie.

### 2.1 Representative price (resolving the CDM fan-out)

The spike found one CPT maps to many CDM rows ([PARSER_NOTES.md](PARSER_NOTES.md) § 5). When collapsing to one displayed price per `(hospital, procedure, charge_type, payer, plan)`:

1. Group `price_records` by `(hospital_id, procedure_id, charge_type, payer, plan)`.
2. Take the **modal** amount; if no mode, the **median**, then the lower of ties.
3. Never silently average across wildly different CDM line items — store the chosen `source_record` count in the summary so we can show "based on N line items."

---

## Worked example

CHOP (v3.0.0 tall, 300K rows, dies at line 1942 on bad UTF-8 → ~1.9K quarantined, 44 payers, last updated 4 months ago):

| Component | Calc | Pts |
|---|---|---:|
| Parse integrity | 20 × (298100 / 300000) | 19.9 |
| Spec version | 3.0.0 | 10 |
| Std-code coverage | assume 0.95 → min(1, 0.95/0.80)=1 | 20 |
| Cash coverage | assume 0.98 → 1 | 15 |
| Negotiated coverage | assume 0.93 → 1 | 15 |
| Gross coverage | assume 0.99 → 1 | 10 |
| Payer breadth | 44 ≥ 5 | 5 |
| Freshness | 4 months | 5 |
| **FQS** | | **≈ 100 → A** |

Spencer (v2.0.0 wide, clean, ~20 payers, but older file at 14 months):

| Component | Calc | Pts |
|---|---|---:|
| Parse integrity | clean → 20 | 20 |
| Spec version | 2.0.0 | 8 |
| Std-code coverage | assume 0.85 | 20 |
| Cash coverage | assume 0.95 | 15 |
| Negotiated coverage | assume 0.90 | 15 |
| Gross coverage | assume 0.95 | 10 |
| Payer breadth | ~20 ≥ 5 | 5 |
| Freshness | 14 months → ≤18mo | 2 |
| **FQS** | | **95 → A** (the v2.0.0 + stale file cost it 5 pts) |

---

## Change log

- **2026-06-01** — Initial finalized version. Hardened the PARSER_NOTES sketch: split into FQS + PCS, defined the parser metrics contract, set explicit targets/weights, added money-page eligibility predicates and the representative-price rule.
