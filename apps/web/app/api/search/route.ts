import { sql } from "@/lib/db";
import { titleCase } from "@/lib/format";

export const revalidate = 3600; // cache the index, rebuilt hourly

export async function GET() {
  const procs = (await sql`
    SELECT DISTINCT p.slug, p.name, p.code
    FROM procedures p
    JOIN procedure_hospital_summary s ON s.procedure_id = p.id
    JOIN hospitals h ON h.id = s.hospital_id
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean
    ORDER BY p.name`) as { slug: string; name: string; code: string }[];

  const hospitals = (await sql`
    SELECT h.ccn, h.name, h.city, h.state
    FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean
    ORDER BY h.name`) as { ccn: string; name: string; city: string; state: string }[];

  const index = [
    ...procs.map((p) => ({ t: "p", nm: p.name, meta: `CPT ${p.code}`, href: `/procedure/${p.slug}` })),
    ...hospitals.map((h) => ({
      t: "h",
      nm: titleCase(h.name),
      meta: `${titleCase(h.city)}, ${h.state.toUpperCase()}`,
      href: `/hospital/${h.ccn}`,
    })),
  ];

  return Response.json(index);
}
