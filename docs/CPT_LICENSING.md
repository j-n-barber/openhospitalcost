# CPT / AMA licensing — application record & posture

_Internal record. **Not legal advice.** Before relying on any of this, get a short
consult with an IP attorney — especially to interpret the AMA's "user" definition
and whether a license is required for our use._

## Application submitted — 2026-06-03
Submitted directly to the AMA via the CPT licensing portal (account created under
contact@jnbarber.com). Save the confirmation email + a copy of the submission with
this record.

- **Request type:** CPT New Data Licensing Application
- **Applicant:** Jake Barber — contact@jnbarber.com · 715-213-0342
- **Organization:** J.N. Barber LLC
- **Website:** openhospitalcost.com
- **Subject:** "CPT distribution license inquiry — consumer price-transparency website."
- **Product/Service category:** Analytics / information-service
- **Market:** Consumers / Patients
- **Fee:** acknowledged the **$1,050** application fee
- **Confidentiality/accuracy:** agreed — responses certified accurate (we
  deliberately described the full commercial/public scope straight, not minimized)

### Product description as submitted
> OpenHospitalCost is a consumer-facing price-transparency website for cash-pay and
> high-deductible patients. It ingests the machine-readable files (MRFs) hospitals
> publish under the CMS Hospital Price Transparency rule, normalizes the pricing
> data, and presents it on pages organized by procedure and hospital so consumers
> can compare prices for shoppable services. CPT/HCPCS codes are used as the key to
> identify and match procedures across facilities... [as submitted, the description
> stated each public page displays the CPT code alongside a plain-language
> description; commercial, ad- + affiliate-supported; intended national scale ~5,000
> hospitals]. See full text in the saved submission.

### Questions we raised (require a response)
1. How are **"users" counted** for a free, public, ad-supported website under the
   agreement's user definition — esp. clause (c) (anyone using an output that relies
   on embedded CPT content) — where "users" would be the general viewing public, not
   a countable set of seats?
2. Is a **non-per-user model** available (flat / traffic-based / per-record) for
   public price-transparency tools?
3. Does the fact that the pricing data **originates from CMS-mandated MRFs already
   published by licensed hospitals** affect the analysis?
4. Requested an **estimated annual royalty range** + offered a call.

## Current site posture (reconciliation — important)
The application (6/3) described the product as **displaying** the CPT code on each
page. **Since then, the live site has been updated to NOT display CPT codes or
descriptors** — codes were removed from all pages, JSON-LD, meta, and client
payloads; codes are now used **only internally** to match line items from the public
MRFs. This was a deliberate exposure-reduction step while the licensing/pricing
questions are open. Net: **current public use is *narrower* than what was applied
for** (we applied for the broader display use in good faith; we're operating
conservatively pending the answer).

> Worth noting for consistency: if the AMA reviews the site they'll see no CPT codes
> displayed — i.e., *less* than the application described. That's the conservative
> direction and is fine, but if you want the application and the live site to match,
> tell the AMA you've paused code display pending their response. (Discuss w/ counsel.)

## If the AMA contacts us
We display no CPT content publicly, use codes only to match public CMS-mandated data,
proactively applied for a license + raised the pricing/user-definition questions
above (6/3/2026), and are happy to license/comply. Then engage counsel.

## Open questions for an attorney
1. Does internal-only use of CPT **code numbers** as matching keys (no display, no
   redistribution) require an AMA license at all?
2. Does sourcing the codes from hospitals' own legally-required public files change it?
3. Given the application is in, what's the right interim operating posture, and at
   what revenue/scale should we license proactively regardless?
