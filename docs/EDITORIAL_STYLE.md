# Editorial Style Guide — Procedure Descriptions

**Purpose.** Establish writing rules for procedure descriptions on OpenHospitalCost so that (a) no AMA-copyrighted CPT descriptor text is reproduced, and (b) descriptions are consistently consumer-readable.

This guide is the design input to the legal consult on AMA/CPT boundary (Phase B parallel track). It should exist before the consult so the lawyer reviews a concrete style, not an open question.

---

## The AMA/CPT boundary

**What's protected.** The American Medical Association holds copyright on the **official short and long descriptors** of CPT codes (e.g., the precise wording used in the CPT codebook).

**What's not protected.**

- The CPT **code itself** (e.g., `99213`) — codes are factual identifiers, used industry-wide.
- The **clinical meaning** of the code — we can describe what the procedure is.
- Our own original prose explaining the procedure in plain language.

**Practical rule.** Never copy or paraphrase closely from any AMA-published descriptor. Write every description from clinical knowledge of the procedure itself.

---

## Voice and tone

- **Plain-spoken.** Write for someone who has never been to medical school.
- **Direct.** No marketing language, no euphemisms, no hedging.
- **Factual.** State what the procedure is and what it covers. Don't editorialize about cost or value.
- **Second-person sparing.** Use "you" only when describing the patient's experience ("the visit you'd have for a follow-up"). Default to third-person descriptive.

## Structure

Every procedure description should answer, in 2–4 sentences:

1. **What is this procedure?** (one sentence)
2. **When is it used / who gets it?** (one sentence, optional)
3. **What's typical about it?** (duration, complexity, billing context — one sentence, optional)
4. **What does the code cover?** (scope of what's billed under this code, one sentence)

Target length: 40–80 words. Hard cap: 120 words.

## What to avoid

- AMA short descriptor wording (e.g., do not write "Office o/p visit est mod" — instead write "A standard follow-up office visit").
- Trademarked brand names of drugs, devices, or techniques unless essential (and then italicize).
- Specific price claims ("typically $X") — those come from the data, not the description.
- "Pain points" language, fear-based framing, urgency.
- Anatomical jargon without a plain-language equivalent in the same sentence.

## What to include

- Plain-English aliases as a `description` afterthought when useful ("commonly called a knee MRI").
- Duration or visit-length ranges when standard ("typically 20 to 29 minutes").
- Context about who bills it / under what circumstances when non-obvious.

## Examples (good)

> "A standard follow-up office visit with a doctor you've seen before, typically lasting 20 to 29 minutes. Covers evaluation of a low-to-moderate complexity issue, like managing an ongoing condition or following up on test results. The most commonly billed office visit code in the United States."

(This is the existing 99213 description in data/procedures.json — meets the bar.)

## Examples (bad)

> "Office or other outpatient visit for the evaluation and management of an established patient, which requires a medically appropriate history and/or examination and low level of medical decision making."

(Too close to AMA descriptor wording. Rewrite from scratch.)

---

## Workflow

1. New procedures get a draft description from this style.
2. Before locking the procedure dictionary for a release, every description gets a self-review against this guide.
3. Once the AMA/CPT legal consult returns, this guide gets a confirmation pass and a version bump.

## Version

- **v0.1** — initial draft, Phase A. Not yet legal-reviewed.
