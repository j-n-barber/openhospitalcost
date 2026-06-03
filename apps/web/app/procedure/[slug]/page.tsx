import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { sql } from "@/lib/db";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { titleCase, titleCaseProcedure } from "@/lib/format";
import FilterableHospitalPrices from "@/components/FilterableHospitalPrices";

export const revalidate = 3600;

type Params = { params: Promise<{ slug: string }> };
type Proc = { name: string; code: string; description: string | null; category: string | null };
type Row = {
  ccn: string; name: string; city: string; state: string;
  negotiated: number | null; neg_lo: number | null; neg_hi: number | null;
  payers: number | null; cash: number | null; gross: number | null;
};

async function getProcedure(slug: string): Promise<Proc | null> {
  const r = (await sql`SELECT name, code, description, category FROM procedures WHERE slug = ${slug}`) as Proc[];
  if (!r[0]) return null;
  return { ...r[0], name: titleCaseProcedure(r[0].name) };
}

async function getHospitalPrices(slug: string): Promise<Row[]> {
  return (await sql`
    SELECT h.ccn, h.name, h.city, h.state,
      max(CASE WHEN s.charge_type = 'negotiated' THEN s.amount END)::float      AS negotiated,
      max(CASE WHEN s.charge_type = 'negotiated' THEN s.min_amount END)::float  AS neg_lo,
      max(CASE WHEN s.charge_type = 'negotiated' THEN s.max_amount END)::float  AS neg_hi,
      max(CASE WHEN s.charge_type = 'negotiated' THEN s.payer_count END)::int   AS payers,
      max(CASE WHEN s.charge_type = 'discounted_cash' THEN s.amount END)::float AS cash,
      max(CASE WHEN s.charge_type = 'gross' THEN s.amount END)::float           AS gross
    FROM procedure_hospital_summary s
    JOIN procedures p ON p.id = s.procedure_id
    JOIN hospitals h ON h.id = s.hospital_id
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE p.slug = ${slug} AND (f.quality_metrics->>'eligibleForMoneyPages')::boolean
    GROUP BY h.ccn, h.name, h.city, h.state
    ORDER BY payers DESC NULLS LAST, negotiated ASC NULLS LAST`) as Row[];
}

export async function generateStaticParams() {
  const rows = (await sql`
    SELECT DISTINCT p.slug
    FROM procedures p
    JOIN procedure_hospital_summary s ON s.procedure_id = p.id
    JOIN hospitals h ON h.id = s.hospital_id
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean`) as { slug: string }[];
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const proc = await getProcedure(slug);
  if (!proc) return { title: "Procedure — OpenHospitalCost" };
  return {
    title: `${proc.name} — hospital prices compared | OpenHospitalCost`,
    description: `Real negotiated, cash, and gross prices for ${proc.name} (CPT ${proc.code}) across hospitals, sourced from machine-readable files.`,
    alternates: { canonical: `/procedure/${slug}` },
  };
}

export default async function ProcedurePage({ params }: Params) {
  const { slug } = await params;
  const proc = await getProcedure(slug);
  if (!proc) notFound();
  const rows = await getHospitalPrices(slug);
  if (!rows.length) notFound();

  const ld = {
    "@context": "https://schema.org",
    "@type": "MedicalProcedure",
    name: proc.name,
    ...(proc.description ? { description: proc.description } : {}),
    code: { "@type": "MedicalCode", code: proc.code, codingSystem: "CPT" },
    offers: rows.filter((r) => r.negotiated != null).slice(0, 20).map((r) => ({
      "@type": "Offer",
      price: r.negotiated,
      priceCurrency: "USD",
      seller: { "@type": "Hospital", name: titleCase(r.name) },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <SiteHeader />
      <main className="wrap">
        <section className="pagehead">
          <div className="crumb"><a href="/">Home</a> / <a href="/procedures">Procedures</a> / {proc.name}</div>
          <h1>{proc.name}</h1>
          <p className="sub">
            <span className="mono" style={{ color: "var(--teal)" }}>CPT {proc.code}</span>
            {proc.description ? ` · ${proc.description}` : ""}
          </p>
          <p className="sub">
            Facility prices across {rows.length} hospital{rows.length > 1 ? "s" : ""} with published data — sorted cheapest-first by default. Filter or re-sort below; the same procedure can swing widely between hospitals.
          </p>
        </section>

        <FilterableHospitalPrices rows={rows} />
        <p className="prov">Median facility price per hospital, sourced from each hospital&apos;s machine-readable file. Negotiated shows the median across payers with the full range.</p>
      </main>
      <SiteFooter />
    </>
  );
}
