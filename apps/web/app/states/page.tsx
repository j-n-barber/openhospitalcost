import type { Metadata } from "next";
import { sql } from "@/lib/db";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { STATE_NAMES } from "@/lib/states";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Browse hospital prices by state — OpenHospitalCost",
  description:
    "Every U.S. state with published, machine-readable hospital price data. Pick a state to compare negotiated, cash, and gross rates by hospital and procedure.",
};

type StateRow = { code: string; hospitals: number };

async function getStates(): Promise<StateRow[]> {
  return (await sql`
    SELECT lower(h.state) AS code, count(DISTINCT h.ccn)::int AS hospitals
    FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean
    GROUP BY lower(h.state)
    ORDER BY hospitals DESC, code`) as StateRow[];
}

const stateName = (code: string) => STATE_NAMES[code] ?? code.toUpperCase();

export default async function StatesPage() {
  const states = (await getStates()).sort((a, b) => stateName(a.code).localeCompare(stateName(b.code)));

  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <section className="pagehead">
          <div className="crumb"><a href="/">Home</a> / States</div>
          <h1>Browse by state</h1>
          <p className="sub">
            {states.length} state{states.length !== 1 ? "s" : ""}{" "}with published hospital price data. Pick one to see its hospitals.
          </p>
        </section>

        {states.length ? (
          <div className="hlist">
            {states.map((s) => (
              <a className="hcard" key={s.code} href={`/state/${s.code}`}>
                <span className="hn">{stateName(s.code)}</span>
                <span className="hp">{s.hospitals} hospital{s.hospitals !== 1 ? "s" : ""} priced →</span>
              </a>
            ))}
          </div>
        ) : (
          <div className="empty">No states with published data yet.</div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
