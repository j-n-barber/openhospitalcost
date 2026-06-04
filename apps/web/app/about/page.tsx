import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "About — OpenHospitalCost",
  description:
    "OpenHospitalCost makes hospital prices searchable. We aggregate the machine-readable files U.S. hospitals are required to publish and cite every price to its source.",
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="wrap prose">
        <section className="pagehead">
          <div className="crumb"><a href="/">Home</a> / About</div>
          <h1>About OpenHospitalCost</h1>
          <p className="sub">
            Hospital prices are public by law but buried in files almost no one can read. We make them searchable.
          </p>
        </section>

        <div className="copy">
          <h2>Why this exists</h2>
          <p>
            Since 2021, U.S. federal rules (45 CFR §180) have required every hospital to publish a
            machine-readable file listing its standard charges — gross list price, discounted cash price,
            and the rates it has negotiated with insurers. The data is public, but it lives in sprawling
            files with inconsistent formats that are effectively unusable for an ordinary patient comparing
            the cost of a procedure.
          </p>
          <p>
            OpenHospitalCost collects those files, normalizes them, and turns them into something you can
            actually search and compare — with every figure traceable back to the exact file it came from.
          </p>

          <h2>How it works</h2>
          <ul>
            <li>We identify hospitals from the CMS provider directory and locate each one&apos;s published price file.</li>
            <li>We download and parse the file, matching line items to standard procedure codes.</li>
            <li>We compute a representative facility price per procedure and surface the negotiated, cash, and gross rates.</li>
            <li>Every hospital page cites its source file and the date we ingested it, so you can verify the numbers yourself.</li>
          </ul>

          <h2>How to read the prices</h2>
          <p>
            <strong>Negotiated</strong> is the median rate insurers have agreed to pay a hospital, shown with the
            low–high range across plans. <strong>Cash</strong> is the discounted price for self-pay patients.
            <strong> Gross</strong> is the chargemaster list price before any discount. The same procedure can vary
            enormously between hospitals — and even between insurance plans at the same hospital.
          </p>
          <p>
            Prices are shown exactly as each hospital reports them. They are for informational purposes and are
            not a quote or a guarantee of what you will be charged. Always confirm directly with the hospital and
            your insurer.
          </p>

          <h2>Coverage</h2>
          <p>
            Coverage starts with the largest hospitals across major U.S. metros and grows as more files are
            ingested. Some hospitals publish files in formats or coding systems we don&apos;t yet support; those
            are added over time. Start by browsing{" "}
            <a href="/procedures">procedures</a> or <a href="/hospitals">hospitals</a>.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
