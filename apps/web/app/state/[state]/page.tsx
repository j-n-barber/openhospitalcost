import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { sql } from "@/lib/db";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { STATE_NAMES } from "@/lib/states";
import { titleCaseProcedure } from "@/lib/format";
import FilterableHospitals from "@/components/FilterableHospitals";
import { MoneyRail } from "@/components/MoneyRail";

export const revalidate = 3600;
const ADSENSE_ON = !!process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

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

// Most-covered procedures overall — rail ("what can I price?" cross-nav).
async function getPopularProcedures(): Promise<{ slug: string; name: string }[]> {
  const r = (await sql`
    SELECT p.slug, p.name, count(DISTINCT s.hospital_id)::int AS n
    FROM procedures p
    JOIN procedure_hospital_summary s ON s.procedure_id = p.id
    JOIN hospitals h ON h.id = s.hospital_id
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean
    GROUP BY p.slug, p.name ORDER BY n DESC LIMIT 6`) as { slug: string; name: string; n: number }[];
  return r.map((x) => ({ slug: x.slug, name: titleCaseProcedure(x.name) }));
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
  const related = await getPopularProcedures();
  const showRail = related.length > 0 || ADSENSE_ON;

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
          {hospitals.length >= 6 && (
            <p style={{ margin: "4px 0 0" }}>
              <a href={`/reports/state/${code}`}>See the {name} price report →</a>
            </p>
          )}
        </section>

        {showRail ? (
          <div className="moneygrid">
            <div className="mg-main">
              <FilterableHospitals hospitals={hospitals} stateCode={code} />
            </div>
            <MoneyRail title="Popular procedures" items={related.map((r) => ({ href: `/procedure/${r.slug}`, label: r.name }))} />
          </div>
        ) : (
          <FilterableHospitals hospitals={hospitals} stateCode={code} />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
