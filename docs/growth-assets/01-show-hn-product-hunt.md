# Show HN + Product Hunt launch copy

All factual claims verified 2026-06-09 (see `README.md`). Scale numbers are written
conservatively (actual: 2,346 hospitals / 159 procedures / 53 states) so they stay
true between re-ingests. Update upward if you like before posting.

---

## Show HN

**The play:** HN rewards open data and transparency. Lead with the mechanism (federal
files, cited to source, no estimates) and the honest limitation (coverage is partial).
Post Tuesday–Thursday, ~9:00am ET. Then stay in the thread for the first 2–3 hours and
answer every comment — engagement in the first hour is what carries it.

### Title (≤80 chars — pick one)

- `Show HN: Real US hospital prices pulled from federal files, cited to the source`
- `Show HN: I made 2,000+ hospitals' actual prices searchable, no estimates`

### URL

`https://openhospitalcost.com`

### First comment (post immediately after submitting)

> Hi HN — I built OpenHospitalCost because "how much will this cost?" is nearly
> impossible to answer before you get a hospital bill.
>
> Since 2021, a federal rule (45 CFR §180) requires every US hospital to publish a
> machine-readable file of its actual standard charges — the gross "chargemaster" list
> price, the discounted cash/self-pay price, and the negotiated rates for each insurer.
> The files exist, but they're huge, inconsistently formatted, and effectively unusable
> by a normal person.
>
> So I download those files, parse them (CSV and JSON, every hospital does it
> differently), normalize them into comparable prices, and make them searchable by
> procedure, hospital, and state. I don't estimate or model anything — every number is
> what the hospital itself reported, and every hospital page links back to the exact
> source file and the date I ingested it.
>
> A few things that surprised me building it:
> - The spread is enormous. A knee MRI runs about $250 at the cheapest tenth of
>   hospitals and $2,600+ at the priciest — a ~10× swing — for the same scan. In Texas
>   alone the negotiated price ranges from ~$160 to ~$8,700.
> - The cash price is *sometimes* lower than the negotiated insurance rate (about 1 in
>   3 cases), so it can be worth asking for the self-pay price even if you're insured —
>   but it's not a rule, so you have to check.
>
> Honest limitations: coverage is partial (~2,000+ hospitals so far, growing as I
> improve the parsers and hospitals publish cleaner files), some files are malformed or
> missing, and these are published figures for comparison — not a quote for your
> specific care.
>
> Stack: Next.js (static) on Vercel, Postgres (Neon), a Node/DuckDB ingestion pipeline.
> Happy to answer anything about the data, the parsing, or the price-transparency rule.

### If asked "how is this different from [Turquoise/Dolt/hospital's own site]?"

> Turquoise and friends are great but mostly aimed at researchers/payers. This is built
> for a patient who just wants to compare a procedure before scheduling — plain-English
> procedure names, three price types explained, and a link back to the source file so
> you can verify or use it to push back on a bill. No login, no estimates, free.

---

## Product Hunt

**The play:** Schedule for 12:01am PT on a weekday. Line up a few people to check it out
that morning. PH is more consumer/visual than HN — lead with the benefit.

- **Name:** OpenHospitalCost
- **Tagline (≤60 chars):** `Real hospital prices, pulled from federal files`
- **Topics:** Health, Open Source / Open Data, Personal Finance, Search

**Description:**

> Hospitals are required to publish their actual prices — the cash price, the negotiated
> insurance rates, and the list price — in machine-readable files. OpenHospitalCost reads
> those files for 2,000+ US hospitals and makes them searchable by procedure, hospital,
> and state.
>
> No estimates. No modeling. Every price is what the hospital reported, dated and linked
> back to its source file. Use it to compare before non-emergency care, or to push back
> on a bill that's higher than the published rate. Free, ad-supported, and independent of
> hospitals and insurers.

**Maker's first comment:**

> Hey hunters 👋 I built this after staring at a hospital bill and realizing the price
> was technically *public* the whole time — just buried in a 200MB file nobody can read.
> The data is messy and coverage is still partial, but the goal is simple: let you see
> what a procedure actually costs *before* you get the bill. Would love feedback on which
> procedures or hospitals you'd want covered next.

---

## Posting tips

- **One channel at a time, or stagger by a day** — you want to be present in the thread,
  not split across two launches.
- **Don't vote-ring.** HN penalizes it hard. Just post and engage honestly.
- **Have the site warm:** the home page, `/procedure/knee-mri`, a big state like
  `/state/tx`, and `/reports` should all load fast and look right before you post.
- **Watch GSC after:** a front-page HN/PH post creates backlinks + a crawl spike — the
  exact WS1 goal. Note the date so you can correlate it with indexing in Search Console.
