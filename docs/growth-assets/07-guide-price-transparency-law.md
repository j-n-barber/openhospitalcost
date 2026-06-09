# Guide: What the hospital price transparency law actually requires

**Status:** draft, publish-ready. Target build: `/guides/price-transparency-law` (WS4).
**Voice:** per `docs/EDITORIAL_STYLE.md`. Regulatory facts verified against CMS sources
2026-06-09 (links at bottom). Keep claims at this level of specificity — don't add
shakier numbers without re-checking CMS.

---

**Meta title:** What the Hospital Price Transparency Law Requires (and How to Use It)
**Meta description:** Since 2021, US hospitals must publish their actual prices. Here's what
the law (45 CFR §180) requires, what's in the files, and how to use it to your advantage.

---

## Hospitals must publish their prices — here's the rule

Since **January 1, 2021**, federal regulations at **45 CFR Part 180** require every
hospital operating in the United States to publish its **standard charges** for the items
and services it provides. The rule implements a provision of the Public Health Service Act
and is enforced by the Centers for Medicare & Medicaid Services (CMS).

There are two separate requirements.

### 1. A comprehensive machine-readable file

Every hospital must post a single **machine-readable file** listing the standard charges for
**all** items and services. As of **July 1, 2024**, that file has to follow a standardized
CMS template, in CSV or JSON format, with a defined data dictionary — which is what makes it
possible to compare hospitals at all. The file must include four kinds of standard charge:

- **Gross charge** — the chargemaster list price, before any discount.
- **Discounted cash price** — what a self-pay patient is charged.
- **Payer-specific negotiated charge** — the rate for each insurer and plan.
- **De-identified minimum and maximum negotiated charges** — the range across all payers.

Recent updates also require hospitals to encode an **estimated allowed amount** (what a
plan actually pays) and to **attest** that the data is true and complete.

### 2. A consumer-friendly display of 300 shoppable services

Separately, each hospital must present prices for **300 "shoppable" services** in a
consumer-friendly format — or offer a price-estimator tool that gives a personalized
out-of-pocket estimate. Shoppable services are the ones you can plan ahead for: imaging,
lab tests, common procedures, scheduled surgery.

## Why the files are hard to use (and where we come in)

The data exists, but it's not built for humans. The machine-readable files are often
hundreds of megabytes, formatted differently by every hospital, and full of billing codes
without plain-English labels. Compliance is also uneven — some hospitals publish clean,
complete files; others publish incomplete or hard-to-parse data.

OpenHospitalCost reads those public files, normalizes them into comparable prices, and makes
them searchable by procedure, hospital, and state — with every number dated and linked back
to its source file. We don't estimate or model; we show what the hospital reported.
([How we source this →](https://openhospitalcost.com/methodology))

## How to use the law to your advantage

- **Compare before non-emergency care.** The whole point of the rule is to let you shop.
  Look up the procedure and compare hospitals near you.
- **Check a bill against the published rate.** If you're billed more than a hospital's own
  published cash or negotiated price, that's leverage to ask for the documented rate.
- **Ask for the cash price.** It's one of the four charges hospitals must publish, and it's
  sometimes lower than the negotiated insurance rate.
- **Confirm before you book.** Files are dated and can lag, so verify the current number
  with the hospital.

## A note on accuracy

These figures are published data for comparison, not a quote. Coverage is partial and
growing, some files are incomplete, and your actual cost depends on your care and your
insurance. Always confirm directly with the hospital and your insurer.

---

## FAQ (for FAQPage schema)

**Are hospitals required to publish their prices?**
Yes. Since 2021, federal rule 45 CFR §180 requires every US hospital to publish its standard
charges — gross, cash, and negotiated — in a machine-readable file, plus a consumer-friendly
display of 300 shoppable services or a price-estimator tool.

**What prices are in a hospital's machine-readable file?**
Four kinds: the gross (list) charge, the discounted cash price, the payer-specific
negotiated rate for each plan, and the de-identified minimum and maximum negotiated charges.

**When did hospital price transparency become law?**
The regulations took effect January 1, 2021. A standardized CMS file template became
required July 1, 2024.

**Why are the price files so hard to read?**
They're built for machines, not people — often very large, inconsistently formatted, and
full of billing codes. Sites like OpenHospitalCost translate them into searchable,
plain-English prices.

---

## Sources (CMS — verify before publishing)
- Hospital Price Transparency Fact Sheet — https://www.cms.gov/newsroom/fact-sheets/hospital-price-transparency-fact-sheet
- Hospitals (requirements overview) — https://www.cms.gov/priorities/key-initiatives/hospital-price-transparency/hospitals
- CY 2024 OPPS price transparency proposals (template, data dictionary) — https://www.cms.gov/newsroom/fact-sheets/cy-2024-hospital-outpatient-prospective-payment-system-opps-policy-changes-hospital-price
- Enforcement updates — https://www.cms.gov/newsroom/fact-sheets/hospital-price-transparency-enforcement-updates

## Internal links to include
- `/methodology`, `/faq`, `/how-it-works`, `/procedures`
