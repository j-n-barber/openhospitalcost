# OpenHospitalCost — Project Brief

**Project name:** OpenHospitalCost
**Domain:** openhospitalcost.com
**Version:** v1.1
**Owner:** Jake Barber
**Purpose:** Self-contained reference document for project scaffolding and development handoff to Claude Code.

---

## 1. Project Overview

**What we're building.** A national consumer-facing hospital price transparency site. Static-generated pages, one URL per procedure-at-hospital, optimized for organic SEO and AI citation.

**Audience.** Cash-pay patients, high-deductible plan members, and anyone trying to understand healthcare costs before committing to a procedure.

**Revenue model.** Display ads (Raptive once past 50K monthly sessions), with affiliate revenue (telehealth, insurance, prescription) as a secondary layer. Year-3 realistic target: $300K–1.5M.

**Constraints.** Low overhead, automatable, traffic-first, single operator.

**Strategic differentiation:**

The core wedge: **actual hospital prices from federally mandated public filings, not aggregate estimates.** Every existing consumer competitor (NewChoiceHealth, GoodRx, CareCostIndex, Sidecar Health, Healthcare Bluebook consumer surface) publishes ranges and modeled averages. OpenHospitalCost publishes per-hospital prices cited back to the specific MRF and date.

Supporting differentiators:

- Modern static-site execution (Next.js + ISR on Vercel) vs. NewChoiceHealth's WordPress baseline.
- Source-cited data with visible "Sourced from [hospital]'s MRF posted [date]" on every page.
- Cash-pay audience focus rather than insured in-network comparison.
- Deep procedure-level pages with rich JSON-LD designed for AI citation.
- Historical price snapshots ("↑23% since Jan 2024") — a feature no current competitor publishes.

**Strategic thesis.** In an AI-mediated search world, the sites that win are structured factual data sources AI tools cannot fabricate and must cite. Hospital pricing fits: federally mandated public data, technically standardized via CMS MRF schema, practically inaccessible to consumers because files are gigabytes of unparseable JSON. The moat is normalization and presentation, not data acquisition.

---

## 2. Stack — Locked Decisions

| Layer | Choice | Reasoning |
|---|---|---|
| Hosting | Vercel | ISR support is critical at 200K+ page scale |
| Framework | Next.js (App Router) with ISR | Pure Vite hits build walls at this page count; ISR enables top-N pre-build + long-tail on-demand |
| Database | Neon Postgres | Serverless, scale-to-zero, branching for ingestion experiments |
| Object storage | Cloudflare R2 | No egress fees; cheaper than S3 for moving GBs of MRFs |
| Batch processing | DuckDB | Embedded analytical engine in GitHub Actions; no Spark/Airflow |
| Search (v1) | Static MiniSearch index | Pre-built JSON shipped to client; no Algolia subscription |
| CI / Cron | GitHub Actions | Free for public repo; handles cron, ingestion, deploys |
| Analytics | Plausible + Google Search Console | Privacy-friendly, lightweight |
| Geocoding | Census Geocoder (free) | Mapbox as fallback |

**Explicitly deferred:** Pinecone (vector search), Algolia/Typesense (hosted search), Supabase (auth/realtime not needed yet). Re-evaluate at year 2.

---

## 3. URL Structure

```
/procedure/{procedure-slug}/
  → Procedure hub, national. SEO target: "{procedure} cost"

/procedure/{procedure-slug}/{state}/{city}/
  → Geographic procedure page. SEO target: "{procedure} cost {city}"

/procedure/{procedure-slug}/at/{state}/{city}/{hospital-slug}/
  → Money page. One URL per procedure-at-hospital.
    SEO target: "{procedure} cost at {hospital}"

/hospital/{state}/{city}/{hospital-slug}/
  → Hospital landing. SEO target: "{hospital} prices"

/compare/{procedure-slug}/{state}/{city}/
  → Comparison page across hospitals in a city.
    SEO target: "best {procedure} prices {city}"
```

**Examples:**

- `/procedure/knee-mri/`
- `/procedure/knee-mri/wi/madison/`
- `/procedure/knee-mri/at/wi/madison/uw-health-university-hospital/`
- `/hospital/wi/madison/uw-health-university-hospital/`
- `/compare/knee-mri/wi/madison/`

**Rules:**

