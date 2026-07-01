import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Terms of Service — OpenHospitalCost",
  description:
    "The terms for using OpenHospitalCost, a retired hospital price-transparency project now presented as a case study.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="wrap prose">
        <section className="pagehead">
          <div className="crumb"><a href="/">Home</a> / Terms</div>
          <h1>Terms of Service</h1>
          <p className="sub">Last updated: July 1, 2026</p>
        </section>

        <div className="copy">
          <p>
            These Terms govern your use of openhospitalcost.com (the &ldquo;Site&rdquo;), operated by J.N. Barber LLC
            (&ldquo;we,&rdquo; &ldquo;us&rdquo;). By using the Site, you agree to these Terms. If you do not agree,
            please do not use the Site.
          </p>

          <h2>What the Site is</h2>
          <p>
            OpenHospitalCost was a free, informational service that aggregated hospital price-transparency data
            published under 45 CFR §180. It is now retired; the Site is a static case study describing the project
            and how it worked. There is no live pricing data, and no data submission or lookup functionality.
          </p>

          <h2>Accuracy &amp; availability</h2>
          <p>
            The Site is provided <strong>&ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of any
            kind</strong>, express or implied. We may change, suspend, or discontinue the Site at any time.
          </p>

          <h2>Acceptable use</h2>
          <p>
            Use the Site lawfully and don&apos;t attempt to disrupt it, gain unauthorized access, or place undue load
            on it (e.g., aggressive automated scraping).
          </p>

          <h2>Intellectual property</h2>
          <p>
            The Site&apos;s design, original text, branding, and presentation are owned by J.N. Barber LLC. Any
            hospital or procedure names used illustratively in the case study are for identification purposes only.
          </p>

          <h2>Limitation of liability</h2>
          <p>
            To the fullest extent permitted by law, J.N. Barber LLC will not be liable for any indirect, incidental,
            or consequential damages arising from use of the Site. Your use of the Site is at your own risk.
          </p>

          <h2>Changes to these Terms</h2>
          <p>
            We may update these Terms from time to time. Material changes will be reflected by the &ldquo;Last
            updated&rdquo; date above; continued use of the Site means you accept the updated Terms.
          </p>

          <h2>Governing law</h2>
          <p>
            These Terms are governed by the laws of the United States and the state in which J.N. Barber LLC is
            organized, without regard to conflict-of-laws principles.
          </p>

          <h2>Contact</h2>
          <p>
            Questions? Reach us at{" "}
            <a href="mailto:contact@openhospitalcost.com">contact@openhospitalcost.com</a>.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
