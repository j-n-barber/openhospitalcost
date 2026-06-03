import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { sql } from "@/lib/db";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { STATE_NAMES } from "@/lib/states";
import FilterableHospitals from "@/components/FilterableHospitals";

export const revalidate = 3600;

type Hosp = { ccn: string; name: string; city: string; procedures: number };
type Params = { params: Promise<{ state: string }> };

async function getHospitals(code: string): Promise<Hosp[]> {
  return (await sql`
    SELECT h.ccn, h.name, h.city, count(DISTINCT s.procedure_id)::int AS procedures
    FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    LEFT JOIN procedure_hospital_summary s ON s.hospital_id = h.id
    WHERE lower(h.state) = ${code} AND (f.quality_metrics->>'eligibleForMoneyPages')::boolean
    GROUP BY h.ccn, h.name, h.city
    ORDER BY procedures DESC, h.name`) as Hosp[];
}

// Pre-render only states that actually have eligible data (no thin/empty pages).
export async function generateStaticParams() {
  const rows = (await sql`
    SELECT DISTINCT lower(h.state) AS state
    FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean`) as { state: string }[];
  return rows.map((r) => ({ state: r.state }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { state } = await params;
  const name = STATE_NAMES[state.toLowerCase()] ?? state.toUpperCase();
  return {
    title: `Hospital prices in ${name} — OpenHospitalCost`,
    description: `Compare real gross, cash, and negotiated hospital prices across ${name}, sourced from each hospital's machine-readable file.`,
    alternates: { canonical: `/state/${state.toLowerCase()}` },
  };
}

export default async function StatePage({ params }: Params) {
  const { state } = await params;
  const code = state.toLowerCase();
  const name = STATE_NAMES[code];
  if (!name) notFound();

  const hospitals = await getHospitals(code);
  if (!hospitals.length) notFound();

  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <section className="pagehead">
          <div className="crumb"><a href="/">Home</a> / {name}</div>
          <h1>Hospital prices in {name}</h1>
          <p className="sub">
            {hospitals.length} hospital{hospitals.length > 1 ? "s" : ""} with published, machine-readable prices.
            Pick one to see its negotiated, cash, and gross rates by procedure.
          </p>
        </section>

        <FilterableHospitals hospitals={hospitals} stateCode={code} />
      </main>
      <SiteFooter />
    </>
  );
}
