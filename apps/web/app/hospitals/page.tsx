import type { Metadata } from "next";
import { sql } from "@/lib/db";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import HospitalIndex, { type HospIndexCard } from "@/components/HospitalIndex";
import { isTerritory } from "@/lib/states";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Browse hospitals by price data — OpenHospitalCost",
  description:
    "Every hospital with published, machine-readable price data. Filter by state, then compare its negotiated, cash, and gross rates by procedure.",
};

async function getHospitals(): Promise<HospIndexCard[]> {
  return (await sql`
    SELECT h.ccn, h.name, h.city, h.state, count(DISTINCT s.procedure_id)::int AS procedures
    FROM hospitals h
    JOIN LATERAL (SELECT * FROM mrf_files m WHERE m.hospital_id = h.id ORDER BY parsed_at DESC LIMIT 1) f ON true
    LEFT JOIN procedure_hospital_summary s ON s.hospital_id = h.id
    WHERE (f.quality_metrics->>'eligibleForMoneyPages')::boolean
    GROUP BY h.ccn, h.name, h.city, h.state
    ORDER BY procedures DESC, h.name`) as HospIndexCard[];
}

export default async function HospitalsPage() {
  const hospitals = await getHospitals();
  const codes = new Set(hospitals.map((h) => h.state.toLowerCase()));
  const stateCount = [...codes].filter((c) => !isTerritory(c)).length;
  const hasTerritories = [...codes].some((c) => isTerritory(c));

  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <section className="pagehead">
          <div className="crumb"><a href="/">Home</a> / Hospitals</div>
          <h1>Browse hospitals</h1>
          <p className="sub">
            {hospitals.length} hospital{hospitals.length !== 1 ? "s" : ""} across {stateCount} states{hasTerritories ? " + territories" : ""} with
            published, machine-readable prices. Pick one to see its negotiated, cash, and gross rates by procedure.
          </p>
        </section>

        <HospitalIndex hospitals={hospitals} />
        <p className="prov">
          Hospitals are included once their machine-readable file parses with usable negotiated or cash prices.
          Coverage grows as more files are ingested.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
