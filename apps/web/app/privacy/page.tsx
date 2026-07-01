import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy Policy — OpenHospitalCost",
  description: "How OpenHospitalCost handles data now that it's a retired-project case study: analytics and your choices.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="wrap prose">
        <section className="pagehead">
          <div className="crumb"><a href="/">Home</a> / Privacy</div>
          <h1>Privacy Policy</h1>
          <p className="sub">Last updated: July 1, 2026</p>
        </section>

        <div className="copy">
          <p>
            OpenHospitalCost (&ldquo;we,&rdquo; &ldquo;us&rdquo;) operates openhospitalcost.com (the &ldquo;Site&rdquo;),
            a retired hospital price-transparency project now presented as a static case study. This policy explains
            what little information the Site collects and the choices you have.
          </p>

          <h2>Information we collect</h2>
          <ul>
            <li>
              <strong>Usage data (automatic).</strong> Like most websites, we and our hosting provider automatically
              receive standard information such as your IP address, device and browser type, pages viewed, and
              referring pages, via privacy-friendly analytics used to understand aggregate usage.
            </li>
            <li>
              <strong>Information you provide.</strong> If you email us, we see whatever you choose to include (e.g.,
              your name, email address, and message) in that email. The Site has no forms, accounts, or data
              submission of its own.
            </li>
          </ul>

          <h2>Advertising</h2>
          <p>The Site displays no advertising and uses no advertising cookies.</p>

          <h2>How we use information</h2>
          <ul>
            <li>To operate and maintain the Site;</li>
            <li>To respond to your inquiries;</li>
            <li>To monitor for abuse and keep the Site secure.</li>
          </ul>

          <h2>Service providers</h2>
          <p>
            We use Vercel for hosting and basic analytics. We do <strong>not</strong> sell your personal information.
          </p>

          <h2>Your choices and rights</h2>
          <p>
            Depending on where you live (e.g., under GDPR or CCPA/CPRA), you may have rights to access, correct, or
            delete personal information we hold about you. To make a request, contact us using the details below.
          </p>

          <h2>Data retention</h2>
          <p>We keep emails you send us for as long as needed to respond and maintain records.</p>

          <h2>Children</h2>
          <p>The Site is intended for a general adult audience and is not directed to children under 13.</p>

          <h2>Changes to this policy</h2>
          <p>
            We may update this policy from time to time. Material changes will be reflected by the &ldquo;Last
            updated&rdquo; date above.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about this policy? Reach us at{" "}
            <a href="mailto:contact@openhospitalcost.com">contact@openhospitalcost.com</a>.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
