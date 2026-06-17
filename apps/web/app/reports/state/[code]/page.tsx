import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { sql } from "@/lib/db";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SubscribeForm from "@/components/SubscribeForm";
import { STATE_NAMES } from "@/lib/states";
import { titleCaseProcedure, usd } from "@/lib/format";

export const revalidate = 86400;

// Per-procedure thresholds. States have far fewer hospitals than the national
// set, so the bar to call a number "representative" is lower here than on the
// national report (which uses 40). 6 hospitals is enough for a meaningful spread
// without surfacing noise from one or two facilities.
const MIN_N = 6;

type Swing = { slug: string; name: string; n: number; p10: number; p50: number; p90: number };
type Priciest = { slug: string; name: string; p50: number; n: number };
type Saving = { slug: string; name: string; cash: number; gross: number };

async function getSwings(code: string): Promise<Swing[]> {
  return (await sql`
    SELECT p.slug, p.name, count(*)::int AS n,
      percentile_cont(0.1) WITHIN GROUP (ORDER BY s.amount)::float AS p10,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY s.amount)::float AS p50,
      percentile_cont(0.9) WITHIN GROUP (ORDER BY s.amount)::float AS p90
    FROM procedure_hospital_summary s
    JOIN procedures p ON p.id = s.procedure_id
    JOIN hospitals h ON h.id = s.hospital_id
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE lower(h.state) = ${code} AND (f.quality_metrics->>'eligibleForMoneyPages')::boolean
      AND s.charge_type = 'negotiated'
    GROUP BY p.slug, p.name HAVING count(*) >= ${MIN_N}
    ORDER BY (percentile_cont(0.9) WITHIN GROUP (ORDER BY s.amount))
           / NULLIF(percentile_cont(0.1) WITHIN GROUP (ORDER BY s.amount), 0) DESC
    LIMIT 8`) as Swing[];
}

async function getPriciest(code: string): Promise<Priciest[]> {
  return (await sql`
    SELECT p.slug, p.name, count(*)::int AS n,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY s.amount)::float AS p50
    FROM procedure_hospital_summary s
    JOIN procedures p ON p.id = s.procedure_id
    JOIN hospitals h ON h.id = s.hospital_id
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE lower(h.state) = ${code} AND (f.quality_metrics->>'eligibleForMoneyPages')::boolean
      AND s.charge_type = 'negotiated'
    GROUP BY p.slug, p.name HAVING count(*) >= ${MIN_N}
    ORDER BY p50 DESC LIMIT 6`) as Priciest[];
}

async function getSavings(code: string): Promise<Saving[]> {
  return (await sql`
    SELECT p.slug, p.name,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY s.amount) FILTER (WHERE s.charge_type = 'discounted_cash')::float AS cash,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY s.amount) FILTER (WHERE s.charge_type = 'gross')::float AS gross
    FROM procedure_hospital_summary s
    JOIN procedures p ON p.id = s.procedure_id
    JOIN hospitals h ON h.id = s.hospital_id
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE lower(h.state) = ${code} AND (f.quality_metrics->>'eligibleForMoneyPages')::boolean
    GROUP BY p.slug, p.name
    HAVING count(*) FILTER (WHERE s.charge_type = 'discounted_cash') >= ${MIN_N}
       AND count(*) FILTER (WHERE s.charge_type = 'gross') >= ${MIN_N}
    ORDER BY (percentile_cont(0.5) WITHIN GROUP (ORDER BY s.amount) FILTER (WHERE s.charge_type = 'gross'))
           / NULLIF(percentile_cont(0.5) WITHIN GROUP (ORDER BY s.amount) FILTER (WHERE s.charge_type = 'discounted_cash'), 0) DESC
    LIMIT 6`) as Saving[];
}

async function getHospitalCount(code: string): Promise<number> {
  const r = (await sql`
    SELECT count(*)::int AS n FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE lower(h.state) = ${code} AND (f.quality_metrics->>'eligibleForMoneyPages')::boolean`) as { n: number }[];
  return r[0]?.n ?? 0;
}

// Only pre-render states with enough eligible hospitals to produce a real report
// (avoids thin pages for states with one or two facilities).
export async function generateStaticParams() {
  const rows = (await sql`
    SELECT lower(h.state) AS code, count(*)::int AS n
    FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean
    GROUP BY lower(h.state) HAVING count(*) >= ${MIN_N}`) as { code: string; n: number }[];
  return rows.map((r) => ({ code: r.code }));
}

