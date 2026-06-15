import type { MetadataRoute } from "next";
import { sql } from "@/lib/db";
import { GUIDES } from "@/lib/guides";

const BASE = "https://openhospitalcost.com";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const states = (await sql`
    SELECT DISTINCT lower(h.state) AS code
    FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean`) as { code: string }[];

  const procs = (await sql`
    SELECT p.slug, max(f.parsed_at)::date::text AS lastmod
    FROM procedures p
    JOIN procedure_hospital_summary s ON s.procedure_id = p.id
    JOIN hospitals h ON h.id = s.hospital_id
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean
    GROUP BY p.slug`) as { slug: string; lastmod: string }[];

  // States with a real per-state report (>= 6 eligible hospitals on some
  // procedure), matching the page's render threshold so we never list a 404.
  const reportStates = (await sql`
    SELECT code FROM (
      SELECT lower(h.state) AS code, s.procedure_id, count(*)::int AS n
      FROM procedure_hospital_summary s
      JOIN hospitals h ON h.id = s.hospital_id
      JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
      WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean AND s.charge_type = 'negotiated'
      GROUP BY 1, 2
    ) t WHERE n >= 6
    GROUP BY code`) as { code: string }[];

  // Match the hospital page's noindex rule exactly (else GSC flags "Submitted URL
  // marked noindex"): index only hospitals with >=5 priced procedures AND >=100
  // beds. Smaller hospitals stay noindex,follow and out of the sitemap. Carry
  // parsed_at as lastmod for freshness.
  const hosps = (await sql`
    SELECT h.ccn, f.parsed_at::date::text AS lastmod
    FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean
      AND h.beds >= 100
      AND (SELECT count(DISTINCT s.procedure_id) FROM procedure_hospital_summary s WHERE s.hospital_id = h.id) >= 5`) as { ccn: string; lastmod: string }[];

  return [
    { url: BASE, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/procedures`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/hospitals`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/reports`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/states`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/guides`, changeFrequency: "weekly", priority: 0.7 },
    ...GUIDES.map((g) => ({ url: `${BASE}/guides/${g.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${BASE}/how-it-works`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/methodology`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/data`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/corrections`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/contact`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.2 },
    ...states.map((s) => ({ url: `${BASE}/state/${s.code}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...reportStates.map((s) => ({ url: `${BASE}/reports/state/${s.code}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...procs.map((p) => ({ url: `${BASE}/procedure/${p.slug}`, lastModified: p.lastmod, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...hosps.map((h) => ({ url: `${BASE}/hospital/${h.ccn}`, lastModified: h.lastmod, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
