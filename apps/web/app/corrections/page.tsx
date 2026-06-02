import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CorrectionForm from "@/components/CorrectionForm";

export const metadata: Metadata = {
  title: "Submit a correction — OpenHospitalCost",
  description:
    "Spotted a wrong price or a mismatched hospital on OpenHospitalCost? Tell us and we'll check it against the source file.",
};

export default function CorrectionsPage() {
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

        <div className="copy" style={{ marginBottom: 24 }}>
          <p>
            A note on what we can fix: where a price is wrong because the hospital&apos;s own file is wrong, we&apos;ll
            flag it and cite the source, but the authoritative fix has to come from the hospital. Where the error is
            ours — a bad parse or a mismatched code — we&apos;ll correct it.
          </p>
        </div>

        <CorrectionForm />

        <p className="prov" style={{ margin: "0 0 72px" }}>
          Prefer email? Send the details to{" "}
          <a href="mailto:jake@openhospitalcost.com?subject=Correction">jake@openhospitalcost.com</a>.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
