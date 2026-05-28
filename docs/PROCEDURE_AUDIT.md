# Procedure Dictionary Audit Notes

**Date:** 2026-05-27 (Phase A wrap-up)
**Pass:** v0.1 against [docs/EDITORIAL_STYLE.md](EDITORIAL_STYLE.md) v0.1
**Result:** Overall PASS. 2 corrections applied. 9 items queued for verification or replacement.

---

## What was checked

All 100 procedures in [data/procedures.json](../data/procedures.json) reviewed against:

- EDITORIAL_STYLE.md voice/tone/structure rules
- CPT code accuracy (against current code knowledge as of audit date)
- Slug consistency and SEO viability
- Plain-language clarity for medical jargon

---

## Corrections applied this pass

### CPT 29881 — name/description rewritten

**Was:** "Knee arthroscopy with meniscus repair"
**Now:** "Knee arthroscopy with meniscectomy"

CPT 29881 is meniscectomy (tear *removal*). Repair is 29882/29883. Since meniscectomy is the more common operation for a torn meniscus, we kept the code and corrected the label to match clinical reality. Description rewritten; slug `meniscus-repair` → `knee-meniscectomy`.

### CPT 95806 — alias scrubbed

**Was:** `"wat-pat test"` (references WatchPAT device — a brand name)
**Now:** `"at-home sleep test"`

EDITORIAL_STYLE.md prohibits trademarked brand names unless essential.

---

## Verification queue (check before Phase E launch)

These codes may have recent CPT revisions; verify against the current AMA CPT codebook before any branded launch:

| Code | Procedure | Concern |
|---|---|---|
| 93224 | Holter monitor | 93224–93227 family revised in recent code cycles; confirm 93224 still maps to the 24–48hr recording-and-analysis bundle |
| 38221 | Bone marrow biopsy | 38222 was added in 2018 for biopsy+aspiration; 38221 may now be biopsy-only. Confirm hospitals still post 38221 for this service |
| 90937 | Hemodialysis | Consumers searching "dialysis cost" may match more readily to 90935 (single physician eval) than 90937 (multiple evals); compare actual hospital posting frequencies during Phase C |

---

## Keyword-validation queue (Phase B parallel work)

Per [data/procedures.json](../data/procedures.json) source_notes, the 30 `draft_addition` procedures should be checked against Google Keyword Planner / Ahrefs before locking. Most appear strong; these 6 are lower-confidence and should be the first to look at:

| Code | Procedure | Why questionable |
|---|---|---|
| 72146 | MRI thoracic spine | Cervical and lumbar dominate spine MRI searches; thoracic is rarer clinically and in search |
| 38221 | Bone marrow biopsy | Clinical-grade procedure; patients in this workflow are already inside an oncology/hematology pathway, low shopping intent |
| 63650 | Spinal cord stimulator trial | Niche pain-mgmt patient flow; unlikely to drive organic SEO traffic |
| 58301 | IUD removal | Materially lower search volume than IUD insertion (58300) |
| 11102 | Skin biopsy (tangential) | Usually billed as part of a dermatology visit, hard to shop independently |
| 90792 | Initial psych eval w/ medication mgmt | Heavy overlap with 90791 (initial psych eval); consider whether one entry serves both |

**Replacement candidates** (high-confidence shoppable procedures not yet in the dictionary that could replace any of the above after Phase D launch reveals real GSC data):

- CPT 99204 — Office visit, new patient, level 4 (longer/more complex visits, frequent search)
- CPT 99396/99386 — Preventive medicine annual exam, adult
- CPT 90471 — Vaccine administration (one of the most common consumer-paid services)
- CPT 76830 — Transvaginal ultrasound (high female-health search volume)
- CPT 36415 — Routine venipuncture (sub-component of lab tests but searched as "blood draw cost")

---

## Style guide v0.1 — items the audit suggests for v0.2

Not blocking, but worth refining in the next style-guide pass:

1. **Anatomical jargon policy.** A few procedures use terms like "transverse carpal ligament," "vas deferens," and "septum" without a plain-language gloss in the same sentence. v0.1's rule is "without a plain-language equivalent in the same sentence." Most of the existing uses have enough surrounding context that meaning is clear, but a v0.2 rule could be stricter: every anatomical term gets a parenthetical gloss on first use within a description.
2. **Procedure-name standardization.** Some entries use single-word names (`appendectomy`) and others use full descriptive phrases (`laparoscopic-gallbladder-removal`). Either pattern is fine but inconsistency is mildly annoying. Pick one for v0.2.
3. **Aliases format.** Some lowercased throughout, some Title Case. Adopt all-lowercase as the rule (matches how users actually type queries).

---

## Audit re-run cadence

This audit should be repeated:

- After any batch addition to `procedures.json`
- After EDITORIAL_STYLE.md is updated (style guide changes can invalidate old descriptions)
- Annually as part of the AMA CPT code-set update cycle (codes get retired / renumbered)
