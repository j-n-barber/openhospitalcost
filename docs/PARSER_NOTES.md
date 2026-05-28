# MRF Parser Feasibility Notes

**Purpose.** Capture format quirks observed across real hospital MRFs during the Phase A parser spike, so the real parser in Phase C is built against known variance rather than the idealized CMS spec.

**Method.** Pick 5 hospitals across 5 different EHR vendors. Download each MRF by hand into `pipeline/parse/samples/` (gitignored). Use DuckDB to extract a hospital identifier, ~5 procedure codes, and prices by `charge_type`. Capture every quirk that would break a naive parser.

---

## Target vendor coverage

| Slot | Vendor | Example hospital | CCN | MRF URL | Status |
|---|---|---|---|---|---|
| 1 | Epic | _TBD_ | | | not started |
| 2 | Cerner | _TBD_ | | | not started |
| 3 | Meditech | _TBD_ | | | not started |
| 4 | Allscripts | _TBD_ | | | not started |
| 5 | In-house / other | _TBD_ | | | not started |

---

## Per-hospital findings

### Template

```
Hospital: <name> (CCN <ccn>, vendor: <vendor>)
MRF URL: <url>
File format: <json/csv/xml>, <size MB>
CMS template version: <v2.x / legacy / non-compliant>

What worked:
- ...

Quirks / blockers:
- ...

Sample extracted record:
{ procedure_code: "...", charge_type: "...", amount: ..., payer: "..." }
```

### Findings will go below as the spike runs

_None yet._

---

## Cross-cutting observations

_Populate as patterns emerge across hospitals._

- Format coverage needed for v1:
- Common quirks to design parser around:
- Edge cases that need explicit handling:
- Hospitals that are non-compliant or unparseable (note for `refresh_tier` and quality-score implications):

---

## Quality-scoring rubric (drafted Phase B)

To be defined in Phase B; reference: PROJECT_BRIEF.md Section 5 ("compute quality score (% expected fields populated, presence of negotiated rates, presence of cash price)").
