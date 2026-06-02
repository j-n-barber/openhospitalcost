import { sql } from "@/lib/db";
import Logo from "@/components/Logo";
import SearchBar from "@/components/SearchBar";
import CoverageMap from "@/components/CoverageMap";

export const revalidate = 3600; // ISR: rebuild at most hourly

const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function Home() {
  const stateRows = (await sql`
    SELECT lower(h.state) AS state, count(*)::int AS n
    FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean
    GROUP BY 1`) as { state: string; n: number }[];
  const counts = Object.fromEntries(stateRows.map((r) => [r.state, r.n]));

  const totals = (await sql`
    SELECT count(*)::int AS hospitals, count(DISTINCT h.state)::int AS states
    FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean`) as { hospitals: number; states: number }[];
  const procRows = (await sql`SELECT count(*)::int AS n FROM procedures`) as { n: number }[];
  const { hospitals, states } = totals[0];
  const procedures = procRows[0].n;

  const sample = (await sql`
    SELECT h.name, h.city, h.state, s.amount::float AS amount, s.payer_count::int AS payers
    FROM procedure_hospital_summary s
    JOIN hospitals h ON h.id = s.hospital_id
    JOIN procedures p ON p.id = s.procedure_id
    WHERE p.code = '70551' AND s.charge_type = 'negotiated'
    ORDER BY s.amount LIMIT 5`) as { name: string; city: string; state: string; amount: number; payers: number }[];

  return (
    <>
      <header>
        <div className="wrap bar">
          <a className="brand" href="/">
            <Logo className="logo" />
            <span><span className="o">Open</span>HospitalCost</span>
          </a>
          <nav className="top">
            <a href="/procedures">Procedures</a>
            <a href="/hospitals">Hospitals</a>
            <a href="/how-it-works">How it works</a>
            <a href="/methodology">Methodology</a>
          </nav>
        </div>
      </header>

      <main className="wrap">
        <section className="hero">
          <div className="eyebrow">Sourced from federally-mandated price files</div>
          <h1>See what hospitals <em>actually</em> charge.</h1>
          <p className="sub">Real gross, cash, and negotiated prices — pulled straight from each hospital&apos;s machine-readable file and cited to the source. Not estimates. Not ranges. The actual numbers.</p>
          <SearchBar />
        </section>

        <section className="mapwrap">
          <div className="maphead">
            <div>
              <h2>Where we have prices today</h2>
              <p>Pick a state to browse its hospitals. Coverage is growing from the largest metros outward.</p>
            </div>
            <div className="stat-row">
              <div className="stat"><div className="n">{hospitals}</div><div className="l">Hospitals</div></div>
              <div className="stat"><div className="n">{states}</div><div className="l">States</div></div>
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
            <h3>MRI of the brain, without contrast</h3>
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

      <footer>
        <div className="wrap">
          <div className="fcols">
            <div><strong>Browse</strong><a href="/procedures">By procedure</a><a href="/hospitals">By hospital</a><a href="/states">By state</a></div>
            <div><strong>Understand</strong><a href="/how-it-works">How it works</a><a href="/methodology">Methodology</a><a href="/data">Data sources</a></div>
            <div><strong>Data</strong><a href="/data">Open data export</a><a href="/corrections">Submit a correction</a><a href="/llms.txt">llms.txt</a></div>
            <div><strong>About</strong><a href="/about">The project</a><a href="/contact">Contact</a></div>
          </div>
          <p className="fine">OpenHospitalCost aggregates hospital price transparency files published under 45 CFR §180. Prices are shown as reported by each hospital and cited to the source file and ingestion date. Figures are for informational purposes and are not a quote or guarantee of cost.</p>
        </div>
      </footer>
    </>
  );
}
