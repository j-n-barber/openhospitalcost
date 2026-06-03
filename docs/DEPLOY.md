# Deploy to production (Vercel) — launch checklist

The site is built and the production build passes (~1,080 pages: 931 hospitals +
100 procedures + 51 states + statics, all from live Neon data). It is **not yet
deployed** — `openhospitalcost.com` returns Vercel's `DEPLOYMENT_NOT_FOUND`, i.e.
DNS points at Vercel but no project serves it. This is the only launch blocker.

Needs your Vercel login (can't be automated). ~5–10 minutes.

## 1. Import the repo into Vercel
- New Project → import `github.com/j-n-barber/openhospitalcost`.
- **Root Directory: `apps/web`** (monorepo — this is the important one).
- Framework preset: Next.js (auto-detected). Build/Output: defaults.

## 2. Environment variables (Project → Settings → Environment Variables)
| Var | Required? | Value |
|---|---|---|
| `DATABASE_URL` | **Yes** | prod Neon pooled connection string (the one ingest writes to) |
| `RESEND_API_KEY` | optional | enables email on /contact + /corrections (forms still save to DB without it) |
| `RESEND_FROM` | optional | e.g. `OpenHospitalCost <contact@openhospitalcost.com>` (domain must be Resend-verified) |
| `FORM_NOTIFY_TO` | optional | your inbox for form notifications |

## 3. Deploy, then assign the domain
- Deploy. Confirm the build succeeds in Vercel (it does locally).
- Domains → add `openhospitalcost.com` (+ `www`). DNS already points at Vercel,
  so it should attach immediately.

## 4. Smoke-test
- `/` , `/hospitals`, `/hospital/100007` (AdventHealth Orlando), `/procedures`,
  `/state/fl`, `/sitemap.xml`, `/robots.txt`.

## 5. Get it indexed (the traffic engine)
- Google Search Console → add property `openhospitalcost.com` → verify (DNS TXT).
- Submit `https://openhospitalcost.com/sitemap.xml`.
- Bing Webmaster Tools → same (cheap extra coverage).

## Good to know
- Pages are **ISR** (`revalidate = 3600`). `generateStaticParams` pre-renders the
  current hospitals at build; **newly-ingested** hospitals are served on-demand
  (dynamicParams) and enter the sitemap within ~1h — so coverage keeps growing
  without a redeploy. A periodic redeploy just refreshes the pre-rendered set.
- Revenue wiring (analytics + ads/affiliate) is **not yet added** — it doesn't
  block launch/indexing; do it right after the site is live and verified.
