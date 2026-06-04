import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact — OpenHospitalCost",
  description: "Get in touch with OpenHospitalCost — questions, data requests, press, or corrections.",
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="wrap prose">
        <section className="pagehead">
          <div className="crumb"><a href="/">Home</a> / Contact</div>
          <h1>Contact</h1>
          <p className="sub">
            OpenHospitalCost is an independent project. We&apos;d genuinely like to hear from you.
          </p>
        </section>

        <div className="copy" style={{ marginBottom: 24 }}>
          <p>
            Questions about a price, data requests, press, partnerships, or feedback — send a note below. A couple of
            things have their own pages:
          </p>
          <ul>
            <li>Spotted a wrong price? <a href="/corrections">Submit a correction</a> so we can verify it against the source.</li>
            <li>Want the dataset in bulk? See <a href="/data">data sources &amp; export</a>.</li>
            <li>Curious how the prices are derived? Read the <a href="/methodology">methodology</a>.</li>
          </ul>
        </div>

        <ContactForm />

        <p className="prov" style={{ margin: "0 0 72px" }}>
          Prefer email? Reach us directly at{" "}
          <a href="mailto:contact@openhospitalcost.com">contact@openhospitalcost.com</a>. We&apos;re a small operation, so
          replies may take a little time — but every message is read.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
