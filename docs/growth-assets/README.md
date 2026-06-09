# Growth assets

Ready-to-use distribution + content drafts for the AdSense-wait push. Companion to
[`../TRAFFIC_GROWTH.md`](../TRAFFIC_GROWTH.md) (WS1 backlinks, WS4 editorial, WS5 data
journalism).

| File | What it is | Use for |
|---|---|---|
| `01-show-hn-product-hunt.md` | Show HN + Product Hunt launch copy | WS1 — first crawl + traffic spike |
| `02-local-news-pitch.md` | Reporter pitch email + the tested ranking SQL | WS1/WS5 — earned backlinks |
| `03-guide-mri-cost.md` | Editorial guide: "How much does an MRI cost without insurance" | WS4 — informational traffic + AdSense |
| `04-guide-cash-vs-negotiated.md` | Editorial guide: cash vs. negotiated vs. chargemaster | WS4 — informational traffic + AdSense |

## Accuracy & provenance

Every statistic below was **verified against the live Neon production DB on 2026-06-09**
and against the site's own vetted FAQ/methodology copy. Numbers used in the drafts:

| Claim | Verified value | Source |
|---|---|---|
| Scale | 2,346 eligible hospitals · 159 procedures · 462,145 prices · 53 states/territories | `procedure_hospital_summary` + eligibility filter |
| Cash beats negotiated | **32.4%** of pairs (37,820 / 116,696 where both exist) | DB, eligible hospitals only |
| Knee MRI (CPT 73721) negotiated | n=1,987 · p10 $249 · **median $690** · p90 $2,630 · range $60–$11,190 · ~**10× decile spread** | DB |
| Knee MRI cash (uninsured) | n=1,998 · p10 $567 · **median $1,872** · p90 $5,105 | DB |
| Knee MRI in Texas (negotiated) | 183 hospitals · $161–$8,689 · 54× min/max | DB |
| The law | Since 2021, 45 CFR §180 requires a machine-readable file of standard charges (gross, cash, negotiated) | site `/faq` |

**Two honesty rules baked into the copy:**
1. **Never claim "cash is cheaper."** It's cheaper only ~1 in 3 times; for an MRI it
   usually isn't (cash median $1,872 vs negotiated $690). Copy says "sometimes — about
   1 in 3 — always check both."
2. **Prices drift on re-ingest.** Drafts cite figures "as of mid-2026" and link to the
   **live page** for current numbers, so the guides don't go stale-wrong.

## Before you post — checklist

- [ ] Re-run the key numbers (DB shifts each re-ingest). The SQL in `02-...md` and the
      queries are reproducible; spot-check any figure you quote publicly.
- [ ] Spot-check extreme min/max entries on the live page — a $60 or $8,689 line can be
      an oddly-reported single line item; confirm it looks real before headlining it.
- [ ] Swap the conservative scale numbers up if ingestion has grown (currently written
      as "more than 2,000 hospitals / 150+ procedures" — both safely below actual).
- [ ] Fill the `{placeholders}` in the pitch email.
- [ ] Confirm the linked pages render (e.g. `/procedure/knee-mri`, `/state/tx`, `/reports`).
