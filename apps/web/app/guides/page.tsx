import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { GUIDES } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Hospital Price Guides — OpenHospitalCost",
  description:
    "Plain-English guides to hospital prices: what an MRI or colonoscopy really costs, cash vs. negotiated vs. chargemaster prices, why the same surgery varies 10×, how to fight a bill, and what the price-transparency law requires.",
  alternates: { canonical: "/guides" },
};

export default function GuidesHubPage() {
  return (
    <>
      <SiteHeader />
      <main className="wrap prose">
        <section className="pagehead">
          <div className="crumb"><a href="/">Home</a> / Guides</div>
          <h1>Hospital price guides</h1>
          <p className="sub">
            Plain-English guides to what care actually costs and how to pay less — grounded in real prices from
            hospitals&apos; own published files.
          </p>
        </section>

        <div className="cardlist" style={{ display: "grid", gap: 14, margin: "8px 0 72px" }}>
          {GUIDES.map((g) => (
            <a key={g.slug} className="hcard" href={`/guides/${g.slug}`}>
              <span className="hn">{g.title}</span>
              <span className="hc">{g.sub}</span>
            </a>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
