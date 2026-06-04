import { sql } from "@/lib/db";

// Shared report queries used by both the /reports page and the monthly
// newsletter, so the two never drift. Robust per-procedure stats across
// hospitals (10th–90th percentile, not min/max, so placeholder outliers can't
// distort the story).

export type Swing = { slug: string; name: string; n: number; p10: number; p50: number; p90: number };
export type Priciest = { slug: string; name: string; p50: number; n: number };
export type Saving = { slug: string; name: string; cash: number; gross: number };

export async function getSwings(limit = 10, minN = 40): Promise<Swing[]> {
  return (await sql`
    SELECT p.slug, p.name, count(*)::int AS n,
      percentile_cont(0.1) WITHIN GROUP (ORDER BY s.amount)::float AS p10,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY s.amount)::float AS p50,
      percentile_cont(0.9) WITHIN GROUP (ORDER BY s.amount)::float AS p90
    FROM procedure_hospital_summary s JOIN procedures p ON p.id = s.procedure_id
    WHERE s.charge_type = 'negotiated'
    GROUP BY p.slug, p.name HAVING count(*) >= ${minN}
    ORDER BY (percentile_cont(0.9) WITHIN GROUP (ORDER BY s.amount))
           / NULLIF(percentile_cont(0.1) WITHIN GROUP (ORDER BY s.amount), 0) DESC
    LIMIT ${limit}`) as Swing[];
}

export async function getPriciest(limit = 8, minN = 40): Promise<Priciest[]> {
  return (await sql`
    SELECT p.slug, p.name, count(*)::int AS n,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY s.amount)::float AS p50
    FROM procedure_hospital_summary s JOIN procedures p ON p.id = s.procedure_id
    WHERE s.charge_type = 'negotiated'
    GROUP BY p.slug, p.name HAVING count(*) >= ${minN}
    ORDER BY p50 DESC LIMIT ${limit}`) as Priciest[];
}

export async function getSavings(limit = 8, minN = 40): Promise<Saving[]> {
  return (await sql`
    SELECT p.slug, p.name,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY s.amount) FILTER (WHERE s.charge_type = 'discounted_cash')::float AS cash,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY s.amount) FILTER (WHERE s.charge_type = 'gross')::float AS gross
    FROM procedure_hospital_summary s JOIN procedures p ON p.id = s.procedure_id
    GROUP BY p.slug, p.name
    HAVING count(*) FILTER (WHERE s.charge_type = 'discounted_cash') >= ${minN}
       AND count(*) FILTER (WHERE s.charge_type = 'gross') >= ${minN}
    ORDER BY (percentile_cont(0.5) WITHIN GROUP (ORDER BY s.amount) FILTER (WHERE s.charge_type = 'gross'))
           / NULLIF(percentile_cont(0.5) WITHIN GROUP (ORDER BY s.amount) FILTER (WHERE s.charge_type = 'discounted_cash'), 0) DESC
    LIMIT ${limit}`) as Saving[];
}

export async function getHospitalCount(): Promise<number> {
  const r = (await sql`
    SELECT count(*)::int AS n FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean`) as { n: number }[];
  return r[0]?.n ?? 0;
}
