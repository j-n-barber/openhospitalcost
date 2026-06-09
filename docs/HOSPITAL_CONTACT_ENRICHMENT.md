# Hospital contact / website enrichment

**Status:** planned (scoped 2026-06-09). Not yet built.
**Goal:** add a validated **website**, **phone**, and a consumer "next steps" block to each
hospital page — so users can act on a price (call billing, ask for the cash price, request
financial assistance), and so each money page cites the hospital's own official site.

## Why

- **User value (primary).** After "I found a price," the next step is to act. The most useful
  outbound link is the hospital's **billing / financial-assistance / estimate** page (or at
  least homepage + phone) — it ties straight into `/guides/hospital-bill`.
- **SEO (secondary, modest).** Outbound links to authoritative sources are a minor trust/
  relevance signal, not a ranking lever. Where it actually helps is **E-E-A-T**, which matters
  disproportionately here because hospital pricing is **YMYL** (Your Money or Your Life) —
  Google holds health/finance pages to a higher trust bar. Citing the hospital's official site
  + the existing MRF "source file" link reinforces "real, well-sourced data." Keep links
  **followed** (editorial citations we stand behind) with `rel="noopener"`. Treat ranking lift
  as a bonus; real SEO levers stay backlinks + indexing.

## Why NOT derive the website from the MRF URL

The MRF host is the hospital's real domain only ~half the time. Among eligible hospitals the
top hosts are mostly **vendors / blob storage / link wrappers**: `apps.para-hcfs.com` (223),
`*.blob.core.windows.net` (300+), `hyvehealthcare.com`, `craneware.com`, `elevatepfs.com`,
`claraprice.net`, `widen.net`, `azureedge.net`, even `urldefense.com` (a Proofpoint wrapper).
Linking "Visit hospital website" to those is worse than no link. The MRF URL is provenance,
not a hospital homepage.

## Why NOT Playwright as the primary resolver

Playwright is slow (~browser per hospital), fragile (bot defenses), and — crucially — doesn't
*find* a URL; you'd still need a search/lookup step to know where to navigate. Structured
authoritative data resolves the website faster and more accurately. Reserve Playwright for the
last-mile validator on the few JS-heavy/bot-protected candidate sites (reuse the Tier-2
infra in `docs/ACQUISITION_STRATEGY.md`).

## Recommended approach — accuracy-first, tiered

We already have the join keys: `ccn`, `npi`, `ein`, `name`/`dba_name`, full address, lat/lng.

**Tier 1 — CMS Hospital General Information (free, exact, no scraping).**
Dataset `xubh-q36u` (data.cms.gov/provider-data), keyed by Facility ID = our `ccn`. Gives the
**canonical facility name + address + phone**. Use it to (a) populate `phone`, and (b)
cross-check our `name` against CMS's official name (a free name-validation pass — exactly the
"review the actual hospital name" idea, done by authoritative join rather than scraping).
Does **not** include a website.

**Tier 2 — website resolution (authoritative business data).**
- **Wikidata SPARQL** (free): query for hospitals by name/locality, take `official website`
  (P856). Good coverage for larger/named hospitals, sparse for small ones. Run first as a
  free pass.
- **Google Places API** (paid, ~$17/1k; ~$100–200 one-time for the full roster): Find Place by
  `name + address` → returns verified **website + phone + canonical name** in one call. Highest
  accuracy and the cleanest single source. Use for whatever Wikidata didn't resolve.

**Tier 3 — validation gate (accuracy over coverage).**
For each candidate website, require the source's returned name to match our `name`/`dba_name`
by string similarity (trigram) above a threshold; reject and log mismatches. Store the resolved
domain only when confident. Same posture as the EIN-gated MRF matcher — a wrong link is worse
than no link. Record `website_source` and a confidence so we can audit.

**Tier 4 — liveness check (cheap, then Playwright only if needed).**
A plain HTTP GET on the candidate URL: confirm 200 + the page `<title>`/`<h1>` contains the
hospital/health name. Only escalate to Playwright for JS-heavy or challenge-protected sites.

## Schema (new migration)

```sql
ALTER TABLE hospitals
  ADD COLUMN phone               text,
  ADD COLUMN website             text,
  ADD COLUMN website_source      text,   -- 'wikidata' | 'google_places' | 'manual'
  ADD COLUMN contact_verified_at timestamptz;
```

## UI — "Next steps" block on the hospital page

Render below the price table (only when we have validated data):

- **Call billing:** `{phone}` (from CMS) — ask for the cash/self-pay price in writing.
- **Visit the hospital site:** `{website}` → (followed link, `rel="noopener"`), ideally deep-
  linked to billing/financial-assistance if we capture it.
- **Lower your bill:** link `/guides/hospital-bill`.

This doubles as the YMYL trust signal: official-source citation + genuinely helpful next steps.

## Effort & cost

- Pipeline: Tier 1 loader (CMS CSV → phone/name) ~½ day; Tier 2 resolver (Wikidata then Places)
  + Tier 3 validation ~1 day; UI block ~½ day. **~2 days total.**
- Cost: CMS + Wikidata free; Google Places one-time ~$100–200 for the full roster (less if
  Wikidata covers the big ones first). Within budget.

## Refresh

Links rot. Re-validate `website`/`phone` on a slow cadence (e.g. quarterly) via the same
liveness check; flag dead links for re-resolution. Fold into the existing ingest cron or a
small separate job.
