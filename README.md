# OpenHospitalCost

Consumer-facing hospital price transparency site, retired 2026-07-01 over AMA/CPT licensing (see [docs/CPT_LICENSING.md](docs/CPT_LICENSING.md)). What's left is a case study: a self-contained scrollytelling explainer of the real 8-stage ingestion pipeline that used to run here, plus a few static pages.

See [docs/PROJECT_BRIEF.md](docs/PROJECT_BRIEF.md) for the original project brief and `docs/` generally for how the pipeline worked — the code that ran it has been removed, but the methodology (discovery, parsing, quality rubric, licensing story) is documented there.

## Repo layout

```
apps/web/        # Next.js app — case-study explainer (served at "/") + /about /privacy /terms
db/migrations/   # Schema history of the retired product (reference only, DB is gone)
data/            # Canonical reference data (procedure dictionary)
docs/            # Project brief, methodology, quality rubric, licensing writeup
brand/           # Brand palette/type — still followed by apps/web
.github/workflows/  # CI (builds apps/web)
```

## Local setup

```sh
cd apps/web
npm install
npm run dev
```

## Stack

Vercel · Next.js App Router.

## License

TBD.
