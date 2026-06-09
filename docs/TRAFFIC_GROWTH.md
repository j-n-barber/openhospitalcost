# Traffic Growth Plan

**Status:** Active — drafted 2026-06-09, during the AdSense review wait.
**Goal of this doc:** a ruthlessly ROI-ranked checklist for getting from ~0 organic
traffic to a compounding stream, for a solo operator with limited hours.

---

## The situation (be honest about it)

- **Inventory:** ~2,290 indexable hospital pages + 159 procedures + 53 states +
  state reports ≈ **2,500+ programmatic pages**, all technically sound — canonical
  tags, `MedicalProcedure`/`Hospital`/`BreadcrumbList` JSON-LD, a fully crawlable
  internal-link graph, thin-page `noindex` guard, dynamic sitemap with `lastmod`.
  (Verified 2026-06-09. The leaf pages are not the problem.)
- **Age:** site went live 2026-06-03. **~6 days old.**
- **Traffic:** ~86 human events over the first 5 days. Effectively zero.
- **Backlinks:** ~none.
- **Unfair advantage:** real, MRF-cited prices — *not estimates*. This is the hook
  that earns links from journalists and trust from users. Lead with it everywhere.

## The core thesis (what actually drives traffic here)

Traffic is gated in a strict sequence. Working on a later gate before an earlier one
is wasted effort:

1. **Discovery / crawl** — a new domain with no backlinks gets almost no crawl
   budget. Google won't find 2,500 pages from a sitemap alone. → **This is the #1
   bottleneck right now.** Fix with backlinks + GSC indexing requests.
2. **Indexing** — once crawled, near-identical hospital pages risk "Crawled –
   currently not indexed." Mitigated by unique data + unique titles (done); monitor
   in GSC.
3. **Ranking** — needs query-matched on-page language, domain authority (age +
   links), content quality (E-E-A-T), and user signals (CTR, dwell).
4. **Compounding** — freshness cadence, growing internal links, and an editorial
   hub that builds topical authority. This is where pSEO sites win long-term.

**The model:** thousands of long-tail pages each catching a trickle of
"[procedure] cost" / "[hospital] prices" / "[procedure] cost in [state]" searches,
plus a thin layer of editorial guides that rank for higher-volume informational
queries and pass authority + users down to the money pages.

**The one-line strategy:** *Earn the first 5–10 real backlinks so Google crawls the
catalog, then let the long-tail compound while an editorial layer builds authority.*

---

## Workstreams, ranked by ROI

Tags: **[Impact]** H/M/L · **[Effort]** H/M/L · **[Control]** = how much it depends
on you vs. third parties.

### WS1 — Backlinks & the first crawl · [Impact H] [Effort M] — THE GATE
Nothing else matters until this moves. You don't need 50 links; you need the first
handful from crawled, indexed pages.

- [ ] **Show HN** — "Show HN: Real hospital prices pulled from federally-mandated
  files, cited to source." HN rewards open-data/transparency; one post can deliver
  the first traffic spike *and* do-follow links. Post Tue–Thu, ~9am ET. (Draft copy: WS-assets below.)
- [ ] **Product Hunt** launch — same angle, schedule for a weekday 12:01am PT.
- [ ] **3–5 genuinely helpful Reddit answers** — r/personalfinance, r/medicalbills,
  r/HealthInsurance, r/Insurance. Find real "how much should X cost?" threads,
  answer substantively, link the *specific* procedure/hospital page. Helpful-first;
  one link per comment; never copy-paste.
- [ ] **HARO / Qwoted / Featured.com** — sign up as a source; respond to
  healthcare-cost / medical-billing queries. Reporter citations = high-authority
  links, the strongest new-site trust signal.
- [ ] **Local-news data pitch** — your `/reports/state/[code]` pages are pre-built
  linkable assets. Pitch 5–10 local health/business reporters a "most vs. least
  expensive hospitals for [common procedure] in [state]" angle. (Template: WS-assets.)
- [ ] **Open-data directories & lists** — submit to price-transparency org lists,
  GitHub "awesome" open-data / civic-data lists, data-journalism resource pages,
  and add citations to relevant Wikipedia hospital-price-transparency articles.
- [ ] **Data-source ecosystem** — get listed wherever CMS HPT / TPAFs / DoltHub
  open-data consumers are catalogued.

### WS2 — GSC indexing operations · [Impact H] [Effort L] [Control: you]
A weekly 15-minute loop. Cheapest high-signal work available.

- [ ] In Search Console, **URL Inspection → Request Indexing** for: home, `/procedures`,
  `/hospitals`, `/states`, top 10 procedure pages, top 10 hospital pages, a few state
  reports. Seeds the crawl.
- [ ] Watch **Pages (Indexing)** report weekly. Triage: "Discovered – not indexed"
  (crawl budget → needs links, WS1) vs. "Crawled – not indexed" (quality/thin →
  needs differentiation/content).
- [ ] Confirm the sitemap shows **2,290 hospitals** read (post-deploy; the
  noindex-thin exclusion shipped 2026-06-09).
- [ ] Watch the **Performance** report: which queries first surface impressions?
  Those reveal what to double down on (WS3/WS4).
- [ ] Verify **Bing Webmaster** import from GSC completed (was pending at launch).

### WS3 — Query-matched on-page (relevance) · [Impact M-H] [Effort M] [Control: you]
In-your-control ranking lift. The pages exist; make sure they speak searcher language.

- [ ] Audit procedure titles/H1s against real search phrasing. People search "MRI
  cost", "how much does an MRI cost", "[hospital] prices" — not clinical names.
  Ensure the searcher phrasing appears in `<title>`, H1, and intro copy.