- State postal codes lowercased.
- City slugs hyphenated.
- Hospital slugs derived from legal name via stable transformation; never expose CCN in URLs.
- CCN as canonical internal identifier (survives ownership transfers via redirect table).
- 301 redirects from day one for hospital renames and slug changes.

---

## 4. Schema (PostgreSQL DDL)

```sql
-- Reference data --------------------------------------------------------

CREATE TABLE hospital_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_system_id UUID REFERENCES hospital_systems(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ccn TEXT NOT NULL UNIQUE,              -- CMS Certification Number
  npi TEXT,
  ein TEXT,
  name TEXT NOT NULL,
  dba_name TEXT,
  slug TEXT NOT NULL,
  system_id UUID REFERENCES hospital_systems(id),
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state CHAR(2) NOT NULL,
  zip TEXT,
  county TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  hospital_type TEXT,                    -- general/specialty/critical_access
  ownership TEXT,                        -- nonprofit/forprofit/government
  beds INTEGER,
  teaching_status BOOLEAN,
  mrf_root_url TEXT,                     -- root-locator JSON URL
  mrf_file_url TEXT,                     -- current MRF file URL
  mrf_format TEXT,                       -- json/csv/xml
  last_mrf_check_at TIMESTAMPTZ,
  last_mrf_update_at TIMESTAMPTZ,
  last_mrf_hash TEXT,
  refresh_tier SMALLINT NOT NULL DEFAULT 3,  -- 1=top200, 2=middle2000, 3=longtail
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hospitals_state_city ON hospitals(state, city);
CREATE INDEX idx_hospitals_slug ON hospitals(slug);
CREATE INDEX idx_hospitals_refresh_tier ON hospitals(refresh_tier);

CREATE TABLE procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  code_type TEXT NOT NULL,               -- CPT, HCPCS, MS-DRG, APC, custom
  name TEXT NOT NULL,                    -- our plain-English name (no AMA text)
  slug TEXT NOT NULL UNIQUE,
  description TEXT,                      -- our own writing
  category TEXT,                         -- imaging, surgery, lab, etc.
  shoppable_service BOOLEAN NOT NULL DEFAULT false,
  search_priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(code, code_type)
);

CREATE INDEX idx_procedures_slug ON procedures(slug);
CREATE INDEX idx_procedures_shoppable ON procedures(shoppable_service) WHERE shoppable_service = true;

CREATE TABLE procedure_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  source TEXT,                           -- consumer_search, medical_synonym, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_procedure_aliases_alias ON procedure_aliases(lower(alias));

-- Operational tables ----------------------------------------------------

CREATE TABLE mrf_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  url TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  file_size_bytes BIGINT,
  fetched_at TIMESTAMPTZ NOT NULL,
  parsed_at TIMESTAMPTZ,
  status TEXT NOT NULL,                  -- fetched, parsing, parsed, failed
  error TEXT,
  record_count INTEGER,
  parse_warnings JSONB
);

CREATE INDEX idx_mrf_files_hospital ON mrf_files(hospital_id, fetched_at DESC);
CREATE INDEX idx_mrf_files_hash ON mrf_files(file_hash);

CREATE TABLE ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL,                  -- running, completed, failed
  run_type TEXT NOT NULL,                -- root_poll, scheduled_refresh, event_driven, manual
  stats JSONB
);

-- Price data (append-only) ----------------------------------------------

CREATE TABLE price_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  procedure_id UUID NOT NULL REFERENCES procedures(id),
  charge_type TEXT NOT NULL,             -- gross, discounted_cash, payer_specific_negotiated,
                                         -- min_negotiated, max_negotiated, estimated_allowed
  payer TEXT,
  plan TEXT,
  amount NUMERIC(12,2) NOT NULL,
  methodology TEXT,                      -- per_unit, percentage, fee_schedule, case_rate
  modifiers TEXT,
  billing_class TEXT,                    -- inpatient, outpatient, professional
  source_file_id UUID NOT NULL REFERENCES mrf_files(id),
  observed_at TIMESTAMPTZ NOT NULL,
  effective_date DATE,
  raw_record JSONB                       -- original record for audit
);

CREATE INDEX idx_price_records_lookup
  ON price_records(hospital_id, procedure_id, charge_type, observed_at DESC);
CREATE INDEX idx_price_records_procedure
  ON price_records(procedure_id, observed_at DESC);
CREATE INDEX idx_price_records_source ON price_records(source_file_id);

-- Materialized current view (refreshed post-ingest) ---------------------

CREATE MATERIALIZED VIEW procedure_hospital_summary AS
SELECT DISTINCT ON (hospital_id, procedure_id, charge_type)
  hospital_id,
  procedure_id,
  charge_type,
  amount,
  payer,
  plan,
  source_file_id,
  observed_at
FROM price_records
ORDER BY hospital_id, procedure_id, charge_type, observed_at DESC;

CREATE UNIQUE INDEX idx_pohs_unique
  ON procedure_hospital_summary(hospital_id, procedure_id, charge_type);

-- User corrections ------------------------------------------------------

CREATE TABLE user_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id),
  procedure_id UUID REFERENCES procedures(id),
  reporter_email TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

-- URL redirects (hospital renames, slug changes) ------------------------

CREATE TABLE url_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path TEXT NOT NULL UNIQUE,
  to_path TEXT NOT NULL,
  status_code SMALLINT NOT NULL DEFAULT 301,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Notes:**

- `price_records` is append-only. Every ingestion inserts new rows tagged with `observed_at` and `source_file_id`. Never updated in place.
- `procedure_hospital_summary` is the materialized current view. Refreshed after every ingestion run. The build process reads from this, never from `price_records` directly.
- History queries (for sparklines, deltas) hit `price_records` across a date range.
- Provenance flows through `source_file_id → mrf_files`, which powers the "last updated" trust signal on every page.

---

## 5. Pipeline Architecture

### Cron patterns

**Daily light poll (all ~5,000 hospitals)**

- Read each hospital's root-locator JSON.
- Compare attestation timestamp + file hash against `hospitals.last_mrf_hash`.
- If changed, enqueue that hospital for re-ingest.
- Update `hospitals.last_mrf_check_at`.
- Cost: ~5K HEAD/GET requests/day. Well within GitHub Actions free tier.

**Tiered heavy re-ingest (safety net)**

- Weekly: all `refresh_tier = 1` hospitals (top 200).
- Monthly: all `refresh_tier = 2` hospitals (middle 2,000).
- Quarterly: all `refresh_tier = 3` hospitals (long tail).
- Forces re-download and re-parse regardless of change-detection signal.
- Catches hospitals that don't update root-locator timestamps reliably.

**Event-driven**

- CMS enforcement action announcements (scheduled scrape of CMS press releases + admin endpoint for manual triggers).
- User correction form submissions (review-then-ingest workflow).

### Per-hospital ingestion job

1. Download MRF from `mrf_file_url` to R2.
2. Compute hash; compare to last known.
3. If unchanged, mark and exit.
4. Parse with DuckDB. Handle CMS Template v2.x, legacy JSON, CSV formats.
5. Validate against expected schema; compute quality score (% expected fields populated, presence of negotiated rates, presence of cash price).
6. Insert new rows into `price_records` with `observed_at = now()`.
7. Update `mrf_files` row with parsed status.
8. Refresh `procedure_hospital_summary` materialized view.
9. Write Parquet snapshot to R2 for historical archive.
10. Mark raw MRF for deletion 30 days out.

### Retention

- Raw MRFs: delete from R2 after 30 days (redownloadable from source).
- Parquet snapshots: monthly forever, weekly for past 12 months.
- `price_records`: append-only, never deleted.
- `mrf_files`, `ingestion_runs`: keep forever (small).
- Failed parse logs: 90 days.

---

## 6. Page Structure & SEO

**JSON-LD on every page:**

- Hospital pages: `MedicalOrganization`.
- Procedure pages: `MedicalProcedure`.
- Money pages: `Offer` with `priceCurrency`, `validFrom`, `validThrough`, `seller`.
- Historical observations: multiple `Offer` entries with their own validity windows.
- Breadcrumbs: `BreadcrumbList`.

**Visible trust signals on every money page:**

- "Sourced from [hospital]'s MRF posted [date], ingested [date]."
- Price history sparkline + delta language ("↑23% since Jan 2024").
- Link to methodology page in global footer.

**AI citation surface:**

- `llms.txt` at root indexing key URLs and data philosophy.
- Stable canonical URLs, no trailing-slash inconsistency.
- URL contract documented at `/about/`.
- Open data export endpoint (`/data/hospital/{ccn}.json`) for citation.

**Internal linking:**

- Procedure page → top-10 hospitals offering it (ranked by data completeness, not price).
- Hospital page → top 20 procedures at that hospital.
- City comparison page → individual hospital money pages.
- State hub → city pages.
- Manually curated "related procedures" links (category trees).

**Sitemaps:**

- Multiple sitemaps under 50K URLs each.
- `sitemap-procedures.xml`, `sitemap-hospitals.xml`, `sitemap-money-pages-{n}.xml`.
- `sitemap_index.xml` at root, submitted to GSC and Bing.

---

## 7. 60-Day Plan

### Weeks 1–2: Foundation

- Provision R2, Neon, Vercel, GitHub.
- Run schema migrations on Neon.
- Build hospital roster ingestion: CMS Hospital General Info + AHA list + NPPES, geocode via Census.
- Build root-locator discovery scraper.
- Select starter 200 hospitals (top 50 metros × top ~4 hospitals each by volume, with MRF compliance check).
- **Deliverable:** `hospitals` table populated, root URLs identified, 200 starter cohort tagged `refresh_tier = 1`.

### Weeks 3–4: Ingestion

- DuckDB MRF parser handling CMS Template v2.x, legacy JSON, CSV.
- Procedure dictionary: 100 procedures with plain-English names, slugs, aliases (70 CMS shoppable + 30 high-volume by keyword research).
- Normalize → `price_records`.
- Quality scoring per file.
- End-to-end run against 200 hospitals; validate output with CMS MRF validator.
- **Deliverable:** 200 hospitals fully ingested, `procedure_hospital_summary` materialized.

### Weeks 5–6: Site Build

- Next.js App Router scaffold.
- Page templates: procedure hub, geographic procedure, money page, hospital landing, city comparison.
- JSON-LD generation utilities.
- Static search index build script.
- Sitemaps, robots.txt, llms.txt, canonical URL handling.
- Design: minimal, fast, mobile-first. Data is the product, not the interface.
- **Deliverable:** Vercel preview rendering ~20K pages from real data.

### Weeks 7–8: Launch + Instrument

- Production deploy.
- Submit sitemaps to GSC and Bing Webmaster Tools.
- Wire Plausible + ops dashboard.
- Build user correction form.
- Cron schedule live on GitHub Actions (daily poll + weekly tier-1 refresh as starting cadence).
- Begin SEO observation; iterate on title tags, schema, internal linking.
- Plan expansion to hospitals 201–1,000.
- **Deliverable:** Live site at custom domain, automated ingestion, monitoring in place.

---

## 8. Repo Structure

```
openhospitalcost/
├── apps/
│   └── web/                          # Next.js App Router site
│       ├── app/
│       │   ├── procedure/[slug]/
│       │   │   ├── page.tsx
│       │   │   ├── [state]/[city]/page.tsx
│       │   │   └── at/[state]/[city]/[hospital]/page.tsx
│       │   ├── hospital/[state]/[city]/[slug]/page.tsx
│       │   ├── compare/[procedure]/[state]/[city]/page.tsx
│       │   ├── about/page.tsx
│       │   ├── methodology/page.tsx
│       │   ├── sitemap.ts
│       │   ├── robots.ts
│       │   └── api/
│       │       ├── corrections/route.ts
│       │       └── data/hospital/[ccn]/route.ts
│       ├── lib/
│       │   ├── db.ts                 # Neon client
│       │   ├── jsonld.ts             # structured data helpers
│       │   └── search-index.ts       # MiniSearch builder
│       ├── components/
│       └── public/
│           ├── llms.txt
│           └── search-index.json     # generated at build time
├── pipeline/                         # ingestion code
│   ├── discovery/                    # root-locator scraper
│   ├── fetch/                        # MRF downloader
│   ├── parse/                        # DuckDB parsers per format
│   ├── normalize/                    # → price_records inserts
│   ├── quality/                      # scoring
│   ├── retention/                    # cleanup jobs
│   └── snapshots/                    # Parquet archive writer
├── db/
│   ├── migrations/                   # Neon schema migrations
│   └── seeds/                        # procedure dictionary, starter hospitals
├── data/
│   └── procedures.json               # canonical procedure dictionary
├── .github/
│   └── workflows/
│       ├── daily-poll.yml
│       ├── weekly-refresh-tier1.yml
│       ├── monthly-refresh-tier2.yml
│       ├── quarterly-refresh-tier3.yml
│       ├── ci.yml
│       └── deploy.yml
└── docs/
    ├── PROJECT_BRIEF.md              # this file
    ├── SCHEMA.md
    ├── PIPELINE.md
    └── DECISIONS.md
