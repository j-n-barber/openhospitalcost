import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { sql } from "@/lib/db";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { STATE_NAMES } from "@/lib/states";
import { titleCase, titleCaseProcedure } from "@/lib/format";
import FilterableProcedures from "@/components/FilterableProcedures";
import { MoneyRail } from "@/components/MoneyRail";

export const revalidate = 3600;
const ADSENSE_ON = !!process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

type Params = { params: Promise<{ ccn: string }> };
type Hosp = {
  id: string; name: string; city: string; state: string; beds: number | null;
  url: string | null; as_of: string | null; quality_score: number | null; eligible: boolean | null;
  proc_count: number | null;
};
type Row = {
  slug: string; name: string; category: string | null; code_type: string | null;
  negotiated: number | null; neg_lo: number | null; neg_hi: number | null;
  payers: number | null; cash: number | null; gross: number | null;
};

async function getHospital(ccn: string): Promise<Hosp | null> {
  const r = (await sql`
    SELECT h.id, h.name, h.city, h.state, h.beds,
      f.url, f.parsed_at::date AS as_of, f.quality_score,
      (f.quality_metrics->>'eligibleForMoneyPages')::boolean AS eligible,
      (SELECT count(DISTINCT s.procedure_id) FROM procedure_hospital_summary s WHERE s.hospital_id = h.id)::int AS proc_count
    FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE h.ccn = ${ccn}`) as Hosp[];
  return r[0] ?? null;
}

async function getProcedures(hospitalId: string): Promise<Row[]> {
  const rows = (await sql`
    SELECT p.slug, p.name, p.category, p.code_type,
      max(CASE WHEN s.charge_type = 'negotiated' THEN s.amount END)::float      AS negotiated,
      max(CASE WHEN s.charge_type = 'negotiated' THEN s.min_amount END)::float  AS neg_lo,
      max(CASE WHEN s.charge_type = 'negotiated' THEN s.max_amount END)::float  AS neg_hi,
      max(CASE WHEN s.charge_type = 'negotiated' THEN s.payer_count END)::int   AS payers,
      max(CASE WHEN s.charge_type = 'discounted_cash' THEN s.amount END)::float AS cash,
      max(CASE WHEN s.charge_type = 'gross' THEN s.amount END)::float           AS gross
    FROM procedure_hospital_summary s
    JOIN procedures p ON p.id = s.procedure_id
    WHERE s.hospital_id = ${hospitalId}
    GROUP BY p.slug, p.name, p.category, p.code_type
    ORDER BY max(p.search_priority) DESC NULLS LAST, p.name`) as Row[];
  return rows.map((r) => ({ ...r, name: titleCaseProcedure(r.name) }));
}

// Other hospitals in the same state with published data — rail (comparison + links).
async function getRelatedHospitals(state: string, ccn: string): Promise<{ ccn: string; name: string }[]> {
  const r = (await sql`
    SELECT h.ccn, h.name
    FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE lower(h.state) = ${state.toLowerCase()} AND h.ccn <> ${ccn}
      AND (f.quality_metrics->>'eligibleForMoneyPages')::boolean
    ORDER BY h.beds DESC NULLS LAST LIMIT 6`) as { ccn: string; name: string }[];
  return r.map((x) => ({ ...x, name: titleCase(x.name) }));
}

export async function generateStaticParams() {
  const rows = (await sql`
    SELECT h.ccn
    FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean`) as { ccn: string }[];
  return rows.map((r) => ({ ccn: r.ccn }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { ccn } = await params;
  const h = await getHospital(ccn);
  if (!h) return { title: "Hospital — OpenHospitalCost" };
  // Keep ultra-thin pages (<5 procedures) out of the index so crawlers and ad
  // review focus on substantive pages; still follow their links.
  const thin = (h.proc_count ?? 0) < 5;
  return {
    title: `${titleCase(h.name)} — prices | OpenHospitalCost`,
    description: `Real negotiated, cash, and gross prices at ${titleCase(h.name)}, ${titleCase(h.city)}, ${h.state.toUpperCase()}, sourced from its machine-readable file.`,
    alternates: { canonical: `/hospital/${ccn}` },
    ...(thin ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function HospitalPage({ params }: Params) {
  const { ccn } = await params;
  const h = await getHospital(ccn);
  if (!h || !h.eligible) notFound();
  const rows = await getProcedures(h.id);
  const stateName = STATE_NAMES[h.state.toLowerCase()] ?? h.state.toUpperCase();
  const related = await getRelatedHospitals(h.state, ccn);
  const showRail = related.length > 0 || ADSENSE_ON;

  const ld = {
    "@context": "https://schema.org",
    "@type": "Hospital",
    name: titleCase(h.name),
    address: {
      "@type": "PostalAddress",
      addressLocality: titleCase(h.city),
      addressRegion: h.state.toUpperCase(),
      addressCountry: "US",
    },
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://openhospitalcost.com/" },
      { "@type": "ListItem", position: 2, name: stateName, item: `https://openhospitalcost.com/state/${h.state.toLowerCase()}` },
      { "@type": "ListItem", position: 3, name: titleCase(h.name), item: `https://openhospitalcost.com/hospital/${ccn}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]).replace(/</g, "\\u003c") }} />
      <SiteHeader />
      <main className="wrap">
        <section className="pagehead">
          <div className="crumb">
            <a href="/">Home</a> / <a href={`/state/${h.state.toLowerCase()}`}>{stateName}</a> / {titleCase(h.name)}
          </div>
          <h1>{titleCase(h.name)}</h1>
          <p className="sub">
            {titleCase(h.city)}, {h.state.toUpperCase()}
            {h.beds ? ` · ${h.beds} beds` : ""}
            {" · "}{rows.length} procedure{rows.length !== 1 ? "s" : ""} priced
          </p>
          <p className="prov" style={{ margin: "8px 0 0" }}>
            Sourced from this hospital&apos;s machine-readable file
            {h.as_of ? `, posted ${h.as_of}` : ""}
            {h.quality_score != null ? ` · data quality ${h.quality_score}/100` : ""}
            {h.url ? <> · <a href={h.url} target="_blank" rel="noopener noreferrer">source file ↗</a></> : null}
          </p>
        </section>

        {showRail ? (
          <div className="moneygrid">
            <div className="mg-main">
              <FilterableProcedures rows={rows} />
              <p className="prov">Median facility price per procedure. Negotiated shows the median across payers with the full range. Figures as reported in the hospital&apos;s file — not a quote.</p>
            </div>
            <MoneyRail title={`Other hospitals in ${stateName}`} items={related.map((r) => ({ href: `/hospital/${r.ccn}`, label: r.name }))} />
          </div>
        ) : (
          <>
            <FilterableProcedures rows={rows} />
            <p className="prov">Median facility price per procedure. Negotiated shows the median across payers with the full range. Figures as reported in the hospital&apos;s file — not a quote.</p>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
