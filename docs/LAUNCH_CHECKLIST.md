# Launch Checklist & SEO Plan

Status as of 2026-06-02. The site is functionally complete (landing, search,
procedures/hospitals/states indexes, dynamic procedure/hospital/state pages,
contact + correction forms, SEO infra) with ~120 money-eligible hospitals and a
growing dataset. This is the path from "built" to "live and getting traffic."

## 1. Legal gates — OWNER: Jake (blocking)

These are the only true blockers and they have long lead times.

- [ ] **AMA / CPT licensing.** We display CPT codes + descriptions at scale. CPT
      is AMA-copyrighted; publishing the code set generally requires a license.
      Confirm status before public launch. (Mitigation if unresolved: show our own
      procedure names + a generic code reference, not AMA descriptors.)
- [ ] **TESS / trademark clearance** for the OpenHospitalCost name.
- [ ] Confirm the site disclaimer (already in the footer) is sufficient — prices
      are informational, not a quote.

## 2. Deploy (Vercel)

- [ ] Import the repo into Vercel; root = `apps/web` (Next.js 16, App Router).
- [ ] Set **environment variables** in the Vercel project (Production + Preview):
  - `DATABASE_URL` (Neon pooled connection string)
  - `RESEND_API_KEY`, `RESEND_FROM` (`OpenHospitalCost <contact@openhospitalcost.com>`),
    `FORM_NOTIFY_TO` (`contact@jnbarber.com`)
- [ ] Point the `openhospitalcost.com` domain at Vercel (DNS) — note this is the
      same domain verified in Resend for sending; adding Vercel A/CNAME records
      won't affect the Resend TXT/DKIM records.
- [ ] Confirm the production build runs the live Neon queries (ISR `revalidate=3600`).
- [ ] Smoke-test the deployed forms end-to-end (submission → DB row → email).

## 3. Storage / cost readiness

- [ ] Neon: at ~120 hospitals the DB is ~255 MB (free tier = 512 MB). Going
      national needs the **Neon Launch plan (~$19/mo)** for storage headroom, OR
      the planned R2 Parquet offload to keep Neon to the current snapshot only.
      Decide before mass-ingesting the full 4,300-hospital pool.
- [ ] R2 lifecycle rule (raw/ 30-day expiry) is set in the Cloudflare dashboard —
      confirm it's active so raw MRFs don't accumulate.

## 4. Analytics & Search Console

- [ ] **Plausible** — add the script to `apps/web/app/layout.tsx` (privacy-friendly,
      no cookie banner needed). Verify events flow before launch.
- [ ] **Google Search Console** — verify the domain, submit `/sitemap.xml`.
- [ ] **Bing Webmaster Tools** — verify + submit sitemap (cheap incremental traffic).
- [ ] Confirm `robots.txt` allows crawling and references the sitemap (already built).
- [ ] `llms.txt` is published (already built) — good for AI-search surfaces.

## 5. Pre-launch QA sweep

- [ ] Spot-check a sample of procedure, hospital, and state pages for correct data
      + provenance citations.
- [ ] Mobile layout pass (the table/list pages, forms, nav).
- [ ] Lighthouse: performance, accessibility, SEO, best-practices on key templates.
- [ ] 404 / notFound behavior for bad slugs/CCNs.
- [ ] JSON-LD validates (Rich Results Test) on procedure (`MedicalProcedure`+`Offer`)
      and hospital (`Hospital`) pages.
- [ ] Favicon + social/OG image + per-page OG tags (currently only `<title>`/description).

## 6. Post-launch

- [ ] Watch Search Console coverage/indexing weekly for the first month.
- [ ] Monitor the snapshot + ingest GitHub Actions; watch the form-submission queue.
- [ ] Grow coverage (more hospitals) in parallel — indexing matures over months.

---

## SEO plan (lightweight)

**Thesis:** the win is long-tail, high-intent queries — "<procedure> cost <city/hospital>".
Each hospital × procedure and procedure × metro is a distinct, low-competition query.

**Target query shapes**
- "{procedure} cost" / "how much does {procedure} cost" → `/procedure/[slug]`
- "{procedure} cost in {state}" → state-scoped procedure view (new template, see below)
- "{hospital} prices / cost of {procedure} at {hospital}" → `/hospital/[ccn]`
- "hospital prices in {state}" → `/state/[state]` (live)

**Highest-leverage new templates (post-launch, as coverage grows)**
1. **Procedure × State** (`/procedure/[slug]/[state]`): "MRI cost in Texas" — huge
   long-tail surface, reuses existing data. Strong internal-linking hub.
2. **Metro/CBSA pages**: we already store `cbsa_code` — "hospital prices in the
   Dallas–Fort Worth metro" captures regional intent.
3. Optional editorial: short explainer per procedure ("what affects the price of
   an MRI") to add unique content + capture informational queries.

**Internal linking**
- Procedure pages → link to the same procedure in nearby states/metros.
- Hospital pages → link to other hospitals in the same state/metro + top procedures.
- State pages → top procedures in that state.
- Index pages (`/procedures`, `/hospitals`, `/states`) are the crawl hubs (done).

**Technical SEO (mostly done)**
- Sitemap, robots, llms.txt, JSON-LD, ISR — all live.
- Add OG/Twitter card images for shareability.
- Keep titles keyword-front-loaded ("{Procedure} cost — compare hospital prices").

**Content cadence**
- Launch with current coverage; expand hospitals weekly.
- Add the Procedure×State template once coverage is broad enough that most
  state pages have ≥3 hospitals per common procedure (avoids thin pages).
