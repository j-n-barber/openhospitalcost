import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { GUIDES, getGuide } from "@/lib/guides";

// Static editorial guides. Content lives in lib/guides.tsx; this route renders it
// with Article + FAQPage + BreadcrumbList structured data. Unknown slugs 404.
export const dynamicParams = false;

type Params = { params: Promise<{ slug: string }> };
const BASE = "https://openhospitalcost.com";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) return { title: "Guide — OpenHospitalCost" };
  return {
    title: g.metaTitle,
    description: g.metaDescription,
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: {
      title: g.metaTitle,
      description: g.metaDescription,
      url: `${BASE}/guides/${g.slug}`,
      type: "article",
    },
  };
}

export default async function GuidePage({ params }: Params) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) notFound();

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: g.title,
      description: g.metaDescription,
      url: `${BASE}/guides/${g.slug}`,
      isAccessibleForFree: true,
      publisher: { "@type": "Organization", name: "OpenHospitalCost", url: BASE },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: g.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
        { "@type": "ListItem", position: 2, name: "Guides", item: `${BASE}/guides` },
        { "@type": "ListItem", position: 3, name: g.title, item: `${BASE}/guides/${g.slug}` },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <SiteHeader />
      <main className="wrap prose">
        <section className="pagehead">
          <div className="crumb"><a href="/">Home</a> / <a href="/guides">Guides</a> / {g.title}</div>
          <h1>{g.title}</h1>
          <p className="sub">{g.sub}</p>
        </section>

        <article className="copy">
          {g.body}

          <h2 style={{ marginTop: 44 }}>Frequently asked questions</h2>
          {g.faq.map((f) => (
            <div key={f.q}>
              <h3 style={{ fontSize: 17, margin: "20px 0 6px" }}>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}

          <h2 style={{ marginTop: 44 }}>Related</h2>
          <ul>
            {g.related.map((r) => (
              <li key={r.href}><a href={r.href}>{r.label}</a></li>
            ))}
          </ul>

          <p className="prov" style={{ margin: "28px 0 0" }}>
            Prices in this guide are as of {g.updated} and link to the live page for current
            figures. Published data is for comparison, not a quote — always confirm with the
            hospital. Spotted something off?{" "}
            <a href="mailto:contact@openhospitalcost.com?subject=Correction">Let us know</a>.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
