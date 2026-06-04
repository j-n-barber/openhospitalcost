import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Terms of Service — OpenHospitalCost",
  description:
    "The terms for using OpenHospitalCost: an informational price-transparency service. Prices are not quotes, the data is provided as-is, and figures are not medical, financial, or legal advice.",
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
          <p className="sub">Last updated: June 4, 2026</p>
        </section>

        <div className="copy">
          <p>
            These Terms govern your use of openhospitalcost.com (the &ldquo;Site&rdquo;), operated by J.N. Barber LLC
            (&ldquo;we,&rdquo; &ldquo;us&rdquo;). By using the Site, you agree to these Terms. If you do not agree,
            please do not use the Site.
          </p>

          <h2>What the Site is</h2>
          <p>
            OpenHospitalCost is a free, informational service that aggregates hospital price-transparency data from the
            machine-readable files hospitals publish under 45 CFR §180, normalizes it, and presents it for comparison.
            We add public context such as bed counts and metro data.
          </p>

          <h2>Informational only — not advice or a quote</h2>
          <p>
            The prices and figures on the Site are <strong>informational and are not quotes, estimates, or guarantees
            of cost</strong>. They are shown as reported in each hospital&apos;s file and may differ from what you are
            actually charged, which depends on your specific care, provider, and insurance. Nothing on the Site is
            medical, financial, legal, or insurance advice. Always confirm pricing directly with the hospital and your
            insurer before making decisions.
          </p>

          <h2>Accuracy &amp; availability</h2>
          <p>
            The Site and its data are provided <strong>&ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
            warranties of any kind</strong>, express or implied, including accuracy, completeness, or fitness for a
            particular purpose. Source files vary in quality and format; data may be incomplete, out of date, or
            contain errors. We may change, suspend, or discontinue any part of the Site at any time. Found a mistake?
            Please <a href="/corrections">submit a correction</a>.
          </p>

          <h2>Acceptable use</h2>
          <p>
            Use the Site lawfully and don&apos;t attempt to disrupt it, gain unauthorized access, or place undue load on
            it (e.g., aggressive automated scraping). For bulk or programmatic access to the underlying data, see our{" "}
            <a href="/data">data page</a>.
          </p>

          <h2>Intellectual property</h2>
          <p>
            The Site&apos;s design, original text, branding, and presentation are owned by J.N. Barber LLC. The
            underlying hospital pricing originates from public files published by the hospitals and from public
            government datasets. Third-party names and marks belong to their respective owners; their use here is for
            identification and comparison only.
          </p>

          <h2>Third-party links &amp; advertising</h2>
          <p>
            The Site may display advertising and links to third-party sites. We are not responsible for the content,
            products, or practices of third parties. Advertising is handled per our{" "}
            <a href="/privacy">Privacy Policy</a>.
          </p>

          <h2>Limitation of liability</h2>
          <p>
            To the fullest extent permitted by law, J.N. Barber LLC will not be liable for any indirect, incidental,
            or consequential damages, or for any decisions made in reliance on information from the Site. Your use of
            the Site is at your own risk.
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
            <a href="mailto:contact@openhospitalcost.com">contact@openhospitalcost.com</a> or via our{" "}
            <a href="/contact">contact page</a>.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
