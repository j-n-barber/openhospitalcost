# Procedure List Expansion — Proposal (DRAFT for review)

We currently track **100 curated shoppable procedures**. This proposes growing that
to ~**200–250**, deliberately — not "all CPT codes." Decision context and the
reasoning against "show everything" live in the chat; the short version:

- **Not all codes.** ~10k CPT/HCPCS codes × thousands of hospitals = tens of
  millions of summary rows (re-bloats Neon) + thin-page SEO + noise. Most codes
  aren't consumer-shoppable.
- **AMA licensing.** The official CPT *descriptors* are AMA-copyrighted. We keep
  using the **code numbers** (facts) with **our own plain-language names**, exactly
  as the current 100 do. No change to that posture.
- **Curated + shoppable.** Add procedures a consumer can actually price-shop:
  imaging, labs, common surgeries/scopes, maternity, behavioral, ED/office.

## How to pick the additions (recommended process)

Two inputs, combined:

1. **Authoritative shoppable lists** — CMS's 70 federally-mandated shoppable
   services + common consumer procedures. (Curated, below.)
2. **Data-driven frequency scan (the rigorous filter).** The MRFs we've ingested
   already contain every code each hospital publishes. Rather than guess codes
   from memory, we should **scan the raw MRFs (R2 archive / re-parse) and rank
   CPT/HCPCS codes by how many hospitals carry them**, then add the high-coverage,
   consumer-relevant ones. This also yields the **exact, verified codes** (so they
   actually match at ingest) instead of hand-entered ones.

> ⚠️ **Codes below are DRAFT and must be verified before loading.** A wrong code
> silently matches nothing. Treat this as the candidate *shortlist*; confirm each
> code against an authoritative reference (or, better, against the frequency scan)
> before adding to `data/procedures.json` + seeding.

## Candidate additions by category

Names are our own wording. "✓conf" = code I'm confident on; "verify" = confirm the code.

### Labs (high consumer volume)
| Our name | Code | Conf |
|---|---|---|
| Blood draw (venipuncture) | 36415 | ✓conf |
| Thyroid panel (free T4) | 84439 | verify |
| Vitamin B12 level | 82607 | ✓conf |
| Ferritin (iron stores) | 82728 | ✓conf |
| C-reactive protein (CRP) | 86140 | ✓conf |
| Sed rate (ESR) | 85652 | verify |
| Urine culture | 87086 | verify |
| Rapid strep test | 87880 | ✓conf |
| Rapid flu test | 87804 | verify |
| COVID-19 PCR test | 87635 | ✓conf |
| Pap smear (cervical cytology) | 88175 | verify |
| HPV test | 87624 | verify |
| Chlamydia test | 87491 | ✓conf |
| Gonorrhea test | 87591 | ✓conf |
| Glucose, blood | 82947 | ✓conf |
| Hepatic (liver) function panel | 80076 | ✓conf |
| Obstetric panel | 80055 | verify |
| PT/INR (blood clotting) | 85610 | ✓conf |

### Imaging (add the common variants we're missing)
| Our name | Code | Conf |
|---|---|---|
| CT abdomen & pelvis without contrast | 74176 | verify |
| MRI shoulder without contrast | 73221 | verify |
| MRI lumbar spine with & without contrast | 72158 | verify |
| Ultrasound, pelvic (transvaginal) | 76830 | ✓conf |
| Ultrasound, thyroid/neck | 76536 | ✓conf |
| Ultrasound, breast | 76641 | verify |
| Coronary CT angiogram (CTA) | 75574 | verify |
| Nuclear bone scan | 78306 | verify |
| Abdominal aorta ultrasound (AAA screen) | 76706 | ✓conf |

### GI / scopes
| Our name | Code | Conf |
|---|---|---|
| Screening colonoscopy (no polyp) | 45378 | ✓conf |
| Colonoscopy with polyp removal (snare) | 45385 | ✓conf |
| Upper endoscopy with biopsy | 43239 | ✓conf |
| Flexible sigmoidoscopy | 45330 | verify |
| Cystoscopy (bladder scope) | 52000 | ✓conf |

### Cardiac
| Our name | Code | Conf |
|---|---|---|
| Cardiac event monitor (30-day) | 33285 | verify |
| Transesophageal echo (TEE) | 93312 | verify |
| Cardiac CT calcium score | 75571 | verify (we have a calcium-scoring entry — dedupe) |

### Women's health & maternity
| Our name | Code | Conf |
|---|---|---|
| Prenatal obstetric ultrasound (first trimester) | 76801 | verify |
| Hysteroscopy | 58558 | verify |
| Dilation & curettage (D&C) | 58120 | verify |
| Endometrial biopsy | 58100 | ✓conf |
| Colposcopy | 57455 | verify |

### Surgery (general / ortho / ENT / urology / derm)
| Our name | Code | Conf |
|---|---|---|
| Thyroidectomy (total) | 60240 | verify |
| Hemorrhoidectomy | 46260 | verify |
| Ventral/incisional hernia repair | 49560 | verify |
| Shoulder arthroscopy with repair | 29827 | verify |
| Trigger finger release | 26055 | verify |
| Adult circumcision | 54161 | verify |
| Skin lesion removal (malignant) | 11602 | verify |
| Mohs surgery (skin cancer) | 17311 | verify |

### Cancer / infusion
| Our name | Code | Conf |
|---|---|---|
| Chemotherapy infusion (each additional hour) | 96415 | ✓conf |
| Radiation therapy delivery (simple) | 77402 | verify |
| Implantable port placement | 36561 | verify |

### Behavioral / therapy
| Our name | Code | Conf |
|---|---|---|
| Psychotherapy, 60 minutes | 90837 | ✓conf |
| Family psychotherapy | 90847 | ✓conf |
| Physical therapy evaluation | 97161 | ✓conf |
| Physical therapy, therapeutic exercise (per 15 min) | 97110 | ✓conf |

## Suggested next steps
1. **Run the frequency scan** over ingested MRFs → rank uncovered codes by hospital
   coverage; intersect with this shortlist; that gives the verified final set.
2. **Verify all "verify" codes** against an authoritative CPT/HCPCS reference.
3. Add to `data/procedures.json` with our names/slugs/categories; `seed:procedures`.
4. They're captured on the **next refresh re-ingest** (extraction is driven by the
   procedures table) — folds into normal data-freshness cycles, no special re-run.

**Scope guidance:** aim ~200–250 total. Stop where procedures stop being things a
consumer would price-shop (skip add-on/component/modifier codes).
