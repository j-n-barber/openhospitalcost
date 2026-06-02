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
      <main className="wrap">
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
            directly from each hospital; where a file is behind a bot challenge, we fetch it the same way a browser
            would, identifying ourselves honestly.
          </p>

          <h2>Parsing &amp; code matching</h2>
          <p>
            MRFs come in many shapes — CSV (both wide and tall layouts) and JSON, often compressed, sometimes
            multiple gigabytes. We parse each file and match its line items to standard CPT procedure codes. In
            practice hospitals label and place codes inconsistently (e.g. tagging CPT codes as &ldquo;HCPCS&rdquo;
            or scattering them across columns), so matching looks at both the code value and its type across fields.
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
            A single CPT can appear many times in a file (different payers, plans, settings, and professional vs.
            facility components). For each hospital and procedure we compute a representative <em>facility</em>
            price — the median, preferring outpatient facility line items — so a &ldquo;$67 MRI&rdquo; that is really
            just one component doesn&apos;t misrepresent the true cost. For negotiated rates we show the median across
            payers with the full low–high range. National figures on index pages are the median of each
            hospital&apos;s median, with the spread shown between hospitals.
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
            <li>Some files use formats or coding systems (e.g. spreadsheet-only files, MS-DRG-coded data) we don&apos;t yet support.</li>
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