- [ ] Add a short, unique **"How much does {procedure} cost?"** intro paragraph to
  each procedure page (templated from the data: range, median, # hospitals). Boosts
  relevance and reduces thin-content risk.
- [ ] Add **FAQPage JSON-LD** to procedure pages ("Why do prices vary?", "What's the
  difference between cash and negotiated?") — can earn FAQ rich results.
- [ ] Ensure every money page has a one-line **data-freshness / source citation**
  visible (already present on hospital pages — extend to procedure pages).

### WS4 — Editorial content layer · [Impact H] [Effort M] [Control: you]
Ranks for higher-volume informational queries, passes authority to money pages, AND
satisfies AdSense reviewers (substantive non-programmatic content). Triple win.
Follow `docs/EDITORIAL_STYLE.md`.

- [ ] Write 5–10 genuine guides, each internally linking to relevant money pages:
  - [ ] "How much does an MRI cost without insurance — and how to find your price"
  - [ ] "Cash price vs. negotiated price vs. chargemaster: what you actually pay"
  - [ ] "How to read (and fight) a hospital bill"
  - [ ] "Why the same surgery costs 10× more at one hospital than another"
  - [ ] "What hospital price transparency law actually requires (and how to use it)"
  - [ ] "[High-volume procedure] cost guide" for the top 3–5 procedures
- [ ] Each guide: target one head term, answer the query fully, link 3–5 money pages,
  add `Article` + `FAQPage` schema.
- [ ] Build these as a `/guides` hub so they form a topical cluster (topical
  authority compounds).

### WS5 — Linkable assets / data journalism · [Impact M-H] [Effort M]
Content designed to *earn links passively* — the durable backlink engine.

- [ ] Turn state reports into a shareable **"Hospital Price Index"** with rankings,
  a clear chart, and an OG image — the kind of thing reporters screenshot and link.
- [ ] Publish an annual/quarterly **"State of Hospital Prices"** report with national
  findings (biggest price swings, most/least expensive metros). Pitch it (WS1).
- [ ] Consider an **embeddable price widget** ("prices for X near you") with an
  attribution link — distributes backlinks wherever it's embedded.

### WS6 — Geo / long-tail expansion · [Impact M] [Effort M-H]
Do *after* WS1–4 prove demand; don't build surface area nobody crawls yet.

- [ ] **City-level hub pages** ("Hospital prices in {city}, {state}") to capture
  local intent below the state level. Big long-tail surface, real build work.
- [ ] **Procedure × state money pages** if `/reports/state/[code]` demand validates.

### WS7 — Engagement, retention & owned audience · [Impact M] [Effort M]
Better user signals help rankings; an email list is traffic you own, Google-independent.

- [ ] Make on-site **search** prominent (price lookup is the core job-to-be-done).
- [ ] Grow the newsletter (`/subscribe` exists) — "we'll alert you when prices update
  for procedures/hospitals you care about." Owned re-engagement channel.
- [ ] Add obvious **share** affordances on report pages.

### WS8 — Freshness cadence · [Impact M] [Effort L once built]
Fresh data is a ranking + trust signal and gives Google reasons to re-crawl.

- [ ] Schedule a **monthly re-ingest** (GitHub Actions / Railway cron). Also the
  vehicle for any dictionary additions (e.g. physical therapy) — they only surface
  on re-ingest.
- [ ] Surface "data updated {date}" site-wide; feed `lastmod` from real parse dates
  (sitemap already does this as of 2026-06-09).

### WS9 — Measurement & iteration · [Impact: enabling] [Effort L]
You can't grow what you don't watch.

- [ ] Define the **traffic goal** explicitly (e.g. "1,000 organic sessions/mo by
  90 days") so prioritization has a target. _← fill in._
- [ ] Weekly 20-min review: GSC queries/impressions/clicks + first-party analytics
  (`npm run analytics`). Find pages getting impressions but no clicks → improve
  title/meta. Find ranking pages → build more like them.
- [ ] Track backlinks earned (WS1) and correlate with crawl-rate changes in GSC.

### WS10 — Technical hygiene · [Impact L-M] [Effort L] (likely already fine)
- [ ] Confirm **Core Web Vitals** pass (Next static export should be fast; verify in GSC).
- [ ] Confirm mobile rendering of the price tables (most health-cost search is mobile).
- [ ] Verify `/og.png` and per-page OG images render well in social/Slack/iMessage
  previews (drives click-through on shared links).

---

## Do this week (the highest-return sequence)

1. **WS2** — request indexing for the ~30 key pages in GSC. (30 min, today.)
2. **WS1** — post Show HN + Product Hunt; write 3–5 Reddit answers. (Half a day.)
3. **WS1** — sign up for HARO/Qwoted; send 5 local-news data pitches. (2 hours.)
4. **WS4** — draft the first 2 editorial guides (MRI cost; cash vs. negotiated).
5. **WS9** — set the explicit traffic goal and put the weekly GSC review on the calendar.

Everything else is week 2+. **WS1 is the gate — if you only do one thing, do that.**

## How this ties back to AdSense

WS1 (traffic) + WS4 (substantive editorial content) are exactly what AdSense
reviewers want to see. Working this plan doesn't just prepare for monetization —
it improves the odds and speed of approval. And monetization is moot until WS1
lands: ads on a zero-traffic site earn zero.

---

## WS-assets to draft next (ask Claude)
- [ ] Show HN title + body, Product Hunt tagline + description (MRF-cited angle).
- [ ] Reusable local-news pitch email + the SQL to pull the "most vs. least
  expensive hospitals for {procedure} in {state}" hook.
- [ ] The 2 starter editorial guides.
