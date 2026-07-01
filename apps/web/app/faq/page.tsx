import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { GUIDES as GUIDE_PAGES } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Hospital Price FAQ & Guides — OpenHospitalCost",
  description:
    "Plain-English answers about hospital prices: why the same procedure costs wildly different amounts, what negotiated vs. cash vs. gross prices mean, how to use price transparency to lower your bill, and where the data comes from.",
  alternates: { canonical: "/faq" },
};

// Q&A content lives in one array so the visible page and the FAQPage JSON-LD
// stay in sync — Google reads the structured data for rich results, humans read
// the rendered version. Answers are plain strings (no markup) so they can be
// reused verbatim in the schema.
type QA = { q: string; a: string };

const FAQS: QA[] = [
  {
    q: "Why does the same procedure cost so much more at one hospital than another?",
    a: "Hospital prices are set by negotiation, not by a national price list. Each hospital negotiates separately with each insurer, so the same service can have dozens of different prices even within one building — and prices between hospitals a few miles apart routinely differ by several times. The price often has little to do with the quality of care. That spread is exactly why comparing before non-emergency care can save you a large amount.",
  },
  {
    q: "What is the difference between negotiated, cash, and gross prices?",
    a: "Gross (or 'chargemaster') is the hospital's list price before any discount — almost nobody actually pays this. Negotiated is the rate a specific insurance plan has agreed to pay, and it varies by insurer. Cash (or 'discounted cash') is the price for a self-pay or uninsured patient paying directly. Surprisingly, the cash price is sometimes lower than the negotiated insurance rate, so it can be worth asking for the cash price even if you have insurance.",
  },
  {
    q: "Should I ever pay the cash price instead of using my insurance?",
    a: "Sometimes, yes. If your deductible is high and you haven't met it, the hospital's cash price can be lower than what you'd pay toward your deductible at the negotiated rate. Ask the hospital's billing office for the self-pay or cash price in writing and compare it to your expected out-of-pocket cost. Note that paying cash usually means the amount won't count toward your deductible, so weigh that if you expect more care this year.",
  },
  {
    q: "Are hospitals required to publish their prices?",
    a: "Yes. Since 2021, federal price-transparency rules (45 CFR §180) require hospitals to publish a machine-readable file listing their standard charges — gross, cash, and negotiated rates — for the items and services they provide. OpenHospitalCost reads those public files and makes them searchable. Compliance is uneven: some hospitals publish clean, complete files, while others publish incomplete or hard-to-parse data.",
  },
  {
    q: "Where does OpenHospitalCost get its data?",
    a: "Directly from each hospital's own machine-readable price transparency file, published under federal rule 45 CFR §180. We don't estimate or model prices — we show what the hospital reported, and every hospital page links back to the exact source file and the date we ingested it. If a hospital updates its file, our numbers update when we re-ingest.",
  },
  {
    q: "How current are the prices?",
    a: "Each price is dated to when we last ingested that hospital's file, and that date is shown on the hospital's page. Hospitals update their files on their own schedules — some monthly, some far less often — so always confirm the current price with the hospital before scheduling care.",
  },
  {
    q: "Can I use these prices to negotiate my hospital bill?",
    a: "Often, yes. If you've been quoted or billed more than the published rate, you can point to the hospital's own transparency file and ask to be charged the cash price or a documented negotiated rate. Bring the specific number and the source. Ask for an itemized bill, check it for errors, and request financial assistance or a payment plan if you qualify — many nonprofit hospitals are required to offer charity care.",
  },
  {
    q: "Why do some hospitals show very few prices or none at all?",
    a: "We only show hospitals whose published files we can parse into reliable, comparable prices. If a hospital's file is missing, malformed, incomplete, or uses formats that don't include usable amounts, it may show limited data or be excluded from comparison pages. We're continually expanding coverage as we improve our parsers and as hospitals publish better files.",
  },
  {
    q: "Are these prices a guarantee of what I'll be billed?",
    a: "No. The figures are for comparison and information only. Your final bill depends on your exact care, your insurance plan, complications, and the individual hospital. Always confirm directly with the hospital and your insurer before a procedure. OpenHospitalCost shows published data as-is and is not a quote.",
  },
  {
    q: "Is OpenHospitalCost free, and how is it funded?",
    a: "It's free to use. The site is supported by advertising and stays independent of hospitals and insurers — we publish their data as reported and have no financial relationship with the facilities listed.",
  },
];

const GUIDES = GUIDE_PAGES.map((g) => ({ href: `/guides/${g.slug}`, title: g.title, blurb: g.sub }));

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <SiteHeader />
      <main className="wrap prose">
        <section className="pagehead">
          <div className="crumb"><a href="/">Home</a> / FAQ &amp; Guides</div>
          <h1>Hospital Price FAQ &amp; Guides</h1>
          <p className="sub">
            Plain-English answers about why hospital prices vary so much, what the different prices mean, and how to
            use them to pay less for care.
          </p>
        </section>

        <div className="copy">
          {FAQS.map((f) => (
            <div key={f.q}>
              <h2>{f.q}</h2>
              <p>{f.a}</p>
            </div>
          ))}

          <h2 style={{ marginTop: 40 }}>Guides</h2>
          <ul>
            {GUIDES.map((g) => (
              <li key={g.href}>
                <a href={g.href}>{g.title}</a> — {g.blurb}
              </li>
            ))}
          </ul>

          <p className="prov" style={{ margin: "28px 0 0" }}>
            Still have a question? <a href="mailto:contact@openhospitalcost.com">Contact us</a> — or, if a price looks
            wrong, <a href="mailto:contact@openhospitalcost.com?subject=Correction">let us know</a>.
          </p>
        </div>
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
