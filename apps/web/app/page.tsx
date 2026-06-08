import { sql } from "@/lib/db";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SearchBar from "@/components/SearchBar";
import CoverageMap from "@/components/CoverageMap";
import { titleCase, titleCaseProcedure, usd } from "@/lib/format";
import { isTerritory } from "@/lib/states";

export const revalidate = 3600; // ISR: rebuild at most hourly

export default async function Home() {
  const stateRows = (await sql`
    SELECT lower(h.state) AS state, count(*)::int AS n
    FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean
    GROUP BY 1`) as { state: string; n: number }[];
  const counts = Object.fromEntries(stateRows.map((r) => [r.state, r.n]));
  // Count the 50 states separately from D.C./territories so copy reads
  // "50 states + territories" (not the confusing "52 states").
  const stateCount = stateRows.filter((r) => !isTerritory(r.state)).length;
  const hasTerritories = stateRows.some((r) => isTerritory(r.state));

  const totals = (await sql`
    SELECT count(*)::int AS hospitals
    FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean`) as { hospitals: number }[];
  const procRows = (await sql`SELECT count(*)::int AS n FROM procedures`) as { n: number }[];
  const { hospitals } = totals[0];
  const procedures = procRows[0].n;

  const sample = (await sql`
    SELECT h.name, h.city, h.state, s.amount::float AS amount, s.payer_count::int AS payers
    FROM procedure_hospital_summary s
    JOIN hospitals h ON h.id = s.hospital_id
    JOIN procedures p ON p.id = s.procedure_id
    WHERE p.code = '70551' AND s.charge_type = 'negotiated'
    ORDER BY s.amount LIMIT 5`) as { name: string; city: string; state: string; amount: number; payers: number }[];

  // Search "Try:" chips — built from real data (top-coverage procedures + a few
  // short-named big hospitals) and linked straight to their pages, so they can
  // never silently break. Shuffled + sliced here, so the set rotates each hourly
  // ISR regeneration. (Computed server-side -> stable prop -> no hydration churn.)
  const chipProcs = (await sql`
    SELECT p.slug, p.name, count(DISTINCT s.hospital_id)::int AS n
    FROM procedures p
    JOIN procedure_hospital_summary s ON s.procedure_id = p.id
    JOIN hospitals h ON h.id = s.hospital_id
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean
    GROUP BY p.slug, p.name ORDER BY n DESC LIMIT 12`) as { slug: string; name: string; n: number }[];
  const chipHosps = (await sql`
    SELECT h.ccn, h.name
    FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean AND length(h.name) <= 24
    ORDER BY h.beds DESC NULLS LAST LIMIT 5`) as { ccn: string; name: string }[];
  const shuffle = <T,>(a: T[]): T[] => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  // 4 procedures (the primary use case) + 1 hospital, each rotated from its pool.
  const chips = shuffle([
    ...shuffle(chipProcs.map((p) => ({ label: titleCaseProcedure(p.name), href: `/procedure/${p.slug}` }))).slice(0, 4),
    ...shuffle(chipHosps.map((h) => ({ label: titleCase(h.name), href: `/hospital/${h.ccn}` }))).slice(0, 1),
  ]);

  // Site-level structured data (the one page that lacked it). Organization +
  // WebSite help search engines model the site as an entity. No SearchAction —
  // there's no URL-based search results page to point it at.
  const siteLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://openhospitalcost.com/#org",
        name: "OpenHospitalCost",
        url: "https://openhospitalcost.com",
        logo: "https://openhospitalcost.com/icon.svg",
        description:
          "Real hospital prices — gross, cash, and negotiated — pulled from federally-mandated machine-readable files and cited to the source.",
      },
      {
        "@type": "WebSite",
        "@id": "https://openhospitalcost.com/#website",
        url: "https://openhospitalcost.com",
        name: "OpenHospitalCost",
        publisher: { "@id": "https://openhospitalcost.com/#org" },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd).replace(/</g, "\\u003c") }} />
      <SiteHeader />

      <main className="wrap">
        <section className="hero">
          <div className="eyebrow">Sourced from federally-mandated price files</div>
          <h1>See what hospitals <em>actually</em> charge.</h1>
          <p className="sub">Real gross, cash, and negotiated prices — pulled straight from each hospital&apos;s machine-readable file and cited to the source. Not estimates. Not ranges. The actual numbers.</p>
          <SearchBar chips={chips} />
        </section>

        <section className="mapwrap">
          <div className="maphead">
            <div>
              <h2>Where we have prices today</h2>
              <p>Pick a state to browse its hospitals. Coverage is growing from the largest metros outward.</p>
            </div>
            <div className="stat-row">
              <div className="stat"><div className="n">{hospitals}</div><div className="l">Hospitals</div></div>
              <div className="stat"><div className="n">{stateCount}</div><div className="l">States{hasTerritories ? " + territories" : ""}</div></div>
              <div className="stat"><div className="n">{procedures}</div><div className="l">Procedures</div></div>
            </div>
          </div>
          <CoverageMap counts={counts} />
          <div className="legend">
            <span className="sw">
              <i style={{ background: "#cfe3e0" }} /><i style={{ background: "#8cc1bc" }} /><i style={{ background: "#4f9a98" }} /><i style={{ background: "#1A6B7A" }} /><i style={{ background: "#15616d" }} /> Fewer → more hospitals
            </span>
            <span className="sw"><i style={{ background: "#EBE8E1" }} /> Coming soon</span>
          </div>
        </section>

        <section className="values">
          <div className="val"><div className="k">01 / Real numbers</div><h3>Negotiated &amp; cash prices</h3><p>The actual rates payers and self-pay patients are charged — the data every competitor hides behind modeled &ldquo;estimates.&rdquo;</p></div>
          <div className="val"><div className="k">02 / Cited</div><h3>Traceable to the source</h3><p>Every price links to the hospital&apos;s own machine-readable file and the date we ingested it. Check our work.</p></div>
          <div className="val"><div className="k">03 / Independent</div><h3>Free &amp; ad-supported</h3><p>No logins, no upsells, no data resale. A public-interest index of a public-interest dataset.</p></div>
        </section>

        <section className="sample">
          <div className="l">
            <div className="eyebrow">Sample · what you&apos;ll see</div>
            <h3>MRI of the Brain, without Contrast</h3>
            <p>Median negotiated price per hospital, with the full payer range. The same procedure swings wildly between hospitals — that gap is the whole point.</p>
          </div>
          <div className="r">
            {sample.map((row, i) => (
              <div className="prow" key={i}>
                <span>
                  <div className="hosp">{titleCase(row.name)}</div>
                  <div className="city">{titleCase(row.city)}, {row.state.toUpperCase()}</div>
                </span>
                <span className="amt">{usd(row.amount)} <small>· {row.payers} payers</small></span>
              </div>
            ))}
            <div className="src">Median negotiated price · sourced from each hospital&apos;s MRF</div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
