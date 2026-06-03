import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Data sources & export — OpenHospitalCost",
  description:
    "Where OpenHospitalCost's prices come from, and how to get the underlying data: hospital machine-readable files, CMS directories, and Parquet snapshots.",
};

export default function DataPage() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <section className="pagehead">
          <div className="crumb"><a href="/">Home</a> / Data</div>
          <h1>Data sources &amp; export</h1>
          <p className="sub">
            Everything here is built on public data, and we keep it traceable to the source.
          </p>
        </section>

        <div className="copy">
          <h2>Where the prices come from</h2>
          <ul>
            <li><strong>Hospital machine-readable files (MRFs)</strong> — the standard-charge files each hospital publishes under 45 CFR §180. These are the source of every price on the site; each hospital page links to the exact file and ingestion date.</li>
            <li><strong>CMS provider directories</strong> — the federal hospital list and Provider of Services file, used to identify hospitals and add context like bed counts.</li>
            <li><strong>U.S. Census CBSA crosswalk</strong> — to group hospitals by metro area.</li>
          </ul>

          <h2>How we process it</h2>
          <p>
            We parse each MRF, match line items to CPT codes, score data quality, and compute a representative
            facility price per procedure. The full pipeline is described in our{" "}
            <a href="/methodology">methodology</a>.
          </p>

          <h2>Open data export</h2>
          <p>
            We archive periodic snapshots of the normalized price dataset as Parquet — a compact, analysis-ready
            columnar format — so the data can be studied in bulk rather than scraped page by page. If you&apos;re a
            researcher, journalist, or developer who wants the dataset, email{" "}
            <a href="mailto:contact@openhospitalcost.com?subject=Data%20export%20request">contact@openhospitalcost.com</a>{" "}
            and tell us what you&apos;re working on.
          </p>
          <p>
            Prefer the originals? Each hospital&apos;s raw MRF is linked from its page, and the federal source files
            are publicly available from CMS.
          </p>

          <h2>Reuse &amp; attribution</h2>
          <p>
            The underlying hospital and CMS files are public records. If you use figures from OpenHospitalCost,
            please cite the site and, where possible, the individual hospital&apos;s source file so readers can
            verify the numbers themselves.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
