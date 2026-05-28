# OpenHospitalCost

National consumer-facing hospital price transparency site. Per-hospital prices from federally mandated Machine-Readable Files (MRFs), cited back to source.

See [docs/PROJECT_BRIEF.md](docs/PROJECT_BRIEF.md) for the full project brief.

## Status

Phase A — Foundation. Repo scaffolded, schema migration written, procedure dictionary seeded.

## Repo layout

```
apps/web/        # Next.js App Router site (Phase D)
pipeline/        # Ingestion: discovery, fetch, parse, normalize, quality
db/              # Migrations and seed scripts
data/            # Canonical reference data (procedure dictionary)
docs/            # Project brief, schema notes, parser notes, style guides
.github/workflows/  # CI + scheduled ingestion crons
```

## Local setup

```sh
# 1. Install deps
npm install

# 2. Copy env template and fill in Neon connection strings
cp .env.example .env
# edit .env

# 3. Apply migrations to the dev branch first
DATABASE_URL="$DATABASE_URL_DEV" npm run migrate:up

# 4. Seed the procedure dictionary
DATABASE_URL="$DATABASE_URL_DEV" npm run seed:procedures

# 5. When dev is green, run the same against the main branch
npm run migrate:up
npm run seed:procedures
```

## Stack

Vercel (Phase D) · Next.js App Router · Neon Postgres · Cloudflare R2 · DuckDB · GitHub Actions · MiniSearch · Plausible.

## License

TBD — defer until v1 launch.
