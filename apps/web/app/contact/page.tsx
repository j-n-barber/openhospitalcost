import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Contact — OpenHospitalCost",
  description: "Get in touch with OpenHospitalCost — questions, data requests, press, or corrections.",
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <section className="pagehead">
          <div className="crumb"><a href="/">Home</a> / Contact</div>
          <h1>Contact</h1>
          <p className="sub">
            OpenHospitalCost is an independent project. We&apos;d genuinely like to hear from you.
          </p>
        </section>

        <div className="copy">
          <p>
            For anything at all — questions about a price, data requests, press, partnerships, or feedback — email{" "}
            <a href="mailto:jake@openhospitalcost.com">jake@openhospitalcost.com</a>.
          </p>
          <ul>
            <li>Spotted a wrong price? Use <a href="/corrections">submit a correction</a> so we can verify it against the source.</li>
            <li>Want the dataset in bulk? See <a href="/data">data sources &amp; export</a>.</li>
            <li>Curious how the prices are derived? Read the <a href="/methodology">methodology</a>.</li>
          </ul>
          <p>
            We&apos;re a small operation, so replies may take a little time — but every message is read.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
