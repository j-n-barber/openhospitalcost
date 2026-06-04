import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy Policy — OpenHospitalCost",
  description:
    "How OpenHospitalCost handles data: analytics, advertising cookies (Google AdSense), contact/correction forms, the service providers we use, and your choices.",
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
          <p className="sub">Last updated: June 4, 2026</p>
        </section>

        <div className="copy">
          <p>
            OpenHospitalCost (&ldquo;we,&rdquo; &ldquo;us&rdquo;) operates openhospitalcost.com (the &ldquo;Site&rdquo;), a
            free, public website that makes hospital price-transparency data searchable. This policy explains what
            information we collect, how we use it, the third parties involved, and the choices you have.
          </p>

          <h2>Information we collect</h2>
          <ul>
            <li>
              <strong>Usage data (automatic).</strong> Like most websites, we and our providers automatically receive
              standard information such as your IP address, device and browser type, pages viewed, referring pages, and
              approximate (city/region-level) location. We use privacy-friendly analytics to understand aggregate usage.
            </li>
            <li>
              <strong>Information you provide.</strong> If you use our contact or correction forms, we collect what you
              submit (e.g., your name, email address, and message). These submissions are stored in our database and
              emailed to us so we can respond.
            </li>
            <li>
              <strong>Cookies and similar technologies.</strong> We and third parties (analytics and advertising
              partners) use cookies and similar technologies to operate the Site, measure usage, and serve ads.
            </li>
          </ul>

          <h2>Advertising</h2>
          <ul>
            <li>
              We use <strong>Google AdSense</strong> to display ads. Third-party vendors, including Google, use cookies
              to serve ads based on your prior visits to this and other websites.
            </li>
            <li>
              Google&apos;s use of advertising cookies enables it and its partners to serve ads to you based on your
              visits to the Site and/or other sites on the internet.
            </li>
            <li>
              You can opt out of personalized advertising by visiting{" "}
              <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>.
              You can also opt out of some third-party vendors&apos; use of cookies at{" "}
              <a href="https://www.aboutads.info/choices" target="_blank" rel="noopener noreferrer">aboutads.info/choices</a>.
              More about how Google uses data is at{" "}
              <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">Google&apos;s advertising policies</a>.
            </li>
            <li>
              For visitors in the EEA, UK, and Switzerland, where required we obtain consent before using cookies for
              personalized advertising.
            </li>
          </ul>

          <h2>How we use information</h2>
          <ul>
            <li>To operate, maintain, and improve the Site;</li>
            <li>To respond to your inquiries and process correction requests;</li>
            <li>To display advertising that helps keep the Site free;</li>
            <li>To monitor for abuse and keep the Site secure.</li>
          </ul>

          <h2>Service providers</h2>
          <p>
            We share limited data with providers that help us run the Site, only as needed to provide their services:
            hosting and analytics (Vercel), database hosting (Neon), transactional email for form notifications
            (Resend), and advertising (Google AdSense). We do <strong>not</strong> sell your personal information.
          </p>

          <h2>Your choices and rights</h2>
          <ul>
            <li>Opt out of personalized ads using the links above, or adjust your browser&apos;s cookie settings;</li>
            <li>
              Depending on where you live (e.g., under GDPR or CCPA/CPRA), you may have rights to access, correct, or
              delete personal information we hold about you. To make a request, contact us using the details below.
            </li>
          </ul>

          <h2>Data retention</h2>
          <p>
            We keep form submissions for as long as needed to respond and maintain records, and aggregate usage data
            for analytics. The hospital pricing shown on the Site comes from hospitals&apos; public files and is not
            personal information about you.
          </p>

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
            <a href="mailto:contact@openhospitalcost.com">contact@openhospitalcost.com</a> or via our{" "}
            <a href="/contact">contact page</a>.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
