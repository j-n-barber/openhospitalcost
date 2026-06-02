import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Submit a correction — OpenHospitalCost",
  description:
    "Spotted a wrong price or a mismatched hospital on OpenHospitalCost? Tell us and we'll check it against the source file.",
};

export default function CorrectionsPage() {
  const subject = encodeURIComponent("Correction: ");
  const body = encodeURIComponent(
    "Page URL: \nWhat looks wrong: \nWhat you expected: \nSource (if known): \n"
  );

  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <section className="pagehead">
          <div className="crumb"><a href="/">Home</a> / Corrections</div>
          <h1>Submit a correction</h1>
          <p className="sub">
            Prices come straight from hospital files, and those files aren&apos;t perfect. If something looks wrong,
            tell us — we check every report against the source.
          </p>
        </section>

        <div className="copy">
          <h2>What to send</h2>
          <p>To help us verify quickly, include:</p>
          <ul>
            <li>The page where you saw the issue (copy the URL).</li>
            <li>What looks wrong — a price, a procedure match, a hospital detail.</li>
            <li>What you expected to see, and a source if you have one.</li>
          </ul>

          <h2>How to reach us</h2>
          <p>
            Email{" "}
            <a href={`mailto:jake@openhospitalcost.com?subject=${subject}&body=${body}`}>
              jake@openhospitalcost.com
            </a>
            {" "}— the link pre-fills a short template. We read every message.
          </p>
          <p>
            A note on what we can fix: where a price is wrong because the hospital&apos;s own file is wrong, we&apos;ll
            flag it and cite the source, but the authoritative fix has to come from the hospital. Where the error is
            ours — a bad parse or a mismatched code — we&apos;ll correct it.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
