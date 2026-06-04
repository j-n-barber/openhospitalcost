# Revenue setup — analytics + ads (flip-the-switch)

Everything below is **pre-staged and inert** until you add the env vars, so it
has zero effect on the site until you're ready. Do this after the site is
deployed and verified.

## 1. Analytics (Vercel Analytics) — already wired, just enable
We use **Vercel Analytics** (`@vercel/analytics`). The `<Analytics/>` component is
already in the root layout, so there's **no key/env var** — you just turn it on:
1. Vercel → Project → **Analytics** tab → **Enable**.
2. Redeploy (or it picks up on the next deploy). Done — page views start flowing.

> It's privacy-friendly (no cookie banner needed) and free at low volume; usage
> beyond the free tier is billed by Vercel. If you later want funnel/event depth
> or AdSense-ecosystem reporting, GA4 can be added alongside it.

## 2. Ads (Google AdSense) — after you have some traffic
AdSense won't approve an empty/no-traffic site, so launch + get indexed first.
1. adsense.google.com → add site `openhospitalcost.com` → get your publisher id
   (`ca-pub-XXXXXXXXXXXXXXXX`).
2. Vercel env: `NEXT_PUBLIC_ADSENSE_CLIENT = ca-pub-...` → redeploy. This loads
   the AdSense script (`components/AdSense.tsx`, wired in the layout). Submit the
   site for review in AdSense.
3. After approval, create ad units in AdSense → each gives a **slot id**. Drop
   units into pages with the staged component:
   ```tsx
   import { AdSlot } from "@/components/AdSlot";
   // ...in a page, e.g. below the price table on hospital/[ccn] or procedure/[slug]:
   <AdSlot slot="1234567890" className="my-8" />
   ```
   `AdSlot` renders nothing until both the client id and a `slot` are set, so you
   can place them whenever. **Placement is intentionally left to you** — it
   touches the money-page design, and a couple of well-placed units (e.g. below
   the fold on hospital + procedure pages) beat many. Mind AdSense policy on
   ad density.

## 3. Affiliate (later)
No partner wired yet (depends on what you sign up for — e.g. health-savings
cards, Rx discount programs, insurance lead-gen). When you pick one, the cleanest
spot is a small, clearly-labeled module on the procedure/hospital pages near the
price context. Keep it disclosed (FTC) and visually distinct from the data.

## Files
- Analytics: `@vercel/analytics/next` `<Analytics/>` in `app/layout.tsx` (enable in dashboard)
- `components/AdSense.tsx` — AdSense script (gated on `NEXT_PUBLIC_ADSENSE_CLIENT`)
- `components/AdSlot.tsx` — a single ad unit (gated on client + `slot`)
