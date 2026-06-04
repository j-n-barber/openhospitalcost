import type { MetadataRoute } from "next";
import { sql } from "@/lib/db";

const BASE = "https://openhospitalcost.com";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const states = (await sql`
    SELECT DISTINCT lower(h.state) AS code
    FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean`) as { code: string }[];

  const procs = (await sql`
    SELECT DISTINCT p.slug
    FROM procedures p
    JOIN procedure_hospital_summary s ON s.procedure_id = p.id
    JOIN hospitals h ON h.id = s.hospital_id
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean`) as { slug: string }[];

  const hosps = (await sql`
    SELECT h.ccn
    FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean`) as { ccn: string }[];

  return [
    { url: BASE, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/procedures`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/hospitals`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/states`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/how-it-works`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/methodology`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/data`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/corrections`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/contact`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/terms`, changeFrequency: "yearly", priority: 0.2 },
    ...states.map((s) => ({ url: `${BASE}/state/${s.code}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...procs.map((p) => ({ url: `${BASE}/procedure/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...hosps.map((h) => ({ url: `${BASE}/hospital/${h.ccn}`, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
