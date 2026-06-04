import type { Metadata } from "next";
import { sql } from "@/lib/db";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ProcedureIndex, { type ProcIndexRow } from "@/components/ProcedureIndex";
import { titleCaseProcedure } from "@/lib/format";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Browse procedures by price — OpenHospitalCost",
  description:
    "Compare real negotiated, cash, and gross hospital prices for common shoppable procedures, aggregated across hospitals from their machine-readable files.",
};

// National per-procedure aggregate over hospitals with money-page-eligible data:
// median of each hospital's facility median, plus the low–high spread between hospitals.
async function getProcedures(): Promise<ProcIndexRow[]> {
  const rows = (await sql`
    SELECT p.slug, p.name, p.category,
      count(DISTINCT s.hospital_id)::int AS hospitals,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY s.amount) FILTER (WHERE s.charge_type = 'negotiated')::float      AS negotiated,
      min(s.amount) FILTER (WHERE s.charge_type = 'negotiated')::float                                              AS neg_lo,
      max(s.amount) FILTER (WHERE s.charge_type = 'negotiated')::float                                              AS neg_hi,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY s.amount) FILTER (WHERE s.charge_type = 'discounted_cash')::float AS cash,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY s.amount) FILTER (WHERE s.charge_type = 'gross')::float           AS gross
    FROM procedures p
    JOIN procedure_hospital_summary s ON s.procedure_id = p.id
    JOIN hospitals h ON h.id = s.hospital_id
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean
    GROUP BY p.slug, p.name, p.category
    ORDER BY hospitals DESC, p.name`) as ProcIndexRow[];
  return rows.map((r) => ({ ...r, name: titleCaseProcedure(r.name) }));
}

export default async function ProceduresPage() {
  const rows = await getProcedures();

  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <section className="pagehead">
          <div className="crumb"><a href="/">Home</a> / Procedures</div>
          <h1>Browse procedures by price</h1>
          <p className="sub">
            {rows.length} shoppable procedure{rows.length !== 1 ? "s" : ""}{" "}with published prices across hospitals.
            Pick one to compare every hospital&apos;s negotiated, cash, and gross rate.
          </p>
        </section>

        <ProcedureIndex rows={rows} />
        <p className="prov">
          National figures are the median of each hospital&apos;s facility median; the range shows the spread between hospitals.
          Sourced from each hospital&apos;s machine-readable file — not a quote.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
