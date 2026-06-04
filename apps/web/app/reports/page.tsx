import type { Metadata } from "next";
import { sql } from "@/lib/db";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { titleCaseProcedure, usd } from "@/lib/format";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "National Hospital Price Report — OpenHospitalCost",
  description:
    "What U.S. hospitals actually charge: the biggest price swings, the most expensive shoppable procedures, and where cash beats the list price — straight from machine-readable files.",
  alternates: { canonical: "/reports" },
};

type Swing = { slug: string; name: string; n: number; p10: number; p50: number; p90: number };
type Priciest = { slug: string; name: string; p50: number; n: number };
type Saving = { slug: string; name: string; cash: number; gross: number };

// Robust per-procedure stats across hospitals (10th–90th percentile, not min/max,
// so placeholder outliers can't distort the story).
async function getSwings(): Promise<Swing[]> {
  return (await sql`
    SELECT p.slug, p.name, count(*)::int AS n,
      percentile_cont(0.1) WITHIN GROUP (ORDER BY s.amount)::float AS p10,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY s.amount)::float AS p50,
      percentile_cont(0.9) WITHIN GROUP (ORDER BY s.amount)::float AS p90
    FROM procedure_hospital_summary s JOIN procedures p ON p.id = s.procedure_id
    WHERE s.charge_type = 'negotiated'
    GROUP BY p.slug, p.name HAVING count(*) >= 40
    ORDER BY (percentile_cont(0.9) WITHIN GROUP (ORDER BY s.amount))
           / NULLIF(percentile_cont(0.1) WITHIN GROUP (ORDER BY s.amount), 0) DESC
    LIMIT 10`) as Swing[];
}

async function getPriciest(): Promise<Priciest[]> {
  return (await sql`
    SELECT p.slug, p.name, count(*)::int AS n,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY s.amount)::float AS p50
    FROM procedure_hospital_summary s JOIN procedures p ON p.id = s.procedure_id
    WHERE s.charge_type = 'negotiated'
    GROUP BY p.slug, p.name HAVING count(*) >= 40
    ORDER BY p50 DESC LIMIT 8`) as Priciest[];
}

async function getSavings(): Promise<Saving[]> {
  return (await sql`
    SELECT p.slug, p.name,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY s.amount) FILTER (WHERE s.charge_type = 'discounted_cash')::float AS cash,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY s.amount) FILTER (WHERE s.charge_type = 'gross')::float AS gross
    FROM procedure_hospital_summary s JOIN procedures p ON p.id = s.procedure_id
    GROUP BY p.slug, p.name
    HAVING count(*) FILTER (WHERE s.charge_type = 'discounted_cash') >= 40
       AND count(*) FILTER (WHERE s.charge_type = 'gross') >= 40
    ORDER BY (percentile_cont(0.5) WITHIN GROUP (ORDER BY s.amount) FILTER (WHERE s.charge_type = 'gross'))
           / NULLIF(percentile_cont(0.5) WITHIN GROUP (ORDER BY s.amount) FILTER (WHERE s.charge_type = 'discounted_cash'), 0) DESC
    LIMIT 8`) as Saving[];
}

async function getHospitalCount(): Promise<number> {
  const r = (await sql`
    SELECT count(*)::int AS n FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean`) as { n: number }[];
  return r[0]?.n ?? 0;
}

export default async function ReportsPage() {
  const [swings, priciest, savings, hospitals] = await Promise.all([
    getSwings(),
    getPriciest(),
    getSavings(),
    getHospitalCount(),
  ]);
  const proc = (s: { slug: string; name: string }) => (
    <a href={`/procedure/${s.slug}`}>{titleCaseProcedure(s.name)}</a>
  );

  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <section className="pagehead">
          <div className="crumb"><a href="/">Home</a> / Reports</div>
          <h1>National Hospital Price Report</h1>
          <p className="sub">
            What U.S. hospitals actually charge for shoppable care — drawn from {hospitals.toLocaleString()}{" "}
            hospitals&apos; machine-readable files. Figures are medians with robust 10th–90th-percentile ranges across
            hospitals.
          </p>
        </section>

        <div className="copy" style={{ maxWidth: "72ch" }}>
          <h2>The same procedure, wildly different prices</h2>
          <p>
            The biggest story in hospital pricing is the spread. For these procedures, the negotiated price at a
            pricier hospital is many times what a cheaper one charges — for the same service.
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

        <div className="copy" style={{ maxWidth: "72ch" }}>
          <h2>Cash can beat the list price</h2>
          <p>
            The &ldquo;gross&rdquo; charge is the hospital&apos;s list price; the cash price is what many will accept
            from a self-pay patient. For these procedures the cash price is a fraction of the list price.
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

        <div className="copy" style={{ maxWidth: "72ch" }}>
          <h2>The most expensive shoppable procedures</h2>
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

        <div className="copy" style={{ maxWidth: "72ch" }}>
          <p className="prov" style={{ margin: "10px 0 0" }}>
            Medians and percentiles are computed across each hospital&apos;s representative facility price, from its
            latest machine-readable file. See <a href="/methodology">methodology</a> for how prices are derived.
          </p>
          <p style={{ marginTop: 28 }}>
            <a href="/procedures">Browse every procedure →</a> &nbsp;·&nbsp; <a href="/hospitals">Browse hospitals →</a>
          </p>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            Per-state reports and a monthly edition are on the way.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
