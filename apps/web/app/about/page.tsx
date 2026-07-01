import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "About — OpenHospitalCost",
  description:
    "OpenHospitalCost was a hospital price transparency site, retired over AMA/CPT licensing. Now a case study of how it worked.",
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
            Hospital prices are public by law but buried in files almost no one can read. OpenHospitalCost made
            them searchable — until an AMA/CPT licensing wall made a free, ad-supported version unworkable.
          </p>
        </section>

        <div className="copy">
          <h2>What it was</h2>
          <p>
            Since 2021, U.S. federal rules (45 CFR §180) have required every hospital to publish a
            machine-readable file listing its standard charges — gross list price, discounted cash price,
            and the rates it has negotiated with insurers. The data is public, but it lives in sprawling
            files with inconsistent formats that are effectively unusable for an ordinary patient comparing
            the cost of a procedure.
          </p>
          <p>
            OpenHospitalCost collected those files, normalized them, and turned them into something searchable
            and comparable — with every figure traceable back to the exact source file. At its peak it covered
            over 2,000 hospitals and 150+ procedures.
          </p>

          <h2>How it worked</h2>
          <ul>
            <li>Identify hospitals from the CMS provider directory and locate each one&apos;s published price file.</li>
            <li>Download and parse the file, matching line items to standard procedure codes.</li>
            <li>Compute a representative facility price per procedure and surface the negotiated, cash, and gross rates.</li>
            <li>Cite every price to its source file and the date it was ingested.</li>
          </ul>

          <h2>Why it&apos;s retired</h2>
          <p>
            Matching procedures across hospitals at scale requires CPT codes — the AMA&apos;s copyrighted,
            per-user-licensed coding system. There was no workable license model for a free, public,
            ad-supported tool. See the <a href="/">interactive case study</a> for the full story and a walk
            through the real 8-stage pipeline.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