```

---

## 9. Decisions Log

**Locked:**

- **Project name: OpenHospitalCost.** Domain registered through Vercel. Selected for: alignment with "open data / federally mandated public filings" positioning; strong AI-citation resonance ("Open" carries authoritative data-source associations); future expansion optionality (OpenASCCost, OpenClinicCost as parent-brand extensions); semantic distance from CareCostIndex (estimates aggregator) and HealthCost.com (defunct marketplace). Defensive TLDs (`.org`, `.health`) deferred — backfill if a copycat emerges.
- Stack: Next.js App Router + Vercel + Neon Postgres + Cloudflare R2 + DuckDB + GitHub Actions.
- URL pattern: `/procedure/{slug}/at/{state}/{city}/{hospital}/` for money pages.
- Append-only `price_records` with `procedure_hospital_summary` materialized current view.
- Daily root-locator polling (all hospitals) + tiered safety-net re-ingest (weekly/monthly/quarterly) + event-driven triggers.
- Retention: raw MRFs 30 days, Parquet snapshots monthly forever and weekly for 12 months, `price_records` indefinite.
- Starter cohort: 200 hospitals × 100 procedures = ~20K core pages, expandable.
- Procedure list: 70 CMS shoppable services + 30 high-search-volume CPT codes (curated with our own plain-English descriptions).
- Static MiniSearch index for v1 search; defer Algolia/Pinecone.
- Source-cited "last updated" timestamps on every page.
- Price history sparkline + delta widget on money pages from v1.

**Updated competitive landscape (additions to reference doc):**

- **CareCostIndex.com** — active consumer site (last update April 16, 2026), multi-language, multi-vertical (procedures, elder care, therapy, birth, country pages), AdSense-monetized. Aggregates estimates from CMS, FAIR Health, Genworth, NHS, OECD, WHO. *Not* MRF-cited per hospital. Sharpens OpenHospitalCost's positioning rather than competing on identical product.
- **HealthCost.com** — appears dormant per Crunchbase ("permanently closed"), though LinkedIn page remains active. Originally a transparent-marketplace pitch. Relevant for trademark adjacency only.

**Cost ceiling:** infra under $50/month during build, under $250/month at revenue scale.

---

## 10. Open / Parallel Tracks

Not blocking development; pursue alongside scaffolding:

- **Legal consult on AMA/CPT description boundary.** Commission before week 4. Use CPT codes as identifiers (well-established); write our own plain-English procedure descriptions; never reproduce AMA's official long-form text. Draft the description style guide before the lawyer responds so the consult is just confirmation.
- **TESS clearance on OpenHospitalCost.** Run search in USPTO Classes 35, 42, and 44 before deploying any branded materials. Domain registration itself does not require this, but commercial use should not begin until clearance is confirmed.
- **Brand voice.** Editorial, plain-spoken, data-forward. Mission posture: "We publish the actual prices hospitals are required to disclose." Avoid marketing-speak; the data and provenance are the brand. Logo: wordmark only for v1, defer professional design.
- **Editorial voice for procedure descriptions.** Plain, factual, consumer-readable. Avoid medical jargon. Reference style guide as it develops.
- **Privacy policy + terms of service.** Template-based for v1 (Termly or similar). Lawyer review at revenue threshold.
- **Future B2B / API tier.** The data we're building has B2B value (hospital comparison tools, employer benefits platforms, journalist queries). Architecture supports this — `price_records` is already structured for export — but defer productization until consumer site has traction.

---

## 11. Reference Data Sources

- **CMS Hospital General Information** (data.cms.gov) — hospital roster, CCN, type, ownership.
- **AHA Annual Survey** — bed count, teaching status (paid; alternative: cms.gov Provider of Services file).
- **NPPES NPI Registry** — NPI lookup.
- **Census Geocoder** — free address-to-coordinate (Mapbox as fallback).
- **CMS Hospital Price Transparency repo** (github.com/CMSgov/hospital-price-transparency) — schema, validator.
- **Turquoise research datasets** — baseline data for QA (non-commercial license; do not republish directly).
- **Dolthub Price Transparency project** — community baseline data for QA.
- **Patient Rights Advocate compliance reports** — for monitoring hospitals with known compliance issues.
