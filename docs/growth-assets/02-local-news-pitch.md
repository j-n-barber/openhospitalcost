# Local-news data pitch + ranking SQL

**The play (WS1/WS5):** local health and business reporters love a clean, local,
verifiable data hook. "The same MRI costs $160 at one [State] hospital and $8,700 at
another" is a story that writes itself — and the citation is a backlink to your
`/state/[code]` or procedure page. One placed story can be worth more than dozens of
forum links because local-news domains carry real authority.

---

## The pitch email (reusable template)

Keep it to a reporter who covers health, consumer, or business at a local outlet. Find
them on the outlet's staff page or recent bylines. Personalize the first line.

**Subject:** `Data: the same {procedure} ranges from ${low} to ${high} across {State} hospitals`

> Hi {FirstName},
>
> I saw your recent piece on {topic they actually covered} and thought this might be
> useful for a follow-up.
>
> I run OpenHospitalCost, a free site that makes hospitals' federally-mandated price
> files searchable. Pulling the {State} data, the spread for a single common procedure
> is striking: a {procedure} has a negotiated price as low as **${low}** at one {State}
> hospital and as high as **${high}** at another — for the same scan, often a few miles
> apart.
>
> Every number traces back to the hospital's own machine-readable file (required under
> federal rule 45 CFR §180), so it's all verifiable, not estimated. The full {State}
> breakdown is here: https://openhospitalcost.com/state/{code}
>
> Happy to pull the specific hospital-by-hospital numbers for {metro/region}, or any
> procedure you're interested in — childbirth, colonoscopy, an ER visit, etc. No ask
> beyond a source credit if it's useful.
>
> Best,
> {Your name}
> {phone} · openhospitalcost.com

**Notes:**
- Offer to do the work (pull the numbers for their metro). Reporters are time-poor;
  a ready-to-use dataset is the whole value.
- The only "ask" is attribution. A linked credit is the backlink.
- Pitch 5–10 at once; expect a low hit rate. One placement is a win.

---

## The ranking SQL (tested 2026-06-09)

For a given procedure + state, returns hospitals ranked by negotiated representative
facility price, cheapest first. Swap `:slug` and `:state`. Find slugs at
`/procedures` (the URL is `/procedure/<slug>`); state is the lowercase 2-letter code.

```sql
-- Most vs. least expensive hospitals for a procedure in a state.
-- Example params: slug = 'knee-mri', state = 'tx'
SELECT
  h.ccn,
  h.name,
  h.city,
  round(s.amount::numeric) AS negotiated_price,
  'https://openhospitalcost.com/hospital/' || h.ccn AS page
FROM procedure_hospital_summary s
JOIN procedures p ON p.id = s.procedure_id
JOIN hospitals  h ON h.id = s.hospital_id
JOIN LATERAL (
  SELECT * FROM mrf_files m
  WHERE m.hospital_id = h.id
  ORDER BY parsed_at DESC LIMIT 1
) f ON true
WHERE p.slug = 'knee-mri'                                   -- ← procedure
  AND lower(h.state) = 'tx'                                 -- ← state
  AND s.charge_type = 'negotiated'                          -- or 'discounted_cash' / 'gross'
  AND (f.quality_metrics->>'eligibleForMoneyPages')::boolean
  AND s.amount > 0
ORDER BY s.amount ASC;
```

**Summary line for the pitch (one row):**

```sql
WITH ranked AS (
  SELECT h.name, h.city, s.amount::numeric AS price
  FROM procedure_hospital_summary s
  JOIN procedures p ON p.id = s.procedure_id
  JOIN hospitals  h ON h.id = s.hospital_id
  JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id=h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
  WHERE p.slug = 'knee-mri' AND lower(h.state) = 'tx'
    AND s.charge_type = 'negotiated'
    AND (f.quality_metrics->>'eligibleForMoneyPages')::boolean AND s.amount > 0
)
SELECT count(*) AS hospitals,
       round(min(price)) AS low,
       round(max(price)) AS high,
       round(max(price)/nullif(min(price),0),1) AS spread_x
FROM ranked;
-- knee-mri / tx on 2026-06-09 → 183 hospitals, low $161, high $8,689, 54× spread
```

**Outlier caveat — read before quoting a number publicly:** the absolute min/max can
be a single oddly-reported line (a professional-component-only charge, a per-unit price).
Before you headline "$161," open that hospital's live page and confirm the entry looks
like a real all-in price. For a robust, defensible claim, the median and the
10th/90th-percentile spread (≈10× nationally for knee MRI) are safer than raw min/max.

**Good procedures for this hook** (high coverage, relatable, searched): `knee-mri`,
`brain-mri-with-and-without-contrast`, `colonoscopy`, an ER visit, childbirth/vaginal
delivery, a CT scan. Browse `/procedures` for exact slugs.
