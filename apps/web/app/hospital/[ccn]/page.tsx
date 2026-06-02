import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { sql } from "@/lib/db";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { STATE_NAMES } from "@/lib/states";
import { titleCase, usd } from "@/lib/format";

export const revalidate = 3600;

type Params = { params: Promise<{ ccn: string }> };
type Hosp = {
  id: string; name: string; city: string; state: string; beds: number | null;
  url: string | null; as_of: string | null; quality_score: number | null; eligible: boolean | null;
};
type Row = {
  slug: string; name: string; code: string;
  negotiated: number | null; neg_lo: number | null; neg_hi: number | null;
  payers: number | null; cash: number | null; gross: number | null;
};

async function getHospital(ccn: string): Promise<Hosp | null> {
  const r = (await sql`
    SELECT h.id, h.name, h.city, h.state, h.beds,
      f.url, f.parsed_at::date AS as_of, f.quality_score,
      (f.quality_metrics->>'eligibleForMoneyPages')::boolean AS eligible
    FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE h.ccn = ${ccn}`) as Hosp[];
  return r[0] ?? null;
}

async function getProcedures(hospitalId: string): Promise<Row[]> {
  return (await sql`
    SELECT p.slug, p.name, p.code,
      max(CASE WHEN s.charge_type = 'negotiated' THEN s.amount END)::float      AS negotiated,
      max(CASE WHEN s.charge_type = 'negotiated' THEN s.min_amount END)::float  AS neg_lo,
      max(CASE WHEN s.charge_type = 'negotiated' THEN s.max_amount END)::float  AS neg_hi,
      max(CASE WHEN s.charge_type = 'negotiated' THEN s.payer_count END)::int   AS payers,
      max(CASE WHEN s.charge_type = 'discounted_cash' THEN s.amount END)::float AS cash,
      max(CASE WHEN s.charge_type = 'gross' THEN s.amount END)::float           AS gross
    FROM procedure_hospital_summary s
    JOIN procedures p ON p.id = s.procedure_id
    WHERE s.hospital_id = ${hospitalId}
    GROUP BY p.slug, p.name, p.code
    ORDER BY max(p.search_priority) DESC NULLS LAST, p.name`) as Row[];
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
  return {
    title: `${titleCase(h.name)} — prices | OpenHospitalCost`,
    description: `Real negotiated, cash, and gross prices at ${titleCase(h.name)}, ${titleCase(h.city)}, ${h.state.toUpperCase()}, sourced from its machine-readable file.`,
  };
}

const money = (n: number | null) => (n == null ? "—" : usd(n));

export default async function HospitalPage({ params }: Params) {
  const { ccn } = await params;
  const h = await getHospital(ccn);
  if (!h || !h.eligible) notFound();
  const rows = await getProcedures(h.id);

  const stateName = STATE_NAMES[h.state.toLowerCase()] ?? h.state.toUpperCase();

  return (
    <>
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

        <table className="ptable">
          <thead>
            <tr>
              <th>Procedure</th>
              <th style={{ textAlign: "right" }}>Negotiated (median)</th>
              <th style={{ textAlign: "right" }}>Cash</th>
              <th style={{ textAlign: "right" }}>Gross</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug}>
                <td><a href={`/procedure/${r.slug}`}>{r.name}</a> <span className="rng mono">CPT {r.code}</span></td>
                <td className="num">
                  {money(r.negotiated)}
                  {r.neg_lo != null && r.neg_hi != null && r.neg_lo !== r.neg_hi && (
                    <div className="rng">{usd(r.neg_lo)}–{usd(r.neg_hi)} · {r.payers ?? 0} payers</div>
                  )}
                </td>
                <td className="num">{money(r.cash)}</td>
                <td className="num">{money(r.gross)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="prov">Median facility price per procedure. Negotiated shows the median across payers with the full range. Figures as reported in the hospital&apos;s file — not a quote.</p>
      </main>
      <SiteFooter />
    </>
  );
}
