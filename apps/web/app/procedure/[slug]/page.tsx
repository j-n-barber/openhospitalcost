import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { sql } from "@/lib/db";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { titleCase, titleCaseProcedure, settingOf, usd } from "@/lib/format";
import FilterableHospitalPrices from "@/components/FilterableHospitalPrices";
import { MoneyRail } from "@/components/MoneyRail";
import { ProcedureEducation, type Faq } from "@/components/PriceEducation";
import { guidesForProcedure } from "@/lib/guides";

export const revalidate = 86400;
// Show the right rail when there's rail content (related links) or once ads are on.
const ADSENSE_ON = !!process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

type Params = { params: Promise<{ slug: string }> };
type Proc = { name: string; code: string; code_type: string | null; description: string | null; category: string | null };
type Row = {
  ccn: string; name: string; city: string; state: string;
  negotiated: number | null; neg_lo: number | null; neg_hi: number | null;
  payers: number | null; cash: number | null; gross: number | null;
  tier_size: number | null;
};

async function getProcedure(slug: string): Promise<Proc | null> {
  const r = (await sql`SELECT name, code, code_type, description, category FROM procedures WHERE slug = ${slug}`) as Proc[];
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
      max(CASE WHEN s.charge_type = 'gross' THEN s.amount END)::float           AS gross,
      -- How many of this hospital's procedures share this exact negotiated row
      -- (same amount + source file) — i.e. a shared billing tier (e.g. a DRG)
      -- where the price isn't specific to this procedure. 1 = unique to it.
      max(CASE WHEN s.charge_type = 'negotiated' THEN (
        SELECT count(DISTINCT s2.procedure_id) FROM procedure_hospital_summary s2
        WHERE s2.hospital_id = h.id AND s2.charge_type = 'negotiated'
          AND s2.amount = s.amount AND s2.source_file_id = s.source_file_id
      ) END)::int AS tier_size
    FROM procedure_hospital_summary s
    JOIN procedures p ON p.id = s.procedure_id
    JOIN hospitals h ON h.id = s.hospital_id
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE p.slug = ${slug} AND (f.quality_metrics->>'eligibleForMoneyPages')::boolean
    GROUP BY h.ccn, h.name, h.city, h.state
    ORDER BY payers DESC NULLS LAST, negotiated ASC NULLS LAST`) as Row[];
}

// Related procedures in the same category that also have published data — for the
// rail (internal linking + a useful "what else can I price?" path).
async function getRelated(slug: string, category: string | null): Promise<{ slug: string; name: string }[]> {
  if (!category) return [];
  const r = (await sql`
    SELECT DISTINCT p.slug, p.name
    FROM procedures p
    JOIN procedure_hospital_summary s ON s.procedure_id = p.id
    JOIN hospitals h ON h.id = s.hospital_id
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE p.category = ${category} AND p.slug <> ${slug}
      AND (f.quality_metrics->>'eligibleForMoneyPages')::boolean
    ORDER BY p.name LIMIT 6`) as { slug: string; name: string }[];
  return r.map((x) => ({ ...x, name: titleCaseProcedure(x.name) }));
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
    description: `Real negotiated, cash, and gross prices for ${proc.name} across hospitals, sourced from machine-readable files.`,
    alternates: { canonical: `/procedure/${slug}` },
  };
}

export default async function ProcedurePage({ params }: Params) {
  const { slug } = await params;
  const proc = await getProcedure(slug);
  if (!proc) notFound();
  const rows = await getHospitalPrices(slug);
  if (!rows.length) notFound();
  const related = await getRelated(slug, proc.category);
  const showRail = related.length > 0 || ADSENSE_ON;

  // Aggregate the negotiated prices into a single AggregateOffer (low/high is what
  // Google actually surfaces) while keeping a sample of individual hospital offers.
  const priced = rows.filter((r) => r.negotiated != null) as (Row & { negotiated: number })[];
  const lo = priced.length ? Math.min(...priced.map((r) => r.negotiated)) : null;
  const hi = priced.length ? Math.max(...priced.map((r) => r.negotiated)) : null;
  // Median negotiated price across hospitals — the "typical" figure for the
  // visible cost answer + FAQ (the table is sorted cheapest-first, which isn't
  // representative on its own).
  const negSorted = priced.map((r) => r.negotiated).sort((a, b) => a - b);
  const median = negSorted.length
    ? Math.round(
        negSorted.length % 2
          ? negSorted[(negSorted.length - 1) / 2]
          : (negSorted[negSorted.length / 2 - 1] + negSorted[negSorted.length / 2]) / 2,
      )
    : null;
  const hasPriceAnswer = median != null && lo != null && hi != null;
  const setting = settingOf(proc.code_type);
  // Cheapest / priciest named hospitals + cash availability — feeds the editorial
  // block so each procedure page reads with its own real numbers.
  const cheapest = priced.length
    ? priced.reduce((a, b) => (b.negotiated < a.negotiated ? b : a))
    : null;
  const priciest = priced.length
    ? priced.reduce((a, b) => (b.negotiated > a.negotiated ? b : a))
    : null;
  const cashCount = rows.filter((r) => r.cash != null).length;
  const guideLinks = guidesForProcedure(slug, proc.name, proc.category);

  // FAQ built once: rendered visibly in the editorial block AND emitted as
  // FAQPage structured data below.
  const faqItems: Faq[] = hasPriceAnswer
    ? [
        {
          q: `How much does ${proc.name} cost?`,
          a: `Across ${priced.length} hospitals with a published negotiated price, the median for ${proc.name} is ${usd(median!)}, ranging from ${usd(lo!)} to ${usd(hi!)}. Prices vary widely between hospitals, so comparing before non-emergency care can save a lot.`,
        },
        {
          q: "Why does the same procedure cost so much more at one hospital than another?",
          a: "Hospital prices are set by negotiation, not a national price list. Each hospital negotiates separately with each insurer, so the same service can have many different prices, and prices between hospitals a few miles apart routinely differ by several times.",
        },
        {
          q: "Is the cash price lower than going through insurance?",
          a: "Sometimes. The cash (self-pay) price is what you pay directly without insurance, and in roughly one in three procedures it's lower than the insured negotiated rate. It's not a rule, so the only way to know is to compare both for your specific procedure and hospital.",
        },
      ]
    : [
        {
          q: `How do I find the price of ${proc.name}?`,
          a: `The table on this page lists ${proc.name} prices at hospitals that publish usable data, sorted cheapest-first. Find the hospitals near you, then confirm the figure with the billing office before scheduling.`,
        },
        {
          q: "Why does the same procedure cost so much more at one hospital than another?",
          a: "Hospital prices are set by negotiation, not a national price list. Each hospital negotiates separately with each insurer, so the same service can have many different prices, and prices between hospitals a few miles apart routinely differ by several times.",
        },
      ];
  const ld = {
    "@context": "https://schema.org",
    "@type": "MedicalProcedure",
    name: proc.name,
    ...(proc.description ? { description: proc.description } : {}),
    ...(lo != null && hi != null
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "USD",
            lowPrice: lo,
            highPrice: hi,
            offerCount: priced.length,
            offers: priced.slice(0, 20).map((r) => ({
              "@type": "Offer",
              price: r.negotiated,
              priceCurrency: "USD",
              seller: { "@type": "Hospital", name: titleCase(r.name) },
            })),
          },
        }
      : {}),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://openhospitalcost.com/" },
      { "@type": "ListItem", position: 2, name: "Procedures", item: "https://openhospitalcost.com/procedures" },
      { "@type": "ListItem", position: 3, name: proc.name, item: `https://openhospitalcost.com/procedure/${slug}` },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb, faqLd]).replace(/</g, "\\u003c") }} />
      <SiteHeader />
      <main className="wrap">
        <section className="pagehead">
          <div className="crumb"><a href="/">Home</a> / <a href="/procedures">Procedures</a> / {proc.name}</div>
          <h1>{proc.name} <span className={`setting-tag ${settingOf(proc.code_type) === "Inpatient" ? "inpatient" : "outpatient"}`}>{settingOf(proc.code_type)}</span></h1>
          {proc.description ? <p className="sub">{proc.description}</p> : null}
          <p className="sub">
            {hasPriceAnswer ? (
              <>
                Across {priced.length} hospital{priced.length > 1 ? "s" : ""} with a published negotiated price, the
                median for {proc.name} is <strong>{usd(median!)}</strong>, ranging from {usd(lo!)} to {usd(hi!)}.
                Sorted cheapest-first; the same procedure can swing widely between hospitals — filter or re-sort below.
              </>
            ) : (
              <>
                {setting === "Inpatient"
                  ? `Inpatient stay prices across ${rows.length} hospital${rows.length > 1 ? "s" : ""} with published data — the bundled cost of the whole admission, sorted cheapest-first.`
                  : `Facility prices across ${rows.length} hospital${rows.length > 1 ? "s" : ""} with published data — sorted cheapest-first by default.`}{" "}
                Filter or re-sort below; the same procedure can swing widely between hospitals.
              </>
            )}
          </p>
          {guideLinks.length ? (
            <p className="prov" style={{ marginTop: 10 }}>
              Guides:{" "}
              {guideLinks.map((g, i) => (
                <span key={g.href}>
                  {i > 0 ? " · " : null}
                  <a href={g.href}>{g.label}</a>
                </span>
              ))}
            </p>
          ) : null}
        </section>

        {showRail ? (
          <div className="moneygrid">
            <div className="mg-main">
              <FilterableHospitalPrices rows={rows} />
              <p className="prov">Median facility price per hospital, from each hospital&apos;s machine-readable file — facility charges only, so the surgeon, anesthesia, and pathology may be billed separately and your total can run higher. Negotiated shows the median across payers with the full range; &quot;1 plan&quot; flags a figure backed by a single payer, and a &quot;shared rate&quot; tag means the hospital lists several procedures at one negotiated tier (e.g. a DRG), so that number isn&apos;t specific to this procedure.</p>
            </div>
            <MoneyRail title="Related procedures" items={related.map((r) => ({ href: `/procedure/${r.slug}`, label: r.name }))} />
          </div>
        ) : (
          <>
            <FilterableHospitalPrices rows={rows} />
            <p className="prov">Median facility price per hospital, from each hospital&apos;s machine-readable file — facility charges only, so the surgeon, anesthesia, and pathology may be billed separately and your total can run higher. Negotiated shows the median across payers with the full range; &quot;1 plan&quot; flags a figure backed by a single payer, and a &quot;shared rate&quot; tag means the hospital lists several procedures at one negotiated tier (e.g. a DRG), so that number isn&apos;t specific to this procedure.</p>
          </>
        )}

        <ProcedureEducation
          name={proc.name}
          setting={setting}
          count={priced.length}
          median={median}
          lo={lo}
          hi={hi}
          cashCount={cashCount}
          cheapest={cheapest ? { name: titleCase(cheapest.name), ccn: cheapest.ccn, price: cheapest.negotiated } : null}
          priciest={priciest ? { name: titleCase(priciest.name), ccn: priciest.ccn, price: priciest.negotiated } : null}
          faq={faqItems}
        />
      </main>
      <SiteFooter />
    </>
  );
}