type Params = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params;
  const c = code.toLowerCase();
  const name = STATE_NAMES[c] ?? c.toUpperCase();
  return {
    title: `${name} Hospital Price Report — OpenHospitalCost`,
    description: `What hospitals charge across ${name}: the biggest price swings, the most expensive shoppable procedures, and where cash beats the list price — from machine-readable files.`,
    alternates: { canonical: `/reports/state/${c}` },
  };
}

export default async function StateReportPage({ params }: Params) {
  const { code } = await params;
  const c = code.toLowerCase();
  const name = STATE_NAMES[c];
  if (!name) notFound();

  const [swings, priciest, savings, hospitals] = await Promise.all([
    getSwings(c),
    getPriciest(c),
    getSavings(c),
    getHospitalCount(c),
  ]);

  // Nothing meaningful to show → don't publish a hollow page.
  if (!swings.length && !priciest.length && !savings.length) notFound();

  const proc = (s: { slug: string; name: string }) => (
    <a href={`/procedure/${s.slug}`}>{titleCaseProcedure(s.name)}</a>
  );

  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <section className="pagehead">
          <div className="crumb">
            <a href="/">Home</a> / <a href="/reports">Reports</a> / {name}
          </div>
          <h1>{name} Hospital Price Report</h1>
          <p className="sub">
            What hospitals charge for shoppable care across {name} — drawn from {hospitals.toLocaleString()}{" "}
            hospitals&apos; machine-readable files. Figures are medians with robust 10th–90th-percentile ranges across
            hospitals in the state.
          </p>
        </section>

        {swings.length > 0 && (
          <>
            <div className="copy" style={{ maxWidth: "72ch" }}>
              <h2>The same procedure, wildly different prices</h2>
              <p>
                Even within {name}, the negotiated price at a pricier hospital can be many times what a cheaper one
                charges — for the same service.
              </p>
            </div>
            <table className="ptable">
              <thead>
                <tr>
                  <th>Procedure</th>
                  <th style={{ textAlign: "right" }}>Typical range (10th–90th pct)</th>
                  <th style={{ textAlign: "right" }}>Median</th>
                  <th style={{ textAlign: "right" }}>Hospitals</th>
                </tr>
              </thead>
              <tbody>
                {swings.map((s) => (
                  <tr key={s.slug}>
                    <td>{proc(s)}</td>
                    <td className="num" data-label="Typical range">{usd(s.p10)} – {usd(s.p90)}</td>
                    <td className="num" data-label="Median">{usd(s.p50)}</td>
                    <td className="num" data-label="Hospitals">{s.n.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {savings.length > 0 && (
          <>
            <div className="copy" style={{ maxWidth: "72ch" }}>
              <h2>Cash can beat the list price</h2>
              <p>
                The &ldquo;gross&rdquo; charge is the hospital&apos;s list price; the cash price is what many will
                accept from a self-pay patient. For these procedures in {name}, the cash price is a fraction of the
                list price.
              </p>
            </div>
            <table className="ptable">
              <thead>
                <tr>
                  <th>Procedure</th>
                  <th style={{ textAlign: "right" }}>Cash (median)</th>
                  <th style={{ textAlign: "right" }}>Gross / list (median)</th>
                </tr>
              </thead>
              <tbody>
                {savings.map((s) => (
                  <tr key={s.slug}>
                    <td>{proc(s)}</td>
                    <td className="num" data-label="Cash">{usd(s.cash)}</td>
                    <td className="num" data-label="Gross / list">{usd(s.gross)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {priciest.length > 0 && (
          <>
            <div className="copy" style={{ maxWidth: "72ch" }}>
              <h2>The most expensive shoppable procedures in {name}</h2>
            </div>
            <table className="ptable">
              <thead>
                <tr>
                  <th>Procedure</th>
                  <th style={{ textAlign: "right" }}>Median negotiated</th>
                  <th style={{ textAlign: "right" }}>Hospitals</th>
                </tr>
              </thead>
              <tbody>
                {priciest.map((s) => (
                  <tr key={s.slug}>
                    <td>{proc(s)}</td>
                    <td className="num" data-label="Median negotiated">{usd(s.p50)}</td>
                    <td className="num" data-label="Hospitals">{s.n.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="copy" style={{ maxWidth: "72ch" }}>
          <p className="prov" style={{ margin: "10px 0 0" }}>
            Medians and percentiles are computed across each hospital&apos;s representative facility price, from its
            latest machine-readable file. See <a href="/methodology">methodology</a> for how prices are derived.
          </p>
          <p style={{ marginTop: 28 }}>
            <a href={`/state/${c}`}>Browse all {name} hospitals →</a> &nbsp;·&nbsp;{" "}
            <a href="/reports">National price report →</a>
          </p>
          <SubscribeForm source={`report-state-${c}`} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
