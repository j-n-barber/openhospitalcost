import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "How it works — OpenHospitalCost",
  description:
    "How to use OpenHospitalCost to compare real hospital prices: what negotiated, cash, and gross prices mean, and how to read the numbers.",
};

export default function HowItWorksPage() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <section className="pagehead">
          <div className="crumb"><a href="/">Home</a> / How it works</div>
          <h1>How it works</h1>
          <p className="sub">
            Find a procedure, compare what hospitals actually charge, and trace every number back to its source.
          </p>
        </section>

        <div className="copy">
          <h2>1. Search for a procedure or hospital</h2>
          <p>
            Start from the <a href="/procedures">procedures</a> list to compare one service across hospitals, or
            from the <a href="/hospitals">hospitals</a> list to see everything a single hospital publishes. You can
            also browse <a href="/states">by state</a>.
          </p>

          <h2>2. Compare three kinds of price</h2>
          <p>
            Every hospital publishes its charges in three forms, and they can differ by an order of magnitude:
          </p>
          <ul>
            <li><strong>Negotiated</strong> — the rate an insurer has agreed to pay. We show the median across plans, with the low–high range, since the same procedure is priced differently for different insurers.</li>
            <li><strong>Cash</strong> — the discounted price for self-pay or uninsured patients paying directly.</li>
            <li><strong>Gross</strong> — the chargemaster list price, before any discount or insurance. Almost no one pays this, but it&apos;s the starting point.</li>
          </ul>

          <h2>3. Read the numbers carefully</h2>
          <p>
            We report a representative <em>facility</em> price per procedure — the cost of the hospital&apos;s
            service itself — and try to exclude separate professional or component line items that would otherwise
            make a price look misleadingly low. Prices are shown exactly as each hospital reports them.
          </p>
          <p>
            These figures are for comparison and information only. They are not a quote and not a guarantee of what
            you&apos;ll be billed — your final cost depends on your specific care, your insurance, and the hospital.
            Always confirm directly before a procedure.
          </p>

          <h2>4. Verify the source</h2>
          <p>
            Every hospital page links to the exact machine-readable file the prices came from and the date we
            ingested it. If something looks wrong, you can check the original — and{" "}
            <a href="/corrections">tell us</a> so we can fix it. For the full sourcing and pricing logic, see our{" "}
            <a href="/methodology">methodology</a>.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
