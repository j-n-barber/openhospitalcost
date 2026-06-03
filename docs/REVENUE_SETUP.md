# Revenue setup — analytics + ads (flip-the-switch)

Everything below is **pre-staged and inert** until you add the env vars, so it
has zero effect on the site until you're ready. Do this after the site is
deployed and verified.

## 1. Analytics (Google Analytics 4) — ~2 min, do first
Measure traffic from day one so you can see what's getting indexed/visited.
1. analytics.google.com → create a GA4 property for `openhospitalcost.com` → copy
   the Measurement ID (`G-XXXXXXXXXX`).
2. Vercel → Project → Settings → Environment Variables → add
   `NEXT_PUBLIC_GA_ID = G-XXXXXXXXXX` → redeploy.
3. Done — `components/Analytics.tsx` (already wired into the root layout) starts
   loading gtag site-wide.

> Privacy note: if you'd rather use a cookieless analytics tool (Plausible/Umami),
> the same pattern applies — swap the component; the rest stays.

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
- `components/Analytics.tsx` — GA4 loader (gated on `NEXT_PUBLIC_GA_ID`)
- `components/AdSense.tsx` — AdSense script (gated on `NEXT_PUBLIC_ADSENSE_CLIENT`)
- `components/AdSlot.tsx` — a single ad unit (gated on client + `slot`)
- both loaders are already rendered in `app/layout.tsx`
