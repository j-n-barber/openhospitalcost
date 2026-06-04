import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Methodology — OpenHospitalCost",
  description:
    "How OpenHospitalCost sources, parses, scores, and normalizes hospital machine-readable files into comparable negotiated, cash, and gross prices.",
};

export default function MethodologyPage() {
  return (
    <>
      <SiteHeader />
      <main className="wrap prose">
        <section className="pagehead">
          <div className="crumb"><a href="/">Home</a> / Methodology</div>
          <h1>Methodology</h1>
          <p className="sub">
            How raw hospital files become comparable prices — and the limits of what the data can tell you.
          </p>
        </section>

        <div className="copy">
          <h2>Sourcing</h2>
          <p>
            We start from the federal hospital directory to identify hospitals and their identifiers, then locate
            each hospital&apos;s machine-readable file (MRF) of standard charges, which it must publish under 45 CFR
            §180. We supplement with public bed counts and metro (CBSA) data to add context. Files are downloaded
            directly from each hospital — only the price files they are required to publish — and we identify
            ourselves honestly when we do.
          </p>

          <h2>Parsing &amp; code matching</h2>
          <p>
            MRFs come in many shapes — CSV and JSON, often compressed, sometimes multiple gigabytes — and hospitals
            format and label them inconsistently. We parse each file and match its line items to the procedures we
            track. Because the same procedure can be represented in very different ways from one hospital to the next,
            a good deal of our work goes into matching it reliably across those variations.
          </p>

          <h2>Quality scoring</h2>
          <p>
            Each file gets a File Quality Score (0–100) based on how completely it populates expected fields and
            whether it actually contains usable negotiated and cash prices. A hospital becomes
            &ldquo;money-page eligible&rdquo; — shown on comparison pages — only when its latest file clears that
            bar. This keeps thin or unparseable files from polluting comparisons.
          </p>

          <h2>Representative price</h2>
          <p>
            A single procedure can appear many times in one file — across payers, plans, settings, and as separate
            professional vs. facility components. We distill those into one representative, comparable price per
            hospital, chosen to reflect the typical cost of the full service rather than an unrepresentative fragment —
            so a &ldquo;$67 MRI&rdquo; that is really just one component doesn&apos;t misstate the real price. For
            negotiated rates we also show the range across payers, and national figures summarize across hospitals with
            the spread between them.
          </p>

          <h2>Freshness &amp; provenance</h2>
          <p>
            Price records are append-only; we keep the history and surface the current snapshot. Every hospital page
            cites the source file and the date it was ingested, and raw files are archived so prices can be
            re-derived if our processing changes.
          </p>

          <h2>Limitations</h2>
          <ul>
            <li>Coverage is partial and growing — not every hospital is included yet.</li>
            <li>Some files use less common formats or coding systems we don&apos;t yet support.</li>
            <li>Hospitals report prices inconsistently; despite normalization, some comparisons are imperfect.</li>
            <li>Figures are informational, not quotes. Your actual cost depends on your care and your insurance.</li>
          </ul>
          <p>
            Found an error? <a href="/corrections">Submit a correction</a> — every report is checked against the
            source file.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
